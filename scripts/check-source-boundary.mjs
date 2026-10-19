import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// These formats identify browser source in this repository. JS and shared
// assets (SVG, images, JSON, etc.) also serve tooling/docs and are not classified
// by extension. Keep non-site exceptions exact and justified by a test consumer.
const fixtures = new Set(['tests/fixtures/source-boundary.html']);
const paths = execFileSync('git', ['ls-files', '--cached', '-z'], {
  cwd: root,
  encoding: 'utf8',
}).split('\0');
for (const path of paths) {
  const extension = path.match(/\.(?:html?|css|webmanifest)$/i)?.[0];
  if (!extension) continue;
  const canonical = extension.toLowerCase().replace(/^\.htm$/, '.html');
  if (extension !== canonical) {
    console.error(
      `${JSON.stringify(path)}: HTML Skeleton requires lowercase ${canonical} ` +
        'by default; consumers may deliberately adapt their copy for another extension policy.',
    );
    process.exitCode = 1;
  }
  if (!path.startsWith('site/') && !fixtures.has(path)) {
    console.error(
      `${JSON.stringify(path)}: browser-facing source belongs under site/. ` +
        'Stage moves and deletions before validation. ' +
        'Non-site test fixtures require an exact, reviewed exception in scripts/check-source-boundary.mjs.',
    );
    process.exitCode = 1;
  }
}
