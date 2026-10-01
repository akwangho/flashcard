#!/usr/bin/env node
/**
 * WordGo.apk 內建字典（res/raw/words.sqlite）→ 本專案 KK 音標格式轉換工具。
 *
 * 為什麼需要轉換：WordGo 為了讓使用者用一般英文字母鍵盤輸入音標，
 * 字庫裡存的是「自訂代碼」（例：apple → 1BbEkEs），顯示時靠內附的
 * KKPhonetic.ttf 字型把每個字元畫成音標符號。本專案的「KK音標字庫」
 * 工作表存的是可直接閱讀的 KK 符號（例：ˋæpḷ），兩者格式不同，必須轉換。
 *
 * 代碼對照（由 assets/font/KKPhonetic.ttf 的字形 + 字庫內容交叉比對確認）：
 *   1 → ˋ（KK 主重音符）      0 → ˏ（次重音符）
 *   2 → ɚ   3 → ɝ
 *   6 → ð   7 → ŋ   8 → θ
 *   A → ɑ   B → æ   C → ɔ   E → ə   W → ɛ   I → ɪ   V → ʌ   U → ʊ
 *   e → e（KK 的 e 音，對應 IPA eɪ）   o → o（對應 IPA oʊ）
 *   L → ḷ（音節性 l）  M → m  N → n
 *   S → ʃ（與 t 相鄰時為 tʃ）  G → ʒ（與 d 相鄰時為 dʒ）
 *   其餘為與 KK 相同的子音/母音字母（a b d f g h i j k l n p r s t u v w z …）
 *
 * 用法：
 *   node scripts/wordgo-kk-build-data.mjs --apk ~/Downloads/WordGo.apk \
 *     [--out data/wordgo-kk.txt] [--blob data/wordgo-kk.b64] [--refine]
 *
 * 參數：
 *   --apk      APK 路徑（會解出 res/raw/words.sqlite）；也可用 --sqlite 直接指定
 *   --out      輸出 TSV（單字<TAB>KK音標）
 *   --blob     輸出 gzip+base64 文字（貼進臨時的 GAS 檔用）
 *   --refine   額外用 data/kk-phonetics.json 修正 i/ɪ、o/ɔ 混淆（預設不做，
 *              保持 100% 忠實於 WordGo 原始資料）
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------- 參數
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
}

const APK = arg('apk', null);
const SQLITE = arg('sqlite', null);
const OUT = arg('out', null);
const BLOB = arg('blob', null);
const REFINE = argv.indexOf('--refine') !== -1;

if (!APK && !SQLITE) {
  console.error('請用 --apk <WordGo.apk> 或 --sqlite <words.sqlite>');
  process.exit(1);
}

// ---------------------------------------------------------------- 取出 sqlite
function extractSqlite(apkPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wordgo-'));
  const db = path.join(tmpDir, 'words.sqlite');
  execFileSync('unzip', ['-p', apkPath, 'res/raw/words.sqlite'], { maxBuffer: 1 << 30 });
  fs.writeFileSync(db, execFileSync('unzip', ['-p', apkPath, 'res/raw/words.sqlite'], { maxBuffer: 1 << 30 }));
  return db;
}

const dbPath = SQLITE ? String(SQLITE) : extractSqlite(String(APK));

// ---------------------------------------------------------------- 轉換規則
/** WordGo 代碼 → 本專案 KK 音標 */
const CODE_MAP = {
  '1': 'ˋ', '0': 'ˏ',
  '2': 'ɚ', '3': 'ɝ',
  '6': 'ð', '7': 'ŋ', '8': 'θ',
  'A': 'ɑ', 'B': 'æ', 'C': 'ɔ', 'E': 'ə', 'W': 'ɛ',
  'I': 'ɪ', 'V': 'ʌ', 'U': 'ʊ',
  'L': 'ḷ', 'M': 'm', 'N': 'n',
  'S': 'ʃ', 'G': 'ʒ',
};
/** 與 KK 相同、直接沿用的字元 */
const SAME = new Set('abdefghijklmnoprstuvwxyz'.split(''));
/** 不认识的字元 → 視為資料髒污，整筆略過 */
function convertKk(kk) {
  let out = '';
  for (const ch of kk) {
    const m = CODE_MAP[ch];
    if (m) { out += m; continue; }
    if (SAME.has(ch)) { out += ch; continue; }
    return null;
  }
  // 複合音/音節性 l：與 code.gs ipaToKK 的 MULTI_STEPS 對齊
  out = out.replace(/tʃ/g, 'tʃ').replace(/dʒ/g, 'dʒ').replace(/əl/g, 'ḷ');
  return out;
}

// ---------------------------------------------------------------- 讀字庫
const db = new DatabaseSync(dbPath, { readOnly: true });
const rows = db.prepare("SELECT word, kk FROM word WHERE kk IS NOT NULL AND kk <> ''").all();

/** 小寫單字 → KK 音標（同字多次出現時以第一筆為準） */
const wordgo = new Map();
let skippedJunk = 0, skippedPhrase = 0;
for (const r of rows) {
  const key = String(r.word || '').trim().toLowerCase();
  if (!key) continue;
  if (key.includes(' ') || key.includes('\t')) { skippedPhrase++; continue; }  // 片語/長片語，字庫用不到
  const kk = convertKk(String(r.kk));
  if (kk === null) { skippedJunk++; continue; }
  if (!wordgo.has(key)) wordgo.set(key, kk);
}
db.close();

// ---------------------------------------------------------------- i/ɪ、o/ɔ 修正
// WordGo 的鍵盤只有一個按鍵分別代表 ɪ/i 與 ɔ/oʊ，字庫實際上會混用
// （例：academy 尾音寫成 ɪ、four 的 ɔ 寫成 o）。data/kk-phonetics.json 來自
// open-dict-data/ipa-dict（CMU 音標），能可靠區分這兩組音，故以此作為判據：
// 只有在兩邊「除了這些位置以外完全一致」時，才採用參考音標的 ɪ/i、o/ɔ 寫法，
// 其他差異（重音位置、ʌ/ə、e/ɛ…）一律以 WordGo 為準。
const PAIRS = { 'ɪi': 1, 'iɪ': 1, 'oɔ': 1, 'ɔo': 1 };
let refinedI = 0, refinedO = 0, refineWords = 0, refineConflict = 0;
if (REFINE) {
  const refPath = path.join(ROOT, 'data', 'kk-phonetics.json');
  if (fs.existsSync(refPath)) {
    const ref = JSON.parse(fs.readFileSync(refPath, 'utf8')).phonetics || {};
    for (const [word, kk] of wordgo) {
      const cands = ref[word];
      if (!cands || !cands.length) continue;
      const wgBare = kk.replace(/[ˋˏ ]/g, '');
      if (!/[ɪioɔ]/.test(wgBare)) continue;
      const resolutions = [];
      for (const c of cands) {
        const refBare = String(c).replace(/[ˋˏ ]/g, '');
        if (refBare.length !== wgBare.length) continue;
        let ok = true;
        const chars = [...wgBare];
        const refChars = [...refBare];
        let changed = 0, touchedI = false, touchedO = false;
        for (let i = 0; i < refBare.length; i++) {
          const a = chars[i], b = refChars[i];
          if (a === b) continue;
          if (PAIRS[a + b]) {
            chars[i] = b;
            changed++;
            if (a === 'ɪ' || a === 'i') touchedI = true; else touchedO = true;
            continue;
          }
          ok = false;
          break;
        }
        if (ok && (touchedI || touchedO)) resolutions.push({ text: chars.join(''), changed });
      }
      if (!resolutions.length) continue;
      // 採用「改動最少」的解（多筆參考音標時取最保守的那個）
      const minChanged = Math.min(...resolutions.map((r) => r.changed));
      const unique = [...new Set(resolutions.filter((r) => r.changed === minChanged).map((r) => r.text))];
      if (unique.length !== 1) { refineConflict++; continue; }
      const next = unique[0];
      // 套回重音符號（以 WordGo 的重音位置為準）
      let idx = 0, out = '';
      for (const ch of kk) {
        if (ch === 'ˋ' || ch === 'ˏ' || ch === ' ') { out += ch; continue; }
        out += next[idx++];
      }
      if (out !== kk) {
        if (out.includes('i') && !kk.includes('i')) refinedI++;
        if (out.includes('ɔ') && !kk.includes('ɔ')) refinedO++;
        refineWords++;
        wordgo.set(word, out);
      }
    }
  } else {
    console.warn('找不到 data/kk-phonetics.json，略過 i/ɪ、o/ɔ 修正');
  }
}

// ---------------------------------------------------------------- 輸出
const sorted = [...wordgo.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
const tsv = sorted.map(([w, kk]) => w + '\t' + kk).join('\n') + '\n';

console.log('WordGo 資料庫：', dbPath);
console.log('  單字筆數（原始）：', rows.length);
console.log('  有效單字：', wordgo.size, '（略過片語', skippedPhrase, '、略過無法解析', skippedJunk, '）');
console.log('  i/ɪ、o/ɔ 修正：', refineWords, '筆（其中 ɪ→i', refinedI, '、o→ɔ', refinedO, '；放棄', refineConflict, '筆）');

if (OUT) {
  fs.mkdirSync(path.dirname(String(OUT)), { recursive: true });
  fs.writeFileSync(String(OUT), tsv);
  console.log('  TSV：', OUT, (fs.statSync(String(OUT)).size / 1024).toFixed(0) + ' KB');
}
if (BLOB) {
  fs.mkdirSync(path.dirname(String(BLOB)), { recursive: true });
  const gz = zlib.gzipSync(Buffer.from(tsv, 'utf8'), { level: 9 });
  fs.writeFileSync(String(BLOB), gz.toString('base64'));
  console.log('  blob(base64)：', BLOB, (gz.length / 1024).toFixed(0) + ' KB → base64 ' + (gz.toString('base64').length / 1024).toFixed(0) + ' KB');
}
