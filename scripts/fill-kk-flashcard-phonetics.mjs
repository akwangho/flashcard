#!/usr/bin/env node
/**
 * 將 data/kk-flashcards.json 中每張閃卡的例字音標（wordPhonetic）
 * 從 data/kk-phonetics.json（13.5 萬筆 KK 字庫）自動填入。
 *
 * 好處：例字音標與 App 的音標查詢結果完全一致（同一份字庫、同一套轉換規則），
 * 不會出現閃卡寫 /pɪg/ 但 App 查到 /ˋpɪg/ 的不一致。
 *
 * 執行：node scripts/fill-kk-flashcard-phonetics.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const flashcards = JSON.parse(readFileSync(join(root, 'data/kk-flashcards.json'), 'utf8'));
const dictRaw = JSON.parse(readFileSync(join(root, 'data/kk-phonetics.json'), 'utf8'));
const dict = dictRaw.phonetics || dictRaw;

let filled = 0;
const missing = [];

for (const card of flashcards.cards) {
  const key = card.word.toLowerCase();
  const phonetics = dict[key];
  if (phonetics && phonetics.length) {
    card.wordPhonetic = phonetics[0]; // 第一筆 = 最常見候選
    filled++;
  } else {
    missing.push(card.word);
  }
}

writeFileSync(join(root, 'data/kk-flashcards.json'), JSON.stringify(flashcards, null, 2) + '\n');

console.log(`已填入 ${filled}/${flashcards.cards.length} 張閃卡的例字音標`);
if (missing.length) {
  console.error('字庫查不到的例字（需人工更換）：', missing.join(', '));
  process.exit(1);
}
