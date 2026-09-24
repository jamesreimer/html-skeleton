import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import payload from './distribution-payload.json' with { type: 'json' };

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'site');
const { version } = JSON.parse(
  await readFile(join(root, 'package.json'), 'utf8'),
);
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error('Expected a MAJOR.MINOR.PATCH project version');
}
if (!/^[a-z0-9][a-z0-9._-]*$/.test(payload.prefix))
  throw new Error(
    'Expected a lowercase archive prefix without path separators',
  );
const name = `${payload.prefix}-v${version}`;
// Explicit payload: never copy the repository tree or arbitrary asset contents.
const directories = [];
const entries = {};
// DOS timestamps encode local calendar fields. This produces the same bytes in
// every timezone, regardless of source mtimes, permissions, or build time.
const options = { level: 0, mtime: new Date(2000, 0, 1), os: 0, attrs: 0 };
for (const [file, role] of Object.entries(payload.files)) {
  if (!['required', 'optional'].includes(role))
    throw new Error(`Unknown payload role for ${file}: ${role}`);
  const stat = await lstat(join(source, file)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    if (role === 'required')
      throw new Error(`Missing required payload file: ${file}`);
  });
  if (!stat) continue;
  if (!stat.isFile()) throw new Error(`Not a regular file: ${file}`);
  entries[file] = await readFile(join(source, file));
}
for (const directory of payload.directories) {
  const stat = await lstat(join(source, directory)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (!stat) continue;
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${directory}`);
  directories.push(directory);
}
const zipEntries = Object.fromEntries(
  Object.entries(entries).map(([file, bytes]) => [
    `${name}/${file}`,
    [bytes, options],
  ]),
);
for (const directory of directories)
  zipEntries[`${name}/${directory}/`] = [new Uint8Array(), options];
const archive = zipSync(zipEntries);
const output = join(root, 'dist');
const staging = join(output, name);
// All required inputs have been read successfully before replacing prior output.
await rm(staging, { recursive: true, force: true });
for (const [file, bytes] of Object.entries(entries)) {
  await mkdir(dirname(join(staging, file)), { recursive: true });
  await writeFile(join(staging, file), bytes);
}
for (const directory of directories)
  await mkdir(join(staging, directory), { recursive: true });
await writeFile(join(output, `${name}.zip`), archive);
console.log(`Built dist/${name}/ and dist/${name}.zip`);
