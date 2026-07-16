import { getAnalytics } from "./db.js";
import { requireTeacherSession } from "./teacher-auth.js";

const $ = selector => document.querySelector(selector);
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function renderMetricRows(target, rows, { label, value, percent }) {
  target.innerHTML = rows.map(row => `<div class="metric-row"><strong>${escapeHtml(label(row))}</strong><div class="metric-bar"><span style="width:${Math.max(0, Math.min(100, percent(row)))}%"></span></div><span>${escapeHtml(value(row))}</span></div>`).join("") || `<p class="empty-copy">Belum ada data yang dapat dianalisis.</p>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!await requireTeacherSession()) return;
  const analytics = await getAnalytics();
  $("[data-stat-sessions]").textContent = analytics.totals.sessions;
  $("[data-stat-players]").textContent = analytics.totals.players;
  $("[data-stat-winrate]").textContent = analytics.totals.sessions ? `${Math.round(analytics.totals.wins / analytics.totals.sessions * 100)}%` : "0%";
  $("[data-stat-accuracy]").textContent = `${analytics.totals.averageAccuracy}%`;
  $("[data-stat-score]").textContent = analytics.totals.averageScore.toLocaleString("id-ID");

  $("[data-game-analytics]").innerHTML = analytics.byGame.map(row => `<tr><td><strong>${escapeHtml(row.gameTitle)}</strong></td><td>${row.sessions}</td><td>${row.averageScore.toLocaleString("id-ID")}</td><td>${row.averageAccuracy}%</td><td>${row.winRate}%</td></tr>`).join("") || `<tr><td colspan="5" class="empty-copy">Belum ada sesi permainan.</td></tr>`;

  renderMetricRows($("[data-category-analytics]"), analytics.byCategory.slice(0, 20), {
    label: row => row.category,
    value: row => `${row.accuracy}% · ${row.correct}/${row.total}`,
    percent: row => row.accuracy
  });

  $("[data-player-analytics]").innerHTML = analytics.byPlayer.slice(0, 50).map((row, index) => `<tr><td>${index + 1}</td><td><strong>${escapeHtml(row.name)}</strong><br><small>${escapeHtml(row.className || "Tanpa kelas")}</small></td><td>${row.sessions}</td><td>${row.averageScore.toLocaleString("id-ID")}</td><td>${row.averageAccuracy}%</td><td>${row.winRate}%</td></tr>`).join("") || `<tr><td colspan="6" class="empty-copy">Belum ada data pemain.</td></tr>`;
});
