# Usage

## Start from GitHub Template

Choose **Use this template** on the repository, name your new project, then clone
it. This includes the `site/` website sources plus root-level documentation,
validation, CI, and contributor guidance. The template supplies the current
upstream default-branch state, not necessarily a released tag. Record the HTML
Skeleton source commit SHA when creating the project, alongside any release tag
you deliberately started from. The new repository's own initial commit is not
that upstream SHA; the copied package version alone does not identify its source.
Follow [setup](../README.md#run-checks) before changing sources. Review repository
ownership, license, security reporting, ruleset installation, and release guidance
for your project. Creating a repository does not install branch protection.

Deliberately adapt project identity: `package.json` name and the corresponding
lockfile metadata; `prefix` in `scripts/distribution-payload.json` for archive
names; repository URLs and commands in maintenance/release guidance; the security
reporting route; ruleset installation target; and authority links in contributor
and agent guidance. Package name and archive prefix are separate choices. Use a
lowercase archive prefix without path separators. Nothing renames these values
automatically, and the upstream release procedure is not a consumer release target.

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
website root of an extracted distribution. Use lowercase `.html` for pages.
`.htm` is not a supported page extension in the default validation contract.
The home page uses relative asset links.
`404.html` uses origin-root links so a
server can return it for nested missing paths. These origin-root URLs resolve
inside `site/` when it is the document root. If hosting under a subpath, change
those links to your actual base path. Configure your eventual host to return the
404 document with HTTP status 404; this repository includes no host configuration.

Preserve useful semantics, visible focus, and skip navigation as content grows.
Social metadata and unused CSS rules may be removed when unnecessary.

### Optional payload removal

The template's [payload declaration](../scripts/distribution-payload.json) is the
single source for distribution file roles and test expectations:

| Role | Baseline elements | Removal contract |
| --- | --- | --- |
| Required | `index.html`, `404.html`, `favicon.svg`, `robots.txt`; `reset.css`, `base.css`, `layout.css`, `components.css` under `assets/css/` | Keep these baseline files; missing inputs fail. Changing this baseline contract requires deliberately adapting the declaration and any affected behavior. |
| Optional | `assets/js/main.js`, `site.webmanifest`, `assets/css/utilities.css` | Remove the file and all references to it; no declaration or test edits are needed. |
| Removable empty directories | `assets/images/`, `assets/fonts/`, `assets/icons/` | Remove an unused directory and its `.gitkeep`; absent directories are omitted. |
| Conditional structural directories | `assets/` and its file-containing subdirectories | Keep while retained files need them; empty `assets/js/` may be removed after JavaScript removal. Assembly creates parents for retained files. |

To remove JavaScript from a template checkout:

1. Remove the `<script>` reference from `site/index.html` and any other pages.
2. Delete `site/assets/js/main.js`; remove its empty directory if desired.
3. Stage the edits and deletion, then run `npm run validate` and
   `npm run build:distribution`. The ZIP omits JavaScript; no payload-definition
   change is required.

For the manifest or utility stylesheet, remove references from every page before
deleting the file. Remove unused utility classes or replace any behavior the site still needs.
Validation rejects dangling local references even when the target is optional.
New files ship only after being added to the payload declaration; retaining an
asset directory does not include arbitrary files inside it. ZIP consumers can
remove the same optional files/references directly, without repository tooling.

## Preview without a build

Serve `site/` as the document root, not the repository root. Repository governance
and tooling files should not be publicly served. No build or Node runtime is
needed. For example, from a template checkout with Python installed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

Open `http://127.0.0.1:8000/` and `/404.html`. For local distribution testing, change
into `dist/html-skeleton-vX.Y.Z/` (substituting the built version) first and omit
`--directory site`. Root-level `dist/` is generated and ignored by Git; do not edit it as canonical source.
The server is a local preview tool, not an
application dependency. The basic Python server does not route missing URLs to
the custom 404 document automatically.
