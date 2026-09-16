  // ===========================================
  // HTML 服務和基本設定
  // ===========================================

  function doGet() {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }

  // ===========================================
  // 欄位常數（Google Sheet 欄位對照）
  // 格式：A=要會拼, B=單字, C=翻譯, D=不熟程度, E=圖片URL, F=圖片, G=複習日期, H=標籤
  // ===========================================

  /** 0-based 欄位索引（用於 getValues() 陣列存取） */
  var COL = {
    MUST_SPELL: 0,     // A 欄：要會拼
    ENGLISH: 1,        // B 欄：單字
    CHINESE: 2,        // C 欄：翻譯
    DIFFICULTY: 3,     // D 欄：不熟程度
    IMAGE_URL: 4,      // E 欄：圖片URL
    IMAGE_FORMULA: 5,  // F 欄：圖片顯示公式
    LAST_REVIEW: 6,    // G 欄：最後複習日期
    TAGS: 7,           // H 欄：標籤
    KK_PHONETIC: 8     // I 欄：KK 音標（使用者選定的音標，由前端寫入）
  };

  /** 1-based 欄位編號（用於 getRange(row, col)） */
  var COL_NUM = {
    MUST_SPELL: 1,     // A 欄
    ENGLISH: 2,        // B 欄
    CHINESE: 3,        // C 欄
    DIFFICULTY: 4,     // D 欄
    IMAGE_URL: 5,      // E 欄
    IMAGE_FORMULA: 6,  // F 欄
    LAST_REVIEW: 7,    // G 欄
    TAGS: 8,           // H 欄
    KK_PHONETIC: 9     // I 欄：KK 音標
  };

  // ===========================================
  // 工具函數 (Utility Functions)
  // ===========================================

  /**
  * 正規化 A 欄「要會拼」值為 -1 / 0 / 0.5 / 1。
  * A 欄語意：
  *   - 空 / 0 → 0（不需會拼）
  *   - -1 → -1「看懂就好單字」：只要求看得懂英文，不要求中翻英/會拼；
  *          混合模式時強制先顯示英文（視為非要會拼，不列入要會拼篩選、不顯示要會拼標記）。
  *   - 0.5 → 0.5「隨機要會拼單字」：可代表「初學要會拼」或「已熟練要會拼」，
  *          混合模式即使開啟「強制先中文」仍以隨機順序出現，避免小朋友因為總是
  *          先看到中文，反而在看到英文時一時反應不過來正確意思。
  *   - 1 → 1「衝刺要會拼單字」：考試前衝刺、要熟悉的要會拼單字，
  *          混合模式開啟「強制先中文」時固定先顯示中文。
  *   - 其他非空值 → 1（相容舊資料，任何標記皆視為衝刺要會拼單字）
  * @param {*} raw A 欄原始值
  * @returns {number} -1 | 0 | 0.5 | 1
  */
  function normalizeMustSpell(raw) {
    if (raw === undefined || raw === null || raw === '') return 0;
    var s = raw.toString().trim();
    if (s === '') return 0;
    if (s === '0') return 0;
    if (s === '-1') return -1;
    if (s === '0.5') return 0.5;
    return 1;
  }

  /**
  * 驗證和清理 Sheet ID
  */
  function validateAndCleanSheetId(sheetId) {
    if (!sheetId || sheetId.trim() === '') {
      throw new Error('請提供有效的 Google Sheet ID');
    }
    return sheetId.trim();
  }

  /**
  * 安全地開啟 Google Spreadsheet
  */
  function openSpreadsheetSafely(sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (openError) {
      console.error('無法開啟 Spreadsheet:', openError);
      throw new Error('無法開啟 Google Sheet，請檢查：\n1. Sheet ID 是否正確\n2. 您是否有存取權限\n3. Sheet 是否存在');
    }
  }

/**
* 計算工作表中的有效單字數量
* 讀取第1行第1欄（A1）的值，該欄位應包含總數
* 如果讀取不到或值無效，返回 null
*/
function countValidWords(sheet) {
  try {
    // 讀取 A1 欄位（存放總單字數，與欄位常數無關）
    const countValue = sheet.getRange(1, 1).getValue();
    
    // 檢查值是否存在
    if (countValue === null || countValue === undefined || countValue === '') {
      console.log('工作表', sheet.getName(), '的 A1 欄位無值');
      return null;
    }
    
    // 轉換為數字並驗證
    const wordCount = Number(countValue);
    if (isNaN(wordCount) || wordCount < 0) {
      console.log('工作表', sheet.getName(), '的 A1 欄位值無效:', countValue);
      return null;
    }
    
    console.log('工作表', sheet.getName(), '從 A1 讀取到行數:', wordCount);
    return Math.floor(wordCount); // 取整數
  } catch (dataError) {
    console.error('讀取工作表 A1 欄位時發生錯誤:', sheet.getName(), dataError);
    return null;
  }
}

  /**
  * 建立單字物件
  * 格式：A=要會拼, B=單字, C=翻譯, D=不熟程度, E=圖片URL, F=圖片, G=複習日期（A1=總數）
  */
  function createWordObject(rowData, id, sheetName, rowIndex) {
    // 計算不熟程度（支援數字 -999~10 或舊版 * 符號）
    let difficultyLevel = 0;
    if (rowData[COL.DIFFICULTY] !== undefined && rowData[COL.DIFFICULTY] !== null && rowData[COL.DIFFICULTY] !== '') {
      const diffStr = rowData[COL.DIFFICULTY].toString().trim();
      const parsed = Number(diffStr);
      if (!isNaN(parsed) && diffStr !== '') {
        // 數字格式（支援 -999 到 10）
        difficultyLevel = Math.max(-999, Math.min(10, Math.round(parsed)));
      } else {
        // 向後相容：計算 * 符號數量
        for (let i = 0; i < diffStr.length; i++) {
          if (diffStr[i] === '*') difficultyLevel++;
        }
        if (difficultyLevel > 10) difficultyLevel = 10;
      }
    }

    // 讀取 G 欄（第7欄，index 6）的最後複習日期
    let lastReviewDate = '';
    if (rowData.length > COL.LAST_REVIEW && rowData[COL.LAST_REVIEW]) {
      const rawValue = rowData[COL.LAST_REVIEW];
      // 如果是 Date 物件，轉換為 YYYY-MM-DD 格式
      if (rawValue instanceof Date) {
        const year = rawValue.getFullYear();
        const month = String(rawValue.getMonth() + 1).padStart(2, '0');
        const day = String(rawValue.getDate()).padStart(2, '0');
        lastReviewDate = year + '-' + month + '-' + day;
      } else {
        lastReviewDate = rawValue.toString().trim();
      }
    }

    // 讀取 A 欄（第1欄，index 0）的「要會拼」標記
    // 0/空 = 不需會拼；1 = 衝刺要會拼單字（考前衝刺，混合模式強制先中文）；
    // 0.5 = 隨機要會拼單字（初學或已熟練，混合模式強制先中文時仍隨機）
    var mustSpell = normalizeMustSpell(rowData[COL.MUST_SPELL]);

    // 讀取 H 欄：標籤（以半形或全形逗號分隔）
    var tags = [];
    if (rowData.length > COL.TAGS && rowData[COL.TAGS]) {
      var rawTags = rowData[COL.TAGS].toString().trim();
      if (rawTags) {
        var parts = rawTags.split(/[,，]/);
        for (var t = 0; t < parts.length; t++) {
          var tag = parts[t].trim();
          if (tag) tags.push(tag);
        }
      }
    }

    // 讀取 I 欄：KK 音標（可能不存在（舊資料列長度不足），需檢查長度）
    var kkPhonetic = '';
    if (rowData.length > COL.KK_PHONETIC && rowData[COL.KK_PHONETIC] !== undefined &&
        rowData[COL.KK_PHONETIC] !== null) {
      kkPhonetic = rowData[COL.KK_PHONETIC].toString().trim();
    }

    return {
      id: id,
      english: rowData[COL.ENGLISH].toString().trim(),
      chinese: rowData[COL.CHINESE].toString().trim(),
      difficultyLevel: difficultyLevel,
      image: rowData[COL.IMAGE_URL] ? rowData[COL.IMAGE_URL].toString().trim() : '',
      imageFormula: rowData[COL.IMAGE_FORMULA] ? rowData[COL.IMAGE_FORMULA].toString().trim() : '',
      lastReviewDate: lastReviewDate,
      mustSpell: mustSpell,
      tags: tags,
      kkPhonetic: kkPhonetic,
      sheetName: sheetName,
      originalRowIndex: rowIndex
    };
  }

  /**
  * 取得示例資料（測試用）
  */
  function getDemoWords() {
    return [
      {id: 0, english: 'Hello', chinese: '你好', difficultyLevel: 0, image: '', imageFormula: '', lastReviewDate: '', sheetName: 'Demo', originalRowIndex: 2},
      {id: 1, english: 'World', chinese: '世界', difficultyLevel: 0, image: '', imageFormula: '', lastReviewDate: '', sheetName: 'Demo', originalRowIndex: 3},
      {id: 2, english: 'Apple', chinese: '蘋果', difficultyLevel: 0, image: '', imageFormula: '', lastReviewDate: '', sheetName: 'Demo', originalRowIndex: 4},
      {id: 3, english: 'Book', chinese: '書', difficultyLevel: 0, image: '', imageFormula: '', lastReviewDate: '', sheetName: 'Demo', originalRowIndex: 5},
      {id: 4, english: 'Computer', chinese: '電腦', difficultyLevel: 0, image: '', imageFormula: '', lastReviewDate: '', sheetName: 'Demo', originalRowIndex: 6},
      {id: 5, english: 'Friend', chinese: '朋友', difficultyLevel: 0, image: '', imageFormula: '', lastReviewDate: '', sheetName: 'Demo', originalRowIndex: 7},
      {id: 6, english: 'Happy', chinese: '快樂', difficultyLevel: 0, image: '', imageFormula: '', lastReviewDate: '', sheetName: 'Demo', originalRowIndex: 8}
    ];
  }

  /**
  * 根據英文和中文內容尋找工作表中的行索引
  */
  function findWordRowIndex(sheet, englishWord, chineseWord) {
    const data = sheet.getDataRange().getValues();
    
    // 從第2行開始搜尋（跳過標題列），B欄=單字，C欄=翻譯
    for (let i = 1; i < data.length; i++) {
      const rowEnglish = data[i][COL.ENGLISH] ? data[i][COL.ENGLISH].toString().trim() : '';
      const rowChinese = data[i][COL.CHINESE] ? data[i][COL.CHINESE].toString().trim() : '';
      
      if (rowEnglish.toLowerCase() === englishWord.toLowerCase().trim() && 
          rowChinese.toLowerCase() === chineseWord.toLowerCase().trim()) {
        return i;
      }
    }
    return -1;
  }

  // ===========================================
  // 工作表基礎操作
  // ===========================================

  /**
  * 僅取得工作表名稱（不讀取單字數量，用於快速取得清單）
  */
  function getSheetNamesOnly(sheetId) {
    try {
      console.log('開始取得工作表名稱，Sheet ID:', sheetId);
      
      const cleanSheetId = validateAndCleanSheetId(sheetId);
      const spreadsheet = openSpreadsheetSafely(cleanSheetId);
      const spreadsheetName = spreadsheet.getName();
      console.log('成功連接 Google Sheet:', spreadsheetName);
      
      const sheets = spreadsheet.getSheets();
      if (!sheets || sheets.length === 0) {
        throw new Error('此 Google Sheet 中沒有找到任何工作表');
      }
      
      const sheetNames = [];
      for (let i = 0; i < sheets.length; i++) {
        sheetNames.push(sheets[i].getName());
      }
      
      console.log('找到', sheetNames.length, '個工作表:', sheetNames);
      return {
        spreadsheetName: spreadsheetName,
        sheetNames: sheetNames,
        sheetCount: sheetNames.length
      };
    } catch (error) {
      console.error('getSheetNamesOnly 發生錯誤:', error);
      throw new Error('取得工作表名稱失敗：' + error.message);
    }
  }

  /**
  * 取得單一工作表的單字數量（讀取 A1）
  */
  function getSheetWordCount(sheetId, sheetName) {
    try {
      const cleanSheetId = validateAndCleanSheetId(sheetId);
      const spreadsheet = openSpreadsheetSafely(cleanSheetId);
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        console.error('找不到工作表:', sheetName);
        return { name: sheetName, wordCount: null };
      }
      
      const wordCount = countValidWords(sheet);
      console.log('工作表', sheetName, '單字數:', wordCount);
      return { name: sheetName, wordCount: wordCount };
    } catch (error) {
      console.error('取得工作表單字數失敗:', sheetName, error);
      return { name: sheetName, wordCount: null };
    }
  }

  /**
  * 獲取工作表清單和單字數量
  */
  function getSheetsList(sheetId) {
    try {
      console.log('開始載入工作表清單，Sheet ID:', sheetId);
      
      const cleanSheetId = validateAndCleanSheetId(sheetId);
      console.log('清理後的 Sheet ID:', cleanSheetId);
      
      const spreadsheet = openSpreadsheetSafely(cleanSheetId);
      const spreadsheetName = spreadsheet.getName();
      console.log('成功載入 Google Sheet:', spreadsheetName);
      
      let sheets;
      try {
        sheets = spreadsheet.getSheets();
      } catch (sheetsError) {
        console.error('無法取得工作表列表:', sheetsError);
        throw new Error('無法取得工作表列表，請檢查 Sheet 權限設定');
      }
      
      if (!sheets || sheets.length === 0) {
        throw new Error('此 Google Sheet 中沒有找到任何工作表');
      }
      
      console.log('找到', sheets.length, '個工作表');
      const sheetsList = [];
      
      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        const sheetName = sheet.getName();
        console.log('處理工作表:', sheetName);
        
        const wordCount = countValidWords(sheet);
        if (wordCount === null) {
          console.log('工作表', sheetName, '的單字數無法取得（A1 欄位無值或無效）');
        } else {
          console.log('工作表', sheetName, '有', wordCount, '個單字');
        }
        
        sheetsList.push({
          name: sheetName,
          wordCount: wordCount
        });
      }
      
      console.log('成功載入工作表清單，總計', sheetsList.length, '個工作表');
      
      return {
        spreadsheetName: spreadsheetName,
        sheets: sheetsList
      };
    } catch (error) {
      console.error('getSheetsList 發生錯誤:', error);
      throw new Error('載入工作表清單失敗：' + error.message);
    }
  }

  /**
  * 從單一工作表載入單字（用於逐表載入進度顯示）
  */
  function getWordsFromSingleSheet(sheetId, sheetName) {
    try {
      console.log('載入單一工作表:', sheetName, 'Sheet ID:', sheetId);
      const cleanSheetId = validateAndCleanSheetId(sheetId);
      const spreadsheet = openSpreadsheetSafely(cleanSheetId);
      const sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        console.error('找不到工作表：' + sheetName);
        return { success: false, words: [], sheetName: sheetName, error: '找不到工作表' };
      }

      const data = sheet.getDataRange().getValues();
      const words = [];

      for (let j = 1; j < data.length; j++) {
        if (data[j][COL.ENGLISH] && data[j][COL.CHINESE]) {
          words.push(createWordObject(data[j], 0, sheetName, j));
        }
      }

      console.log('工作表', sheetName, '載入了', words.length, '個單字');
      return { success: true, words: words, sheetName: sheetName, wordCount: words.length };
    } catch (error) {
      console.error('載入單一工作表失敗:', sheetName, error);
      return { success: false, words: [], sheetName: sheetName, error: error.message };
    }
  }

  /**
  * 從指定的工作表載入單字
  */
  function getWordsFromSheets(sheetId, sheetNames) {
    try {
      console.log('開始載入單字，Sheet ID:', sheetId, '工作表:', sheetNames);
      
      const cleanSheetId = validateAndCleanSheetId(sheetId);
      
      if (!sheetNames || !Array.isArray(sheetNames) || sheetNames.length === 0) {
        throw new Error('請選擇至少一個工作表');
      }
      
      const spreadsheet = openSpreadsheetSafely(cleanSheetId);
      const allWords = [];
      let currentId = 0;
      
      for (let i = 0; i < sheetNames.length; i++) {
        const sheetName = sheetNames[i];
        console.log('載入工作表:', sheetName);
        
        const sheet = spreadsheet.getSheetByName(sheetName);
        
        if (!sheet) {
          console.error('找不到工作表：' + sheetName);
          continue;
        }
        
        const data = sheet.getDataRange().getValues();
        let sheetWordCount = 0;
        
        // 從第2行開始（跳過標題列），檢查 B欄(單字) 和 C欄(翻譯) 是否有資料
        for (let j = 1; j < data.length; j++) {
          if (data[j][COL.ENGLISH] && data[j][COL.CHINESE]) {
            allWords.push(createWordObject(data[j], currentId++, sheetName, j));
            sheetWordCount++;
          }
        }
        console.log('工作表', sheetName, '載入了', sheetWordCount, '個單字');
      }
      
      if (allWords.length === 0) {
        throw new Error('所選工作表中沒有找到有效的單字資料');
      }
      
      console.log('總共載入', allWords.length, '個單字');
      return allWords;
    } catch (error) {
      console.error('載入單字時發生錯誤:', error);
      console.log('返回示例資料進行測試');
      return getDemoWords();
    }
  }

  /**
  * 向後相容的單一工作表載入函數
  */
  function getWordsFromSheet() {
    const DEFAULT_SHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
    const DEFAULT_SHEET_NAME = 'Sheet1';
    
    return getWordsFromSheets(DEFAULT_SHEET_ID, [DEFAULT_SHEET_NAME]);
  }

  /**
  * 更新單字不熟程度（多層級 -1~10）
  * difficultyLevel: -1 表示非常熟（已掌握），0 表示已熟悉，1-10 表示不熟程度
  * 寫入時以數字為主（向後相容讀取 * 符號）
  */
  function updateWordDifficulty(sheetId, sheetName, rowIndex, difficultyLevel) {
    try {
      console.log('更新不熟程度，Sheet ID:', sheetId, '工作表:', sheetName, '行索引:', rowIndex, '不熟程度:', difficultyLevel);
      
      if (!sheetId || !sheetName) {
        console.error('缺少必要參數：sheetId 或 sheetName');
        return false;
      }
      
      const spreadsheet = openSpreadsheetSafely(sheetId.trim());
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        console.error('找不到工作表：' + sheetName);
        return false;
      }
      
      const row = rowIndex + 1; // rowIndex 為 0-based，實際行數為 1-based
      
      // 以數字格式寫入（0 寫空字串，其他寫數字）
      const level = Math.max(-999, Math.min(10, parseInt(difficultyLevel) || 0));
      sheet.getRange(row, COL_NUM.DIFFICULTY).setValue(level === 0 ? '' : level);
      
      console.log('成功更新不熟程度為', level);
      return true;
    } catch (error) {
      console.error('更新不熟程度失敗:', error);
      return false;
    }
  }

  /**
  * 更新單字屬性（單字、翻譯、不熟程度、圖片URL）
  * @param {string} sheetId - Google Sheet ID
  * @param {string} sheetName - 工作表名稱
  * @param {number} rowIndex - 列索引（0-based）
  * @param {Object} properties - 要更新的屬性 { english, chinese, difficultyLevel, imageUrl }
  * @returns {Object} 結果物件
  */
  function updateWordProperties(sheetId, sheetName, rowIndex, properties) {
    try {
      console.log('更新單字屬性，Sheet ID:', sheetId, '工作表:', sheetName, '行索引:', rowIndex);
      
      if (!sheetId || !sheetName) {
        return { success: false, error: '缺少必要參數：sheetId 或 sheetName' };
      }
      
      var spreadsheet = openSpreadsheetSafely(sheetId.trim());
      var sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        return { success: false, error: '找不到工作表：' + sheetName };
      }
      
      var row = rowIndex + 1; // rowIndex 為 0-based，實際行數為 1-based
      
      // 更新 B 欄：單字
      if (properties.english !== undefined && properties.english !== null) {
        sheet.getRange(row, COL_NUM.ENGLISH).setValue(properties.english.toString().trim());
        console.log('已更新單字:', properties.english);
      }
      
      // 更新 C 欄：翻譯
      if (properties.chinese !== undefined && properties.chinese !== null) {
        sheet.getRange(row, COL_NUM.CHINESE).setValue(properties.chinese.toString().trim());
        console.log('已更新翻譯:', properties.chinese);
      }
      
      // 更新 D 欄：不熟程度（以數字格式寫入，0 寫空字串）
      if (properties.difficultyLevel !== undefined && properties.difficultyLevel !== null) {
        var level = Math.max(-999, Math.min(10, parseInt(properties.difficultyLevel) || 0));
        sheet.getRange(row, COL_NUM.DIFFICULTY).setValue(level === 0 ? '' : level);
        console.log('已更新不熟程度:', level);
      }
      
      // 更新 E 欄：圖片URL
      if (properties.imageUrl !== undefined && properties.imageUrl !== null) {
        sheet.getRange(row, COL_NUM.IMAGE_URL).setValue(properties.imageUrl.toString().trim());
        console.log('已更新圖片URL:', properties.imageUrl);
      }
      
      // 更新 A 欄：要會拼（1 = 衝刺要會拼單字；0.5 = 隨機要會拼單字；空字串 = 不需要）
      if (properties.mustSpell !== undefined && properties.mustSpell !== null) {
        var mustSpellVal = normalizeMustSpell(properties.mustSpell);
        sheet.getRange(row, COL_NUM.MUST_SPELL).setValue(mustSpellVal === 0 ? '' : mustSpellVal);
        console.log('已更新要會拼:', mustSpellVal);
      }

      // 更新 H 欄：標籤（以半形逗號分隔的字串）
      if (properties.tags !== undefined && properties.tags !== null) {
        var tagsStr = Array.isArray(properties.tags) ? properties.tags.join(',') : properties.tags.toString();
        sheet.getRange(row, COL_NUM.TAGS).setValue(tagsStr);
        console.log('已更新標籤:', tagsStr);
      }

      // 更新 I 欄：KK 音標（空字串 = 清除）
      if (properties.kkPhonetic !== undefined && properties.kkPhonetic !== null) {
        sheet.getRange(row, COL_NUM.KK_PHONETIC).setValue(properties.kkPhonetic.toString().trim());
        console.log('已更新 KK 音標:', properties.kkPhonetic);
      }
      
      console.log('成功更新單字屬性');
      return { success: true };
    } catch (error) {
      console.error('更新單字屬性失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
  * 向後兼容：舊版 markWordAsDifficult 轉接到新版
  */
  function markWordAsDifficult(sheetId, sheetName, rowIndex, isDifficult) {
    const level = isDifficult ? 1 : 0;
    return updateWordDifficulty(sheetId, sheetName, rowIndex, level);
  }

  /**
  * 檢查工作表是否存在
  */
  function checkSheetExists(sheetName, targetSheetId) {
    try {
      const SHEET_ID = targetSheetId || '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const existingSheet = ss.getSheetByName(sheetName);
      return existingSheet !== null;
    } catch (error) {
      console.error('檢查工作表是否存在時發生錯誤:', error);
      return false;
    }
  }

  /**
  * 匯出單字到新工作表
  */
  function exportWordsToSheet(words, sheetName, targetSheetId, overwrite = false, isFirstBatch = true) {
    try {
      console.log('匯出單字，目標 Sheet ID:', targetSheetId, '工作表名稱:', sheetName, '覆寫模式:', overwrite, '是否第一批次:', isFirstBatch, '單字數量:', words.length);
      
      // 如果沒有指定目標 Sheet ID，使用預設值
      const SHEET_ID = targetSheetId || '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
      const ss = SpreadsheetApp.openById(SHEET_ID);
      
      // 檢查工作表是否已存在
      let targetSheet = ss.getSheetByName(sheetName);
      const sheetExists = targetSheet !== null;
      
      // 如果是第一批次且工作表已存在且不是覆寫模式，返回錯誤讓前端處理
      if (sheetExists && !overwrite && isFirstBatch) {
        return {
          success: false,
          error: 'SHEET_EXISTS',
          message: `工作表 "${sheetName}" 已存在。`
        };
      }
      
      if (sheetExists && overwrite) {
        // 覆寫模式：刪除現有工作表並重新創建
        console.log('覆寫模式：刪除現有工作表');
        ss.deleteSheet(targetSheet);
        targetSheet = ss.insertSheet(sheetName);
        console.log('覆寫模式：已創建新工作表');
      } else if (sheetExists && !overwrite) {
        // 附加模式：附加到已存在的工作表
        console.log('附加模式：附加到已存在的工作表');
      } else if (!sheetExists) {
        // 創建新工作表
        console.log('創建新工作表：', sheetName);
        targetSheet = ss.insertSheet(sheetName);
      }
      
      // 寫入第一列：A1 放總數（如果是新工作表或覆寫模式）
      if (isFirstBatch || overwrite || !sheetExists) {
        targetSheet.appendRow([words.length, '單字', '翻譯', '不熟程度', '圖片URL', '', '', '標籤', 'KK音標']);
      }
      
      // 寫入資料
      console.log('開始寫入', words.length, '個單字');
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const imageUrl = w.image || '';
        
        // 以數字格式寫入不熟程度（0 寫空字串）
        const level = w.difficultyLevel || 0;
        
        var tagsStr = (w.tags && w.tags.length > 0) ? w.tags.join(',') : '';
        var mustSpellVal = normalizeMustSpell(w.mustSpell);
        targetSheet.appendRow([
          mustSpellVal === 0 ? '' : mustSpellVal,  // A 欄：要會拼標記（1/0.5/空）
          w.english || '',           // B 欄：單字
          w.chinese || '',           // C 欄：翻譯
          level === 0 ? '' : level,  // D 欄：不熟程度（數字格式）
          imageUrl,                  // E 欄：圖片URL
          '',                        // F 欄：圖片公式（略）
          '',                        // G 欄：複習日期（略）
          tagsStr,                   // H 欄：標籤
          w.kkPhonetic || ''         // I 欄：KK 音標
        ]);
      }
      
      let actionText;
      if (overwrite) {
        actionText = '覆寫並匯出';
      } else if (sheetExists) {
        actionText = '附加匯出';
      } else {
        actionText = '匯出';
      }
      
      console.log(`成功${actionText}`, words.length, '個單字到工作表', sheetName);
      return {
        success: true,
        message: `成功${actionText} ${words.length} 個單字到工作表 "${sheetName}"`,
        action: actionText,
        wordsCount: words.length
      };
    } catch (error) {
      console.error('匯出失敗:', error);
      return {
        success: false,
        error: 'EXPORT_ERROR',
        message: '匯出失敗：' + error.message
      };
    }
  }

  // ===========================================
  // 複習日期更新
  // ===========================================

  /**
  * 批次更新複習日期到 Google Sheet G 欄（第7欄）
  * @param {string} sheetId - Google Sheet ID
  * @param {Array} updates - 更新陣列，每項 { sheetName, rowIndex, date }
  * @returns {Object} 結果物件
  */
  function batchUpdateReviewDates(sheetId, updates) {
    try {
      console.log('批次更新複習日期，Sheet ID:', sheetId, '更新數量:', updates.length);

      if (!updates || updates.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      const cleanSheetId = validateAndCleanSheetId(sheetId);
      const spreadsheet = openSpreadsheetSafely(cleanSheetId);

      // 按工作表名稱分組
      const groupedBySheet = {};
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        if (!groupedBySheet[update.sheetName]) {
          groupedBySheet[update.sheetName] = [];
        }
        groupedBySheet[update.sheetName].push(update);
      }

      let updatedCount = 0;

      for (const sheetName in groupedBySheet) {
        const sheetUpdates = groupedBySheet[sheetName];
        const sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
          console.error('找不到工作表:', sheetName);
          continue;
        }

        for (let i = 0; i < sheetUpdates.length; i++) {
          try {
            const update = sheetUpdates[i];
            const row = update.rowIndex + 1; // 轉換為 1-based
            sheet.getRange(row, COL_NUM.LAST_REVIEW).setValue(update.date);
            updatedCount++;
          } catch (cellError) {
            console.error('更新單一複習日期失敗:', sheetUpdates[i], cellError);
          }
        }
      }

      console.log('成功更新', updatedCount, '個複習日期');
      return { success: true, updatedCount: updatedCount };
    } catch (error) {
      console.error('批次更新複習日期失敗:', error);
      return { success: false, error: error.message, updatedCount: 0 };
    }
  }

  // ===========================================
  // 重複單字偵測
  // ===========================================

  /**
  * 偵測重複單字
  */
  function detectDuplicateWords(allWords) {
    try {
      console.log('開始偵測重複單字，總數:', allWords.length);
      
      const duplicatesMap = new Map();
      
      // 建立英文單字的對應表
      for (let i = 0; i < allWords.length; i++) {
        const word = allWords[i];
        const englishKey = word.english.trim();
        
        if (!duplicatesMap.has(englishKey)) {
          duplicatesMap.set(englishKey, []);
        }
        duplicatesMap.get(englishKey).push(word);
      }
      
      // 找出有重複的單字
      const duplicates = [];
      for (const [englishKey, wordsList] of duplicatesMap) {
        if (wordsList.length > 1) {
          // 檢查是否定義相同
          const firstDefinition = wordsList[0].chinese.toLowerCase().trim();
          const isSameDefinition = wordsList.every(w => 
            w.chinese.toLowerCase().trim() === firstDefinition
          );
          
          duplicates.push({
            english: wordsList[0].english, // 使用原始大小寫
            words: wordsList,
            isSameDefinition: isSameDefinition
          });
        }
      }
      
      console.log('找到', duplicates.length, '組重複單字');
      return duplicates;
    } catch (error) {
      console.error('偵測重複單字時發生錯誤:', error);
      return [];
    }
  }

  // ===========================================
  // 重複單字處理
  // ===========================================

  /**
  * 合併重複單字群組的中繼資料，避免去重/合併時遺失欄位。
  * 規則：
  *   - 不熟程度(difficultyLevel)：取群組最大值（最不熟者優先，確保仍會被複習）
  *   - 圖片(image/imageUrl)：取第一個非空值（依群組順序，目標單字優先）
  *   - 標籤(tags)：聯集，去重並保留出現順序
  *   - 要會拼(mustSpell)：取最嚴等級（任一為 1「衝刺要會拼單字」→ 1；否則任一為 0.5「隨機要會拼單字」→ 0.5；否則若任一為 -1「看懂就好」且無更嚴者 → -1；否則 0）
  * 複習日期(lastReviewDate)不在此合併，沿用目標列原值以避免影響 SRS 排程。
  * @param {Array} groupWords 同一英文單字的重複群組（目標單字應排在第一個）
  * @returns {Object} { difficultyLevel, image, mustSpell, tags }
  */
  function mergeDuplicateMetadata(groupWords) {
    var merged = { difficultyLevel: undefined, image: '', mustSpell: 0, tags: [] };
    var seenTags = {};
    for (var i = 0; i < groupWords.length; i++) {
      var w = groupWords[i];
      if (!w) continue;

      if (w.difficultyLevel !== undefined && w.difficultyLevel !== null && w.difficultyLevel !== '') {
        var lvl = Number(w.difficultyLevel);
        if (!isNaN(lvl) && (merged.difficultyLevel === undefined || lvl > merged.difficultyLevel)) {
          merged.difficultyLevel = lvl;
        }
      }

      var img = w.image || w.imageUrl || '';
      if (!merged.image && img) {
        merged.image = img.toString().trim();
      }

      var ms = normalizeMustSpell(w.mustSpell);
      if (ms === 1) {
        merged.mustSpell = 1;
      } else if (ms === 0.5 && merged.mustSpell !== 1) {
        merged.mustSpell = 0.5;
      } else if (ms === -1 && merged.mustSpell === 0) {
        merged.mustSpell = -1;
      }

      if (w.tags && w.tags.length) {
        for (var t = 0; t < w.tags.length; t++) {
          var tag = (w.tags[t] || '').toString().trim();
          if (tag && !seenTags[tag]) {
            seenTags[tag] = true;
            merged.tags.push(tag);
          }
        }
      }
    }
    if (merged.difficultyLevel === undefined) {
      merged.difficultyLevel = 0;
    }
    return merged;
  }

  /**
  * 將合併後的中繼資料寫入工作表指定列（A=要會拼, D=不熟程度, E=圖片URL, H=標籤）。
  */
  function writeMergedMetadataToRow(sheet, row, groupWords) {
    var merged = mergeDuplicateMetadata(groupWords);
    var level = Math.max(-999, Math.min(10, parseInt(merged.difficultyLevel) || 0));
    sheet.getRange(row, COL_NUM.DIFFICULTY).setValue(level === 0 ? '' : level);
    sheet.getRange(row, COL_NUM.IMAGE_URL).setValue(merged.image);
    sheet.getRange(row, COL_NUM.MUST_SPELL).setValue(merged.mustSpell === 0 ? '' : merged.mustSpell);
    sheet.getRange(row, COL_NUM.TAGS).setValue(merged.tags.join(','));
    console.log('已寫入合併中繼資料 - 不熟程度:', level, '圖片:', merged.image, '要會拼:', merged.mustSpell, '標籤:', merged.tags.join(','));
  }

  /**
  * 刪除一組重複單字所在的列，回傳成功刪除的數量。
  */
  function deleteDuplicateRows(spreadsheet, deleteWords) {
    var deletedCount = 0;
    for (var i = 0; i < deleteWords.length; i++) {
      var word = deleteWords[i];
      try {
        var sheet = spreadsheet.getSheetByName(word.sheetName);
        if (!sheet) {
          console.error('找不到工作表:', word.sheetName);
          continue;
        }

        var foundRowIndex = findWordRowIndex(sheet, word.english, word.chinese);

        if (foundRowIndex !== -1) {
          var actualRow = foundRowIndex + 1; // 轉換為1-based索引
          sheet.deleteRow(actualRow);
          deletedCount++;
          console.log('已刪除:', word.sheetName, '第', actualRow, '行', '內容:', word.english, '-', word.chinese);
        } else {
          console.warn('找不到要刪除的行:', word.english, '-', word.chinese, '在工作表:', word.sheetName);
        }
      } catch (deleteError) {
        console.error('刪除單字失敗:', word, deleteError);
      }
    }
    return deletedCount;
  }

  /**
  * 處理重複單字 - 保留一個，刪除其他
  * 保留列會合併其餘重複項目的中繼資料（不熟程度、圖片、標籤、要會拼），避免欄位遺失。
  */
  function handleDuplicateWordKeepOne(sheetId, keepWord, deleteWords) {
    try {
      console.log('處理重複單字 - 保留一個，刪除其他');
      console.log('保留:', keepWord);
      console.log('刪除:', deleteWords);
      
      const spreadsheet = openSpreadsheetSafely(sheetId.trim());

      // 先將其他重複項目的中繼資料合併寫入保留列，避免刪除後遺失欄位
      try {
        const keepSheet = spreadsheet.getSheetByName(keepWord.sheetName);
        if (keepSheet) {
          const keepRowIndex = findWordRowIndex(keepSheet, keepWord.english, keepWord.chinese);
          if (keepRowIndex !== -1) {
            writeMergedMetadataToRow(keepSheet, keepRowIndex + 1, [keepWord].concat(deleteWords));
          } else {
            console.warn('找不到保留單字位置，略過中繼資料合併:', keepWord.english, '-', keepWord.chinese);
          }
        }
      } catch (metaError) {
        console.error('合併保留單字中繼資料失敗:', metaError);
      }

      // 為每個要刪除的單字找到當前的實際行位置並刪除
      const deletedCount = deleteDuplicateRows(spreadsheet, deleteWords);
      
      console.log('成功刪除', deletedCount, '個重複單字');
      return { success: true, deletedCount: deletedCount };
    } catch (error) {
      console.error('處理重複單字失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
  * 處理重複單字 - 合併定義
  */
  function handleDuplicateWordMerge(sheetId, targetWord, mergeWords) {
    try {
      console.log('處理重複單字 - 合併定義');
      console.log('目標單字:', targetWord);
      console.log('合併來源:', mergeWords);
      
      const spreadsheet = openSpreadsheetSafely(sheetId.trim());
      
      // 準備合併後的定義
      const allDefinitions = [targetWord, ...mergeWords].map((w, index) => 
        `${index + 1}. ${w.chinese.trim()}`
      );
      const mergedDefinition = allDefinitions.join('\n');
      
      // 更新目標單字的定義與合併中繼資料（不熟程度、圖片、標籤、要會拼）
      const targetSheet = spreadsheet.getSheetByName(targetWord.sheetName);
      if (targetSheet) {
        const foundRowIndex = findWordRowIndex(targetSheet, targetWord.english, targetWord.chinese);
        
        if (foundRowIndex !== -1) {
          const targetRow = foundRowIndex + 1; // 轉換為1-based索引
          // 合併其餘重複項目的中繼資料到目標列（不熟程度、圖片、要會拼、標籤）
          writeMergedMetadataToRow(targetSheet, targetRow, [targetWord].concat(mergeWords));
          targetSheet.getRange(targetRow, COL_NUM.CHINESE).setValue(mergedDefinition);
          console.log('已更新目標定義與中繼資料:', targetWord.sheetName, '第', targetRow, '行');
        } else {
          console.error('找不到目標單字:', targetWord.english, '-', targetWord.chinese);
          return { success: false, error: '找不到目標單字位置' };
        }
      }
      
      // 刪除其他重複項目（直接刪列，中繼資料已於上方合併寫入目標列）
      const deletedCount = deleteDuplicateRows(spreadsheet, mergeWords);
      
      return { 
        success: true, 
        mergedDefinition: mergedDefinition,
        deletedCount: deletedCount 
      };
    } catch (error) {
      console.error('合併重複單字失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
  * 在記憶體中自動處理重複單字（不修改Google Sheet）
  */
  function autoHandleSkippedDuplicatesInMemory(allWords, duplicates) {
    try {
      console.log('在記憶體中自動處理重複單字，總數:', duplicates.length);
      
      const results = [];
      const wordsToRemove = new Set(); // 記錄要從記憶體中移除的單字ID
      const wordsToModify = new Map(); // 記錄要修改定義的單字ID和新定義
      
      for (let i = 0; i < duplicates.length; i++) {
        const duplicate = duplicates[i];
        console.log('處理重複單字:', duplicate.english, '是否相同定義:', duplicate.isSameDefinition);
        
        if (duplicate.isSameDefinition) {
          // 中文意義相同：保留第一個工作表的，移除其他（仍合併中繼資料避免遺失欄位）
          const keepWord = duplicate.words[0]; // 第一個工作表的
          const removeWords = duplicate.words.slice(1); // 其他工作表的
          
          console.log('相同定義，保留第一個工作表:', keepWord.sheetName);
          
          wordsToModify.set(keepWord.id, { chinese: null, group: duplicate.words });
          
          // 記錄要移除的單字ID
          removeWords.forEach(word => {
            wordsToRemove.add(word.id);
          });
          
          results.push({
            english: duplicate.english,
            action: 'keep_first',
            success: true,
            keptSheet: keepWord.sheetName,
            removedCount: removeWords.length
          });
        } else {
          // 中文意義不同：合併定義到第一個工作表的單字
          const targetWord = duplicate.words[0]; // 第一個工作表的作為目標
          const mergeWords = duplicate.words.slice(1); // 其他工作表的合併進來
          
          console.log('不同定義，合併到第一個工作表:', targetWord.sheetName);
          
          // 準備合併後的定義
          const allDefinitions = duplicate.words.map((w, index) => 
            `${index + 1}. ${w.chinese.trim()}`
          );
          const mergedDefinition = allDefinitions.join('\n');
          
          // 記錄要修改的單字
          wordsToModify.set(targetWord.id, { chinese: mergedDefinition, group: duplicate.words });
          
          // 記錄要移除的單字ID
          mergeWords.forEach(word => {
            wordsToRemove.add(word.id);
          });
          
          results.push({
            english: duplicate.english,
            action: 'merge_to_first',
            success: true,
            targetSheet: targetWord.sheetName,
            mergedDefinition: mergedDefinition,
            removedCount: mergeWords.length
          });
        }
      }
      
      // 處理單字陣列：移除重複項目並合併定義與中繼資料
      const processedWords = [];
      for (let i = 0; i < allWords.length; i++) {
        const word = allWords[i];
        
        if (wordsToRemove.has(word.id)) {
          // 跳過要移除的單字
          continue;
        }
        
        if (wordsToModify.has(word.id)) {
          // 合併中繼資料（不熟程度、圖片、標籤、要會拼），必要時更新定義
          const mod = wordsToModify.get(word.id);
          const merged = mergeDuplicateMetadata(mod.group);
          const modifiedWord = { ...word };
          modifiedWord.difficultyLevel = merged.difficultyLevel;
          modifiedWord.image = merged.image;
          modifiedWord.mustSpell = merged.mustSpell;
          modifiedWord.tags = merged.tags;
          if (mod.chinese) {
            modifiedWord.chinese = mod.chinese;
          }
          processedWords.push(modifiedWord);
        } else {
          // 保持原樣
          processedWords.push(word);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const removedCount = wordsToRemove.size;
      
      console.log('記憶體處理完成，成功:', successCount, '總數:', results.length, '移除單字數:', removedCount);
      console.log('處理前單字數:', allWords.length, '處理後單字數:', processedWords.length);
      
      return {
        success: true,
        processedWords: processedWords,
        results: results,
        successCount: successCount,
        totalCount: results.length,
        originalCount: allWords.length,
        processedCount: processedWords.length,
        removedCount: removedCount
      };
    } catch (error) {
      console.error('記憶體自動處理重複單字失敗:', error);
      return {
        success: false,
        error: error.message,
        processedWords: allWords // 失敗時返回原始單字
      };
    }
  }

  /**
  * 自動處理重複單字（修改Google Sheet）
  */
  function autoHandleSkippedDuplicates(sheetId, duplicates) {
    try {
      console.log('自動處理重複單字（跳過不處理邏輯），總數:', duplicates.length);
      
      const results = [];
      
      for (let i = 0; i < duplicates.length; i++) {
        const duplicate = duplicates[i];
        console.log('處理重複單字:', duplicate.english, '是否相同定義:', duplicate.isSameDefinition);
        
        if (duplicate.isSameDefinition) {
          // 中文意義相同：保留第一個工作表的，刪除其他
          const keepWord = duplicate.words[0]; // 第一個工作表的
          const deleteWords = duplicate.words.slice(1); // 其他工作表的
          
          console.log('相同定義，保留第一個工作表:', keepWord.sheetName);
          const result = handleDuplicateWordKeepOne(sheetId, keepWord, deleteWords);
          
          results.push({
            english: duplicate.english,
            action: 'keep_first',
            success: result.success,
            keptSheet: keepWord.sheetName,
            deletedCount: result.deletedCount || 0,
            error: result.error
          });
        } else {
          // 中文意義不同：自動合併成一個（保留第一個工作表的，合併其他定義）
          const targetWord = duplicate.words[0]; // 第一個工作表的作為目標
          const mergeWords = duplicate.words.slice(1); // 其他工作表的合併進來
          
          console.log('不同定義，合併到第一個工作表:', targetWord.sheetName);
          const result = handleDuplicateWordMerge(sheetId, targetWord, mergeWords);
          
          results.push({
            english: duplicate.english,
            action: 'merge_to_first',
            success: result.success,
            targetSheet: targetWord.sheetName,
            mergedDefinition: result.mergedDefinition,
            deletedCount: result.deletedCount || 0,
            error: result.error
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      console.log('自動處理完成，成功:', successCount, '總數:', results.length);
      
      return {
        success: true,
        results: results,
        successCount: successCount,
        totalCount: results.length
      };
    } catch (error) {
      console.error('自動處理重複單字失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===========================================
  // 高階整合功能
  // ===========================================

  /**
  * 載入單字時包含重複偵測
  */
  function getWordsFromSheetsWithDuplicateDetection(sheetId, sheetNames, autoHandle = false) {
    try {
      console.log('載入單字並偵測重複，Sheet ID:', sheetId, '工作表:', sheetNames, '自動處理:', autoHandle);
      
      // 先載入所有單字
      const allWords = getWordsFromSheets(sheetId, sheetNames);
      
      // 偵測重複
      const duplicates = detectDuplicateWords(allWords);
      
      if (autoHandle && duplicates.length > 0) {
        console.log('自動處理重複單字（僅記憶體處理），數量:', duplicates.length);
        
        // 在記憶體中處理重複單字，不修改實際的Google Sheet
        const autoResult = autoHandleSkippedDuplicatesInMemory(allWords, duplicates);
        
        if (autoResult.success) {
          console.log('記憶體自動處理成功，去重後單字數量:', autoResult.processedWords.length);
          
          return {
            words: autoResult.processedWords,
            duplicates: [],
            hasDuplicates: false,
            autoHandled: true,
            autoResults: autoResult
          };
        } else {
          console.error('記憶體自動處理失敗:', autoResult.error);
          // 如果自動處理失敗，仍然返回原始結果，讓用戶手動處理
          return {
            words: allWords,
            duplicates: duplicates,
            hasDuplicates: duplicates.length > 0,
            autoHandled: false,
            autoError: autoResult.error
          };
        }
      } else {
        return {
          words: allWords,
          duplicates: duplicates,
          hasDuplicates: duplicates.length > 0,
          autoHandled: false
        };
      }
    } catch (error) {
      console.error('載入單字並偵測重複時發生錯誤:', error);
      throw error;
    }
  }

  // ===========================================
  // KK 音標 REST API
  // ===========================================
  //
  // 前端透過 google.script.run 呼叫 queryKKPhonetic(word)，
  // 本函式再依序查：
  //   1. 本專案 Sheet 內建的「KK音標字庫」工作表（欄位：A=單字, B=KK音標, 可多列候選）
  //   2. 外部字典 REST API（moedict / 字典網），失敗時靜默降級
  // 回傳所有候選音標（candidates），由使用者選定後以 updateWordProperties(kkPhonetic)
  // 寫入單字檔的 I 欄。
  //
  // REST 端點（Google Web App JSONP / doGet）: doGet 支援 ?action=kk&word=apple
  // 回傳 ContentService JSON，可讓外部程式或測試腳本直接查詢 KK 音標。
  // ===========================================

  /** KK 音標字庫工作表名稱 */
  var KK_DICT_SHEET_NAME = 'KK音標字庫';
  /** 使用者指定字庫位置的 Script Properties key */
  var KK_DICT_SHEET_ID_KEY = 'KK_DICT_SHEET_ID';
  /**
  * KK 音標完整字庫不 hard-code 在程式碼：
  *   - 完整字庫（約 12.6 萬單字，由 open-dict-data/ipa-dict en_US 轉換）
  *     用 importKKPhonetics.gs 的 importKKPhoneticsFromGitHub() 匯入
  *     「KK音標字庫」工作表（本機先跑 node scripts/build-kk-dictionary.mjs 產生 data/kk-phonetics.json）。
  *   - 字庫缺的單字自動由外部字典 API 補查並寫回字庫。
  */

  /**
  * KK 音標字庫查找目標試算表 ID（依序）：
  *   1. setKKDictSpreadsheet() 記住的使用者指定字庫
  *   2. 單字檔試算表（wordsSheetId）
  * @returns {Array<string>} 候選試算表 ID 清單
  */
  function getKKDictSpreadsheetCandidates(wordsSheetId) {
    var ids = [];
    try {
      var saved = PropertiesService.getScriptProperties().getProperty(KK_DICT_SHEET_ID_KEY);
      if (saved) ids.push(saved);
    } catch (propError) { /* PropertiesService 無法使用時忽略 */ }
    if (wordsSheetId) ids.push(wordsSheetId);
    return ids;
  }

  /**
  * 在單一試算表的字庫工作表中查找單字（TextFinder，12 萬列仍毫秒級）。
  * 字庫格式：第 1 列為標題列（單字 / KK音標），第 2 列起為資料；
  * 同一單字可有多列（多種 KK 音標候選），比對不分大小寫。
  * @param {Sheet} dictSheet - 字庫工作表
  * @param {string} key - 小寫單字
  * @returns {Array<string>} 候選音標陣列（查無回空陣列）
  */
  function findKKDictRows_(dictSheet, key) {
    var lastRow = dictSheet.getLastRow();
    if (lastRow < 2) return [];
    var finder = dictSheet.getRange(2, 1, lastRow - 1, 1)
      .createTextFinder(key)
      .matchEntireCell(true)
      .matchCase(false);
    var matches = finder.findAll();
    var out = [];
    for (var i = 0; i < matches.length; i++) {
      var phon = dictSheet.getRange(matches[i].getRow(), 2).getValue();
      phon = phon ? phon.toString().trim() : '';
      if (phon && out.indexOf(phon) === -1) out.push(phon);
    }
    return out;
  }

  /**
  * 在單一試算表中查找 KK 音標。
  * @param {Spreadsheet} ss - 已開啟的試算表
  * @param {string} key - 小寫單字
  * @returns {Array<string>|null} 候選音標陣列；無字庫工作表回 null
  */
  function lookupKKPhoneticInSpreadsheet(ss, key) {
    try {
      if (!ss) return null;
      var dictSheet = ss.getSheetByName(KK_DICT_SHEET_NAME);
      if (!dictSheet) return null;
      return findKKDictRows_(dictSheet, key);
    } catch (error) {
      console.error('查找 KK 音標字庫失敗:', error);
      return null;
    }
  }

  /**
  * 依序在（1) 使用者指定字庫 2) 單字檔試算表 3) 腳本綁定試算表 查找單字音標。
  * @param {string} key - 小寫單字
  * @param {string} [wordsSheetId] - 單字檔試算表 ID
  * @returns {Array<string>} 候選音標陣列（全部都沒有字庫或查無回空陣列）
  */
  function lookupKKPhoneticAnywhere(key, wordsSheetId) {
    var candidateIds = getKKDictSpreadsheetCandidates(wordsSheetId);
    for (var i = 0; i < candidateIds.length; i++) {
      try {
        var found = lookupKKPhoneticInSpreadsheet(SpreadsheetApp.openById(candidateIds[i]), key);
        if (found && found.length > 0) return found;
      } catch (openError) {
        console.warn('開啟 KK 音標字庫候選試算表失敗:', candidateIds[i], openError);
      }
    }
    try {
      var bound = SpreadsheetApp.getActiveSpreadsheet();
      if (bound) {
        var boundFound = lookupKKPhoneticInSpreadsheet(bound, key);
        if (boundFound && boundFound.length > 0) return boundFound;
      }
    } catch (boundError) { /* 無綁定試算表（獨立部署）時忽略 */ }
    return [];
  }

  /**
  * 將查到的音標寫入字庫工作表（自動快取，之後同單字直接命中字庫、不再打外部 API）。
  * 寫入位置依序：使用者指定字庫 → 單字檔試算表 → 綁定試算表；
  * 字庫工作表不存在時自動建立（標題列：單字 / KK音標）。
  * @param {string} word - 英文單字
  * @param {Array<string>|string} phonetics - 候選音標（可多筆）
  * @param {string} [wordsSheetId] - 單字檔試算表 ID
  * @returns {boolean} 是否成功寫入（已存在也回 true）
  */
  function saveKKPhoneticToDictionary(word, phonetics, wordsSheetId) {
    try {
      var ss = null;
      var savedId = getKKDictSpreadsheetCandidates('');[0];
      if (savedId) {
        try { ss = SpreadsheetApp.openById(savedId); } catch (e) { ss = null; }
      }
      if (!ss && wordsSheetId) {
        try { ss = SpreadsheetApp.openById(wordsSheetId); } catch (e2) { ss = null; }
      }
      if (!ss) {
        try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e3) { ss = null; }
      }
      if (!ss) return false;

      var key = (word || '').toString().trim().toLowerCase();
      if (!key) return false;

      var dictSheet = ss.getSheetByName(KK_DICT_SHEET_NAME);
      if (!dictSheet) {
        dictSheet = ss.insertSheet(KK_DICT_SHEET_NAME);
        dictSheet.getRange(1, 1, 1, 2).setValues([['單字', 'KK音標']]).setFontWeight('bold');
        dictSheet.setFrozenRows(1);
      }

      var phons = Array.isArray(phonetics) ? phonetics : [phonetics];
      var existing = findKKDictRows_(dictSheet, key);
      var rows = [];
      for (var i = 0; i < phons.length; i++) {
        var phon = phons[i] ? phons[i].toString().trim() : '';
        if (!phon) continue;
        if (existing.indexOf(phon) !== -1) continue;
        rows.push([key, phon]);
      }
      if (rows.length === 0) return true; // 已存在，視為成功
      dictSheet.getRange(dictSheet.getLastRow() + 1, 1, rows.length, 2).setValues(rows);
      console.log('已將線上查詢結果存入 KK 音標字庫:', key, rows.length, '筆');
      return true;
    } catch (error) {
      console.error('寫入 KK 音標字庫失敗:', error);
      return false;
    }
  }  /**
  * IPA 音標轉 KK 音標（與 scripts/build-kk-dictionary.mjs 的權威實作保持同步）。
  * 重點規則：əɫ→ḷ（音節性 l，apple → ˋæpḷ）、ˈ→ˋ、ˌ→ˏ、eɪ→e、oʊ→o、
  * ɝ 依重音分流（帶主重音保留 ɝ，其餘 → ɚ）、ɫ→l、ɹ→r、ɡ→g、雙母音 aɪ/aʊ/ɔɪ 保留。
  */
  var IPA_TO_KK_MULTI_STEPS = [
    ['əɫ', 'ḷ'], ['əl', 'ḷ'],
    ['eɪ', 'e'], ['oʊ', 'o'], ['əʊ', 'o'],
    ['aɪ', '\u0001'], ['aʊ', '\u0002'], ['ɔɪ', '\u0003'],
    ['tʃ', 'tʃ'], ['dʒ', 'dʒ']
  ];
  var IPA_TO_KK_PLACEHOLDERS = { '\u0001': 'aɪ', '\u0002': 'aʊ', '\u0003': 'ɔɪ' };
  var IPA_TO_KK_CHAR_MAP = {
    'ˈ': 'ˋ', 'ˌ': 'ˏ',
    'ɫ': 'l', 'ɹ': 'r', 'ɡ': 'g', 'g': 'g',
    'ɑ': 'ɑ', 'æ': 'æ', 'ʌ': 'ʌ', 'ɛ': 'ɛ', 'ɪ': 'ɪ', 'ʊ': 'ʊ', 'ə': 'ə', 'ɔ': 'ɔ',
    'i': 'i', 'u': 'u', 'e': 'ɛ', 'o': 'o',
    'a': 'æ',
    'ʃ': 'ʃ', 'ʒ': 'ʒ', 'θ': 'θ', 'ð': 'ð', 'ŋ': 'ŋ',
    'j': 'j', 'w': 'w', 'h': 'h',
    'ḷ': 'ḷ', 'ɚ': 'ɚ', 'ɝ': 'ɝ',
    'ː': '', '(': '', ')': '', '.': ''
  };

  /**
  * ɝ 依重音分流：帶重音符（ˈ/ˌ）的音節裡保留 ɝ，其餘 → ɚ。
  * 例：world /ˈwɝɫd/ → ˋwɝld；letter /ˈlɛtɝ/ → ˋlɛtɚ。
  */
  function splitStressedEr_(s) {
    var out = '';
    var lastStressIdx = -1;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === 'ˈ' || ch === 'ˌ') lastStressIdx = i;
      if (ch === 'ɝ') {
        var between = lastStressIdx >= 0 ? s.slice(lastStressIdx + 1, i) : null;
        var stressed = between !== null && between.length <= 2 && !/[æʌɛɪʊəɔaeiou]/.test(between);
        out += stressed ? 'ɝ' : 'ɚ';
      } else {
        out += ch;
      }
    }
    return out;
  }

  /**
  * @param {string} ipa - IPA 音標（可含 / / 斜線）
  * @returns {string} KK 音標（轉換失敗回空字串）
  */
  function ipaToKK(ipa) {
    var s = (ipa || '').toString().trim().replace(/^\/+|\/+$/g, '');
    if (!s) return '';
    s = splitStressedEr_(s);
    for (var i = 0; i < IPA_TO_KK_MULTI_STEPS.length; i++) {
      s = s.split(IPA_TO_KK_MULTI_STEPS[i][0]).join(IPA_TO_KK_MULTI_STEPS[i][1]);
    }
    var out = '';
    for (var k = 0; k < s.length; k++) {
      var ch = s[k];
      if (IPA_TO_KK_PLACEHOLDERS.hasOwnProperty(ch)) {
        out += IPA_TO_KK_PLACEHOLDERS[ch];
      } else if (IPA_TO_KK_CHAR_MAP.hasOwnProperty(ch)) {
        out += IPA_TO_KK_CHAR_MAP[ch];
      } else if (/[a-zA-Z']/.test(ch)) {
        out += ch; // 一般子音字母直接保留
      }
      // 其餘未知 IPA 符號（長音符、聲調等）捨棄
    }
    return out;
  }

  /**
  * 從外部字典 REST API 查詢音標（伺服端 fetch，全部失敗時回傳空陣列）。
  * 來源順序：
  *   1. Free Dictionary API（dictionaryapi.dev，查詢量大；回傳 IPA，自動轉 KK）
  *   2. moedict 英文 API（教育部，原生 KK；近年服務不穩定，僅作備援）
  * @param {string} word - 英文單字
  * @returns {Object} { candidates: [KK 音標], sources: [來源名稱] }
  */
  function fetchKKPhoneticFromWeb(word) {
    var candidates = [];
    var sources = [];
    var trimmed = (word || '').toString().trim();
    // 只查詢合理的英文單字（phrase/sentence 不會到這裡，保護外部 API 配額）
    if (!trimmed || !/^[A-Za-z][A-Za-z'-]*$/.test(trimmed)) {
      return { candidates: candidates, sources: sources };
    }

    // 來源 1：Free Dictionary API（dictionaryapi.dev）
    try {
      var url1 = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(trimmed.toLowerCase());
      var resp1 = UrlFetchApp.fetch(url1, { muteHttpExceptions: true, followRedirects: true });
      if (resp1.getResponseCode() === 200) {
        var data1 = JSON.parse(resp1.getContentText());
        if (Array.isArray(data1) && data1.length > 0 && data1[0]) {
          var ipaList = [];
          if (data1[0].phonetic) ipaList.push(data1[0].phonetic);
          var phonetics = data1[0].phonetics || [];
          for (var i = 0; i < phonetics.length; i++) {
            if (phonetics[i] && phonetics[i].text) ipaList.push(phonetics[i].text);
          }
          for (var k = 0; k < ipaList.length; k++) {
            var kk = ipaToKK(ipaList[k]);
            if (kk && candidates.indexOf(kk) === -1) candidates.push(kk);
          }
          if (candidates.length > 0) sources.push('freedictionary');
        }
      }
    } catch (webError1) {
      console.warn('KK 音標外部查詢（Free Dictionary）失敗:', webError1);
    }

    // 來源 2：moedict 英文 API（教育部；備援，原生 KK 音標）
    if (candidates.length === 0) {
      try {
        var url2 = 'https://www.moedict.tw/e/' + encodeURIComponent(trimmed) + '.json';
        var resp2 = UrlFetchApp.fetch(url2, { muteHttpExceptions: true, followRedirects: true });
        if (resp2.getResponseCode() === 200) {
          var data2 = JSON.parse(resp2.getContentText());
          if (data2 && data2.heteronyms) {
            for (var h = 0; h < data2.heteronyms.length; h++) {
              var het = data2.heteronyms[h];
              if (het && het.kk) {
                // kk 欄位可能是「音標1 / 音標2」多筆
                var parts = het.kk.split('/');
                for (var p = 0; p < parts.length; p++) {
                  var phon = parts[p].trim();
                  if (phon && candidates.indexOf(phon) === -1) candidates.push(phon);
                }
              }
            }
            if (candidates.length > 0) sources.push('moedict');
          }
        }
      } catch (webError2) {
        console.warn('KK 音標外部查詢（moedict）失敗:', webError2);
      }
    }

    return { candidates: candidates, sources: sources };
  }
  
  /**
  * 查詢單字的所有候選 KK 音標（前端主要進入點，google.script.run 呼叫）。
  * 查找順序：
  *   1. KK 音標字庫工作表（使用者指定 → 單字檔 → 綁定試算表）+ 內建字庫
  *   2. 外部字典 REST API（Free Dictionary → moedict）；
  *      查到後自動存入字庫工作表，之後同單字直接命中字庫、不再打外部 API
  * @param {string} word - 英文單字
  * @param {string} [wordsSheetId] - 單字檔試算表 ID（決定字庫工作表所在位置）
  * @returns {Object} { success, word, candidates: [string], source: 'dict'|'web'|'none', webSources?, dictCached?, error? }
  */
  function queryKKPhonetic(word, wordsSheetId) {
    try {
      var trimmed = (word || '').toString().trim();
      if (!trimmed) {
        return { success: false, word: word, candidates: [], source: 'none', error: '缺少單字' };
      }

      // 1) 字庫工作表（TextFinder 快速查找，含 12.6 萬單字完整字庫）
      var key = trimmed.toLowerCase();
      var dictCandidates = lookupKKPhoneticAnywhere(key, wordsSheetId);
      if (dictCandidates.length > 0) {
        console.log('KK 音標（字庫）:', trimmed, dictCandidates);
        return { success: true, word: trimmed, candidates: dictCandidates.slice(), source: 'dict' };
      }

      // 1.5) 單字型態列（swing; swung; swung / woman / women）：
      //      整串在字庫查不到，拆成各段逐段查詢後組合
      var segments = splitWordFormList_(trimmed);
      if (segments) {
        var segCandidates = [];
        var allFound = true;
        var anyWeb = false;
        for (var s = 0; s < segments.length; s++) {
          var segKey = segments[s].toLowerCase();
          var segDict = lookupKKPhoneticAnywhere(segKey, wordsSheetId);
          if (segDict.length === 0) {
            var segWeb = fetchKKPhoneticFromWeb(segments[s]);
            if (segWeb.candidates.length > 0) {
              segDict = segWeb.candidates;
              anyWeb = true;
              // 各段查到的結果存入字庫，之後直接命中
              saveKKPhoneticToDictionary(segKey, segDict, wordsSheetId);
            }
          }
          if (segDict.length === 0) { allFound = false; break; }
          segCandidates.push(segDict);
        }
        if (allFound) {
          var combined = combineWordFormPhonetics_(segCandidates);
          console.log('KK 音標（型態列組合）:', trimmed, combined);
          return { success: true, word: trimmed, candidates: combined, source: anyWeb ? 'web' : 'dict' };
        }
      }

      // 2) 外部字典 REST API
      var web = fetchKKPhoneticFromWeb(trimmed);
      if (web.candidates.length > 0) {
        console.log('KK 音標（外部 API）:', trimmed, web.candidates, web.sources);
        // 查到後自動存入字庫（之後同單字直接命中字庫，不再打外部 API）
        var dictCached = saveKKPhoneticToDictionary(trimmed, web.candidates, wordsSheetId);
        return {
          success: true,
          word: trimmed,
          candidates: web.candidates.slice(),
          source: 'web',
          webSources: web.sources,
          dictCached: dictCached
        };
      }

      // 查無資料
      return { success: true, word: trimmed, candidates: [], source: 'none' };
    } catch (error) {
      console.error('查詢 KK 音標失敗:', error);
      return { success: false, word: word, candidates: [], source: 'none', error: error.message };
    }
  }

  /**
  * 將單字型態列（swing; swung; swung、woman / women）拆成各段。
  * 每段皆須為單一英文詞（可含 hyphen/撇號）才成立；否則回 null（交由一般流程）。
  * 與 script-core.html 的 isWordFormList 保持同步。
  * @param {string} word - 英文字串
  * @returns {Array<string>|null}
  */
  function splitWordFormList_(word) {
    var trimmed = (word || '').toString().trim();
    if (!trimmed) return null;
    if (trimmed.indexOf(';') === -1 && trimmed.indexOf('/') === -1) return null;
    var segments = trimmed.split(/[;/]/);
    if (segments.length < 2) return null;
    var wordToken = /^[A-Za-z][A-Za-z'-]*$/;
    var out = [];
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i].trim();
      if (!seg || !wordToken.test(seg)) return null;
      out.push(seg);
    }
    return out;
  }

  /**
  * 組合各段的候選音標（笛卡兒積，上限 8 筆）。
  * 例：swing 1 筆 × swung 2 筆 × swung 1 筆 → 2 筆組合候選。
  * @param {Array<Array<string>>} segmentCandidates - 各段候選音標
  * @returns {Array<string>}
  */
  function combineWordFormPhonetics_(segmentCandidates) {
    var combos = [''];
    for (var i = 0; i < segmentCandidates.length; i++) {
      var next = [];
      for (var c = 0; c < combos.length; c++) {
        for (var k = 0; k < segmentCandidates[i].length; k++) {
          next.push(combos[c] ? combos[c] + ' ' + segmentCandidates[i][k] : segmentCandidates[i][k]);
        }
      }
      combos = next;
      if (combos.length > 8) combos = combos.slice(0, 8);
    }
    return combos;
  }

  /**
  * 記住 KK 音標字庫所在的試算表 ID（寫入 Script Properties，跨執行有效）。
  * 在 Apps Script 編輯器執行：setKKDictSpreadsheet('你的試算表ID')
  * @param {string} sheetId - 試算表 ID 或完整網址
  * @returns {Object} { success, sheetId }
  */
  function setKKDictSpreadsheet(sheetId) {
    var clean = validateAndCleanSheetId(sheetId);
    PropertiesService.getScriptProperties().setProperty(KK_DICT_SHEET_ID_KEY, clean);
    console.log('已設定 KK 音標字庫試算表:', clean);
    return { success: true, sheetId: clean };
  }

  /**
  * 診斷 KK 音標查詢設定（字庫位置與列數、單字試查）。
  * 在 Apps Script 編輯器執行：debugKKPhonetics('apple')
  * 查不到音標時先用這個函式確認問題所在（例如字庫尚未匯入 12.6 萬單字）。
  * @param {string} [testWord] - 順便試查的單字
  * @returns {Object} 診斷資訊
  */
  function debugKKPhonetics(testWord) {
    var info = {
      dictSheetName: KK_DICT_SHEET_NAME,
      configuredSheetId: '',
      dictFoundIn: [],
      testWord: testWord || ''
    };
    try {
      info.configuredSheetId = PropertiesService.getScriptProperties().getProperty(KK_DICT_SHEET_ID_KEY) || '';
    } catch (propError) { /* 忽略 */ }
    var candidateIds = getKKDictSpreadsheetCandidates('');
    for (var i = 0; i < candidateIds.length; i++) {
      try {
        var ss = SpreadsheetApp.openById(candidateIds[i]);
        var dictSheet = ss.getSheetByName(KK_DICT_SHEET_NAME);
        if (dictSheet) {
          info.dictFoundIn.push({ spreadsheetId: candidateIds[i], rows: Math.max(dictSheet.getLastRow() - 1, 0) });
        }
      } catch (openError) { /* 忽略 */ }
    }
    try {
      var bound = SpreadsheetApp.getActiveSpreadsheet();
      if (bound) {
        var boundSheet = bound.getSheetByName(KK_DICT_SHEET_NAME);
        if (boundSheet) {
          info.dictFoundIn.push({ spreadsheetId: 'bound:' + bound.getId(), rows: Math.max(boundSheet.getLastRow() - 1, 0) });
        }
      }
    } catch (boundError) { /* 無綁定試算表 */ }
    if (info.testWord) {
      info.testResult = queryKKPhonetic(info.testWord);
    }
    return info;
  }

  /**
  * REST 端點：doGet 支援 ?action=kk&word=apple 直接以 HTTP 查詢 KK 音標。
  * 回傳 JSON：{ success, word, candidates, source }
  */
  function doGet(e) {
    try {
      var action = e && e.parameter ? e.parameter.action : null;
      if (action === 'kk') {
        var word = e.parameter.word || '';
        var result = queryKKPhonetic(word);
        return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } catch (kkError) {
      console.error('KK 音標 REST 查詢失敗:', kkError);
    }

    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }