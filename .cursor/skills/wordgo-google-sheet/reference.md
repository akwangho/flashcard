# WordGo Google Sheet — 參考片段

## 1. 讀取現況（公開 CSV）

```bash
python3 - <<'PY'
import urllib.request, csv, io
url = 'https://docs.google.com/spreadsheets/d/1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM/export?format=csv&gid=<GID>'
rows = list(csv.reader(io.StringIO(urllib.request.urlopen(url, timeout=60).read().decode('utf-8-sig'))))
print('A1 =', rows[0][0], 'rows =', len(rows))
for i, r in enumerate(rows[:20], 1):
    print(i, r[:8])
PY
```

## 2. 取得工作表名稱與 gid

```python
import urllib.request, re
html = urllib.request.urlopen(
    urllib.request.Request(
        'https://docs.google.com/spreadsheets/d/1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM/edit',
        headers={'User-Agent': 'Mozilla/5.0'}), timeout=60
).read().decode('utf-8', 'replace')
pattern = re.compile(r'\[(\d+),0,\\"(\d+)\\",\[\{\\"1\\":\[\[0,0,\\"([^"\\]+)\\"')
for index, gid, name in pattern.findall(html):
    print(index, gid, name)
```

## 3. 暫時 Apps Script 函式範本

```javascript
// sheetMaintenance.gs（用完即刪）
function applyWordChanges() {
  var SPREADSHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
  var SHEET_NAME = '備選';
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    // 讀取：getValues 可能包含 CellImage，務必淨化
    var values = sheet.getRange(2, 1, 10, 9).getValues();
    // 寫入：只寫一般 number/string/boolean/Date
    sheet.getRange(2, 1, 1, 9).setValues([['', 'word', '翻譯', 10, 'https://example.com/a.jpg', '', '', '', '']]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, stack: error.stack };
  }
}
```

## 4. 在 code.gs 的 doGet 加暫時 action

```javascript
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;

    // 暫時維護動作（完成後務必移除）
    if (action === 'apply-word-changes') {
      var result = applyWordChanges();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'kk') { /* 原有 KK 查詢，保留 */ }
  } catch (error) { /* ... */ }
  return HtmlService.createTemplateFromFile('index').evaluate();
}
```

## 5. 部署、執行、清理

```bash
# 1) 推送（manifest 一定要 --force）
npx clasp push --force

# 2) 建立暫時 Web App deployment，記下 deploymentId
npx clasp create-deployment -d "temporary sheet maintenance" --json

# 3) 觸發（deployment access 需為 ANYONE_ANONYMOUS / ANYONE）
curl -L --retry 5 --retry-all-errors --max-time 300 -sS \
  "https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?action=apply-word-changes"

# 4) 完成後：還原 code.gs、刪除暫時 .gs、再 push --force
npx clasp push --force
```

刪除暫時 deployment（保留正式的那一個）：

```python
import json, os, urllib.request, urllib.parse
cfg = json.load(open(os.path.expanduser('~/.clasprc.json')))['tokens']['default']
form = urllib.parse.urlencode({
    'client_id': cfg['client_id'],
    'client_secret': cfg['client_secret'],
    'refresh_token': cfg['refresh_token'],
    'grant_type': 'refresh_token',
}).encode()
token = json.load(urllib.request.urlopen(
    urllib.request.Request('https://oauth2.googleapis.com/token', data=form), timeout=30))['access_token']
headers = {'Authorization': 'Bearer ' + token}
script_id = '1fzOIECLAwVA8dySx5VJ0w530BI0W__PpzwMUlwWLfTGmgDZ2YdangmGJ'
keep = 'AKfycbyAgDBbnMNmQLbmy9qKSTw0pPAMZamC3MDlV4u82K0'  # 正式 deployment
deployments = json.load(urllib.request.urlopen(
    urllib.request.Request(f'https://script.googleapis.com/v1/projects/{script_id}/deployments', headers=headers),
    timeout=60)).get('deployments', [])
for d in deployments:
    did = d['deploymentId']
    if did == keep:
        continue
    urllib.request.urlopen(urllib.request.Request(
        f'https://script.googleapis.com/v1/projects/{script_id}/deployments/{did}',
        headers=headers, method='DELETE'), timeout=60)
```

## 6. CellImage 淨化與新工作表重建

```javascript
function rebuildSheetSafely() {
  var ss = SpreadsheetApp.openById('1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM');
  var old = ss.getSheetByName('備選');
  var all = old.getRange(1, 1, old.getLastRow(), 9).getValues();

  var newData = [];
  var blank = ['', '', '', '', '', '', '', '', ''];

  function pushRow(row) {
    var clean = [];
    for (var c = 0; c < 9; c++) {
      var v = row[c];
      if (Object.prototype.toString.call(v) === '[object Object]') {
        clean.push('');  // CellImage 不能直接寫入 setValues
      } else {
        clean.push(v === undefined || v === null ? '' : v);
      }
    }
    newData.push(clean);
  }

  for (var i = 0; i < all.length; i++) pushRow(all[i]);

  var ns = ss.insertSheet('備選_repair');
  ns.getRange(1, 1, newData.length, 9).setValues(newData);

  var count = 0;
  for (var r = 1; r < newData.length; r++) {
    if (newData[r][1] && newData[r][1].toString().trim() !== '') count++;
  }
  ns.getRange(1, 1).setValue(count);

  ss.deleteSheet(old);
  ns.setName('備選');  // gid 會改變
  return { success: true, wordCount: count };
}
```

## 7. 圖片：只使用網路上現成圖片（不要上傳 Google Drive）

- 使用者要求：圖片使用網路上現成、接近的圖片 URL；**不要上傳到 Google Drive**，也不要使用 Drive 連結。
- Wikimedia Commons：
  `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=<QUERY>&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=960&format=json`
- Openverse：
  `https://api.openverse.org/v1/images/?q=<QUERY>&page_size=10`
- Twemoji（表情符號，例如嘆氣）：
  `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/<CODEPOINT>.png`
- 選圖流程：
  1. 用關鍵字搜尋多個候選。
  2. 下載縮圖、產生 contact sheet 目視確認語意接近。
  3. 驗證最終 URL 直接回傳 HTTP 200 且 `Content-Type` 為 `image/*`。
  4. 只把驗證過的 URL 寫入 E 欄。
- 不要用圖庫搜尋結果頁、需要登入的連結，或已知會 403 的熱鏈直連。

## 8. 完成後檢查清單

- [ ] A1 等於 B 欄非空白列數
- [ ] 每組句子都有上方與下方空白 row
- [ ] 所有新資料 D 欄為 `10`
- [ ] 每句都有對應 E 欄圖片 URL，且 URL 可讀取
- [ ] 沒有使用 Google Drive 圖片連結
- [ ] 沒有殘留 `*_repair`、`zz_*` 工作表
- [ ] `git status` 乾淨（暫時 `.gs` 與 `code.gs` 已還原）
- [ ] 只剩正式 deployment
- [ ] 公開 CSV 驗證通過
