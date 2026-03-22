/**
 * Après `ELECTRON_STANDALONE=1 next build`, copie les assets requis
 * dans `.next/standalone` (voir doc Next.js standalone).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const nextDir = path.join(root, ".next");
const serverJs = path.join(standalone, "server.js");

if (!fs.existsSync(serverJs)) {
  console.error(
    "Erreur: .next/standalone/server.js introuvable.\n" +
      "Lance : cross-env ELECTRON_STANDALONE=1 npm run build",
  );
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("Ignoré (absent):", src);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const staticSrc = path.join(nextDir, "static");
const staticDest = path.join(standalone, ".next", "static");
copyDir(staticSrc, staticDest);

const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");
copyDir(publicSrc, publicDest);

console.log("Standalone prêt :", standalone);
