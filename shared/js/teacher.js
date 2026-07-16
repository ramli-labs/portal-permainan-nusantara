import {
  clearLearningData,
  exportAllData,
  getAnalytics,
  getPlayers,
  getQuestionSets,
  getSessions,
  getSetting,
  importAllData,
  setSetting
} from "./db.js";
import { validateBackupData } from "./data-utils.js";
import { clearTeacherSession, createTeacherSession, hasTeacherSession } from "./teacher-auth.js";

const PIN_KEY = "teacherPinHash";
const encoder = new TextEncoder();

async function hash(value) {
  const data = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(data)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
function download(content, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function gateState() {
  const has = Boolean(await getSetting(PIN_KEY, ""));
  document.querySelector("[data-pin-title]").textContent = has ? "Masukkan PIN guru" : "Buat PIN guru perangkat";
  document.querySelector("[data-pin-copy]").textContent = has ? "PIN membuka soal, statistik, backup, dan pengaturan perangkat selama 45 menit." : "Buat 4–8 digit PIN. Simpan PIN di tempat aman.";
  document.querySelector("[data-pin-confirm-wrap]").hidden = has;
  return has;
}
async function unlock(pin, confirmPin) {
  const stored = await getSetting(PIN_KEY, "");
  if (!stored) {
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN harus terdiri dari 4–8 angka");
    if (pin !== confirmPin) throw new Error("Konfirmasi PIN tidak sama");
    await setSetting(PIN_KEY, await hash(pin));
  } else if (await hash(pin) !== stored) throw new Error("PIN salah");
  createTeacherSession();
  return true;
}
async function renderPanel() {
  const [sessions, players, sets, analytics] = await Promise.all([getSessions(), getPlayers(), getQuestionSets(), getAnalytics()]);
  document.querySelector("[data-teacher-sessions]").textContent = sessions.length;
  document.querySelector("[data-teacher-players]").textContent = players.length;
  document.querySelector("[data-teacher-best]").textContent = (sessions.reduce((max, row) => Math.max(max, row.score), 0)).toLocaleString("id-ID");
  document.querySelector("[data-teacher-accuracy]").textContent = `${analytics.totals.averageAccuracy}%`;
  document.querySelector("[data-teacher-sets]").textContent = sets.length;
  document.querySelector("[data-pin-gate]").hidden = true;
  document.querySelector("[data-teacher-panel]").hidden = false;
}

async function previewAndImport(file) {
  const data = JSON.parse(await file.text());
  const preview = validateBackupData(data);
  const summary = `Backup ${preview.appVersion}\n${preview.players} pemain\n${preview.sessions} sesi\n${preview.questionSets} set soal\nDiekspor: ${preview.exportedAt ? new Date(preview.exportedAt).toLocaleString("id-ID") : "tidak diketahui"}`;
  const replace = confirm(`${summary}\n\nKlik OK untuk MENGGANTI data perangkat. Klik Batal untuk membatalkan impor.`);
  if (!replace) {
    const merge = confirm(`${summary}\n\nGabungkan backup dengan data yang ada?`);
    if (!merge) return null;
  }
  return importAllData(data, { replace });
}

document.addEventListener("DOMContentLoaded", async () => {
  await gateState();
  if (hasTeacherSession()) await renderPanel();
  const reason = new URLSearchParams(location.search).get("reason");
  if (reason === "pin") document.querySelector("[data-pin-feedback]").textContent = "Masukkan PIN sebelum membuka fitur guru.";

  document.querySelector("[data-pin-form]").addEventListener("submit", async event => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget), feedback = document.querySelector("[data-pin-feedback]");
    try {
      await unlock(String(fd.get("pin") || ""), String(fd.get("confirmPin") || ""));
      feedback.textContent = "Mode Guru terbuka."; feedback.className = "form-feedback success"; await renderPanel();
    } catch (error) { feedback.textContent = error.message; feedback.className = "form-feedback error"; }
  });
  document.querySelector("[data-lock-teacher]").addEventListener("click", () => { clearTeacherSession(); location.reload(); });
  document.querySelector("[data-export-backup]").addEventListener("click", async () => download(JSON.stringify(await exportAllData(), null, 2), `portal-nusantara-backup-${new Date().toISOString().slice(0, 10)}.json`));
  document.querySelector("[data-import-backup]").addEventListener("change", async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const result = await previewAndImport(file); if (result) { alert(`Backup dipulihkan: ${result.players} pemain, ${result.sessions} sesi, dan ${result.questionSets} set soal.`); await renderPanel(); } }
    catch (error) { alert(`Impor gagal: ${error.message}`); }
    finally { event.target.value = ""; }
  });
  document.querySelector("[data-change-pin]").addEventListener("click", async () => {
    const pin = prompt("Masukkan PIN baru (4–8 angka)");
    if (!pin) return;
    if (!/^\d{4,8}$/.test(pin)) return alert("PIN harus 4–8 angka.");
    await setSetting(PIN_KEY, await hash(pin)); createTeacherSession(); alert("PIN guru diperbarui.");
  });
  document.querySelector("[data-clear-data]").addEventListener("click", async () => {
    if (!confirm("Hapus semua profil pemain dan hasil permainan? Set soal dan PIN tidak ikut dihapus.")) return;
    if (!confirm("Konfirmasi terakhir: data hasil tidak dapat dipulihkan tanpa backup.")) return;
    await clearLearningData(); await renderPanel(); alert("Data pemain dan hasil sudah dihapus.");
  });
});
