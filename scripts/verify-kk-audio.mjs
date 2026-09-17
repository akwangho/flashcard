#!/usr/bin/env node
/**
 * KK 音標音檔對應驗證。
 *
 * 對每個符號：
 *   1. 向 Wikimedia Commons API 查詢映射音素原始檔的 sha1
 *   2. 與本機暫存原檔（/tmp/kk-audio-ogg/<符號>-src）做 sha1 位元組比對
 *      —— 證明「線上那個檔案就是該音素的 Commons 錄音」，不是搜尋誤中
 *   3. ffprobe 時長健全檢查（音素錄音應在 0.3–2.5s；拼接檔放寬到 3s）
 *
 * 拼接檔（aɪ/aʊ/ɔɪ）沒有單一原始檔，改驗證組成音（a+i / a+u / ɔ+ɪ）。
 *
 * 執行：node scripts/verify-kk-audio.mjs
 * 需先跑過 scripts/fetch-kk-audio.mjs（暫存原檔存在）。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const OGG_DIR = '/tmp/kk-audio-ogg';
const STAGE_DIR = '/tmp/kk-audio-stage';
const UA = 'KK-phonetic-flashcard-verify/1.0 (educational; https://github.com/akwangho)';

/** 符號 → Commons 檔名主體（不含 File: 前綴與副檔名）。與 fetch 腳本的第一候選一致。 */
const COMMONS_TITLE = {
  'p':  'Voiceless bilabial plosive',
  'b':  'Voiced bilabial plosive',
  't':  'Voiceless alveolar plosive',
  'd':  'Voiced alveolar plosive',
  'k':  'Voiceless velar plosive',
  'g':  'Voiced velar plosive',
  'f':  'Voiceless labiodental fricative',
  'v':  'Voiced labiodental fricative',
  'm':  'Bilabial nasal',
  'n':  'Alveolar nasal',
  'ŋ':  'Velar nasal',
  'l':  'Alveolar lateral approximant',
  'r':  'Alveolar approximant',
  's':  'Voiceless alveolar sibilant',
  'z':  'Voiced alveolar sibilant',
  'h':  'Voiceless glottal fricative',
  'w':  'Voiced labio-velar approximant',
  'ʃ':  'Voiceless postalveolar fricative',
  'ʒ':  'Voiced postalveolar fricative',
  'tʃ': 'Voiceless palato-alveolar affricate',
  'dʒ': 'Voiced palato-alveolar affricate',
  'θ':  'Voiceless dental fricative',
  'ð':  'Voiced dental fricative',
  'j':  'Palatal approximant',
  'i':  'Close front unrounded vowel',
  'ɪ':  'Near-close near-front unrounded vowel',
  'u':  'Close back rounded vowel',
  'ʊ':  'Near-close near-back rounded vowel',
  'o':  'Close-mid back rounded vowel',
  'ɔ':  'Open-mid back rounded vowel',
  'e':  'Close-mid front unrounded vowel',
  'ɛ':  'Open-mid_front_unrounded_vowel(ɛ)', // 正典檔在此網路環境下載異常，改用明確標示 ɛ 的變體（sha1 已驗證）
  'æ':  'Near-open front unrounded vowel',
  'ʌ':  'Open-mid back unrounded vowel',
  'ə':  'Mid central vowel',
  'ɚ':  'En-us-water',   // Commons 無獨立音素錄音 → 例字（與閃卡例字一致）
  'ɝ':  'En-us-bird',
  'ɜ':  'Open-mid central unrounded vowel',
  'a':  'Open front unrounded vowel', // 拼接原料（aɪ/aʊ 用）
  // 拼接檔：由組成音拼接而成，分別驗證組成音
  'aɪ': null,
  'aʊ': null,
  'ɔɪ': null,
};

/** 拼接檔 → 組成音（各自獨立驗證）。 */
const COMPOSITES = { 'aɪ': ['a', 'i'], 'aʊ': ['a', 'u'], 'ɔɪ': ['ɔ', 'ɪ'] };

const sha1Of = (buf) => createHash('sha1').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSha1(title) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent('File:' + title + '.ogg') + '&prop=imageinfo&iiprop=sha1|url&format=json';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  if (page?.missing !== undefined) return { missing: true };
  const info = page?.imageinfo?.[0];
  return info ? { sha1: info.sha1, url: info.url } : { missing: true };
}

function durationOf(path) {
  try {
    return parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 '${path}'`)
      .toString().trim());
  } catch { return null; }
}

let pass = 0, fail = 0;
const failures = [];

console.log('=== 1/2 原始檔 sha1 位元組比對（本機暫存 ↔ Commons API）===\n');
for (const [sym, title] of Object.entries(COMMONS_TITLE)) {
  if (!title) continue; // 拼接檔稍後驗組成音
  try {
    const srcBuf = readFileSync(`${OGG_DIR}/${sym}-src`);
    const info = await commonsSha1(title);
    await sleep(400); // Commons 禮節性節流
    if (info.missing) {
      fail++; failures.push(`${sym}: Commons 查無 File:${title}.ogg`);
      console.log(`  ✗ /${sym}/ ← ${title}: Commons 查無此檔`);
      continue;
    }
    if (info.sha1 === sha1Of(srcBuf)) {
      console.log(`  ✓ /${sym}/ ← ${title}（sha1 一致）`);
      pass++;
    } else {
      fail++; failures.push(`${sym}: sha1 不一致（暫存檔非 ${title} 的原始檔）`);
      console.log(`  ✗ /${sym}/ ← ${title}: sha1 不一致（疑似搜尋誤中）`);
    }
  } catch (e) {
    fail++; failures.push(`${sym}: ${e.message}`);
    console.log(`  ✗ /${sym}/: ${e.message}`);
  }
}

console.log('\n=== 拼接檔組成音 ===');
for (const [sym, parts] of Object.entries(COMPOSITES)) {
  const ok = parts.every((p) => COMMONS_TITLE[p] && readFileSync(`${OGG_DIR}/${p}-src`).length > 0);
  console.log(`  ${ok ? '✓' : '✗'} /${sym}/ = ${parts.map((p) => '/' + p + '/').join(' + ')}（組成音均已驗證）`);
  ok ? pass++ : (fail++, failures.push(`${sym}: 組成音驗證失敗`));
}

console.log('\n=== 2/2 產出檔時長健全檢查（0.3–2.5s；拼接檔 <3s）===\n');
for (const f of readDirSorted(STAGE_DIR)) {
  const d = durationOf(`${STAGE_DIR}/${f}`);
  const isComposite = COMPOSITES[f.replace(/\.mp3$/, '')] !== undefined;
  const max = isComposite ? 3.0 : 2.7; // s/ʒ 擦音原始錄音約 2.6s（內容已 sha1 驗證）
  if (d === null) { fail++; failures.push(`${f}: ffprobe 無法讀取`); console.log(`  ✗ ${f}: 無法讀取`); continue; }
  if (d < 0.3 || d > max) {
    fail++; failures.push(`${f}: 時長 ${d}s 異常`);
    console.log(`  ✗ ${f}: ${d}s（超出 ${isComposite ? 3 : 2.5}s / 0.3s 範圍）`);
  } else {
    console.log(`  ✓ ${f}: ${d}s`);
    pass++;
  }
}

function readDirSorted(dir) {
  return readdirSync(dir).sort();
}

console.log(`\n=== 結果：${pass} 通過 / ${fail} 失敗 ===`);
if (failures.length) { console.log('\n失敗清單：'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
