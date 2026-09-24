# Usage

## Start from GitHub Template

Choose **Use this template** on the repository, name your new project, then clone
it. This includes the `site/` website sources plus root-level documentation,
validation, CI, and contributor guidance.
Follow [setup](../README.md#run-checks) before changing sources. Review repository
ownership, license, security reporting, ruleset installation, and release guidance
for your project. Creating a repository does not install branch protection.

## Start from a minimal ZIP

When a tagged release supplies `html-skeleton-vX.Y.Z.zip`, download that attached
asset and extract it. GitHub-generated source archives are full repository
snapshots, not this curated distribution. `npm run build:distribution` builds the
ZIP locally without publishing it; publication follows the documented
[release process](../MAINTAINING.md). Minimal ZIP users receive no repository
checks, governance, or development documentation. The archive keeps its versioned
wrapper; the website files are directly inside it, without a `site/` directory.

Both paths create independent files. There is no automatic upstream synchronization.

## Customize

Replace the page title, description, language if needed, navigation/footer site
name, heading, content, favicon, and manifest names. Keep social metadata aligned
with visible content. Add canonical and social URLs/images only once real public
addresses exist. Review `robots.txt` for the intended crawl policy; it is not access
control. The manifest is a basic browser manifest, not an offline/PWA implementation.

Edit website files under `site/` in a template checkout, or directly in the
website root of an extracted distribution. The home page uses relative asset links.
`404.html` uses origin-root links so a
server can return it for nested missing paths. These origin-root URLs resolve
inside `site/` when it is the document root. If hosting under a subpath, change
those links to your actual base path. Configure your eventual host to return the
404 document with HTTP status 404; this repository includes no host configuration.

Remove the script reference and `main.js` if unused in a consumer project. Empty
asset directories, unused utilities, social metadata, and the manifest/reference
may also be removed together if unnecessary. Preserve useful semantics, visible
focus, and skip navigation as content grows. In this repository, required payload
changes must also update the distribution rule and tests.

## Preview without a build

Serve `site/` as the document root, not the repository root. Repository governance
and tooling files should not be publicly served. No build or Node runtime is
needed. For example, from a template checkout with Python installed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

Open `http://127.0.0.1:8000/` and `/404.html`. For local distribution testing, change
into `dist/html-skeleton-v0.1.0/` first and omit `--directory site`. Root-level
`dist/` is generated and ignored by Git; do not edit it as canonical source.
The server is a local preview tool, not an
application dependency. The basic Python server does not route missing URLs to
the custom 404 document automatically.
