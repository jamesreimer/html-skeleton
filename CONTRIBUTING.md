# Contributing to HTML Skeleton

Keep changes tied to a concrete requirement or defect. Explain changes to the
baseline in terms of their benefit and maintenance cost for consuming repositories.

Maintainers: follow [MAINTAINING.md](MAINTAINING.md) when preparing or publishing
a release.

## Workflow

Use a descriptive branch and pull request title that identify the work. No
specific prefix vocabulary or commit-message format is required by HTML Skeleton.

Follow the [setup instructions](README.md#run-checks), stage intended new files,
and run:

```sh
npm run validate
git diff --check
```

Hooks that fix files exit unsuccessfully until their changes are reviewed and
included. Rerun after reviewing fixes. An installed commit hook checks staged
files; the full command also catches effects on unchanged sources, such as
links to a deleted target. Run the full command before opening a pull request.

CI invokes `npm run validate`, which runs the same configuration on the checked-out
commit. Required checks,
review counts, merge strategy, and permissions belong to the repository's host
settings and should be chosen for the project.
The [default-branch ruleset](rulesets/README.md) supplies a reusable starting
configuration and a separate host verification procedure. When changing the
required job's name, source, or triggers, reconcile the live required check with
the workflow so every pull request targeting the protected branch can report it.

## Source layout

Edit browser-facing sources only under `site/`. Keep repository tooling outside
that document root and generated, ignored output in root-level `dist/`. Preserve
the curated ZIP layout without a `site/` wrapper when changing source paths.

Canonical validation checks Git-index paths (committed and newly staged files):
Pages (`.html`), stylesheets (`.css`), and manifests (`.webmanifest`) require
these lowercase extensions and belong under `site/` at any depth. The guard
rejects mixed/uppercase extension variants and `.htm`; `.htm` is not selected
as an HTML/site-link entry. Consumers may deliberately adapt their own copy
for another extension policy, including its validation and discovery rules.
Incidental crawling of a linked file is not supported extension coverage.
These formats identify website source here; there are no tooling or documentation
uses of them. The exact fixture exceptions in `scripts/check-source-boundary.mjs`
are owned by regression tests; new exceptions require a specific test consumer.
There is no blanket tests or documentation exemption. JavaScript is not restricted
by this guard: tooling/test modules live outside `site/`, and ESLint's browser
contract already applies inside `site/`. SVG, images, JSON, and other shared asset
formats cannot reliably identify website content and remain unrestricted.
Existing link fixtures are embedded strings/JSON; the boundary fixture is an
explicit non-site HTML file. Configuration and governance files remain at root;
ignored outputs/environments are absent from the index. Untracked files are not
checked, so stage new sources before validation. Force-tracked generated HTML,
CSS, or manifests receive no `dist/` exemption. Stage moves and deletions too: the
index retains the old path until staged. The baseline structural test also retains
the exact root-name checks, including `robots.txt`, `favicon.svg`, and `assets/`.
Baseline test files run serially so nested canonical checks do not overlap the
website baseline suite.

## Changing validation

`.pre-commit-config.yaml` owns hook selection; `package.json` owns the web tool
commands it calls. `npm run validate` is the complete contract. Prettier checks
supported source/config formats except the explicitly excluded inherited tools,
fixtures, and Markdown (see `.prettierignore`). HTML Validate checks
`site/**/*.html`; Stylelint checks `site/**/*.css`; ESLint checks JavaScript
repository-wide, with browser globals for `site/**/*.js`.
HTML Validate's Prettier preset disables conflicting formatting rules only.
The maintained recommended/standard presets keep custom rule maintenance small.
Website Linkinator checking follows local HTML and CSS references recursively
from every `.html` page using `site/` as the document root, including fragments. Every
site CSS file is also an explicit crawl entry, including imported or unlinked
stylesheets, so shared-resource caching cannot skip CSS reference checks. External
origins are skipped. Manifest JSON is formatted; manifest semantics, metadata URLs, and custom runtime-created URLs
are not comprehensively validated. Extend the entry points as the site grows.
Project regression tests exercise actual CLIs in isolated Git repositories and
check exact archive contents, missing required inputs, optional removals,
versioning, and repeatable bytes. `scripts/distribution-payload.json` owns the
required/optional file roles and retained empty directories; distribution and
serving tests derive their expectations from it. Update that declaration for
intentional payload changes rather than editing independent file lists in tests.

Markdown rules live
in `.markdownlint-cli2.jsonc`; Python rules live in `ruff.toml`. Use the tools'
native configuration when project requirements change. Make exclusions explicit
and explain substantive coverage reductions in the pull request.

The repository Linkinator hook checks Markdown and non-site HTML links offline,
including fragments. Website HTML is excluded from this hook because the
separate site checker resolves origin-root URLs against `site/`. The repository
hook runs as a fresh process through `tools/check-links.mjs`, with exact dependencies in
`package.json` and `package-lock.json`. A startup probe verifies that front matter
is excluded by the renderer actually used by Linkinator; an ineffective hook
stops validation before repository content is read. External HTTP/HTTPS links
are skipped, including redirects leaving the local serving origin. There is no
required remote-link check. Absolute website routes and generated destinations
need a project-specific decision. Markdown parsing belongs to the
maintained tools. The local `fenced-code-closed` authoring rule consumes
markdownlint's micromark tokens to require explicit fence closure; it neither
parses Markdown independently nor chooses a closing position automatically.
Working symbolic links are allowed.

Directory destinations use Linkinator's native directory listings and do not
require an `index.html`. Missing directories still fail. If an `index.html` is
present, Linkinator checks its fragments; generated listings do not expose an
HTML fragment contract, so fragments on those listings are not validated.
Use an explicit Markdown or HTML file link when a fragment must be checked.

When changing a check or its scope, verify both that representative defects fail
and that representative valid files pass in an isolated Git repository. Include
new-file selection and the full CI command where relevant. The suite includes
`tests/markdown-rules.test.cjs`, which exercises the local rule through the
installed CLI and actual configuration in the same isolated hook environment.
Keep embedded Markdown examples, container boundaries, opening-line locations,
and no-autofix behavior covered when updating the rule or its parser dependency.
Projects should add tests for the additional behavior they own.

## Updating dependencies

Hook repositories are pinned to immutable commits, with version comments.
Review updates using:

```sh
.venv/bin/pre-commit autoupdate --freeze
```

Review the resulting versions and configuration compatibility, then run the
full suite. `requirements-dev.txt` pins the runner. npm owns the link checker,
its explicit Marked dependency, the maintained front-matter stack, and the
Markdownlint dependency used by its regression tests. Use `npm ci --ignore-scripts`
locally and in CI. The lock preserves the full dependency resolution;
pre-commit `additional_dependencies` cannot provide that transitive lock.
The startup probe is still required: correctness must not depend on hoisting.
Update pins and lock together, then run the regression suite and ordinary checks.
Keep the test Markdownlint version aligned with its existing pre-commit hook.

Dependabot proposes GitHub Actions, Python requirements, and npm dependency
updates monthly. Hook revisions remain covered by `pre-commit autoupdate`.
Actions are pinned by commit as well; review version inputs when updating them.

The durable link regression contract and test controls are documented in
[tests/link-validation/README.md](tests/link-validation/README.md).
