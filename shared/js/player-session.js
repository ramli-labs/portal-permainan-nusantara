import { savePlayers } from "./db.js";
import { cleanText } from "./data-utils.js";

const ACTIVE_KEY = "ppnActivePlayerSessionV2";
const LAST_KEY = "ppnLastPlayersV2";
const SESSION_MAX_MINUTES = 45;

export function normalizeMode(value) { return value === "coop" || value === "Co-op" ? "coop" : "solo"; }

export async function createPlayerSession({ gameId, gameTitle, mode, player1, player2, className, difficulty, remember = true }) {
  const normalizedMode = normalizeMode(mode);
  const names = [cleanText(player1, 40)];
  if (normalizedMode === "coop") names.push(cleanText(player2, 40));
  if (names.some(name => name.length < 2)) throw new Error("Nama pemain minimal 2 karakter");
  if (new Set(names.map(name => name.toLowerCase())).size !== names.length) throw new Error("Nama Pemain 1 dan Pemain 2 harus berbeda");
  const safeClass = cleanText(className, 30);
  const saved = await savePlayers(names.map(name => ({ name })), safeClass);
  const now = Date.now();
  const session = {
    id: crypto.randomUUID(),
    gameId: String(gameId),
    gameTitle: String(gameTitle || gameId),
    mode: normalizedMode,
    players: saved.map(row => row.name),
    playerIds: saved.map(row => row.id),
    className: safeClass,
    difficulty: String(difficulty || "normal"),
    startedAt: new Date(now).toISOString(),
    expiresAt: now + SESSION_MAX_MINUTES * 60_000
  };
  sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  if (remember) localStorage.setItem(LAST_KEY, JSON.stringify({ players: session.players, className: session.className }));
  else localStorage.removeItem(LAST_KEY);
  return session;
}

export function getActivePlayerSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || "null");
    if (!session || Number(session.expiresAt || 0) <= Date.now()) {
      clearActivePlayerSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
export function clearActivePlayerSession() { sessionStorage.removeItem(ACTIVE_KEY); }
export function getLastPlayers() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || "null") || { players: [], className: "" }; }
  catch { return { players: [], className: "" }; }
}
export function requireSession(gameId) {
  const session = getActivePlayerSession();
  if (!session || session.gameId !== gameId) {
    location.href = `../../play.html?game=${encodeURIComponent(gameId)}`;
    return null;
  }
  return session;
}
