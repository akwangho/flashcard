function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// 新增：獲取工作表清單和單字數量
function getSheetsList(sheetId) {
  try {
    console.log('開始載入工作表清單，Sheet ID:', sheetId);
    
    if (!sheetId || sheetId.trim() === '') {
      throw new Error('請提供有效的 Google Sheet ID');
    }
    
    // 清理 Sheet ID (移除多餘的空格和特殊字符)
    const cleanSheetId = sheetId.trim();
    console.log('清理後的 Sheet ID:', cleanSheetId);
    
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(cleanSheetId);
    } catch (openError) {
      console.error('無法開啟 Spreadsheet:', openError);
      throw new Error('無法開啟 Google Sheet，請檢查：\n1. Sheet ID 是否正確\n2. 您是否有存取權限\n3. Sheet 是否存在');
    }
    
    // 獲取 spreadsheet 名稱
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
      
      let wordCount = 0;
      try {
        // 獲取有效資料行數（排除空行）
        const data = sheet.getDataRange().getValues();
        
        for (let j = 0; j < data.length; j++) {
          if (data[j][0] && data[j][1]) { // 確保英文和中文欄位都有資料
            wordCount++;
          }
        }
        console.log('工作表', sheetName, '有', wordCount, '個單字');
      } catch (dataError) {
        console.error('讀取工作表資料時發生錯誤:', sheetName, dataError);
        // 即使讀取資料失敗，仍然加入清單，但單字數為0
        wordCount = 0;
      }
      
      sheetsList.push({
        name: sheetName,
        wordCount: wordCount
      });
    }
    
    console.log('成功載入工作表清單，總計', sheetsList.length, '個工作表');
    
    // 返回包含 spreadsheet 名稱的完整資訊
    return {
      spreadsheetName: spreadsheetName,
      sheets: sheetsList
    };
  } catch (error) {
    console.error('getSheetsList 發生錯誤:', error);
    throw new Error('載入工作表清單失敗：' + error.message);
  }
}

// 修改：支援指定 Sheet ID 和工作表名稱，以及多個工作表
function getWordsFromSheets(sheetId, sheetNames) {
  try {
    console.log('開始載入單字，Sheet ID:', sheetId, '工作表:', sheetNames);
    
    if (!sheetId || sheetId.trim() === '') {
      throw new Error('請提供有效的 Google Sheet ID');
    }
    
    if (!sheetNames || !Array.isArray(sheetNames) || sheetNames.length === 0) {
      throw new Error('請選擇至少一個工作表');
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetId.trim());
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
      
      for (let j = 0; j < data.length; j++) {
        if (data[j][0] && data[j][1]) { // 確保兩欄都有資料
          allWords.push({
            id: currentId++,
            english: data[j][0].toString().trim(),
            chinese: data[j][1].toString().trim(),
            difficult: data[j][2] && data[j][2].toString().trim() === '*' ? true : false,
            sheetName: sheetName, // 記錄來源工作表
            originalRowIndex: j // 記錄原始行索引
          });
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
    // 返回示例資料以供測試
    console.log('返回示例資料進行測試');
    return [
      {id: 0, english: 'Hello', chinese: '你好', difficult: false, sheetName: 'Demo', originalRowIndex: 0},
      {id: 1, english: 'World', chinese: '世界', difficult: false, sheetName: 'Demo', originalRowIndex: 1},
      {id: 2, english: 'Apple', chinese: '蘋果', difficult: false, sheetName: 'Demo', originalRowIndex: 2},
      {id: 3, english: 'Book', chinese: '書', difficult: false, sheetName: 'Demo', originalRowIndex: 3},
      {id: 4, english: 'Computer', chinese: '電腦', difficult: false, sheetName: 'Demo', originalRowIndex: 4},
      {id: 5, english: 'Friend', chinese: '朋友', difficult: false, sheetName: 'Demo', originalRowIndex: 5},
      {id: 6, english: 'Happy', chinese: '快樂', difficult: false, sheetName: 'Demo', originalRowIndex: 6}
    ];
  }
}

// 保留原有的 getWordsFromSheet 函數以向後相容（使用預設設定）
function getWordsFromSheet() {
  const DEFAULT_SHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
  const DEFAULT_SHEET_NAME = 'Sheet1';
  
  return getWordsFromSheets(DEFAULT_SHEET_ID, [DEFAULT_SHEET_NAME]);
}

// 修改：標註/取消標註不熟單字 - 需要知道來源工作表
function markWordAsDifficult(sheetId, sheetName, rowIndex, isDifficult) {
  try {
    console.log('標註單字，Sheet ID:', sheetId, '工作表:', sheetName, '行索引:', rowIndex, '是否困難:', isDifficult);
    
    if (!sheetId || !sheetName) {
      console.error('缺少必要參數：sheetId 或 sheetName');
      return false;
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetId.trim());
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      console.error('找不到工作表：' + sheetName);
      return false;
    }
    
    const row = rowIndex + 1; // rowIndex 為 0-based，實際行數為 1-based
    const col = 3; // 第三欄
    
    if (isDifficult) {
      sheet.getRange(row, col).setValue('*');
    } else {
      sheet.getRange(row, col).setValue('');
    }
    
    console.log('成功標註單字');
    return true;
  } catch (error) {
    console.error('標註單字失敗:', error);
    return false;
  }
}

// 修改：匯出單字到新工作表
function exportWordsToSheet(words, sheetName, targetSheetId) {
  try {
    console.log('匯出單字，目標 Sheet ID:', targetSheetId, '工作表名稱:', sheetName);
    
    // 如果沒有指定目標 Sheet ID，使用第一個單字的來源 Sheet
    const SHEET_ID = targetSheetId || '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    let newSheet = ss.getSheetByName(sheetName);
    if (newSheet) {
      ss.deleteSheet(newSheet);
    }
    newSheet = ss.insertSheet(sheetName);
    
    // 寫入資料
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      newSheet.appendRow([
        w.english || '',
        w.chinese || '',
        w.difficult ? '*' : ''
      ]);
    }
    
    console.log('成功匯出', words.length, '個單字');
    return true;
  } catch (error) {
    console.error('匯出失敗:', error);
    return false;
  }
}
