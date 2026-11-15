#!/usr/bin/env node
/**
 * Generate the canonical 200-card grammar-transformation dataset.
 *
 * Each of 50 source sentences produces four deliberately mixed transformations:
 *   affirmative → negative
 *   affirmative → question
 *   negative    → question
 *   question    → affirmative
 *
 * The output JSON is the canonical artifact committed to the repository. This
 * generator exists so the 200 related cards can be audited and reproduced.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'data', 'grammar-transformation-cards.json');

const BE_BASES = [
  { subject: 'I', be: 'am', complement: 'tired', sourceWords: ['tired'] },
  { subject: 'You', be: 'are', complement: 'hungry', sourceWords: ['hungry'] },
  { subject: 'He', be: 'is', complement: 'angry', sourceWords: ['angry'] },
  { subject: 'She', be: 'is', complement: 'a nurse', sourceWords: ['nurse'] },
  { subject: 'It', be: 'is', complement: 'sunny', sourceWords: ['sunny'] },
  { subject: 'We', be: 'are', complement: 'busy', sourceWords: ['busy'] },
  { subject: 'They', be: 'are', complement: 'free', sourceWords: ['free'] },
  { subject: 'My brother', be: 'is', complement: 'tall', sourceWords: ['brother', 'tall'] },
  { subject: 'My grandma', be: 'is', complement: 'sick', sourceWords: ['grandmother (grandma)', 'sick'] },
  { subject: 'The doctor', be: 'is', complement: 'tired', sourceWords: ['doctor', 'tired'] },
  { subject: 'The weather', be: 'is', complement: 'wet', sourceWords: ['weather', 'wet'] },
  { subject: 'The eggs', be: 'are', complement: 'fresh', sourceWords: ['egg', 'fresh'] },
  { subject: 'The juice', be: 'is', complement: 'delicious', sourceWords: ['juice', 'delicious'] },
  { subject: 'My shoes', be: 'are', complement: 'dirty', sourceWords: ['shoes', 'dirty'] },
  { subject: 'My clothes', be: 'are', complement: 'clean', sourceWords: ['clothes', 'clean'] },
  { subject: 'The picture', be: 'is', complement: 'beautiful', sourceWords: ['picture', 'beautiful'] },
  { subject: 'The music', be: 'is', complement: 'loud', sourceWords: ['music', 'loud'] },
  { subject: 'The robot', be: 'is', complement: 'friendly', sourceWords: ['robot', 'friendly'] },
  { subject: 'The duck', be: 'is', complement: 'angry', sourceWords: ['duck', 'angry'] },
  { subject: 'The vegetable', be: 'is', complement: 'raw', sourceWords: ['vegetable', 'raw'] },
  { subject: 'The camera', be: 'is', complement: 'heavy', sourceWords: ['camera', 'heavy'] },
  { subject: 'The bike', be: 'is', complement: 'old', sourceWords: ['bike', 'old'] },
  { subject: 'The computer', be: 'is', complement: 'slow', sourceWords: ['computer', 'slow'] },
  { subject: 'The story', be: 'is', complement: 'sad', sourceWords: ['story', 'sad'] },
  { subject: 'The game', be: 'is', complement: 'wonderful', sourceWords: ['game', 'wonderful'] }
];

const DO_BASES = [
  { subject: 'I', verb: 'study', thirdVerb: 'studies', complement: 'Chinese', sourceWords: ['study', 'Chinese'] },
  { subject: 'You', verb: 'clean', thirdVerb: 'cleans', complement: 'your bedroom', sourceWords: ['bedroom', 'clean'] },
  { subject: 'He', verb: 'study', thirdVerb: 'studies', complement: 'math', sourceWords: ['study', 'math'] },
  { subject: 'She', verb: 'buy', thirdVerb: 'buys', complement: 'bread', sourceWords: ['buy', 'bread'] },
  { subject: 'We', verb: 'dance', thirdVerb: 'dance', complement: 'at the party', sourceWords: ['dance'] },
  { subject: 'They', verb: 'draw', thirdVerb: 'draw', complement: 'a robot', sourceWords: ['draw', 'robot'] },
  { subject: 'Tom', verb: 'swim', thirdVerb: 'swims', complement: 'on Monday', sourceWords: ['swim', 'Monday'] },
  { subject: 'Amy', verb: 'jump', thirdVerb: 'jumps', complement: 'on Sunday', sourceWords: ['jump', 'Sunday'] },
  { subject: 'I', verb: 'cook', thirdVerb: 'cooks', complement: 'dinner', sourceWords: ['cook'] },
  { subject: 'You', verb: 'wait', thirdVerb: 'waits', complement: 'in the garden', sourceWords: ['wait', 'garden'] },
  { subject: 'He', verb: 'walk', thirdVerb: 'walks', complement: 'to the library', sourceWords: ['walk', 'library'] },
  { subject: 'She', verb: 'call', thirdVerb: 'calls', complement: 'her grandma', sourceWords: ['call', 'grandmother (grandma)'] },
  { subject: 'We', verb: 'visit', thirdVerb: 'visit', complement: 'the library', sourceWords: ['visit', 'library'] },
  { subject: 'They', verb: 'laugh', thirdVerb: 'laugh', complement: 'at the clown', sourceWords: ['laugh', 'clown'] },
  { subject: 'I', verb: 'smile', thirdVerb: 'smiles', complement: 'at the robot', sourceWords: ['smile', 'robot'] },
  { subject: 'You', verb: 'answer', thirdVerb: 'answers', complement: 'the question', sourceWords: ['answer', 'question'] },
  { subject: 'He', verb: 'catch', thirdVerb: 'catches', complement: 'the rabbit', sourceWords: ['catch', 'rabbit'] },
  { subject: 'She', verb: 'feel', thirdVerb: 'feels', complement: 'sick today', sourceWords: ['feel', 'sick'] },
  { subject: 'We', verb: 'keep', thirdVerb: 'keep', complement: 'the computer clean', sourceWords: ['keep', 'clean', 'computer'] },
  { subject: 'They', verb: 'move', thirdVerb: 'move', complement: 'the heavy rock', sourceWords: ['move', 'heavy', 'rock'] },
  { subject: 'I', verb: 'pay', thirdVerb: 'pays', complement: 'for the camera', sourceWords: ['pay', 'camera'] },
  { subject: 'You', verb: 'pick', thirdVerb: 'picks', complement: 'the fruit', sourceWords: ['pick', 'fruit'] },
  { subject: 'He', verb: 'push', thirdVerb: 'pushes', complement: 'the heavy door', sourceWords: ['push', 'heavy', 'door'] },
  { subject: 'She', verb: 'stay', thirdVerb: 'stays', complement: 'in the library tonight', sourceWords: ['stay', 'library'] },
  { subject: 'We', verb: 'talk', thirdVerb: 'talk', complement: 'about the game', sourceWords: ['talk', 'game'] }
];

const DIRECTIONS = [
  {
    key: 'affirmative-to-negative',
    promptType: 'affirmative',
    answerType: 'negative',
    instruction: '轉成否定句'
  },
  {
    key: 'affirmative-to-question',
    promptType: 'affirmative',
    answerType: 'question',
    instruction: '轉成疑問句'
  },
  {
    key: 'negative-to-question',
    promptType: 'negative',
    answerType: 'question',
    instruction: '轉成疑問句'
  },
  {
    key: 'question-to-affirmative',
    promptType: 'question',
    answerType: 'affirmative',
    instruction: '轉成肯定句'
  }
];

function lowerFirst(text) {
  if (!text) return text;
  if (text === 'I') return 'I';
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function beAuxiliary(be) {
  if (be === 'am') return 'Am';
  if (be === 'are') return 'Are';
  return 'Is';
}

function beAffirmative(base) {
  return `${base.subject} ${base.be} ${base.complement}.`;
}

function beNegative(base, contracted) {
  if (!contracted) return `${base.subject} ${base.be} not ${base.complement}.`;
  if (base.be === 'am') return `I'm not ${base.complement}.`;
  if (base.be === 'are') return `${base.subject} aren't ${base.complement}.`;
  return `${base.subject} isn't ${base.complement}.`;
}

function beQuestion(base) {
  return `${beAuxiliary(base.be)} ${lowerFirst(base.subject)} ${base.complement}?`;
}

function doUsesDo(base) {
  return ['I', 'You', 'We', 'They'].indexOf(base.subject) !== -1;
}

function doAffirmative(base) {
  const verb = doUsesDo(base) ? base.verb : base.thirdVerb;
  return `${base.subject} ${verb} ${base.complement}.`;
}

function doNegative(base, contracted) {
  const auxiliary = doUsesDo(base) ? 'do' : 'does';
  const negativeAuxiliary = contracted
    ? (auxiliary === 'do' ? "don't" : "doesn't")
    : `${auxiliary} not`;
  return `${base.subject} ${negativeAuxiliary} ${base.verb} ${base.complement}.`;
}

function doQuestion(base) {
  const auxiliary = doUsesDo(base) ? 'Do' : 'Does';
  return `${auxiliary} ${lowerFirst(base.subject)} ${base.verb} ${base.complement}?`;
}

function buildRule(family, direction) {
  if (family === 'be') {
    if (direction === 'affirmative-to-negative') return 'BE 動詞後加入 not；其餘部分不變';
    if (direction === 'affirmative-to-question') return 'BE 疑問句：Am/Is/Are + 主詞 + 原句其餘部分';
    if (direction === 'negative-to-question') return '否定句改疑問句：移除 not，把 be 動詞移到句首';
    return '疑問句改肯定句：還原與主詞一致的 be 動詞';
  }
  if (direction === 'affirmative-to-negative') return '否定句：do/does not + 原形動詞；第三人稱單數用 does not';
  if (direction === 'affirmative-to-question') return 'Do/Does 疑問句：Do/Does + 主詞 + 原形動詞';
  if (direction === 'negative-to-question') return '否定句改疑問句：移除 do/does not，把 Do/Does 移到句首，動詞用原形';
  return '疑問句改肯定句：還原第三人稱單數的 -s 動詞形式';
}

const cards = [];
let baseId = 0;

function appendBase(base, family) {
  baseId += 1;
  const affirmative = family === 'be' ? beAffirmative(base) : doAffirmative(base);
  const question = family === 'be' ? beQuestion(base) : doQuestion(base);
  const makeNegative = family === 'be' ? beNegative : doNegative;

  // Each source sentence contributes one contracted and one expanded negative
  // sentence. This keeps both forms visible without putting both in one answer.
  const firstNegativeContracted = baseId % 2 === 0;
  const secondNegativeContracted = !firstNegativeContracted;

  DIRECTIONS.forEach((direction, directionIndex) => {
    let prompt = affirmative;
    let answer = '';
    let promptContraction = null;
    let answerContraction = null;

    if (direction.key === 'affirmative-to-negative') {
      answerContraction = firstNegativeContracted ? 'contracted' : 'expanded';
      answer = makeNegative(base, firstNegativeContracted);
    } else if (direction.key === 'affirmative-to-question') {
      answer = question;
    } else if (direction.key === 'negative-to-question') {
      promptContraction = secondNegativeContracted ? 'contracted' : 'expanded';
      prompt = makeNegative(base, secondNegativeContracted);
      answer = question;
    } else {
      prompt = question;
      answer = affirmative;
    }

    cards.push({
      id: cards.length + 1,
      baseId,
      category: `${family}-${direction.key}`,
      grammarFamily: family,
      transformation: direction.key,
      promptType: direction.promptType,
      answerType: direction.answerType,
      instruction: direction.instruction,
      prompt,
      answer,
      sourceWords: base.sourceWords.slice(),
      rule: buildRule(family, direction.key),
      promptContraction,
      answerContraction,
      directionOrder: directionIndex
    });
  });
}

// Alternate BE and Do/Does bases, then shuffle deterministically so the sheet
// order mixes transformation directions instead of presenting four blocks.
let beIndex = 0;
let doIndex = 0;
for (let index = 0; index < BE_BASES.length; index++) {
  if (index % 2 === 0) {
    appendBase(BE_BASES[beIndex++], 'be');
    if (doIndex < DO_BASES.length) appendBase(DO_BASES[doIndex++], 'do');
  } else {
    appendBase(DO_BASES[doIndex++], 'do');
    appendBase(BE_BASES[beIndex++], 'be');
  }
}

function seededShuffle(items, seed) {
  const result = items.slice();
  let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

const shuffled = seededShuffle(cards, 20261115);
shuffled.forEach((card, index) => {
  card.id = index + 1;
  delete card.directionOrder;
});

const output = {
  schemaVersion: 2,
  title: 'BE 動詞與 Do/Does 混合句型轉換',
  sourceSheet: '單字庫',
  generation: {
    baseSentenceCount: 50,
    transformationsPerBase: 4,
    totalCards: 200,
    contractionPolicy: '每題只顯示一個答案；否定句在縮寫與完整形式之間混合'
  },
  cards: shuffled
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUTPUT_PATH} (${output.cards.length} cards)`);
