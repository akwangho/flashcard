/**
 * KK 音標字庫匯入工具（在 Apps Script 編輯器手動執行）。
 *
 * 完整字庫：open-dict-data/ipa-dict en_US 轉換的 12.6 萬單字（node scripts/build-kk-dictionary.mjs
 * 產生 data/kk-phonetics.json），用底下任一方式匯入「KK音標字庫」工作表：
 *
 *   1. importKKPhoneticsFromGitHub()
 *      直接從 GitHub raw 下載 data/kk-phonetics.json 匯入。最簡單，不需上傳檔案。
 *      若你的 fork/路徑不同，改 KK_DICT_JSON_URL 常數或傳入自訂 URL。
 *
 *   2. importKKPhoneticsFromDriveFile(fileId)
 *      先把 data/kk-phonetics.json 上傳到 Google Drive，把檔案 ID 傳入。
 *      GitHub 連不上時的備援。
 *
 *   3. importKKPhoneticsFromJson(jsonString)
 *      直接貼上 JSON 字串（小批量測試用；12.6 萬筆請用上面兩種）。
 *
 * 輔助：
 *   - importKKPhoneticsFromRows([[單字, 音標], ...]) 從二維陣列匯入
 *   - clearKKPhoneticsDictionary() 清空字庫工作表（重新匯入前用）
 *   - setKKDictSpreadsheet('試算表ID') 指定字庫所在的試算表
 *
 * 匯入目標：使用者指定字庫（setKKDictSpreadsheet）→ 腳本綁定試算表 → 單字檔試算表。
 * 字庫工作表不存在會自動建立（標題列：單字 / KK音標）。
 */

/**
 * data/kk-phonetics.json 的 GitHub raw 位址（本專案 repo，master 分支）。
 */
var KK_DICT_JSON_URL = 'https://raw.githubusercontent.com/akwangho/flashcard/master/data/kk-phonetics.json';

// ===== 以下為 GAS 執行環境常數（code.gs 已定義，此處僅防止未定義錯誤）=====
// KK_DICT_SHEET_NAME、KK_DICT_SHEET_ID_KEY 由 code.gs 提供

/** 取得字庫匯入目標試算表（優先：使用者指定 → 綁定 → 單字檔） */
function getKKDictTargetSpreadsheet_(wordsSheetId) {
  var errors = [];
  try {
    var saved = PropertiesService.getScriptProperties().getProperty('KK_DICT_SHEET_ID');
    if (saved) {
      try { return SpreadsheetApp.openById(saved); } catch (e) { errors.push('指定字庫: ' + e.message); }
    }
  } catch (propError) { /* 忽略 */ }

  var bound = null;
  try { bound = SpreadsheetApp.getActiveSpreadsheet(); } catch (boundError) { /* 無綁定 */ }
  if (bound) return bound;

  try {
    var wordsId = wordsSheetId || PropertiesService.getScriptProperties().getProperty('WORDS_SHEET_ID');
    if (wordsId) return SpreadsheetApp.openById(wordsId);
  } catch (wordsError) { errors.push('單字檔: ' + wordsError.message); }

  throw new Error('找不到字庫匯入目標試算表。請先執行 setKKDictSpreadsheet(\'試算表ID\')。' + errors.join('；'));
}

/** 取得（或建立）字庫工作表 */
function getOrCreateKKDictSheet_(ss) {
  var dictSheet = ss.getSheetByName(KK_DICT_SHEET_NAME);
  if (!dictSheet) {
    dictSheet = ss.insertSheet(KK_DICT_SHEET_NAME);
    dictSheet.getRange(1, 1, 1, 2).setValues([['單字', 'KK音標']]).setFontWeight('bold');
    dictSheet.setFrozenRows(1);
  }
  return dictSheet;
}

/** 從字庫工作表讀取現有「單字|音標」集合（大量匯入前去重用，避免 12 萬筆重複寫入） */
function loadKKDictExistingKeys_(dictSheet) {
  var existing = {};
  var lastRow = dictSheet.getLastRow();
  if (lastRow >= 2) {
    var values = dictSheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      var w = values[i][0] ? values[i][0].toString().trim().toLowerCase() : '';
      var p = values[i][1] ? values[i][1].toString().trim() : '';
      if (w && p) existing[w + '|' + p] = true;
    }
  }
  return existing;
}

/**
 * 把「單字 → [音標]」物件寫入字庫工作表（分塊寫入，可處理 12.6 萬筆；附加原本沒有的筆數）。
 * @param {Object} dictObj - { apple: ['ˋæpḷ'], ... }
 * @param {string} [wordsSheetId] - 單字檔試算表 ID（找不到指定字庫/綁定表時用）
 * @returns {Object} { success, added, skipped, rows, sheet }
 */
function writeKKDictObject_(dictObj, wordsSheetId) {
  if (!dictObj || typeof dictObj !== 'object') {
    throw new Error('字庫資料格式錯誤，需要 { 單字: [音標, ...], ... } 物件');
  }

  var ss = getKKDictTargetSpreadsheet_(wordsSheetId);
  var dictSheet = getOrCreateKKDictSheet_(ss);
  var existing = loadKKDictExistingKeys_(dictSheet);

  var rows = [];
  var skipped = 0;
  for (var word in dictObj) {
    if (!dictObj.hasOwnProperty(word)) continue;
    var key = word.toString().trim().toLowerCase();
    var phons = Array.isArray(dictObj[word]) ? dictObj[word] : [dictObj[word]];
    for (var j = 0; j < phons.length; j++) {
      var phon = phons[j] ? phons[j].toString().trim() : '';
      if (!phon) continue;
      if (existing[key + '|' + phon]) { skipped++; continue; }
      rows.push([key, phon]);
    }
  }

  // 分塊寫入（每次 2 萬列；GAS setValues 單次上限與 6 分鐘執行時間考量）
  var CHUNK = 20000;
  var added = 0;
  for (var start = 0; start < rows.length; start += CHUNK) {
    var chunk = rows.slice(start, start + CHUNK);
    dictSheet.getRange(dictSheet.getLastRow() + 1, 1, chunk.length, 2).setValues(chunk);
    added += chunk.length;
    console.log('已寫入 ' + added + ' / ' + rows.length + ' 筆…');
    if (start + CHUNK < rows.length) Utilities.sleep(500); // 避免連續寫入過快
  }

  console.log('字庫匯入完成：新增 ' + added + ' 筆、略過重複 ' + skipped + ' 筆 → ' + ss.getName() + ' / ' + KK_DICT_SHEET_NAME);
  return { success: true, added: added, skipped: skipped, rows: dictSheet.getLastRow() - 1, sheet: ss.getName() + ' / ' + KK_DICT_SHEET_NAME };
}

/**
 * 匯入 12.6 萬單字完整字庫：從 GitHub raw 下載 data/kk-phonetics.json 直接匯入。
 * 執行方式：Apps Script 編輯器 → 選擇函式 importKKPhoneticsFromGitHub → 執行（首次授權後）。
 * 注意：約需 1-3 分鐘（分塊寫入），請在編輯器看執行記錄確認進度。
 * @param {string} [jsonUrl] - 自訂 JSON 位址（預設 KK_DICT_JSON_URL）
 * @param {string} [wordsSheetId] - 單字檔試算表 ID（備援目標）
 * @returns {Object} { success, added, skipped, rows, sheet }
 */
function importKKPhoneticsFromGitHub(jsonUrl, wordsSheetId) {
  var url = jsonUrl || KK_DICT_JSON_URL;
  console.log('下載字庫 JSON:', url);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('下載字庫失敗: HTTP ' + resp.getResponseCode() + '（請確認 KK_DICT_JSON_URL 可連線，或改用 importKKPhoneticsFromDriveFile）');
  }
  var parsed = JSON.parse(resp.getContentText());
  var dictObj = parsed && parsed.phonetics ? parsed.phonetics : parsed;
  return writeKKDictObject_(dictObj, wordsSheetId);
}

/**
 * 從 Google Drive 檔案匯入（GitHub 連不上時的備援）。
 * 使用：先把 data/kk-phonetics.json 上傳到 Google Drive →
 *       右鍵檔案 → 分享 → 「知道連結的任何人可檢視」→ 複製檔案 ID →
 *       執行 importKKPhoneticsFromDriveFile('檔案ID')
 * @param {string} fileId - Drive 檔案 ID
 * @param {string} [wordsSheetId] - 單字檔試算表 ID（備援目標）
 * @returns {Object} { success, added, skipped, rows, sheet }
 */
function importKKPhoneticsFromDriveFile(fileId, wordsSheetId) {
  if (!fileId) throw new Error('需要 Drive 檔案 ID');
  var file = DriveApp.getFileById(fileId);
  console.log('讀取 Drive 檔案:', file.getName());
  var parsed = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  var dictObj = parsed && parsed.phonetics ? parsed.phonetics : parsed;
  return writeKKDictObject_(dictObj, wordsSheetId);
}

/**
 * 匯入 JSON 字串（data/kk-phonetics.json 的格式）。
 * @param {string} jsonString - JSON 字串，如 '{"apple":["ˋæpḷ"],"cat":["kæt"]}'
 * @param {string} [wordsSheetId] - 單字檔試算表 ID（備援目標）
 * @returns {Object} { success, added, skipped, rows, sheet }
 */
function importKKPhoneticsFromJson(jsonString, wordsSheetId) {
  var parsed = JSON.parse(jsonString);
  var dictObj = parsed && parsed.phonetics ? parsed.phonetics : parsed;
  return writeKKDictObject_(dictObj, wordsSheetId);
}

/**
 * 從二維陣列匯入（[[單字, 音標], ...]，可從其他 Sheet 複製）。
 * @param {Array<Array<string>>} rows - 二維陣列
 * @param {string} [wordsSheetId] - 單字檔試算表 ID（備援目標）
 * @returns {Object} { success, added, skipped, rows, sheet }
 */
function importKKPhoneticsFromRows(rows, wordsSheetId) {
  if (!Array.isArray(rows)) throw new Error('需要二維陣列 [[單字, 音標], ...]');
  var dictObj = {};
  for (var i = 0; i < rows.length; i++) {
    var word = rows[i][0] ? rows[i][0].toString().trim().toLowerCase() : '';
    var phon = rows[i][1] ? rows[i][1].toString().trim() : '';
    if (!word || !phon) continue;
    if (!dictObj[word]) dictObj[word] = [];
    if (dictObj[word].indexOf(phon) === -1) dictObj[word].push(phon);
  }
  return writeKKDictObject_(dictObj, wordsSheetId);
}

/**
 * 清空字庫工作表資料（保留標題列；重新匯入完整字庫前使用）。
 * @param {string} [wordsSheetId] - 單字檔試算表 ID（備援目標）
 * @returns {Object} { success, clearedRows }
 */
function clearKKPhoneticsDictionary(wordsSheetId) {
  var ss = getKKDictTargetSpreadsheet_(wordsSheetId);
  var dictSheet = getOrCreateKKDictSheet_(ss);
  var lastRow = dictSheet.getLastRow();
  var cleared = Math.max(lastRow - 1, 0);
  if (lastRow >= 2) dictSheet.getRange(2, 1, lastRow - 1, 2).clearContent();
  console.log('已清空字庫資料 ' + cleared + ' 筆');
  return { success: true, clearedRows: cleared };
}

/**
 * 清除單字檔 I 欄的舊格式音標（v1 轉換錯誤的資料，如 əˈpɛl / ˈwɔtɚ 這種含 IPA ˈ ˌ 重音符號者）。
 * 清除後輪到該單字時會自動從字庫重新查詢正確 KK 音標並寫回。
 * 使用：先在單字檔開啟 KK 音標功能，執行 clearOldKKPhoneticsInWordSheets('試算表ID')。
 * @param {string} sheetId - 單字檔試算表 ID
 * @param {string[]} [sheetNames] - 要處理的工作表名稱（不傳則處理所有工作表）
 * @returns {Object} { success, clearedCells, sheets: [...] }
 */
function clearOldKKPhoneticsInWordSheets(sheetId, sheetNames) {
  if (!sheetId) throw new Error('需要單字檔試算表 ID');
  var ss = SpreadsheetApp.openById(sheetId);
  var sheets = (sheetNames && sheetNames.length > 0)
    ? sheetNames.map(function(n) { return ss.getSheetByName(n); }).filter(Boolean)
    : ss.getSheets();

  // 舊格式特徵：含 IPA 重音符號 ˈ (U+02C8) 或 ˌ (U+02CC) —— 新轉換用 ˋ (U+02CA) / ˏ (U+02CF)
  var totalCleared = 0;
  var report = [];
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    var values = sheet.getRange(2, 9, lastRow - 1, 1).getValues(); // I 欄
    var cleared = 0;
    for (var i = 0; i < values.length; i++) {
      var v = values[i][0] ? values[i][0].toString() : '';
      if (v && (v.indexOf('ˈ') !== -1 || v.indexOf('ˌ') !== -1)) {
        sheet.getRange(i + 2, 9).clearContent();
        cleared++;
      }
    }
    if (cleared > 0) report.push({ sheet: sheet.getName(), cleared: cleared });
    totalCleared += cleared;
  }
  console.log('已清除舊格式音標 ' + totalCleared + ' 格:', JSON.stringify(report));
  return { success: true, clearedCells: totalCleared, sheets: report };
}
