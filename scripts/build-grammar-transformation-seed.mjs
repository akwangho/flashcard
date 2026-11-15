#!/usr/bin/env node
/**
 * Build the Google Apps Script seed module from the canonical card dataset.
 *
 * Usage:
 *   node scripts/build-grammar-transformation-seed.mjs
 *
 * The JSON file is the source of truth. This script validates it and writes
 * grammarFlashcards.gs, including the idempotent Apps Script seeder.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'grammar-transformation-cards.json');
const OUTPUT_PATH = path.join(ROOT, 'grammarFlashcards.gs');

const EXPECTED_COUNT = 200;
const EXPECTED_BASE_COUNT = 50;
const CATEGORIES = {
  'be-affirmative-to-negative': 'BE肯定→否定',
  'be-affirmative-to-question': 'BE肯定→疑問',
  'be-negative-to-question': 'BE否定→疑問',
  'be-question-to-affirmative': 'BE疑問→肯定',
  'do-affirmative-to-negative': 'DoDoes肯定→否定',
  'do-affirmative-to-question': 'DoDoes肯定→疑問',
  'do-negative-to-question': 'DoDoes否定→疑問',
  'do-question-to-affirmative': 'DoDoes疑問→肯定'
};
const TRANSFORMATIONS = [
  'affirmative-to-negative',
  'affirmative-to-question',
  'negative-to-question',
  'question-to-affirmative'
];
const INSTRUCTIONS = {
  'affirmative-to-negative': '轉成否定句',
  'affirmative-to-question': '轉成疑問句',
  'negative-to-question': '轉成疑問句',
  'question-to-affirmative': '轉成肯定句'
};

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function validateCards(data) {
  if (!data || !Array.isArray(data.cards)) fail('cards must be an array');
  if (data.schemaVersion !== 2) fail(`schemaVersion must be 2, found ${data.schemaVersion}`);
  if (data.cards.length !== EXPECTED_COUNT) {
    fail(`expected ${EXPECTED_COUNT} cards, found ${data.cards.length}`);
  }

  const ids = new Set();
  const prompts = new Set();
  const categoryCounts = {};
  const transformationCounts = {};
  const baseIds = new Set();
  const answerForms = { contracted: 0, expanded: 0 };

  data.cards.forEach((card, index) => {
    const expectedId = index + 1;
    if (card.id !== expectedId) fail(`card ${index + 1} has id ${card.id}`);
    if (ids.has(card.id)) fail(`duplicate card id ${card.id}`);
    ids.add(card.id);

    if (!Object.prototype.hasOwnProperty.call(CATEGORIES, card.category)) {
      fail(`card ${card.id} has unknown category ${card.category}`);
    }
    categoryCounts[card.category] = (categoryCounts[card.category] || 0) + 1;

    if (!TRANSFORMATIONS.includes(card.transformation)) {
      fail(`card ${card.id} has unknown transformation ${card.transformation}`);
    }
    transformationCounts[card.transformation] = (transformationCounts[card.transformation] || 0) + 1;
    if (card.instruction !== INSTRUCTIONS[card.transformation]) {
      fail(`card ${card.id} has instruction ${card.instruction} for ${card.transformation}`);
    }
    if (!Number.isInteger(card.baseId) || card.baseId < 1 || card.baseId > EXPECTED_BASE_COUNT) {
      fail(`card ${card.id} has invalid baseId ${card.baseId}`);
    }
    baseIds.add(card.baseId);

    for (const field of ['prompt', 'answer', 'rule', 'promptType', 'answerType', 'grammarFamily']) {
      if (typeof card[field] !== 'string' || !card[field].trim()) {
        fail(`card ${card.id} has empty ${field}`);
      }
    }
    if (!/^[A-Z]/.test(card.prompt)) fail(`card ${card.id} prompt is not capitalized`);
    if (!/[.?!]$/.test(card.prompt)) fail(`card ${card.id} prompt has no terminal punctuation`);
    if (!/[.?!]$/.test(card.answer)) fail(`card ${card.id} answer has no terminal punctuation`);
    if (/\s\/\s/.test(card.answer)) fail(`card ${card.id} answer contains multiple alternatives`);
    if (!Array.isArray(card.sourceWords) || card.sourceWords.length === 0) {
      fail(`card ${card.id} has no sourceWords`);
    }
    if (card.answerContraction) {
      if (!Object.prototype.hasOwnProperty.call(answerForms, card.answerContraction)) {
        fail(`card ${card.id} has invalid answerContraction ${card.answerContraction}`);
      }
      answerForms[card.answerContraction] += 1;
    }

    const completePrompt = `${card.prompt} (${card.instruction})`;
    if (prompts.has(completePrompt)) fail(`duplicate complete prompt: ${completePrompt}`);
    prompts.add(completePrompt);
  });

  for (const category of Object.keys(CATEGORIES)) {
    if (categoryCounts[category] !== 25) {
      fail(`category ${category} must contain 25 cards, found ${categoryCounts[category] || 0}`);
    }
  }
  for (const transformation of TRANSFORMATIONS) {
    if (transformationCounts[transformation] !== 50) {
      fail(`transformation ${transformation} must contain 50 cards, found ${transformationCounts[transformation] || 0}`);
    }
  }
  if (baseIds.size !== EXPECTED_BASE_COUNT) {
    fail(`expected ${EXPECTED_BASE_COUNT} base sentence ids, found ${baseIds.size}`);
  }
  if (answerForms.contracted !== 25 || answerForms.expanded !== 25) {
    fail(`negative answers must mix 25 contracted and 25 expanded forms, found ${answerForms.contracted} and ${answerForms.expanded}`);
  }
}

function jsValue(value) {
  return JSON.stringify(value);
}

function buildModule(data) {
  const cards = data.cards.map((card) => ({
    id: card.id,
    baseId: card.baseId,
    category: card.category,
    grammarFamily: card.grammarFamily,
    transformation: card.transformation,
    promptType: card.promptType,
    answerType: card.answerType,
    instruction: card.instruction,
    prompt: card.prompt,
    answer: card.answer,
    sourceWords: card.sourceWords,
    rule: card.rule,
    promptContraction: card.promptContraction,
    answerContraction: card.answerContraction
  }));

  return `// AUTO-GENERATED from data/grammar-transformation-cards.json by
// scripts/build-grammar-transformation-seed.mjs. Do not edit this file by hand.

/** WordGo Data Sheet spreadsheet used by the grammar transformation cards. */
var GRAMMAR_TRANSFORMATION_SPREADSHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';

/** Worksheet created inside WordGo Data Sheet. */
var GRAMMAR_TRANSFORMATION_SHEET_NAME = '文法句型轉換';

/** Tag used by the frontend to identify grammar transformation flashcards. */
var GRAMMAR_TRANSFORMATION_TAG = '文法轉換';

/** Human-readable category labels stored in worksheet columns H and K. */
var GRAMMAR_TRANSFORMATION_CATEGORY_LABELS = {
  'be-affirmative-to-negative': 'BE肯定→否定',
  'be-affirmative-to-question': 'BE肯定→疑問',
  'be-negative-to-question': 'BE否定→疑問',
  'be-question-to-affirmative': 'BE疑問→肯定',
  'do-affirmative-to-negative': 'DoDoes肯定→否定',
  'do-affirmative-to-question': 'DoDoes肯定→疑問',
  'do-negative-to-question': 'DoDoes否定→疑問',
  'do-question-to-affirmative': 'DoDoes疑問→肯定'
};

/** The 200 canonical cards. The JSON file remains the source of truth. */
var GRAMMAR_TRANSFORMATION_CARDS = ${JSON.stringify(cards, null, 2).split('\n').join('\n')};

/**
 * Return the instruction shown beside a transformation prompt.
 * @param {Object|string} card - Card object or transformation category
 * @returns {string} Chinese instruction
 */
function getGrammarTransformationInstruction_(card) {
  if (card && typeof card === 'object' && card.instruction) return card.instruction;
  var transformation = typeof card === 'string' ? card : (card && card.transformation);
  if (transformation === 'affirmative-to-negative') return '轉成否定句';
  if (transformation === 'affirmative-to-question' || transformation === 'negative-to-question') return '轉成疑問句';
  if (transformation === 'question-to-affirmative') return '轉成肯定句';
  return '轉成句型';
}

/**
 * Build worksheet rows in the existing WordGo A-I vocabulary schema.
 * Columns J-L add source words, category, and a grammar rule for teachers.
 * @returns {Array<Array<*>>} 200 worksheet rows
 */
function buildGrammarTransformationRows_() {
  return GRAMMAR_TRANSFORMATION_CARDS.map(function(card) {
    var instruction = getGrammarTransformationInstruction_(card);
    var categoryLabel = GRAMMAR_TRANSFORMATION_CATEGORY_LABELS[card.category] || '句型轉換';
    return [
      0,                                                    // A: 不啟用拼字標記
      card.prompt + ' (' + instruction + ')',               // B: 題目（肯定句 + 指示）
      card.answer,                                          // C: 答案（否定句或疑問句）
      '',                                                   // D: 不熟程度
      '',                                                   // E: 圖片 URL
      '',                                                   // F: 圖片公式
      '',                                                   // G: 最後複習日期
      GRAMMAR_TRANSFORMATION_TAG + ',' + categoryLabel,     // H: 標籤
      '',                                                   // I: KK 音標
      card.sourceWords.join(', '),                          // J: 單字庫來源字
      categoryLabel,                                        // K: 轉換類型
      card.rule                                             // L: 文法重點
    ];
  });
}

/**
 * Create or update the grammar transformation worksheet in WordGo Data Sheet.
 * Safe to run repeatedly: the worksheet is replaced with the canonical 200 rows.
 * The trailing underscore keeps this administrative function out of the anonymous
 * Web App's google.script.run surface.
 * @returns {Object} { success, sheetName, rowCount, spreadsheetName?, error? }
 */
function seedGrammarTransformationSheet_() {
  try {
    var spreadsheet = SpreadsheetApp.openById(GRAMMAR_TRANSFORMATION_SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(GRAMMAR_TRANSFORMATION_SHEET_NAME);
    if (!sheet) sheet = spreadsheet.insertSheet(GRAMMAR_TRANSFORMATION_SHEET_NAME);

    sheet.clearContents();
    sheet.getRange(1, 1, 1, 12).setValues([[
      '', '題目', '答案', '不熟程度', '圖片URL', '圖片', '最後複習日期',
      '標籤', 'KK音標', '來源單字', '轉換類型', '文法重點'
    ]]);
    sheet.getRange(1, 1).setValue(GRAMMAR_TRANSFORMATION_CARDS.length);

    var rows = buildGrammarTransformationRows_();
    sheet.getRange(2, 1, rows.length, 12).setValues(rows);
    sheet.setFrozenRows(1);
    var headerRange = sheet.getRange(1, 1, 1, 12);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#fff2cc');
    var contentRange = sheet.getRange(2, 2, rows.length, 11);
    contentRange.setWrap(true);
    contentRange.setVerticalAlignment('top');
    sheet.setColumnWidth(1, 70);
    sheet.setColumnWidth(2, 420);
    sheet.setColumnWidth(3, 420);
    sheet.setColumnWidth(4, 90);
    sheet.setColumnWidth(5, 180);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 130);
    sheet.setColumnWidth(8, 190);
    sheet.setColumnWidth(9, 100);
    sheet.setColumnWidth(10, 180);
    sheet.setColumnWidth(11, 120);
    sheet.setColumnWidth(12, 360);

    console.log('Seeded', rows.length, 'cards in', GRAMMAR_TRANSFORMATION_SHEET_NAME);
    return {
      success: true,
      spreadsheetName: spreadsheet.getName(),
      sheetName: GRAMMAR_TRANSFORMATION_SHEET_NAME,
      rowCount: rows.length
    };
  } catch (error) {
    console.error('seedGrammarTransformationSheet_ failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify that the seeded worksheet exists and contains the expected cards.
 * @returns {Object} { success, sheetName, rowCount, a1Count, error? }
 */
function getGrammarTransformationSheetStatus_() {
  try {
    var spreadsheet = SpreadsheetApp.openById(GRAMMAR_TRANSFORMATION_SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(GRAMMAR_TRANSFORMATION_SHEET_NAME);
    if (!sheet) {
      return { success: false, error: '找不到工作表：' + GRAMMAR_TRANSFORMATION_SHEET_NAME };
    }

    var lastRow = sheet.getLastRow();
    var rowCount = Math.max(0, lastRow - 1);
    var a1Count = sheet.getRange(1, 1).getValue();
    return {
      success: rowCount === GRAMMAR_TRANSFORMATION_CARDS.length && a1Count === GRAMMAR_TRANSFORMATION_CARDS.length,
      spreadsheetName: spreadsheet.getName(),
      sheetName: GRAMMAR_TRANSFORMATION_SHEET_NAME,
      rowCount: rowCount,
      a1Count: a1Count
    };
  } catch (error) {
    console.error('getGrammarTransformationSheetStatus_ failed:', error);
    return { success: false, error: error.message };
  }
}
`;
}

const raw = fs.readFileSync(DATA_PATH, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  fail(`invalid JSON in ${DATA_PATH}: ${error.message}`);
}

validateCards(data);
const output = buildModule(data);
fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
console.log(`Wrote ${OUTPUT_PATH} (${data.cards.length} cards)`);
