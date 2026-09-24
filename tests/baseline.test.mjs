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
import { spawnSync } from 'node:child_process';
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
    'index.html',
    '404.html',
    'favicon.svg',
    'robots.txt',
    'site.webmanifest',
    'assets',
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
  const cases = [
    [
      'node_modules/html-validate/bin/html-validate.mjs',
      'index.html',
      '<!doctype html><html lang="en"><head><title>Test</title></head><body><img src="favicon.svg"></body></html>',
    ],
    [
      'node_modules/stylelint/bin/stylelint.mjs',
      'assets/css/base.css',
      'body { colr: red; }\n',
    ],
    [
      'node_modules/eslint/bin/eslint.js',
      'assets/js/main.js',
      'missingFunction();\n',
    ],
    [
      'node_modules/prettier/bin/prettier.cjs',
      'assets/js/main.js',
      'const   value = 1\n',
    ],
  ];
  for (const [cli, file, invalid] of cases) {
    const original = await readFile(join(cwd, file));
    const args = [cli, ...(cli.includes('prettier') ? ['--check'] : []), file];
    run(cwd, args);
    await writeFile(join(cwd, file), invalid);
    assert.equal(spawnSync('git', ['add', file], { cwd }).status, 0);
    run(cwd, args, false);
    await writeFile(join(cwd, file), original);
  }
});

test('website checker rejects missing fragments, assets, and CSS URLs offline', async (t) => {
  const cwd = await fixture(t);
  const page = await readFile(join(cwd, 'index.html'), 'utf8');
  run(cwd, ['scripts/check-site-links.mjs']);
  for (const extra of [
    '<a href="#absent">Missing</a>',
    '<img src="missing.png" alt="Example">',
  ]) {
    await writeFile(
      join(cwd, 'index.html'),
      page.replace('</main>', `${extra}</main>`),
    );
    run(cwd, ['scripts/check-site-links.mjs'], false);
  }
  await writeFile(
    join(cwd, 'index.html'),
    page.replace(
      '</main>',
      '<a href="https://invalid.example.test/">External skipped</a></main>',
    ),
  );
  run(cwd, ['scripts/check-site-links.mjs']);
  await writeFile(
    join(cwd, 'assets/css/base.css'),
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
    payload.map((file) => readFile(join(cwd, file))),
  );
  await writeFile(join(cwd, 'assets/private.txt'), 'Must not ship');
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
    assert.deepEqual(await readFile(join(cwd, file)), before[i]);
  }
  await writeFile(join(cwd, 'dist', name, 'stale.txt'), 'Must be removed');
  await utimes(join(cwd, 'index.html'), new Date(), new Date());
  run(cwd, ['scripts/build-distribution.mjs'], true, {
    ...process.env,
    TZ: 'Pacific/Honolulu',
  });
  assert.deepEqual(await readFile(zipPath), first);
  await assert.rejects(readFile(join(cwd, 'dist', name, 'stale.txt')), {
    code: 'ENOENT',
  });
  for (const file of payload) {
    const source = join(cwd, file);
    const bytes = await readFile(source);
    await rm(source);
    run(cwd, ['scripts/build-distribution.mjs'], false);
    assert.deepEqual(await readFile(zipPath), first);
    await writeFile(source, bytes);
  }
  await rm(join(cwd, 'index.html'));
  await mkdir(join(cwd, 'index.html'));
  run(cwd, ['scripts/build-distribution.mjs'], false);
  await rm(join(cwd, 'index.html'), { recursive: true });
  await writeFile(
    join(cwd, 'index.html'),
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
