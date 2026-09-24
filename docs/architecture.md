# Architecture

The consumer payload is static HTML5, CSS, and vanilla JavaScript. Browsers render
it directly, without Node, a framework, a compilation step, or an application
server. Prefer native HTML and CSS behavior; add JavaScript only when interaction
genuinely requires it. The supplied script contains comments only.

## Source and output boundaries

The repository root owns project tooling, governance, documentation, and tests.
`site/` is the canonical directly servable website source. Serve it as the document
root rather than exposing the whole repository. Root-level `dist/` contains only
generated, Git-ignored distribution output and must remain outside `site/`.

The repository contains substantially more than the website. `site/` names that
browser-facing boundary without implying compilation as `src/` would for this
project, or the framework/build-output semantics often associated with `public/`.
`dist/` remains generated output.

Website pages use lowercase `.html`. HTML validation and site-link discovery
cover that extension; `.htm` is outside the default skeleton contract. Consumers
who adopt another extension must adapt classification, validation, and discovery
together.

## Browser expectations

HTML Skeleton targets current stable evergreen browsers using broadly available,
browser-native HTML and CSS. Core content and navigation do not depend on
JavaScript. No legacy-browser polyfills or compatibility layers are shipped.
Consumers own stricter or legacy-browser support requirements. This is a support
intent, not a claim of an automated browser test matrix; use the manual checks in
[accessibility](accessibility.md) when extending the site.

## Responsibilities

Load CSS in this order:

| File | Responsibility |
| --- | --- |
| `reset.css` | Conservative sizing, media, and form normalization |
| `base.css` | Neutral tokens, typography, links, forms, and focus |
| `layout.css` | Container, flow spacing, and page spacing |
| `components.css` | The skeleton's skip link |
| `utilities.css` | A single visually hidden utility |

Assets belong under `site/assets/`; images, fonts, and icons start empty. System fonts
are the default. Add only the components and layout primitives your content
requires. Keep accessible semantics in HTML and preserve native behaviors before
introducing custom interactions. No module loader or runtime dependency is needed.

## Tooling boundary

Node and Python are repository tools only. npm pins maintained validators and the
ZIP library; pre-commit retains the inherited repository checks and orchestrates
them. `npm run validate` invokes that shared contract, including project tests.
CI runs exactly that command. No code from `node_modules` ships to browsers.

The repository contains guidance, documentation, tooling, tests, and CI. The
curated distribution reads only the explicit website payload from `site/` using
[scripts/build-distribution.mjs](../scripts/build-distribution.mjs).
[scripts/distribution-payload.json](../scripts/distribution-payload.json) owns the
archive prefix, required/optional file roles, and removable empty directories.
Assembly and regression tests use this same declaration. Required files must
exist; absent optional files are omitted. Present entries must have the declared
file/directory type. Parent directories exist only as needed for retained files.
See [usage](usage.md#optional-payload-removal) for the removal workflow.
The archive keeps its `html-skeleton-vX.Y.Z/` wrapper with website files directly
inside it, without a `site/` directory. Template consumers inherit the complete
repository layout; minimal ZIP consumers receive just the website root.
`package.json` is the authoritative project version. Add consumer files to the
payload declaration deliberately when they should ship; asset directories are
not copied recursively. Payload tests derive their expected contents from that
declaration, while content/link validation checks the website itself.

The template creates independent projects; it establishes no downstream update
obligation. Consumers adapt their copies and choose any future upstream changes.
