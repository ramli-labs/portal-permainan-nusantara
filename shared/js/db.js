import {
  APP_VERSION,
  BACKUP_SCHEMA,
  cleanText,
  computeRankingPoints,
  normalizeQuestionSet,
  validateBackupData
} from "./data-utils.js";

const DB_NAME = "ppn-ifp-v2";
const DB_VERSION = 3;
const STORES = Object.freeze({
  players: "players",
  sessions: "sessions",
  settings: "settings",
  questionSets: "questionSets"
});

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Operasi IndexedDB gagal"));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Transaksi IndexedDB gagal"));
    tx.onabort = () => reject(tx.error || new Error("Transaksi dibatalkan"));
  });
}

export async function openPortalDB() {
  if (!("indexedDB" in window)) throw new Error("Browser tidak mendukung IndexedDB");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      let players;
      if (!db.objectStoreNames.contains(STORES.players)) {
        players = db.createObjectStore(STORES.players, { keyPath: "id" });
        players.createIndex("byName", "normalizedName", { unique: false });
        players.createIndex("byUpdated", "updatedAt", { unique: false });
      } else players = tx.objectStore(STORES.players);
      if (!players.indexNames.contains("byClass")) players.createIndex("byClass", "className", { unique: false });

      let sessions;
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        sessions = db.createObjectStore(STORES.sessions, { keyPath: "id" });
        sessions.createIndex("byPlayedAt", "playedAt", { unique: false });
        sessions.createIndex("byGame", "gameId", { unique: false });
        sessions.createIndex("byMode", "mode", { unique: false });
      } else sessions = tx.objectStore(STORES.sessions);
      if (!sessions.indexNames.contains("byClass")) sessions.createIndex("byClass", "className", { unique: false });
      if (!sessions.indexNames.contains("byResult")) sessions.createIndex("byResult", "result", { unique: false });

      if (!db.objectStoreNames.contains(STORES.settings)) db.createObjectStore(STORES.settings, { keyPath: "key" });

      let questionSets;
      if (!db.objectStoreNames.contains(STORES.questionSets)) {
        questionSets = db.createObjectStore(STORES.questionSets, { keyPath: "id" });
        questionSets.createIndex("byGame", "gameId", { unique: false });
      } else questionSets = tx.objectStore(STORES.questionSets);
      // Boolean bukan key IndexedDB yang valid. Hapus indeks eksperimen lama bila pernah terbentuk.
      if (questionSets.indexNames.contains("byActive")) questionSets.deleteIndex("byActive");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Database lokal gagal dibuka"));
  });
}

async function withStore(name, mode, handler) {
  const db = await openPortalDB();
  const tx = db.transaction(name, mode);
  const result = await handler(tx.objectStore(name), tx);
  await transactionDone(tx);
  db.close();
  return result;
}

export async function putRecord(store, value) {
  return withStore(store, "readwrite", async objectStore => requestToPromise(objectStore.put(value)));
}
export async function getRecord(store, key) {
  return withStore(store, "readonly", async objectStore => requestToPromise(objectStore.get(key)));
}
export async function getAllRecords(store) {
  return withStore(store, "readonly", async objectStore => requestToPromise(objectStore.getAll()));
}
export async function deleteRecord(store, key) {
  return withStore(store, "readwrite", async objectStore => requestToPromise(objectStore.delete(key)));
}
export async function clearStore(store) {
  return withStore(store, "readwrite", async objectStore => requestToPromise(objectStore.clear()));
}

export async function savePlayers(players = [], className = "") {
  const now = new Date().toISOString();
  const saved = [];
  const all = await getAllRecords(STORES.players);
  for (const item of players) {
    const name = cleanText(item?.name || item, 40);
    if (name.length < 2) continue;
    const normalizedName = name.toLocaleLowerCase("id-ID");
    const safeClass = cleanText(className, 30);
    const existing = all.find(row => row.normalizedName === normalizedName && String(row.className || "") === safeClass);
    const row = {
      id: existing?.id || crypto.randomUUID(),
      name,
      normalizedName,
      className: safeClass,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      sessionCount: existing?.sessionCount || 0
    };
    await putRecord(STORES.players, row);
    saved.push(row);
  }
  return saved;
}

export async function saveGameSession(payload) {
  const now = new Date().toISOString();
  const rawScore = Math.max(0, Number(payload.score) || 0);
  const score = Math.min(10000, rawScore);
  const accuracy = Math.max(0, Math.min(100, Number(payload.accuracy) || 0));
  const result = payload.result === "won" || payload.result === "Menang" ? "won" : "lost";
  const row = {
    id: cleanText(payload.id || crypto.randomUUID(), 100),
    gameId: cleanText(payload.gameId || payload.gameSlug || "unknown", 60),
    gameTitle: cleanText(payload.gameTitle || payload.gameId || "Game", 100),
    mode: payload.mode === "coop" || payload.mode === "Co-op" ? "coop" : "solo",
    players: Array.isArray(payload.players) ? payload.players.map(name => cleanText(name, 40)).filter(Boolean) : [],
    playerIds: Array.isArray(payload.playerIds) ? payload.playerIds.map(String) : [],
    className: cleanText(payload.className, 30),
    score,
    rawScore,
    rankingPoints: computeRankingPoints({ score, accuracy, result }),
    accuracy,
    result,
    difficulty: cleanText(payload.difficulty || "Normal", 30),
    durationSeconds: Math.max(0, Number(payload.durationSeconds) || 0),
    correctCount: Math.max(0, Number(payload.correctCount) || 0),
    questionCount: Math.max(0, Number(payload.questionCount) || 0),
    playedAt: payload.playedAt || now,
    metadata: payload.metadata && typeof payload.metadata === "object" ? { ...payload.metadata, rawScore } : { rawScore }
  };
  await putRecord(STORES.sessions, row);
  for (const playerId of row.playerIds) {
    const player = await getRecord(STORES.players, playerId);
    if (player) await putRecord(STORES.players, { ...player, sessionCount: (player.sessionCount || 0) + 1, updatedAt: now });
  }
  return row;
}

export async function getSessions() {
  const rows = await getAllRecords(STORES.sessions);
  return rows.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
}
export async function getPlayers() {
  const rows = await getAllRecords(STORES.players);
  return rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
export async function setSetting(key, value) {
  return putRecord(STORES.settings, { key, value, updatedAt: new Date().toISOString() });
}
export async function getSetting(key, fallback = null) {
  const row = await getRecord(STORES.settings, key);
  return row ? row.value : fallback;
}

export async function getQuestionSets(gameId = null) {
  const rows = await getAllRecords(STORES.questionSets);
  return rows
    .filter(row => !gameId || row.gameId === gameId)
    .sort((a, b) => Number(b.active) - Number(a.active) || new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function saveQuestionSet(input, { activate = false } = {}) {
  const row = normalizeQuestionSet({ ...input, active: activate || input.active });
  if (row.active && row.questions.length < 6) throw new Error("Set soal minimal berisi 6 soal agar dapat diaktifkan.");
  if (row.active) {
    const siblings = await getQuestionSets(row.gameId);
    for (const sibling of siblings) {
      if (sibling.id !== row.id && sibling.active) await putRecord(STORES.questionSets, { ...sibling, active: false, updatedAt: new Date().toISOString() });
    }
  }
  await putRecord(STORES.questionSets, row);
  return row;
}

export async function deleteQuestionSet(id) {
  return deleteRecord(STORES.questionSets, id);
}

export async function getActiveQuestionSet(gameId) {
  const rows = await getQuestionSets(gameId);
  return rows.find(row => row.active && Array.isArray(row.questions) && row.questions.length >= 6) || null;
}

export async function activateQuestionSet(gameId, setId = null) {
  const rows = await getQuestionSets(gameId);
  let activated = null;
  for (const row of rows) {
    const active = Boolean(setId && row.id === setId);
    if (active && row.questions.length < 6) throw new Error("Set soal minimal berisi 6 soal agar dapat diaktifkan.");
    const next = { ...row, active, updatedAt: new Date().toISOString() };
    await putRecord(STORES.questionSets, next);
    if (active) activated = next;
  }
  await setSetting(`activeQuestionSet:${gameId}`, activated?.id || "default");
  return activated;
}

export async function updatePlayer(playerId, { name, className }) {
  const player = await getRecord(STORES.players, playerId);
  if (!player) throw new Error("Profil pemain tidak ditemukan.");
  const nextName = cleanText(name, 40);
  if (nextName.length < 2) throw new Error("Nama pemain minimal 2 karakter.");
  const nextClass = cleanText(className, 30);
  const next = { ...player, name: nextName, normalizedName: nextName.toLocaleLowerCase("id-ID"), className: nextClass, updatedAt: new Date().toISOString() };
  await putRecord(STORES.players, next);
  const sessions = await getSessions();
  for (const session of sessions) {
    let changed = false;
    const players = [...(session.players || [])];
    if (Array.isArray(session.playerIds) && session.playerIds.length) {
      session.playerIds.forEach((id, index) => { if (id === playerId) { players[index] = nextName; changed = true; } });
    } else {
      players.forEach((value, index) => { if (value === player.name && String(session.className || "") === String(player.className || "")) { players[index] = nextName; changed = true; } });
    }
    if (changed) await putRecord(STORES.sessions, { ...session, players, className: nextClass || session.className });
  }
  return next;
}

export async function removePlayer(playerId, { removeSessions = false } = {}) {
  const player = await getRecord(STORES.players, playerId);
  if (!player) return { sessionsRemoved: 0 };
  let removed = 0;
  if (removeSessions) {
    const sessions = await getSessions();
    for (const session of sessions) {
      const matched = session.playerIds?.includes(playerId) || session.players?.includes(player.name);
      if (matched) { await deleteRecord(STORES.sessions, session.id); removed += 1; }
    }
  }
  await deleteRecord(STORES.players, playerId);
  return { sessionsRemoved: removed };
}

export async function exportAllData() {
  const players = await getPlayers();
  const sessions = await getSessions();
  const settings = await getAllRecords(STORES.settings);
  const questionSets = await getAllRecords(STORES.questionSets);
  return {
    schema: BACKUP_SCHEMA,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    summary: { players: players.length, sessions: sessions.length, settings: settings.length, questionSets: questionSets.length },
    players,
    sessions,
    settings,
    questionSets
  };
}

export async function importAllData(data, { replace = false } = {}) {
  const preview = validateBackupData(data);
  if (replace) for (const name of Object.values(STORES)) await clearStore(name);
  for (const row of data.players || []) await putRecord(STORES.players, row);
  for (const row of data.sessions || []) {
    const normalized = { ...row, score: Math.min(10000, Math.max(0, Number(row.score) || 0)) };
    normalized.rankingPoints = Number(row.rankingPoints) || computeRankingPoints(normalized);
    await putRecord(STORES.sessions, normalized);
  }
  for (const row of data.settings || []) await putRecord(STORES.settings, row);
  for (const input of data.questionSets || []) {
    const row = normalizeQuestionSet(input);
    await putRecord(STORES.questionSets, row);
  }
  return preview;
}

export async function clearLearningData() {
  await clearStore(STORES.sessions);
  await clearStore(STORES.players);
}

export async function getAnalytics() {
  const sessions = await getSessions();
  const players = await getPlayers();
  const totals = {
    sessions: sessions.length,
    players: players.length,
    wins: sessions.filter(row => row.result === "won").length,
    averageAccuracy: sessions.length ? Math.round(sessions.reduce((sum, row) => sum + (row.accuracy || 0), 0) / sessions.length) : 0,
    averageScore: sessions.length ? Math.round(sessions.reduce((sum, row) => sum + (row.score || 0), 0) / sessions.length) : 0
  };
  const byGame = new Map();
  const byPlayer = new Map();
  const byCategory = new Map();
  for (const row of sessions) {
    const game = byGame.get(row.gameId) || { gameId: row.gameId, gameTitle: row.gameTitle, sessions: 0, score: 0, accuracy: 0, wins: 0 };
    game.sessions += 1; game.score += row.score || 0; game.accuracy += row.accuracy || 0; if (row.result === "won") game.wins += 1; byGame.set(row.gameId, game);
    for (const name of row.players || []) {
      const key = `${name}|${row.className || ""}`;
      const player = byPlayer.get(key) || { name, className: row.className || "", sessions: 0, score: 0, accuracy: 0, wins: 0 };
      player.sessions += 1; player.score += row.score || 0; player.accuracy += row.accuracy || 0; if (row.result === "won") player.wins += 1; byPlayer.set(key, player);
    }
    const reports = [];
    if (Array.isArray(row.metadata?.report)) reports.push(...row.metadata.report);
    if (Array.isArray(row.metadata?.categories)) reports.push(...row.metadata.categories);
    if (row.metadata?.categories && !Array.isArray(row.metadata.categories) && typeof row.metadata.categories === "object") {
      reports.push(...Object.entries(row.metadata.categories).map(([category, item]) => ({ category, ...item })));
    }
    for (const item of reports) {
      const category = cleanText(item.category, 60);
      if (!category) continue;
      const current = byCategory.get(category) || { category, correct: 0, total: 0 };
      current.correct += Number(item.correct) || 0; current.total += Number(item.total) || 0; byCategory.set(category, current);
    }
  }
  return {
    totals,
    byGame: [...byGame.values()].map(item => ({ ...item, averageScore: Math.round(item.score / item.sessions), averageAccuracy: Math.round(item.accuracy / item.sessions), winRate: Math.round(item.wins / item.sessions * 100) })).sort((a, b) => b.sessions - a.sessions),
    byPlayer: [...byPlayer.values()].map(item => ({ ...item, averageScore: Math.round(item.score / item.sessions), averageAccuracy: Math.round(item.accuracy / item.sessions), winRate: Math.round(item.wins / item.sessions * 100) })).sort((a, b) => b.score - a.score),
    byCategory: [...byCategory.values()].map(item => ({ ...item, accuracy: item.total ? Math.round(item.correct / item.total * 100) : 0 })).sort((a, b) => a.accuracy - b.accuracy)
  };
}

export { STORES, DB_NAME, DB_VERSION };
