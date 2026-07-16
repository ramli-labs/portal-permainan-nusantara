import { getSessions } from "./db.js";
import { requireTeacherSession } from "./teacher-auth.js";

let rows = [], filteredRows = [];
const $ = selector => document.querySelector(selector);
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function safeCsvValue(value) { let text = String(value ?? ""); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; }
function download(content, name, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function csv() {
  const header = ["Tanggal", "Game", "Mode", "Pemain", "Kelas", "Skor", "Indeks Peringkat", "Akurasi", "Kesulitan", "Hasil", "Durasi Detik", "Soal Benar", "Jumlah Soal"];
  const data = filteredRows.map(row => [row.playedAt, row.gameTitle, row.mode, row.players.join(" & "), row.className, row.score, row.rankingPoints || row.score, row.accuracy, row.difficulty, row.result, row.durationSeconds, row.correctCount, row.questionCount]);
  const lines = [header, ...data].map(columns => columns.map(safeCsvValue).join(","));
  download(`\uFEFF${lines.join("\r\n")}`, `hasil-permainan-terfilter-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
}
function inDateRange(row, from, to) {
  const value = new Date(row.playedAt); if (Number.isNaN(value.getTime())) return false;
  if (from && value < new Date(`${from}T00:00:00`)) return false;
  if (to && value > new Date(`${to}T23:59:59.999`)) return false;
  return true;
}
function render() {
  const game = $('[name="gameFilter"]').value;
  const mode = $('[name="modeFilter"]').value;
  const result = $('[name="resultFilter"]').value;
  const difficulty = $('[name="difficultyFilter"]').value;
  const name = $('[name="nameFilter"]').value.toLowerCase();
  const className = $('[name="classFilter"]').value.toLowerCase();
  const from = $('[name="dateFrom"]').value;
  const to = $('[name="dateTo"]').value;
  filteredRows = rows.filter(row => (game === "all" || row.gameId === game)
    && (mode === "all" || row.mode === mode)
    && (result === "all" || row.result === result)
    && (difficulty === "all" || String(row.difficulty).toLowerCase() === difficulty)
    && (!name || row.players.some(player => player.toLowerCase().includes(name)))
    && (!className || String(row.className || "").toLowerCase().includes(className))
    && inDateRange(row, from, to));
  $("[data-results-count]").textContent = `${filteredRows.length} sesi`;
  $("[data-results-summary]").textContent = filteredRows.length
    ? `Rata-rata ${Math.round(filteredRows.reduce((sum, row) => sum + row.accuracy, 0) / filteredRows.length)}% akurasi · ${filteredRows.filter(row => row.result === "won").length} menang`
    : "Tidak ada hasil yang sesuai filter.";
  $("[data-results-body]").innerHTML = filteredRows.map(row => `<tr><td>${new Date(row.playedAt).toLocaleString("id-ID")}</td><td>${escapeHtml(row.gameTitle)}</td><td>${row.mode === "coop" ? "Berdua" : "Solo"}</td><td>${escapeHtml(row.players.join(" & "))}<br><small>${escapeHtml(row.className || "Tanpa kelas")}</small></td><td><strong>${row.score.toLocaleString("id-ID")}</strong><br><small>Indeks ${(row.rankingPoints || row.score).toLocaleString("id-ID")}</small></td><td>${row.accuracy}%<br><small>${row.correctCount || 0}/${row.questionCount || 0} soal</small></td><td>${escapeHtml(row.difficulty)}</td><td>${row.result === "won" ? "Menang" : "Belum menang"}</td></tr>`).join("") || `<tr><td colspan="8" class="empty-copy">Belum ada hasil yang sesuai filter.</td></tr>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!await requireTeacherSession()) return;
  rows = await getSessions();
  document.querySelectorAll("[data-result-filter]").forEach(element => element.addEventListener("input", render));
  $("[data-export-csv]").addEventListener("click", csv);
  $("[data-reset-filters]").addEventListener("click", () => { document.querySelectorAll("[data-result-filter]").forEach(element => { element.value = element.tagName === "SELECT" ? "all" : ""; }); render(); });
  render();
});
