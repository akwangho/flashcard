# Grammar Quiz Specification

## Purpose

Defines the grammar quiz: how questions are generated from the loaded word bank, the four question types, the 10-question draw, and the answer flow.

## Requirements

### Requirement: Grammar Quiz Entry and Question Types

The system SHALL offer a grammar quiz from the 測驗 menu and SHALL let the user pick a question type before answering.

#### Scenario: Entry point

- **WHEN** the user taps 「📐 文法測驗」 in the 測驗 menu
- **THEN** the grammar quiz modal opens on a type-selection screen listing 是非題 / 填空選擇題 / 選擇題 / 中翻英 / 混合題型, and the flashcard carousel pauses

#### Scenario: Type selection

- **WHEN** the user picks a question type
- **THEN** a quiz of 10 questions of that type starts, and the answer screen shows the question index, the running score, the grammar focus label, the question, and its options

### Requirement: Question Source

The system SHALL build the grammar questions from the words of the 「單字庫」 and 「五上單字」 worksheets.

#### Scenario: Source worksheets

- **WHEN** a grammar quiz starts
- **THEN** the question pool is built from the loaded words whose sheet name is in `APP_CONSTANTS.GRAMMAR_QUIZ_SOURCE_SHEETS` (單字庫、五上單字); if none of them are loaded, the pool falls back to every loaded word
- **AND** a word is only used when its English form is present in that source (word-form lists such as `eat; ate; eaten` also match their base form)

#### Scenario: Vocabulary roles

- **WHEN** the pool is built
- **THEN** each usable word is assigned a grammar role — BE-complement noun, singular/plural noun, adjective, or transitive/intransitive verb — and only the words present in the source are used

### Requirement: Grammar Coverage

The system SHALL cover BE verbs, the Do/Does auxiliary, and the affirmative→negative/question transformation of general verbs, including singular/plural agreement.

#### Scenario: Grammar focus

- **WHEN** a question is generated
- **THEN** it targets exactly one focus: BE verb (`am` / `is` / `are`), plural agreement (`are` + plural subject), the `Do` / `Don't` auxiliary, or the third-person singular (`Does` / `doesn't` + `-s`)
- **AND** the four focuses are drawn in rotation so every pool covers all of them

#### Scenario: Correct sentences

- **GIVEN** a generated sentence item
- **THEN** its affirmative, negative, and question forms are all grammatically correct — e.g. `She likes pizza.` / `She doesn't like pizza.` / `Does she like pizza?`, and `They are happy.` / `They aren't happy.` / `Are they happy?`

### Requirement: Question Pool Size and Random Draw

The system SHALL design 100 questions per question type and draw 10 of them at random for each quiz.

#### Scenario: Pool and draw

- **WHEN** a question type is selected
- **THEN** a pool of `APP_CONSTANTS.GRAMMAR_QUIZ_POOL_SIZE` (100) questions of that type is built, shuffled, and the first `APP_CONSTANTS.GRAMMAR_QUIZ_QUESTION_COUNT` (10) are used
- **AND** the mixed type draws its 10 questions from all four types

### Requirement: Question Formats

The system SHALL support the four question formats below.

#### Scenario: True/False

- **WHEN** a 是非題 is shown
- **THEN** one English sentence is displayed with two options 「✅ 正確 (True)」 / 「❌ 錯誤 (False)」; the sentence is either correct or contains exactly one grammar error (wrong BE verb, wrong auxiliary, missing `-s`, missing auxiliary, …)

#### Scenario: Fill in the blank

- **WHEN** a 填空選擇題 is shown
- **THEN** the sentence has one blank and four options — `am` / `is` / `are` / `was` for a BE-verb blank, or the verb forms (third person, base, past, `-ing`) for a verb blank — with exactly one correct option

#### Scenario: Multiple choice

- **WHEN** a 選擇題 is shown
- **THEN** an affirmative English sentence is shown together with the instruction 「把這句話改成否定句／疑問句，哪一句正確？」 and four options whose distractors are the classic grammar mistakes (wrong BE verb, wrong auxiliary, missing auxiliary, extra `-s`, swapped subject and verb)

#### Scenario: Chinese to English

- **WHEN** a 中翻英 question is shown
- **THEN** the Chinese sentence is displayed and four English sentences are offered, of which exactly one is correct and the others are ungrammatical

### Requirement: Answer Flow and Feedback

The system SHALL guide the user through answering and explain every answer.

#### Scenario: Feedback

- **WHEN** the user answers
- **THEN** the chosen option is marked correct (green) or wrong (red), the correct option is highlighted, and the feedback shows the rule that applies (e.g. 「第三人稱單數（play → plays）：肯定句用 plays，否定句與疑問句要用原形 play」)
- **AND** a correct English question is spoken aloud when voice is enabled

#### Scenario: Results

- **WHEN** all 10 questions are answered
- **THEN** the result screen shows the percentage score, the correct/wrong counts, the shared encouragement message, and a wrong-answer review listing the question, the chosen answer, and the correct answer

#### Scenario: Navigation

- **WHEN** the user taps 「← 換題型」, 「再來一次」, or 「結束」
- **THEN** the app respectively returns to the type-selection screen, rebuilds 10 new questions of the same type, or closes the modal
