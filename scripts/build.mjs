import { cp, readdir, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
const excluded = new Set(["dist", "node_modules", ".git", "tests", "scripts"]);
const rootFilesExcluded = new Set(["package.json", "vercel.json", ".gitignore"]);

if (existsSync(dist)) await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || rootFilesExcluded.has(entry.name)) continue;
  await cp(new URL(entry.name, root), new URL(entry.name, dist), { recursive: true });
}
console.log("[build] Portal Permainan Nusantara v2.2.0 dibuat di dist/");
