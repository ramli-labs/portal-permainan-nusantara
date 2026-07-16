export const APP_VERSION = "2.2.0";
export const BACKUP_SCHEMA = "ppn-ifp-backup-v2.2";
export const LEGACY_BACKUP_SCHEMAS = new Set(["ppn-ifp-backup-v2", BACKUP_SCHEMA]);
export const GAME_IDS = Object.freeze([
  "gobak-sodor",
  "jelajah-nusantara",
  "congklak-cerdas",
  "engklek-pintar",
  "egrang-nusantara"
]);

const GOBak_CATEGORIES = new Set(["Informatika", "IPS", "IPA", "Matematika", "Bahasa Indonesia"]);

export function cleanText(value, max = 200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

export function normalizeQuestion(question, { gameId = "", index = 0 } = {}) {
  if (!question || typeof question !== "object") throw new Error(`Soal ke-${index + 1} tidak valid.`);
  const id = cleanText(question.id || `${gameId || "q"}-${cryptoSafeId()}`, 80);
  const category = cleanText(question.category, 50);
  const text = cleanText(question.question, 500);
  const choices = Array.isArray(question.choices) ? question.choices.map(item => cleanText(item, 240)) : [];
  const answer = Number(question.answer);
  const explanation = cleanText(question.explanation || "", 500);
  if (!id) throw new Error(`ID soal ke-${index + 1} kosong.`);
  if (!category) throw new Error(`Kategori soal ke-${index + 1} kosong.`);
  if (gameId === "gobak-sodor" && !GOBak_CATEGORIES.has(category)) {
    throw new Error(`Kategori Gobak Sodor harus salah satu dari: ${[...GOBak_CATEGORIES].join(", ")}.`);
  }
  if (!text) throw new Error(`Pertanyaan ke-${index + 1} kosong.`);
  if (choices.length !== 4 || choices.some(choice => !choice)) throw new Error(`Soal ke-${index + 1} harus memiliki empat pilihan.`);
  if (!Number.isInteger(answer) || answer < 0 || answer > 3) throw new Error(`Jawaban soal ke-${index + 1} harus 0–3.`);
  return { id, category, question: text, choices, answer, ...(explanation ? { explanation } : {}) };
}

export function normalizeQuestionSet(input, { requirePlayable = false } = {}) {
  if (!input || typeof input !== "object") throw new Error("Data set soal tidak valid.");
  const gameId = cleanText(input.gameId, 60);
  if (!GAME_IDS.includes(gameId)) throw new Error("Game pada set soal tidak dikenali.");
  const name = cleanText(input.name, 80);
  if (name.length < 3) throw new Error("Nama set soal minimal 3 karakter.");
  const questions = Array.isArray(input.questions)
    ? input.questions.map((question, index) => normalizeQuestion(question, { gameId, index }))
    : [];
  const ids = new Set();
  for (const question of questions) {
    if (ids.has(question.id)) throw new Error(`ID soal ganda: ${question.id}.`);
    ids.add(question.id);
  }
  if (requirePlayable && questions.length < 6) throw new Error("Set soal minimal berisi 6 soal agar dapat diaktifkan.");
  const now = new Date().toISOString();
  return {
    id: cleanText(input.id || cryptoSafeId(), 80),
    gameId,
    name,
    questions,
    active: Boolean(input.active),
    createdAt: input.createdAt || now,
    updatedAt: now,
    source: "custom"
  };
}

export function validateBackupData(data) {
  if (!data || typeof data !== "object" || !LEGACY_BACKUP_SCHEMAS.has(data.schema)) {
    throw new Error("Format backup tidak dikenali.");
  }
  const arrays = ["players", "sessions", "settings", "questionSets"];
  for (const key of arrays) {
    if (data[key] !== undefined && !Array.isArray(data[key])) throw new Error(`Bagian ${key} pada backup harus berupa array.`);
  }
  const ids = new Set();
  for (const row of data.sessions || []) {
    const id = cleanText(row?.id, 100);
    if (!id) throw new Error("Backup memuat sesi tanpa ID.");
    if (ids.has(id)) throw new Error(`Backup memuat ID sesi ganda: ${id}.`);
    ids.add(id);
  }
  return {
    players: (data.players || []).length,
    sessions: (data.sessions || []).length,
    settings: (data.settings || []).length,
    questionSets: (data.questionSets || []).length,
    exportedAt: data.exportedAt || null,
    appVersion: data.appVersion || "versi lama"
  };
}

export function computeRankingPoints({ score = 0, accuracy = 0, result = "lost" } = {}) {
  const safeScore = Math.max(0, Math.min(10000, Number(score) || 0));
  const safeAccuracy = Math.max(0, Math.min(100, Number(accuracy) || 0));
  const winBonus = result === "won" || result === "Menang" ? 1000 : 0;
  return Math.min(10000, Math.round(safeScore * 0.7 + safeAccuracy * 20 + winBonus));
}

export function cryptoSafeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
