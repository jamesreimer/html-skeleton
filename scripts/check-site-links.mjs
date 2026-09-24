import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LinkChecker } from 'linkinator';

const site = fileURLToPath(new URL('../site/', import.meta.url));
const entries = [];
for await (const entry of glob(['**/*.html', '**/*.css'], { cwd: site }))
  entries.push(entry);

let origin;
const result = await new LinkChecker().check({
  // Explicit seeds are always crawled. Discovered links share a URL cache but
  // inherit an entry-specific crawl prefix, so a page can otherwise cache a
  // stylesheet as existence-only and suppress CSS reference checks. Seed every
  // HTML/CSS file, including unlinked pages and imported/unlinked stylesheets.
  path: ['.', ...entries],
  serverRoot: site,
  recurse: true,
  checkFragments: true,
  checkCss: true,
  timeout: 10000,
  retry: false,
  retryErrors: false,
  linksToSkip(url) {
    origin ??= new URL(url).origin;
    return new URL(url).origin !== origin;
  },
});
for (const link of result.links.filter((link) => link.state === 'BROKEN')) {
  console.error(`${link.url}: ${link.status}`);
}
process.exitCode = result.passed ? 0 : 1;
