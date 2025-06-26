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
// 工具函數 (Utility Functions)
// ===========================================

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
 */
function countValidWords(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    let wordCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][1]) { // 確保英文和中文欄位都有資料
        wordCount++;
      }
    }
    return wordCount;
  } catch (dataError) {
    console.error('讀取工作表資料時發生錯誤:', sheet.getName(), dataError);
    return 0;
  }
}

/**
 * 建立單字物件
 */
function createWordObject(rowData, id, sheetName, rowIndex) {
  return {
    id: id,
    english: rowData[0].toString().trim(),
    chinese: rowData[1].toString().trim(),
    difficult: rowData[2] && rowData[2].toString().trim() === '*',
    sheetName: sheetName,
    originalRowIndex: rowIndex
  };
}

/**
 * 取得示例資料（測試用）
 */
function getDemoWords() {
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

/**
 * 根據英文和中文內容尋找工作表中的行索引
 */
function findWordRowIndex(sheet, englishWord, chineseWord) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 0; i < data.length; i++) {
    const rowEnglish = data[i][0] ? data[i][0].toString().trim() : '';
    const rowChinese = data[i][1] ? data[i][1].toString().trim() : '';
    
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
      console.log('工作表', sheetName, '有', wordCount, '個單字');
      
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
      
      for (let j = 0; j < data.length; j++) {
        if (data[j][0] && data[j][1]) { // 確保兩欄都有資料
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
 * 標註/取消標註不熟單字
 */
function markWordAsDifficult(sheetId, sheetName, rowIndex, isDifficult) {
  try {
    console.log('標註單字，Sheet ID:', sheetId, '工作表:', sheetName, '行索引:', rowIndex, '是否困難:', isDifficult);
    
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

/**
 * 匯出單字到新工作表
 */
function exportWordsToSheet(words, sheetName, targetSheetId) {
  try {
    console.log('匯出單字，目標 Sheet ID:', targetSheetId, '工作表名稱:', sheetName);
    
    // 如果沒有指定目標 Sheet ID，使用預設值
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
      const englishLower = word.english.toLowerCase().trim();
      
      if (!duplicatesMap.has(englishLower)) {
        duplicatesMap.set(englishLower, []);
      }
      duplicatesMap.get(englishLower).push(word);
    }
    
    // 找出有重複的單字
    const duplicates = [];
    for (const [englishLower, wordsList] of duplicatesMap) {
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
 * 處理重複單字 - 保留一個，刪除其他
 */
function handleDuplicateWordKeepOne(sheetId, keepWord, deleteWords) {
  try {
    console.log('處理重複單字 - 保留一個，刪除其他');
    console.log('保留:', keepWord);
    console.log('刪除:', deleteWords);
    
    const spreadsheet = openSpreadsheetSafely(sheetId.trim());
    let deletedCount = 0;
    
    // 為每個要刪除的單字找到當前的實際行位置
    for (const word of deleteWords) {
      try {
        const sheet = spreadsheet.getSheetByName(word.sheetName);
        if (!sheet) {
          console.error('找不到工作表:', word.sheetName);
          continue;
        }
        
        const foundRowIndex = findWordRowIndex(sheet, word.english, word.chinese);
        
        if (foundRowIndex !== -1) {
          const actualRow = foundRowIndex + 1; // 轉換為1-based索引
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
    
    // 更新目標單字的定義
    const targetSheet = spreadsheet.getSheetByName(targetWord.sheetName);
    if (targetSheet) {
      const foundRowIndex = findWordRowIndex(targetSheet, targetWord.english, targetWord.chinese);
      
      if (foundRowIndex !== -1) {
        const targetRow = foundRowIndex + 1; // 轉換為1-based索引
        targetSheet.getRange(targetRow, 2).setValue(mergedDefinition); // 第2欄是中文定義
        console.log('已更新目標定義:', targetWord.sheetName, '第', targetRow, '行');
      } else {
        console.error('找不到目標單字:', targetWord.english, '-', targetWord.chinese);
        return { success: false, error: '找不到目標單字位置' };
      }
    }
    
    // 刪除其他重複項目
    const deleteResult = handleDuplicateWordKeepOne(sheetId, targetWord, mergeWords);
    
    return { 
      success: true, 
      mergedDefinition: mergedDefinition,
      deletedCount: deleteResult.deletedCount 
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
        // 中文意義相同：保留第一個工作表的，移除其他
        const keepWord = duplicate.words[0]; // 第一個工作表的
        const removeWords = duplicate.words.slice(1); // 其他工作表的
        
        console.log('相同定義，保留第一個工作表:', keepWord.sheetName);
        
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
        wordsToModify.set(targetWord.id, mergedDefinition);
        
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
    
    // 處理單字陣列：移除重複項目並修改定義
    const processedWords = [];
    for (let i = 0; i < allWords.length; i++) {
      const word = allWords[i];
      
      if (wordsToRemove.has(word.id)) {
        // 跳過要移除的單字
        continue;
      }
      
      if (wordsToModify.has(word.id)) {
        // 修改定義
        const modifiedWord = { ...word };
        modifiedWord.chinese = wordsToModify.get(word.id);
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
