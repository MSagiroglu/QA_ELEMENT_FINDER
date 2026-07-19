import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_MANIFEST = resolve(ROOT, 'src/manifest.v3.json');
const DIST_DIR = resolve(ROOT, 'dist');
const ICONS_SRC = resolve(ROOT, 'src/icons');
const ICONS_DST = resolve(DIST_DIR, 'icons');

const browsers = ['chrome', 'firefox', 'edge'];
for (const browser of browsers) {
  console.log(`Building for ${browser}...`);
  execSync(`cross-env BROWSER=${browser} vite build`, { stdio: 'inherit' });
}

// Build standalone content script (self-contained, no dynamic imports)
console.log('\nBuilding standalone content script...');
execSync(`cross-env BROWSER=chrome vite build --config vite.standalone.config.ts`, { stdio: 'inherit' });
const standaloneSrc = resolve(ROOT, 'dist-standalone/content-script-standalone.js');
if (existsSync(standaloneSrc)) {
  const standaloneContent = readFileSync(standaloneSrc, 'utf-8');
  writeFileSync(resolve(DIST_DIR, 'content-script-standalone.js'), standaloneContent);
  console.log('  ✓ content-script-standalone.js built and copied to dist/');
}
// Clean up standalone build output
const standaloneDir = resolve(ROOT, 'dist-standalone');
if (existsSync(standaloneDir)) {
  const rmDir = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const fp = resolve(dir, f.name);
      if (f.isDirectory()) rmDir(fp);
      else unlinkSync(fp);
    }
    rmdirSync(dir);
  };
  rmDir(standaloneDir);
}

// Copy manifest.json to dist/
if (existsSync(SRC_MANIFEST)) {
  copyFileSync(SRC_MANIFEST, resolve(DIST_DIR, 'manifest.json'));
  console.log('  ✓ manifest.json copied to dist/');
} else {
  console.error('  ✗ manifest.v3.json not found at', SRC_MANIFEST);
  process.exit(1);
}

// Copy icon SVGs
if (existsSync(ICONS_SRC)) {
  if (!existsSync(ICONS_DST)) mkdirSync(ICONS_DST, { recursive: true });
  for (const file of readdirSync(ICONS_SRC)) {
    copyFileSync(resolve(ICONS_SRC, file), resolve(ICONS_DST, file));
  }
  console.log('  ✓ icons copied to dist/icons/');
}

console.log('\nBuild complete. Files in dist/:');
for (const entry of readdirSync(DIST_DIR, { withFileTypes: true })) {
  console.log(`  ${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`);
}
