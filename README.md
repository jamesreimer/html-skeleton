# HTML Skeleton

HTML Skeleton is a minimal HTML5, plain CSS, and vanilla JavaScript starting point
for framework-free websites. Serve the website files directly: no framework,
application runtime, bundler, or build step is required.

The project is at **0.1.0**, a pre-1.0 baseline. It is not a finished theme or
component library. Release automation, deployment, and npm scaffolding are outside
the initial scope.

## Use the skeleton

Choose **Use this template** on
[HTML Skeleton](https://github.com/jamesreimer/html-skeleton) to create a new
repository with the website sources, validation, CI, documentation, and contributor
guidance. Replace the site placeholders and adapt repository guidance to your project.
**Generated consumer repositories do not automatically track upstream changes.**
Consumers own their copies and choose which later changes to adopt.

Future tagged releases will attach a curated `html-skeleton-vX.Y.Z.zip` containing
only the website foundation. GitHub's automatically generated source archives
contain the full repository and are different. This initial implementation builds
the curated ZIP locally; it does not publish a release.

See [usage](docs/usage.md) for customization, template versus ZIP consumption,
static-server preview, and the 404 page's hosting assumptions.

## Repository structure

- `index.html`, `404.html`: sparse semantic pages.
- `favicon.svg`, `robots.txt`, `site.webmanifest`: site metadata and primitives.
- `assets/css/`: reset, base styles, layout, components, and utilities.
- `assets/js/main.js`: optional, currently comment-only entry point.
- `assets/images/`, `assets/fonts/`, `assets/icons/`: empty asset locations.
- `docs/`: [architecture](docs/architecture.md), [accessibility](docs/accessibility.md),
  and [usage](docs/usage.md).
- `scripts/`, `tools/`, `tests/`: repository validation and distribution tooling.
- `.github/workflows/validate.yml`: CI using the canonical validation command.

## Run checks

Repository tooling supports Node.js `^22.22.0 || >=24.8.0` (including npm):
Node 22 from 22.22.0, or Node 24.8.0 and later. Python 3.10 or later is required.
CI selects Node 24.18.1 and Python 3.12; the isolated Markdown hooks also pin
Node 24.18.1 independently of the shell's Node version. The Node range fits the
locked dependencies' engine requirements; it is not an exhaustive test matrix.
The full contract has been checked on Node 22.22.0, 24.8.0, and 24.18.1.

From the repository root:

```sh
npm ci --ignore-scripts
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
npm run validate
```

On Windows, use `.venv\Scripts\python.exe` for setup. Stage intended new files before
validation so inherited Git-based checks see them. Setup installs pre-commit 4.6.2
from `requirements-dev.txt`. The launcher prefers the local virtual environment's
runner, falling back to `pre-commit` on PATH without checking an exact version.
The pre-commit configuration enforces a minimum of 4.6.2; use the pinned version
for reproducibility. If no runner is available, validation fails with setup guidance.
Initial setup needs network access; link checking is offline. Review any automatic
fixes and rerun.

`npm run validate` is the complete local and CI contract: inherited repository
checks, formatting, HTML, CSS, JavaScript, local links, and regression/distribution
tests. Use `npm run format` to apply source formatting. See
[CONTRIBUTING.md](CONTRIBUTING.md) for check coverage and maintenance.

## Build the minimal distribution

```sh
npm run build:distribution
```

With the current package version, this creates `dist/html-skeleton-v0.1.0/` and
`dist/html-skeleton-v0.1.0.zip`. The explicit build rule includes 11 website files
and empty image/font/icon directories; it excludes governance, CI, tooling,
documentation, dependencies, and `.gitkeep` placeholders. Output is ignored by Git.
See [architecture](docs/architecture.md#tooling-boundary) for ownership and extension.

## Provenance and contribution

Derived from [repo-template](https://github.com/jamesreimer/repo-template), HTML
Skeleton owns its adapted baseline and retains the inherited [CC0 license](LICENSE).
No external standards are adopted. Applicable inherited checks and workflow rules
remain in effect.

Use a focused branch and pull request; see [CONTRIBUTING.md](CONTRIBUTING.md) and
[AGENTS.md](AGENTS.md). Release publication follows [MAINTAINING.md](MAINTAINING.md)
and requires separate authorization. See [SECURITY.md](SECURITY.md) for vulnerability
reporting and [ruleset guidance](rulesets/README.md) for default-branch protection.
