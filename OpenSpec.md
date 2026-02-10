# OpenSpec: 英文單字閃卡應用程式

> **版本**: 1.7.5
> **最後更新**: 2026-02-10
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
├── code.gs                # Google Apps Script 後端程式碼（約 758 行）
├── index.html             # 主要 HTML 結構（含所有模態框）
│
│   # CSS 樣式模組（原 style.html 拆分為 5 個模組）
├── style-base.html        # CSS 變數、iPad 4 fallback、重置、基礎元件、通用按鈕、RWD、動畫
├── style-flashcard.html   # 閃卡顯示、還原按鈕、進度/控制列、選單、不熟程度/指示器、暫停/靜音
├── style-modal.html       # 模態框框架、表單輸入、編輯單字模態框、工具提示
├── style-sheets.html      # 匯出進度、Google Sheet 元件、歷史清單、重複單字、通知、輔助說明、錯誤
├── style-quiz.html        # 測驗元件、複習篩選模態框
│
│   # 前端 JavaScript 模組（原 script.html 拆分為 10 個模組）
├── script-polyfills.html  # ES5 Polyfills（forEach, filter, map, find, includes）
├── script-core.html       # 建構函式、初始化、設定管理、單字載入
├── script-events.html     # 事件監聽器設定、語音啟用、基本 UI 顯示
├── script-display.html    # 設定模態框、計時器/暫停、不熟程度、閃卡互動、滑桿
├── script-voice.html      # 語音朗讀（英/日/中）、導覽、全螢幕、語音設定
├── script-export.html     # 匯出功能（批次匯出、覆寫處理）
├── script-sheets.html     # Google Sheet 載入、驗證、工作表選擇
├── script-duplicates.html # 重複單字偵測與處理
├── script-filter.html     # 複習時間篩選、不熟程度篩選、要會拼篩選、編輯單字、SRS 間隔重複系統
├── script-quiz.html       # 防螢幕關閉、測驗系統、全域初始化
│
│   # 部署與工具設定
├── appsscript.json        # Google Apps Script 專案清單（clasp 用）
├── .clasp.json            # clasp 專案設定（含 Script ID）
├── .claspignore           # clasp 推送時排除的檔案
├── package.json           # npm 腳本（部署指令 + Jest 測試）
├── jest.config.js         # Jest 單元測試設定
├── deploy.sh              # 部署腳本（首次設定 / 推送 / 拉取）
├── .gitignore             # Git 忽略規則
│
│   # 測試
├── test/setup.js          # 測試環境初始化（DOM 模擬、Mock）
├── test/polyfills.test.js # Polyfills 單元測試
├── test/core.test.js      # 核心功能單元測試
├── test/voice.test.js     # 語音功能單元測試（含語音等待機制）
├── test/navigation.test.js# 導覽功能單元測試（上/下一個、進度）
├── test/difficulty.test.js# 不熟程度系統單元測試
├── test/pause.test.js     # 暫停/繼續功能單元測試
├── test/srs.test.js       # 間隔重複系統(SRS)單元測試
├── test/history.test.js   # 單字檔歷史記錄單元測試
├── test/sheets.test.js    # Sheet ID 解析單元測試
├── test/filter.test.js    # 篩選邏輯單元測試
├── test/quiz.test.js      # 測驗系統單元測試
├── test/export.test.js    # 匯出功能單元測試
├── test/duplicates.test.js# 重複處理單元測試
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

### 2.5 前端架構

- **設計模式**: 單一建構函式 `FlashcardApp`，所有方法掛載於 `FlashcardApp.prototype`
- **模組化**: 前端程式碼拆分為 10 個 HTML 模組檔案，透過 `<?!= include('filename'); ?>` 在 `index.html` 中按順序載入
- **生命週期**: 建構函式初始化 → `init()` → 載入設定 → 載入單字 → 啟動閃卡輪播
- **狀態管理**: 所有狀態存放在 `FlashcardApp` 實例的屬性中
- **單元測試**: 使用 Jest + jsdom，執行 `npx jest` 可運行 300 個測試案例（涵蓋語音等待機制、導覽、不熟程度、暫停/繼續、SRS 間隔重複、單字檔歷史等核心功能）

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
  difficultyLevel: Number,   // 不熟程度 -1~10（來源：D 欄，-1=非常熟/已掌握，0=已熟悉，10=最不熟）
  image: String,             // 圖片 URL（來源：E 欄）
  imageFormula: String,      // 圖片顯示公式（來源：F 欄）
  lastReviewDate: String,    // 最後複習日期（來源：G 欄，格式 'YYYY-MM-DD'，空字串代表從未複習）
  mustSpell: Boolean,        // 要會拼標記（來源：A 欄，true=混合模式下強制先顯示中文）
  sheetName: String,         // 來源工作表名稱
  originalRowIndex: Number   // 在來源工作表中的原始列索引（1-based，因為第 1 列為標題）
}
```

### 3.2 Google Sheet 資料格式

每個工作表的欄位配置（**第 1 列為標題列，資料從第 2 列開始**）：

| 欄位 | 第 1 列 | 資料列 (第 2 列起) | 必填 |
|------|------|------|------|
| A 欄 (第 1 欄) | A1 = 有效單字數量（數字） | 要會拼標記（`1`=要會拼，空=不需要；混合模式下強制先顯示中文） | 否 |
| B 欄 (第 2 欄) | `單字` | 英文單字 | 是 |
| C 欄 (第 3 欄) | `翻譯` | 中文翻譯 | 是 |
| D 欄 (第 4 欄) | `不熟程度` | 數字 -1~10（-1=非常熟，空=0，1~10=不熟程度）。讀取時向後相容舊版 `*` 符號格式，寫入時一律使用數字 | 否 |
| E 欄 (第 5 欄) | `圖片URL` | 圖片 URL | 否 |
| F 欄 (第 6 欄) | `圖片` | 圖片顯示公式 | 否 |
| G 欄 (第 7 欄) | `最後複習日期` | 最後複習日期（格式 `YYYY-MM-DD`，空代表從未複習） | 否 |

### 3.3 應用程式設定 (Settings)

#### 3.3.1 一般設定 (`flashcard-settings` in LocalStorage)

```javascript
{
  delayTime: Number,             // 單字卡延遲時間（秒），範圍 1-10，預設 4.5，步進 0.5
  fontSize: Number,              // 字體大小（px），範圍 20-120，預設 96，步進 4
  displayMode: String,           // 顯示模式，'english-first'（預設）/ 'chinese-first' / 'mixed'（隨機混合）
  fontFamily: String,            // 字型代碼，預設 'system-default'
  delaySpeechInNormalMode: Boolean  // 延遲發音模式，預設 false
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
    box: Number,             // Leitner Box 等級 (1-6)
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
  7. 循環結束後重新洗牌並開始新回合
- **延遲時間**: 可設定 1 至 10 秒，步進 0.5 秒，預設 4.5 秒
- **語音等待機制**: 當字母拼讀或中文語音功能啟用時，若延遲時間到期而語音尚未播放完畢，系統會自動等待語音播放完成後才進行切換（最長等待 60 秒）。此機制確保長單字的字母拼讀和後續的完整單字發音都不會被截斷。系統使用 `_speechSequenceActive` 標記追蹤「字母拼讀 → 單字發音」的完整序列，避免字母拼讀結束與單字發音開始之間的短暫空檔被誤判為語音完成。使用者手動操作（點擊「下一個」、「上一個」等）不受此機制影響，會立即切換並取消語音
- **載入失敗容錯**: 當已儲存的工作表被刪除或無法載入時（所有工作表皆載入失敗、逾時、或回傳零筆單字），系統不會顯示錯誤畫面，而是自動開啟單字檔設定對話框，讓使用者重新選擇工作表

#### 4.1.2 顯示模式（三種）
- **描述**: 使用者可選擇閃卡的顯示順序，支援三種模式
- **模式**:
  - **先顯示英文** (`english-first`)：預設模式，先顯示英文，再顯示中文翻譯
  - **先顯示中文** (`chinese-first`)：反向模式，先顯示中文翻譯，再顯示英文單字
  - **隨機混合** (`mixed`)：每張卡片隨機決定先顯示英文或中文，增加學習效率與樂趣
- **行為**: 語音播放順序也相應調整。混合模式下，每次顯示新單字時以 50% 機率隨機決定順序，同一張卡片在完整顯示週期中保持一致
- **要會拼覆寫**: 若單字的 A 欄標記為「要會拼」（`mustSpell: true`），則在混合模式下強制先顯示中文（讓學生回想英文拼寫），不受隨機決定影響
- **要會拼指示器**: 當目前單字為「要會拼」時，進度區域右側顯示「✍️要會拼」標示，不論顯示模式為何皆會出現

#### 4.1.3 單字卡點擊互動
- **描述**: 使用者點擊單字卡區域時觸發特殊行為
- **行為流程**:
  1. 若尚未顯示第二語言 → 立即顯示第二語言 + 圖片
  2. 單字文字變為灰色 (`#666666`) 表示「已看過/準備移除」
  3. 出現「恢復單字」按鈕
  4. 等待延遲時間後，自動將該單字從當前輪次中暫時移除
  5. 若在等待期間使用者點擊「恢復單字」按鈕 → 取消移除，恢復正常播放
- **特殊情況**: 若當前只剩 1 個單字，點擊時卡片閃紅色提示，不執行移除

#### 4.1.4 單字暫時移除與恢復
- **描述**: 使用者可以透過點擊單字卡來暫時移除已熟悉的單字
- **移除**: 被移除的單字存入 `removedWords` 陣列，不再出現在當前輪次
- **恢復**: 開始新回合時，所有已移除的單字會自動恢復

#### 4.1.5 上一個/下一個導覽
- **描述**: 使用者可以手動切換到上一個或下一個單字
- **上一個**: 從導覽歷史堆疊中取出前一個狀態恢復（包含索引和已移除的單字）
- **下一個**: 停止當前計時器，直接跳到下一個單字
- **自動循環**: 到達最後一個單字時自動回到第一個

#### 4.1.6 進度顯示
- **描述**: 在單字卡下方顯示當前進度，格式為「目前序號/總數」
- **範例**: `3/25`

### 4.2 不熟程度（多層級困難標記）功能

#### 4.2.1 多層級不熟程度系統
- **描述**: 每個單字有 -1 到 10 的不熟程度等級，以 D 欄的數字表示（向後相容讀取舊版 `*` 符號）
- **等級意義**:
  - `-1`（✓）= 非常熟/已掌握，顯示綠色。此等級的單字預設不出現在閃卡和測驗中
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
- **特殊情況**: 若單字為 -1（非常熟），按 S 鍵後會設為 0（不再是非常熟）
- **視覺回饋**: 進度區域顯示 `★N`（N 為不熟程度數字），顏色根據等級變化
- **同步到後端**: 透過 `google.script.run.updateWordDifficulty()` 即時寫回 Google Sheet D 欄（數字格式）

#### 4.2.3 減少不熟程度（自動）
- **描述**: 每次單字被暫時移除（點擊單字卡）時，自動減少不熟程度 -1（最低 0，不會降到 -1）
- **即時預覽**: 點擊單字卡標記為待刪除時，不熟程度數字立即在 UI 上顯示減 1 後的值（尚未寫入後端），提升使用者體驗；若使用者取消刪除（按 R 或點擊恢復按鈕），則恢復為原本的數字
- **設計理念**: 使用者覺得已熟悉的單字，移除時自動降低不熟程度，模擬間隔重複學習。只有透過 D 鍵明確操作才能設為 -1（非常熟）

#### 4.2.4 標記為非常熟（D 鍵雙按確認）
- **描述**: 使用者按 D 鍵可將當前單字標記為「非常熟」（-1），需要按兩次確認
- **行為流程**:
  1. 第一次按 D：顯示提示「再按一下 D 設為非常熟（ESC 取消）」
  2. 第二次按 D（3 秒內）：確認標記為 -1，顯示「✓ 已設為非常熟」
  3. 按 ESC 或 3 秒超時：取消操作
- **標記後行為**:
  - 非 -1 篩選模式：單字從當前輪次中移除（因篩選排除 -1），自動跳到下一個
  - -1 篩選模式：顯示「此字已經是非常熟」（若已是 -1）
- **同步到後端**: 即時寫回 Google Sheet

#### 4.2.5 不熟程度篩選
- **描述**: 透過模態框篩選特定不熟程度的單字
- **篩選選項**: 全部 / ✓ 非常熟（已掌握）/ ★1 以上 / ★3 以上 / ★5 以上 / ★7 以上 / ★10（最不熟）
- **預設行為**: 不熟程度為 -1 的單字預設不出現在閃卡和測驗中，只有選擇「非常熟」篩選時才會顯示
- **行為**: 篩選後重新洗牌並從頭開始；若無符合條件的單字，彈出提示並重設篩選
- **疊加**: 可與複習時間篩選、要會拼篩選同時使用，結果取交集

#### 4.2.6 要會拼篩選
- **描述**: 篩選僅顯示標記為「要會拼」的單字
- **操作方式**: 選單按鈕直接切換（無模態框），點擊即啟用/關閉
- **行為**: 啟用後僅顯示 `mustSpell: true` 的單字；關閉則不篩選
- **疊加**: 可與不熟程度篩選、複習時間篩選同時使用，結果取交集

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
- **全選/取消全選**: 標題列提供「全選」/「取消全選」按鈕，可一鍵切換所有工作表的選取狀態；個別勾選/取消時按鈕文字自動更新
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
- **暫停行為**: 記錄剩餘時間，停止計時器，顯示「已暫停」指示器
- **繼續行為**: 根據剩餘時間恢復計時器，隱藏指示器
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
- 若開啟不熟程度篩選: 顯示「⭐ 測驗範圍：★N 以上的不熟單字」或「⭐ 測驗範圍：非常熟的單字」（-1 篩選時）
- 若有暫時移除的單字: 顯示「📗 測驗範圍：剩餘單字（已排除 X 個已移除單字）」
- 預設: 顯示「📗 測驗範圍：所有單字」

### 4.7 匯出功能

#### 4.7.1 匯出單字到新工作表
- **描述**: 將當前的單字匯出到同一 Google Sheet 的新工作表
- **匯出類型**:
  - **剩餘單字**: 匯出當前輪次中尚未被移除的所有單字
  - **不熟單字（★1 以上）**: 只匯出不熟程度 ≥ 1 的單字
- **匯出資料欄位**: 要會拼（A 欄）、單字（B 欄）、翻譯（C 欄）、不熟程度（D 欄，數字格式）、圖片 URL（E 欄）。A1 存放總數
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
- **描述**: 單字以批次方式匯出（每批 50 個），顯示進度條
- **進度顯示**: 進度條 + 百分比 + 已處理/總數

### 4.8 重複單字處理

#### 4.8.1 自動偵測重複單字
- **描述**: 載入多個工作表時，自動偵測英文相同（不分大小寫）的重複單字
- **偵測時機**: 每次載入單字時自動執行

#### 4.8.2 自動處理（記憶體模式）
- **描述**: 初次載入時自動在記憶體中處理重複，不修改 Google Sheet
- **處理規則**:
  - **中文翻譯相同**: 保留第一個工作表的單字，移除其他重複項
  - **中文翻譯不同**: 將所有翻譯合併到第一個工作表的單字中（格式：`1. 翻譯A\n2. 翻譯B`），移除其他重複項
- **通知**: 處理完成後顯示通知，包含處理前後的單字數量

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
- **單字學習**: 啟動時優先顯示上次瀏覽的單字（從 `flashcard-last-word` 讀取）；若無儲存資料則顯示預設的「Ready / 準備好的；有準備的」
- **單字記錄**: 每次切換單字時，自動將當前英文與中文儲存到 `flashcard-last-word`
- **載入進度條**: 真實反映每個工作表的載入進度
  - 初始階段：不確定進度動畫（連接 Google Sheet）
  - 載入階段：確定進度百分比（載入工作表 N/M）
  - 完成階段：處理資料 → 載入完成
- **逐表載入**: 初始載入時對每個選定的工作表分別發起 API 呼叫（並行），每完成一個即更新進度條，提供真實的載入回饋
- **客戶端重複偵測**: 初始載入時，重複單字的偵測與自動處理在客戶端以 ES5 完成，無需額外伺服器呼叫

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
- **預加載**: 當前單字和下一個單字的圖片會提前預加載
- **文字處理**: 有圖片時，文字加上半透明黑色背景以確保可讀性

#### 4.10.4 防止螢幕休眠
- **描述**: 透過多種方式同時嘗試防止裝置螢幕自動關閉（非瀑布模式，所有方法同時啟用）
- **方法（同時嘗試）**:
  1. **Wake Lock API**: 現代瀏覽器原生 API（iOS 16.4+、Android Chrome 等），可能在 Google Apps Script 的 iframe 中失敗
  2. **持續靜音音頻**（iOS Safari 核心方法）: 透過 `AudioContext` 建立靜音 buffer，連接到 `createMediaStreamDestination()`，再透過隱藏的 `<audio>` 元素播放 MediaStream。iOS Safari 偵測到有音頻播放中，即不會讓螢幕進入休眠。不支援 `createMediaStreamDestination` 的舊版瀏覽器（如 iPad 4）回退到持續的超高頻（20kHz）oscillator
  3. **NoSleep Video**: 建立 1x1 像素不可見的迴圈靜音影片持續播放（舊版 iOS 及 Android 備用）
  4. **Keep-Alive**: 每 30 秒播放極短高頻無聲音頻 + 微小 DOM 操作（最後備用）
- **iOS 用戶手勢啟用**: iOS 瀏覽器必須在用戶互動（user gesture）中才能建立 AudioContext 和播放音頻/視頻。系統在**每次** `touchstart`/`touchend`/`click` 事件時都會檢查並嘗試啟動或恢復持續靜音音頻（不移除監聽器，因為 iOS 可能隨時暫停 AudioContext）
- **定期監控（Watchdog）**: 每 10 秒檢查 AudioContext 狀態和 `<audio>` 元素是否仍在播放，若被暫停則自動嘗試恢復
- **頁面可見性恢復**: 監聽 `visibilitychange` 事件，頁面重新可見時自動恢復 AudioContext、重新取得 Wake Lock、恢復 NoSleep 視頻

#### 4.10.5 響應式設計
- **描述**: 支援手機和平板裝置的不同螢幕尺寸
- **觸控優化**: 按鈕尺寸適合觸控操作
- **防止縮放**: 設定 `user-scalable=no`、`maximum-scale=1.0`

#### 4.10.6 模態框系統
- **描述**: 所有設定和功能介面使用模態框呈現
- **共通行為**:
  - 點擊背景（模態框外部）可關閉
  - 有關閉按鈕 (×)、取消按鈕、確認按鈕
  - 開啟模態框時暫停閃卡播放，關閉時恢復

### 4.11 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| 空白鍵 / Enter | 暫停/繼續，或在已暫停時跳到下一個 |
| 右方向鍵 | 下一個單字 |
| 左方向鍵 | 上一個單字 |
| `M` 鍵 | 切換靜音/取消靜音 |
| `F` 鍵 | 切換全螢幕 |
| `S` 鍵 / F5 | 增加不熟程度 +1（-1 → 0, 0 → 1, ..., 9 → 10） |
| `D` 鍵 | 標記為非常熟（-1），需按兩次確認（3 秒內） |
| `R` 鍵 | 恢復單字（取消移除） |
| `E` 鍵 | 開啟編輯當前單字模態框（**暫停時也可使用**） |
| Escape | 關閉選單或結束全螢幕，取消 D 鍵待確認狀態 |

> **注意**: 模態框開啟時，鍵盤快捷鍵不生效（避免干擾輸入）。暫停時僅 B 鍵（暫停/繼續）和 E 鍵（編輯單字）可使用，其他快捷鍵不生效

### 4.12 複習時間篩選

#### 4.12.1 功能描述
- **描述**: 讓使用者篩選一段時間以上未複習的單字，方便針對性複習
- **資料儲存**: 複習日期存於 Google Sheet G 欄（第 7 欄），格式為 `YYYY-MM-DD`
- **複習定義**: 當單字的第二語言（中文翻譯）已顯示時，視為「已複習」
- **觸發時機**:
  - 自動輪播時第二語言顯示（`showSecondPartAndScheduleNext` 執行）
  - 使用者點擊單字卡顯示第二語言（`onWordClick` 中 `showingChinese = true`）

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
  - **篩選**
    1. ⭐ 不熟程度篩選
    2. 📅 複習時間篩選
    3. ✍️ 要會拼篩選
  - **學習**
    4. 📆 今日複習（SRS 間隔重複系統，顯示待複習徽章）
    5. 🎯 快速測驗 (10 題)
    6. 📝 完整測驗
  - **工具**
    6. ✏️ 編輯當前單字
    7. 📤 匯出單字
    8. 🔄 重新載入單字
  - **設定**
    9. 📋 單字檔設定
    10. 🔊 語音設定
    11. ⚙️ 一般設定
    12. 📺 全螢幕
- **分隔線**: 各分類之間以細線分隔，分類標題以灰色小字顯示
- **行為**:
  - 點擊選單外部自動關閉
  - 開啟選單時自動暫停閃卡輪播，關閉後自動恢復（若原本已暫停則維持暫停）
  - 關閉選單時同時隱藏整個工具列（上一個、下一個、語音切換、暫停、選單按鈕），使用者需重新將滑鼠移入工具列區域（桌面）或觸碰工具列區域（觸控裝置）才能再次顯示
  - 螢幕高度不足時出現捲軸（`max-height: 70vh`），開啟時自動捲到底部（靠近按鈕的項目優先顯示）

#### 4.13.2 篩選指示器
- **描述**: 當有任何篩選條件啟用時，在主畫面進度區域上方顯示篩選狀態
- **格式**: `篩選: ⭐ ★5+ | 📅 >2週 | ✍️ 要會拼 | 📆 今日複習 (42個)` 或 `篩選: ⭐ 非常熟 (10個)`（-1 篩選時）
- **清除按鈕**: 提供「✕ 清除」按鈕一鍵清除所有篩選（包括結束 SRS 複習模式）

### 4.14 即時編輯單字

#### 4.14.1 功能描述
- **描述**: 在閃卡執行中直接編輯當前顯示的單字，無需切換到 Google Sheets
- **觸發方式**: 選單「✏️ 編輯當前單字」或鍵盤快捷鍵 `E`
- **自動暫停**: 開啟時自動暫停閃卡輪播並顯示「已暫停」指示器，關閉後自動恢復（若編輯前已暫停則維持暫停）

#### 4.14.2 可編輯欄位
| 欄位 | 對應 Google Sheet 欄位 | 說明 |
|------|------------------------|------|
| 單字 | B 欄 | 英文單字（文字輸入框） |
| 翻譯 | C 欄 | 中文翻譯（文字輸入框） |
| 不熟程度 | D 欄 | -1~10 滑桿，-1 顯示「非常熟 ✓」（綠色），0~10 顯示 ★N 及顏色變化 |
| 要會拼 | A 欄 | 開關，開啟後混合模式下強制先顯示中文 |
| 圖片 URL | E 欄 | 圖片網址（文字輸入框，可留空），附即時圖片預覽 |

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
- **Box 等級 (1-6)** 對應複習間隔：
  - Box 1: 1 天
  - Box 2: 3 天
  - Box 3: 7 天
  - Box 4: 14 天
  - Box 5: 30 天
  - Box 6: 60 天

#### 4.15.2 Box 轉換規則
- **複習時觸發**（基於單字的 `difficultyLevel`）：
  - difficulty ≤ 2 或 -1（熟悉）：Box 上升一級（最高 6）
  - difficulty 3-5（普通）：Box 不變
  - difficulty ≥ 6（不熟）：Box 降回 1
- **初始 Box**（首次進入 SRS 的單字）：
  - difficulty -1（非常熟）：Box 5
  - difficulty 0（無標記）：Box 3
  - difficulty 1-3（略不熟）：Box 2
  - difficulty ≥ 4（很不熟）：Box 1
- **下次複習日期** = 當天日期 + Box 對應間隔天數
- **到期判定**: 今天 ≥ nextReview 或無 SRS 資料的單字視為需要複習

#### 4.15.3 資料儲存
- **localStorage key**: `flashcard-srs`
- **結構**: 以 `sheetName:rowIndex` 為鍵值的物件（詳見 3.3.6）
- **特性**: 裝置本地儲存，不佔用 Google Sheets 欄位

#### 4.15.4 SRS 更新觸發時機
- 單字被標記為已複習時（`markWordAsReviewed`）
- 增加不熟程度時（`increaseDifficulty`）
- 減少不熟程度時（`decreaseDifficulty`）
- 標記為非常熟時（`confirmMarkVeryFamiliar`）

#### 4.15.5 今日複習 UI
- **選單入口**: 「📆 今日複習」按鈕，位於選單「學習」分類中
- **待複習徽章**: 按鈕右側顯示紅色圓形徽章，顯示待複習單字數量（超過 99 顯示「99+」）
- **模態框內容**:
  - 顯示「今天有 N 個單字需要複習」
  - 數量選擇：10、20、30、50、100 或「全部 (N)」的按鈕選項
  - 僅顯示不超過待複習數量的選項
  - 若無待複習單字，顯示「今天沒有需要複習的單字！🎉」
- **複習流程**: 選擇數量後點擊「開始複習」，系統隨機打亂待複習單字並取指定數量，使用一般閃卡模式進行複習

#### 4.15.6 SRS 複習模式
- **啟用**: 從今日複習模態框開始複習時啟用
- **篩選指示器**: 顯示「📆 今日複習」標籤
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
| `updateWordDifficulty(sheetId, sheetName, rowIndex, difficultyLevel)` | Sheet ID, 工作表名稱, 列索引, 不熟程度 (-1~10) | `Boolean` | 更新不熟程度（寫入 D 欄，以數字格式寫入，0 寫空字串） |
| `markWordAsDifficult(sheetId, sheetName, rowIndex, isDifficult)` | Sheet ID, 工作表名稱, 列索引, 是否困難 | `Boolean` | 向後兼容函式，轉接到 `updateWordDifficulty` |
| `batchUpdateReviewDates(sheetId, updates)` | Sheet ID, 更新陣列 `[{sheetName, rowIndex, date}]` | `Object` | 批次更新複習日期（寫入 G 欄） |
| `exportWordsToSheet(words, sheetName, targetSheetId, overwrite, isFirstBatch)` | 單字陣列, 工作表名稱, Sheet ID, 是否覆寫, 是否首批 | `Object` | 匯出單字到新工作表 |

### 5.5 重複單字處理

| 函式 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `detectDuplicateWords(allWords)` | 全部單字陣列 | `Array<DuplicateGroup>` | 偵測重複單字（英文不分大小寫） |
| `handleDuplicateWordKeepOne(sheetId, keepWord, deleteWords)` | Sheet ID, 保留單字, 刪除單字陣列 | `Object` | 保留一個，刪除其他（修改 Sheet） |
| `handleDuplicateWordMerge(sheetId, targetWord, mergeWords)` | Sheet ID, 目標單字, 合併來源陣列 | `Object` | 合併定義（修改 Sheet） |
| `autoHandleSkippedDuplicatesInMemory(allWords, duplicates)` | 全部單字, 重複組 | `Object` | 在記憶體中自動處理重複（不修改 Sheet） |
| `autoHandleSkippedDuplicates(sheetId, duplicates)` | Sheet ID, 重複組 | `Object` | 自動處理重複（修改 Sheet） |

### 5.6 工具函式

| 函式 | 說明 |
|------|------|
| `validateAndCleanSheetId(sheetId)` | 驗證和清理 Sheet ID |
| `openSpreadsheetSafely(sheetId)` | 安全地開啟 Google Spreadsheet（含錯誤處理） |
| `countValidWords(sheet)` | 讀取工作表 A1 格的值作為有效單字數 |
| `createWordObject(rowData, id, sheetName, rowIndex)` | 從列資料建立單字物件 |
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
| `progress-text` | span | 進度文字 |
| `difficulty-display` | span | 不熟程度顯示區（★ + 數字） |
| `difficulty-level` | span | 不熟程度數字 |
| `must-spell-indicator` | span | 要會拼指示器（✍️要會拼），有標記時顯示 |
| `must-spell-filter-btn` | button | 選單內要會拼篩選切換按鈕 |
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
| `srs-review-modal` | SRS 今日複習 |

### 6.4 SRS 相關元素

| 元素 ID | 類型 | 說明 |
|---------|------|------|
| `srs-review-btn` | button | 選單內「今日複習」按鈕 |
| `srs-due-badge` | span | 待複習數量徽章（紅色圓形） |
| `srs-due-count` | p | 模態框內待複習數量文字 |
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
3. FlashcardApp.init() 執行：
   ├── 3a. loadSettings()        → 從 LocalStorage 載入一般設定和語音設定
   ├── 3b. loadSheetSettings()   → 從 LocalStorage 載入試算表設定
   ├── 3c. detectLegacyBrowser() → 偵測是否為舊版瀏覽器
   ├── 3d. setupEventListeners() → 設定所有事件監聽器
   │   ├── setupCoreListeners()
   │   ├── setupMenuListeners()
   │   ├── setupModalListeners()
   │   ├── setupKeyboardListeners()
   │   ├── setupProgressAndExportListeners()
   │   └── setupQuizListeners()
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

- 圖片使用預加載（當前 + 下一張）
- 批次匯出以避免一次性處理大量資料
- 語音播放使用佇列管理，避免重疊
- 計時器統一管理，避免記憶體洩漏

---

## 10. 預設配置值一覽

| 配置項 | 預設值 |
|--------|--------|
| 延遲時間 | 4.5 秒 |
| 字體大小 | 96px |
| 字型 | 系統預設 |
| 顯示模式 | 先顯示英文 (`english-first`) |
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
| 批次匯出數量 | 每批 50 個 |
| 防螢幕休眠 Keep-Alive 間隔 | 30 秒 |
| 複習日期同步閾值 | 每 20 個已複習單字 |
| 複習時間篩選預設 | 全部（不篩選） |
| 不熟程度篩選預設 | 0（全部，不篩選；-1 的單字預設被排除） |
| 要會拼篩選預設 | false（不篩選） |

---

## 11. 待移植/重建清單

以下是在新平台重建此應用程式時需要實作的所有模組：

- [ ] **後端資料層**: Google Sheets 讀取/寫入（或替代資料來源）
- [ ] **單字載入與洗牌**: Fisher-Yates 隨機洗牌演算法
- [ ] **閃卡輪播引擎**: 自動計時、雙階段顯示（第一語言→第二語言）
- [ ] **點擊互動與暫時移除**: 點擊標灰→延遲移除→恢復機制
- [ ] **導覽系統**: 上一個/下一個，含導覽歷史堆疊
- [ ] **多層級不熟程度系統**: -1~10 級不熟程度（-1=非常熟）、★ 星號/✓ 顯示、篩選模態框（含非常熟類別）、S 鍵增加/移除減少/D 鍵標記非常熟（雙按確認）、數字格式同步到後端
- [ ] **語音系統**: 英文/日文/中文朗讀、字母拼讀、延遲發音
- [ ] **設定系統**: 一般設定、語音設定、試算表設定，LocalStorage 持久化
- [ ] **測驗系統**: 題目生成、四選一、計分、錯題回顧
- [ ] **匯出系統**: 批次匯出、覆寫保護、進度顯示
- [ ] **即時編輯單字**: 編輯模態框、前後端同步更新、工作表名稱顯示
- [ ] **重複單字偵測與處理**: 自動/手動、記憶體/Sheet 兩種模式
- [ ] **UI 系統**: 深色主題、模態框、選單、響應式設計
- [ ] **圖片系統**: 背景圖片顯示、預加載
- [ ] **防螢幕休眠**: Wake Lock / NoSleep Video / Keep-Alive
- [ ] **全螢幕支援**: 多瀏覽器相容的全螢幕 API
- [ ] **鍵盤快捷鍵**: 空白鍵、方向鍵、M/F/S/D/R/E/Escape
- [ ] **複習時間篩選系統**: G 欄日期追蹤、批次同步、篩選模態框、多條件疊加
- [ ] **舊版瀏覽器相容**: ES5 polyfills、語音啟用流程、CSS fallback
