# WordGo Data Sheet「單字庫」英文語法標注逐句稽核

## 稽核結論

**PASS：322 個 sentence-like 列已逐列確認，沒有剩餘的錯誤標注、漏標或字元位移問題。**

## 稽核範圍與方法

- 資料來源：[WordGo Data Sheet](https://docs.google.com/spreadsheets/d/1jrpECEaDgtcXawdO9Rl4raHZ_sqmvnUm7x0bJ4IqfRM) → 工作表「單字庫」。
- 擷取時間：2026-11-08 16:25:50（Asia/Taipei；UTC `2026-11-08T08:25:50.219Z`）。
- CSV snapshot：293120 bytes；SHA-256 `90255926126fdc0b522d1514096c48923d3689d43744c55fe88565708e42e9d5`。
- 測試版本：應用程式 `1.27.3`。
- 資料範圍：1236 個非空英文項目，其中 322 個句子、827 個單字、87 個片語。依既有 `getWordType` 規則，只有 sentence-like 列會接受語法標注。
- 檢查方式：以目前正式前端的 `getGrammarAnnotations()` 逐一分析 322 個句子列，核對每個角色範圍、原文字元 offset、重組文字，並人工逐列判讀；不是只檢查抽樣或搜尋結果。
- 驗證結果：322/322 個句子列通過；14 個句子列因固定用法、名詞／形容詞片語或縮寫而沒有可標注的動詞角色，保持純文字是正確結果；錯誤 offset／文字重組數為 0。

## 角色判定

- `verb`（主要動詞）：句中的主要動詞或主要動詞片語。
- `auxiliary`（助動詞）：modal、perfect／phrase do-support，以及 BE + V-ing／被動式中的 BE。
- `be`（BE 動詞）：作系動詞使用的 BE 形式。
- 主語補語形容詞（predicate adjective）、名詞修飾語、縮減分詞（如 `items made of`）、片語助動詞／ particles，以及沒有有限動詞的固定片語不標紅。

## 14 個保持純文字的 sentence-like 列

| # | 工作表列 | 英文 | 中文 | 判定 |
|---:|---:|---|---|---|
| 006 | 167 | Good job! | 做得好! | PASS（無可標注的動詞角色） |
| 007 | 168 | Great! | 太棒了! | PASS（無可標注的動詞角色） |
| 008 | 169 | Merry Christmas! | 耶誕快樂! | PASS（無可標注的動詞角色） |
| 026 | 189 | How come? | 怎麼會這樣？ | PASS（無可標注的動詞角色） |
| 030 | 195 | What else? | 還有什麼? | PASS（無可標注的動詞角色） |
| 032 | 197 | How about you? | 那你呢? | PASS（無可標注的動詞角色） |
| 077 | 244 | how much? | 多少？（不可數）；多少錢？ | PASS（無可標注的動詞角色） |
| 078 | 245 | how many? | 多少？（可數） | PASS（無可標注的動詞角色） |
| 202 | 849 | Mrs. | 太太 | PASS（無可標注的動詞角色） |
| 204 | 855 | Mr. | 先生(不是sir) | PASS（無可標注的動詞角色） |
| 205 | 856 | Ms. | 女士；(不知是否已婚的小姐) | PASS（無可標注的動詞角色） |
| 212 | 881 | R.O.C. | 中華民國 | PASS（無可標注的動詞角色） |
| 261 | 1094 | What a big fish. | 好大的一條魚！ | PASS（無可標注的動詞角色） |
| 307 | 1199 | Nice shot. | 好球(漂亮的進球)。 | PASS（無可標注的動詞角色） |

## 322 個句子列逐列結果

| # | 工作表列 | 英文 | 中文 | 標注角色 | 判定 |
|---:|---:|---|---|---|---|
| 001 | 162 | I'm nine years old. | 我九歲。 | <code>I'm</code> = be（BE 動詞） | PASS |
| 002 | 163 | How old are you? | 你幾歲? | <code>are</code> = be（BE 動詞） | PASS |
| 003 | 164 | You're welcome. | 不客氣 | <code>You're</code> = be（BE 動詞） | PASS |
| 004 | 165 | Come here. | 過來這裡。 | <code>Come</code> = verb（主要動詞） | PASS |
| 005 | 166 | Try again. | 再試一次。 | <code>Try</code> = verb（主要動詞） | PASS |
| 006 | 167 | Good job! | 做得好! | （無） | PASS |
| 007 | 168 | Great! | 太棒了! | （無） | PASS |
| 008 | 169 | Merry Christmas! | 耶誕快樂! | （無） | PASS |
| 009 | 170 | How are you? | 你好嗎? | <code>are</code> = be（BE 動詞） | PASS |
| 010 | 171 | Stand up. | 起立。 | <code>Stand</code> = verb（主要動詞） | PASS |
| 011 | 172 | Sit down. | 坐下。 | <code>Sit</code> = verb（主要動詞） | PASS |
| 012 | 173 | Listen! | 聽呀! | <code>Listen</code> = verb（主要動詞） | PASS |
| 013 | 174 | Let's take a selfie. | 我們來自拍。 | <code>Let's</code> = auxiliary（助動詞）<br><code>take</code> = verb（主要動詞） | PASS |
| 014 | 175 | Say cheese! | 笑一個 | <code>Say</code> = verb（主要動詞） | PASS |
| 015 | 176 | Wait a minute. | 等一下。 | <code>Wait</code> = verb（主要動詞） | PASS |
| 016 | 178 | He's tall. Who's he? | 他好高。他是誰？ | <code>He's</code> = be（BE 動詞）<br><code>Who's</code> = be（BE 動詞） | PASS |
| 017 | 179 | Nice to meet you, too. | 也很高興認識您。 | <code>meet</code> = verb（主要動詞） | PASS |
| 018 | 180 | Grandpa, I'm home. | 爺爺，我到家了。 | <code>I'm</code> = be（BE 動詞） | PASS |
| 019 | 181 | Is your dad a cook? | 你的爸爸是廚師嗎？ | <code>Is</code> = be（BE 動詞） | PASS |
| 020 | 182 | Time for school. See you. | 上學時間到了。再見。 | <code>See</code> = verb（主要動詞） | PASS |
| 021 | 183 | Is your grandpa a student? | 你的爺爺是學生嗎？ | <code>Is</code> = be（BE 動詞） | PASS |
| 022 | 184 | Sorry, I'm late. | 對不起，我遲到了。 | <code>I'm</code> = be（BE 動詞） | PASS |
| 023 | 185 | How's the weather? | 天氣如何? | <code>How's</code> = be（BE 動詞） | PASS |
| 024 | 186 | Line up, please. | 請排隊 | <code>Line</code> = verb（主要動詞） | PASS |
| 025 | 187 | Wake up! | 醒來! 起床! | <code>Wake</code> = verb（主要動詞） | PASS |
| 026 | 189 | How come? | 怎麼會這樣？ | （無） | PASS |
| 027 | 190 | What's going on? | 發生了什麼事? | <code>What's</code> = auxiliary（助動詞）<br><code>going</code> = verb（主要動詞） | PASS |
| 028 | 191 | What time is it? | 現在幾點? | <code>is</code> = be（BE 動詞） | PASS |
| 029 | 194 | I need to use the bathroom. | 我需要使用廁所 | <code>need</code> = verb（主要動詞）<br><code>use</code> = verb（主要動詞） | PASS |
| 030 | 195 | What else? | 還有什麼? | （無） | PASS |
| 031 | 196 | I miss you so much. | 我很想你 | <code>miss</code> = verb（主要動詞） | PASS |
| 032 | 197 | How about you? | 那你呢? | （無） | PASS |
| 033 | 200 | Let me see. | 讓我想想 | <code>Let</code> = verb（主要動詞）<br><code>see</code> = verb（主要動詞） | PASS |
| 034 | 201 | Have fun. | 玩得開心 | <code>Have</code> = verb（主要動詞） | PASS |
| 035 | 202 | We don't go to school on the weekend. | 我們週末不去上學。 | <code>don't</code> = auxiliary（助動詞）<br><code>go</code> = verb（主要動詞） | PASS |
| 036 | 203 | How's the weather? It's sunny. | 天氣怎麼樣？是晴天。 | <code>How's</code> = be（BE 動詞）<br><code>It's</code> = be（BE 動詞） | PASS |
| 037 | 204 | What day is today? It's Wednesday. | 今天星期幾？今天是星期三。 | <code>is</code> = be（BE 動詞）<br><code>It's</code> = be（BE 動詞） | PASS |
| 038 | 205 | What's your favorite subject? | 你最喜歡什麼科目？ | <code>What's</code> = be（BE 動詞） | PASS |
| 039 | 206 | Time to sleep. | 該睡覺了。 | <code>sleep</code> = verb（主要動詞） | PASS |
| 040 | 207 | They got a lot of toys for Christmas. | 他們在聖誕節得到了很多玩具。 | <code>got</code> = verb（主要動詞） | PASS |
| 041 | 208 | She waves hello by the gate. | 她在門口揮手打招呼。 | <code>waves</code> = verb（主要動詞） | PASS |
| 042 | 209 | There are 29 students in Class 5 0 3. | 503班有29位學生。 | <code>are</code> = be（BE 動詞） | PASS |
| 043 | 210 | I can make a cake. | 我會做蛋糕。 | <code>can</code> = auxiliary（助動詞）<br><code>make</code> = verb（主要動詞） | PASS |
| 044 | 211 | We make fruit salad for everyone. | 我們為大家做水果沙拉。 | <code>make</code> = verb（主要動詞） | PASS |
| 045 | 212 | Sweet drinks are not good for you. | 甜飲料對你不好。 | <code>are</code> = be（BE 動詞） | PASS |
| 046 | 213 | She has less cake. | 她的蛋糕比較少。 | <code>has</code> = verb（主要動詞） | PASS |
| 047 | 214 | He has the most chocolates in the class. | 他是班上巧克力最多的人。 | <code>has</code> = verb（主要動詞） | PASS |
| 048 | 215 | There are a lot of birds in the tree. | 樹上有很多鳥。 | <code>are</code> = be（BE 動詞） | PASS |
| 049 | 216 | Does she like guavas? | 她喜歡芭樂嗎？ | <code>Does</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞） | PASS |
| 050 | 217 | He doesn't like cold drinks. | 他不喜歡冷飲。 | <code>doesn't</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞） | PASS |
| 051 | 218 | Find the sugars. | 找出糖。 | <code>Find</code> = verb（主要動詞） | PASS |
| 052 | 219 | What fruit does your mom like? She likes papayas. | 你媽媽喜歡什麼水果？她喜歡木瓜。 | <code>does</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞）<br><code>likes</code> = verb（主要動詞） | PASS |
| 053 | 220 | How many oranges do you need? | 你需要多少柳丁？ | <code>do</code> = auxiliary（助動詞）<br><code>need</code> = verb（主要動詞） | PASS |
| 054 | 221 | Eating smart with fruit. | 用聰明的方式吃水果。 | <code>Eating</code> = verb（主要動詞） | PASS |
| 055 | 222 | The star is in the night sky with light. | 星星在夜空中閃著光。 | <code>is</code> = be（BE 動詞） | PASS |
| 056 | 223 | May I help you? | 需要我幫忙嗎？ | <code>May</code> = auxiliary（助動詞）<br><code>help</code> = verb（主要動詞） | PASS |
| 057 | 224 | I eat rice every day. | 我每天都吃米飯。 | <code>eat</code> = verb（主要動詞） | PASS |
| 058 | 225 | The sun is very bright. | 太陽很亮。 | <code>is</code> = be（BE 動詞） | PASS |
| 059 | 226 | Do not bite your pen. | 不要咬你的筆。 | <code>Do</code> = auxiliary（助動詞）<br><code>bite</code> = verb（主要動詞） | PASS |
| 060 | 227 | What is your answer? | 你的答案是什麼？ | <code>is</code> = be（BE 動詞） | PASS |
| 061 | 228 | Be careful next time. | 下次要小心。 | <code>Be</code> = be（BE 動詞） | PASS |
| 062 | 229 | Don't drink tea from a spoon. | 不要用湯匙喝茶。 | <code>Don't</code> = auxiliary（助動詞）<br><code>drink</code> = verb（主要動詞） | PASS |
| 063 | 230 | Does she like fruit sandwiches? | 她喜歡水果三明治嗎？ | <code>Does</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞） | PASS |
| 064 | 231 | I eat a plum every day. | 我每天吃一個李子。 | <code>eat</code> = verb（主要動詞） | PASS |
| 065 | 232 | The cat runs through the door. | 這隻貓穿過門。 | <code>runs</code> = verb（主要動詞） | PASS |
| 066 | 233 | I put my bag on the chair. | 我把我的包包放在椅子上。 | <code>put</code> = verb（主要動詞） | PASS |
| 067 | 234 | It's cloudy today. | 今天多雲(陰天)。 | <code>It's</code> = be（BE 動詞） | PASS |
| 068 | 235 | Fruit is tasty and healthy. | 水果美味又健康。 | <code>is</code> = be（BE 動詞） | PASS |
| 069 | 236 | Fruit is good for our body. | 水果對我們的身體很好。 | <code>is</code> = be（BE 動詞） | PASS |
| 070 | 237 | ​I eat two servings of fruit every day. | ​我每天吃兩份水果。 | <code>eat</code> = verb（主要動詞） | PASS |
| 071 | 238 | The orange is the size of a fist. | 這個柳丁有一個拳頭那麼大。 | <code>is</code> = be（BE 動詞） | PASS |
| 072 | 239 | ​My fist is small. | ​我的拳頭是小的。 | <code>is</code> = be（BE 動詞） | PASS |
| 073 | 240 | The apples are on sale today. | 今天蘋果在特價。 | <code>are</code> = be（BE 動詞） | PASS |
| 074 | 241 | This book is free for students. | 這本書對學生是免費的。 | <code>is</code> = be（BE 動詞） | PASS |
| 075 | 242 | These apples are on sale on Saturday. | 這些蘋果在星期六有特價/促銷。 | <code>are</code> = be（BE 動詞） | PASS |
| 076 | 243 | Mom makes a tangerine peel cleaner at home. | 媽媽在家裡製作橘子皮清潔劑。 | <code>makes</code> = verb（主要動詞） | PASS |
| 077 | 244 | how much? | 多少？（不可數）；多少錢？ | （無） | PASS |
| 078 | 245 | how many? | 多少？（可數） | （無） | PASS |
| 079 | 246 | How much water do you drink? | 你喝多少水？ | <code>do</code> = auxiliary（助動詞）<br><code>drink</code> = verb（主要動詞） | PASS |
| 080 | 247 | How many students are in the class? | 班上有多少學生？ | <code>are</code> = be（BE 動詞） | PASS |
| 081 | 248 | The clerk says, "Welcome!" | 那位店員說：「歡迎！」 | <code>says</code> = verb（主要動詞）<br><code>Welcome</code> = verb（主要動詞） | PASS |
| 082 | 249 | I have a birthday party on Saturday. | 我在星期六有一個生日派對。 | <code>have</code> = verb（主要動詞） | PASS |
| 083 | 250 | The party is at my house. It's at two o'clock. | 派對在我家。它在兩點鐘。 | <code>is</code> = be（BE 動詞）<br><code>It's</code> = be（BE 動詞） | PASS |
| 084 | 251 | This is a story about a king. | 這是一個關於國王的故事。 | <code>is</code> = be（BE 動詞） | PASS |
| 085 | 252 | One day, I saw a cat. | 有一天，我看到了一隻貓。 | <code>saw</code> = verb（主要動詞） | PASS |
| 086 | 253 | A long time ago, people rode horses. | ​很久以前，人們騎馬。 | <code>rode</code> = verb（主要動詞） | PASS |
| 087 | 255 | I have only one pencil. | ​我只有一枝鉛筆。 | <code>have</code> = verb（主要動詞） | PASS |
| 088 | 256 | We smile in the photo. | 我們在照片裡微笑。 | <code>smile</code> = verb（主要動詞） | PASS |
| 089 | 257 | I love to eat homemade food. | 我愛吃自製的食物。 | <code>love</code> = verb（主要動詞）<br><code>eat</code> = verb（主要動詞） | PASS |
| 090 | 258 | Do you want some homemade bread? | 你想要來點自製麵包嗎？ | <code>Do</code> = auxiliary（助動詞）<br><code>want</code> = verb（主要動詞） | PASS |
| 091 | 259 | Make a wish. | 許個願吧。 | <code>Make</code> = verb（主要動詞） | PASS |
| 092 | 260 | We need enough books. | 我們需要足夠的書。 | <code>need</code> = verb（主要動詞） | PASS |
| 093 | 261 | How big is the smallest deer? | 最小的鹿有多大？ | <code>is</code> = be（BE 動詞） | PASS |
| 094 | 262 | Look at this picture. | 看看這張圖片。 | <code>Look</code> = verb（主要動詞） | PASS |
| 095 | 263 | It doesn't look like much. | 它看起來不起眼。 | <code>doesn't</code> = auxiliary（助動詞）<br><code>look</code> = verb（主要動詞） | PASS |
| 096 | 264 | I'm going to buy this Christmas tree. | 我打算買這棵聖誕樹。 | <code>I'm</code> = auxiliary（助動詞）<br><code>going</code> = verb（主要動詞）<br><code>buy</code> = verb（主要動詞） | PASS |
| 097 | 265 | What summer plans do you have? | 你有什麼暑假計畫嗎？ | <code>do</code> = auxiliary（助動詞）<br><code>have</code> = verb（主要動詞） | PASS |
| 098 | 266 | My brother is very tall. | 我的哥哥（或弟弟）非常高。 | <code>is</code> = be（BE 動詞） | PASS |
| 099 | 267 | She has short hair. | 她留著短髮。 | <code>has</code> = verb（主要動詞） | PASS |
| 100 | 268 | Summer days are long, and winter days are short. | 夏天的日子（白晝）很長，而冬天的日子（白晝）很短。 | <code>are</code> = be（BE 動詞）<br><code>are</code> = be（BE 動詞） | PASS |
| 101 | 269 | The paper is very thin. | 這張紙很薄。 | <code>is</code> = be（BE 動詞） | PASS |
| 102 | 270 | She has long black hair. | 她有一頭黑色的長髮 | <code>has</code> = verb（主要動詞） | PASS |
| 103 | 271 | My dad reads the newspaper every morning. | 我爸爸每天早上都會看報紙。 | <code>reads</code> = verb（主要動詞） | PASS |
| 104 | 272 | Please look at the picture on the wall. | 請看牆上的那張圖片（或畫）。 | <code>look</code> = verb（主要動詞） | PASS |
| 105 | 273 | Many people have bad habits, and they are not good for you. | 很多人都有壞習慣，而那些習慣對你並沒有好處。 | <code>have</code> = verb（主要動詞）<br><code>are</code> = be（BE 動詞） | PASS |
| 106 | 274 | Do you have any ideas to help me? | 你有什麼主意可以幫我嗎？ | <code>Do</code> = auxiliary（助動詞）<br><code>have</code> = verb（主要動詞）<br><code>help</code> = verb（主要動詞） | PASS |
| 107 | 275 | What was the weather like when the girl came to the castle door? | 當那個女孩來到城堡門口時，天氣如何？ | <code>was</code> = be（BE 動詞）<br><code>came</code> = verb（主要動詞） | PASS |
| 108 | 276 | May I have a little more? | 我可以再多要一點嗎？ | <code>May</code> = auxiliary（助動詞）<br><code>have</code> = verb（主要動詞） | PASS |
| 109 | 277 | What are you thinking about? | 你正在想什麼？ | <code>are</code> = auxiliary（助動詞）<br><code>thinking</code> = verb（主要動詞） | PASS |
| 110 | 278 | What do you do when your hair is dirty? | 當你的頭髮髒了，你會怎麼做？ | <code>do</code> = auxiliary（助動詞）<br><code>do</code> = verb（主要動詞）<br><code>is</code> = be（BE 動詞） | PASS |
| 111 | 279 | It gets lots of snow! | 那裡會下很多雪！（或是：那裡有很多雪！） | <code>gets</code> = verb（主要動詞） | PASS |
| 112 | 280 | Brush your teeth. | 刷牙（刷你的牙齒） | <code>Brush</code> = verb（主要動詞） | PASS |
| 113 | 281 | She cleans her room every weekend. | 她每個週末打掃她的房間 | <code>cleans</code> = verb（主要動詞） | PASS |
| 114 | 282 | I always keep my desk clean. | 我總是保持桌子乾淨 | <code>keep</code> = verb（主要動詞） | PASS |
| 115 | 283 | Don't worry about it. Let it go! | 別擔心。隨它去吧！（放下吧！） | <code>Don't</code> = auxiliary（助動詞）<br><code>worry</code> = verb（主要動詞）<br><code>Let</code> = verb（主要動詞）<br><code>go</code> = verb（主要動詞） | PASS |
| 116 | 284 | Please take care of your book. | 請愛惜你的書。 | <code>take</code> = verb（主要動詞）<br><code>care</code> = verb（主要動詞） | PASS |
| 117 | 285 | He is good at volleyball, basketball, and badminton. | 他擅長排球、籃球和羽球。 | <code>is</code> = be（BE 動詞） | PASS |
| 118 | 286 | Don't be late! | 不要遲到！ | <code>Don't</code> = auxiliary（助動詞）<br><code>be</code> = be（BE 動詞） | PASS |
| 119 | 287 | I will bring some bubble tea. | 我會帶一些珍珠奶茶過來。 | <code>will</code> = auxiliary（助動詞）<br><code>bring</code> = verb（主要動詞） | PASS |
| 120 | 288 | I love all kinds of music. | 我喜愛各種類型的音樂。 | <code>love</code> = verb（主要動詞） | PASS |
| 121 | 381 | This pillow is soft and light, but that rock is hard and heavy. | 這顆枕頭又軟又輕，但那塊石頭又硬又重。 | <code>is</code> = be（BE 動詞）<br><code>is</code> = be（BE 動詞） | PASS |
| 122 | 390 | The magic present was a big surprise. | 那個神奇的禮物是一個大驚喜。 | <code>was</code> = be（BE 動詞） | PASS |
| 123 | 396 | He picked a story without a point. | 他挑了一個沒有重點的故事。 | <code>picked</code> = verb（主要動詞） | PASS |
| 124 | 397 | Please wait in the garden. | 請在花園裡稍候。 | <code>wait</code> = verb（主要動詞） | PASS |
| 125 | 403 | We are camping and fishing near a beautiful stream. | 我們正在一條美麗的溪流附近露營和釣魚。 | <code>are</code> = auxiliary（助動詞）<br><code>camping</code> = verb（主要動詞）<br><code>fishing</code> = verb（主要動詞） | PASS |
| 126 | 446 | I want to see new places I've never seen before. | 我想去看看那些我以前從未見過的新地方。 | <code>want</code> = verb（主要動詞）<br><code>see</code> = verb（主要動詞）<br><code>I've</code> = auxiliary（助動詞）<br><code>seen</code> = verb（主要動詞） | PASS |
| 127 | 450 | A car went by. Its horn was very loud. | 一輛車開過去。它的喇叭聲非常大。 | <code>went</code> = verb（主要動詞）<br><code>was</code> = be（BE 動詞） | PASS |
| 128 | 462 | This trip belongs to my uncle. | 這次旅行是屬於我叔叔的。 | <code>belongs</code> = verb（主要動詞） | PASS |
| 129 | 463 | Excuse me. | 不好意思、打擾一下 | <code>Excuse</code> = verb（主要動詞） | PASS |
| 130 | 467 | Excuse me, may I use this block? | 不好意思，我可以用這個積木嗎？ | <code>Excuse</code> = verb（主要動詞）<br><code>may</code> = auxiliary（助動詞）<br><code>use</code> = verb（主要動詞） | PASS |
| 131 | 468 | That is a poor excuse. | 那是一個很爛的藉口。 | <code>is</code> = be（BE 動詞） | PASS |
| 132 | 469 | I can make a plane with blocks. | 我可以用積木做飛機。 | <code>can</code> = auxiliary（助動詞）<br><code>make</code> = verb（主要動詞） | PASS |
| 133 | 471 | I am glad to see you here again. | 我很高興再次在這裡見到你。 | <code>am</code> = be（BE 動詞）<br><code>see</code> = verb（主要動詞） | PASS |
| 134 | 480 | I will give away some toys to the hospital. | 我會捐贈一些玩具給醫院。 | <code>will</code> = auxiliary（助動詞）<br><code>give</code> = verb（主要動詞） | PASS |
| 135 | 482 | Are you sure? | 你確定嗎？ | <code>Are</code> = be（BE 動詞） | PASS |
| 136 | 493 | I recall a fancy ski trip. | 我回想起一場奢華的滑雪之旅。 | <code>recall</code> = verb（主要動詞） | PASS |
| 137 | 496 | How can we get to the wedding? | 我們要怎麼去婚禮？ | <code>can</code> = auxiliary（助動詞）<br><code>get</code> = verb（主要動詞） | PASS |
| 138 | 497 | We can get there by ship. | 我們可以搭船去那裡。 | <code>can</code> = auxiliary（助動詞）<br><code>get</code> = verb（主要動詞） | PASS |
| 139 | 504 | The spy must jump over the wall in the storm. | 間諜必須在暴風雨中跳過那道牆。 | <code>must</code> = auxiliary（助動詞）<br><code>jump</code> = verb（主要動詞） | PASS |
| 140 | 508 | Please answer my question about picnics. | 請回答我關於野餐的問題。 | <code>answer</code> = verb（主要動詞） | PASS |
| 141 | 510 | The more you speak, the better you'll get. | 你說得越多，你就會變得越好。 | <code>speak</code> = verb（主要動詞）<br><code>you'll</code> = auxiliary（助動詞）<br><code>get</code> = verb（主要動詞） | PASS |
| 142 | 525 | I'm sitting here in the boring room. | 我坐在這個無聊的房間裡。 | <code>I'm</code> = auxiliary（助動詞）<br><code>sitting</code> = verb（主要動詞） | PASS |
| 143 | 527 | ​I am wasting my time. I got nothing to do. | 我在浪費時間，我沒什麼事情可以做。 | <code>am</code> = auxiliary（助動詞）<br><code>wasting</code> = verb（主要動詞）<br><code>got</code> = verb（主要動詞） | PASS |
| 144 | 528 | It's just another rainy Sunday afternoon. | 只是又一個下雨的星期天下午。 | <code>It's</code> = be（BE 動詞） | PASS |
| 145 | 530 | I'm hanging around. I'm waiting for you. | 我正在這附近晃晃。我正在等你。 | <code>I'm</code> = auxiliary（助動詞）<br><code>hanging</code> = verb（主要動詞）<br><code>I'm</code> = auxiliary（助動詞）<br><code>waiting</code> = verb（主要動詞） | PASS |
| 146 | 534 | But nothing ever happens. | 但什麼事都沒有發生 | <code>happens</code> = verb（主要動詞） | PASS |
| 147 | 537 | I'm driving around in my car. | 我開著車到處繞。 | <code>I'm</code> = auxiliary（助動詞）<br><code>driving</code> = verb（主要動詞） | PASS |
| 148 | 539 | I'm driving too fast. I'm driving too far. | 我開得太快。我開得太遠。 | <code>I'm</code> = auxiliary（助動詞）<br><code>driving</code> = verb（主要動詞）<br><code>I'm</code> = auxiliary（助動詞）<br><code>driving</code> = verb（主要動詞） | PASS |
| 149 | 543 | I'd like to change my point of view. | 我想改變我看事情的角度/觀點。 | <code>I'd</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞）<br><code>change</code> = verb（主要動詞） | PASS |
| 150 | 544 | I feel so lonely. I'm waiting for you. | 我感到很孤單，我在等著你 | <code>feel</code> = verb（主要動詞）<br><code>I'm</code> = auxiliary（助動詞）<br><code>waiting</code> = verb（主要動詞） | PASS |
| 151 | 547 | Yesterday you told me about the blue, blue sky. | 昨天你告訴我關於藍藍的天空。 | <code>told</code> = verb（主要動詞） | PASS |
| 152 | 549 | And all that I can see is just a yellow lemon tree. | 而且我所能看見的，就只有一棵黃色檸檬樹。 | <code>can</code> = auxiliary（助動詞）<br><code>see</code> = verb（主要動詞）<br><code>is</code> = be（BE 動詞） | PASS |
| 153 | 551 | I'm turning my head up and down. | 我正在上下轉動我的頭。 | <code>I'm</code> = auxiliary（助動詞）<br><code>turning</code> = verb（主要動詞） | PASS |
| 154 | 565 | This type of travel is not safe. | 這種旅遊類型不安全。 | <code>is</code> = be（BE 動詞） | PASS |
| 155 | 570 | Dog's belly made a sound. | 狗狗的肚子發出了聲音。 | <code>made</code> = verb（主要動詞） | PASS |
| 156 | 575 | I spent twenty thousand dollars on this computer. | 我花了兩萬元在這台電腦上。 | <code>spent</code> = verb（主要動詞） | PASS |
| 157 | 576 | Don't spend too much money on your new camera. | 不要在你的新相機上花太多錢。 | <code>Don't</code> = auxiliary（助動詞）<br><code>spend</code> = verb（主要動詞） | PASS |
| 158 | 582 | Let's meet at the floating market. | 我們在水上市場見面吧。 | <code>Let's</code> = auxiliary（助動詞）<br><code>meet</code> = verb（主要動詞） | PASS |
| 159 | 584 | We can tie the rope to the pail. | 我們可以把繩子綁在水桶上。 | <code>can</code> = auxiliary（助動詞）<br><code>tie</code> = verb（主要動詞） | PASS |
| 160 | 588 | They held the rope. Slowly the pail went down. | 他們抓著繩子。水桶慢慢地降下去。 | <code>held</code> = verb（主要動詞）<br><code>went</code> = verb（主要動詞） | PASS |
| 161 | 592 | Hold my hand, pretty please! | 牽我的手嘛，求求你啦！ | <code>Hold</code> = verb（主要動詞） | PASS |
| 162 | 596 | This pretty animal is stuck in the tree. | 這隻漂亮的動物被困在樹上。 | <code>is</code> = be（BE 動詞） | PASS |
| 163 | 599 | I sat on the grass and ate my lunch. | 我坐在草地上吃了午餐。 | <code>sat</code> = verb（主要動詞）<br><code>ate</code> = verb（主要動詞） | PASS |
| 164 | 605 | Raw vegetables aren't too bad. | 生吃蔬菜其實還不錯（沒那麼糟）。 | <code>aren't</code> = be（BE 動詞） | PASS |
| 165 | 607 | I hope this cabbage tastes good. | 我希望這高麗菜嚐起來很棒。 | <code>hope</code> = verb（主要動詞）<br><code>tastes</code> = verb（主要動詞） | PASS |
| 166 | 614 | Those worn shoes are really comfortable. | 那些穿舊的鞋子真的很舒服。 | <code>are</code> = be（BE 動詞） | PASS |
| 167 | 624 | Both men and women join the traditional event. | 男人和女人都參加這項傳統活動。 | <code>join</code> = verb（主要動詞） | PASS |
| 168 | 628 | The lost couple met at the amusement park. | 這對迷路的情侶在遊樂園見面了。 | <code>met</code> = verb（主要動詞） | PASS |
| 169 | 635 | There are many items made of bamboo. | 有許多由竹子製成的物品。 | <code>are</code> = be（BE 動詞） | PASS |
| 170 | 636 | The total quantity is 50. | 總計數量是 50 個。 | <code>is</code> = be（BE 動詞） | PASS |
| 171 | 639 | Don't donate any item that is more than a meter long. | 不要捐贈任何長度超過一公尺的物品。 | <code>Don't</code> = auxiliary（助動詞）<br><code>donate</code> = verb（主要動詞）<br><code>is</code> = be（BE 動詞） | PASS |
| 172 | 644 | The lazy animal let the hammer slip. | 那個懶散的動物讓鐵鎚滑落了。 | <code>let</code> = verb（主要動詞）<br><code>slip</code> = verb（主要動詞） | PASS |
| 173 | 645 | Mark the new landmark on the land. | 在陸地上標記出這個新地標。 | <code>Mark</code> = verb（主要動詞） | PASS |
| 174 | 661 | The personal trainer likes to hunt in the woods. | 這位個人教練喜歡在樹林裡打獵。 | <code>likes</code> = verb（主要動詞）<br><code>hunt</code> = verb（主要動詞） | PASS |
| 175 | 664 | I must hide now. | 我現在必須躲起來了。 | <code>must</code> = auxiliary（助動詞）<br><code>hide</code> = verb（主要動詞） | PASS |
| 176 | 667 | The truck came closer and closer. | 卡車越來越近了。 | <code>came</code> = verb（主要動詞） | PASS |
| 177 | 670 | Soon, the cat left the barn. | 貓很快就離開了穀倉。 | <code>left</code> = verb（主要動詞） | PASS |
| 178 | 676 | We found a flea in the forest during the treasure hunt. | 我們在尋寶遊戲期間在森林裡發現了一隻跳蚤。 | <code>found</code> = verb（主要動詞） | PASS |
| 179 | 680 | The GPS shows our location and direction on Earth. | GPS 顯示了我們在地球上的位置與方向。 | <code>shows</code> = verb（主要動詞） | PASS |
| 180 | 684 | Our adventure started in the island city. | 我們的冒險從這座島嶼城市開始了。 | <code>started</code> = verb（主要動詞） | PASS |
| 181 | 689 | Is the tide low enough for the firework show? | 現在潮汐水位夠低，可以放煙火了嗎？ | <code>Is</code> = be（BE 動詞） | PASS |
| 182 | 692 | Do you ever hang your clothes by yourself? | 你曾經自己晾過自己的衣服嗎？ | <code>Do</code> = auxiliary（助動詞）<br><code>hang</code> = verb（主要動詞） | PASS |
| 183 | 697 | We rent shared bikes to get around the city. | 我們租借共享單車在城市裡四處走走。 | <code>rent</code> = verb（主要動詞）<br><code>get</code> = verb（主要動詞） | PASS |
| 184 | 701 | Don't push or pull anyone near a deep pond. | 不要在深池塘附近推或拉任何人。 | <code>Don't</code> = auxiliary（助動詞）<br><code>push</code> = verb（主要動詞）<br><code>pull</code> = verb（主要動詞） | PASS |
| 185 | 705 | I promise to use less plastic. | 我承諾會使用較少的塑膠。 | <code>promise</code> = verb（主要動詞）<br><code>use</code> = verb（主要動詞） | PASS |
| 186 | 710 | I take a double-decker bus to the shopping mall. | 我搭乘雙層巴士去購物商場。 | <code>take</code> = verb（主要動詞） | PASS |
| 187 | 715 | He will scare the fox away! | 他會把狐狸嚇跑。 | <code>will</code> = auxiliary（助動詞）<br><code>scare</code> = verb（主要動詞） | PASS |
| 188 | 721 | At last, the sick chick hid in the windmill. | 終於，那隻生病的小雞躲進了風車裡。 | <code>hid</code> = verb（主要動詞） | PASS |
| 189 | 725 | The duckling is upset because he is behind the others. | 小鴨子很沮喪，因為牠落在其他同伴後面。 | <code>is</code> = be（BE 動詞）<br><code>is</code> = be（BE 動詞） | PASS |
| 190 | 728 | The baby cries because the tractor is making noise. | 寶寶因為拖拉機發出噪音所以哭了。 | <code>cries</code> = verb（主要動詞）<br><code>is</code> = auxiliary（助動詞）<br><code>making</code> = verb（主要動詞） | PASS |
| 191 | 730 | I think it is a bore. | 我認為這是件無聊透頂的事。 | <code>think</code> = verb（主要動詞）<br><code>is</code> = be（BE 動詞） | PASS |
| 192 | 737 | The weather is getting cold, remember to keep warm! | 天氣變冷了，記得保暖！ | <code>is</code> = auxiliary（助動詞）<br><code>getting</code> = verb（主要動詞）<br><code>remember</code> = verb（主要動詞）<br><code>keep</code> = verb（主要動詞） | PASS |
| 193 | 742 | I become cozy in a pair of warm socks. | 穿上一雙暖和的襪子後，我變得很溫暖舒服。 | <code>become</code> = verb（主要動詞） | PASS |
| 194 | 751 | We spent the night at a lighthouse. | 我們在燈塔過夜。 | <code>spent</code> = verb（主要動詞） | PASS |
| 195 | 757 | Where else can we go? It depends on the subway lines. | 我們還能去哪裡？這取決於地鐵線路。 | <code>can</code> = auxiliary（助動詞）<br><code>go</code> = verb（主要動詞）<br><code>depends</code> = verb（主要動詞） | PASS |
| 196 | 761 | The city has an underground system. | 這座城市有一個地下系統。 | <code>has</code> = verb（主要動詞） | PASS |
| 197 | 765 | The HSR offers the most efficient service. | 高鐵提供最有效率的服務。 | <code>offers</code> = verb（主要動詞） | PASS |
| 198 | 770 | We reduce plastic at the feast. | 我們在宴席上減少使用塑膠。 | <code>reduce</code> = verb（主要動詞） | PASS |
| 199 | 773 | You need to be strong to push the stone. | 要推動這顆石頭，你需要夠強壯。 | <code>need</code> = verb（主要動詞）<br><code>be</code> = be（BE 動詞）<br><code>push</code> = verb（主要動詞） | PASS |
| 200 | 775 | Open the door and then close it. | 打開門，然後把它關上。 | <code>Open</code> = verb（主要動詞）<br><code>close</code> = verb（主要動詞） | PASS |
| 201 | 780 | I'm fine, thank you. | 我很好，謝謝。 | <code>I'm</code> = be（BE 動詞） | PASS |
| 202 | 849 | Mrs. | 太太 | （無） | PASS |
| 203 | 852 | There is a well-known symbol in this desert. | 這個沙漠裡有一個著名的符號。 | <code>is</code> = be（BE 動詞） | PASS |
| 204 | 855 | Mr. | 先生(不是sir) | （無） | PASS |
| 205 | 856 | Ms. | 女士；(不知是否已婚的小姐) | （無） | PASS |
| 206 | 859 | The girl saw Miss Snake when she was jogging. | 那個女孩在慢跑時看見了蛇小姐。 | <code>saw</code> = verb（主要動詞）<br><code>was</code> = auxiliary（助動詞）<br><code>jogging</code> = verb（主要動詞） | PASS |
| 207 | 864 | The thief stole Ms. Rabbit's clock. | 小偷偷走了兔女士的時鐘。 | <code>stole</code> = verb（主要動詞） | PASS |
| 208 | 865 | Mrs. Rabbit goes into town. | 兔子太太進城了。 | <code>goes</code> = verb（主要動詞） | PASS |
| 209 | 869 | Lettuce, tomatoes and onions are great on sandwiches. | 生菜、番茄和洋蔥加在三明治裡非常棒。 | <code>are</code> = be（BE 動詞） | PASS |
| 210 | 873 | You can cook onions with meat for a nice flavor. | 你可以把洋蔥跟肉一起煮，味道會很棒。 | <code>can</code> = auxiliary（助動詞）<br><code>cook</code> = verb（主要動詞） | PASS |
| 211 | 877 | A camel carries water in the dry desert. | 駱駝在乾燥的沙漠裡載著水。 | <code>carries</code> = verb（主要動詞） | PASS |
| 212 | 881 | R.O.C. | 中華民國 | （無） | PASS |
| 213 | 885 | The shy sheep looks at the sea of ROC. | 這隻害羞的羊看著中華民國的海。 | <code>looks</code> = verb（主要動詞） | PASS |
| 214 | 889 | My son likes to talk about his big toe. | 我兒子喜歡談論他的大腳趾。 | <code>likes</code> = verb（主要動詞）<br><code>talk</code> = verb（主要動詞） | PASS |
| 215 | 893 | The little girl lives in a place with many sleds. | 那個小女孩住在一個有很多雪橇的地方。 | <code>lives</code> = verb（主要動詞） | PASS |
| 216 | 897 | The clerk with a perm lost her purse. | 燙著捲髮的店員把她的錢包弄丟了。 | <code>lost</code> = verb（主要動詞） | PASS |
| 217 | 901 | Mr. Bee and his classmate are busy today. | 蜜蜂先生和他的同學今天很忙。 | <code>are</code> = be（BE 動詞） | PASS |
| 218 | 906 | The clown saw an owl and began to shout. | 小丑看到了一隻貓頭鷹，並開始大叫。 | <code>saw</code> = verb（主要動詞）<br><code>began</code> = verb（主要動詞）<br><code>shout</code> = verb（主要動詞） | PASS |
| 219 | 909 | The small singer sang a beautiful song. | 這位小歌手唱了一首動聽的歌。 | <code>sang</code> = verb（主要動詞） | PASS |
| 220 | 912 | Don't stand on the table with hot soup! | 不要站在放著熱湯的桌上！ | <code>Don't</code> = auxiliary（助動詞）<br><code>stand</code> = verb（主要動詞） | PASS |
| 221 | 916 | The friendly hippo likes to eat ham. | 這隻友善的河馬喜歡吃火腿。 | <code>likes</code> = verb（主要動詞）<br><code>eat</code> = verb（主要動詞） | PASS |
| 222 | 920 | The boy found a coin in the soil with joy. | 男孩帶著喜悅在泥土中找到硬幣。 | <code>found</code> = verb（主要動詞） | PASS |
| 223 | 940 | The child learned magic two years ago. | 那個孩子兩年前就學會魔法了。 | <code>learned</code> = verb（主要動詞） | PASS |
| 224 | 948 | Follow the right direction to win the big prize. | 跟隨正確的方向來贏得大獎。 | <code>Follow</code> = verb（主要動詞）<br><code>win</code> = verb（主要動詞） | PASS |
| 225 | 950 | The rope connects the sled and the dogs pull it. | 繩子連接雪橇，而狗拉著它。 | <code>connects</code> = verb（主要動詞）<br><code>pull</code> = verb（主要動詞） | PASS |
| 226 | 952 | Mom is cooking green beans for dinner. | 媽媽正在煮四季豆當晚餐。 | <code>is</code> = auxiliary（助動詞）<br><code>cooking</code> = verb（主要動詞） | PASS |
| 227 | 964 | I like to ride my bicycle in autumn. | 我喜歡在秋天騎腳踏車。 | <code>like</code> = verb（主要動詞）<br><code>ride</code> = verb（主要動詞） | PASS |
| 228 | 971 | Flowers die a little more every hour. | 花朵每過一小時就會再凋謝一些。 | <code>die</code> = verb（主要動詞） | PASS |
| 229 | 974 | Computers connect us in a way called the Internet. | 電腦以一種稱為網路的方式將我們連接在一起。 | <code>connect</code> = verb（主要動詞） | PASS |
| 230 | 978 | Let's cook beef together and add some salt. | 我們一起煮牛肉，再加點鹽巴。 | <code>Let's</code> = auxiliary（助動詞）<br><code>cook</code> = verb（主要動詞）<br><code>add</code> = verb（主要動詞） | PASS |
| 231 | 982 | That's true, and I do like raw carrots. | 說得對，而且我確實喜歡生紅蘿蔔。 | <code>That's</code> = be（BE 動詞）<br><code>do</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞） | PASS |
| 232 | 987 | Use the chalk to spell the word. | 用粉筆把這個單字拼出來。 | <code>Use</code> = verb（主要動詞） | PASS |
| 233 | 990 | Tomatoes are actually a fruit because they have seeds. | 番茄實際上是水果，因為它們有種子。 | <code>are</code> = be（BE 動詞）<br><code>have</code> = verb（主要動詞） | PASS |
| 234 | 995 | It costs zero dollars to kick a ball in the park every evening. | 每天傍晚在公園踢球不用花錢。 | <code>costs</code> = verb（主要動詞）<br><code>kick</code> = verb（主要動詞） | PASS |
| 235 | 1002 | Onions come in a few different colors. | 洋蔥有幾種不同的顏色。 | <code>come</code> = verb（主要動詞） | PASS |
| 236 | 1007 | Lettuce is a leafy vegetable that is often crispy. | 萵苣是一種通常很酥脆的葉菜類蔬菜。 | <code>is</code> = be（BE 動詞）<br><code>is</code> = be（BE 動詞） | PASS |
| 237 | 1008 | We should reduce the deck size on this ship. | 我們應該縮減這艘船的甲板尺寸。 | <code>should</code> = auxiliary（助動詞）<br><code>reduce</code> = verb（主要動詞） | PASS |
| 238 | 1012 | I invite Mom to sit down, and then I kiss her. | 我邀請媽媽坐下，然後親她一下。 | <code>invite</code> = verb（主要動詞）<br><code>sit</code> = verb（主要動詞）<br><code>kiss</code> = verb（主要動詞） | PASS |
| 239 | 1022 | The writer eats a dish on vacation. | 這位作家在假期時吃了一道菜。 | <code>eats</code> = verb（主要動詞） | PASS |
| 240 | 1027 | Green beans just like it sounds. | 四季豆就像它聽起來的名字一樣。 | <code>like</code> = verb（主要動詞）<br><code>sounds</code> = verb（主要動詞） | PASS |
| 241 | 1029 | Do you have good recipes? | 你有好的食譜嗎？ | <code>Do</code> = auxiliary（助動詞）<br><code>have</code> = verb（主要動詞） | PASS |
| 242 | 1033 | They visit the city and play street soccer. | 他們拜訪這座城市並踢街頭足球。 | <code>visit</code> = verb（主要動詞）<br><code>play</code> = verb（主要動詞） | PASS |
| 243 | 1034 | You can cook green beans and corn in many delicious ways. | 你可以用很多美味的方式來料理四季豆和玉米。 | <code>can</code> = auxiliary（助動詞）<br><code>cook</code> = verb（主要動詞） | PASS |
| 244 | 1041 | When you eat them raw, they can be a little bit spicy. | 當你生吃它們（指洋蔥）的時候，可能會有一點點辣。 | <code>eat</code> = verb（主要動詞）<br><code>can</code> = auxiliary（助動詞）<br><code>be</code> = be（BE 動詞） | PASS |
| 245 | 1046 | I send a tape on the same date. | 我在同一個日期送出錄音帶。 | <code>send</code> = verb（主要動詞） | PASS |
| 246 | 1050 | Which page is on the television? | 哪一個頁面出現在電視上？ | <code>is</code> = be（BE 動詞） | PASS |
| 247 | 1054 | What are you shopping for? | 你在買什麼呢？ | <code>are</code> = auxiliary（助動詞）<br><code>shopping</code> = verb（主要動詞） | PASS |
| 248 | 1055 | I don't eat enough of them. | 我吃它們(指蔬菜)吃得不夠多。 | <code>don't</code> = auxiliary（助動詞）<br><code>eat</code> = verb（主要動詞） | PASS |
| 249 | 1056 | I don't really like them. | 我不是很(真的)喜歡它們。 | <code>don't</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞） | PASS |
| 250 | 1062 | The long road goes to the spring. | 這條長長的路通往泉水。 | <code>goes</code> = verb（主要動詞） | PASS |
| 251 | 1066 | It's not hard. | 這不難。 | <code>It's</code> = be（BE 動詞） | PASS |
| 252 | 1067 | Those are bad for you. | 那些對你不好。 | <code>are</code> = be（BE 動詞） | PASS |
| 253 | 1074 | Circle the word "soccer". | 把「soccer(足球)」這個字圈起來。 | <code>Circle</code> = verb（主要動詞） | PASS |
| 254 | 1076 | Point to the word "deck". | 指向『deck(甲板)』這個單字。 | <code>Point</code> = verb（主要動詞） | PASS |
| 255 | 1077 | Go back to your seat, please. | 請回到你的座位。 | <code>Go</code> = verb（主要動詞） | PASS |
| 256 | 1079 | Raise your hand. | 舉起你的手。 | <code>Raise</code> = verb（主要動詞） | PASS |
| 257 | 1085 | Dogs even dig on the street. | 狗甚至會在街道上挖掘。 | <code>dig</code> = verb（主要動詞） | PASS |
| 258 | 1091 | I can't wait to go whale watching. | 我等不及要去賞鯨了。 | <code>can't</code> = auxiliary（助動詞）<br><code>wait</code> = verb（主要動詞）<br><code>go</code> = verb（主要動詞） | PASS |
| 259 | 1092 | That's not a whale. It's a dolphin. | 那不是鯨魚。那是海豚。 | <code>That's</code> = be（BE 動詞）<br><code>It's</code> = be（BE 動詞） | PASS |
| 260 | 1093 | A whale is not a fish. It's a mammal. | 鯨魚不是魚，它是哺乳動物。 | <code>is</code> = be（BE 動詞）<br><code>It's</code> = be（BE 動詞） | PASS |
| 261 | 1094 | What a big fish. | 好大的一條魚！ | （無） | PASS |
| 262 | 1095 | It's my first time in Taiwan. | 這是我第一次來台灣 | <code>It's</code> = be（BE 動詞） | PASS |
| 263 | 1096 | Wow! There are more dolphins. | 哇！那裡有更多的海豚。 | <code>are</code> = be（BE 動詞） | PASS |
| 264 | 1098 | All my teammates are cool. | 我的隊友們都是酷的。 | <code>are</code> = be（BE 動詞） | PASS |
| 265 | 1100 | I want to be a cyclist one day. | 我有一天要成為自行車選手。 | <code>want</code> = verb（主要動詞）<br><code>be</code> = be（BE 動詞） | PASS |
| 266 | 1102 | Put your hand down. | 把你的手放下。 | <code>Put</code> = verb（主要動詞） | PASS |
| 267 | 1104 | Repeat after me, please. | 請跟著我唸。 | <code>Repeat</code> = verb（主要動詞） | PASS |
| 268 | 1106 | Take out your book. | 拿出你的課本。 | <code>Take</code> = verb（主要動詞） | PASS |
| 269 | 1110 | Red is a common color on a national flag. | 紅色是國旗上常見的顏色。 | <code>is</code> = be（BE 動詞） | PASS |
| 270 | 1111 | I go biking every day. | 我每天騎腳踏車。 | <code>go</code> = verb（主要動詞）<br><code>biking</code> = verb（主要動詞） | PASS |
| 271 | 1112 | Turn to page 91. | 翻到第91頁。 | <code>Turn</code> = verb（主要動詞） | PASS |
| 272 | 1113 | I write to my friends in English. | 我用英文寫（信）給我的朋友們。 | <code>write</code> = verb（主要動詞） | PASS |
| 273 | 1117 | Time's up. | 時間到。 | <code>Time's</code> = be（BE 動詞） | PASS |
| 274 | 1118 | Show me your homework, please. | 請出示你的作業。 | <code>Show</code> = verb（主要動詞） | PASS |
| 275 | 1120 | Write down the sentence, please. | 請寫下這個句子。 | <code>Write</code> = verb（主要動詞） | PASS |
| 276 | 1122 | Look out the window to smell flowers. | 往窗戶外看，去聞聞花香。 | <code>Look</code> = verb（主要動詞）<br><code>smell</code> = verb（主要動詞） | PASS |
| 277 | 1125 | Crush the potato into a blur. | 把馬鈴薯壓成泥(模糊形狀)。 | <code>Crush</code> = verb（主要動詞） | PASS |
| 278 | 1129 | Put away your book. | 把書本收起來。(p...) | <code>Put</code> = verb（主要動詞） | PASS |
| 279 | 1133 | Pay for the cellphone, and then enjoy the sports game. | 付錢買手機，然後好好享受球賽吧！ | <code>Pay</code> = verb（主要動詞）<br><code>enjoy</code> = verb（主要動詞） | PASS |
| 280 | 1135 | What's wrong? | 怎麼了？(哪裡不對勁？)(W...) | <code>What's</code> = be（BE 動詞） | PASS |
| 281 | 1136 | I don't feel well. | 我感覺不太舒服。 | <code>don't</code> = auxiliary（助動詞）<br><code>feel</code> = verb（主要動詞） | PASS |
| 282 | 1137 | You look flushed. | 你看起來臉紅紅的。 | <code>look</code> = verb（主要動詞） | PASS |
| 283 | 1138 | Let me take you to the doctor now. | 讓我現在帶你去看醫生。 | <code>Let</code> = verb（主要動詞）<br><code>take</code> = verb（主要動詞） | PASS |
| 284 | 1140 | Stay healthy. | 保持健康。 | <code>Stay</code> = verb（主要動詞） | PASS |
| 285 | 1144 | I make an appointment at the clinic to get my medicine. | 我預約了診所要去拿藥。 | <code>make</code> = verb（主要動詞）<br><code>get</code> = verb（主要動詞） | PASS |
| 286 | 1147 | Sir, please stay in this part of the room. | 先生，請留在房間的這個區域。 | <code>stay</code> = verb（主要動詞） | PASS |
| 287 | 1150 | We feed birds in this season. | 我們在這個季節餵鳥。 | <code>feed</code> = verb（主要動詞） | PASS |
| 288 | 1153 | This remedy helps with the symptom. | 這個療法對這種症狀有幫助。 | <code>helps</code> = verb（主要動詞） | PASS |
| 289 | 1157 | Honey is usually golden. | 蜂蜜通常是金黃色的。 | <code>is</code> = be（BE 動詞） | PASS |
| 290 | 1159 | I do eat those sometimes. | 我有時候會吃那些。 | <code>do</code> = auxiliary（助動詞）<br><code>eat</code> = verb（主要動詞） | PASS |
| 291 | 1160 | I know I have to eat more vegetables. How can I do that? | 我知道我必須多吃點蔬菜。我該怎麼做呢？ | <code>know</code> = verb（主要動詞）<br><code>have</code> = auxiliary（助動詞）<br><code>eat</code> = verb（主要動詞）<br><code>can</code> = auxiliary（助動詞）<br><code>do</code> = verb（主要動詞） | PASS |
| 292 | 1161 | You can cook vegetables such as cabbage or carrots. | 你可以烹煮像是高麗菜或胡蘿蔔這類的蔬菜。 | <code>can</code> = auxiliary（助動詞）<br><code>cook</code> = verb（主要動詞） | PASS |
| 293 | 1165 | We eat pomelo during the Moon Festival. | 我們在中秋節吃柚子。 | <code>eat</code> = verb（主要動詞） | PASS |
| 294 | 1166 | I'm done. It smells so good. | 我做好了。它聞起來好香！ | <code>I'm</code> = be（BE 動詞）<br><code>smells</code> = verb（主要動詞） | PASS |
| 295 | 1169 | What would you like to eat? | 你想要吃什麼？(What...) | <code>would</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞）<br><code>eat</code> = verb（主要動詞） | PASS |
| 296 | 1170 | I don't know if we have enough. | 我不知道我們擁有的夠不夠。 | <code>don't</code> = auxiliary（助動詞）<br><code>know</code> = verb（主要動詞）<br><code>have</code> = verb（主要動詞） | PASS |
| 297 | 1171 | Would you like some sandwiches? | 你要不要吃一些三明治？(W...) | <code>Would</code> = auxiliary（助動詞）<br><code>like</code> = verb（主要動詞） | PASS |
| 298 | 1175 | Slice the fresh basil. | 把新鮮的羅勒切成薄片。 | <code>Slice</code> = verb（主要動詞） | PASS |
| 299 | 1176 | I could eat a horse. | 我餓到可以吃下一匹馬 (我餓極了。) | <code>could</code> = auxiliary（助動詞）<br><code>eat</code> = verb（主要動詞） | PASS |
| 300 | 1180 | My plate is full. | 我的盤子滿了。 | <code>is</code> = be（BE 動詞） | PASS |
| 301 | 1182 | The clear soup is ready. | 清澈的湯已經準備好了。 | <code>is</code> = be（BE 動詞） | PASS |
| 302 | 1184 | The basket is empty. | 籃子是空的。 | <code>is</code> = be（BE 動詞） | PASS |
| 303 | 1185 | Does he have a fever? No, he doesn't. He has a cough. | 他發燒了嗎？沒有，他沒發燒。他咳嗽。 | <code>Does</code> = auxiliary（助動詞）<br><code>have</code> = verb（主要動詞）<br><code>doesn't</code> = auxiliary（助動詞）<br><code>has</code> = verb（主要動詞） | PASS |
| 304 | 1192 | Cold air makes him sneeze worse. | 冷空氣造成他噴嚏打得更厲害。 | <code>makes</code> = verb（主要動詞）<br><code>sneeze</code> = verb（主要動詞） | PASS |
| 305 | 1195 | Please fill the bottle before we move. | 在我們出發之前，請先把瓶子裝滿。 | <code>fill</code> = verb（主要動詞）<br><code>move</code> = verb（主要動詞） | PASS |
| 306 | 1197 | He shot a ball into the net. | 他把球射進了球網。 | <code>shot</code> = verb（主要動詞） | PASS |
| 307 | 1199 | Nice shot. | 好球(漂亮的進球)。 | （無） | PASS |
| 308 | 1203 | Spread the sauce on the dough. | 把醬汁鋪開在麵團上。 | <code>Spread</code> = verb（主要動詞） | PASS |
| 309 | 1206 | Lastly, put it in the oven. | 最後，把它放入烤箱。(L...) | <code>put</code> = verb（主要動詞） | PASS |
| 310 | 1210 | The famous cook makes rich broth. | 這位有名的廚師熬煮濃郁的高湯。 | <code>makes</code> = verb（主要動詞） | PASS |
| 311 | 1214 | Aromatic spices make the soup salty. | 芳香的香料讓湯頭變鹹。 | <code>make</code> = verb（主要動詞） | PASS |
| 312 | 1217 | Put cheese on top of the spaghetti. | 在義大利麵上層撒上起司。 | <code>Put</code> = verb（主要動詞） | PASS |
| 313 | 1221 | Is the cream near the guitar and piano? | 鮮奶油在吉他和鋼琴附近嗎？ | <code>Is</code> = be（BE 動詞） | PASS |
| 314 | 1224 | I went to bed early because I was tired. | 因為我很累，所以早早就睡了。 | <code>went</code> = verb（主要動詞）<br><code>was</code> = be（BE 動詞） | PASS |
| 315 | 1227 | My parents and my cousins live in the same city. | 我的父母和我的表哥住在同一個城市。 | <code>live</code> = verb（主要動詞） | PASS |
| 316 | 1228 | Sorry for waking you up. | 抱歉把你吵醒了。 | <code>waking</code> = verb（主要動詞） | PASS |
| 317 | 1229 | See you at the park at seven thirty. | 那七點半公園見囉！ | <code>See</code> = verb（主要動詞） | PASS |
| 318 | 1232 | We build a daily routine. | 我們建立了一個每日例行公事。 | <code>build</code> = verb（主要動詞） | PASS |
| 319 | 1234 | Do you have lunch at twelve? | 你在十二點吃午餐嗎？ | <code>Do</code> = auxiliary（助動詞）<br><code>have</code> = verb（主要動詞） | PASS |
| 320 | 1235 | It's six thirty in the morning. | 現在是早上六點半。 | <code>It's</code> = be（BE 動詞） | PASS |
| 321 | 1236 | Do you get up at six thirty on Saturdays? | 你星期六都六點半起床嗎？ | <code>Do</code> = auxiliary（助動詞）<br><code>get</code> = verb（主要動詞） | PASS |
| 322 | 1237 | I get up at six thirty on weekdays. | 我平日都在六點半起床。 | <code>get</code> = verb（主要動詞） | PASS |

---

稽核完成：所有列均有明確判定。
