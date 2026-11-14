#!/usr/bin/env node
/**
 * Validate the canonical grammar transformation cards against the live
 * 「單字庫」 worksheet and the BE / Do-Does grammar rules.
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

function tokens(text) {
  return (text.match(/[A-Za-z']+/g) || []);
}

function deinflectThirdPerson(verb) {
  if (/ies$/i.test(verb)) return verb.replace(/ies$/i, 'y');
  if (/(ches|shes|sses|xes|zes)$/i.test(verb)) return verb.replace(/es$/i, '');
  if (/s$/i.test(verb)) return verb.replace(/s$/i, '');
  return verb;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function validateCard(card, sourceWords, errors) {
  const cardLabel = `card ${card.id}`;
  const promptTokens = tokens(card.prompt);
  const beIndex = promptTokens.findIndex((token) => /^(am|is|are)$/i.test(token));

  if (card.category.startsWith('be-')) {
    if (beIndex < 1) {
      errors.push(`${cardLabel}: cannot find BE verb in prompt: ${card.prompt}`);
      return;
    }
    const beVerb = promptTokens[beIndex].toLowerCase();
    const subject = promptTokens.slice(0, beIndex).join(' ');

    if (card.category === 'be-negative') {
      if (!new RegExp(`\\b${escapeRegExp(subject)}\\b`, 'i').test(card.answer)) {
        errors.push(`${cardLabel}: negative answer lost subject: ${card.answer}`);
      }
      if (!/\b(?:not|n't)\b/i.test(card.answer)) {
        errors.push(`${cardLabel}: negative answer has no negation: ${card.answer}`);
      }
      if (beVerb === 'am' && /\baren't\b/i.test(card.answer)) {
        errors.push(`${cardLabel}: "I aren't" is not standard English: ${card.answer}`);
      }
    } else {
      const expectedStart = beVerb === 'am' ? 'Am' : beVerb === 'is' ? 'Is' : 'Are';
      if (!new RegExp(`^${expectedStart}\\b`).test(card.answer)) {
        errors.push(`${cardLabel}: question must start with ${expectedStart}: ${card.answer}`);
      }
      if (!new RegExp(`\\b${escapeRegExp(subject)}\\b`, 'i').test(card.answer)) {
        errors.push(`${cardLabel}: question lost subject: ${card.answer}`);
      }
    }
    return;
  }

  if (!card.category.startsWith('do-')) {
    errors.push(`${cardLabel}: unknown category ${card.category}`);
    return;
  }

  const subject = promptTokens[0] || '';
  const promptVerb = promptTokens[1] || '';
  const baseVerb = deinflectThirdPerson(promptVerb);
  const pluralSubject = /^(i|you|we|they)$/i.test(subject);
  const expectedAux = pluralSubject ? 'do' : 'does';

  if (pluralSubject && promptVerb.toLowerCase() !== baseVerb.toLowerCase()) {
    errors.push(`${cardLabel}: plural subject must use base verb: ${card.prompt}`);
  }
  if (!pluralSubject && promptVerb.toLowerCase() === baseVerb.toLowerCase()) {
    errors.push(`${cardLabel}: third-person singular prompt needs inflected verb: ${card.prompt}`);
  }

  if (card.category === 'do-negative') {
    const negativePattern = pluralSubject
      ? new RegExp(`\\b(?:do not|don't)\\s+${escapeRegExp(baseVerb)}\\b`, 'i')
      : new RegExp(`\\b(?:does not|doesn't)\\s+${escapeRegExp(baseVerb)}\\b`, 'i');
    if (!negativePattern.test(card.answer)) {
      errors.push(`${cardLabel}: negative answer must use ${expectedAux} + base verb "${baseVerb}": ${card.answer}`);
    }
  } else {
    const questionPattern = pluralSubject
      ? new RegExp(`^Do\\s+${escapeRegExp(subject)}\\s+${escapeRegExp(baseVerb)}\\b`, 'i')
      : new RegExp(`^Does\\s+${escapeRegExp(subject)}\\s+${escapeRegExp(baseVerb)}\\b`, 'i');
    if (!questionPattern.test(card.answer)) {
      errors.push(`${cardLabel}: question must use ${expectedAux} + subject + base verb "${baseVerb}": ${card.answer}`);
    }
  }

  card.sourceWords.forEach((sourceWord) => {
    if (!sourceWords.has(sourceWord.toLowerCase())) {
      errors.push(`${cardLabel}: source word not found in ${SOURCE_SHEET_NAME}: ${sourceWord}`);
    }
  });
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const sourceWords = await loadSourceWords();
const errors = [];

if (!Array.isArray(data.cards) || data.cards.length !== 100) {
  errors.push(`expected 100 cards, found ${data.cards ? data.cards.length : 0}`);
}

const ids = new Set();
const prompts = new Set();
const answers = new Set();
const categoryCounts = {};
(data.cards || []).forEach((card) => {
  if (ids.has(card.id)) errors.push(`duplicate id ${card.id}`);
  ids.add(card.id);
  if (prompts.has(card.prompt)) errors.push(`duplicate prompt: ${card.prompt}`);
  prompts.add(card.prompt);
  if (answers.has(card.answer)) errors.push(`duplicate answer: ${card.answer}`);
  answers.add(card.answer);
  categoryCounts[card.category] = (categoryCounts[card.category] || 0) + 1;
  validateCard(card, sourceWords, errors);
});

Object.keys(categoryCounts).sort().forEach((category) => {
  if (categoryCounts[category] !== 25) {
    errors.push(`category ${category} has ${categoryCounts[category]} cards; expected 25`);
  }
});

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`Validated ${data.cards.length} cards against ${SOURCE_SHEET_NAME} (${sourceWords.size} vocabulary entries).`);
console.log('Category counts:', categoryCounts);
console.log('All grammar, source-word, uniqueness, and agreement checks passed.');
