#!/usr/bin/env node
/**
 * 下載 41 個 KK 音標的真人發音音檔（Wikimedia Commons 的 IPA 音素錄音，
 * 多為美式英語錄音，與 KK 音標一致），轉檔成 mp3（全部瀏覽器）與 ogg/Opus（省 61%，
 * Safari 17+ 支援；App 依 canPlayType 自動協商）
 * 並做音量標準化，輸出到暫存目錄，供上傳到 akwangho.github.io/kk-audio/。
 *
 * 來源授權：Commons 音素錄音多為 CC BY-SA / 公有領域，免費可用於教育用途。
 *
 * 執行：node scripts/fetch-kk-audio.mjs
 * 產出：/tmp/kk-audio-stage/<symbol>.mp3 與 <symbol>.ogg
 *
 * 策略：
 *   1. 依「已知檔名」直接嘗試 Special:FilePath
 *   2. 失敗改用 Commons API 搜尋（File namespace）取第一個音訊檔
 *   3. 雙母音（aɪ / aʊ / ɔɪ）若無單一檔案 → 用組成母音拼接（a+ɪ 等，
 *      中間 250ms，聽感即「阿→衣」滑音，與閃卡小訣竅描述一致）
 */

import { execSync } from 'node:child_process';

const OUT_DIR = '/tmp/kk-audio-stage';
const OGG_DIR = '/tmp/kk-audio-ogg';
const UA = 'KK-phonetic-flashcard-fetch/1.0 (educational; https://github.com/akwangho)';

// symbol → 候選 Commons 檔名（去掉 File: 與副檔名）。null 代表無單一檔案。
const CANDIDATES = {
  'p':  ['Voiceless bilabial plosive'],
  'b':  ['Voiced bilabial plosive'],
  't':  ['Voiceless alveolar plosive'],
  'd':  ['Voiced alveolar plosive'],
  'k':  ['Voiceless velar plosive'],
  'g':  ['Voiced velar plosive'],
  'f':  ['Voiceless labiodental fricative'],
  'v':  ['Voiced labiodental fricative'],
  'm':  ['Bilabial nasal'],
  'n':  ['Alveolar nasal'],
  'ŋ':  ['Velar nasal'],
  'l':  ['Alveolar lateral approximant'],
  'r':  ['Alveolar approximant'],
  's':  ['Voiceless alveolar sibilant'],
  'z':  ['Voiced alveolar sibilant'],
  'h':  ['Voiceless glottal fricative'],
  'w':  ['Voiced labio-velar approximant', 'Labio-velar approximant'],
  'ʃ':  ['Voiceless postalveolar fricative'],
  'ʒ':  ['Voiced postalveolar fricative'],
  'tʃ': ['Voiceless palato-alveolar affricate', 'Voiceless postalveolar affricate'],
  'dʒ': ['Voiced palato-alveolar affricate', 'Voiced postalveolar affricate'],
  'θ':  ['Voiceless dental fricative'],
  'ð':  ['Voiced dental fricative'],
  'j':  ['Palatal approximant'],
  'i':  ['Close front unrounded vowel'],
  'ɪ':  ['Near-close near-front unrounded vowel'],
  'u':  ['Close back rounded vowel'],
  'ʊ':  ['Near-close near-back rounded vowel', 'Near-close near-back rounded vowel'],
  'o':  ['Close-mid back rounded vowel'],
  'ɔ':  ['Open-mid back rounded vowel'],
  'e':  ['Close-mid front unrounded vowel'],
  'ɛ':  ['Open-mid front unrounded vowel'],
  'æ':  ['Near-open front unrounded vowel'],
  'ʌ':  ['Open-mid back unrounded vowel'],
  'ə':  ['Mid central vowel'],
  // r-colored 母音在 Commons 無獨立音素錄音 → 用例字發音（與閃卡例字一致）
  'ɚ':  ['En-us-water'],
  'ɝ':  ['En-us-bird'],
  'aɪ': null, // → 拼接 a + ɪ
  'aʊ': null, // → 拼接 a + ʊ
  'ɔɪ': null, // → 拼接 ɔ + ɪ
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const enc = (s) => encodeURIComponent(s);

async function head(url) {
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA }, redirect: 'follow' });
    return res.ok;
  } catch { return false; }
}

async function searchCommons(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&format=json&srlimit=10&srsearch=' + enc(query);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const data = await res.json();
    const hits = (data?.query?.search || []).map((h) => h.title).filter((t) => /^File:/.test(t));
    // 優先 .ogg/.oga/.wav，過濾明顯不相關（含例句、單字發音等）
    const audio = hits.filter((t) => /\.(ogg|oga|wav|flac)$/i.test(t));
    return audio;
  } catch { return []; }
}

async function download(name, dest) {
  const url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + enc(name);
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 800) return false; // 太小視為失敗
  const { writeFileSync } = await import('node:fs');
  writeFileSync(dest, buf);
  return true;
}

function run(cmd) {
  execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] });
}

async function fetchOne(symbol, candidates) {
  const { existsSync } = await import('node:fs');
  const oggDest = `${OGG_DIR}/${symbol}-src`;
  if (existsSync(oggDest)) return 'cached';
  for (const name of candidates) {
    if (!name) continue;
    await sleep(1200);
    // 先以 API 確認精確檔名存在（Special:FilePath 對大小寫/連字號敏感）
    const check = await fetch('https://commons.wikimedia.org/w/api.php?action=query&titles=File:' + enc(name) + '.ogg&format=json', { headers: { 'User-Agent': UA } });
    if (check.ok) {
      const d = await check.json();
      const pages = d?.query?.pages || {};
      const first = Object.values(pages)[0];
      if (first && !first.missing) {
        if (await download(name + '.ogg', oggDest)) return name + '.ogg';
      }
    }
    await sleep(800);
    if (await head('https://commons.wikimedia.org/wiki/Special:FilePath/' + enc(name) + '.ogg')) {
      if (await download(name + '.ogg', oggDest)) return name + '.ogg';
    }
  }
  // API 搜尋後備
  for (const name of candidates) {
    if (!name) continue;
    await sleep(1200);
    const hits = await searchCommons(name);
    for (const hit of hits.slice(0, 3)) {
      await sleep(1000);
      const base = hit.replace(/^File:/, '').replace(/\.(ogg|oga|wav|flac)$/i, '');
      if (await download(base + '.ogg', oggDest)) return base + '.ogg';
    }
  }
  return existsSync(oggDest) ? 'cached' : null;
}

function toMp3(src, dest, extraFilter) {
  const filter = 'loudnorm=I=-18:TP=-1.5:LRA=9' + (extraFilter ? ',' + extraFilter : '');
  run(`ffmpeg -y -i '${src}' -af '${filter}' -ar 44100 -ac 1 -codec:a libmp3lame -qscale:a 5 '${dest}'`);
}

function toOpus(src, dest, extraFilter) {
  const filter = 'loudnorm=I=-18:TP=-1.5:LRA=9' + (extraFilter ? ',' + extraFilter : '');
  run(`ffmpeg -y -i '${src}' -af '${filter}' -ar 48000 -ac 1 -codec:a libopus -b:a 24k '${dest}'`);
}

function concatMp3(parts, dest) {
  concatAudio(parts, dest, 'libmp3lame', ['-qscale:a 5']);
}

function concatOpus(parts, dest) {
  concatAudio(parts, dest, 'libopus', ['-b:a 24k']);
}

function concatAudio(parts, dest, codec, codecArgs) {
  // 各段先標準化成 wav，插入 250ms 靜音，concat 後再 loudnorm 轉目標格式
  const tmp = parts.map((p, i) => `${OGG_DIR}/part${i}.wav`);
  parts.forEach((p, i) => run(`ffmpeg -y -i '${OGG_DIR}/${p}' -ar 44100 -ac 1 '${tmp[i]}'`));
  const silence = `${OGG_DIR}/sil.wav`;
  run(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.25 '${silence}'`);
  const inputs = [tmp[0], silence, tmp[1]].map((f) => `-i '${f}'`).join(' ');
  run(`ffmpeg -y ${inputs} -filter_complex '[0:a][1:a][2:a]concat=n=3:v=0:a=1,loudnorm=I=-18:TP=-1.5:LRA=9' -ar 44100 -ac 1 -codec:a ${codec} ${codecArgs.join(' ')} '${dest}'`);
}

async function main() {
  const { mkdirSync, writeFileSync, existsSync } = await import('node:fs');
  const cp = (await import('node:child_process'));
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(OGG_DIR, { recursive: true });
  const report = { ok: [], concat: [], missing: [] };

  // 拼接組合（無單一音檔的雙母音）
  const CONCATS = { 'aɪ': ['a-src', 'i-src'], 'aʊ': ['a-src', 'ʊ-src'], 'ɔɪ': ['ɔ-src', 'i-src'] };

  for (const symbol of Object.keys(CANDIDATES)) {
    const out = `${OUT_DIR}/${symbol}.mp3`;
    const outOpus = `${OUT_DIR}/${symbol}.ogg`;
    if (existsSync(out) && existsSync(outOpus)) { report.ok.push(symbol); continue; }
    if (CANDIDATES[symbol] === null) {
      report.concat.push(symbol);
      continue; // 等組成音抓好再拼
    }
    process.stdout.write(`fetch ${symbol} ... `);
    const got = await fetchOne(symbol, CANDIDATES[symbol]);
    if (!got) { report.missing.push(symbol); console.log('MISSING'); continue; }
    console.log(got);
    try {
      toMp3(`${OGG_DIR}/${symbol}-src`, out);
      toOpus(`${OGG_DIR}/${symbol}-src`, outOpus);
      report.ok.push(symbol);
    } catch (e) { report.missing.push(symbol); console.log('convert-fail', e.message); }
    await sleep(800);
  }

  // 修剪 -src 命名：統一改為 <symbol>-src（拼接組成音可能本身在 report 裡）
  const nameMap = { 'a-src': 'a', 'i-src': 'i', 'u-src': 'u', 'ɔ-src': 'ɔ' };
  for (const [srcName, sym] of Object.entries(nameMap)) {
    if (!existsSync(`${OGG_DIR}/${srcName}`) && existsSync(`${OGG_DIR}/${sym}-src`)) {
      cp.execSync(`cp '${OGG_DIR}/${sym}-src' '${OGG_DIR}/${srcName}'`);
    }
  }
  for (const [symbol, parts] of Object.entries(CONCATS)) {
    const out = `${OUT_DIR}/${symbol}.mp3`;
    const outOpus = `${OUT_DIR}/${symbol}.ogg`;
    if (existsSync(out) && existsSync(outOpus)) continue;
    const have = parts.every((p) => existsSync(`${OGG_DIR}/${p}`));
    if (!have) { report.missing.push(symbol + '(concat缺件)'); continue; }
    try {
      concatMp3(parts, out);
      concatOpus(parts, outOpus);
      report.concat.push(symbol);
    } catch (e) { report.missing.push(symbol + '(concat-fail)'); }
  }

  writeFileSync('/tmp/kk-audio-report.json', JSON.stringify(report, null, 2));
  console.log('\n=== REPORT ===');
  console.log('ok:', report.ok.length, report.ok.join(' '));
  console.log('concat:', report.concat.join(' ') || '(none)');
  console.log('missing:', report.missing.join(' ') || '(none)');
}

main().catch((e) => { console.error(e); process.exit(1); });
