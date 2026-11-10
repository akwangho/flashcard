#!/usr/bin/env node
/**
 * 文法測驗題目驗證腳本（開發用）。
 *
 * 從 Google Datasheet 的「單字庫」「五上單字」工作表抓取真實資料，
 * 載入 script-grammar-quiz.html 的出題邏輯，產生各題型的題目並檢查：
 *   1. 產生的句子文法是否正確（BE 動詞、Do/Does、第三人稱單數 -s）
 *   2. 錯誤選項是否真的都是錯的、且互不重複
 *   3. 題目池數量與題型分佈是否正確
 *
 * 用法：node scripts/validate-grammar-quiz.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** 「單字庫」「五上單字」所在試算表與工作表 gid */
const SPREADSHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
const SOURCE_SHEETS = [
  { name: '單字庫', gid: 0 },
  { name: '五上單字', gid: 1984215032 }
];

const APP_CONSTANTS = {
  GRAMMAR_QUIZ_SOURCE_SHEETS: SOURCE_SHEETS.map(s => s.name),
  GRAMMAR_QUIZ_POOL_SIZE: 100,
  GRAMMAR_QUIZ_QUESTION_COUNT: 10,
  QUIZ_POINTS_PER_QUESTION: 10,
  SPEECH_DELAY_MS: 500
};

/**
 * 抓取工作表 CSV（欄位：A=要會拼, B=單字, C=翻譯, ...）
 * @param {number} gid - 工作表 gid
 * @returns {Promise<Array<Object>>} 單字陣列
 */
async function fetchSheetWords(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`抓取 gid=${gid} 失敗：HTTP ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

/**
 * 解析 CSV（處理引號內的逗號與換行）。
 * @param {string} text - CSV 內容
 * @returns {Array<Array<string>>} 陣列
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * 載入 script-grammar-quiz.html 的模組。
 * @returns {Object} { FlashcardApp, data }
 */
function loadModule() {
  let src = fs.readFileSync(path.join(ROOT, 'script-grammar-quiz.html'), 'utf8');
  src = src.replace(/<script>/g, '').replace(/<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  function FlashcardApp() {}
  const data = new Function('FlashcardApp', 'APP_CONSTANTS', src +
    '; return { GRAMMAR_QUIZ_VERBS, GRAMMAR_QUIZ_ADJECTIVES_PEOPLE, GRAMMAR_QUIZ_ADJECTIVES_THINGS,' +
    ' GRAMMAR_QUIZ_PERSON_NOUNS, GRAMMAR_QUIZ_NOUNS_PL, GRAMMAR_QUIZ_SUBJECTS,' +
    ' GRAMMAR_QUIZ_THING_SUBJECTS, GRAMMAR_QUIZ_CLOTHING_SUBJECTS,' +
    ' GRAMMAR_QUIZ_ADJECTIVES_CLOTHING, GRAMMAR_QUIZ_TYPES };')(FlashcardApp, APP_CONSTANTS);
  return { FlashcardApp, data };
}

const { FlashcardApp, data } = loadModule();

const allWords = [];
for (const sheet of SOURCE_SHEETS) {
  const rows = await fetchSheetWords(sheet.gid);
  for (const r of rows.slice(1)) {
    if (r[1] && r[1].trim()) {
      allWords.push({
        id: allWords.length,
        english: r[1].trim(),
        chinese: (r[2] || '').trim(),
        sheetName: sheet.name,
        difficultyLevel: 0,
        tags: [],
        mustSpell: 0
      });
    }
  }
}

const app = new FlashcardApp();
app.words = allWords;
app.grammarQuizState = { sourceWords: app._grammarQuizSourceWords() };
app.shuffleArray = function (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
};

console.log('來源單字數:', app.grammarQuizState.sourceWords.length);
const vocab = app._grammarQuizVocabulary();
console.log('動詞:', vocab.verbs.length, '/', data.GRAMMAR_QUIZ_VERBS.length);
console.log('形容詞(人):', vocab.adjectives.length, '/', data.GRAMMAR_QUIZ_ADJECTIVES_PEOPLE.length);
console.log('形容詞(物):', vocab.adjectivesThings.length, '/', data.GRAMMAR_QUIZ_ADJECTIVES_THINGS.length);
console.log('形容詞(衣物):', vocab.adjectivesClothing.length, '/', data.GRAMMAR_QUIZ_ADJECTIVES_CLOTHING.length);
console.log('人物名詞:', vocab.nounsSg.length, '/', data.GRAMMAR_QUIZ_PERSON_NOUNS.length);
console.log('複數名詞:', vocab.nounsPl.length, '/', data.GRAMMAR_QUIZ_NOUNS_PL.length);
console.log('可用動詞:', vocab.verbs.map(v => v.base).join(', '));

const items = app._grammarQuizMakeItems();
const byFocus = {};
for (const it of items) byFocus[it.focus] = (byFocus[it.focus] || 0) + 1;
console.log('\n題目項目數:', items.length, ' focus 分佈:', byFocus);

const problems = [];
for (const it of items) {
  for (const form of ['aff', 'neg', 'q']) {
    const text = app._grammarQuizFormText(it, form);
    if (!/[A-Z]/.test(text.charAt(0))) problems.push(['句首未大寫', text]);
    if (!/[.?!]$/.test(text)) problems.push(['缺少句號或問號', text]);
    if (/\s[.?!]$/.test(text)) problems.push(['標點前有多餘空白', text]);
    if (/  /.test(text)) problems.push(['句中有連續空白', text]);
    const correct = app._grammarQuizFormText(it, form);
    const wrong = app._grammarQuizWrongForms(it, form, 6);
    if (wrong.includes(correct)) problems.push(['錯誤選項等於正確答案', text]);
    if (new Set(wrong).size !== wrong.length) problems.push(['錯誤選項重複', text, wrong.join(' | ')]);
  }
}
console.log('句型檢查問題數:', problems.length);
problems.slice(0, 20).forEach(p => console.log('  !', p.join('  ::  ')));

for (const type of ['truefalse', 'fill', 'choice', 'translate', 'mixed']) {
  const pool = app._grammarQuizBuildPool(type);
  const focusCounts = {};
  const typeCounts = {};
  for (const q of pool) {
    focusCounts[q.focus] = (focusCounts[q.focus] || 0) + 1;
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
  }
  console.log(`\n===== 題型 ${type}：${pool.length} 題`);
  console.log('  focus 分佈:', focusCounts, ' 題型分佈:', typeCounts);
  for (const q of pool.slice(0, 3)) {
    console.log('  題目:', q.question, q.prompt ? `(${q.prompt})` : '');
    console.log('    選項:', q.options.map(o => o.label).join('  |  '));
    console.log('    正確:', q.correctAnswer, '／', q.explain);
  }
}
