# HTML Skeleton default-branch ruleset

[default-branch.json](default-branch.json) defines HTML Skeleton's GitHub
default-branch protection. It targets the repository's default branch and supplies:

- Active protection against branch deletion and force pushes.
- Pull requests with squash-only merges and resolved review conversations.
- Zero required approving reviews, without bypass actors.
- A required `Repository validation` check from GitHub Actions, with the branch
  up to date before merging. Check enforcement also applies on branch creation.

Zero required approvals does not waive a project's separately required review.
Consumers own their host settings and may deliberately adapt this baseline to
their actual requirements, preserving any additional local protections.

The [installed HTML Skeleton ruleset](https://github.com/jamesreimer/html-skeleton/rules/23945959)
is the upstream live configuration, not a consumer target or ruleset ID. Both
HTML Skeleton maintainers and consumers use the procedure below against their
own checkout; consumers must install their own protection deliberately.

## Before installation

Copying this file or creating a repository from the template does not install
the ruleset. Repository validation checks the JSON syntax; it does not query
GitHub or establish that the live branch is protected. Later template changes
also require deliberate host reconciliation; there is no automatic propagation.

Use an authorized administrative account and the GitHub CLI with `jq` available.
Confirm rulesets are supported for the repository's plan and visibility using
[GitHub's ruleset guidance](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).
Run the commands from the intended checkout root in a dedicated Bash session:

```sh
bash
```

Keep all subsequent commands in that session. Paste one complete block at a
time, including its braces, and wait for it to finish before proceeding. Braces
let Bash 3.2 parse the whole block before running it, so prompts receive operator
input and a failure cannot leave the rest of that block executing in the parent
shell. Do not concatenate blocks. The session exits on a failed command; if it
exits, stop and restart preflight rather than pasting later blocks in the parent
shell.

The URL guard accepts only `https://github.com/...` and `git@github.com:...`
(the scp-style SSH form). It rejects `ssh://git@github.com/...`, SSH host aliases
such as `git@github-work:...`, GitHub Enterprise hosts, and other URL forms. Use
an accepted remote for the intended repository or deliberately adapt the guard
and lookup procedure. Other hosts also require adapting every API hostname and
verifying the required-check app ID below; these examples pin github.com.

Select a remote by name after inspecting its fetch URL. For a template-derived
repository, select the consumer's remote, not an added upstream remote. Forks
and checkouts with multiple remotes require the same deliberate selection.
There is no default selection or fallback to HTML Skeleton.

```sh
{
  set -euo pipefail
  trap 'printf "%s\n" "Ruleset preflight/operation failed; stop and inspect before retrying." >&2' ERR
  test "$(pwd -P)" = "$(git rev-parse --show-toplevel)"
  git remote -v
  printf 'Remote for the repository you intend to administer: '
  read -r target_remote
  test -n "$target_remote"
  repo_url=$(git remote get-url "$target_remote")
  case "$repo_url" in
    https://github.com/*|git@github.com:*) ;;
    *) printf '%s\n' 'Expected https://github.com/... or git@github.com:...; stop and inspect.' >&2; exit 1 ;;
  esac
  repo=$(gh repo view "$repo_url" --json nameWithOwner --jq .nameWithOwner)
  test -n "$repo"
  account=$(gh api --hostname github.com user --jq .login)
  repository=$(gh api --hostname github.com "repos/$repo")
  printf 'Authenticated account: %s\nSelected remote: %s\nURL: %s\n' "$account" "$target_remote" "$repo_url"
  printf '%s\n' "$repository" | jq '{full_name, default_branch, permissions}'
  printf '%s\n' "$repository" | jq -e --arg repo "$repo" \
    '.full_name == $repo and .permissions.admin == true and (.default_branch | type == "string" and length > 0)'
  printf 'Verify account, repository and default branch above; type the full owner/repository to confirm: '
  read -r confirmed_repo
  test "$confirmed_repo" = "$repo"
  readonly repo repo_url target_remote
  evidence='/absolute/path/to/new-ruleset-evidence'
  mkdir "$evidence"
  printf '%s\n' "$repository" > "$evidence/repository.json"
  printf 'host=github.com\naccount=%s\nremote=%s\nurl=%s\nrepo=%s\n' \
    "$account" "$target_remote" "$repo_url" "$repo" > "$evidence/target.txt"
  gh api --hostname github.com --paginate "repos/$repo/rulesets" > "$evidence/rulesets-before.json"
}
```

Replace the evidence path with a new directory outside the checkout before
running the block. Inspect the printed identity against the intended project,
not merely against the remote's name. A renamed or redirected repository must
also be the intended target. An unexpected identity is a reason to stop, even
when the account can administer it. Missing remotes, unsupported URLs, failed
API calls, empty discovery, missing administrative permission, or a mismatched
confirmation stop the session before any ruleset write.

Passing the selected URL explicitly to [gh repo view](https://cli.github.com/manual/gh_repo_view)
avoids implicit selection through `GH_REPO`, `gh repo set-default`, or fork-parent
defaults. Every API call also specifies its host, so `GH_HOST` cannot redirect
it. Authentication overrides still apply: verify the account actually returned
by the API. Do not substitute bare `gh repo view` or reuse a previous `repo`
value after a failure. If the checkout has no usable remote, configure the
intended remote deliberately and restart; do not guess an upstream target.

Inspect all applicable rulesets (including inherited ones) and legacy
branch protection in GitHub. Do not replace or duplicate an existing rule
merely because its name differs. Preserve additional checks and restrictions.

Before requiring CI, ensure the default branch and validation workflow already
exist. Inspect a recent successful check run on a known full commit SHA:

```sh
{
  check_sha='<full validated commit SHA>'
  gh api --hostname github.com --paginate "repos/$repo/commits/$check_sha/check-runs" \
    --jq '.check_runs[] | {name, conclusion, app: {id: .app.id, slug: .app.slug}}'
}
```

Confirm `Repository validation` is produced by `github-actions` with app ID
`15368` on github.com. Verify the app ID on other GitHub hosts before adapting
the JSON. The [supplied workflow](../.github/workflows/validate.yml) runs for
every pull request without path filters. Keep that coverage when requiring its
check; a renamed job or skipped workflow can leave merges blocked. Reconcile
workflow and host settings together when changing the check contract.

## Create or update deliberately

Prepare a reviewed payload from the published baseline. Record its immutable
source commit and any adaptations in the adopting project's change record.

```sh
{
  cp rulesets/default-branch.json "$evidence/desired.json"
}
```

If an applicable repository ruleset already exists, record its actual ID and
save its current state. Adapt `desired.json` to preserve additional local
protections before proceeding; PUT replaces the supplied rule configuration.
Coordinate administrative edits, refresh the snapshot immediately before the
write, and stop to reconcile any concurrent change rather than overwriting it.

```sh
{
  ruleset_id='<existing repository ruleset ID>'
  gh api --hostname github.com "repos/$repo/rulesets/$ruleset_id" > "$evidence/before.json"
}
```

Stop here to inspect `before.json` against `desired.json` and review any
adaptations. Do not paste the update block until that review is complete.
Immediately before the write, rerun the snapshot block and reconcile any change
with the reviewed state; coordinate edits so another operator cannot invalidate
that review. Then execute the update separately:

```sh
{
  gh api --hostname github.com --method PUT "repos/$repo/rulesets/$ruleset_id" \
    --input "$evidence/desired.json" > "$evidence/applied.json"
}
```

Only when no corresponding rule exists, create one and retain its returned ID:

```sh
{
  gh api --hostname github.com --method POST "repos/$repo/rulesets" \
    --input "$evidence/desired.json" > "$evidence/applied.json"
  ruleset_id=$(jq -er '.id' "$evidence/applied.json")
}
```

## Verify and retain evidence

Keep the confirmed `repo` and evidence directory from preflight for every write
and read-back. The existing or returned `ruleset_id` belongs to that repository;
never copy the ID from the upstream link. If the checkout, target, or account
changes, restart preflight with a new evidence directory and rediscover the ID.

Read back the persisted rule separately from the mutation response. Compare the
writable fields, sorting rules to avoid differences in API ordering:

```sh
{
  gh api --hostname github.com "repos/$repo/rulesets/$ruleset_id" > "$evidence/after.json"
  fields='{name, target, enforcement, bypass_actors, conditions, rules: (.rules | sort_by(.type))}'
  jq -S "$fields" "$evidence/desired.json" > "$evidence/expected.json"
  jq -S "$fields" "$evidence/after.json" > "$evidence/actual.json"
  diff -u "$evidence/expected.json" "$evidence/actual.json"
}
```

Require equality or resolve and document any server-added defaults before
claiming correspondence. Recheck all effective default-branch protections in
GitHub, including other rulesets and legacy branch protection. Inspect an actual
pull request's check and merge requirements; do not merge it just to test rules.
Retain the confirmed host, repository, account, source revision, rule ID,
adaptations, before/after evidence and verification outcome in the project's
change record.

If an update or verification fails, stop and inspect current host state before
retrying. Keep the snapshots. Do not delete/recreate the ruleset or add bypass
actors to recover. A correction or restoration through the same API needs
appropriate authority, especially when it would weaken protection; prepare a
reviewed payload from the saved writable fields, preserving unrelated changes,
and repeat read-back verification. A local JSON file alone is never proof of
successful installation or recovery.
