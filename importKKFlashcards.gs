/**
 * KK 音標閃卡字庫匯入工具（在 Apps Script 編輯器手動執行）。
 *
 * 對象：國小五年級，一週學一個 KK 音標，共 41 週（五階段：送分題子音 → 好寫好記子音 →
 * 特殊符號子音 → 長短對稱母音 → 雙母音與輕母音）。
 * 資料來源：data/kk-flashcards.json（例字音標由
 * scripts/fill-kk-flashcard-phonetics.mjs 從 12.6 萬筆字庫自動填入，與 App 顯示一致）。
 *
 * 匯入目標：與 KK 音標字庫同一本試算表（使用者指定字庫 → 綁定表 → 單字檔），
 * 工作表「猴猴教你KK音標」（原名「KK音標閃卡」，使用者已改名）。重複執行安全（依週數 upsert，不會產生重複列）。
 *
 * 執行方式（擇一）：
 *   1. importKKFlashcardsFromGitHub()       — 從本 repo raw 下載 JSON 匯入（最簡單）
 *   2. importKKFlashcardsFromDriveFile(id)  — 從 Drive 檔案匯入（GitHub 連不上時備援）
 *   3. importKKFlashcardsFromJson(jsonStr)  — 直接貼 JSON（小批量測試）
 *
 * 輔助：
 *   - clearKKFlashcards()                   清空閃卡工作表（重新匯入前用）
 *   - verifyKKFlashcards()                  讀回全部列印，檢查 41 張完整
 */

/** 閃卡工作表名稱（與音標字庫「KK音標字庫」同一本試算表；使用者已將原名「KK音標閃卡」改名） */
var KK_FLASHCARD_SHEET_NAME = '猴猴教你KK音標';

/** data/kk-flashcards.json 的 GitHub raw 位址 */
var KK_FLASHCARD_JSON_URL = 'https://raw.githubusercontent.com/akwangho/flashcard/master/data/kk-flashcards.json';

/** 閃卡工作表標題列（欄位順序即 Sheet 欄位順序） */
var KK_FLASHCARD_HEADERS = [
  '週次', '階段', '階段名稱', 'KK音標', '分類', '對比音標',
  '例字', '例字音標', '自然發音對應', '注音輔助', '發音小訣竅', '延伸單字'
];

/** 取得（或建立）閃卡工作表 */
function getOrCreateKKFlashcardSheet_(ss) {
  var sheet = ss.getSheetByName(KK_FLASHCARD_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(KK_FLASHCARD_SHEET_NAME);
    sheet.getRange(1, 1, 1, KK_FLASHCARD_HEADERS.length)
      .setValues([KK_FLASHCARD_HEADERS])
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** 讀取現有「週次 → 列號」索引（upsert 去重用） */
function loadKKFlashcardWeekRows_(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var weeks = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < weeks.length; i++) {
      var w = parseInt(weeks[i][0], 10);
      if (!isNaN(w)) map[w] = i + 2;
    }
  }
  return map;
}

/** 把一張閃卡物件轉成工作表列（欄位順序對應 KK_FLASHCARD_HEADERS） */
function kkFlashcardToRow_(card, stages) {
  var stageName = '';
  for (var i = 0; i < stages.length; i++) {
    if (stages[i].no === card.stage) { stageName = stages[i].name; break; }
  }
  return [
    card.week, card.stage, stageName, card.phonetic, card.category,
    card.contrast || '', card.word, card.wordPhonetic || '',
    card.phonics, card.zhuyin, card.tip, card.extra || ''
  ];
}

/**
 * 匯入閃卡 JSON（{ stages: [...], cards: [...] }）。重複執行安全：
 * 週次已存在的列會原地更新，不存在的新增，不會重複。
 * @param {Object} parsed - 解析後的 data/kk-flashcards.json 內容
 * @returns {Object} { success, added, updated, rows, sheet }
 */
function writeKKFlashcards_(parsed) {
  if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error('閃卡 JSON 格式錯誤，需要 { stages: [...], cards: [...] }');
  }

  var ss = getKKDictTargetSpreadsheet_(''); // 與音標字庫同一本試算表
  var sheet = getOrCreateKKFlashcardSheet_(ss);
  var weekRows = loadKKFlashcardWeekRows_(sheet);

  var added = 0;
  var updated = 0;
  for (var i = 0; i < parsed.cards.length; i++) {
    var row = kkFlashcardToRow_(parsed.cards[i], parsed.stages || []);
    var existingRow = weekRows[parsed.cards[i].week];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
      updated++;
    } else {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
      added++;
    }
  }

  console.log('閃卡匯入完成：新增 ' + added + '、更新 ' + updated +
    ' → ' + ss.getName() + ' / ' + KK_FLASHCARD_SHEET_NAME);
  return {
    success: true, added: added, updated: updated,
    rows: sheet.getLastRow() - 1,
    sheet: ss.getName() + ' / ' + KK_FLASHCARD_SHEET_NAME
  };
}

/**
 * 從 GitHub raw 匯入 41 張閃卡。Apps Script 編輯器 → 選 importKKFlashcardsFromGitHub → 執行。
 * @param {string} [jsonUrl] - 自訂 JSON 位址（預設 KK_FLASHCARD_JSON_URL）
 * @returns {Object} { success, added, updated, rows, sheet }
 */
function importKKFlashcardsFromGitHub(jsonUrl) {
  var url = jsonUrl || KK_FLASHCARD_JSON_URL;
  console.log('下載閃卡 JSON:', url);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (resp.getResponseCode() !== 200) {
    throw new Error('下載閃卡失敗: HTTP ' + resp.getResponseCode() + '（可改用 importKKFlashcardsFromDriveFile）');
  }
  return writeKKFlashcards_(JSON.parse(resp.getContentText()));
}

/**
 * 從 Google Drive 檔案匯入（先把 data/kk-flashcards.json 上傳 Drive 並開「知道連結的任何人」檢視）。
 * @param {string} fileId - Drive 檔案 ID
 * @returns {Object} { success, added, updated, rows, sheet }
 */
function importKKFlashcardsFromDriveFile(fileId) {
  if (!fileId) throw new Error('需要 Drive 檔案 ID');
  var file = DriveApp.getFileById(fileId);
  console.log('讀取 Drive 檔案:', file.getName());
  return writeKKFlashcards_(JSON.parse(file.getBlob().getDataAsString('UTF-8')));
}

/**
 * 從 JSON 字串匯入（小批量測試用）。
 * @param {string} jsonString - data/kk-flashcards.json 的內容
 * @returns {Object} { success, added, updated, rows, sheet }
 */
function importKKFlashcardsFromJson(jsonString) {
  return writeKKFlashcards_(JSON.parse(jsonString));
}

/**
 * 清空閃卡工作表資料（保留標題列；重新匯入前使用）。
 * @returns {Object} { success, clearedRows }
 */
function clearKKFlashcards() {
  var ss = getKKDictTargetSpreadsheet_('');
  var sheet = getOrCreateKKFlashcardSheet_(ss);
  var lastRow = sheet.getLastRow();
  var cleared = Math.max(lastRow - 1, 0);
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, KK_FLASHCARD_HEADERS.length).clearContent();
  console.log('已清空閃卡資料 ' + cleared + ' 筆');
  return { success: true, clearedRows: cleared };
}

/**
 * 驗證：讀回閃卡工作表全部內容並列印摘要（檢查 41 張是否完整）。
 * @returns {Object} { success, count, missingWeeks }
 */
function verifyKKFlashcards() {
  var ss = getKKDictTargetSpreadsheet_('');
  var sheet = ss.getSheetByName(KK_FLASHCARD_SHEET_NAME);
  if (!sheet) throw new Error('找不到工作表「' + KK_FLASHCARD_SHEET_NAME + '」，請先匯入');
  var lastRow = sheet.getLastRow();
  var count = Math.max(lastRow - 1, 0);
  var missingWeeks = [];
  var seen = {};
  if (count > 0) {
    var values = sheet.getRange(2, 1, count, 4).getValues();
    for (var i = 0; i < values.length; i++) {
      var w = parseInt(values[i][0], 10);
      if (!isNaN(w)) seen[w] = true;
    }
  }
  for (var week = 1; week <= 41; week++) {
    if (!seen[week]) missingWeeks.push(week);
  }
  console.log('閃卡共 ' + count + ' 張' + (missingWeeks.length ? '，缺少週次: ' + missingWeeks.join(',') : '，41 週完整'));
  return { success: missingWeeks.length === 0, count: count, missingWeeks: missingWeeks };
}
