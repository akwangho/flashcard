#!/usr/bin/env node
/**
 * Validate the canonical 200-card grammar-transformation dataset against the
 * live 「單字庫」 worksheet and the BE / Do-Does transformation rules.
 *
 * Usage:
 *   node scripts/validate-grammar-transformation-cards.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'grammar-transformation-cards.json');
const SPREADSHEET_ID = '1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM';
const SOURCE_SHEET_NAME = '單字庫';
const SOURCE_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
const EXPECTED_CARD_COUNT = 200;
const EXPECTED_BASE_COUNT = 50;
const EXPECTED_CATEGORY_COUNT = 25;

const TRANSFORMATIONS = [
  'affirmative-to-negative',
  'affirmative-to-question',
  'negative-to-question',
  'question-to-affirmative'
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function loadSourceWords() {
  const response = await fetch(SOURCE_CSV_URL);
  if (!response.ok) {
    throw new Error(`無法讀取「${SOURCE_SHEET_NAME}」：HTTP ${response.status}`);
  }
  const rows = parseCsv(await response.text());
  const words = new Set();
  rows.slice(1).forEach((row) => {
    if (row[1] && row[1].trim()) words.add(row[1].trim().toLowerCase());
  });
  return words;
}

function lowerFirst(text) {
  if (!text || text === 'I') return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function deinflectThirdPerson(verb) {
  if (/ies$/i.test(verb)) return verb.replace(/ies$/i, 'y');
  if (/(ches|shes|sses|xes|zes)$/i.test(verb)) return verb.replace(/es$/i, '');
  if (/s$/i.test(verb)) return verb.replace(/s$/i, '');
  return verb;
}

function parseBase(family, affirmative) {
  if (family === 'be') {
    const match = affirmative.match(/^([A-Z][A-Za-z' ]*?) (am|is|are) (.+)\.$/);
    if (!match) return null;
    return {
      subject: match[1],
      be: match[2].toLowerCase(),
      complement: match[3]
    };
  }
  const match = affirmative.match(/^([A-Z][A-Za-z']*) ([A-Za-z]+) (.+)\.$/);
  if (!match) return null;
  const subject = match[1];
  const promptVerb = match[2];
  const usesDo = ['I', 'You', 'We', 'They'].indexOf(subject) !== -1;
  return {
    subject,
    usesDo,
    verb: usesDo ? promptVerb.toLowerCase() : deinflectThirdPerson(promptVerb),
    thirdVerb: promptVerb,
    complement: match[3]
  };
}

function expectedNegative(family, base, form) {
  if (family === 'be') {
    if (form === 'expanded') return `${base.subject} ${base.be} not ${base.complement}.`;
    if (base.be === 'am') return `I'm not ${base.complement}.`;
    if (base.be === 'are') return `${base.subject} aren't ${base.complement}.`;
    return `${base.subject} isn't ${base.complement}.`;
  }
  if (form === 'expanded') {
    return `${base.subject} ${base.usesDo ? 'do not' : 'does not'} ${base.verb} ${base.complement}.`;
  }
  return `${base.subject} ${base.usesDo ? "don't" : "doesn't"} ${base.verb} ${base.complement}.`;
}

function expectedQuestion(family, base) {
  if (family === 'be') {
    const auxiliary = base.be === 'am' ? 'Am' : base.be === 'are' ? 'Are' : 'Is';
    return `${auxiliary} ${lowerFirst(base.subject)} ${base.complement}?`;
  }
  return `${base.usesDo ? 'Do' : 'Does'} ${lowerFirst(base.subject)} ${base.verb} ${base.complement}?`;
}

function expectedAffirmative(family, base) {
  if (family === 'be') return `${base.subject} ${base.be} ${base.complement}.`;
  return `${base.subject} ${base.usesDo ? base.verb : base.thirdVerb} ${base.complement}.`;
}

function validateCardMetadata(card, errors) {
  const label = `card ${card.id}`;
  const requiredFields = [
    'baseId', 'category', 'grammarFamily', 'transformation', 'promptType',
    'answerType', 'instruction', 'prompt', 'answer', 'sourceWords', 'rule'
  ];
  requiredFields.forEach((field) => {
    if (card[field] === undefined || card[field] === null || card[field] === '') {
      errors.push(`${label}: missing ${field}`);
    }
  });

  if (!/^[A-Z]/.test(card.prompt || '')) errors.push(`${label}: prompt is not capitalized`);
  if (!/[.?!]$/.test(card.prompt || '')) errors.push(`${label}: prompt has no terminal punctuation`);
  if (!/[.?!]$/.test(card.answer || '')) errors.push(`${label}: answer has no terminal punctuation`);
  if (/\s\/\s/.test(card.answer || '')) errors.push(`${label}: answer shows multiple alternatives: ${card.answer}`);
  if (/\(轉成/.test(card.prompt || '')) errors.push(`${label}: prompt must not embed the instruction`);
  if (!Array.isArray(card.sourceWords) || card.sourceWords.length === 0) {
    errors.push(`${label}: sourceWords must be a non-empty array`);
  }
}

function validateBaseSet(baseId, cards, sourceWords, errors) {
  const label = `base ${baseId}`;
  if (cards.length !== 4) {
    errors.push(`${label}: expected 4 transformations, found ${cards.length}`);
    return;
  }
  const byTransformation = {};
  cards.forEach((card) => {
    byTransformation[card.transformation] = card;
    validateCardMetadata(card, errors);
    (card.sourceWords || []).forEach((sourceWord) => {
      if (!sourceWords.has(String(sourceWord).toLowerCase())) {
        errors.push(`card ${card.id}: source word not found in ${SOURCE_SHEET_NAME}: ${sourceWord}`);
      }
    });
  });

  TRANSFORMATIONS.forEach((transformation) => {
    if (!byTransformation[transformation]) errors.push(`${label}: missing ${transformation}`);
  });
  if (Object.keys(byTransformation).length !== 4) return;

  const affirmativeCard = byTransformation['affirmative-to-question'];
  const negativeCard = byTransformation['affirmative-to-negative'];
  const negativeToQuestionCard = byTransformation['negative-to-question'];
  const questionToAffirmativeCard = byTransformation['question-to-affirmative'];
  const family = affirmativeCard.grammarFamily;
  const base = parseBase(family, affirmativeCard.prompt);
  if (!base) {
    errors.push(`${label}: cannot parse affirmative sentence: ${affirmativeCard.prompt}`);
    return;
  }

  const affirmative = expectedAffirmative(family, base);
  const question = expectedQuestion(family, base);
  const firstNegative = expectedNegative(family, base, negativeCard.answerContraction);
  const secondNegative = expectedNegative(family, base, negativeToQuestionCard.promptContraction);

  if (affirmativeCard.prompt !== affirmative) errors.push(`${label}: affirmative prompt mismatch`);
  if (negativeCard.prompt !== affirmative) errors.push(`${label}: affirmative-to-negative prompt mismatch`);
  if (negativeCard.answer !== firstNegative) {
    errors.push(`card ${negativeCard.id}: negative answer mismatch: ${negativeCard.answer}`);
  }
  if (affirmativeCard.answer !== question) errors.push(`card ${affirmativeCard.id}: question answer mismatch`);
  if (negativeToQuestionCard.prompt !== secondNegative) {
    errors.push(`card ${negativeToQuestionCard.id}: negative prompt mismatch: ${negativeToQuestionCard.prompt}`);
  }
  if (negativeToQuestionCard.answer !== question) {
    errors.push(`card ${negativeToQuestionCard.id}: question answer mismatch`);
  }
  if (questionToAffirmativeCard.prompt !== question) {
    errors.push(`card ${questionToAffirmativeCard.id}: question prompt mismatch`);
  }
  if (questionToAffirmativeCard.answer !== affirmative) {
    errors.push(`card ${questionToAffirmativeCard.id}: affirmative answer mismatch`);
  }
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const sourceWords = await loadSourceWords();
const errors = [];

if (data.schemaVersion !== 2) errors.push(`expected schemaVersion 2, found ${data.schemaVersion}`);
if (!Array.isArray(data.cards) || data.cards.length !== EXPECTED_CARD_COUNT) {
  errors.push(`expected ${EXPECTED_CARD_COUNT} cards, found ${data.cards ? data.cards.length : 0}`);
}

const ids = new Set();
const completePrompts = new Set();
const categoryCounts = {};
const transformationCounts = {};
const familyCounts = {};
const answerForms = { contracted: 0, expanded: 0 };
const baseSets = new Map();
(data.cards || []).forEach((card, index) => {
  if (card.id !== index + 1) errors.push(`card ${index + 1} has id ${card.id}`);
  if (ids.has(card.id)) errors.push(`duplicate id ${card.id}`);
  ids.add(card.id);

  const completePrompt = `${card.prompt} (${card.instruction})`;
  if (completePrompts.has(completePrompt)) errors.push(`duplicate complete prompt: ${completePrompt}`);
  completePrompts.add(completePrompt);

  categoryCounts[card.category] = (categoryCounts[card.category] || 0) + 1;
  transformationCounts[card.transformation] = (transformationCounts[card.transformation] || 0) + 1;
  familyCounts[card.grammarFamily] = (familyCounts[card.grammarFamily] || 0) + 1;
  if (card.answerContraction) answerForms[card.answerContraction] += 1;

  if (!baseSets.has(card.baseId)) baseSets.set(card.baseId, []);
  baseSets.get(card.baseId).push(card);
});

Object.keys(categoryCounts).sort().forEach((category) => {
  if (categoryCounts[category] !== EXPECTED_CATEGORY_COUNT) {
    errors.push(`category ${category} has ${categoryCounts[category]} cards; expected ${EXPECTED_CATEGORY_COUNT}`);
  }
});
TRANSFORMATIONS.forEach((transformation) => {
  if (transformationCounts[transformation] !== 50) {
    errors.push(`transformation ${transformation} has ${transformationCounts[transformation] || 0} cards; expected 50`);
  }
});
if (familyCounts.be !== 100 || familyCounts.do !== 100) {
  errors.push(`expected 100 BE and 100 Do/Does cards, found ${familyCounts.be || 0} and ${familyCounts.do || 0}`);
}
if (answerForms.contracted !== 25 || answerForms.expanded !== 25) {
  errors.push(`expected 25 contracted and 25 expanded negative answers, found ${answerForms.contracted} and ${answerForms.expanded}`);
}
if (baseSets.size !== EXPECTED_BASE_COUNT) {
  errors.push(`expected ${EXPECTED_BASE_COUNT} base sentence sets, found ${baseSets.size}`);
}
baseSets.forEach((cards, baseId) => validateBaseSet(baseId, cards, sourceWords, errors));

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} issue(s):`);
  errors.slice(0, 100).forEach((error) => console.error(`  - ${error}`));
  if (errors.length > 100) console.error(`  ... and ${errors.length - 100} more`);
  process.exit(1);
}

console.log(`Validated ${data.cards.length} cards against ${SOURCE_SHEET_NAME} (${sourceWords.size} vocabulary entries).`);
console.log('Category counts:', categoryCounts);
console.log('Transformation counts:', transformationCounts);
console.log('Family counts:', familyCounts);
console.log('Negative answer forms:', answerForms);
console.log('All grammar, source-word, instruction, single-answer, and base-set checks passed.');
