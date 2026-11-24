// Surya Bay v11 — entry hand-in for make.fun gta6-01.
// Copies the finished game/ and screenshots/ beside this file into the
// output directory and writes the judge dossier from the OUTPUT tree.
// Pattern notes: never delete the output dir (the grader runs read-only
// as an unprivileged user), and skip dotfiles on both copies so stray
// editor state never leaks into the submission.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const destDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(destDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(destDir, 'game'), {
  recursive: true,
  filter: (src) => !src.split('/').pop()?.startsWith('.'),
});
mkdirSync(join(destDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(destDir, 'screenshots'), {
    recursive: true,
    filter: (src) => !src.split('/').pop()?.startsWith('.'),
  });
}

// Dossier is built from the output directory itself, so what the judge
// reads is exactly what was handed in. Caps mirror the scorer's gates.
writeFileSync(
  join(destDir, 'dossier.json'),
  buildDossier(destDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('Surya Bay v11 handed in to ' + destDir);
