import { createPlayerSession, getLastPlayers } from "./player-session.js";
import { getActiveQuestionSet } from "./db.js";

const registry = {
  "gobak-sodor": { title: "Gobak Sodor Nusantara", icon: "🏃", modes: ["solo", "coop"], path: "games/gobak-sodor/game.html", solo: "Satu pemain menembus arena dan membawa bendera kembali.", coop: "Dua pemain bergerak bersama sebagai satu tim." },
  "jelajah-nusantara": { title: "Jelajah Nusantara", icon: "🧭", modes: ["solo", "coop"], path: "games/jelajah-nusantara/index.html", solo: "Satu pemain menjawab 15 soal ekspedisi.", coop: "Dua pemain bergantian menjawab sebagai satu tim." },
  "congklak-cerdas": { title: "Congklak Cerdas", icon: "🫘", modes: ["solo", "coop"], path: "games/congklak-cerdas/index.html", solo: "Satu pemain melawan AI Nusantara.", coop: "Dua pemain berhadapan dan bergantian pada satu IFP." },
  "engklek-pintar": { title: "Engklek Pintar", icon: "🟨", modes: ["solo", "coop"], path: "games/engklek-pintar/index.html", solo: "Satu pemain menyelesaikan semua ronde.", coop: "Dua pemain bergantian menyelesaikan ronde engklek." },
  "egrang-nusantara": { title: "Egrang Nusantara", icon: "🎋", modes: ["solo", "coop"], path: "games/egrang-nusantara/index.html", solo: "Satu pemain menempuh lintasan 100 meter.", coop: "Dua pemain menjalankan relay; pergantian terjadi pada 50 meter." }
};

const params = new URLSearchParams(location.search);
const gameId = params.get("game") || "gobak-sodor";
const game = registry[gameId] || registry["gobak-sodor"];

function toggleMode() {
  const mode = document.querySelector('input[name="mode"]:checked')?.value || "solo";
  document.querySelector("[data-player-two]").hidden = mode !== "coop";
  document.querySelector("[data-mode-copy]").textContent = mode === "coop" ? game.coop : game.solo;
}

async function bridgeGobakQuestionSet() {
  if (gameId !== "gobak-sodor") return;
  const active = await getActiveQuestionSet(gameId);
  if (!active) {
    localStorage.setItem("gsnActiveQuestionSetV1", "default");
    return;
  }
  const compatible = [{ id: active.id, name: active.name, questions: active.questions }];
  localStorage.setItem("gsnQuestionSetsV1", JSON.stringify(compatible));
  localStorage.setItem("gsnActiveQuestionSetV1", active.id);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("[data-game-title]").textContent = game.title;
  document.querySelector("[data-game-icon]").textContent = game.icon;
  if (!game.modes.includes("coop")) document.querySelector('[value="coop"]').closest("label").hidden = true;
  const last = getLastPlayers();
  document.querySelector('[name="player1"]').value = last.players?.[0] || "";
  document.querySelector('[name="player2"]').value = last.players?.[1] || "";
  document.querySelector('[name="className"]').value = last.className || "";
  document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener("change", toggleMode));
  toggleMode();
  document.querySelector("[data-player-form]").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const feedback = document.querySelector("[data-play-feedback]");
    try {
      const mode = form.get("mode");
      await createPlayerSession({
        gameId,
        gameTitle: game.title,
        mode,
        player1: form.get("player1"),
        player2: form.get("player2"),
        className: form.get("className"),
        difficulty: form.get("difficulty"),
        remember: form.get("remember") === "on"
      });
      await bridgeGobakQuestionSet();
      feedback.textContent = "Sesi siap. Membuka permainan…";
      feedback.className = "form-feedback success";
      const query = new URLSearchParams({ mode, difficulty: String(form.get("difficulty") || "normal") });
      location.href = `${game.path}?${query}`;
    } catch (error) {
      feedback.textContent = error.message;
      feedback.className = "form-feedback error";
    }
  });
});
