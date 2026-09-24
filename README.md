# HTML Skeleton

A small HTML5, plain CSS, and vanilla JavaScript foundation for framework-free
websites. Version **0.1.0** is a pre-1.0 baseline. Serve the website files directly;
no application runtime or build step is required.

This is a starting point, not a theme, component library, framework, or finished
site. It includes no bundler, analytics, CMS, server code, deployment automation,
or npm scaffolding package.

## Use the skeleton

### GitHub Template

Choose **Use this template** on
[html-skeleton](https://github.com/jamesreimer/html-skeleton) to create an independent
repository with source, checks, CI, documentation, and contributor guidance.
Replace the site placeholders and adapt repository guidance to your project.
Consumers own their copies; upstream changes do not synchronize automatically.

### Minimal distribution

Future tagged releases may attach `html-skeleton-vX.Y.Z.zip`. Extract it and serve
the enclosed directory. This curated asset contains only the website foundation;
GitHub's automatic source ZIPs contain the full repository and are different.
This initial implementation does not publish a release. Build a local candidate
with `npm run build:distribution` after installing the repository dependencies.

See [usage](docs/usage.md) for customization and serving details.

## Run checks

Use Node.js 24.18.1 (including npm) and Python 3.10 or later. From the repository root:

```sh
npm ci --ignore-scripts
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
git add <intended-new-files>
npm run validate
git diff --check
```

On Windows, use `.venv\Scripts\python.exe` for setup. The validation launcher
selects the platform's local virtual environment, falling back to `pre-commit`
on PATH (as in CI). Initial hook setup requires network access; link validation
is offline. Checks may fix whitespace; review fixes and rerun. New files must be
staged because inherited checks use Git's tracked-file selection.

`npm run validate` is the complete local and CI contract: inherited repository
hygiene, Markdown and workflow checks, Prettier formatting, HTML Validate,
Stylelint, ESLint, local links/references, and regression/distribution tests.
`npm run format` applies source formatting. Markdown retains the inherited
Markdownlint rules; Python retains Ruff. External URLs are not requested.
These checks do not prove accessibility or overall correctness.

Optionally install the commit hook with `.venv/bin/pre-commit install`.
See [CONTRIBUTING.md](CONTRIBUTING.md) for scope and maintenance.

## Distribution build

```sh
npm run build:distribution
```

The explicit rule in [scripts/build-distribution.mjs](scripts/build-distribution.mjs)
reads the version from `package.json`, creates `dist/html-skeleton-v0.1.0/`, and
writes `dist/html-skeleton-v0.1.0.zip`. It includes the two HTML pages, favicon,
robots file, manifest, five CSS files, JavaScript entry point, and empty images,
fonts, and icons directories. Repository-only files and `.gitkeep` placeholders
are excluded. Missing required source files fail before replacing output.
Fixed ZIP metadata and entry order make unchanged inputs byte-identical.
Generated output is ignored by Git. Rebuild after editing source.

## Repository map

- `index.html`, `404.html`: sparse semantic pages.
- `assets/css/`: reset, element defaults, layout, components, utilities.
- `assets/js/main.js`: optional, currently comment-only entry point.
- `assets/images/`, `assets/fonts/`, `assets/icons/`: empty asset locations.
- `docs/`: [architecture](docs/architecture.md), [accessibility](docs/accessibility.md),
  and [usage](docs/usage.md).
- `scripts/`: validation entry point, website link check, distribution assembly.
- `tools/`, `tests/`: inherited checks and project regression evidence.
- `.github/workflows/validate.yml`: the same validation contract in CI.

## Ownership and maintenance

Derived from [repo-template](https://github.com/jamesreimer/repo-template).
HTML Skeleton owns its adapted baseline; no external standards are adopted.
Applicable inherited checks, contributor guidance, and human release authority
are preserved. Consumer update required: no automatic propagation; adoption is
explicit and consumer-owned. The project retains the inherited [CC0 license](LICENSE).

Changes use a work branch and PR. Review, merge, release, and deployment are
separate actions; see [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), and
[MAINTAINING.md](MAINTAINING.md). The inherited [ruleset](rulesets/README.md) is an
optional installation baseline, not proof of live branch protection.
