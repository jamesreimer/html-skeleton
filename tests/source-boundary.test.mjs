import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}
function check(cwd, script, success = true, env = process.env) {
  const result = spawnSync('npm', ['run', script], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  const output = result.stdout + result.stderr;
  if (success) assert.equal(result.status, 0, output);
  else assert.notEqual(result.status, 0, output);
  return output;
}
async function put(cwd, path, content) {
  await mkdir(dirname(join(cwd, path)), { recursive: true });
  await writeFile(join(cwd, path), content);
  git(cwd, 'add', '--', path);
}
async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'html-skeleton-boundary-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  git(cwd, 'init', '-q');
  // Copy the actual index-selected repository, including newly staged changes.
  for (const path of git(root, 'ls-files', '-z').split('\0').filter(Boolean)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await cp(join(root, path), join(cwd, path));
  }
  await symlink(
    join(root, 'node_modules'),
    join(cwd, 'node_modules'),
    'junction',
  );
  // Local installs use a venv; hosted validation supplies pre-commit on PATH.
  if (existsSync(join(root, '.venv'))) {
    await symlink(join(root, '.venv'), join(cwd, '.venv'), 'junction');
  }
  git(cwd, 'add', '.');
  return cwd;
}

test('index boundary rejects staged and committed source without filename guesses', async (t) => {
  const cwd = await fixture(t);
  check(cwd, 'check:source-boundary');
  for (const path of [
    'about.html',
    'nested/about.html',
    'nested/page.HTM',
    'tests/not-a-fixture.html',
    'tests/fixtures/unreviewed.html',
    'docs/example.html',
    'theme.css',
    'nested/theme.css',
    'tests/fixtures/unreviewed.css',
    'app.webmanifest',
    'nested/app.webmanifest',
    'tests/fixtures/unreviewed.webmanifest',
    'nested/with space.html',
    'nested/with\nnewline.html',
  ]) {
    await put(cwd, path, '\n');
    const output = check(cwd, 'check:source-boundary', false);
    assert.ok(output.includes(JSON.stringify(path)), output);
    assert.match(output, /browser-facing source belongs under site\//);
    git(cwd, 'rm', '-f', '--', path);
  }
  await put(cwd, 'about.html', '\n');
  git(
    cwd,
    '-c',
    'user.name=Boundary Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-qm',
    'Committed misplaced HTML',
  );
  assert.equal(git(cwd, 'status', '--porcelain'), '');
  assert.match(check(cwd, 'check:source-boundary', false), /about\.html/);
  git(cwd, 'rm', 'about.html');
  check(cwd, 'check:source-boundary');
});

test('site pages receive native validation while explicit fixtures and tooling remain allowed', async (t) => {
  const cwd = await fixture(t);
  const html = await readFile(
    join(root, 'tests/fixtures/source-boundary.html'),
    'utf8',
  );
  for (const path of ['site/about.html', 'site/pages/about.html']) {
    await put(cwd, path, html);
    check(cwd, 'check:source-boundary');
    check(cwd, 'check:html');
    await put(cwd, path, html.replace('<p>', '<img src="missing.png"><p>'));
    check(cwd, 'check:source-boundary');
    const output = check(cwd, 'check:html', false);
    assert.ok(output.includes(path), output);
    assert.match(output, /wcag\/h37/);
    await put(cwd, path, html);
  }
  for (const [path, contents] of [
    ['site/pages/theme.css', 'body { color: red; }\n'],
    ['site/pages/app.webmanifest', '{}\n'],
    ['scripts/tool.js', 'export {};\n'],
    ['scripts/tool.mjs', 'export {};\n'],
    ['tests/tool.cjs', 'module.exports = {};\n'],
    ['docs/diagram.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n'],
  ])
    await put(cwd, path, contents);
  check(cwd, 'check:source-boundary');
  check(cwd, 'check:js');
  // Ignored generated output is not selected; force-tracking it is no exception.
  await mkdir(join(cwd, 'dist'), { recursive: true });
  await writeFile(join(cwd, 'dist/about.html'), html);
  check(cwd, 'check:source-boundary');
  git(cwd, 'add', '-f', 'dist/about.html');
  assert.match(check(cwd, 'check:source-boundary', false), /dist\/about\.html/);
});

test('canonical validation catches staged and committed HTML outside site/', async (t) => {
  const cwd = await fixture(t);
  // Skip only this enclosing hook to avoid recursive test execution. All other
  // hooks, their real configuration, and the canonical launcher remain active.
  const env = { ...process.env, SKIP: 'test-baseline' };
  // Let the other Node test suites run as independent runners.
  delete env.NODE_TEST_CONTEXT;
  const html = await readFile(
    join(root, 'tests/fixtures/source-boundary.html'),
    'utf8',
  );
  await put(cwd, 'site/pages/about.html', html);
  check(cwd, 'validate', true, env);
  await put(cwd, 'about.html', html);
  assert.match(
    git(cwd, 'diff', '--cached', '--name-status'),
    /A\s+about\.html/,
  );
  const staged = check(cwd, 'validate', false, env);
  assert.match(staged, /Check browser source boundary[^\n]*Failed/);
  assert.match(
    staged,
    /"about.html": browser-facing source belongs under site\//,
  );
  git(
    cwd,
    '-c',
    'user.name=Boundary Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-qm',
    'Committed misplaced HTML',
  );
  assert.equal(git(cwd, 'status', '--porcelain'), '');
  const committed = check(cwd, 'validate', false, env);
  assert.match(
    committed,
    /"about.html": browser-facing source belongs under site\//,
  );
});
