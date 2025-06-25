function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getWordsFromSheet() {
  try {
    // 請將 'YOUR_SHEET_ID' 替換為您的 Google Sheet ID
    // 您可以從 Google Sheet 的 URL 中找到這個 ID
    // 例如：https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit#gid=0
    // 其中 1ABC123DEF456 就是 Sheet ID
    const SHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM'; // 請替換成您的 Sheet ID
    const SHEET_NAME = 'Sheet1'; // 如果工作表名稱不同，請修改
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    const words = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][1]) { // 確保兩欄都有資料
        words.push({
          id: i,
          english: data[i][0].toString().trim(),
          chinese: data[i][1].toString().trim(),
          difficult: data[i][2] && data[i][2].toString().trim() === '*' ? true : false
        });
      }
    }
    
    return words;
  } catch (error) {
    console.error('Error reading sheet:', error);
    // 返回示例資料以供測試
    return [
      {id: 0, english: 'Hello', chinese: '你好', difficult: false},
      {id: 1, english: 'World', chinese: '世界', difficult: false},
      {id: 2, english: 'Apple', chinese: '蘋果', difficult: false},
      {id: 3, english: 'Book', chinese: '書', difficult: false},
      {id: 4, english: 'Computer', chinese: '電腦', difficult: false},
      {id: 5, english: 'Friend', chinese: '朋友', difficult: false},
      {id: 6, english: 'Happy', chinese: '快樂', difficult: false}
    ];
  }
}

// 新增：標註/取消標註不熟單字
function markWordAsDifficult(id, isDifficult) {
  const SHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
  const SHEET_NAME = 'Sheet1';
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const row = Number(id) + 1; // id 為 0-based，row 為 1-based
  const col = 3; // 第三欄
  if (isDifficult) {
    sheet.getRange(row, col).setValue('*');
  } else {
    sheet.getRange(row, col).setValue('');
  }
  return true;
}

// 匯出單字到新工作表
function exportWordsToSheet(words, sheetName) {
  const SHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
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
  return true;
}
