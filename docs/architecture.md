# Architecture

The consumer payload is static HTML5, CSS, and vanilla JavaScript. Browsers render
it directly, without Node, a framework, a compilation step, or an application
server. Prefer native HTML and CSS behavior; add JavaScript only when interaction
genuinely requires it. The initial script contains comments only.

## Responsibilities

Load CSS in this order:

| File | Responsibility |
| --- | --- |
| `reset.css` | Conservative sizing, media, and form normalization |
| `base.css` | Neutral tokens, typography, links, forms, and focus |
| `layout.css` | Container, flow spacing, and page spacing |
| `components.css` | The skeleton's skip link |
| `utilities.css` | A single visually hidden utility |

Assets belong under `assets/`; images, fonts, and icons start empty. System fonts
are the default. Add only the components and layout primitives your content
requires. Keep accessible semantics in HTML and preserve native behaviors before
introducing custom interactions. No module loader or runtime dependency is needed.

## Tooling boundary

Node and Python are repository tools only. npm pins maintained validators and the
ZIP library; pre-commit retains the inherited repository checks and orchestrates
them. `npm run validate` invokes that shared contract, including project tests.
CI runs exactly that command. No code from `node_modules` ships to browsers.

The repository contains guidance, documentation, tooling, tests, and CI. The
curated distribution contains only the explicit website payload in
[scripts/build-distribution.mjs](../scripts/build-distribution.mjs).
`package.json` is the authoritative project version. If the baseline gains a
required consumer file, update the explicit build rule and payload tests together.
Future scaffolding must use this same payload, not an independent copy.

The template creates independent projects; it establishes no downstream update
obligation. Consumers adapt their copies and choose any future upstream changes.
