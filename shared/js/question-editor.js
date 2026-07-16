import {
  activateQuestionSet,
  deleteQuestionSet,
  getActiveQuestionSet,
  getQuestionSets,
  saveQuestionSet
} from "./db.js";
import { cleanText, cryptoSafeId, normalizeQuestionSet } from "./data-utils.js";
import { requireTeacherSession } from "./teacher-auth.js";

const GAMES = Object.freeze({
  "gobak-sodor": { title: "Gobak Sodor Nusantara", source: "games/gobak-sodor/data/questions.json", categories: ["Informatika", "IPS", "IPA", "Matematika", "Bahasa Indonesia"] },
  "jelajah-nusantara": { title: "Jelajah Nusantara", source: "games/jelajah-nusantara/data/questions.json", categories: ["Geografi", "Budaya", "Sejarah", "Lingkungan", "Bahasa"] },
  "congklak-cerdas": { title: "Congklak Cerdas", source: "games/congklak-cerdas/data/questions.json", categories: ["Penjumlahan", "Perkalian", "Logika", "Strategi", "Budaya"] },
  "engklek-pintar": { title: "Engklek Pintar", source: "games/engklek-pintar/data/questions.json", categories: ["Matematika", "IPA", "IPS", "Bahasa Indonesia", "Budaya"] },
  "egrang-nusantara": { title: "Egrang Nusantara", source: "games/egrang-nusantara/data/questions.json", categories: ["Budaya", "PJOK", "IPA", "Keselamatan", "Matematika"] }
});

const state = { gameId: "gobak-sodor", sets: [], current: null, builtIn: [], editIndex: -1 };
const $ = selector => document.querySelector(selector);

function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function download(content, name, type = "application/json") { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function feedback(message, type = "success") { const el = $("[data-editor-feedback]"); el.textContent = message; el.className = `form-feedback ${type}`; }

async function loadBuiltIn() {
  const response = await fetch(GAMES[state.gameId].source);
  if (!response.ok) throw new Error("Bank soal bawaan gagal dibaca.");
  state.builtIn = await response.json();
}

async function loadState({ keepSelection = false, selectBuiltIn = false } = {}) {
  const previous = keepSelection ? state.current?.id : null;
  await loadBuiltIn();
  state.sets = await getQuestionSets(state.gameId);
  state.current = selectBuiltIn ? null : (state.sets.find(item => item.id === previous) || state.sets[0] || null);
  render();
}

function render() {
  const game = GAMES[state.gameId];
  $("[data-editor-game-title]").textContent = game.title;
  $("[data-builtin-count]").textContent = `${state.builtIn.length} soal`;
  const active = state.sets.find(item => item.active);
  $("[data-active-set]").textContent = active ? active.name : "Bank soal bawaan";
  $("[data-set-list]").innerHTML = [
    `<button type="button" class="question-set-item ${!state.current ? "selected" : ""}" data-set-id="default"><span><strong>Bank soal bawaan</strong><small>${state.builtIn.length} soal · tidak dapat diedit</small></span><span class="status-chip ${active ? "" : "active"}">${active ? "Bawaan" : "Aktif"}</span></button>`,
    ...state.sets.map(set => `<button type="button" class="question-set-item ${state.current?.id === set.id ? "selected" : ""}" data-set-id="${escapeHtml(set.id)}"><span><strong>${escapeHtml(set.name)}</strong><small>${set.questions.length} soal · diperbarui ${new Date(set.updatedAt).toLocaleDateString("id-ID")}</small></span><span class="status-chip ${set.active ? "active" : ""}">${set.active ? "Aktif" : "Draft"}</span></button>`)
  ].join("");
  renderCurrent();
  renderCategoryOptions();
}

function renderCategoryOptions() {
  $("[data-category-options]").innerHTML = GAMES[state.gameId].categories.map(item => `<option value="${escapeHtml(item)}"></option>`).join("");
}

function renderCurrent() {
  const empty = !state.current;
  $("[data-custom-editor]").hidden = empty;
  $("[data-builtin-panel]").hidden = !empty;
  if (empty) return;
  $("[data-set-name]").value = state.current.name;
  $("[data-set-count]").textContent = `${state.current.questions.length} soal`;
  $("[data-set-status]").textContent = state.current.active ? "Aktif untuk permainan" : state.current.questions.length < 6 ? "Belum dapat diaktifkan" : "Draft siap diaktifkan";
  $("[data-activate-set]").disabled = state.current.questions.length < 6 || state.current.active;
  $("[data-question-list]").innerHTML = state.current.questions.map((question, index) => `<article class="question-row"><div><span class="eyebrow">${escapeHtml(question.category)}</span><strong>${index + 1}. ${escapeHtml(question.question)}</strong><small>Jawaban: ${String.fromCharCode(65 + Number(question.answer))}. ${escapeHtml(question.choices[Number(question.answer)])}</small></div><div class="question-actions"><button class="button secondary compact" type="button" data-edit-question="${index}">Edit</button><button class="button danger-ghost compact" type="button" data-delete-question="${index}">Hapus</button></div></article>`).join("") || `<p class="empty-copy">Belum ada soal. Tambahkan soal pertama melalui formulir di bawah.</p>`;
  resetQuestionForm();
}

function resetQuestionForm() {
  state.editIndex = -1;
  const form = $("[data-question-form]");
  form.reset();
  form.querySelector('[name="answer"]').value = "0";
  $("[data-question-form-title]").textContent = "Tambah soal";
  $("[data-cancel-edit]").hidden = true;
}

async function createSet() {
  const name = prompt(`Nama set soal untuk ${GAMES[state.gameId].title}:`);
  if (!name) return;
  const row = await saveQuestionSet({ id: cryptoSafeId(), gameId: state.gameId, name, questions: [], active: false });
  await loadState();
  state.current = state.sets.find(item => item.id === row.id) || null;
  render();
  feedback("Set soal baru dibuat.");
}

async function duplicateBuiltIn() {
  const name = prompt("Nama salinan bank soal:", `${GAMES[state.gameId].title} · Salinan`);
  if (!name) return;
  const questions = state.builtIn.map(question => ({ ...question, id: `${state.gameId}-custom-${cryptoSafeId()}` }));
  const row = await saveQuestionSet({ id: cryptoSafeId(), gameId: state.gameId, name, questions, active: false });
  await loadState();
  state.current = state.sets.find(item => item.id === row.id) || null;
  render();
  feedback(`${questions.length} soal bawaan disalin dan dapat diedit.`);
}

async function saveCurrent() {
  if (!state.current) return;
  const name = cleanText($("[data-set-name]").value, 80);
  const row = await saveQuestionSet({ ...state.current, name }, { activate: state.current.active });
  state.current = row;
  await loadState({ keepSelection: true });
  feedback("Nama set soal disimpan.");
}

async function saveQuestion(event) {
  event.preventDefault();
  if (!state.current) return;
  const fd = new FormData(event.currentTarget);
  const question = {
    id: state.editIndex >= 0 ? state.current.questions[state.editIndex].id : `${state.gameId}-${cryptoSafeId()}`,
    category: fd.get("category"),
    question: fd.get("question"),
    choices: [fd.get("choice0"), fd.get("choice1"), fd.get("choice2"), fd.get("choice3")],
    answer: Number(fd.get("answer")),
    explanation: fd.get("explanation")
  };
  const wasEditing = state.editIndex >= 0;
  const questions = [...state.current.questions];
  if (state.editIndex >= 0) questions[state.editIndex] = question; else questions.push(question);
  const row = normalizeQuestionSet({ ...state.current, questions });
  state.current = await saveQuestionSet(row, { activate: row.active });
  await loadState({ keepSelection: true });
  feedback(wasEditing ? "Soal diperbarui." : "Soal ditambahkan.");
}

function editQuestion(index) {
  const question = state.current?.questions[index];
  if (!question) return;
  state.editIndex = index;
  const form = $("[data-question-form]");
  form.elements.category.value = question.category;
  form.elements.question.value = question.question;
  question.choices.forEach((choice, choiceIndex) => { form.elements[`choice${choiceIndex}`].value = choice; });
  form.elements.answer.value = String(question.answer);
  form.elements.explanation.value = question.explanation || "";
  $("[data-question-form-title]").textContent = `Edit soal ${index + 1}`;
  $("[data-cancel-edit]").hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function removeQuestion(index) {
  if (!state.current || !confirm("Hapus soal ini?")) return;
  const questions = state.current.questions.filter((_, itemIndex) => itemIndex !== index);
  const active = state.current.active && questions.length >= 6;
  if (state.current.active && !active) alert("Set otomatis dinonaktifkan karena jumlah soal kurang dari enam.");
  state.current = await saveQuestionSet({ ...state.current, questions, active }, { activate: active });
  if (!active) await activateQuestionSet(state.gameId, null);
  await loadState({ keepSelection: true });
  feedback("Soal dihapus.");
}

async function activateCurrent() {
  if (!state.current) return;
  await activateQuestionSet(state.gameId, state.current.id);
  await loadState({ keepSelection: true });
  feedback("Set soal aktif untuk permainan berikutnya.");
}

async function activateBuiltIn() {
  await activateQuestionSet(state.gameId, null);
  state.current = null;
  await loadState({ selectBuiltIn: true });
  feedback("Bank soal bawaan diaktifkan.");
}

async function removeSet() {
  if (!state.current || !confirm(`Hapus set “${state.current.name}”?`)) return;
  const wasActive = state.current.active;
  await deleteQuestionSet(state.current.id);
  if (wasActive) await activateQuestionSet(state.gameId, null);
  state.current = null;
  await loadState();
  feedback("Set soal dihapus.");
}

function exportSet() {
  if (!state.current) return;
  download(JSON.stringify({ schema: "ppn-question-set-v1", ...state.current }, null, 2), `set-soal-${state.gameId}-${state.current.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`);
}

async function importSet(file) {
  const parsed = JSON.parse(await file.text());
  const source = Array.isArray(parsed) ? { name: file.name.replace(/\.json$/i, ""), gameId: state.gameId, questions: parsed } : parsed;
  const row = normalizeQuestionSet({ ...source, id: cryptoSafeId(), gameId: source.gameId || state.gameId, active: false });
  if (row.gameId !== state.gameId && !confirm(`File ini untuk ${GAMES[row.gameId]?.title || row.gameId}. Beralih ke game tersebut?`)) throw new Error("Impor dibatalkan.");
  state.gameId = row.gameId;
  document.querySelector("[data-game-select]").value = row.gameId;
  await saveQuestionSet(row);
  await loadState();
  state.current = state.sets.find(item => item.id === row.id) || null;
  render();
  feedback(`${row.questions.length} soal berhasil diimpor.`);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!await requireTeacherSession()) return;
  const gameSelect = $("[data-game-select]");
  gameSelect.innerHTML = Object.entries(GAMES).map(([id, game]) => `<option value="${id}">${game.title}</option>`).join("");
  gameSelect.addEventListener("change", async () => { state.gameId = gameSelect.value; state.current = null; await loadState(); });
  $("[data-new-set]").addEventListener("click", createSet);
  document.querySelectorAll("[data-copy-builtin]").forEach(button => button.addEventListener("click", duplicateBuiltIn));
  $("[data-activate-builtin]").addEventListener("click", activateBuiltIn);
  $("[data-save-set]").addEventListener("click", saveCurrent);
  $("[data-activate-set]").addEventListener("click", activateCurrent);
  $("[data-delete-set]").addEventListener("click", removeSet);
  $("[data-export-set]").addEventListener("click", exportSet);
  $("[data-import-set]").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await importSet(file); } catch (error) { feedback(`Impor gagal: ${error.message}`, "error"); }
    finally { event.target.value = ""; }
  });
  $("[data-question-form]").addEventListener("submit", event => saveQuestion(event).catch(error => feedback(error.message, "error")));
  $("[data-cancel-edit]").addEventListener("click", resetQuestionForm);
  $("[data-set-list]").addEventListener("click", event => {
    const button = event.target.closest("[data-set-id]");
    if (!button) return;
    state.current = button.dataset.setId === "default" ? null : state.sets.find(item => item.id === button.dataset.setId) || null;
    render();
  });
  $("[data-question-list]").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-question]");
    const remove = event.target.closest("[data-delete-question]");
    if (edit) editQuestion(Number(edit.dataset.editQuestion));
    if (remove) removeQuestion(Number(remove.dataset.deleteQuestion)).catch(error => feedback(error.message, "error"));
  });
  await loadState();
});
