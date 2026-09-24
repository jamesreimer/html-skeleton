import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
  utimes,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const node = process.execPath;
function run(cwd, args, success = true, env = process.env) {
  const result = spawnSync(node, args, { cwd, env, encoding: 'utf8' });
  assert.equal(result.error, undefined);
  if (success) assert.equal(result.status, 0, result.stdout + result.stderr);
  else assert.notEqual(result.status, 0, 'Invalid fixture unexpectedly passed');
  return result;
}
async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'html-skeleton-test-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  // Exercise actual configuration and staged new files in an isolated repository.
  assert.equal(spawnSync('git', ['init', '-q', cwd]).status, 0);
  for (const file of [
    'package.json',
    '.prettierrc.json',
    '.htmlvalidate.json',
    '.stylelintrc.json',
    'eslint.config.mjs',
    'site',
    '.prettierignore',
    'scripts',
  ]) {
    await cp(join(root, file), join(cwd, file), { recursive: true });
  }
  await symlink(
    join(root, 'node_modules'),
    join(cwd, 'node_modules'),
    'junction',
  );
  return cwd;
}

test('native validators accept baseline and reject representative defects', async (t) => {
  const cwd = await fixture(t);
  await writeFile(
    join(cwd, 'site/browser.js'),
    'document.title = window.location.host;\n',
  );
  const cases = [
    [
      'check:html',
      'site/index.html',
      '<!doctype html><html lang="en"><head><title>Test</title></head><body><img src="favicon.svg"></body></html>',
    ],
    ['check:css', 'site/assets/css/base.css', 'body { colr: red; }\n'],
    ['check:js', 'site/assets/js/main.js', 'missingFunction();\n'],
    ['check:format', 'site/assets/js/main.js', 'const   value = 1\n'],
  ];
  for (const [script, file, invalid] of cases) {
    const original = await readFile(join(cwd, file));
    const check = (success) => {
      const result = spawnSync('npm', ['run', script], {
        cwd,
        encoding: 'utf8',
      });
      if (success)
        assert.equal(result.status, 0, result.stdout + result.stderr);
      else
        assert.notEqual(
          result.status,
          0,
          'Invalid fixture unexpectedly passed',
        );
    };
    check(true);
    await writeFile(join(cwd, file), invalid);
    assert.equal(spawnSync('git', ['add', file], { cwd }).status, 0);
    check(false);
    await writeFile(join(cwd, file), original);
  }
});

test('website checker rejects missing fragments, assets, and CSS URLs offline', async (t) => {
  const cwd = await fixture(t);
  const page = await readFile(join(cwd, 'site/index.html'), 'utf8');
  run(cwd, ['scripts/check-site-links.mjs']);
  await writeFile(
    join(cwd, 'site/unlinked.html'),
    '<a href="missing.html">Missing</a>',
  );
  run(cwd, ['scripts/check-site-links.mjs'], false);
  await rm(join(cwd, 'site/unlinked.html'));
  await writeFile(join(cwd, 'root-only.txt'), 'Repository-only data');
  for (const extra of [
    '<a href="/root-only.txt">Outside document root</a>',
    '<a href="#absent">Missing</a>',
    '<img src="missing.png" alt="Example">',
  ]) {
    await writeFile(
      join(cwd, 'site/index.html'),
      page.replace('</main>', `${extra}</main>`),
    );
    run(cwd, ['scripts/check-site-links.mjs'], false);
  }
  await writeFile(
    join(cwd, 'site/index.html'),
    page.replace(
      '</main>',
      '<a href="https://invalid.example.test/">External skipped</a></main>',
    ),
  );
  run(cwd, ['scripts/check-site-links.mjs']);
  await writeFile(
    join(cwd, 'site/assets/css/base.css'),
    'body { background: url("missing.png"); }',
  );
  run(cwd, ['scripts/check-site-links.mjs'], false);
});

test('distribution is exact, repeatable, versioned, source-preserving, and fails closed', async (t) => {
  const cwd = await fixture(t);
  const { version } = JSON.parse(await readFile(join(cwd, 'package.json')));
  const name = `html-skeleton-v${version}`;
  const payload = [
    '404.html',
    'index.html',
    'favicon.svg',
    'robots.txt',
    'site.webmanifest',
    'assets/css/reset.css',
    'assets/css/base.css',
    'assets/css/layout.css',
    'assets/css/components.css',
    'assets/css/utilities.css',
    'assets/js/main.js',
  ];
  const directories = ['assets/fonts/', 'assets/icons/', 'assets/images/'];
  const before = await Promise.all(
    payload.map((file) => readFile(join(cwd, 'site', file))),
  );
  await writeFile(join(cwd, 'site/assets/private.txt'), 'Must not ship');
  run(cwd, ['scripts/build-distribution.mjs']);
  const zipPath = join(cwd, 'dist', `${name}.zip`);
  const first = await readFile(zipPath);
  const unzipped = unzipSync(first);
  assert.deepEqual(
    Object.keys(unzipped).sort(),
    [...payload, ...directories].map((file) => `${name}/${file}`).sort(),
  );
  for (const [i, file] of payload.entries()) {
    assert.deepEqual(Buffer.from(unzipped[`${name}/${file}`]), before[i]);
    assert.deepEqual(await readFile(join(cwd, 'dist', name, file)), before[i]);
    assert.deepEqual(await readFile(join(cwd, 'site', file)), before[i]);
  }
  await writeFile(join(cwd, 'dist', name, 'stale.txt'), 'Must be removed');
  await utimes(join(cwd, 'site/index.html'), new Date(), new Date());
  run(cwd, ['scripts/build-distribution.mjs'], true, {
    ...process.env,
    TZ: 'Pacific/Honolulu',
  });
  assert.deepEqual(await readFile(zipPath), first);
  await assert.rejects(readFile(join(cwd, 'dist', name, 'stale.txt')), {
    code: 'ENOENT',
  });
  for (const file of payload) {
    const source = join(cwd, 'site', file);
    const bytes = await readFile(source);
    await rm(source);
    run(cwd, ['scripts/build-distribution.mjs'], false);
    assert.deepEqual(await readFile(zipPath), first);
    await writeFile(source, bytes);
  }
  await rm(join(cwd, 'site/index.html'));
  await mkdir(join(cwd, 'site/index.html'));
  run(cwd, ['scripts/build-distribution.mjs'], false);
  await rm(join(cwd, 'site/index.html'), { recursive: true });
  await writeFile(
    join(cwd, 'site/index.html'),
    before[payload.indexOf('index.html')],
  );
  const pkg = JSON.parse(await readFile(join(cwd, 'package.json')));
  pkg.version = '0.2.0';
  await writeFile(join(cwd, 'package.json'), JSON.stringify(pkg));
  run(cwd, ['scripts/build-distribution.mjs']);
  assert.ok(
    (await readFile(join(cwd, 'dist/html-skeleton-v0.2.0.zip'))).length,
  );
  pkg.version = '../escape';
  await writeFile(join(cwd, 'package.json'), JSON.stringify(pkg));
  run(cwd, ['scripts/build-distribution.mjs'], false);
});

test(
  'Python serves site directly without exposing repository files',
  { timeout: 15000 },
  async (t) => {
    const cwd = await fixture(t);
    const server = spawn(
      'python3',
      [
        '-u',
        '-m',
        'http.server',
        '0',
        '--bind',
        '127.0.0.1',
        '--directory',
        'site',
      ],
      { cwd },
    );
    t.after(() => server.kill());
    const port = await new Promise((resolve, reject) => {
      let output = '';
      server.on('error', reject);
      server.on('exit', (code) =>
        reject(new Error(`Static server exited: ${code}`)),
      );
      server.stdout.on('data', (data) => {
        output += data;
        const match = output.match(/port (\d+)/);
        if (match) resolve(match[1]);
      });
    });
    const origin = `http://127.0.0.1:${port}`;
    for (const file of [
      'index.html',
      '404.html',
      'favicon.svg',
      'site.webmanifest',
      'robots.txt',
      'assets/js/main.js',
      ...['reset', 'base', 'layout', 'components', 'utilities'].map(
        (name) => `assets/css/${name}.css`,
      ),
    ]) {
      const response = await fetch(`${origin}/${file}`);
      assert.equal(response.status, 200, file);
      assert.deepEqual(
        Buffer.from(await response.arrayBuffer()),
        await readFile(join(cwd, 'site', file)),
      );
    }
    assert.equal((await fetch(origin)).status, 200);
    for (const path of [
      '/package.json',
      '/scripts/build-distribution.mjs',
      '/site/index.html',
    ]) {
      assert.equal((await fetch(origin + path)).status, 404, path);
    }
  },
);

test('CSS references have equal coverage for every entry and crawl order', async (t) => {
  const cwd = await fixture(t);
  const site = join(cwd, 'site');
  await rm(site, { recursive: true });
  await mkdir(join(site, 'pages'), { recursive: true });
  await mkdir(join(site, 'assets'), { recursive: true });
  await writeFile(
    join(site, 'asset.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
  );
  const pages = ['404.html', 'index.html', 'pages/unlinked.html'];
  const html = (stylesheet) =>
    `<!doctype html><html lang="en"><head><title>Test</title>${stylesheet ? '<link rel="stylesheet" href="/assets/shared.css">' : ''}</head><body><p id="target">Test</p><a href="#target">Fragment</a></body></html>`;
  // Perturb the public check options, not Linkinator internals or the validator.
  // Run the actual entry point with both orders and serial/concurrent crawling.
  await writeFile(
    join(cwd, 'crawl-order.mjs'),
    `import { LinkChecker } from 'linkinator';
const check = LinkChecker.prototype.check;
LinkChecker.prototype.check = function (options) {
  if (process.env.REVERSE_ENTRIES === '1') options.path.reverse();
  options.concurrency = Number(process.env.CRAWL_CONCURRENCY);
  return check.call(this, options);
};\n`,
  );
  const css = join(site, 'assets/shared.css');
  const valid =
    'body { background: url("/asset.svg"); mask-image: url("../asset.svg"); cursor: url("https://invalid.example.test/external.cur"), auto; }';
  const invalid = 'body { background: url("/missing.svg"); }';
  const check = async (success, reverse, concurrency) => {
    const child = spawn(
      node,
      ['--import', './crawl-order.mjs', 'scripts/check-site-links.mjs'],
      {
        cwd,
        timeout: 30000,
        env: {
          ...process.env,
          REVERSE_ENTRIES: String(reverse),
          CRAWL_CONCURRENCY: String(concurrency),
        },
      },
    );
    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
    });
    child.stderr.on('data', (data) => {
      output += data;
    });
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });
    assert.equal(
      code,
      success ? 0 : 1,
      `reverse=${reverse}, concurrency=${concurrency}: ${output}`,
    );
    if (!success) assert.match(output, /missing\.svg: 404/);
  };
  // Each isolated entry must detect the same reference, including unlinked pages.
  for (const owner of pages) {
    t.diagnostic(`CSS linked only from ${owner}`);
    for (const page of pages)
      await writeFile(join(site, page), html(page === owner));
    await writeFile(css, valid);
    await check(true, 0, 100);
    await writeFile(css, invalid);
    await check(false, 0, 100);
  }
  // Imported and unlinked CSS are explicit entries too, including their URLs.
  const imported = join(site, 'assets/imported.css');
  for (const linked of [true, false]) {
    await writeFile(css, linked ? '@import url("./imported.css");' : valid);
    await writeFile(imported, valid);
    await check(true, 1, 100);
    await writeFile(imported, invalid);
    await check(false, 1, 100);
  }
  await rm(imported);
  for (const page of pages) await writeFile(join(site, page), html(true));
  // Shared CSS: repeat with both entry orders, both crawl concurrency settings,
  // and concurrent checker processes. Root-relative assets exist only at site/.
  for (const [contents, success] of [
    [valid, true],
    [invalid, false],
  ]) {
    await writeFile(css, contents);
    for (let repeat = 0; repeat < 3; repeat++) {
      await Promise.all([
        check(success, 0, 1),
        check(success, 1, 1),
        check(success, 0, 100),
        check(success, 1, 100),
      ]);
    }
  }
});
