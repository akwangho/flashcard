---
name: wordgo-google-sheet
description: Safely modify the WordGo Data Sheet (Google Sheet ID 1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM) used by the English vocabulary flashcard app. Covers the 備選 worksheet layout, temporary Apps Script web-app REST actions, CellImage write failures, safe row rebuilding, and verification. Images must come from existing public web URLs (for example Wikimedia Commons or Openverse); never upload images to Google Drive. Use when adding, editing, grouping, or repairing words, sentences, images, or worksheets in WordGo Data Sheet.
---

# WordGo Google Sheet 修改技巧

## 適用範圍

- 目標試算表：`WordGo Data Sheet`
- Spreadsheet ID：`1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM`
- 常用工作表：`備選`、`文法句型轉換`、`非常熟`
- 前端 App 以「工作表名稱」載入，不以 gid 載入；gid 變更不影響 App。

## 欄位格式（A–I）

| 欄 | 名稱 | 說明 |
|---|---|---|
| A | 要會拼 | `-1` 看懂就好；`0.5` 隨機要會拼；`1` 衝刺要會拼；空 = 不需 |
| B | 單字 | 英文單字、片語或句子 |
| C | 翻譯 | 中文翻譯 |
| D | 不熟程度 | 數字 `-999`～`10`；`100` = 強制複習；空 = 0 |
| E | 圖片URL | App 實際顯示的圖片來源 |
| F | 圖片 | 試算表「儲存格內圖片」；App 不用它顯示 |
| G | 最後複習時間 | `YYYY-MM-DD` |
| H | 標籤 | 半形或全形逗號分隔 |
| I | KK音標 | 由 App 寫入 |

- A1 = 有效單字數，等於 B 欄非空白的資料列數。
- `備選` 的排版慣例：一組內容（2～3 個單字 + 1 句句子）上方與下方各留空白 row；組與組之間用一個空白 row。

## 圖片政策

- 圖片一律使用網路上現成、可公開讀取的 URL，優先 Wikimedia Commons、Openverse 等來源。
- **不要把圖片上傳到 Google Drive**，也不要用 `drive.google.com/uc?export=view` 當圖片來源。
- 造句需要對應圖片時，找網路上接近的現成圖片即可；不要自製圖片後上傳。
- 選圖後務必驗證 URL 直接回傳 `image/*`，且不是搜尋結果頁或需要登入的連結。

## 安全流程

1. **先備份**
   - 先讀取目前資料：`https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<GID>`
   - 大範圍修改前，優先用 Apps Script 複製一份備份工作表，或至少把 CSV 內容存下來。
2. **用公開 CSV 讀取現況**
   - 公開 CSV 可讀取，不需 OAuth。
   - gid 可由試算表 HTML 的 sheet metadata 解析；重建工作表後 gid 會改變。
3. **需要寫入時，用「暫時 Apps Script Web App REST 動作」**
   - 本機 `~/.clasprc.json` 的 OAuth token 沒有 `spreadsheets` scope，且 Sheets API 在該 OAuth client project 未啟用 → 直接呼叫 Sheets API 會 403。
   - `clasp run` 需要 API executable deployment；本專案沒有，會回 `NOT_FOUND`。
   - 可行做法：加一個暫時 `.gs` 函式 + 在 `doGet` 加一個 action 分支，部署成暫時 Web App，再以 `exec?action=...` 觸發。
4. **用新工作表重建，避免在中間插入列**
   - 建立 `xxx_repair` 新工作表 → 寫入完整內容 → 刪除舊工作表 → 將新工作表改名。
   - 優點：不需 `insertRowsAfter`，也避免 `moveTo` 重疊範圍造成資料遺失。
   - 缺點：gid 會變；舊 gid 連結失效，但 App 不受影響。
5. **寫入前一定要淨化 CellImage**
   - `getValues()` 對 F 欄的「儲存格內圖片」會回傳 `CellImage` 物件。
   - 把 `CellImage` 直接放進 `setValues()` 會噴泛用錯誤：`服務錯誤：試算表`，而且**整個寫入失敗**。
   - 處理方式：把 `Object.prototype.toString.call(v) === '[object Object]'` 的值換成 `''`，再嘗試用 `range.setValue(cellImage)` 逐格補回（跨工作表補回常失敗，需接受 F 欄可能空白）。
6. **驗證**
   - 再用公開 CSV 比對：A1、B 欄非空白數、前幾列內容、每組句子與空白 row。
   - 確認沒有殘留 `*_repair`、`zz_*` 暫存工作表。
7. **清理**
   - 還原 `code.gs` 的 `doGet`。
   - 刪除暫時 `.gs`。
   - `npx clasp push --force`。
   - 刪除所有暫時 deployment，只留正式 Web App deployment。

## 踩雷清單

1. **`服務錯誤：試算表` ≠ 權限或試算表壞掉**
   - 最常見原因是 `setValues()` 的 2D array 內含 `CellImage` 物件。
   - 先用單列寫入測試（只寫一般字串）確認寫入正常，再逐列找出問題列。
2. **`insertRowsAfter` 在資料中間插入可能失敗**
   - 即使寫入權限正常，也可能噴 `服務錯誤：試算表`。
   - 不要硬試；改用「新工作表重建」。
3. **`moveTo` 重疊範圍會造成資料遺失**
   - 不要用 `moveTo` 把整塊資料往下平移；來源與目的重疊時可能刪掉列。
   - 若必須平移，先移到試算表底部空白區，再移到目標區，且來源／目的不可重疊。
4. **`clasp push` 可能顯示 `Skipping push`**
   - 尤其 manifest 變更可能沒推上去；請用 `npx clasp push --force`。
5. **`appsscript.json` 的 `executionApi`**
   - 在此專案 push 會回 `Invalid manifest: unknown fields: [executionApi.executeAs]`。
   - 不要靠 API executable；用暫時 Web App deployment。
6. **`clasp deploy -i <現有ID>` 可能回 `Read-only deployments may not be modified.`**
   - 不要改正式 deployment；改用 `clasp create-deployment` 建暫時 deployment，用完刪除。
7. **gid 會變**
   - 重建工作表後舊 `gid` 的 CSV/連結會 400；用 HTML metadata 重新取得 gid。
8. **A1 計數要同步**
   - 寫入後把 A1 設為 B 欄非空白列數（不含表頭）。
9. **圖片不要上傳 Google Drive**
   - 使用者已明確要求：圖片使用網路上現成、接近的圖片 URL；不要上傳到 Google Drive，也不要用 Drive 圖片連結。
   - 選圖後用 `HEAD` 或 `GET` 確認直接回傳 `image/*`；避免熱鏈 403 的圖庫直連。
10. **不要用本機 OAuth token 直接寫 Sheets API**
    - `~/.clasprc.json` token 的 scope 不含 `spreadsheets`，且 OAuth client project 未啟用 Sheets API。
    - 要寫入請走 Apps Script Web App。

## 詳細範例

- 暫時 Apps Script 函式與 `doGet` action 範例、部署／刪除指令、CellImage 淨化程式碼：見 [reference.md](reference.md)。
