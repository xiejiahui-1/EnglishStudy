const DATA_PATH = "data/wrong-words.csv";
const STORAGE_KEY = "dictationLabStats";
const DAILY_GOAL = 30;

const WORD_MEANINGS = {
  ability: "能力，才能",
  abstract: "抽象的；摘要",
  accountant: "会计，会计师",
  accuracy: "准确性，精确度",
  actor: "演员",
  adventure: "冒险，奇遇",
  advertisements: "广告",
  advertising: "广告业；广告活动",
  agreement: "协议；同意",
  agriculture: "农业",
  aid: "帮助，援助",
  air: "空气；航空",
  allergy: "过敏",
  alley: "小巷，胡同",
  allowance: "津贴；限额",
  alteration: "改变，修改",
  altitude: "海拔，高度",
  ambition: "雄心，抱负",
  ambulance: "救护车",
  analysis: "分析",
  analyst: "分析师",
  anger: "愤怒",
  ankle: "脚踝",
  answer: "答案；回答",
  Antarctica: "南极洲",
  ape: "猿",
  appearance: "外貌；出现",
  architect: "建筑师",
  architectures: "建筑风格；建筑体系",
  argument: "争论；论点",
  aristocrat: "贵族",
  army: "军队",
  art: "艺术",
  article: "文章；物品；冠词",
  aspirin: "阿司匹林",
  assignment: "作业；任务",
  atlas: "地图集",
  audience: "观众，听众",
  auditorium: "礼堂，观众席",
  author: "作者",
  authority: "权威；官方机构",
  average: "平均的；平均数",
  award: "奖项；授予",
  bachelor: "单身汉；学士",
  background: "背景",
  backpack: "背包",
  bacteria: "细菌",
  badge: "徽章，证章",
  badminton: "羽毛球",
  baldness: "秃头，脱发",
  band: "乐队；带子",
  bandage: "绷带",
  bands: "乐队；带子，条带",
  banquet: "宴会",
  basement: "地下室",
  bases: "基地；基础；base 的复数",
  basis: "基础，根据",
  bath: "洗澡；浴缸",
  batteries: "电池",
  battery: "电池",
  beach: "海滩",
  beard: "胡须",
  beats: "节拍；敲打",
  bed: "床",
  bedsheet: "床单",
  bedsit: "单间公寓",
  behaviours: "行为，举止",
  belt: "腰带；地带",
  benefit: "好处，益处",
  beverage: "饮料",
  bibliography: "参考书目，文献目录",
  bicycle: "自行车",
  biologist: "生物学家",
  birth: "出生",
  blanket: "毯子",
  blast: "爆炸；强风",
  blouse: "女式衬衫",
  board: "木板；董事会；寄宿",
  boarder: "寄宿生；房客",
  boat: "船",
  bone: "骨头",
  bowl: "碗；保龄球投掷",
  bowling: "保龄球",
  branch: "树枝；分支；分店",
  brick: "砖",
  bridge: "桥",
  brochures: "小册子，宣传册",
  building: "建筑物",
  bungalow: "平房",
  burger: "汉堡",
  burglar: "入室盗贼",
  bus: "公共汽车",
  cab: "出租车"
};

let allWords = [];
let activeWords = [];
let currentIndex = 0;
let lastChecked = false;
let voices = [];
let selectedVoiceName = "";
let wordListVisible = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }

  return rows;
}

function csvToWords(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  const headers = rows.shift()?.map((header) => header.trim()) || [];
  const chapterIndex = headers.findIndex((header) => header.includes("章节"));
  const paperIndex = headers.findIndex((header) => header.includes("Test Paper"));
  const wordIndex = headers.findIndex((header) => header.includes("错词"));

  return rows
    .map((row, index) => ({
      id: `${row[chapterIndex] || "Unknown"}|${row[paperIndex] || "Unknown"}|${row[wordIndex] || index}`,
      chapter: row[chapterIndex]?.trim() || "未分章",
      paper: row[paperIndex]?.trim() || "未分卷",
      word: row[wordIndex]?.trim() || ""
    }))
    .filter((item) => item.word);
}

function normalizeWords(items) {
  return items
    .map((item, index) => ({
      id: `${item.chapter || "Unknown"}|${item.paper || "Unknown"}|${item.word || index}`,
      chapter: String(item.chapter || "未分章").trim(),
      paper: String(item.paper || "未分卷").trim(),
      word: String(item.word || "").trim()
    }))
    .filter((item) => item.word);
}

function loadStats() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function normalizeAnswer(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getMeaning(word) {
  return WORD_MEANINGS[word] || WORD_MEANINGS[word.toLowerCase()] || "暂无释义，请先在词典中补充。";
}

function currentWord() {
  return activeWords[currentIndex];
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]))].sort((a, b) => a.localeCompare(b));
}

function populateFilters() {
  const chapters = uniqueValues(allWords, "chapter");
  const papers = uniqueValues(allWords, "paper");

  $("#chapterFilter").innerHTML = ["全部章节", ...chapters]
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
  $("#paperFilter").innerHTML = ["全部试卷", ...papers]
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
}

function applyFilters() {
  const stats = loadStats();
  const chapter = $("#chapterFilter").value;
  const paper = $("#paperFilter").value;
  const mode = $("#modeSelect").value;

  activeWords = allWords.filter((item) => {
    const itemStats = stats[item.id] || {};
    const matchChapter = chapter === "全部章节" || item.chapter === chapter;
    const matchPaper = paper === "全部试卷" || item.paper === paper;
    const matchMode =
      mode === "all" ||
      (mode === "unmastered" && !itemStats.mastered) ||
      (mode === "mistakes" && (itemStats.wrong || 0) > 0);
    return matchChapter && matchPaper && matchMode;
  });

  currentIndex = 0;
  lastChecked = false;
  renderCurrentWord();
  renderStats();
  renderWordGrid();
}

function renderCurrentWord() {
  const item = currentWord();
  $("#answerInput").value = "";

  if (!item) {
    $("#wordMeta").textContent = "没有可练习的词";
    $("#wordIndex").textContent = "0 / 0";
    $("#resultBox").className = "result-box";
    $("#resultBox").textContent = "当前筛选条件下没有单词。可以切换模式或导入新的 CSV。";
    return;
  }

  $("#wordMeta").textContent = `${item.chapter} · ${item.paper}`;
  $("#wordIndex").textContent = `${currentIndex + 1} / ${activeWords.length}`;
  $("#resultBox").className = "result-box";
  $("#resultBox").textContent = "点击播放，听写这个词。";
  $("#meaningCheck").hidden = true;
  $("#meaningText").textContent = "先在心里说出中文意思，再选择是否知道。";
  $("#answerInput").focus();
}

function renderStats() {
  const stats = loadStats();
  const values = Object.values(stats);
  const attempted = values.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correct = values.reduce((sum, item) => sum + (item.correct || 0), 0);
  const wrong = values.reduce((sum, item) => sum + (item.wrong || 0), 0);
  const mastered = allWords.filter((item) => stats[item.id]?.mastered).length;
  const meaningKnown = values.reduce((sum, item) => sum + (item.meaningKnown || 0), 0);
  const meaningUnknown = values.reduce((sum, item) => sum + (item.meaningUnknown || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayAttempts = values
    .filter((item) => item.lastDate === today)
    .reduce((sum, item) => sum + (item.todayAttempts || 0), 0);

  $("#attemptedCount").textContent = attempted;
  $("#correctCount").textContent = correct;
  $("#wrongCount").textContent = wrong;
  $("#masteredCount").textContent = mastered;
  $("#meaningKnownCount").textContent = meaningKnown;
  $("#meaningUnknownCount").textContent = meaningUnknown;
  $("#dailyGoal").textContent = `${Math.min(todayAttempts, DAILY_GOAL)} / ${DAILY_GOAL}`;
  $("#goalProgress").style.width = `${Math.min(todayAttempts / DAILY_GOAL, 1) * 100}%`;
  $("#libraryCount").textContent = `${allWords.length} 词`;
}

function renderWordGrid() {
  $("#wordSearchBox").hidden = !wordListVisible;
  $("#toggleWordList").innerHTML = `
    <span data-icon="${wordListVisible ? "eye-off" : "eye"}"></span>
    <span>${wordListVisible ? "隐藏列表" : "显示列表"}</span>
  `;

  if (!wordListVisible) {
    $("#wordGrid").innerHTML = `
      <div class="empty-state">
        错词列表已隐藏。听写时不会提前看到单词；需要复盘时再手动显示。
      </div>
    `;
    createIcons();
    return;
  }

  const stats = loadStats();
  const query = normalizeAnswer($("#wordSearch").value);
  const words = activeWords.filter((item) => normalizeAnswer(item.word).includes(query));

  $("#wordGrid").innerHTML = words.map((item) => {
    const itemStats = stats[item.id] || {};
    const status = itemStats.mastered ? "mastered" : itemStats.wrong ? "problem" : "";
    const meaningLabel = itemStats.knowsMeaning ? "懂意思" : itemStats.meaningUnknown ? "意思不熟" : "释义未测";
    const label = itemStats.mastered ? "已掌握" : itemStats.wrong ? `错 ${itemStats.wrong}` : "未练";
    return `
      <button class="word-chip ${status}" data-word-id="${item.id}">
        <strong>${item.word}</strong>
        <small>${item.chapter} · ${item.paper}</small>
        <small>${label} · ${meaningLabel}</small>
      </button>
    `;
  }).join("");
  createIcons();
}

function speak(rateOverride) {
  const item = currentWord();
  if (!item || !("speechSynthesis" in window)) return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(item.word);
  utterance.lang = "en-US";
  utterance.rate = rateOverride || Number($("#rateControl").value);

  const voice = voices.find((entry) => entry.name === selectedVoiceName);
  if (voice) utterance.voice = voice;

  speechSynthesis.speak(utterance);
}

function markAnswer(isCorrect) {
  const item = currentWord();
  if (!item) return;

  const stats = loadStats();
  const today = new Date().toISOString().slice(0, 10);
  const itemStats = stats[item.id] || {
    attempts: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    mastered: false,
    todayAttempts: 0,
    lastDate: today
  };

  if (itemStats.lastDate !== today) {
    itemStats.todayAttempts = 0;
    itemStats.lastDate = today;
  }

  itemStats.attempts += 1;
  itemStats.todayAttempts += 1;

  if (isCorrect) {
    itemStats.correct += 1;
    itemStats.streak += 1;
    itemStats.mastered = itemStats.streak >= 3;
  } else {
    itemStats.wrong += 1;
    itemStats.streak = 0;
    itemStats.mastered = false;
  }

  stats[item.id] = itemStats;
  saveStats(stats);
}

function showMeaningCheck() {
  const item = currentWord();
  if (!item) return;
  $("#meaningCheck").hidden = false;
  $("#meaningText").textContent = "先在心里说出中文意思，再选择是否知道。选择后会显示参考释义。";
}

function markMeaning(knowsMeaning) {
  const item = currentWord();
  if (!item) return;

  const stats = loadStats();
  const itemStats = stats[item.id] || {
    attempts: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    mastered: false
  };

  if (knowsMeaning) {
    itemStats.meaningKnown = (itemStats.meaningKnown || 0) + 1;
    itemStats.knowsMeaning = true;
  } else {
    itemStats.meaningUnknown = (itemStats.meaningUnknown || 0) + 1;
    itemStats.knowsMeaning = false;
  }

  stats[item.id] = itemStats;
  saveStats(stats);
  $("#meaningText").innerHTML = `参考释义：<strong>${getMeaning(item.word)}</strong>`;
  renderStats();
  renderWordGrid();
}

function checkAnswer() {
  const item = currentWord();
  if (!item) return;

  const answer = normalizeAnswer($("#answerInput").value);
  const expected = normalizeAnswer(item.word);
  const isCorrect = answer === expected;

  markAnswer(isCorrect);
  lastChecked = true;
  $("#resultBox").className = `result-box ${isCorrect ? "correct" : "wrong"}`;
  $("#resultBox").innerHTML = isCorrect
    ? `正确。答案是 <strong>${item.word}</strong>。连续答对 3 次后会标记为掌握。`
    : `还差一点。正确拼写是 <strong>${item.word}</strong>，你输入的是 <strong>${$("#answerInput").value || "空白"}</strong>。`;
  showMeaningCheck();
  renderStats();
  renderWordGrid();
}

function nextWord() {
  if (!activeWords.length) return;
  currentIndex = (currentIndex + 1) % activeWords.length;
  lastChecked = false;
  renderCurrentWord();
  window.setTimeout(() => speak(), 180);
}

function revealAnswer() {
  const item = currentWord();
  if (!item) return;
  $("#resultBox").className = "result-box wrong";
  $("#resultBox").innerHTML = `答案是 <strong>${item.word}</strong>。`;
  showMeaningCheck();
}

function shuffleActiveWords() {
  for (let index = activeWords.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [activeWords[index], activeWords[swapIndex]] = [activeWords[swapIndex], activeWords[index]];
  }
  currentIndex = 0;
  renderCurrentWord();
  renderWordGrid();
}

function loadVoices() {
  if (!("speechSynthesis" in window)) {
    $("#voiceStatus").textContent = "当前浏览器不支持语音合成";
    return;
  }

  voices = speechSynthesis.getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => a.name.localeCompare(b.name));

  $("#voiceCount").textContent = `${voices.length} voices`;
  $("#voiceSelect").innerHTML = voices.map((voice) => `
    <option value="${voice.name}">${voice.name} · ${voice.lang}</option>
  `).join("");

  const preferred = voices.find((voice) => voice.lang === "en-US") || voices[0];
  selectedVoiceName = selectedVoiceName || preferred?.name || "";
  $("#voiceSelect").value = selectedVoiceName;
}

async function loadDefaultCsv() {
  if (Array.isArray(window.DEFAULT_WORDS)) {
    allWords = normalizeWords(window.DEFAULT_WORDS);
    $("#librarySource").textContent = "data/words.js";
    return;
  }

  const response = await fetch(DATA_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error("CSV load failed");
  const text = await response.text();
  allWords = csvToWords(text);
  $("#librarySource").textContent = "data/wrong-words.csv";
}

function loadUserCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const buffer = reader.result;
    const utf8Text = new TextDecoder("utf-8").decode(buffer);
    let words = csvToWords(utf8Text);

    if (!words.length && "TextDecoder" in window) {
      try {
        const gbText = new TextDecoder("gb18030").decode(buffer);
        words = csvToWords(gbText);
      } catch (error) {
        words = [];
      }
    }

    allWords = words;
    $("#librarySource").textContent = file.name;
    populateFilters();
    applyFilters();
  };
  reader.readAsArrayBuffer(file);
}

function bindEvents() {
  $("#chapterFilter").addEventListener("change", applyFilters);
  $("#paperFilter").addEventListener("change", applyFilters);
  $("#modeSelect").addEventListener("change", applyFilters);
  $("#wordSearch").addEventListener("input", renderWordGrid);

  $("#speakButton").addEventListener("click", () => speak());
  $("#slowSpeakButton").addEventListener("click", () => speak(0.58));
  $("#checkButton").addEventListener("click", checkAnswer);
  $("#nextButton").addEventListener("click", nextWord);
  $("#revealButton").addEventListener("click", revealAnswer);
  $("#knownMeaningButton").addEventListener("click", () => markMeaning(true));
  $("#unknownMeaningButton").addEventListener("click", () => markMeaning(false));
  $("#shuffleButton").addEventListener("click", shuffleActiveWords);
  $("#toggleWordList").addEventListener("click", () => {
    wordListVisible = !wordListVisible;
    renderWordGrid();
  });

  $("#answerInput").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (lastChecked) nextWord();
    else checkAnswer();
  });

  $("#voiceSelect").addEventListener("change", (event) => {
    selectedVoiceName = event.target.value;
    speak();
  });

  $("#csvInput").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) loadUserCsv(file);
  });

  $("#resetStats").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderStats();
    renderWordGrid();
  });

  $("#wordGrid").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-word-id]");
    if (!chip) return;
    const nextIndex = activeWords.findIndex((item) => item.id === chip.dataset.wordId);
    if (nextIndex >= 0) {
      currentIndex = nextIndex;
      renderCurrentWord();
      speak();
    }
  });

  $("#themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    localStorage.setItem("dictationTheme", dark ? "dark" : "light");
    $("#themeToggle").innerHTML = `<span data-icon="${dark ? "moon" : "sun"}"></span>`;
    createIcons();
  });
}

function createIcons() {
  if (window.lucide) window.lucide.createIcons({ nameAttr: "data-icon" });
}

async function init() {
  if (localStorage.getItem("dictationTheme") === "dark") {
    document.body.classList.add("dark");
    $("#themeToggle").innerHTML = '<span data-icon="moon"></span>';
  }

  bindEvents();
  loadVoices();
  if ("speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  try {
    await loadDefaultCsv();
  } catch (error) {
    $("#librarySource").textContent = "请导入 CSV";
    $("#resultBox").textContent = "无法自动载入 data/wrong-words.csv。请使用右上角导入 CSV。";
  }

  populateFilters();
  applyFilters();
  createIcons();
}

init();
