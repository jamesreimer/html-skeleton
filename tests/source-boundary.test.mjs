import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
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
// Keep unrelated caller-index files out of the controlled validation harness.
// Export these actual staged tools/configs and site inputs, not working-tree bytes.
const fixtureInputs = [
  'package.json',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  '.pre-commit-config.yaml',
  '.prettierrc.json',
  '.prettierignore',
  '.htmlvalidate.json',
  '.stylelintrc.json',
  'eslint.config.mjs',
  '.markdownlint-cli2.jsonc',
  'ruff.toml',
  'markdownlint-rules',
  'scripts/validate.mjs',
  'scripts/check-source-boundary.mjs',
  'scripts/check-site-links.mjs',
  'scripts/build-distribution.mjs',
  'scripts/distribution-payload.json',
  'site',
  'tests/baseline.test.mjs',
  'tests/fixtures/source-boundary.html',
  'tools/check-links.mjs',
  'tools/link-frontmatter.mjs',
];
async function exportIndex(t, source, paths = []) {
  const cwd = await mkdtemp(join(tmpdir(), 'html-skeleton-boundary-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const indexed = git(source, 'ls-files', '--cached', '-z', '--', ...paths);
  // The absolute prefix always names a fresh empty temporary directory. Git
  // supplies index bytes, preserving staged additions/deletions/renames and NUL
  // delimited filenames, even when working-tree files are missing or modified.
  execFileSync('git', ['checkout-index', '--stdin', '-z', `--prefix=${cwd}/`], {
    cwd: source,
    input: indexed,
  });
  return cwd;
}
async function fixture(t, source = root) {
  const cwd = await exportIndex(t, source, fixtureInputs);
  git(cwd, 'init', '-q');
  await mkdir(join(cwd, 'docs'), { recursive: true });
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
    'nested/page.HTML',
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
    join(cwd, 'tests/fixtures/source-boundary.html'),
    'utf8',
  );
  for (const path of ['site/about.html', 'site/pages/about.html']) {
    await put(cwd, path, html);
    check(cwd, 'check:source-boundary');
    check(cwd, 'check:html');
    check(cwd, 'check:site-links');
    await put(cwd, path, html.replace('<p>', '<img src="missing.png"><p>'));
    check(cwd, 'check:source-boundary');
    const output = check(cwd, 'check:html', false);
    assert.ok(output.includes(path), output);
    assert.match(output, /wcag\/h37/);
    assert.match(check(cwd, 'check:site-links', false), /missing\.png/);
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

test('exact Git-index extensions enforce lowercase independently of filesystem casing', async (t) => {
  for (const ignoreCase of ['true', 'false']) {
    const cwd = await fixture(t);
    git(cwd, 'config', 'core.ignorecase', ignoreCase);
    const blob = git(cwd, 'hash-object', '-w', '--stdin').trim();
    const indexPath = (path) => {
      // No working-tree file is created, even for case-colliding spellings.
      git(cwd, 'update-index', '--add', '--cacheinfo', '100644', blob, path);
      assert.ok(git(cwd, 'ls-files', '-z').split('\0').includes(path));
    };
    for (const path of [
      'site/page.html',
      'site/theme.css',
      'site/app.webmanifest',
      'site/nested/page.html',
      'scripts/tool.js',
      'docs/diagram.svg',
      'docs/image.png',
      'docs/data.json',
    ])
      indexPath(path);
    check(cwd, 'check:source-boundary');

    for (const [path, canonical] of [
      ['site/page.htm', '.html'],
      ['site/page.HTML', '.html'],
      ['site/page.Html', '.html'],
      ['site/page.HTM', '.html'],
      ['site/page.Htm', '.html'],
      ['site/theme.CSS', '.css'],
      ['site/theme.Css', '.css'],
      ['site/app.WebManifest', '.webmanifest'],
      ['site/app.WEBMANIFEST', '.webmanifest'],
      ['site/nested/page.HTML', '.html'],
      ['outside.htm', '.html'],
      ['tests/fixtures/source-boundary.HTML', '.html'],
      ['tests/fixtures/source-boundary.htm', '.html'],
    ]) {
      indexPath(path);
      // Exercise the real CLI from a nested cwd against exact index spelling.
      const result = spawnSync(
        process.execPath,
        [join(cwd, 'scripts/check-source-boundary.mjs')],
        { cwd: join(cwd, 'site/assets/css'), encoding: 'utf8' },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1, result.stderr);
      assert.ok(result.stderr.includes(JSON.stringify(path)), result.stderr);
      assert.ok(
        result.stderr.includes(`requires lowercase ${canonical}`),
        result.stderr,
      );
      assert.match(
        result.stderr,
        /consumers may deliberately adapt their copy/,
      );
      assert.equal(
        result.stderr.includes('browser-facing source belongs under site/'),
        !path.startsWith('site/'),
        result.stderr,
      );
      git(cwd, 'update-index', '--force-remove', '--', path);
      check(cwd, 'check:source-boundary');
    }
    // The canonical fixture still coexists with its rejected case variants.
    assert.ok(
      git(cwd, 'ls-files', '-z')
        .split('\0')
        .includes('tests/fixtures/source-boundary.html'),
    );
  }
});

test('.htm is rejected without expanding HTML validation or link discovery', async (t) => {
  const cwd = await fixture(t);
  await put(cwd, 'site/unlinked.htm', '<img src="missing.png">\n');
  assert.match(
    check(cwd, 'check:source-boundary', false),
    /requires lowercase \.html/,
  );
  check(cwd, 'check:html');
  check(cwd, 'check:site-links');
});

test('canonical validation reports staged location and naming violations', async (t) => {
  const cwd = await fixture(t);
  // Exercise the actual launcher/config and content checks once. Regression
  // suites run in the outer validation; rerunning them here adds no coverage
  // and test-baseline would recurse. No content-check hook is skipped.
  const env = {
    ...process.env,
    SKIP: 'test-baseline,test-link-validation,test-markdown-rules',
  };
  delete env.NODE_TEST_CONTEXT;
  const html = await readFile(
    join(cwd, 'tests/fixtures/source-boundary.html'),
    'utf8',
  );
  await put(cwd, 'site/pages/about.html', html);
  await put(cwd, 'about.html', html);
  await put(cwd, 'site/unlinked.htm', html);
  assert.match(
    git(cwd, 'diff', '--cached', '--name-status'),
    /A\s+about\.html/,
  );
  const output = check(cwd, 'validate', false, env);
  assert.match(output, /Check browser source boundary[^\n]*Failed/);
  assert.match(
    output,
    /"about.html": browser-facing source belongs under site\//,
  );
  assert.match(
    output,
    /"site\/unlinked.htm": HTML Skeleton requires lowercase \.html/,
  );
  // Ensure the expected guard failure is the only failing hook.
  assert.equal(output.match(/\.{3,}Failed/g)?.length, 1, output);
});

test('boundary CLI uses repository paths from every working directory and after staged moves', async (t) => {
  const cwd = await fixture(t);
  const directories = ['', 'site', 'docs', 'site/assets/css'];
  const checkEveryDirectory = (success) => {
    for (const directory of directories) {
      const result = spawnSync(
        process.execPath,
        [join(cwd, 'scripts/check-source-boundary.mjs')],
        {
          cwd: join(cwd, directory),
          encoding: 'utf8',
        },
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, success ? 0 : 1, result.stderr);
      if (!success) {
        assert.match(
          result.stderr,
          /"about.html": browser-facing source belongs under site\//,
        );
        assert.match(
          result.stderr,
          /Stage moves and deletions before validation/,
        );
      }
    }
  };
  checkEveryDirectory(true);
  await put(cwd, 'about.html', '<p>Move fixture</p>\n');
  checkEveryDirectory(false);
  await rename(join(cwd, 'about.html'), join(cwd, 'site/about.html'));
  checkEveryDirectory(false);
  git(cwd, 'add', '-A');
  checkEveryDirectory(true);
});

test('baseline retains exact root-name coverage beyond classified extensions', async (t) => {
  const cwd = await fixture(t);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  for (const path of ['robots.txt', 'favicon.svg', 'assets/.gitkeep']) {
    await put(cwd, path, '\n');
    const result = spawnSync(
      process.execPath,
      [
        '--test',
        '--test-name-pattern=canonical website source is confined',
        'tests/baseline.test.mjs',
      ],
      { cwd, encoding: 'utf8', env },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /Missing expected rejection/);
    git(cwd, 'rm', '-f', '--', path);
    if (path.startsWith('assets/'))
      await rm(join(cwd, 'assets'), { recursive: true, force: true });
  }
});

test('index export preserves staged state despite unrelated working-tree changes', async (t) => {
  const source = await mkdtemp(join(tmpdir(), 'html-skeleton-index-source-'));
  t.after(() => rm(source, { recursive: true, force: true }));
  git(source, 'init', '-q');
  for (const path of ['unrelated.txt', 'deleted.txt', 'old.txt'])
    await put(source, path, 'indexed\n');
  git(
    source,
    '-c',
    'user.name=Boundary Test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '-qm',
    'Index baseline',
  );
  await rm(join(source, 'unrelated.txt'));
  git(source, 'rm', 'deleted.txt');
  git(source, 'mv', 'old.txt', 'renamed.txt');
  const unusual = 'nested/space and\nnewline.txt';
  await put(source, unusual, 'staged addition\n');
  await writeFile(join(source, unusual), 'unstaged bytes\n');
  const before = git(source, 'status', '--porcelain', '-z');
  const exported = await exportIndex(t, source);
  assert.equal(
    await readFile(join(exported, 'unrelated.txt'), 'utf8'),
    'indexed\n',
  );
  assert.equal(
    await readFile(join(exported, 'renamed.txt'), 'utf8'),
    'indexed\n',
  );
  assert.equal(
    await readFile(join(exported, unusual), 'utf8'),
    'staged addition\n',
  );
  for (const path of ['old.txt', 'deleted.txt'])
    assert.equal(existsSync(join(exported, path)), false);
  assert.equal(git(source, 'status', '--porcelain', '-z'), before);
  assert.equal(existsSync(join(source, 'unrelated.txt')), false);
  assert.equal(
    await readFile(join(source, unusual), 'utf8'),
    'unstaged bytes\n',
  );
});

test('controlled fixtures ignore unrelated live-index violations and unstaged deletions', async (t) => {
  const source = await fixture(t);
  await put(source, 'unrelated.txt', 'indexed\n');
  await rm(join(source, 'unrelated.txt'));
  await put(source, 'about.html', '<p>Live violation</p>\n');
  assert.match(check(source, 'check:source-boundary', false), /about\.html/);
  const isolated = await fixture(t, source);
  check(isolated, 'check:source-boundary');
  assert.equal(existsSync(join(isolated, 'about.html')), false);
  assert.equal(existsSync(join(source, 'unrelated.txt')), false);
  assert.match(check(source, 'check:source-boundary', false), /about\.html/);
});
