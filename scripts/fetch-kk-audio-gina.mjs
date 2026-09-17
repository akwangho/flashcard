#!/usr/bin/env node
/**
 * 從吉娜英文 KK 音標課程（gotoabc.url.tw）下載真人發音 mp3，取代現有 Commons 音檔。
 *
 * 來源：http://www.gotoabc.url.tw/kk/kklessons.html（20 課，每課 1-3 張音標卡）
 * 每張卡的結構：卡號（母音 01）+ 播放器 data-media="kkNN.mp3" + <div class="kkch">[符號] 說明…
 * → 自動解析出「符號 → kkNN.mp3」對應後下載。
 *
 * 網站沒有的音標（沿用現有 akwangho.github.io/kk-audio 的 Commons 錄音）：
 *   /i/ /ɪ/（L01 為會員課程）、/ɜ/（網站課程未收錄）
 *
 * 執行：node scripts/fetch-kk-audio-gina.mjs
 * 產出：/tmp/kk-gina/<symbol>-src.mp3（原始檔）、/tmp/kk-gina-stage/<symbol>.mp3|.ogg（loudnorm 後）
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';

// 此站 TLS 憑證無效（瀏覽器也會警告），僅供下載公開教學音檔，關閉驗證
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE = 'https://www.gotoabc.url.tw/kk/kk-lessons-spell/';
const RAW_DIR = '/tmp/kk-gina';
const OUT_DIR = '/tmp/kk-gina-stage';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

// 20 課（母音 7 + 子音 13）；vowels-lesson-01 為會員課程且 i/ɪ 沿用現有檔，跳過
const LESSONS = [
  'vowels-lesson-02', 'vowels-lesson-03', 'vowels-lesson-04', 'vowels-lesson-05',
  'vowels-lesson-06', 'vowels-lesson-07',
  'consonants-lesson-01', 'consonants-lesson-02', 'consonants-lesson-03', 'consonants-lesson-04',
  'consonants-lesson-05', 'consonants-lesson-06', 'consonants-lesson-07', 'consonants-lesson-08',
  'consonants-lesson-09', 'consonants-lesson-10', 'consonants-lesson-11', 'consonants-lesson-12',
  'consonants-lesson-13',
];

// 我們字庫的 41 個音標（data/kk-flashcards.json）；網站缺 i ɪ ɜ
const ALL_SYMBOLS = [
  'p','b','t','d','k','g','f','v','θ','ð','s','z','ʃ','ʒ','tʃ','dʒ','m','n','ŋ','l','r','h','j','w',
  'i','ɪ','e','ɛ','æ','ɑ','o','ɔ','u','ʊ','ʌ','ə','ɚ','ɝ','ɜ','aɪ','aʊ','ɔɪ',
];
const SKIP = new Set(['i', 'ɪ', 'ɜ']); // 沿用 Commons 現有檔

// consonants-lesson-01 是會員頁面（解析不到卡片）；對照由使用者提供：kk01=/p/ kk02=/b/
const FALLBACK = {
  'consonants-lesson-01': { p: 'kk01.mp3', b: 'kk02.mp3' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchPage(url) {
  return execSync(
    `curl -skL --max-time 40 -H 'User-Agent: ${UA}' '${url}'`,
    { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 },
  );
}

function decode(buf) {
  const head = buf.subarray(0, 2048).toString('latin1').toLowerCase();
  if (/charset=["']?big5/.test(head)) {
    return new TextDecoder('big5').decode(buf);
  }
  return new TextDecoder('utf-8').decode(buf);
}

/** 解析一頁課程：回傳 [{ symbol, mp3, cardNo }]。符號可能在 span.kksp 或純文字。 */
function parseCards(html) {
  const cards = [];
  const chunks = html.split(/<div class="thecard-kk[^"]*">/).slice(1);
  for (const chunk of chunks) {
    const media = chunk.match(/data-media="(kk\d+\.mp3)"/);
    const sym = chunk.match(/class="kkch">\s*(?:<span[^>]*>)?\s*\[([^\]]+)\]/);
    const no = chunk.match(/class="hlno-kk">([^<]+)</);
    if (!media || !sym) continue;
    cards.push({
      symbol: sym[1].trim(),
      mp3: media[1],
      cardNo: no ? no[1].trim() : '?',
    });
  }
  return cards;
}

function download(url, dest) {
  execSync(`curl -skL --max-time 60 -H 'User-Agent: ${UA}' '${url}' -o '${dest}'`);
}

function toMp3(src, dest) {
  execSync(`ffmpeg -y -loglevel error -i '${src}' -af 'loudnorm=I=-18:TP=-1.5:LRA=9' -ar 44100 -ac 1 -codec:a libmp3lame -qscale:a 5 '${dest}'`);
}

function toOpus(src, dest) {
  execSync(`ffmpeg -y -loglevel error -i '${src}' -af 'loudnorm=I=-18:TP=-1.5:LRA=9' -ar 48000 -ac 1 -codec:a libopus -b:a 24k '${dest}'`);
}

function durationSec(file) {
  const out = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 '${file}'`).toString().trim();
  return parseFloat(out);
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const mapping = {}; // symbol -> { mp3, lesson, cardNo }
  const missing = [];

  for (const lesson of LESSONS) {
    const url = `${BASE}${lesson}/${lesson}.html`;
    let cards = [];
    try {
      const html = decode(fetchPage(url));
      cards = parseCards(html);
    } catch (e) {
      console.log(`page-fail ${lesson}: ${e.message.split('\n')[0]}`);
    }
    if (cards.length === 0 && FALLBACK[lesson]) {
      console.log(`${lesson}: 解析不到卡片，改用使用者提供的對照`);
      for (const [sym, file] of Object.entries(FALLBACK[lesson])) {
        cards.push({ symbol: sym, mp3: file, cardNo: '(fallback)' });
      }
    }
    for (const c of cards) {
      if (!(c.symbol in mapping)) {
        mapping[c.symbol] = { ...c, lesson };
      } else {
        console.log(`dup ${c.symbol} in ${lesson}（保留 ${mapping[c.symbol].lesson}）`);
      }
    }
    await sleep(600);
  }

  console.log('\n=== 對照表 ===');
  const wanted = ALL_SYMBOLS.filter((s) => !SKIP.has(s));
  for (const s of wanted) {
    const m = mapping[s];
    if (!m) { missing.push(s); console.log(`✗ ${s}: 無對應`); continue; }
    console.log(`${s.padEnd(3)} ← ${m.lesson}/${m.mp3} (${m.cardNo})`);
  }
  if (missing.length) {
    console.log(`\n缺對應: ${missing.join(' ')} —— 中止，請補對照`);
    process.exit(1);
  }
  const unknown = Object.keys(mapping).filter((s) => !ALL_SYMBOLS.includes(s));
  if (unknown.length) console.log(`（網站多出、我們不用的符號：${unknown.join(' ')}）`);

  console.log('\n=== 下載 + 轉檔 ===');
  const report = { ok: [], fail: [] };
  for (const s of wanted) {
    const { mp3, lesson } = mapping[s];
    const raw = `${RAW_DIR}/${s}-src.mp3`;
    try {
      if (!existsSync(raw) || statSync(raw).size < 5000) {
        download(`${BASE}${lesson}/${mp3}`, raw);
        await sleep(700);
      }
      const dur = durationSec(raw);
      if (dur < 0.25 || dur > 6) throw new Error(`duration ${dur}s out of range`);
      toMp3(raw, `${OUT_DIR}/${s}.mp3`);
      toOpus(raw, `${OUT_DIR}/${s}.ogg`);
      report.ok.push(`${s}(${dur.toFixed(2)}s)`);
      console.log(`✓ ${s} ${dur.toFixed(2)}s`);
    } catch (e) {
      report.fail.push(s);
      console.log(`✗ ${s}: ${e.message.split('\n')[0]}`);
    }
  }

  writeFileSync('/tmp/kk-gina-report.json', JSON.stringify(report, null, 2));
  console.log(`\n=== REPORT === ok: ${report.ok.length}  fail: ${report.fail.join(' ') || '(none)'}`);
  if (report.fail.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
