// Shrinks public/models/characters/*.glb (800k / 570k triangles, ~48 MB total) into game-ready files.
//
//   npm run optimize:models
//
// Needs internet access once (npx downloads @gltf-transform/cli). Originals are kept as *.original.glb
// next to the optimized files; add them to .gitignore or delete them once you are happy.
// The loader in src/game/glbCharacter.ts already supports the meshopt compression used here.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'public', 'models', 'characters');
const models = ['leo', 'maya'];
const mb = (f) => (statSync(f).size / 1024 / 1024).toFixed(1) + ' MB';

for (const name of models) {
  const file = join(dir, `${name}.glb`);
  const backup = join(dir, `${name}.original.glb`);
  const out = join(dir, `${name}.optimized.glb`);

  if (!existsSync(backup)) copyFileSync(file, backup);
  const input = backup; // always optimize from the untouched original

  console.log(`\n${name}: ${mb(input)} -> optimizing...`);
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      '--yes', '@gltf-transform/cli', 'optimize', input, out,
      '--simplify', 'true',
      '--simplify-ratio', '0.04',     // keep ~4% of triangles (~30k / ~23k)
      '--simplify-error', '0.01',
      '--compress', 'meshopt',
      '--texture-compress', 'webp',
      '--texture-size', '1024'
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  );

  renameSync(out, file);
  console.log(`${name}: done -> ${mb(file)}`);
}
