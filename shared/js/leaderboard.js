import { getSessions } from "./db.js";

let filter = "all";
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
async function render() {
  const all = await getSessions();
  const rows = all.filter(row => filter === "all" || row.gameId === filter).sort((a, b) => {
    const scoreA = filter === "all" ? (a.rankingPoints || a.score) : a.score;
    const scoreB = filter === "all" ? (b.rankingPoints || b.score) : b.score;
    return scoreB - scoreA || b.accuracy - a.accuracy || new Date(b.playedAt) - new Date(a.playedAt);
  });
  document.querySelector("[data-lb-rounds]").textContent = rows.length;
  document.querySelector("[data-lb-best]").textContent = (rows[0] ? (filter === "all" ? rows[0].rankingPoints || rows[0].score : rows[0].score) : 0).toLocaleString("id-ID");
  document.querySelector("[data-lb-best-label]").textContent = filter === "all" ? "Indeks tertinggi" : "Skor tertinggi";
  document.querySelector("[data-lb-accuracy]").textContent = rows.length ? `${Math.round(rows.reduce((sum, row) => sum + row.accuracy, 0) / rows.length)}%` : "0%";
  const body = document.querySelector("[data-portal-leaderboard]");
  body.innerHTML = rows.slice(0, 100).map((row, index) => `<tr><td><strong>${index + 1}</strong></td><td><div class="result-name-list">${row.players.map(name => `<span>${escapeHtml(name)}</span>`).join("")}</div><small>${escapeHtml(row.className || "Tanpa kelas")}</small></td><td>${escapeHtml(row.gameTitle)}</td><td><strong>${row.score.toLocaleString("id-ID")}</strong>${filter === "all" ? `<br><small>Indeks ${(row.rankingPoints || row.score).toLocaleString("id-ID")}</small>` : ""}<br><small>${row.accuracy}% akurasi</small></td><td>${row.mode === "coop" ? "Berdua" : "Solo"} · ${escapeHtml(row.difficulty)}<br><small>${new Date(row.playedAt).toLocaleString("id-ID")}</small></td></tr>`).join("");
  document.querySelector("[data-lb-empty]").hidden = rows.length > 0;
  document.querySelector(".table-shell").hidden = rows.length === 0;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-lb-filter]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-lb-filter]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    filter = button.dataset.lbFilter;
    render();
  }));
  render().catch(console.error);
});
