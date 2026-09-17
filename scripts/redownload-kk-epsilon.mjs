#!/usr/bin/env node
/**
 * 重新下載 /ɛ/ 的 Commons 原始檔。
 *
 * 背景：此網路環境對 upload.wikimedia.org 的二進位回應偶發不可信內容
 * （亂數長度、格式無效、sha1 全 Commons 查無）。
 * 策略：多重來源重試，下載結果的 sha1 必須命中 Commons API 已知的
 * 兩個正典值之一（Open-mid front unrounded vowel.ogg 或其 ɛ 標示變體），
 * 全部失敗才放棄並回報非零結束碼。
 *
 * 執行：node scripts/redownload-kk-epsilon.mjs
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const OUT = '/tmp/kk-audio-ogg/ɛ-src';
const UA = 'KK-phonetic-flashcard-fetch/1.0 (educational; https://github.com/akwangho)';

/** 可接受的目標：先用 list=allimages 列舉檔案家族，再取對應檔的權威直鏈。 */
const TARGETS = [
  { prefix: 'Open-mid_front_unrounded_vowel(ɛ)', fallbackSha1: 'd819010af98e9de506718efcf0d7586818f471dc' },
  { prefix: 'Open-mid_front_unrounded_vowel', fallbackSha1: '53f71cb41cf50e44ad49db15c5eca23b7ffac6e2' },
];

const sha1Of = (buf) => createHash('sha1').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchBuf(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Encoding': 'identity' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}

/** 列舉檔案家族，回傳 [{name, url, sha1, size}]（URL 為 Commons 登記的原始檔直鏈）。 */
async function familyFiles(prefix) {
  const q = 'https://commons.wikimedia.org/w/api.php?action=query&list=allimages' +
    '&aiprefix=' + encodeURIComponent(prefix) +
    '&aiprop=url%7Csha1%7Csize&format=json&ailimit=20';
  const data = await (await fetch(q, { headers: { 'User-Agent': UA } })).json();
  return (data?.query?.allimages || []).map((f) => ({
    name: f.name, url: (f.url || '').split('?')[0], sha1: f.sha1, size: f.size,
  }));
}

let ok = false;
for (let round = 1; round <= 3 && !ok; round++) {
  for (const t of TARGETS) {
    try {
      const files = await familyFiles(t.prefix);
      for (const f of files) {
        if (!/\.(ogg|oga)$/i.test(f.name)) continue;
        try {
          const buf = await fetchBuf(f.url);
          const sha = sha1Of(buf);
          console.log(`round ${round}: ${f.name} → ${buf.length}B sha1=${sha.slice(0, 12)}…`);
          if (sha === f.sha1) {
            writeFileSync(OUT, buf);
            console.log(`✓ /ɛ/ 原始檔已驗證並寫入 ${OUT}（${buf.length}B, ${f.name}）`);
            ok = true;
            break;
          }
        } catch (e) { console.log(`  下載失敗: ${e.message}`); }
        await sleep(1500);
      }
    } catch (e) { console.log(`round ${round} ${t.prefix}: ${e.message}`); }
    if (ok) break;
    await sleep(1500);
  }
}

if (!ok) { console.error('✗ 所有來源重試後仍無法取得可驗證的 ɛ 原始檔'); process.exit(1); }
