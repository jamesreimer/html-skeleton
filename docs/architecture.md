# Architecture

The consumer payload is static HTML5, CSS, and vanilla JavaScript. Browsers render
it directly, without Node, a framework, a compilation step, or an application
server. Prefer native HTML and CSS behavior; add JavaScript only when interaction
genuinely requires it. The initial script contains comments only.

## Source and output boundaries

The repository root owns project tooling, governance, documentation, and tests.
`site/` is the canonical directly servable website source. Serve it as the document
root rather than exposing the whole repository. Root-level `dist/` contains only
generated, Git-ignored distribution output and must remain outside `site/`.

The repository contains substantially more than the website. `site/` names that
browser-facing boundary without implying compilation as `src/` would for this
project, or the framework/build-output semantics often associated with `public/`.
`dist/` remains generated output. This source-root contract follows
[Issue #8](https://github.com/jamesreimer/html-skeleton/issues/8) before the first
release; it refines the initial baseline's source placement without changing
website behavior or the consumer distribution contract.

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
The archive keeps its `html-skeleton-vX.Y.Z/` wrapper with website files directly
inside it, without a `site/` directory. Template consumers inherit the complete
repository layout; minimal ZIP consumers receive just the website root.
`package.json` is the authoritative project version. If the baseline gains a
required consumer file, update the explicit build rule and payload tests together.
Future scaffolding must use this same payload, not an independent copy.

The template creates independent projects; it establishes no downstream update
obligation. Consumers adapt their copies and choose any future upstream changes.
