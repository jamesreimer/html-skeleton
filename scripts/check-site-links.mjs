import { LinkChecker } from 'linkinator';

let origin;
const result = await new LinkChecker().check({
  // Start at the directory root so recursive crawling includes sibling assets.
  path: ['.', '404.html'],
  serverRoot: process.cwd(),
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
