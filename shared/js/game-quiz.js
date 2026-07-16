import { getActiveQuestionSet, getSetting, setSetting } from "./db.js";

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }

function validateQuestions(data) {
  if (!Array.isArray(data) || data.length < 6) throw new Error("Bank soal minimal berisi 6 soal");
  const ids = new Set();
  for (const [index, question] of data.entries()) {
    const valid = question && typeof question.id === "string" && question.id.trim()
      && typeof question.category === "string" && question.category.trim()
      && typeof question.question === "string" && question.question.trim()
      && Array.isArray(question.choices) && question.choices.length === 4
      && question.choices.every(choice => typeof choice === "string" && choice.trim())
      && Number.isInteger(Number(question.answer)) && Number(question.answer) >= 0 && Number(question.answer) < 4;
    if (!valid) throw new Error(`Format soal ke-${index + 1} tidak valid.`);
    if (ids.has(question.id)) throw new Error(`ID soal ganda: ${question.id}`);
    ids.add(question.id);
  }
  return data.map(question => ({ ...question, answer: Number(question.answer) }));
}

export async function loadQuestionBank(gameId, url) {
  const custom = await getActiveQuestionSet(gameId);
  if (custom) return { questions: validateQuestions(custom.questions), setId: custom.id, setName: custom.name, builtIn: false };
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Bank soal gagal dimuat (${response.status})`);
  return { questions: validateQuestions(await response.json()), setId: "default", setName: "Bank soal bawaan", builtIn: true };
}

function historyKey(gameId, setId) { return `questionHistory:${gameId}:${setId}`; }

export async function selectQuestionsWithoutRepeat(gameId, bank, count) {
  const { questions, setId } = bank;
  const key = historyKey(gameId, setId);
  const validIds = new Set(questions.map(question => question.id));
  let used = await getSetting(key, []);
  used = Array.isArray(used) ? [...new Set(used)].filter(id => validIds.has(id)) : [];
  let available = questions.filter(question => !used.includes(question.id));
  if (available.length < count) {
    used = [];
    available = [...questions];
  }
  const selected = shuffle(available).slice(0, Math.min(count, available.length));
  used.push(...selected.map(question => question.id));
  await setSetting(key, used);
  return selected;
}

export class QuestionDeck {
  constructor(gameId, url) {
    this.gameId = gameId;
    this.url = url;
    this.questions = [];
    this.queue = [];
    this.stats = {};
    this.setId = "default";
    this.setName = "Bank soal bawaan";
    this.usedIds = [];
    this.sessionIds = new Set();
  }
  async load() {
    const bank = await loadQuestionBank(this.gameId, this.url);
    this.questions = bank.questions;
    this.setId = bank.setId;
    this.setName = bank.setName;
    const key = historyKey(this.gameId, this.setId);
    const validIds = new Set(this.questions.map(question => question.id));
    const stored = await getSetting(key, []);
    this.usedIds = Array.isArray(stored) ? [...new Set(stored)].filter(id => validIds.has(id)) : [];
    let available = this.questions.filter(question => !this.usedIds.includes(question.id));
    if (!available.length) { this.usedIds = []; available = [...this.questions]; }
    this.queue = shuffle(available);
    return this;
  }
  next() {
    if (!this.queue.length) {
      this.usedIds = [];
      const fresh = this.questions.filter(question => !this.sessionIds.has(question.id));
      this.queue = shuffle(fresh.length ? fresh : this.questions);
    }
    const question = this.queue.shift();
    if (question) this.sessionIds.add(question.id);
    if (question && !this.usedIds.includes(question.id)) this.usedIds.push(question.id);
    setSetting(historyKey(this.gameId, this.setId), this.usedIds).catch(console.warn);
    return question;
  }
  record(question, correct) {
    const key = question.category || "Umum";
    const row = this.stats[key] || { correct: 0, total: 0 };
    row.total += 1;
    if (correct) row.correct += 1;
    this.stats[key] = row;
  }
  getReport() {
    return Object.entries(this.stats).map(([category, row]) => ({ category, ...row, accuracy: row.total ? Math.round(row.correct / row.total * 100) : 0 }));
  }
  getSetInfo() { return { id: this.setId, name: this.setName, count: this.questions.length }; }
}

export function createQuizController(modal) {
  if (!modal) throw new Error("Elemen modal kuis tidak tersedia");
  const category = modal.querySelector("[data-quiz-category]");
  const title = modal.querySelector("[data-quiz-title]");
  const player = modal.querySelector("[data-quiz-player]");
  const options = modal.querySelector("[data-quiz-options]");
  const feedback = modal.querySelector("[data-quiz-feedback]");
  const continueButton = modal.querySelector("[data-quiz-continue]");
  let locked = false, resolver = null, current = null;
  function close(result) { modal.hidden = true; const done = resolver; resolver = null; current = null; locked = false; if (done) done(result); }
  options.addEventListener("click", event => {
    const button = event.target.closest("[data-quiz-choice]");
    if (!button || locked || !current) return;
    locked = true;
    const selected = Number(button.dataset.quizChoice);
    const correct = selected === Number(current.answer);
    [...options.querySelectorAll("button")].forEach((item, index) => { item.disabled = true; if (index === Number(current.answer)) item.classList.add("correct"); });
    if (!correct) button.classList.add("wrong");
    feedback.textContent = correct ? `Benar. ${current.explanation || ""}` : `Belum tepat. ${current.explanation || ""}`;
    feedback.className = `game-message ${correct ? "success" : "error"}`;
    continueButton.hidden = false;
    continueButton.dataset.correct = String(correct);
  });
  continueButton.addEventListener("click", () => { if (!locked) return; close({ correct: continueButton.dataset.correct === "true", question: current }); });
  return {
    ask(question, { playerName = "Pemain", heading = "Tantangan Belajar" } = {}) {
      if (resolver) throw new Error("Kuis sebelumnya belum selesai");
      current = question;
      locked = false;
      modal.hidden = false;
      category.textContent = question.category || "Umum";
      title.textContent = question.question;
      player.textContent = `${heading} · ${playerName}`;
      feedback.textContent = "Pilih satu jawaban.";
      feedback.className = "game-message";
      continueButton.hidden = true;
      options.innerHTML = question.choices.map((choice, index) => `<button class="game-quiz-option" type="button" data-quiz-choice="${index}"><strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(choice)}</button>`).join("");
      return new Promise(resolve => { resolver = resolve; });
    }
  };
}
