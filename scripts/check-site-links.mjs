import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LinkChecker } from 'linkinator';

const site = fileURLToPath(new URL('../site/', import.meta.url));
const pages = [];
for await (const page of glob('**/*.html', { cwd: site })) pages.push(page);

let origin;
const result = await new LinkChecker().check({
  // Check every HTML entry, including pages not linked from the home page.
  path: ['.', ...pages],
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
