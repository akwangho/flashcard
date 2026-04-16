# OpenSpec: 英文單字閃卡應用程式

> **版本**: 1.18.8
> **最後更新**: 2026-04-16
> **原始平台**: Google Apps Script (HTML Service)
> **目標相容性**: iPad 4 (ES5 JavaScript)

---

## 1. 專案概述

### 1.1 應用程式名稱
英文單字閃卡 (English Vocabulary Flashcard)

### 1.2 應用程式描述
這是一個以 Google Apps Script 為後端、Google Sheets 為資料來源的英文單字學習閃卡應用程式。使用者可以從 Google 試算表載入英文-中文單字對，透過自動輪播閃卡的方式學習英文單字。應用程式支援語音朗讀、測驗模式、不熟單字標記、單字匯出等豐富功能，並針對 iPad 4 等舊版裝置做了完整的相容性處理。

### 1.3 目標使用者
- 學習英文單字的中文母語使用者（主要為台灣繁體中文使用者）
- 使用平板裝置（尤其是 iPad）學習的學生

### 1.4 核心價值
- 自動輪播閃卡，無需手動操作即可持續學習
- 整合 Google Sheets 作為單字資料庫，方便管理和共享單字
- 多語言語音朗讀（英文、日文、中文）
- 測驗系統驗證學習成效
- 完整的 iPad 4 / 舊版瀏覽器相容性

---

## 2. 技術架構

### 2.1 架構模式
- **前後端分離的 Google Apps Script 應用程式**
- 後端：Google Apps Script (server-side JavaScript)
- 前端：HTML + CSS + JavaScript (ES5)
- 資料儲存：Google Sheets
- 本地儲存：LocalStorage（使用者設定持久化）

### 2.2 技術堆疊

| 層級 | 技術 | 說明 |
|------|------|------|
| 後端 | Google Apps Script | 伺服器端邏輯、Google Sheets API 操作 |
| 前端框架 | 原生 JavaScript (ES5) | 使用 Prototype-based OOP 模式 |
| 前端標記 | HTML5 | Google Apps Script HTML Service 的模板系統 |
| 樣式 | CSS3 | 含 CSS 變數，有硬編碼 fallback |
| 語音 | Web Speech API (SpeechSynthesis) | 英文/日文/中文語音朗讀 |
| 資料 | Google Sheets API | 透過 SpreadsheetApp 讀寫 |
| 本地持久化 | LocalStorage | 儲存使用者偏好設定 |

### 2.3 檔案結構

```
flashcard/
├── code.gs                # Google Apps Script 後端程式碼（含 COL/COL_NUM 欄位常數）
├── index.html             # 主要 HTML 結構（含所有模態框）
│
│   # CSS 樣式模組（原 style.html 拆分為 5 個模組）
├── style-base.html        # CSS 變數、iPad 4 fallback、重置、基礎元件、通用按鈕、RWD、動畫
├── style-flashcard.html   # 閃卡顯示、還原按鈕、進度/控制列、選單、不熟程度/指示器、暫停/靜音
├── style-modal.html       # 模態框框架、表單輸入、編輯單字模態框、工具提示
├── style-sheets.html      # 匯出進度、Google Sheet 元件、歷史清單、重複單字、通知、輔助說明、錯誤
├── style-quiz.html        # 測驗元件、複習篩選模態框
│
│   # 前端 JavaScript 模組（原 script.html 拆分為多個模組）
├── script-polyfills.html      # ES5 Polyfills（forEach, filter, map, find, includes）
├── script-core.html           # 全域常數(APP_CONSTANTS)、共用工具函式、共用清理輔助方法、建構函式、初始化、設定管理、單字載入
├── script-events.html         # 事件監聽器設定、語音啟用、displayCurrentWord（含 3 個子函式）、選單、全螢幕
├── script-settings-modal.html # 設定模態框開啟/關閉/儲存/重置、快速模式切換、Sheet 設定 UI、滑桿增強
├── script-difficulty.html     # 不熟程度增減與同步、UI 渲染、智慧計時延遲、顯示順序判斷
├── script-display.html        # 暫停/恢復計時器、單字點擊/刪除、翻譯顯示排程、導覽（next/previous）、通知、圖片預載
├── script-progress-bar.html   # 計時器進度條動畫（開始/暫停/恢復/重置）
├── script-voice.html          # 語音朗讀（英/日/中）、字母拼讀、語音等待機制、語音設定 UI
├── script-export.html         # 匯出功能（批次匯出、覆寫處理）
├── script-sheets.html         # Google Sheet 載入、驗證、工作表選擇
├── script-duplicates.html     # 重複單字偵測與處理
├── script-filter.html         # 複習時間篩選、不熟程度篩選、要會拼篩選
├── script-edit-word.html      # 編輯單字模態框（開啟、關閉、儲存、圖片預覽）
├── script-search-word.html    # 字庫搜尋單字（子字串／B 欄完全符合、工作表／列號、開啟編輯）
├── script-srs.html            # SRS 間隔重複系統（Leitner Box、到期判定、快速複習 UI）
├── script-screen-awake.html   # 防螢幕關閉（Wake Lock、NoSleep Video、持續音頻、Keep-Alive）
├── script-quiz.html           # 測驗系統（題目生成、答題流程、計分）
├── script-listening.html      # 聽力練習（聽音辨字/聽音拼字）
├── script-bootstrap.html      # 全域初始化（window.onload、FlashcardApp 實例建立、cleanup）
│
│   # 部署與工具設定
├── appsscript.json        # Google Apps Script 專案清單（clasp 用）
├── .clasp.json            # clasp 專案設定（含 Script ID）
├── .claspignore           # clasp 推送時排除的檔案
├── package.json           # npm 腳本（部署指令 + Jest 測試）
├── jest.config.js         # Jest 單元測試設定
├── deploy.sh              # 部署腳本（首次設定 / 推送 / 拉取）
├── clasp-node-ca.sh       # 供 source：依 deploy.local.sh 設定 NODE_EXTRA_CA_CERTS（clasp／npm 用）
├── deploy.local.sh.example# 複製為 deploy.local.sh 以指定本機 CA bundle（不提交）
├── scripts/run-clasp.sh   # 載入 CA 後執行 clasp（供 package.json 的 npm 腳本使用）
├── .gitignore             # Git 忽略規則
│
│   # 測試
├── test/environment.js        # 自訂 Jest 測試環境（快取腳本內容，減少重複 I/O）
├── test/setup-env.js          # Jest setupFilesAfterEnv（自動執行 bootstrapApp）
├── test/setup.js              # 測試環境初始化（DOM 模擬、Mock、createApp 工具）
├── test/polyfills.test.js     # Polyfills 單元測試
├── test/core.test.js          # 核心功能單元測試
├── test/voice.test.js         # 語音功能單元測試（含語音等待機制）
├── test/navigation.test.js    # 導覽功能單元測試（上/下一個、進度）
├── test/difficulty.test.js    # 不熟程度系統單元測試
├── test/pause.test.js         # 暫停/繼續功能單元測試
├── test/srs.test.js           # SRS 單元測試（含 getRecommendedWords、calculateSrsStats、startSrsReview）
├── test/history.test.js       # 單字檔歷史記錄單元測試
├── test/sheets.test.js        # Sheet 載入/驗證/選擇/渲染單元測試
├── test/filter.test.js        # 篩選邏輯單元測試
├── test/filter-modal.test.js  # 篩選模態框測試（review/difficulty/type/tag + 持久化 round-trip）
├── test/quiz-flow.test.js     # 測驗系統完整測試（題目生成、generic options、流程、計分、篩選）
├── test/listening.test.js     # 聽力練習測試（含 choose/spell 模式、wrong review、edge cases）
├── test/export.test.js        # 匯出功能單元測試（含批次匯出、進度更新、覆寫處理）
├── test/export-batch.test.js  # 批次匯出流程測試
├── test/display.test.js       # 顯示邏輯單元測試（含 onWordClick、設定 modal 操作）
├── test/round-display.test.js # 輪播顯示與回合測試（displayCurrentWord、startNewRound）
├── test/settings.test.js      # 設定儲存/套用單元測試
├── test/screen-awake.test.js  # 螢幕常亮功能測試
├── test/custom-confirm.test.js# 自訂確認對話框測試
├── test/duplicates.test.js    # 重複處理單元測試（含 modal 開關、自動處理）
│
└── OpenSpec.md            # 專案規格說明文件
```

### 2.4 部署方式

使用 Google 官方 CLI 工具 **clasp** (Command Line Apps Script Projects) 進行本地開發與部署。

#### 2.4.1 首次設定
```bash
bash deploy.sh setup
```
此指令會引導完成：安裝 clasp → 登入 Google 帳號 → 輸入 Script ID → 建立 `.clasp.json`

#### 2.4.2 日常部署指令
| 指令 | 說明 |
|------|------|
| `bash deploy.sh push` 或 `bash deploy.sh` | 推送程式碼到 Google Apps Script |
| `bash deploy.sh pull` | 從 Google Apps Script 拉取程式碼（覆寫本地） |
| `bash deploy.sh open` | 在瀏覽器開啟 Apps Script 編輯器 |
| `bash deploy.sh web` | 在瀏覽器開啟 Web App |
| `bash deploy.sh status` | 查看即將推送的檔案清單 |
| `bash deploy.sh logs` | 查看 Apps Script 執行日誌 |

#### 2.4.3 npm 腳本（替代方式）
安裝依賴後 (`npm install`) 也可使用：
| 指令 | 說明 |
|------|------|
| `npm run push` | 推送程式碼 |
| `npm run push:watch` | 監聽檔案變更自動推送 |
| `npm run pull` | 拉取程式碼 |
| `npm run open` | 開啟編輯器 |
| `npm run open:web` | 開啟 Web App |
| `npm run deploy` | 推送並開啟 Web App |

#### 2.4.4 公司網路／代理環境下的 SSL（npm 與 clasp）

`clasp` 與全域 `npm install` 皆透過 **Node** 連線 HTTPS。若出現 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、安裝 `@google/clasp` 失敗，或 `clasp login` 在交換 OAuth token 時出現 **`self-signed certificate in certificate chain`**，代表需讓 Node 信任公司的根／中介 CA（與 gcloud 使用的 PEM bundle 可為同一份）。

**建議作法**

1. 複製 `deploy.local.sh.example` 為 `deploy.local.sh`（此檔名已列於 `.gitignore`，不會提交）。
2. 在 `deploy.local.sh` 內設定，擇一即可：
   - `export NODE_EXTRA_CA_CERTS=/絕對路徑/公司_CA_鏈.pem`（與 gcloud 所用 PEM 可相同）
   - 或 `export FLASHCARD_CA_BUNDLE=/絕對路徑/公司_CA_鏈.pem`（`clasp-node-ca.sh` 會在未設定 `NODE_EXTRA_CA_CERTS` 時對應到 Node）
3. 亦可改為在專案根目錄放置 PEM 檔並命名為 `.node-extra-ca.pem`（同樣不提交）。

`deploy.sh` 會 source `clasp-node-ca.sh`；`npm run push`／`pull`／`open` 等腳本改經 `scripts/run-clasp.sh` 呼叫 clasp，亦會載入相同 CA。若直接在終端機執行 `clasp`，請先 `source deploy.local.sh`（或手動 `export NODE_EXTRA_CA_CERTS=…`）。

**npm 僅在「安裝全域 clasp」仍失敗時**：`FLASHCARD_NPM_STRICT_SSL=0 bash deploy.sh setup`（有安全風險，僅本機暫用）。

### 2.5 前端架構

- **設計模式**: 單一建構函式 `FlashcardApp`，所有方法掛載於 `FlashcardApp.prototype`
- **模組化**: 前端程式碼拆分為 14 個 HTML 模組檔案，透過 `<?!= include('filename'); ?>` 在 `index.html` 中按順序載入。每個模組檔案頂部有 JSDoc 風格的結構化註釋，說明模組用途、相依性和提供的函式
- **全域常數**: `APP_CONSTANTS` 物件集中管理所有 magic numbers（超時時間、篩選天數、SRS 間隔、測驗設定、匯出設定、UI 延遲門檻、localStorage keys 等），定義於 `script-core.html`。後端 `code.gs` 使用 `COL`（0-based）/ `COL_NUM`（1-based）欄位常數取代欄位數字
- **共用工具函式**: `formatDateYYYYMMDD`、`isModalBackgroundClick`、`selectVoiceByURIOrLang`、`applyDifficultyClass`、`openModalById`、`closeModalById` 等全域函式，定義於 `script-core.html`，消除跨模組重複程式碼
- **建構函式分組初始化**: `FlashcardApp` 建構函式將 100+ 屬性初始化拆分為 6 個子函式：`_initCoreState`、`_initVoiceState`、`_initSettingsState`、`_initFilterState`、`_initScreenAwakeState`、`_initQuizState`
- **生命週期**: 建構函式初始化 → `init()` → 載入設定 → 載入單字 → 啟動閃卡輪播
- **狀態管理**: 所有狀態存放在 `FlashcardApp` 實例的屬性中
- **單元測試**: 使用 Jest + jsdom，執行 `npx jest` 可運行 813 個測試案例（涵蓋語音等待機制、導覽、不熟程度、暫停/繼續、SRS 間隔重複、單字檔歷史、Sheet 載入/驗證/選擇、匯出批次/進度/覆寫、測驗答題流程、重複單字 modal 操作、智慧計時器、確認/取消移除、進度條動畫、編輯單字儲存驗證、圖片預載、複習日期記錄、載入進度、modal 背景點擊、重置設定等核心功能）。測試使用自訂環境（`test/environment.js`）快取 ~400KB 腳本內容，減少重複檔案 I/O

### 2.6 ES5 相容性需求（重要限制）

由於需要在 iPad 4（iOS 10 及以下）上運行，必須遵守以下限制：
- **禁止使用** `let`、`const`、箭頭函式、模板字串、解構賦值、展開運算子、Promise、async/await、class 語法
- **必須使用** `var`、`function` 宣告、字串串接、`for` 迴圈
- **必須提供 Polyfills**: `Array.prototype.forEach`、`Array.prototype.filter`、`Array.prototype.map`、`Array.prototype.find`、`Array.prototype.includes`

---

## 3. 資料模型

### 3.1 單字物件 (Word Object)

```javascript
{
  id: Number,                // 唯一識別碼（載入時依序產生）
  english: String,           // 英文單字（來源：B 欄）
  chinese: String,           // 中文翻譯（來源：C 欄）
  difficultyLevel: Number,   // 不熟程度 -999~10（來源：D 欄，負數=非常熟/已掌握，0=已熟悉，10=最不熟）
  image: String,             // 圖片 URL（來源：E 欄）
  imageFormula: String,      // 圖片顯示公式（來源：F 欄）
  lastReviewDate: String,    // 最後複習日期（來源：G 欄，格式 'YYYY-MM-DD'，空字串代表從未複習）
  mustSpell: Boolean,        // 要會拼標記（來源：A 欄）
  tags: Array,               // 標籤陣列（來源：H 欄，以半形/全形逗號分隔，如 ['動詞', '基礎']）
  sheetName: String,         // 來源工作表名稱
  originalRowIndex: Number   // 在來源工作表中的原始列索引（1-based，因為第 1 列為標題）
}
```

### 3.2 Google Sheet 資料格式

每個工作表的欄位配置（**第 1 列為標題列，資料從第 2 列開始**）：

| 欄位 | 第 1 列 | 資料列 (第 2 列起) | 必填 |
|------|------|------|------|
| A 欄 (第 1 欄) | A1 = 有效單字數量（數字） | 要會拼標記（`1`=要會拼，空=不需要） | 否 |
| B 欄 (第 2 欄) | `單字` | 英文單字 | 是 |
| C 欄 (第 3 欄) | `翻譯` | 中文翻譯 | 是 |
| D 欄 (第 4 欄) | `不熟程度` | 數字 -999~10（負數=非常熟，空=0，1~10=不熟程度）。讀取時向後相容舊版 `*` 符號格式，寫入時一律使用數字 | 否 |
| E 欄 (第 5 欄) | `圖片URL` | 圖片 URL | 否 |
| F 欄 (第 6 欄) | `圖片` | 圖片顯示公式 | 否 |
| G 欄 (第 7 欄) | `最後複習日期` | 最後複習日期（格式 `YYYY-MM-DD`，空代表從未複習） | 否 |
| H 欄 (第 8 欄) | `標籤` | 標籤（以半形 `,` 或全形 `，` 分隔，如 `動詞,基礎`，空代表無標籤） | 否 |

### 3.3 應用程式設定 (Settings)

#### 3.3.1 一般設定 (`flashcard-settings` in LocalStorage)

```javascript
{
  delayTime: Number,             // 單字卡延遲時間（秒），範圍 1-10，預設 4.5，步進 0.5
  fontSize: Number,              // 字體大小（px），範圍 20-120，預設 96，步進 4
  displayMode: String,           // 顯示模式，'english-first'（預設）/ 'chinese-first' / 'mixed'（隨機混合）
  fontFamily: String,            // 字型代碼，預設 'system-default'
  delaySpeechInNormalMode: Boolean,  // 延遲發音模式，預設 false
  mustSpellChineseFirst: Boolean,    // 要會拼單字混合模式下強制先顯示中文，預設 true
  showTimerProgressBar: Boolean,     // 顯示計時進度條，預設 true
  timerProgressBarOffset: Number,    // 計時進度條頂部偏移像素，預設 0，範圍 0-100
  smartTimerEnabled: Boolean         // 智慧計時，預設 false
}
```

> **向後相容**: 載入設定時若偵測到舊版 `reverseMode`（Boolean），會自動遷移為 `displayMode`（`true` → `'chinese-first'`，`false` → `'english-first'`）

#### 3.3.2 語音設定 (`flashcard-voice-settings` in LocalStorage)

```javascript
{
  enabled: Boolean,          // 啟用英日文發音，預設 true
  rate: Number,              // 發音速度，範圍 0.1-1.0，預設 0.8，步進 0.1
  pitch: Number,             // 音調，預設 1
  volume: Number,            // 音量，預設 1
  lang: String,              // 英文語音語系，預設 'en-US'
  voiceURI: String,          // 選定的英文語音 URI
  japaneseLang: String,      // 日文語音語系，預設 'ja-JP'
  japaneseVoiceURI: String,  // 選定的日文語音 URI
  spellOutLetters: Boolean,  // 唸出每一個英文字母，預設 false
  chineseEnabled: Boolean,   // 啟用中文發音，預設 false
  chineseLang: String,       // 中文語音語系，預設 'zh-TW'
  chineseVoiceURI: String    // 選定的中文語音 URI
}
```

#### 3.3.3 試算表設定 (`flashcard-sheet-settings` in LocalStorage)

```javascript
{
  sheetId: String,           // Google Sheet ID
  selectedSheets: Array      // 已選擇的工作表名稱陣列
}
```

#### 3.3.4 試算表歷史記錄 (`flashcard-sheet-history` in LocalStorage)

```javascript
[
  {
    id: String,              // Google Sheet ID
    name: String,            // 試算表名稱
    isDefault: Boolean,      // 是否為預設（歷史記錄中一律為 false）
    lastUsed: String         // 最後使用時間（ISO 格式）
  }
]
// 最多保存 10 筆，不包含預設試算表
```

#### 3.3.5 上次顯示單字 (`flashcard-last-word` in LocalStorage)

```javascript
{
  english: String,           // 英文單字
  chinese: String            // 中文翻譯
}
```
> 每次切換單字時自動儲存，啟動時載入畫面會讀取此資料顯示上次的單字。若無資料則顯示預設的 "Ready"。

#### 3.3.6 SRS 間隔重複資料 (`flashcard-srs` in LocalStorage)

```javascript
{
  "sheetName:rowIndex": {
    box: Number,             // Leitner Box 等級 (1-8)
    nextReview: String       // 下次複習日期 "YYYY-MM-DD"
  }
}
```
> 以 `sheetName:rowIndex` 為鍵值，儲存每個單字的 SRS 狀態。資料為裝置本地，不同步至 Google Sheets。

### 3.4 測驗狀態 (Quiz State)

```javascript
{
  isActive: Boolean,           // 測驗是否進行中
  type: String,                // 'quick'（快速 10 題）或 'full'（全部）
  questions: Array,            // 題目陣列
  currentQuestionIndex: Number,// 目前題目索引
  selectedAnswer: String,      // 已選答案
  answers: Array,              // 作答記錄
  score: Number,               // 目前分數
  startTime: Date,             // 開始時間
  endTime: Date,               // 結束時間
  availableWords: Array        // 可用單字（已考慮篩選）
}
```

### 3.5 測驗題目物件 (Question Object)

```javascript
{
  word: Object,              // 原始單字物件
  type: String,              // 'en-zh'（英翻中）或 'zh-en'（中翻英），隨機決定
  question: String,          // 題目文字
  correctAnswer: String,     // 正確答案
  options: Array             // 4 個選項（含正確答案，隨機排列）
}
```

### 3.6 字型映射表

| 代碼 | 字型名稱 | CSS font-family |
|------|----------|-----------------|
| `system-default` | 系統預設 | `'Microsoft JhengHei', 'PingFang TC', 'Helvetica Neue', Arial, sans-serif` |
| `microsoft-yahei` | 微軟正黑體 | `'Microsoft JhengHei', 'Microsoft YaHei', 'SimHei', 'Arial Unicode MS', Arial, sans-serif` |
| `songti` | 宋體 | `'STSong', 'SimSun', 'Times New Roman', serif` |
| `kaiti` | 楷體 | `'STKaiti', 'KaiTi', 'BiauKai', 'Times New Roman', serif` |
| `arial` | Arial | `Arial, 'Helvetica Neue', Helvetica, sans-serif` |
| `helvetica` | Helvetica | `'Helvetica Neue', Helvetica, Arial, sans-serif` |
| `times` | Times New Roman | `'Times New Roman', Times, serif` |
| `courier` | Courier New | `'Courier New', Courier, monospace` |
| `verdana` | Verdana | `Verdana, Geneva, sans-serif` |

---

## 4. 功能規格

### 4.1 閃卡核心功能

#### 4.1.1 自動輪播單字卡
- **描述**: 應用程式自動依序顯示單字卡，先顯示第一語言（預設英文），延遲指定秒數後顯示第二語言（預設中文），再延遲後自動切換到下一個單字
- **行為流程**:
  1. 載入單字後，先執行隨機洗牌（Fisher-Yates 演算法）
  2. 顯示第一語言（帶有 100ms 的淡入動畫）
  3. 等待「延遲時間」秒數
  4. 顯示第二語言（淡入動畫）+ 同時顯示圖片（若有）
  5. 再等待「延遲時間」秒數
  6. 自動切換到下一個單字
  7. 循環結束後重新洗牌並開始新回合（包括篩選模式下的每一輪）
- **篩選後洗牌**: 套用所有篩選條件後，對篩選結果再執行一次洗牌，確保多工作表載入時不同工作表的單字充分混合，避免同一工作表的單字聚集出現
- **延遲時間**: 可設定 1 至 10 秒，步進 0.5 秒，預設 4.5 秒
- **語音等待機制**: 當任何語音功能啟用時（英日文發音或中文發音），若延遲時間到期而語音尚未播放完畢，系統會自動等待語音播放完成後才進行切換（最長等待 60 秒）。此機制確保所有語音（包括基本英文發音、字母拼讀、中文發音）都不會被截斷。系統使用 `_speechSequenceActive` 標記追蹤「字母拼讀 → 單字發音」的完整序列，避免字母拼讀結束與單字發音開始之間的短暫空檔被誤判為語音完成。使用者手動操作（點擊「下一個」、「上一個」等）不受此機制影響，會立即切換並取消語音
- **載入失敗容錯**: 當已儲存的工作表被刪除或無法載入時（所有工作表皆載入失敗、逾時、或回傳零筆單字），系統不會顯示錯誤畫面，而是自動開啟單字檔設定對話框，讓使用者重新選擇工作表
- **智慧計時**: 可選功能（預設關閉），啟用後 Phase 2（第二語言顯示後）等待時間會根據文字長度自動調整：
  - **中文為第二語言**：`smartDelay = max(1.2, 1.0 + charCount * 0.15)` 秒，上限為 `delayTime`（母語閱讀快，只加速不減速）。常數：`SMART_TIMER_BASE_TIME`（1.0）、`SMART_TIMER_PER_CHAR_TIME`（0.15）、`SMART_TIMER_MIN_TIME`（1.2）
  - **英文為第二語言**：`smartDelay = min(delayTime, max(1.2, 0.5 + letterCount * 0.3))` 秒，短字加速，上限為 `delayTime`。常數：`SMART_TIMER_EN_BASE_TIME`（0.5）、`SMART_TIMER_EN_PER_LETTER_TIME`（0.3）、`SMART_TIMER_EN_MIN_TIME`（1.2）。字母數僅計算 a-zA-Z（排除空格、連字號等）
  - **智慧計時不加速（任一成立即固定使用 `delayTime`）**：
    - **要會拼且不熟程度 > 0**（兩者同時成立）
    - **不熟程度 ≥ 3**（不論是否要會拼）

#### 4.1.2 顯示模式（三種）
- **描述**: 使用者可選擇閃卡的顯示順序，支援三種模式
- **模式**:
  - **先顯示英文** (`english-first`)：預設模式，先顯示英文，再顯示中文翻譯
  - **先顯示中文** (`chinese-first`)：反向模式，先顯示中文翻譯，再顯示英文單字
  - **隨機混合** (`mixed`)：每張卡片隨機決定先顯示英文或中文，增加學習效率與樂趣
- **行為**: 語音播放順序也相應調整。混合模式下，每次顯示新單字時以 50% 機率隨機決定順序，同一張卡片在完整顯示週期中保持一致
- **要會拼強制先中文**: 當一般設定中「要會拼單字混合模式下強制先顯示中文」開關啟用時（`mustSpellChineseFirst: true`），標記為要會拼的單字在混合模式下強制先顯示中文（讓學生回想英文拼寫）。關閉後要會拼單字也隨機顯示
- **要會拼指示器**: 當目前單字為「要會拼」時，進度區域右側顯示「✍️要會拼」標示，不論顯示模式為何皆會出現

#### 4.1.3 單字卡點擊互動
- **描述**: 使用者點擊單字卡區域時觸發特殊行為
- **行為流程**:
  1. 若尚未顯示第二語言 → 立即顯示第二語言 + 圖片
  2. 單字文字加上 `word-pending-removal` CSS class，顯示為灰色 (`#666666`) 並帶有黑色描邊效果（`-webkit-text-stroke` + 多層 `text-shadow`），確保在灰色背景圖片上仍清晰可見
  3. 出現「恢復單字」按鈕
  4. 等待延遲時間後，自動將該單字從當前輪次中暫時移除
  5. 若在等待期間使用者點擊「恢復單字」按鈕 → 取消移除，恢復正常播放
- **特殊情況**: 若當前只剩 1 個單字，點擊時卡片閃紅色提示，不執行移除

#### 4.1.4 單字暫時移除與恢復
- **描述**: 使用者可以透過點擊單字卡來暫時移除已熟悉的單字
- **移除**: 被移除的單字存入 `removedWords` 陣列，不再出現在當前輪次
- **恢復**: 開始新回合時，所有已移除的單字會自動恢復
- **確認暫刪後還原（單次）**: 延遲結束並確認暫時刪除後，若已切到下一張單字，僅在**同時滿足**下列條件時，可按 **↑／←**（或「上一個」按鈕）還原**剛才那一筆**已確認的暫刪（快照存於 `removalUndoEntry`，僅保留一筆）：(1) 上一張是經暫刪確認才跳過的；(2) 當前單字進度尚未過一半（一般／聽力：第二語言尚未顯示；輪播：進度條未達 50%）；(3) 觸發還原後即失效。若在未暫刪當前單字的情況下又跳到再下一張，或進度已過一半，則不再觸發還原（快照清除或不符合條件）。還原時一併還原該字的不熟程度、複習標記、SRS 與當輪順序；與待刪除等待期內取消（`cancelRemoval`）不同

#### 4.1.5 上一個/下一個導覽
- **描述**: 使用者可以手動切換到上一個或下一個單字
- **上一個**（優先順序）: (1) 若單字正處於待暫刪狀態 → 取消移除；(2) 若 `removalUndoEntry` 存在且 `isRemovalUndoEligible()` 為真 → 單次還原上一筆確認暫刪；(3) 否則從導覽歷史堆疊取出前一個狀態（包含索引與該步驟的單字序列）
- **下一個**: 停止當前計時器，直接跳到下一個單字
- **自動循環**: 到達最後一個單字時自動回到第一個

#### 4.1.6 進度顯示
- **描述**: 在單字卡下方顯示當前進度，格式為「目前序號/總數」
- **範例**: `3/25`

#### 4.1.7 計時器進度條
- **描述**: 畫面最上方有一條明顯的水平線，由左至右成長，讓使用者直覺感受距離翻譯出現及切換下一個單字的時間
- **視覺**: 5px 高、藍色漸層 (`rgba(0,160,255,0.9)` → `rgba(0,220,255,0.7)`)，帶有藍色光暈效果
- **右端圓點**: 線條最右端（成長前端）有明顯的圓點光暈標記（11px 圓形，帶雙層光暈），隨進度條成長移動，讓使用者更容易辨識目前進度位置
- **顯示/隱藏**: 可在一般設定中透過「顯示計時進度條」開關切換顯示或隱藏（預設開啟）
- **兩階段動畫**:
  - **第一階段 (0% → 50%)**: 第一語言顯示後開始，以 `delayTime` 秒線性成長至畫面寬度的一半；到達 50% 時，翻譯（第二語言）出現
  - **第二階段 (50% → 100%)**: 翻譯顯示後開始，以 `delayTime` 秒線性成長至佔滿整個螢幕寬度；到達 100% 時，切換到下一個單字
- **暫停/恢復**: 暫停時進度條凍結在當前位置；恢復時使用計時器剩餘時間精確計算過渡時長，從凍結位置以正確速度動畫到目標（不會因反覆暫停/恢復而導致速度變慢）
- **互動整合**:
  - 點擊單字卡（暫時移除）：翻譯立即顯示，進度條跳至 50% 並開始第二階段
  - 取消移除：根據當前狀態重新開始對應階段
  - 手動切換（上一個/下一個）：進度條歸零，由新單字的第一階段重新開始
- **技術**: 使用 CSS `transition: width linear`，搭配 `-webkit-transition` 前綴確保 iPad 4 相容；使用 `position: fixed; top: 0` 固定在畫面最頂部；使用 CSS `:after` 偽元素產生右端圓點光暈

#### 4.1.8 主畫面快速計時控制
- **描述**: 在閃卡主畫面左側提供可收合面板，無需開啟「一般設定」即可調整 **延遲時間**（`delayTime`，與設定內相同 1–10 秒、步進 0.5）與 **智慧計時**（`smartTimerEnabled`）；變更後寫入 `flashcard-settings`，並與一般設定模態框雙向同步
- **桌面（可 hover）**: 滑鼠移入左緣約 26px 寬熱區時展開面板；移出熱區與面板後約 320ms 延遲收起，避免移向滑桿時誤收合
- **觸控／粗指標**（`(hover: none)`、`(pointer: coarse)` 或具 `ontouchstart`）: 左緣顯示小型 **「⏱」** 按鈕，點擊切換展開／收合；展開時點擊面板外區域會收合
- **UI**: 垂直 `range`（橫向 input 經 CSS 旋轉為垂直）、數值顯示、智慧計時開關（沿用 `.switch` 樣式）；`z-index` 高於計時進度條，避免被遮擋
- **互動排除**: 點擊此區不觸發單字卡暫刪（`handleFlashcardClick` 排除 `#quick-timer-dock`）

### 4.2 不熟程度（多層級困難標記）功能

#### 4.2.1 多層級不熟程度系統
- **描述**: 每個單字有 -999 到 10 的不熟程度等級，以 D 欄的數字表示（向後相容讀取舊版 `*` 符號）
- **等級意義**:
  - `-999` = 非常熟/已掌握（D 鍵雙按確認設定），顯示綠色。只有 -999 的單字預設不出現在閃卡和測驗中
  - `-1` ~ `-998` = 已複習多次（負數絕對值代表複習次數），顯示綠色，仍正常出現在閃卡中
  - `0`（無值）= 已熟悉
  - `1-2`（★★）= 稍不熟，顯示黃色
  - `3-4`（★★★★）= 中等不熟，顯示橘色
  - `5-6`（★★★★★★）= 較不熟，顯示深橘色
  - `7-9`（★★★★★★★★★）= 很不熟，顯示橘紅色
  - `10`（★★★★★★★★★★）= 最不熟，顯示紅色並帶紅色光暈
- **寫入格式**: 寫入 Google Sheet 時一律使用數字格式（0 寫空字串）
- **讀取格式**: 讀取時同時支援數字格式和舊版 `*` 符號格式

#### 4.2.2 增加不熟程度
- **描述**: 使用者可以點擊進度區域或按 F5/S 鍵來增加當前單字的不熟程度 +1（最高 10）
- **特殊情況**: 若單字為負數（非常熟），標記不熟時直接跳到 3（不逐步 +1）
- **暫時刪除狀態下按 S**: 若單字正處於暫時刪除狀態（`pendingRemoval`），按 S 鍵**不會**增加不熟程度（避免誤觸）；請先恢復單字或使用 D 鍵流程標記非常熟
- **視覺回饋**: 進度區域顯示 `★N`（N 為不熟程度數字），顏色根據等級變化。UI 上負數不顯示數字：非常熟（≤-999）顯示 `★✓`（綠色），其餘負數（-1~-998）顯示 `★0`（灰色）。後端 Google Sheet 仍儲存實際負數值
- **同步到後端**: 透過 `google.script.run.updateWordDifficulty()` 即時寫回 Google Sheet D 欄（數字格式）

#### 4.2.3 減少不熟程度（自動）
- **描述**: 每次單字被暫時移除（點擊單字卡）時，自動減少不熟程度 -1（最低 -999，可從正數遞減到負數）；若該單字最後複習日期為今天則不減少，避免同一天加強複習時不熟程度過度下降
- **即時預覽**: 點擊單字卡標記為待刪除時，不熟程度數字立即在 UI 上顯示減 1 後的值（尚未寫入後端），提升使用者體驗；若使用者取消刪除（按 R 或點擊恢復按鈕），則恢復為原本的數字。預覽數字同樣遵循 UI 隱藏負數規則：≤-999 顯示 ✓，-1~-998 顯示 0
- **設計理念**: 使用者覺得已熟悉的單字，移除時自動降低不熟程度。負數的絕對值代表被複習的次數，便於追蹤複習歷程並加強快速複習精準度

#### 4.2.4 標記為非常熟（D 鍵雙按確認 + 暫時刪除狀態）
- **描述**: 使用者按 D 鍵可將當前單字標記為「非常熟」（-999），需要按兩次確認，確認後進入類似暫時刪除的狀態
- **行為流程**:
  1. 第一次按 D：暫停計時器和進度條，顯示提示「再按一下 D 設為非常熟」
  2. 第二次按 D（3 秒內）：進入暫時刪除狀態，行為類似點擊單字卡（4.1.3）
     - 若尚未顯示第二語言 → 立即顯示第二語言 + 圖片
     - 單字文字以灰色顯示（`word-pending-removal`）
     - 不熟程度預覽為 ✓（UI 不顯示 -999 數字）
     - 出現「恢復單字」按鈕
     - 顯示「✓ 已設為非常熟」提示
  3. 等待延遲時間後 → 正式標記為非常熟（-999）、同步到後端、從此輪單字中移除、跳到下一個
  4. 若在等待期間使用者點擊「恢復單字」或按左方向鍵 → 取消標記，恢復原始不熟程度，回到正常播放
  5. 3 秒超時（僅限第一次按 D 後尚未進入暫時刪除狀態時）：自動取消操作，恢復計時器和進度條
- **已在暫時刪除狀態中按 D**:
  - 若單字已因點擊進入暫時刪除狀態（`pendingRemoval`），按兩次 D 可將其「升級」為非常熟標記，保持暫時刪除狀態不變，延遲時間到期後以 -999 處理
- **負數篩選模式**: 直接設定為 -999 並更新顯示（不進入暫時刪除狀態）
- **同步到後端**: 延遲時間到期確認後即時寫回 Google Sheet

#### 4.2.5 不熟程度篩選
- **描述**: 透過模態框篩選特定不熟程度的單字
- **篩選選項**: 全部 / ✓ 非常熟（已掌握）/ ★1 以上 / ★3 以上 / ★5 以上 / ★7 以上 / ★10（最不熟）
- **預設行為**: 只有不熟程度為 -999 的單字預設不出現在閃卡和測驗中（-1~-998 仍正常出現），只有選擇「非常熟」篩選時才會顯示 -999 的單字
- **行為**: 篩選後重新洗牌並從頭開始；每一輪結束後也會重新洗牌；若無符合條件的單字，彈出提示並重設篩選
- **疊加**: 可與複習時間篩選、要會拼篩選同時使用，結果取交集

#### 4.2.6 要會拼篩選
- **描述**: 篩選僅顯示標記為「要會拼」的單字
- **操作方式**: 選單按鈕直接切換（無模態框），點擊即啟用/關閉
- **行為**: 啟用後僅顯示 `mustSpell: true` 的單字；關閉則不篩選
- **疊加**: 可與不熟程度篩選、複習時間篩選、類型篩選同時使用，結果取交集

#### 4.2.7 類型篩選
- **描述**: 透過模態框多選篩選單字類型（單字、片語、句子）
- **分類邏輯**: 根據 `english` 欄位自動判斷
  - **句子 (sentence)**: 去除前後空白後，結尾為句號 `.`、問號 `?` 或驚嘆號 `!`
  - **片語 (phrase)**: 包含空格，且結尾不是句號
  - **單字 (word)**: 不包含空格，且結尾不是句號
- **篩選選項**: 三個 checkbox 可多選（單字 / 片語 / 句子），各選項顯示該類型的單字數量
- **預設行為**: 三種類型全選（不篩選）
- **行為**: 至少需選擇一種類型；套用後重新洗牌並從頭開始；若無符合條件的單字，彈出提示並重設篩選
- **疊加**: 可與不熟程度篩選、複習時間篩選、要會拼篩選、標籤篩選同時使用，結果取交集

#### 4.2.8 標籤篩選
- **描述**: 透過模態框多選篩選單字標籤，標籤來自 H 欄（以半形 `,` 或全形 `，` 分隔）
- **篩選選項**: 動態生成 checkbox 列表，從所有單字中收集唯一標籤並排序顯示，各選項顯示該標籤的單字數量
- **預設行為**: 不選擇任何標籤（不篩選）
- **篩選邏輯**: OR 邏輯——勾選越多標籤，顯示的單字越多（只要單字包含任一勾選標籤即顯示）
- **行為**: 全部取消勾選等同不篩選；套用後重新洗牌並從頭開始；若無符合條件的單字，彈出提示並重設篩選
- **無標籤狀態**: 若所有單字都沒有標籤，模態框顯示「目前沒有任何標籤」提示
- **疊加**: 可與不熟程度篩選、複習時間篩選、要會拼篩選、類型篩選同時使用，結果取交集

### 4.3 Google Sheets 整合

#### 4.3.1 單字檔設定介面
- **描述**: 模態框形式的設定介面，讓使用者選擇要載入的 Google Sheet 和工作表
- **介面元素**:
  - 預設單字檔清單（硬編碼的預設 Google Sheet 列表）
  - 最近使用的非預設單字檔清單（最多 10 筆）
  - Google Sheet ID 或 URL 輸入框（支援完整 URL 自動提取 ID）
  - 「載入工作表清單」按鈕
  - 工作表多選列表（含單字數量顯示）
- **快選行為**: 點選預設單字檔、最近使用記錄、或按下「載入工作表清單」按鈕後，預設清單、最近使用清單、Sheet ID 輸入框、載入按鈕自動隱藏，僅顯示工作表選擇區域與底部按鈕；使用者可關閉並重新開啟設定視窗以恢復完整介面
- **載入進度條**: 載入工作表清單時顯示真實進度條，分兩個階段：Phase 1 連接 Google Sheet（不確定進度動畫），Phase 2 逐一取得各工作表單字數（確定進度百分比）

#### 4.3.2 預設單字檔
- **描述**: 應用程式內建的預設 Google Sheet 列表
- **預設項目**:
  1. `WordGo Data Sheet` (ID: `1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM`)
  2. `小學生教育部規定1200單字` (ID: `1hX2Ux2__5F-jdhfegmzMBZ7bg3faOt06ARb7ezC8Yzg`)

#### 4.3.3 最近使用記錄
- **描述**: 自動記錄使用者最近使用的非預設 Google Sheet（最多 10 筆）
- **功能**: 點擊即可快速切換、可刪除歷史記錄
- **儲存位置**: LocalStorage (`flashcard-sheet-history`)

#### 4.3.4 工作表選擇
- **描述**: 載入 Google Sheet 後，顯示所有工作表供使用者勾選
- **顯示資訊**: 工作表名稱、單字數量（讀取 A1 格的值）
- **多選**: 可同時選擇多個工作表，合併載入所有單字
- **Shift+Click 連續多選**: 按住 Shift 鍵點擊工作表項目，可從上次點擊的位置到當前位置批次選取/取消選取，方便快速連續多選
- **全選/取消全選**: 標題列提供「全選」/「取消全選」按鈕，可一鍵切換所有工作表的選取狀態；個別勾選/取消時按鈕文字自動更新
- **清除**: 標題列「全選」按鈕右側提供「清除」按鈕，可一鍵取消所有已選擇的工作表。當沒有任何工作表被選取時，此按鈕會自動隱藏
- **排除的工作表**: 以下非單字工作表會自動從清單中隱藏，不顯示也不載入：
  - `記事`（預設記事工作表）

#### 4.3.5 Google Sheet ID 提取
- **描述**: 支援從完整的 Google Sheets URL 中自動提取 Sheet ID
- **支援格式**:
  - 純 Sheet ID: `1ABC123DEF456`
  - 完整 URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- **提取邏輯**: 使用正規表達式 `/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/` 匹配

### 4.4 語音功能

#### 4.4.1 英文語音朗讀
- **描述**: 使用 Web Speech API (SpeechSynthesis) 朗讀英文單字
- **播放時機**:
  - 正常模式：英文出現時播放（除非啟用延遲發音）
  - 反向模式：英文出現在第二部分時播放
- **語音選擇**: 可在語音設定中選擇不同的英文腔調

#### 4.4.2 日文語音朗讀
- **描述**: 自動偵測單字是否包含日文字符（平假名、片假名、特定漢字範圍），若是則使用日文語音播放
- **偵測邏輯**: 使用正規表達式檢查 Unicode 範圍 `[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]`

#### 4.4.3 中文語音朗讀
- **描述**: 可選啟用中文翻譯的語音朗讀
- **播放時機**: 顯示中文翻譯時播放
- **等待機制**: 若英文/日文語音尚在播放，會以 100ms 輪詢等待播放完成後再播放中文
- **語速**: 中文語音固定使用正常速度 (rate = 1)
- **等待完成**: 若中文語音尚未播放完畢，計時器到期時會自動等待語音播放完成後才切換到下一個單字，確保長翻譯不會被截斷

#### 4.4.4 字母拼讀功能
- **描述**: 啟用後，在唸英文單字之前，會先逐字母拼讀（例如：h-e-l-l-o）
- **實作方式**: 將每個字母以 SSML 風格逐一播放，非字母字元（空格、連字號等）跳過
- **順序**: 字母拼讀 → 完整單字朗讀
- **縮短首字延遲**: 字母拼讀模式下，初始語音延遲從 500ms 縮短至 50ms，讓拼讀更快開始（字母本身即為閱讀引導，不需額外等待）
- **等待完成**: 若字母拼讀（或後續的中文語音）尚未播放完畢，計時器到期時會自動等待語音播放完成後才切換到下一個階段或下一個單字，確保長單字或長句子不會被截斷

#### 4.4.5 延遲發音模式
- **描述**: 啟用後，在正常模式下，英文單字出現時不發音，而是在中文翻譯出現時才播放英文語音
- **用途**: 讓使用者先看英文自行思考，翻譯出現時再聽發音確認

#### 4.4.6 靜音/取消靜音
- **描述**: 點擊語音按鈕或靜音指示器可切換語音開關
- **視覺回饋**: 靜音時顯示 🔇 圖示和「已靜音」提示；按鈕顯示 🔇（靜音）或 🔊（開啟）

#### 4.4.7 舊版瀏覽器語音啟用
- **描述**: 在舊版瀏覽器（iOS 10 及以下、Chrome 80 以下、Safari 12 及以下）中，語音功能需要使用者先點擊按鈕互動才能啟用
- **流程**: 載入畫面顯示「啟用語音播放」按鈕 → 使用者點擊 → 執行靜音測試語音 → 語音功能啟用

### 4.5 暫停功能

#### 4.5.1 暫停/繼續
- **描述**: 暫停單字卡自動輪播
- **暫停行為**: 透過 `_activeTimerInfo` 精確計算剩餘時間（`_pauseRemainingMs`），停止計時器，凍結進度條在當前位置，顯示「已暫停」指示器
- **繼續行為**: 使用暫停時記錄的剩餘時間恢復計時器和進度條動畫，確保兩者精確同步（進度條從凍結位置以剩餘時長動畫到目標），隱藏指示器
- **指示器互動**: 點擊「已暫停」指示器可恢復播放
- **按鈕圖示**: 播放中顯示 ⏸️，暫停中顯示 ▶️

### 4.6 測驗系統

#### 4.6.1 快速測驗
- **描述**: 從當前可用單字中隨機抽取 10 題進行測驗
- **條件**: 可用單字至少需要 3 個以上
- **開始時自動暫停閃卡播放**

#### 4.6.2 完整測驗
- **描述**: 使用當前所有可用單字進行測驗

#### 4.6.3 測驗題目生成
- **題型**: 隨機在「英翻中」和「中翻英」之間選擇（各 50% 機率）
- **選項**: 4 個選項（1 個正確 + 3 個隨機錯誤選項），隨機排列
- **錯誤選項來源**: 從所有已載入的單字中隨機抽取（確保不重複、不等於正確答案）
- **備用選項**: 若錯誤選項不足，使用預設通用選項補充

#### 4.6.4 測驗流程
1. **開始畫面**: 顯示測驗類型、題目數量、測驗範圍
2. **答題畫面**: 顯示題目 → 4 個選項按鈕 → 使用者點選 → 顯示正確/錯誤回饋 → 下一題
3. **結果畫面**: 顯示分數（百分制）、正確/錯誤題數、鼓勵訊息、錯題回顧

#### 4.6.5 答題回饋
- **正確**: 綠色框 ✅ + 「答對了！」
- **錯誤**: 紅色框 ❌ + 「答錯了！」+ 正確答案提示
- **選項樣式**: 正確選項變綠色，錯誤選取變紅色

#### 4.6.6 成績評語
- 100 分: 「滿分！太厲害了！你完全掌握了這些單字！」
- 80-99 分: 「太棒了！你的英文單字掌握得很好！」
- 60-79 分: 「不錯哦！再多練習幾次就更熟了！」
- 40-59 分: 「加油！多複習幾次就會進步的！」
- 0-39 分: 「別灰心！持續學習就會越來越好！」

#### 4.6.7 錯題回顧
- **描述**: 測驗結束後顯示所有答錯的題目
- **內容**: 原始題目、使用者的錯誤答案、正確答案
- **操作**: 答錯的單字自動增加不熟程度 +1

#### 4.6.8 測驗範圍顯示
- 若開啟不熟程度篩選: 顯示「⭐ 測驗範圍：★N 以上的不熟單字」或「⭐ 測驗範圍：非常熟的單字」（負數篩選時）
- 若有暫時移除的單字: 顯示「📗 測驗範圍：剩餘單字（已排除 X 個已移除單字）」
- 預設: 顯示「📗 測驗範圍：所有單字」

### 4.7 匯出功能

#### 4.7.1 匯出單字到新工作表
- **描述**: 將當前的單字匯出到同一 Google Sheet 的新工作表
- **匯出類型**:
  - **剩餘單字**: 匯出當前輪次中尚未被移除的所有單字
  - **不熟單字（★1 以上）**: 只匯出不熟程度 ≥ 1 的單字
- **匯出資料欄位**: 要會拼（A 欄）、單字（B 欄）、翻譯（C 欄）、不熟程度（D 欄，數字格式）、圖片 URL（E 欄）、標籤（H 欄）。A1 存放總數
- **標題列**: 匯出時自動在第 1 列寫入標題

#### 4.7.2 工作表名稱
- **預設命名規則**: `已匯出_YYYYMMDD_HHMMSS`（使用當前時間戳）
- **使用者可自訂名稱**

#### 4.7.3 覆寫保護
- **描述**: 若目標工作表名稱已存在，顯示覆寫確認對話框
- **選項**:
  - 「使用不同名稱」: 自動建議替代名稱（原名稱加上 `_1`, `_2` 等後綴）
  - 「覆寫現有工作表」: 刪除舊工作表後重新建立

#### 4.7.4 批次匯出
- **描述**: 單字以批次方式匯出（每批 15 個，由 `APP_CONSTANTS.EXPORT_BATCH_SIZE` 控制），顯示進度條
- **進度顯示**: 進度條 + 百分比 + 已處理/總數

### 4.8 重複單字處理

#### 4.8.1 自動偵測重複單字
- **描述**: 載入多個工作表時，自動偵測英文相同（**區分大小寫**，例如 `May` 與 `may` 視為不同單字）的重複單字
- **偵測時機**: 每次載入單字時自動執行

#### 4.8.2 自動處理（記憶體模式）
- **描述**: 初次載入時自動在記憶體中處理重複，不修改 Google Sheet
- **處理規則**:
  - **中文翻譯相同**: 保留第一個工作表的單字，移除其他重複項
  - **中文翻譯不同**: 將所有翻譯合併到第一個工作表的單字中（格式：`1. 翻譯A\n2. 翻譯B`），移除其他重複項
- **通知**: 處理完成後在右上角顯示通知，包含處理前後的單字數量；滑鼠移入通知時暫停自動關閉，移出後繼續計時。通知內可點「下次不自動合併」，將設定寫入 `localStorage` 鍵 `flashcard-no-auto-merge`（對應 `APP_CONSTANTS.STORAGE_KEYS.NO_AUTO_MERGE`）。**下次重新載入**時若仍有重複單字，將**不再自動合併**，改為跳出與手動處理相同的「重複單字」合併視窗（`findDuplicateGroupsInMemory` + `showDuplicateModal`）；若已無重複則正常載入

#### 4.8.3 手動處理
- **描述**: 若使用者選擇手動處理，顯示重複單字處理模態框
- **處理選項（每組重複）**:
  - **保留第一個，刪除其他**: 保留第一個出現的，刪除其餘（會修改 Google Sheet）
  - **合併定義**: 將所有翻譯合併到一個單字中（會修改 Google Sheet）
  - **跳過，稍後處理**: 在記憶體中自動處理，不修改 Google Sheet

### 4.9 設定介面

#### 4.9.1 一般設定模態框
- **單字卡延遲時間**: 滑桿，1-10 秒，步進 0.5 秒
- **字體大小**: 滑桿，20-120px，步進 4px，即時預覽
- **字型選擇**: 下拉選單，9 種字型，含即時預覽區域
- **顯示模式**: 三選一 radio buttons（先顯示英文 / 先顯示中文 / 隨機混合）
- **要會拼單字混合模式下強制先顯示中文**: 開關（預設啟用）。僅在選擇「隨機混合」模式時才顯示此選項。啟用時，標記為要會拼的單字在混合模式下強制先顯示中文；關閉時，要會拼單字也隨機顯示
- **智慧計時**: 開關（預設關閉）。啟用後，第二語言顯示後會根據文字長度自動調整等待時間：中文短文快速切換、英文短字加速；**要會拼且不熟程度>0** 或 **不熟程度≥3** 時不加速。進度條動畫也會同步使用調整後的時長
- **顯示計時進度條**: 開關（預設啟用）。控制畫面最上方的計時進度條是否顯示
- **進度條頂部偏移**: 數字輸入框，0-100px，預設 0。投影到電視時若上方被截掉，可向下偏移進度條位置。僅在計時進度條開啟時顯示

#### 4.9.2 語音設定模態框
- **啟用英日文發音**: 開關
- **發音速度**: 滑桿，0.1-1.0，步進 0.1
- **英文語音腔調**: 下拉選單（動態取得系統可用語音）
- **日文語音腔調**: 下拉選單
- **延遲發音模式**: 開關（顯示英文時不發音，等中文出現才發音）
- **唸出每一個英文字母**: 開關（拼讀功能）
- **啟用中文發音**: 開關
- **中文語音腔調**: 下拉選單

### 4.10 畫面與 UI 功能

#### 4.10.0 載入畫面
- **描述**: 啟動時顯示的載入畫面，包含單字學習和載入進度
- **單字學習**: 啟動時及「重新載入單字」時，載入畫面優先顯示上次瀏覽的單字（從 `flashcard-last-word` 讀取）；若無儲存資料則顯示預設的「Ready / 準備好的；有準備的」
- **單字記錄**: 每次切換單字時，自動將當前英文與中文儲存到 `flashcard-last-word`
- **載入進度條**: 真實反映每個工作表的載入進度
  - 初始階段：不確定進度動畫（連接 Google Sheet）
  - 載入階段：確定進度百分比（載入工作表 N/M）
  - 完成階段：處理資料 → 載入完成
- **逐表載入**: 初始載入時對每個選定的工作表分別發起 API 呼叫（並行），每完成一個即更新進度條，提供真實的載入回饋
- **客戶端重複偵測**: 初始載入時，重複單字的偵測與自動處理在客戶端以 ES5 完成，無需額外伺服器呼叫
- **版本號碼**: 載入進度條下方以不顯眼的灰色小字顯示應用程式版本號（如 `v1.12.4`）

#### 4.10.1 視覺主題
- **配色**: 深色主題 — 黑色背景 (`#000000`)、黃色主文字 (`#FFFF00`)、白色輔助文字
- **字體**: 預設使用微軟正黑體 / PingFang TC / Helvetica Neue / Arial

#### 4.10.2 全螢幕模式
- **描述**: 支援各種瀏覽器的全螢幕 API
- **相容性**: 支援 `requestFullscreen`、`webkitRequestFullscreen`、`mozRequestFullScreen`、`msRequestFullscreen`
- **行為**: 進入全螢幕後按鈕文字變為「退出全螢幕」
- **iOS 特殊處理**: iOS Safari/Chrome 不支援網頁全螢幕 API，偵測到 iOS 裝置時顯示「加入主畫面」引導訊息；若已從主畫面開啟（`navigator.standalone`）則提示已在全螢幕模式

#### 4.10.3 圖片顯示
- **描述**: 若單字含有圖片 URL，在顯示中文翻譯時同時顯示圖片
- **顯示方式**: 設為 `flashcard` 容器的背景圖片，使用 `contain` 模式（不裁切）
- **預加載**: 批次預載當前及未來即將輪到的 10 個單字圖片（`preloadUpcomingImages`），減少快速切換時的等待
- **文字處理**: 有圖片時，文字加上半透明黑色背景以確保可讀性

#### 4.10.4 防止螢幕休眠與背景執行
- **描述**: 透過多種方式同時嘗試防止裝置螢幕自動關閉，並確保閃卡在應用程式離開前景或螢幕關閉後仍能繼續輪轉和發出語音（iOS 和 Android 均支援）
- **方法（同時嘗試）**:
  0. **背景計時 Web Worker**（Android 背景執行的關鍵）: 建立一個 inline Web Worker（透過 Blob URL），在 Worker 內部運行 `setTimeout`。Web Worker 的計時器不受主執行緒的背景節流限制，確保 Android Chrome 在應用程式離開前景或螢幕關閉時，閃卡輪轉計時器仍能正常觸發。每次設定顯示計時器時，同時在主執行緒和 Web Worker 設定 `setTimeout`，哪個先觸發就執行回調並取消另一個（`_setDisplayTimer` / `_clearDisplayTimer`）
  1. **Wake Lock API**: 現代瀏覽器原生 API（iOS 16.4+、Android Chrome 等），可能在 Google Apps Script 的 iframe 中失敗
  2. **持續靜音音頻**（iOS Safari 核心方法）: 透過 `AudioContext` 建立靜音 buffer，連接到 `createMediaStreamDestination()`，再透過隱藏的 `<audio>` 元素播放 MediaStream。iOS Safari 偵測到有音頻播放中，即不會讓螢幕進入休眠。Android Chrome 也會因持續音頻而維持媒體工作階段（media session），降低背景節流程度。不支援 `createMediaStreamDestination` 的舊版瀏覽器（如 iPad 4）回退到持續的超高頻（20kHz）oscillator
  3. **NoSleep Video**: 建立 1x1 像素不可見的迴圈靜音影片持續播放（舊版 iOS 及 Android 備用）
  4. **Keep-Alive**: 每 30 秒播放極短高頻無聲音頻 + 微小 DOM 操作（最後備用）
- **iOS 用戶手勢啟用**: iOS 瀏覽器必須在用戶互動（user gesture）中才能建立 AudioContext 和播放音頻/視頻。系統在**每次** `touchstart`/`touchend`/`click` 事件時都會檢查並嘗試啟動或恢復持續靜音音頻（不移除監聯器，因為 iOS 可能隨時暫停 AudioContext）
- **定期監控（Watchdog）**: 每 10 秒檢查 AudioContext 狀態和 `<audio>` 元素是否仍在播放，若被暫停則自動嘗試恢復
- **頁面可見性恢復與計時器補償**: 監聽 `visibilitychange` 事件，頁面重新可見時：
  - 自動恢復 AudioContext、重新取得 Wake Lock、恢復 NoSleep 視頻
  - 檢查背景期間是否有計時器已到期但未觸發（安全網機制）：比較計時器設定時間與當前時間，若已到期則立即觸發回調，確保即使 Web Worker 計時器也被暫停的極端情況下仍能正確推進閃卡
  - 嘗試恢復被暫停的 SpeechSynthesis（Android Chrome 在背景時可能暫停語音合成）
- **Android 背景執行原理**: Android Chrome 對背景頁面的 `setTimeout` 有嚴格的節流限制（最少 1 秒，甚至可能完全暫停）。本系統透過三層機制確保背景計時器正常運作：(1) Web Worker 計時器不受主執行緒節流影響；(2) 持續靜音音頻維持媒體工作階段，降低 Chrome 的背景節流程度；(3) `visibilitychange` 補償機制作為最終安全網

#### 4.10.5 響應式設計
- **描述**: 支援手機和平板裝置的不同螢幕尺寸
- **觸控優化**: 按鈕尺寸適合觸控操作
- **防止縮放**: 設定 `user-scalable=no`、`maximum-scale=1.0`

#### 4.10.6 模態框系統
- **描述**: 所有設定和功能介面使用模態框呈現
- **通用抽象層**: `openModalById(app, modalId)` 和 `closeModalById(app, modalId)` 全域函式（定義於 `script-core.html`），統一處理 modal 的 `display: flex/none` 切換和 `pauseTimer()`/`resumeTimer()` 呼叫，消除 10+ 處重複的 modal 開關程式碼。`closeModalById` 只在 modal 確實處於開啟狀態（`style.display === 'flex'`）時才執行關閉和 `resumeTimer()`，避免未開啟的 modal 被關閉時錯誤覆蓋現有計時器
- **共通行為**:
  - 點擊背景（模態框外部）可關閉
  - 有關閉按鈕 (×)、取消按鈕、確認按鈕
  - 開啟模態框時暫停閃卡播放，關閉時恢復

#### 4.10.7 自訂確認對話框
- **描述**: 以 HTML 模態框取代瀏覽器內建的 `confirm()` 對話框，避免在全螢幕模式下觸發瀏覽器原生對話框導致離開全螢幕
- **函式**: `FlashcardApp.prototype.customConfirm(options, onConfirm, onCancel)`
- **參數 options**:
  - `title`: 對話框標題（預設「確認」）
  - `message`: 確認訊息內容（支援換行）
  - `warning`: 警告文字（橘色區塊，可選）
  - `confirmText`: 確認按鈕文字（預設「確定」）
  - `cancelText`: 取消按鈕文字（預設「取消」）
- **使用位置**:
  - 重新載入單字確認（`confirmRestart`）
  - 預設表單確認（`loadSheetsList`）
- **行為**: 點擊背景等同取消；ES5 相容（使用回呼函式，非 Promise）

### 4.11 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| `B` 鍵 | 暫停/繼續（任何狀態下皆可使用，最高優先級） |
| 空白鍵 | 點擊單字卡（顯示翻譯/標記移除） |
| Enter | 增加不熟程度（toggleDifficultCurrentWord） |
| 右方向鍵 | 下一個單字 |
| 左方向鍵 | 上一個單字 |
| `M` 鍵 | 切換靜音/取消靜音 |
| `F` 鍵 | 切換全螢幕 |
| `S` 鍵 / F5 | 增加不熟程度 +1（負數直接跳到 3, 0 → 1, ..., 9 → 10）；暫時刪除狀態下按 S 無作用 |
| `D` 鍵 | 標記為非常熟（-999），需按兩次確認（3 秒內） |
| `R` 鍵 | 恢復單字（取消移除） |
| `E` 鍵 | 開啟編輯當前單字模態框（**暫停時也可使用**） |
| Escape | 關閉選單或結束全螢幕，取消 D 鍵待確認狀態 |

> **注意**: 鍵盤快捷鍵使用 key-action mapping 模式（定義於 `script-events.html`），每個按鍵支援 keyCode、code、key 三種匹配方式以相容 iPad 4。模態框開啟時（焦點在表單控件上），鍵盤快捷鍵不生效（避免干擾輸入）。暫停時僅 B 鍵（暫停/繼續）和 E 鍵（編輯單字，標記 `allowWhenPaused: true`）可使用，其他快捷鍵不生效

### 4.11.1 觸控滑動手勢

- **描述**: 支援智慧型手機（iPhone、Android）和平板（iPad）的觸控滑動手勢，用於切換單字
- **實作位置**: `script-events.html` 的 `setupSwipeListeners()`
- **支援裝置**: iPhone、Android 手機、iPad（包含 iPad 4）、所有支援觸控的裝置

| 手勢 | 功能 | 等效鍵盤操作 |
|------|------|-------------|
| 往左滑 | 下一個單字（`nextWord()`） | 右方向鍵 → |
| 往右滑 | 上一個單字（`previousWord()`） | 左方向鍵 ← |

- **觸發條件**:
  - 水平滑動距離 ≥ 50px（`APP_CONSTANTS.SWIPE_THRESHOLD_PX`）
  - 滑動時間 ≤ 500ms（`APP_CONSTANTS.SWIPE_TIME_LIMIT_MS`）
  - 水平滑動距離 > 垂直滑動距離（避免與頁面上下捲動衝突）
- **限制**: 暫停時滑動手勢不生效
- **防衝突**: 偵測到水平滑動時呼叫 `preventDefault()` 阻止頁面捲動和後續 click 事件
- **ES5 相容**: 使用 `touchstart`/`touchmove`/`touchend` 事件，`new Date().getTime()` 計時

### 4.12 複習時間篩選

#### 4.12.1 功能描述
- **描述**: 讓使用者篩選一段時間以上未複習的單字，方便針對性複習
- **資料儲存**: 複習日期存於 Google Sheet G 欄（第 7 欄），格式為 `YYYY-MM-DD`
- **複習定義**: 只有當單字被暫時刪除（確認移除）時，才視為「已複習」。若使用者在等待期間恢復刪除（取消移除），則不算已複習
- **觸發時機**:
  - 暫時移除確認時（`confirmRemoval` 執行，包含一般暫時刪除和非常熟標記）
  - 僅顯示第二語言但未暫時刪除的單字不會被標記為已複習

#### 4.12.2 篩選選項
- **全部（不篩選）**: 顯示所有單字
- **從未複習過**: 只顯示 G 欄為空的單字
- **超過 2 週未複習**: G 欄為空 或 日期距今超過 14 天
- **超過 1 個月未複習**: G 欄為空 或 日期距今超過 30 天
- **超過 3 個月未複習**: G 欄為空 或 日期距今超過 90 天
- **超過 6 個月未複習**: G 欄為空 或 日期距今超過 180 天

#### 4.12.3 篩選 UI（模態框）
- **開啟方式**: 從選單點擊「📅 複習時間篩選」
- **介面**: 單選按鈕列表，每個選項旁顯示符合條件的單字數量
- **與其他篩選疊加**: 可與不熟程度篩選、要會拼篩選同時啟用，結果取交集

#### 4.12.4 複習日期同步機制
- **前端追蹤**: 學習過程中在記憶體 (`reviewedInSession`) 追蹤已複習的單字
- **批次寫回**: 在以下時機透過 `batchUpdateReviewDates()` 批次同步到 Google Sheet：
  - 使用者離開頁面時（`beforeunload`）
  - 使用者開啟選單時
  - 使用者開啟任何模態框時
  - 每累積 20 個已複習單字時自動同步

### 4.13 選單系統

#### 4.13.1 下拉選單（分類整理）
- **描述**: 主介面底部的「選單 ▼」按鈕，點擊展開分類下拉選單
- **選單結構**:
  - **◂ 篩選**（飛出式子選單，滑鼠移入或點擊後左側顯示子選單）
    1. ⭐ 不熟程度篩選
    2. 📅 複習時間篩選
    3. ✍️ 要會拼篩選
    4. 📝 類型篩選（多選：單字/片語/句子）
    5. 🏷️ 標籤篩選（多選，動態顯示所有標籤，OR 邏輯）
  - 📖 快速複習（依優先度推薦複習單字，顯示待複習徽章）
  - **◂ 測驗**（飛出式子選單）
    6. 🎯 快速測驗 (10 題)
    7. 📝 完整測驗
  - ✏️ 編輯當前單字
  - 🔍 搜尋單字
  - 📤 匯出單字
  - 🔄 重新載入單字
  - **◂ 快速設定**（飛出式子選單）
    8. 🎧 用聽的背單字（中文先出現、字母發音開、中文發音開、9秒、智慧計時開）
    9. 👂 用聽的認識單字（英文先出現、字母發音關、中文發音開、4.5秒、智慧計時開、延遲發音關）
    10. 📝 日常複習（混合出現、延遲發音開、字母發音關、中文發音關、智慧計時開）
  - 📋 單字檔設定
  - **◂ 設定**（飛出式子選單）
    11. 🔊 語音設定
    12. ⚙️ 一般設定
  - 📺 全螢幕
- **飛出式子選單行為**: 「篩選」「測驗」「快速設定」「設定」為飛出式選單項目，左側有 ◂ 箭頭提示；滑鼠移入（桌面）或點擊/觸碰（觸控裝置）時，子選單從左側彈出顯示；同一時間只能顯示一組子選單；關閉選單時所有子選單自動關閉
- **分隔線**: 各分類之間以細線分隔
- **行為**:
  - 點擊選單外部自動關閉
  - 開啟選單時自動暫停閃卡輪播，關閉後自動恢復（若原本已暫停則維持暫停）
  - 關閉選單時同時隱藏整個工具列（上一個、下一個、語音切換、暫停、選單按鈕），使用者需重新將滑鼠移入工具列區域（桌面）或觸碰工具列區域（觸控裝置）才能再次顯示
  - 螢幕高度不足時僅顯示垂直捲軸（`max-height: 70vh`），不顯示水平捲軸（`overflow-x: hidden`），開啟時自動捲到底部（靠近按鈕的項目優先顯示）

#### 4.13.2 篩選指示器
- **描述**: 當有任何篩選條件啟用時，在主畫面進度區域上方顯示篩選狀態
- **位置**: 定位於進度區域正上方（`bottom: 55px`，左對齊），避免遮擋進度區域內的要會拼指示器
- **格式**: `篩選: ⭐ ★5+ | 📅 >2週 | ✍️ 要會拼 | 📖 快速複習 (42個)` 或 `篩選: ⭐ 非常熟 (10個)`（負數篩選時）
- **清除按鈕**: 提供「✕ 清除」按鈕一鍵清除所有篩選（包括結束 SRS 複習模式）

### 4.13.3 快速設定

- **描述**: 選單內「快速設定」飛出式子選單提供 5 種預設模式，一鍵套用多項設定，免去逐一切換
- **模式列表**:
  1. **🎧 用聽的背單字**: displayMode='chinese-first', spellOutLetters=true, chineseEnabled=true, delayTime=9, smartTimerEnabled=true
  2. **👂 用聽的認識單字**: displayMode='english-first', spellOutLetters=false, chineseEnabled=true, delayTime=4.5, smartTimerEnabled=true, delaySpeechInNormalMode=false
  3. **📝 日常複習**: displayMode='mixed', delaySpeechInNormalMode=true, spellOutLetters=false, chineseEnabled=false, delayTime=10, smartTimerEnabled=true
  4. **🎧 聽力訓練**: listeningMode=true, spellOutLetters=false, chineseEnabled=false, smartTimerEnabled=true
  5. **🔄 輪播記憶**: carouselMemoryMode=true, displayMode='english-first', spellOutLetters=false, chineseEnabled=false, delayTime=5, smartTimerEnabled=false, showTimerProgressBar=false, delaySpeechInNormalMode=false；中英文同時顯示、自動輪播
- **行為**: 點擊後立即套用設定、儲存到 localStorage、關閉選單、顯示 toast 通知（多行顯示具體設定內容，3 秒後自動消失）、重新顯示當前單字（歸零計時、重新判斷顯示順序，避免問題與答案語言相同）；切換至非輪播模式時自動關閉 carouselMemoryMode

### 4.13.4 通用通知 toast（showNotification）

- **描述**: 畫面正中央的 toast 通知，用於顯示操作結果提示
- **樣式**: 半透明黑底、圓角、支援多行文字（`white-space: pre-line`）
- **類型**: `success`（綠色邊框）、`info`（藍色邊框）
- **行為**: 顯示 3 秒後自動淡出消失，新通知會替換舊通知

### 4.13.5 字庫搜尋單字

- **描述**: 在目前已載入的 `words`（單字檔設定中已勾選並完成載入的工作表）內搜尋，確認某字串是否已出現在英文或中文欄
- **觸發**: 選單「🔍 搜尋單字」
- **比對**: 預設為英文欄不分大小寫之子字串、中文欄之子字串（片語或句子中含關鍵字即列出）。可勾選「完全符合」：僅比對 B 欄英文，且與關鍵字需完全一致（不分大小寫），不比對中文欄
- **選單暫停**: 從選單開啟搜尋單字時，`closeMenu` 傳入略過恢復計時，維持選單開啟時造成的暫停，避免對話框出現後計時意外恢復
- **結果列**: 顯示工作表名稱、試算表列號（`originalRowIndex + 1`，與 Google 試算表 1-based 列號一致）、英文與中文摘要、「編輯」按鈕
- **編輯**: 點「編輯」會關閉搜尋模態框並以 `openEditWordModal(該單字)` 開啟既有編輯單字模態框，儲存行為與選單「編輯當前單字」相同（含 `updateWordProperties` 寫回）
- **實作**: `script-search-word.html`（`searchWordsByQuery`、`sheetRowNumberForDisplay`、`setupSearchWordListeners`）；初始化時由 `_setupSearchWordModalListeners` 註冊監聽

### 4.14 即時編輯單字

#### 4.14.1 功能描述
- **描述**: 在閃卡執行中直接編輯當前顯示的單字，無需切換到 Google Sheets；亦可由「🔍 搜尋單字」結果開啟並編輯指定單字
- **觸發方式**: 選單「✏️ 編輯當前單字」或鍵盤快捷鍵 `E`；或由字庫搜尋結果點「編輯」（內部呼叫 `openEditWordModal(optWord)`）
- **自動暫停**: 開啟時自動暫停閃卡輪播並顯示「已暫停」指示器，關閉後自動恢復（若編輯前已暫停則維持暫停）

#### 4.14.2 可編輯欄位
| 欄位 | 對應 Google Sheet 欄位 | 說明 |
|------|------------------------|------|
| 單字 | B 欄 | 英文單字（文字輸入框） |
| 翻譯 | C 欄 | 中文翻譯（文字輸入框） |
| 不熟程度 | D 欄 | -1~10 滑桿 + -999~10 數字輸入框（雙向同步），≤-999 顯示「✓ 已掌握」（綠色），-1~-998 顯示 ★0（灰色），0~10 顯示 ★N 及顏色變化 |
| 要會拼 | A 欄 | 開關 |
| 圖片 URL | E 欄 | 圖片網址（文字輸入框，可留空），附即時圖片預覽 |
| 標籤 | H 欄 | 標籤（文字輸入框，以逗號分隔，支援半形 `,` 和全形 `，`） |

#### 4.14.3 圖片預覽
- **描述**: 圖片 URL 欄位下方顯示即時圖片預覽
- **防抖**: URL 輸入後 500ms 自動載入預覽
- **錯誤處理**: 圖片載入失敗時顯示「圖片載入失敗」提示
- **空值處理**: URL 為空時隱藏預覽區域

#### 4.14.4 唯讀資訊
- **工作表名稱**: 顯示該單字所屬的工作表名稱（不可編輯）

#### 4.14.5 儲存行為
- **前端同步**: 儲存時立即更新 `words` 和 `currentWords` 陣列中的對應項目，並重新渲染畫面
- **後端同步**: 透過 `google.script.run.updateWordProperties()` 非同步寫回 Google Sheet
- **驗證**: 單字和翻譯不能為空

### 4.15 間隔重複系統 (SRS - Spaced Repetition System)

#### 4.15.1 演算法：簡化版 Leitner Box
- **描述**: 採用 Leitner Box 分箱系統，根據學習者的掌握程度自動安排複習間隔
- **Box 等級 (1-8)** 對應複習間隔：
  - Box 1: 1 天（全新/很不熟）
  - Box 2: 2 天（快速強化）
  - Box 3: 4 天（約每週兩次）
  - Box 4: 7 天（每週）
  - Box 5: 14 天（每兩週）
  - Box 6: 30 天（每月）
  - Box 7: 60 天（每兩月）
  - Box 8: 120 天（每季，已畢業）

#### 4.15.2 Box 轉換規則
- **複習時觸發**（基於單字的 `difficultyLevel`）：
  - difficulty ≤ 5（熟悉或中等）：Box 上升一級（最高 8）
  - difficulty 6-7（仍在學習中）：Box 不變
  - difficulty ≥ 8（非常不熟）：Box 降回 1
- **初始 Box**（首次進入 SRS 的單字）：
  - difficulty < 0（非常熟）：Box 7（60 天後複習）
  - difficulty 0（無標記）：Box 4（7 天後複習）
  - difficulty 1-3（略不熟）：Box 2（2 天後複習）
  - difficulty ≥ 4（很不熟）：Box 1（1 天後複習）
- **下次複習間隔**（依難度覆寫 Box 間隔）：
  - difficulty > 0（不熟）：固定 1 天（每日複習直到難度降低）
  - difficulty = 0（無標記）：使用 Box 對應間隔天數
  - difficulty < 0（熟悉）：`min(365, ceil(12 * sqrt(|difficulty|)))` 天（越熟悉間隔越長，-1 約 12 天、-100 約 120 天、-999 約 365 天）
- **下次複習日期** = 當天日期 + 上述間隔天數
- **到期判定**: 今天 ≥ nextReview 或無 SRS 資料的單字視為需要複習

#### 4.15.3 資料儲存
- **localStorage key**: `flashcard-srs`
- **結構**: 以 `sheetName:rowIndex` 為鍵值的物件（詳見 3.3.6）
- **特性**: 裝置本地儲存，不佔用 Google Sheets 欄位

#### 4.15.4 SRS 更新觸發時機
- 減少不熟程度時（`decreaseDifficulty` → 內部呼叫 `updateSrsData`）
- 標記為非常熟時（`confirmMarkVeryFamiliar` → 內部呼叫 `updateSrsData`）
- 增加不熟程度時（`increaseDifficulty`）
- 注意：`markWordAsReviewed` 僅記錄複習日期，不再呼叫 `updateSrsData`，以避免單次複習觸發兩次 Box 調整

#### 4.15.5 快速複習 UI
- **選單入口**: 「📖 快速複習」按鈕，位於選單「學習」分類中
- **待複習徽章**: 按鈕右側顯示紅色圓形徽章，顯示到期/逾期的單字數量（超過 99 顯示「99+」）
- **模態框內容 — 統計儀表板**:
  - 總單字數：「共 N 個單字」
  - **複習進度**（依 `lastReviewDate` 計算）：
    - 三天內已複習：數量 + 百分比 + 進度條（綠色）
    - 七天內已複習：數量 + 百分比 + 進度條
    - 兩週內已複習：數量 + 百分比 + 進度條
    - 一個月內已複習：數量 + 百分比 + 進度條
    - 從未複習：數量
  - **難度分佈**（依 `difficultyLevel` 計算，跳過數量為 0 的項目）：
    - 非常熟（≤ -999）：綠色進度條
    - ★0（-998 ~ 0）：灰色進度條
    - ★1-2：金色進度條
    - ★3-4：橙色進度條
    - ★5-6：深橙色進度條
    - ★7-8：橙紅色進度條
    - ★9-10：紅色進度條
  - 數量選擇：10、20、30、50、100 或「全部 (N)」的按鈕選項
- **單字優先順序清單**（可收合，預設收合）：
  - 點擊「▶ 顯示單字優先順序（共 N 個）」展開/收合
  - 表格欄位：排名(#)、單字、優先類別（不熟/全新、SRS到期、已熟悉、未到期）、不熟程度（★N 或 非常熟）、最後複習日（MM-DD 或 從未）
  - 表格區域限高 300px，內部可捲動，表頭固定（sticky）
  - 交替行背景色提升可讀性
- **優先度排序**: 系統依以下優先度排列複習單字：
  1. 從未複習且不熟的單字（`lastReviewDate` 為空且不熟程度 > 0；無條件最高優先，不受 SRS 資料影響；不熟程度越高越優先）
  2. SRS 已到期/逾期的單字（越逾期越優先，SRS Box 等級越低越優先）
  3. 已熟悉且有複習記錄的單字（無 SRS 資料，不熟程度 ≤ 0 且 `lastReviewDate` 非空；不熟程度越高越優先）
  4. SRS 尚未到期但最接近複習日的單字
- **複習流程**: 選擇數量後點擊「開始複習」，系統依優先度取前 N 個單字，再打亂顯示順序（避免同工作表的單字聚集出現），使用一般閃卡模式進行複習

#### 4.15.6 SRS 複習模式
- **啟用**: 從快速複習模態框開始複習時啟用
- **篩選指示器**: 顯示「📖 快速複習」標籤
- **結束**: 清除篩選或開始新回合時自動結束 SRS 模式

---

## 5. 後端 API（Google Apps Script 函式）

### 5.1 HTML 服務

| 函式 | 說明 |
|------|------|
| `doGet()` | 建立並回傳 HTML 頁面（使用模板引擎） |
| `include(filename)` | 載入並嵌入指定的 HTML 檔案（用於模板） |

### 5.2 單字載入

| 函式 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `getWordsFromSheet()` | 無 | `Array<Word>` | 從預設工作表載入單字（向下相容） |
| `getWordsFromSheets(sheetId, sheetNames)` | Sheet ID, 工作表名稱陣列 | `Array<Word>` | 從指定的多個工作表載入單字 |
| `getWordsFromSingleSheet(sheetId, sheetName)` | Sheet ID, 工作表名稱 | `{success, words, sheetName, wordCount}` | 從單一工作表載入單字（用於逐表載入進度顯示） |
| `getWordsFromSheetsWithDuplicateDetection(sheetId, sheetNames, autoHandle)` | Sheet ID, 工作表名稱陣列, 是否自動處理 | `Object` | 載入單字並偵測/處理重複（非初始載入使用） |
| `getDemoWords()` | 無 | `Array<Word>` | 取得示例資料（載入失敗時的備援） |

### 5.3 工作表管理

| 函式 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `getSheetsList(sheetId)` | Sheet ID | `{spreadsheetName, sheets: [{name, wordCount}]}` | 取得工作表清單和各工作表的單字數（一次性） |
| `getSheetNamesOnly(sheetId)` | Sheet ID | `{spreadsheetName, sheetNames: [String], sheetCount}` | 僅取得工作表名稱（不讀取單字數，用於快速顯示清單） |
| `getSheetWordCount(sheetId, sheetName)` | Sheet ID, 工作表名稱 | `{name, wordCount}` | 取得單一工作表的單字數量（搭配進度條逐一載入） |
| `checkSheetExists(sheetName, targetSheetId)` | 工作表名稱, Sheet ID | `Boolean` | 檢查工作表是否已存在 |

### 5.4 單字操作

| 函式 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `updateWordProperties(sheetId, sheetName, rowIndex, properties)` | Sheet ID, 工作表名稱, 列索引, 屬性物件 `{english, chinese, difficultyLevel, imageUrl, mustSpell}` | `Object` | 更新單字的多個屬性（A/B/C/D/E 欄） |
| `updateWordDifficulty(sheetId, sheetName, rowIndex, difficultyLevel)` | Sheet ID, 工作表名稱, 列索引, 不熟程度 (-999~10) | `Boolean` | 更新不熟程度（寫入 D 欄，以數字格式寫入，0 寫空字串） |
| `markWordAsDifficult(sheetId, sheetName, rowIndex, isDifficult)` | Sheet ID, 工作表名稱, 列索引, 是否困難 | `Boolean` | 向後兼容函式，轉接到 `updateWordDifficulty` |
| `batchUpdateReviewDates(sheetId, updates)` | Sheet ID, 更新陣列 `[{sheetName, rowIndex, date}]` | `Object` | 批次更新複習日期（寫入 G 欄） |
| `exportWordsToSheet(words, sheetName, targetSheetId, overwrite, isFirstBatch)` | 單字陣列, 工作表名稱, Sheet ID, 是否覆寫, 是否首批 | `Object` | 匯出單字到新工作表 |

### 5.5 重複單字處理

| 函式 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `detectDuplicateWords(allWords)` | 全部單字陣列 | `Array<DuplicateGroup>` | 偵測重複單字（英文區分大小寫） |
| `handleDuplicateWordKeepOne(sheetId, keepWord, deleteWords)` | Sheet ID, 保留單字, 刪除單字陣列 | `Object` | 保留一個，刪除其他（修改 Sheet） |
| `handleDuplicateWordMerge(sheetId, targetWord, mergeWords)` | Sheet ID, 目標單字, 合併來源陣列 | `Object` | 合併定義（修改 Sheet） |
| `autoHandleSkippedDuplicatesInMemory(allWords, duplicates)` | 全部單字, 重複組 | `Object` | 在記憶體中自動處理重複（不修改 Sheet） |
| `autoHandleSkippedDuplicates(sheetId, duplicates)` | Sheet ID, 重複組 | `Object` | 自動處理重複（修改 Sheet） |

### 5.6 工具函式與常數

| 函式/常數 | 說明 |
|------|------|
| `COL` | 0-based 欄位索引常數（`MUST_SPELL=0, ENGLISH=1, CHINESE=2, DIFFICULTY=3, IMAGE_URL=4, IMAGE_FORMULA=5, LAST_REVIEW=6`），用於 `getValues()` 陣列存取 |
| `COL_NUM` | 1-based 欄位編號常數（`MUST_SPELL=1, ..., LAST_REVIEW=7`），用於 `getRange(row, col)` |
| `validateAndCleanSheetId(sheetId)` | 驗證和清理 Sheet ID |
| `openSpreadsheetSafely(sheetId)` | 安全地開啟 Google Spreadsheet（含錯誤處理） |
| `countValidWords(sheet)` | 讀取工作表 A1 格的值作為有效單字數 |
| `createWordObject(rowData, id, sheetName, rowIndex)` | 從列資料建立單字物件（使用 `COL` 常數存取欄位） |
| `findWordRowIndex(sheet, englishWord, chineseWord)` | 根據英文和中文在工作表中尋找列索引 |

---

## 6. UI 元素清單

### 6.1 主畫面

| 元素 ID | 類型 | 說明 |
|---------|------|------|
| `app` | div | 應用程式根容器 |
| `loading` | div | 載入中畫面 |
| `speech-activation-container` | div | 語音啟用按鈕容器（舊版瀏覽器） |
| `activate-speech-btn` | button | 語音啟用按鈕 |
| `error` | div | 錯誤顯示區域 |
| `flashcard` | div | 閃卡主容器 |
| `paused-indicator` | div | 已暫停指示器 |
| `muted-indicator` | div | 已靜音指示器 |
| `english-word` | div | 英文單字顯示區 |
| `chinese-word` | div | 中文翻譯顯示區 |
| `timer-progress-bar` | div | 計時器進度條（畫面最上方水平線，由左到右成長，左端有光暈圓點） |
| `progress-text` | span | 進度文字 |
| `difficulty-display` | span | 不熟程度顯示區（★ + 數字，≤-999 顯示 ✓，其餘負數顯示 0） |
| `difficulty-level` | span | 不熟程度數字（UI 不顯示負數） |
| `must-spell-indicator` | span | 要會拼指示器（✍️要會拼），有標記時顯示 |
| `must-spell-filter-btn` | button | 選單內要會拼篩選切換按鈕 |
| `type-filter-btn` | button | 選單內類型篩選按鈕 |
| `type-filter-modal` | div | 類型篩選模態框 |
| `tag-filter-btn` | button | 選單內標籤篩選按鈕 |
| `tag-filter-modal` | div | 標籤篩選模態框 |
| `active-filters` | div | 篩選指示器容器 |
| `active-filters-text` | span | 篩選指示器文字 |
| `clear-filters-btn` | button | 清除所有篩選按鈕 |
| `restore-btn-container` | div | 恢復按鈕容器 |
| `restore-btn` | button | 恢復單字按鈕 |

### 6.2 控制按鈕

| 元素 ID | 說明 |
|---------|------|
| `prev-btn` | 上一個按鈕 |
| `next-btn` | 下一個按鈕 |
| `voice-toggle-btn` | 語音切換按鈕 |
| `pause-btn` | 暫停/繼續按鈕 |
| `menu-btn` | 選單按鈕 |

### 6.3 模態框

| 模態框 ID | 說明 |
|-----------|------|
| `sheet-settings-modal` | 單字檔設定 |
| `settings-modal` | 一般設定 |
| `voice-settings-modal` | 語音設定 |
| `export-modal` | 匯出單字 |
| `overwrite-confirm-modal` | 覆寫確認 |
| `duplicate-words-modal` | 重複單字處理 |
| `quiz-modal` | 測驗系統 |
| `edit-word-modal` | 編輯當前單字 |
| `difficulty-filter-modal` | 不熟程度篩選 |
| `review-filter-modal` | 複習時間篩選 |
| `srs-review-modal` | SRS 快速複習 |
| `custom-confirm-modal` | 自訂確認對話框（取代瀏覽器 confirm） |

### 6.4 SRS 相關元素

| 元素 ID | 類型 | 說明 |
|---------|------|------|
| `srs-review-btn` | button | 選單內「快速複習」按鈕 |
| `srs-due-badge` | span | 待複習數量徽章（紅色圓形） |
| `srs-stats` | div | 模態框內統計儀表板（複習進度 + 難度分佈） |
| `srs-no-due` | p | 無待複習單字時的提示 |
| `srs-count-options` | div | 數量選項容器 |
| `srs-count-buttons` | div | 數量按鈕群組 |
| `srs-start-btn` | button | 開始複習按鈕 |
| `close-srs-modal` | button | 關閉 SRS 模態框按鈕 |
| `loading-word-english` | div | 載入畫面英文單字 |
| `loading-word-chinese` | div | 載入畫面中文翻譯 |

---

## 7. CSS 樣式規格

### 7.1 CSS 變數（含 fallback）

應用程式使用 CSS 變數（CSS Custom Properties），同時為不支援 CSS 變數的舊版瀏覽器提供硬編碼的 fallback 值。

**重要**: 所有使用 `var()` 的屬性，都必須在同一選擇器或父層先定義不使用 `var()` 的硬編碼 fallback。

### 7.2 主要色彩

| 變數名稱 | 值 | 用途 |
|----------|-----|------|
| `--primary-color` | `#FFFF00` | 主色（黃色，用於單字文字） |
| `--bg-color` | `#000000` | 背景色（黑色） |
| `--text-color` | `#FFFFFF` | 一般文字色（白色） |
| `--gray-color` | `#888888` | 灰色（輔助文字） |
| `--success-color` | `#00FF00` | 成功色（綠色） |
| `--error-color` | `#FF6B6B` | 錯誤色（紅色） |
| `--warning-color` | `#FFA500` | 警告色（橘色） |

### 7.3 動畫效果

| 動畫 | 說明 |
|------|------|
| `.word.show` | 單字淡入動畫（opacity 0→1 + translateY 微移） |
| `.card-section.clicked` | 點擊閃爍效果（背景色變化） |
| 模態框開啟 | 淡入 + 從上方滑入 |
| 進度條 | 平滑寬度過渡 |

### 7.4 響應式斷點

- 主要針對平板裝置（iPad）最佳化
- 使用 `viewport` meta 標籤控制縮放
- 按鈕和觸控元素有足夠的點擊區域

---

## 8. 初始化與啟動流程

### 8.1 完整啟動序列

```
1. HTML 載入完成
2. 建立 FlashcardApp 實例
   ├── _initCoreState()         → 核心狀態（單字、索引、計時器、導航）
   ├── _initVoiceState()        → 語音相關狀態
   ├── _initSettingsState()     → 設定、字型映射、Sheet 設定
   ├── _initFilterState()       → 篩選相關狀態（難度、複習時間、SRS）
   ├── _initScreenAwakeState()  → 防止螢幕關閉相關
   └── _initQuizState()         → 測驗相關屬性
3. FlashcardApp.init() 執行：
   ├── 3a. loadSettings()        → 從 LocalStorage 載入一般設定和語音設定
   ├── 3b. loadSheetSettings()   → 從 LocalStorage 載入試算表設定
   ├── 3c. detectLegacyBrowser() → 偵測是否為舊版瀏覽器
   ├── 3d. setupEventListeners() → 設定所有事件監聯器
   │   ├── setupCoreListeners()
   │   ├── setupMenuListeners()
   │   ├── setupModalListeners()  → 拆分為 7 個子函式
   │   │   ├── _setupSettingsModalListeners()
   │   │   ├── _setupSheetSettingsModalListeners()
   │   │   ├── _setupVoiceSettingsModalListeners()
   │   │   ├── _setupExportModalListeners()
   │   │   ├── _setupOverwriteModalListeners()
   │   │   ├── _setupSrsModalListeners()
   │   │   └── setupQuizListeners()
   │   ├── setupKeyboardListeners()  → 使用 key-action mapping 模式
   │   ├── setupSwipeListeners()  → 觸控滑動手勢（左滑下一個、右滑上一個）
   │   └── setupProgressAndExportListeners()
   └── 3e. 判斷是否有已設定的 Google Sheet
       ├── 有 → loadWords() → handleLoadingComplete()
       │   ├── 舊版瀏覽器 → showSpeechActivation() → 使用者點擊 → activateSpeech()
       │   └── 新版瀏覽器 → hideLoading() → applySettings() → startNewRound()
       └── 無 → handleLoadingComplete(false, true)
           └── hideLoading() → openSheetSettings()
```

### 8.2 單字載入流程

#### 8.2.1 初始載入（逐表載入 + 真實進度條）
```
1. loadWords(isInitialLoad=true, callback)
2. loadWordsProgressively(callback)
3. 對每個選定的工作表並行呼叫 google.script.run.getWordsFromSingleSheet()
4. 每完成一個工作表 → 更新載入進度條（completed / total）
5. 全部完成後 → finishProgressiveLoading()
   ├── 5a. 重新分配唯一 ID
   ├── 5b. 客戶端 detectAndHandleDuplicatesInMemory()（ES5 相容）
   └── 5c. 若有重複 → 自動處理並顯示通知 → callback(false)
6. handleLoadingComplete() → startNewRound()
```

#### 8.2.2 非初始載入（從設定重新載入）
```
1. loadWords(isInitialLoad=false, callback)
2. 呼叫 google.script.run.getWordsFromSheetsWithDuplicateDetection()
3. 後端處理：
   ├── 3a. getWordsFromSheets() → 從多個工作表載入所有單字
   ├── 3b. detectDuplicateWords() → 偵測重複
   └── 3c. 若 autoHandle=true 且有重複 → autoHandleSkippedDuplicatesInMemory()
4. 前端處理回傳結果：
   ├── 4a. 自動處理完成 → 顯示通知 → callback(false)
   ├── 4b. 有重複需手動處理 → showDuplicateModal() → callback(true)
   └── 4c. 無重複 → callback(false)
5. 顯示閃卡主畫面
```

---

## 9. 特殊注意事項

### 9.1 iPad 4 相容性

- 所有 JavaScript 必須是 ES5 語法
- 必須包含 Array Polyfills（forEach、filter、map、find、includes）
- CSS 變數必須有硬編碼 fallback
- Web Speech API 在 iOS 10 以下需要使用者互動才能啟用
- 觸控事件需特別處理（`stopPropagation` 使用 `cancelBubble` 作為 fallback）

### 9.2 Google Apps Script 限制

- 前端透過 `google.script.run` 呼叫後端函式（非同步）
- 使用 `.withSuccessHandler()` 和 `.withFailureHandler()` 處理回呼
- HTML Service 透過 `HtmlService.createTemplateFromFile()` 和 `<?!= include() ?>` 引入子檔案
- 後端 ES6 語法（`const`、`let`、箭頭函式等）是允許的（在 Google 伺服器端執行）

### 9.3 錯誤處理策略

- 載入單字失敗時，自動使用 `getDemoWords()` 示例資料
- 所有後端函式都有 try-catch 包裝
- 語音功能失敗不影響核心閃卡功能
- 網路錯誤時顯示錯誤畫面，提供重新載入按鈕

### 9.4 效能考量

- 圖片批次預載（當前 + 未來 10 張），快速切換時減少等待
- 批次匯出以避免一次性處理大量資料
- 語音播放使用佇列管理，避免重疊
- 計時器統一管理（`_setDisplayTimer` / `_clearDisplayTimer`），同時在主執行緒和 Web Worker 設定，確保背景執行時仍能正常觸發，並避免記憶體洩漏

---

## 10. 預設配置值一覽

| 配置項 | 預設值 |
|--------|--------|
| 延遲時間 | 4.5 秒 |
| 字體大小 | 96px |
| 字型 | 系統預設 |
| 顯示模式 | 先顯示英文 (`english-first`) |
| 要會拼單字混合模式下強制先顯示中文 | 啟用 (`mustSpellChineseFirst: true`) |
| 延遲發音 | 關閉 |
| 英日文語音 | 開啟 |
| 語音速度 | 0.8 |
| 字母拼讀 | 關閉 |
| 中文語音 | 關閉 |
| 中文語音語系 | zh-TW |
| 英文語音語系 | en-US |
| 日文語音語系 | ja-JP |
| 歷史記錄上限 | 10 筆 |
| 快速測驗題數 | 10 題 |
| 批次匯出數量 | 每批 15 個（`APP_CONSTANTS.EXPORT_BATCH_SIZE`） |
| 防螢幕休眠 Keep-Alive 間隔 | 30 秒 |
| 複習日期同步閾值 | 每 20 個已複習單字 |
| 複習時間篩選預設 | 全部（不篩選） |
| 不熟程度篩選預設 | 0（全部，不篩選；僅 -999 的單字預設被排除，-1~-998 正常出現） |
| 計時進度條顯示 | 啟用 (`showTimerProgressBar: true`) |
| 計時進度條偏移 | 0px (`timerProgressBarOffset: 0`) |
| 智慧計時 | 關閉 (`smartTimerEnabled: false`) |
| 輪播記憶模式 | 關閉 (`carouselMemoryMode: false`) |
| 要會拼篩選預設 | false（不篩選） |
| 類型篩選預設 | 全部（單字、片語、句子皆選取，不篩選） |
| 標籤篩選預設 | 空（不篩選） |

---

## 11. 變更紀錄

### v1.18.8 (2026-04-16) — 修正「重新載入單字」載入畫面未顯示上次單字

- 修正「重新載入單字」時載入畫面未從 `flashcard-last-word` 讀取並顯示上次瀏覽的單字，使其行為與瀏覽器重新整理一致

### v1.18.7 (2026-04-01) — 暫刪後「上一個」還原：單次與條件觸發

- **還原機制**: `removalUndoStack` 改為單一 `removalUndoEntry`；僅能還原上一筆確認暫刪，且須 `isRemovalUndoEligible()`（進度未過一半：一般／聽力模式第二語言尚未顯示；輪播記憶模式進度條未達 50%）；成功還原後即失效
- **失效條件**: 在未對當前單字執行暫刪的情況下以「下一個」切到再下一張時清除；第二語言已顯示（非輪播）、輪播計時過半、新回合／篩選重套用等亦清除；`updateButtonStates` 依 `isRemovalUndoEligible()` 決定是否啟用「上一個」

### v1.18.6 (2026-04-01) — 搜尋單字：選單暫停維持、B 欄完全符合

- **選單暫停**: 點選「🔍 搜尋單字」時 `closeMenu(true)`，關閉選單後不恢復計時，保留選單開啟時的暫停狀態
- **完全符合**: 搜尋模態框新增核取方塊；勾選後僅列出 B 欄英文與關鍵字完全一致（不分大小寫）的單字

### v1.18.5 (2026-04-01) — 字庫搜尋單字

- **搜尋**: 選單新增「🔍 搜尋單字」，於已載入的 `words` 內對英文／中文欄做子字串搜尋，結果顯示工作表名稱與試算表列號，可開啟編輯單字
- **編輯 API**: `openEditWordModal(optWord)` 可選傳入單字物件（搜尋結果編輯）；未傳入時仍編輯當前卡片
- **檔案**: 新增 `script-search-word.html`；樣式於 `style-modal.html`；`script-events.html` 註冊選單與 `_setupSearchWordModalListeners`

### v1.18.4 (2026-04-01) — 選單重新載入保留快速複習

- **重新載入單字**: 選單「🔄 重新載入單字」在 `startNewRound` 前呼叫 `_flagSrsRestoreBeforeNewRound()`，與 F5 相同依 `_srsRestorePending` 還原快速複習（`applyAllFilters` → `getRecommendedWords` → 套用 `_srsSelectedCount`），篩選列「📖 快速複習 (N個)」與整頁重新整理一致
- **其他非整頁載入**: 試算表設定儲存後逐表載入、重複單字自動處理完成、`reloadWordsAfterDuplicateProcessing` 於 `startNewRound` 前同樣呼叫，避免快速複習狀態遺失

### v1.18.3 (2026-04-01) — 主畫面快速計時與智慧計時

- **主畫面左緣**: 新增 `quick-timer-dock`（桌面 hover 展開；觸控以 ⏱ 切換），可調整延遲時間與智慧計時，與一般設定同步並寫入 LocalStorage

### v1.18.2 (2026-04-01) — 確認暫刪後可用「上一個」還原

- **暫時刪除**: `confirmRemoval` 時將可還原快照推入 `removalUndoStack`；按 ↑／← 或「上一個」時優先呼叫 `undoLastConfirmedRemoval`（LIFO），還原不熟程度、複習日期、`removedWords`、SRS 與當輪 `currentWords` 順序
- **UI**: `updateButtonStates` 在 `removalUndoStack` 非空時啟用「上一個」；新回合／篩選重套用時清空堆疊

### v1.18.1 (2026-04-01) — 「下次不自動合併」後載入改為詢問合併

- **重複單字**: 使用者在自動合併通知中點選「下次不自動合併」後，下次重新載入時若有重複，改為開啟重複單字處理模態框，不再僅略過合併而無提示
- **實作**: 抽出 `findDuplicateGroupsInMemory`；`finishProgressiveLoading` 在 `NO_AUTO_MERGE` 且偵測到重複時設定 `duplicateWords` 並呼叫 `showDuplicateModal`

### v1.18.0 (2026-04-01) — 重複單字大小寫、自動合併通知、智慧計時、暫刪 S 鍵

- **重複單字**：英文比對改為區分大小寫（`May` 與 `may` 不視為重複）；客戶端 `detectAndHandleDuplicatesInMemory` 與後端 `detectDuplicateWords` 一致
- **自動合併通知**：右上角通知滑鼠移入時暫停自動消失；新增「下次不自動合併」按鈕，寫入 `localStorage`（`STORAGE_KEYS.NO_AUTO_MERGE`），初始載入時略過自動合併
- **智慧計時**：不加速條件改為（要會拼且不熟程度>0）或（不熟程度≥3）；中文為第二語言時亦適用
- **暫時刪除**：暫刪狀態下按 S 不再將單字標為非常熟（移除誤觸捷徑）

### v1.17.0 (2026-03-08) — 程式碼重構：模組拆分與共用輔助方法

**共用輔助方法（script-core.html）**
- 新增 `cancelAllSpeech()`：統一 4 步語音清理（clearSpeechWait + chineseWaitInterval + _speechSequenceActive + speechSynthesis.cancel），替換 8+ 處重複程式碼
- 新增 `clearAllTimersAndSpeech()`：_clearDisplayTimer + cancelAllSpeech，替換 10+ 處重複程式碼
- 新增 `clearFlashcardImage()` / `setFlashcardImage(url)`：統一閃卡背景圖片操作，替換 5+ 處重複程式碼

**模組拆分（script-display.html 1430 行 → 4 個檔案）**
- 新增 `script-settings-modal.html`：設定模態框、快速模式切換、Sheet 設定、滑桿增強
- 新增 `script-difficulty.html`：不熟程度增減/同步/UI/智慧計時/顯示順序
- 新增 `script-progress-bar.html`：進度條動畫（開始/暫停/恢復/重置）
- `script-display.html` 精簡為：暫停/恢復、單字點擊/刪除、翻譯排程、導覽、通知、圖片預載

**方法搬移（script-voice.html 1242 行 → 600 行）**
- nextWord/previousWord/saveNavigationState/confirmRestart/restart → script-display.html
- togglePause/updatePauseButtonState/redisplayCurrentWord → script-display.html
- 全螢幕相關（enterFullscreen/exitFullscreen/toggleFullscreen 等）→ script-events.html

**長函式拆分**
- displayCurrentWord（~130 行）拆為 dispatcher + `_displayCarouselWord` / `_displayListeningWord` / `_displayNormalWord` 三個子函式

**Modal 標準化**
- 所有 modal 背景點擊改用共用 `isModalBackgroundClick(e, modal)` 取代 inline `e.target === modal`

### v1.17.1 (2026-03-06) — 測試案例整併與補足

- **合併 v1160.test.js**：Bug 1 startSrsReview 暫停重置 6→2、applyQuickMode 暫停/計時條 10→3、輪播模式其他快速模式重置 4→1、resetSettings 清除輪播 2→1，共減少 15 個測試
- **補足 core.test.js**：新增 `isModalBackgroundClick`（點擊目標為 modal vs 子元素）、`updateLoadingProgress`（百分比/indeterminate/總數 0）共 5 個測試
- **補足 settings.test.js**：新增 `resetSettings` 還原預設設定與 voiceSettings 共 1 個測試
- 測試總數：807 → 798（略減且覆蓋更合理）

### v1.16.0 (2026-03-06) — 輪播記憶模式、聽力體驗優化、暫停同步修正

**Bug 修正**
- 暫停狀態下開始快速複習時，重置 `userPaused`/`isPaused`，確保暫停指示器與計時進度條同步
- 日常複習（快速模式 3）自動設定延遲秒數為 10 秒
- 暫時刪除時，若該單字最後複習日期為今天則不減少不熟程度，避免同一天加強複習造成過度下降
- 字母拼讀模式下，初始語音延遲從 500ms 縮短至 50ms，消除首字發音的額外等待感

**聽力模式優化**
- Phase 1 立即發音（不延遲 SPEECH_DELAY_MS），因無文字需先閱讀
- Phase 2 出現文字與翻譯時再次發音，強化聽覺記憶（忽略延遲發音設定）

**新功能**
- 新增快速模式 5「🔄 輪播記憶」：中英文同時顯示、單一進度條 0%→100%、自動輪播，用於被動式背景記憶
- 快速複習數量選擇支援自訂數字輸入，不再限於預設按鈕
- 圖片批次預載由 2 張（當前 + 下一張）擴展至 10 張，減少快速切換時的載入等待
- 智慧計時加入 JSDoc 註解，釐清永遠不超過 delayTime 的設計意圖
- 載入畫面新增工作表名稱清單，即時顯示各工作表載入狀態（⏳ 載入中 / ✓ 完成含單字數 / ✗ 失敗）
- 修正含括號的圖片 URL（如 `filters:no_upscale():max_bytes(150000)`）在單字卡主畫面無法顯示的問題，改用 CSS `url("...")` 引號包裹

### v1.15.0 (2026-02-28) — 從未複習單字無條件最高優先

- 快速複習優先度邏輯重構：從未複習（`lastReviewDate` 為空）且不熟程度 > 0 的單字無條件列為最高優先（priority 0），即使該單字已有 SRS 資料也不受影響
- 解決在部分中斷場景下，新單字可能有 SRS 資料卻未記錄複習日期，導致被分類為 SRS 到期/未到期而非最高優先的問題

### v1.14.9 (2026-02-28) — 依難度覆寫複習間隔

- difficulty > 0 的單字固定為 1 天間隔，確保不熟的字每日出現
- difficulty < 0 的單字使用公式 `min(365, ceil(12 * sqrt(|difficulty|)))` 計算間隔，越熟悉的字出現頻率越低（-1 約 12 天、-999 約 365 天）
- difficulty = 0 維持原有 Box 等級間隔不變

### v1.14.8 (2026-02-28) — SRS 複習流程優化

- 調整 Box 晉升門檻：difficulty ≤ 5 晉升、6-7 不變、≥ 8 重置為 Box 1，解決 difficulty 3-5 的單字長期卡在 Box 1 無法進步的問題
- 移除 `markWordAsReviewed` 中多餘的 `updateSrsData` 呼叫，避免每次複習觸發兩次 Box 調整導致跳級

### v1.14.7 (2026-02-28) — SRS 間隔調整為 8 級

- SRS Box 從 6 級擴展為 8 級，間隔調整為 1、2、4、7、14、30、60、120 天
- 初始 Box 對應調整：非常熟 → Box 7（60天）、無標記 → Box 4（7天）、略不熟 → Box 2（2天）、很不熟 → Box 1（1天）
- 早期複習更密集（Box 2 從 3 天縮短為 2 天），適合每日新增 3 個高難度單字的使用模式
- 最大間隔從 60 天延長至 120 天，減少已熟悉單字的複習頻率，提高每日 100 個複習額度的利用效率

### v1.14.6 (2026-02-28) — 快速複習新增單字優先順序清單

- 快速複習模態框新增可收合的「單字優先順序」清單，顯示每個單字的排名、優先類別、不熟程度、最後複習日
- 重構 `getRecommendedWords` 為 `_buildPriorityList` 內部方法 + `getRecommendedWords`（回傳 word 陣列）+ `getRecommendedWordsWithPriority`（回傳含 metadata 陣列）
- `openSrsReviewModal` 呼叫 `renderWordPriorityList` 渲染清單
- 新增 SRS 優先順序表格 CSS（收合按鈕、sticky 表頭、交替行色、捲動區域）

### v1.14.5 (2026-02-28) — 快速複習優先度調整 + toast 位置修正

- 快速複習優先度重構為 4 級：不熟程度 > 0 或全新單字（lastReviewDate 為空）為最高優先，高於 SRS 已到期單字
- 不熟程度 > 0 的單字即使有複習記錄也維持最高優先，不會因 lastReviewDate 非空而降級
- 將「非常熟」標記提示 toast 從畫面底部 (`bottom: 55px`) 改為畫面垂直置中 (`fixed + translate`)，避免被下方「恢復單字」按鈕擋住
- 補充 `-webkit-transform` 和 `-webkit-transition` 前綴以相容 iPad 4

### v1.14.3 (2026-02-22) — 測試執行效能優化

- 新增 `test/environment.js` 自訂 Jest 測試環境，在 class level 快取 15 個腳本檔案的串接內容（~400KB），每個 worker 只讀取一次檔案，21 個測試套件共享快取
- 新增 `test/setup-env.js` 搭配 `setupFilesAfterEnv` 設定，自動為每個測試檔案執行 `bootstrapApp()`，移除 21 個測試檔案中手動呼叫 `setup.bootstrapApp()` 的 `beforeAll` 區塊
- `jest.config.js` 新增 `bail: 1`（首次失敗即停止）、`maxWorkers: '50%'`（減少 worker 數量降低記憶體壓力）
- `package.json` 新增 `test:watch`（只重跑變更相關測試）、`test:file`（指定檔案測試）npm 腳本
- `setup.js` 的 `bootstrapApp()` 優先使用自訂環境注入的快取腳本，無快取時回退至檔案讀取

### v1.14.2 (2026-02-22) — 聽力練習支援片語與句子

- 聽音辨字與聽音拼字不再排除句子，現在支援單字、片語、句子三種類型
- 移除 `_filterListeningWords()` 中的 `getWordType !== 'sentence'` 過濾邏輯
- 移除聽力練習範圍顯示中的「（不含句子）」後綴
- 更新提示訊息：「可用單字太少」改為「可用項目太少」；拼字介紹文字改為「拼出你聽到的內容」
- 更新測試：驗證句子現在包含在聽力練習中

### v1.14.1 (2026-02-21) — 複習日期同步加強：少量單字與暫停觸發

- 新增 `APP_CONSTANTS.REVIEW_SYNC_LOW_WORDS_TRIGGER`（預設 3）：暫時刪除後若剩餘單字 <= 3 個，立即觸發 `syncReviewDates()` 同步已複習的單字
- 使用者手動暫停（`togglePause`）時也觸發 `syncReviewDates()`
- 修正原本僅在達到 20 個閾值、開啟選單、或頁面卸載時才同步的限制，避免使用者在少量單字循環後暫停離開，導致暫時刪除的單字未更新最後複習時間

### v1.14.0 (2026-02-21) — 編輯單字 Enter 鍵快速儲存

- 在編輯單字模態框的所有文字/數字輸入框（單字、翻譯、圖片 URL、標籤、不熟程度數字）加入 Enter 鍵監聽
- 按下 Enter 即觸發儲存，免用滑鼠點擊「儲存」按鈕，提升鍵盤操作流暢度
- `e.preventDefault()` + `e.stopPropagation()` 防止 Enter 事件冒泡觸發其他全域快捷鍵

### v1.13.9 (2026-02-21) — 測試精簡與去重

- 合併 `quiz.test.js` 至 `quiz-flow.test.js`，消除 `createQuestion`、`generateQuestions`、`getResultMessage`、`selectAnswer`、`getCurrentAvailableWords` 的重複測試，刪除 `quiz.test.js`（22 → 21 test suites）
- 移除 `core.test.js` 中與 `history.test.js` 重複的 `isDefaultSheet` 測試
- 合併 `filter.test.js` 中與 `filter-modal.test.js` 重複的 `clearAllFilters` 測試
- 將 `quiz-flow`、`listening`、`round-display` 中的 spy 斷言改為 DOM 行為斷言
- 簡化 `listening.test.js` 句子排除測試（引號變體已由 `getWordType` 測試覆蓋）
- 測試數量：748 → 723（減少 25 個重複/冗餘測試）

### v1.13.8 (2026-02-21) — 句子判定支援引號結尾

- `getWordType()` 新增引號穿透邏輯：當最後一個字元為 `"`、`"`（右彎引號）或 `'` 時，改檢查前一個字元是否為句尾標點（`.` `?` `!`）
- 例如 `He said "hello."` 和 `She asked 'why?'` 現在正確判定為 sentence
- 聽力練習的 `_filterListeningWords()` 自動受惠，引號結尾的句子不再誤入聽力單字測驗
- 新增 9 個 `getWordType` 專屬測試 + 1 個聽力篩選引號句子測試

### v1.13.7 (2026-02-21) — 修正測驗錯誤選項超出篩選範圍

- 測驗的錯誤選項（wrong options）改為從篩選後的單字集 `quizState.availableWords` 產生，不再從 `this.words`（所有工作表原始單字）取樣
- 聽力練習的錯誤選項同步修正，改從 `listeningState.availableWords` 產生
- 修正前：題目本身來自篩選後的單字，但錯誤選項可能出現其他工作表 / 未通過篩選條件的單字，導致使用者感覺測驗內容超出篩選範圍
- 當篩選後的單字集不足以產生足夠的錯誤選項時，仍會 fallback 至通用備選選項

### v1.13.6 (2026-02-21) — 修正測驗未套用篩選條件

- `getCurrentAvailableWords()` 改為啟動時重新呼叫 `applyAllFilters(this.words)` 取得單字，不再依賴可能過時的 `this.currentWords`
- `_filterListeningWords()` 同步修正，從 `this.words` 重新篩選後再排除句子
- 確保快速測驗、完整測驗、聽音辨字、聽音拼字都使用與目前篩選條件一致的單字
- 更新測試：驗證 `getCurrentAvailableWords` 會依據 `difficultyFilter` 篩選

### v1.13.5 (2026-02-21) — 測驗範圍文字顯示所有篩選條件

- 提取共用 `_buildScopeText()` 方法，測驗與聽力練習共用篩選範圍顯示邏輯
- 範圍文字新增顯示：✍️ 要會拼、📝 類型篩選、🏷️ 標籤篩選、🔄 快速複習
- 聽力練習模態框的 scope-info 改用 `_buildScopeText()` 顯示完整篩選條件
- 篩選條件以 `·` 分隔，清楚標示目前生效中的所有篩選

### v1.13.4 (2026-02-21) — 聽音拼字 Enter 流程修正 + ESC 關閉所有 Modal

**聽音拼字 Enter 鍵修正**
- 修正按下 Enter 提交拼字後立即跳下一題的問題（`e.stopPropagation()` 阻止事件冒泡到 document handler）
- 提交後顯示正確/錯誤回饋與正確答案，再按 Enter / 方向右鍵 / 方向下鍵 進入下一題

**ESC 鍵關閉 Modal**
- 新增 `_closeTopmostModal()` 方法，由上而下偵測所有開啟的 modal 並關閉最頂層的那個
- custom-confirm-modal 優先級最高（觸發 cancel 回呼），其次為 quiz/listening/export/edit-word/filter/settings 等 14 種 modal
- ESC 按鍵處理放在 `handleKeyDown` 最前端，即使焦點在表單控件內也能觸發
- 新增 7 個測試驗證 `_closeTopmostModal` 在各種 modal 狀態下的行為

### v1.13.3 (2026-02-21) — 快速模式 Toast 格式統一

- 四個快速模式切換的 toast 通知改為結構化格式：標題 + 逐行列出每項設定
- 每項設定使用與設定面板一致的圖示（🔄 顯示模式、🔤 字母拼讀、🗣️ 中文發音、⏱️ 智慧計時/延遲秒數、⏳ 延遲發音、🎧 聽力模式）
- `showNotification` 支援多行內容的結構化渲染：標題居中 + 細節左對齊
- 完整列出每個模式實際變更的所有設定，確保四種模式之間格式一致

### v1.13.2 (2026-02-21) — Toast 滑鼠懸停保持顯示

- 修正通知 toast（`.app-notification-toast`）的 `pointer-events: none` 導致 mouseenter/mouseleave 事件無法觸發的問題
- 在 `.show` 狀態加上 `pointer-events: auto`，使滑鼠移至 toast 上方時暫停自動消失計時器，方便使用者閱讀快速模式切換等多行通知

### v1.13.1 (2026-02-21) — 代碼重構與測試強化

**重構**
- 提取 `_applyFilterAndRefresh()` 共用方法，消除 `script-filter.html` 中 4 個篩選 apply 函式的重複代碼
- 提取 `_generateWrongOptions()` 共用方法到 `script-core.html`，消除測驗與聽力練習的選項生成重複
- 將 `getWordType()` 從 `script-filter.html` 搬移至 `script-core.html`，減少跨模組隱式依賴
- 以 `APP_CONSTANTS.DIFFICULTY_VERY_FAMILIAR`（-999）、`MS_PER_DAY`、`LISTENING_AUDIO_DELAY_MS`、`LISTENING_FEEDBACK_DELAY_MS` 取代散落各處的 magic numbers

**測試強化（638 → 724 tests）**
- 修正 `test/setup.js`：custom-confirm DOM ID 對齊實際 HTML、匯出 `getWordType` 至 global、新增 `createApp()` 工具函式
- 新增 `test/setup.js` 中 type/tag filter modal 的 DOM 結構（checkbox 嵌套在 modal 內）
- `test/srs.test.js`：新增 `getRecommendedWords`（優先度排序）、`calculateSrsStats`（統計）、`startSrsReview`（整合流程）共 22 個測試
- `test/filter-modal.test.js`：新增 type/tag filter modal 開關與套用、`saveFilterSettings`/`loadFilterSettings` round-trip 共 12 個測試
- `test/quiz-flow.test.js`：新增 `selectAnswer`、`showAnswerFeedback`、`showQuizResult`、`getResultMessage`、`createQuestion`、`generateQuestions`、`_generateWrongOptions` 共 30 個測試
- `test/listening.test.js`：新增 `_generateListeningQuestions`、`_renderListeningChooseOptions`、`_renderListeningSpellInput`、`_showListeningWrongReview`、edge cases 共 15 個測試
- 新增 `test/custom-confirm.test.js`：10 個測試覆蓋 customConfirm 全流程（顯示/確認/取消/背景點擊）
- 將 implementation-detail 斷言（calls renderDifficultyLevel 等）改為 behavioral 斷言（驗證 DOM 狀態）
- 將 `test/events.test.js` 更名為 `test/round-display.test.js` 以反映實際測試內容

### v1.13.0 (2026-02-20) — 聽力練習模組

**新功能 A：聽力練習（聽音辨字 + 聽音拼字）**
- 新增 `script-listening.html` 模組，提供兩種聽力練習模式
- **聽音辨字**：播放英文語音，從四個中文選項中選出正確意思
- **聽音拼字**：播放英文語音，學生拼出聽到的單字（不區分大小寫）
- 支援單字、片語與句子三種類型
- 支援重播語音、即時回饋（正確/錯誤）、完成後顯示分數與錯題回顧
- 在測驗選單飛出子選單中新增「聽音辨字」與「聽音拼字」兩個入口
- 新增 `LISTENING_QUICK_COUNT`（10）、`LISTENING_MIN_WORDS`（3）常數

**新功能 B：閃卡聽力模式**
- 新增「聽力模式（先聽後看）」設定開關（一般設定中的 toggle）
- 啟用後，每張單字卡 Phase 1 只播放語音不顯示文字
- Phase 2（時間過半）同時顯示英文與中文翻譯
- 使用者點擊/D 鍵操作時也會同步顯示所有文字
- 新增 `this.settings.listeningMode` 設定項，持久化於 localStorage

**UI 優化**
- 移除聽力練習中的「再聽一次」按鈕（改為點擊喇叭圖示重播）與「確認」按鈕（改為 Enter 鍵提交），縮減垂直空間避免回饋區域被截斷
- 縮小喇叭圖示上方空白區域
- 關閉按鈕（X）在練習進行中也可隨時關閉
- 聽力模式下忽略「延遲發音」設定，一律播放英文語音（不論顯示順序）
- 聽力模式 Phase 1 立即發音（不延遲 SPEECH_DELAY_MS），因無文字需先閱讀
- 聽力模式 Phase 2 出現文字時再次發音，強化聽覺記憶（忽略延遲發音設定）
- 快速模式 1-3 自動關閉聽力模式，並在通知中提示
- 新增快速模式 4「聽力訓練」：開啟聽力模式、字母拼讀關、中文發音關、智慧計時開
- 聽力模式設定從一般設定移至語音設定最下方
- 通知 toast 滑鼠移入時暫停消失計時，移出後重新計時
- 聽音拼字答題回饋後，可按 Enter / 右鍵 / 下鍵 直接跳下一題

**測試**
- 新增 `test/listening.test.js`：54 個測試覆蓋聽力練習全流程 + 閃卡聽力模式（Phase 1 英文發音、Phase 2 不發音、語音設定讀寫、快速模式 1-3 關閉聽力、快速模式 4 開啟聽力、反向模式仍播英文）
- 測試數量：584 → 638（+54 個）

### v1.12.5 (2026-02-20) — 重構與測試強化

**版本號集中管理**
- 新增 `APP_CONSTANTS.APP_VERSION` 作為唯一版本來源，載入畫面自動從此常數同步顯示版本號
- 移除 `index.html` 中硬編碼的版本號，避免日後版本不同步

**篩選條件持久化**
- 新增 `saveFilterSettings()` / `loadFilterSettings()`，將 5 種篩選條件（不熟程度、複習時間、要會拼、類型、標籤）及快速複習數量存入 localStorage
- 頁面重新載入時自動恢復上次的篩選條件，選單按鈕文字與篩選指示器同步更新
- 新增 `updateAllFilterButtonTexts()` 統一更新所有篩選按鈕文字
- 改善 `startNewRound()` 空結果處理：原本只重設不熟程度和複習時間篩選，現在涵蓋所有 5 種篩選條件
- 所有篩選套用/清除操作（含空結果回退）皆同步儲存至 localStorage
- 新增 `STORAGE_KEYS.FILTER_SETTINGS` 鍵名（`flashcard-filter-settings`）
- `loadFilterSettings()` 含完整驗證邏輯，防止無效資料導致異常

**快速複習與篩選整合**
- 快速複習數量（`_srsSelectedCount`）與啟用狀態（`srsReviewActive`）持久化至 localStorage
- 重新載入時自動恢復快速複習模式（使用一次性 `_srsRestorePending` 旗標，避免一般回合結束時誤觸恢復）
- 快速複習模態框打開時預選上次儲存的數量；除預設按鈕（10/20/30/50/100/全部）外，另提供自訂數量輸入欄位
- 快速複習與其他篩選條件為 AND 關係：先套用所有篩選條件，再從結果中依 SRS 優先度排序
- `getRecommendedWords(sourceWords)`、`getDueWords(sourceWords)`、`calculateSrsStats(sourceWords)` 新增可選 `sourceWords` 參數
- `openSrsReviewModal()` 統計與數量選項基於篩選後的單字集
- 篩選條件下無可複習單字時，模態框顯示「目前篩選條件下沒有可複習的單字」
- `startNewRound()` 重構：區分頁面載入恢復（restore SRS）與一般回合結束（結束 SRS），後者正確清除 localStorage 中的 SRS 狀態

**程式碼重構 (Part A)**
- 修正 `isModalBackgroundClick` 函式的 dead-loop bug，簡化為 `e.target === modal`
- 移除 `script-events.html` 中 5 處重複的 modal 背景點擊偵測邏輯（~80 行），統一使用 `isModalBackgroundClick`
- 提取 `_renderDifficultyUI` 共用方法，消除 `renderDifficultyLevel` 與 `renderDifficultyLevelPreview` 之間的重複邏輯
- 提取 `_revealSecondPart` 共用方法，統一 `showSecondPartAndScheduleNext`、`onWordClick`、`confirmMarkVeryFamiliar` 三處重複的顯示第二語言 + 圖片 + 語音邏輯（~60 行）
- 將 `setupMenuListeners` 中 18 個 if-else 分支重構為資料驅動的 `menuActions` 對照表，新增/移除選單項目更容易維護

**測試強化 (Part B)**
- 新增 `screen-awake.test.js`：24 個測試覆蓋 `_isAndroidDevice`、`_setDisplayTimer`、`_clearDisplayTimer`、`_handleVisibilityResume`、`enableKeepScreenAwake`、`disableKeepScreenAwake`（原 0% 覆蓋率）
- 新增 `events.test.js`：20 個測試覆蓋 `displayCurrentWord` 與 `startNewRound`
- 新增 `settings.test.js`：19 個測試覆蓋 `applySettings`、`applyFontFamily`、`saveSettingsAndClose`
- 新增 `filter-modal.test.js`：14 個測試覆蓋複習時間/不熟程度篩選模態框的 open/apply/close 流程
- 新增 `export-batch.test.js`：7 個測試覆蓋 `processBatch` 批次匯出與模態框開關
- 新增 `quiz-flow.test.js`：26 個測試覆蓋測驗 UI 流程（`startQuiz` → `beginQuiz` → `showQuestion` → `nextQuestion`）
- 擴充 `difficulty.test.js`：新增 9 個 `confirmMarkVeryFamiliar` 邊界情境測試
- 修正 1 個失敗測試（負數不熟程度跳轉至 3）
- 測試數量：469 → 588（+119 個）

---

## 12. 待移植/重建清單

以下是在新平台重建此應用程式時需要實作的所有模組：

- [ ] **後端資料層**: Google Sheets 讀取/寫入（或替代資料來源）
- [ ] **單字載入與洗牌**: Fisher-Yates 隨機洗牌演算法
- [ ] **閃卡輪播引擎**: 自動計時、雙階段顯示（第一語言→第二語言）
- [ ] **點擊互動與暫時移除**: 點擊標灰→延遲移除→恢復機制
- [ ] **導覽系統**: 上一個/下一個，含導覽歷史堆疊
- [ ] **多層級不熟程度系統**: -999~10 級不熟程度（負數=非常熟，-999=D鍵標記）、★ 星號/數字顯示、篩選模態框（含非常熟類別）、S 鍵增加/移除減少（可減至負數；暫時刪除狀態下 S 無作用）/D 鍵標記非常熟（雙按確認設 -999）、數字格式同步到後端、快速模式（3種預設）
- [ ] **語音系統**: 英文/日文/中文朗讀、字母拼讀、延遲發音
- [ ] **設定系統**: 一般設定、語音設定、試算表設定，LocalStorage 持久化
- [ ] **測驗系統**: 題目生成、四選一、計分、錯題回顧
- [ ] **匯出系統**: 批次匯出、覆寫保護、進度顯示
- [ ] **即時編輯單字**: 編輯模態框、前後端同步更新、工作表名稱顯示
- [ ] **重複單字偵測與處理**: 自動/手動、記憶體/Sheet 兩種模式
- [ ] **UI 系統**: 深色主題、模態框、選單、響應式設計
- [ ] **圖片系統**: 背景圖片顯示、預加載
- [ ] **防螢幕休眠與背景執行**: Wake Lock / NoSleep Video / Keep-Alive / Web Worker 背景計時器 / visibilitychange 計時器補償
- [ ] **全螢幕支援**: 多瀏覽器相容的全螢幕 API
- [ ] **鍵盤快捷鍵**: 空白鍵、方向鍵、M/F/S/D/R/E/Escape
- [ ] **複習時間篩選系統**: G 欄日期追蹤、批次同步、篩選模態框、多條件疊加
- [ ] **舊版瀏覽器相容**: ES5 polyfills、語音啟用流程、CSS fallback
