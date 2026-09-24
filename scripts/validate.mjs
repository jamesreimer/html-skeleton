import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Prefer the documented local venv; CI may install the pinned runner on PATH.
const local =
  process.platform === 'win32'
    ? '.venv/Scripts/pre-commit.exe'
    : '.venv/bin/pre-commit';
const result = spawnSync(
  existsSync(local) ? local : 'pre-commit',
  ['run', '--all-files', '--show-diff-on-failure'],
  { stdio: 'inherit' },
);
if (result.error)
  console.error(
    'Install the pinned pre-commit runner; see README.md.',
    result.error.message,
  );
process.exitCode = result.status ?? 1;
