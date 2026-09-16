#!/usr/bin/env node
/**
 * KK 音標字庫建置腳本。
 *
 * 下載 open-dict-data/ipa-dict 的 en_US IPA 字典（約 12.6 萬筆），
 * 逐筆轉成台灣 KK 音標，輸出 data/kk-phonetics.json。
 *
 * 執行：node scripts/build-kk-dictionary.mjs
 * 產出：data/kk-phonetics.json（交由 GAS 的 importKKPhoneticsFromGitHub /
 *       importKKPhoneticsFromDriveFile 匯入「KK音標字庫」工作表）
 *
 * 轉換規則（與 code.gs 的 ipaToKK 保持同步，此處為大量轉換的權威實作）：
 *   ˈ → ˋ   主重音（KK 慣用音符號）
 *   ˌ → ˏ   次重音
 *   əɫ → ḷ  音節性 l（apple ˈæpəɫ → ˋæpḷ）
 *   ɝ → ɚ   字尾（非次主重音）捲舌音（letter ˈlɛtɝ → ˋlɛtɚ）
 *   ɫ → l   其餘的 l（dark l 回一般 l）
 *   ɹ → r   捲舌 r
 *   ɡ → g   IPA g（U+0261）→ 一般 g
 *   i → i   不加長音符（台灣課本慣例兩者皆可，取簡潔）
 *   eɪ/e/ɛ 對應：KK 的 e 音 = IPA eɪ 或 e
 *   oʊ/o/ɔ 對應：KK 的 o 音 = IPA oʊ 或 o
 *
 * ipa-dict 的 əɫ 標注即音節性 l（例：apple /ˈæpəɫ/、little /ˈɫɪtəɫ/），
 * 轉成 ḷ 才會顯示成課本常見的 ˋæpḷ / ˋlɪtḷ。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'kk-phonetics.json');
const SRC_URL = 'https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt';
const CACHE = '/tmp/en_US.txt';

/** 多字元規則先替換（順序重要） */
const MULTI_STEPS = [
  ['əɫ', 'ḷ'],   // 音節性 l（ipa-dict 標法）
  ['əl', 'ḷ'],   // 音節性 l（一般標法備援）
  ['eɪ', 'e'],   // KK e
  ['oʊ', 'o'],   // KK o
  ['əʊ', 'o'],   // 英式拼法備援
  ['aɪ', '\u0001'],  // 雙母音先用佔位符保護，避免被單字元 a→æ 破壞
  ['aʊ', '\u0002'],
  ['ɔɪ', '\u0003'],
  ['tʃ', 'tʃ'],
  ['dʒ', 'dʒ'],
];

/** 佔位符還原（在 CHAR_MAP 之後套用） */
const PLACEHOLDER_RESTORE = { '\u0001': 'aɪ', '\u0002': 'aʊ', '\u0003': 'ɔɪ' };

/**
 * ɝ 依重音分流：帶主重音（ˈ）的音節裡保留 ɝ，其餘 → ɚ。
 * 例：world /ˈwɝɫd/ → ˈwɝld（ˋwɝld）；letter /ˈlɛtɝ/ → ˈlɛtɚ（ˋlɛtɚ）。
 */
const IPA_VOWELS = 'aeiouæʌɛɪʊəɔ';
function splitStressedEr(s) {
  let out = '';
  let lastStressIdx = -Infinity;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === 'ˈ' || ch === 'ˌ') lastStressIdx = i;
    if (ch === 'ɝ') {
      const between = lastStressIdx >= 0 ? s.slice(lastStressIdx + 1, i) : null;
      const stressed = between !== null && between.length <= 2 && !/[æʌɛɪʊəɔaeiou]/.test(between);
      out += stressed ? 'ɝ' : 'ɚ';
    } else {
      out += ch;
    }
  }
  return out;
}

/** 單字元規則 */
const CHAR_MAP = {
  'ˈ': 'ˋ',
  'ˌ': 'ˏ',
  'ɫ': 'l',
  'ɹ': 'r',
  'ɡ': 'g',
  'g': 'g',
  'ɑ': 'ɑ',
  'æ': 'æ',
  'ʌ': 'ʌ',
  'ɛ': 'ɛ',
  'ɪ': 'ɪ',
  'ʊ': 'ʊ',
  'ə': 'ə',
  'ɔ': 'ɔ',
  'i': 'i',
  'u': 'u',
  'e': 'ɛ',   // 單獨 e（非 eɪ）在美式接近 ɛ
  'o': 'o',
  'a': 'æ',   // 單獨 a 在 en_US 多為 æ 或 ɑ；取常見 æ（aɪ/aʊ 已在多字元處理）
  'ʃ': 'ʃ',
  'ʒ': 'ʒ',
  'θ': 'θ',
  'ð': 'ð',
  'ŋ': 'ŋ',
  'j': 'j',
  'w': 'w',
  'h': 'h',
  'ḷ': 'ḷ',   // 音節性 l（由 əɫ 轉來）
  'ɚ': 'ɚ',   // 捲舌中央母音（非重音）
  'ɝ': 'ɝ',   // 捲舌中央母音（帶主重音）
  'ː': '',    // 長音符號：KK 不用
  '(': '',    // 可選發音括號移除（取主要讀音）
  ')': '',
  '.': '',    // 音節界線移除
};

/** ipaToKK：單筆轉換（與 code.gs 同步）。未列出的英文字母/撇號直接保留，其他符號捨棄 */
export function ipaToKK(ipa) {
  let s = String(ipa || '').trim().replace(/^\/+|\/+$/g, '');
  if (!s) return '';
  s = splitStressedEr(s);
  for (const [from, to] of MULTI_STEPS) s = s.split(from).join(to);
  let out = '';
  for (const ch of s) {
    if (Object.prototype.hasOwnProperty.call(PLACEHOLDER_RESTORE, ch)) {
      out += PLACEHOLDER_RESTORE[ch];
    } else if (Object.prototype.hasOwnProperty.call(CHAR_MAP, ch)) {
      out += CHAR_MAP[ch];
    } else if (/[a-zA-Z']/.test(ch)) {
      out += ch; // 一般子音字母 p t k b d f v s z m n l r… 直接保留
    }
    // 其餘未知的 IPA 符號（長音符、聲調等）捨棄
  }
  return out;
}

/**
 * 主流程：讀取（或下載）字典 → 轉換 → 寫出 JSON。
 * 同一單字多筆 IPA 讀音：各自轉換後去重，全部保留為候選（前端可選）。
 */
async function main() {
  let text;
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 1000000) {
    console.log('使用快取字典:', CACHE);
    text = fs.readFileSync(CACHE, 'utf8');
  } else {
    console.log('下載字典:', SRC_URL);
    const resp = await fetch(SRC_URL);
    if (!resp.ok) throw new Error(`下載失敗: HTTP ${resp.status}`);
    text = await resp.text();
    fs.writeFileSync(CACHE, text);
  }

  const lines = text.split('\n');
  const dict = {};
  let converted = 0;
  let multiPron = 0;
  let skipped = 0;

  for (const line of lines) {
    const tab = line.indexOf('\t');
    if (tab <= 0) { skipped++; continue; }
    const word = line.slice(0, tab).trim().toLowerCase();
    const ipaField = line.slice(tab + 1).trim();
    if (!word || !ipaField) { skipped++; continue; }
    // 只收英文單字（排除 'bout 等縮寫殘缺條目可保留——仍是有用讀音；僅排除含空白者）
    if (/\s/.test(word)) { skipped++; continue; }

    const candidates = [];
    for (const ipa of ipaField.split(',')) {
      const kk = ipaToKK(ipa);
      if (kk && !candidates.includes(kk)) candidates.push(kk);
    }
    if (candidates.length === 0) { skipped++; continue; }
    if (candidates.length > 1) multiPron++;
    dict[word] = candidates;
    converted++;
  }

  const words = Object.keys(dict).sort();
  const out = {
    _readme: [
      'KK 音標字庫（由 open-dict-data/ipa-dict en_US 轉換產生）。',
      '重新產生：node scripts/build-kk-dictionary.mjs',
      '匯入 Google Sheet：GAS importKKPhonetics.gs → importKKPhoneticsFromGitHub()',
      '格式：phonetics 物件，key 為英文單字（小寫），value 為候選 KK 音標陣列。',
    ],
    version: new Date().toISOString().slice(0, 10),
    source: SRC_URL,
    stats: { words: words.length, multiPronunciation: multiPron, skipped },
    phonetics: Object.fromEntries(words.map((w) => [w, dict[w]])),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`完成：${words.length} 個單字（多讀音 ${multiPron}、略過 ${skipped}）→ ${OUT}`);
  console.log('大小:', (fs.statSync(OUT).size / 1024 / 1024).toFixed(1), 'MB');

  // 抽樣驗證
  const samples = ['apple', 'little', 'water', 'world', 'letter', 'computer', 'nation', 'photo'];
  console.log('抽樣驗證:');
  for (const w of samples) console.log(`  ${w}: ${(dict[w] || []).join(' / ')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
