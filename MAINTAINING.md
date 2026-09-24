# Maintaining HTML Skeleton

This document owns release preparation and publication for `html-skeleton`.
Ordinary changes follow [CONTRIBUTING.md](CONTRIBUTING.md). The project version
in `package.json` is authoritative; update it and its lock
file through the contribution workflow before preparing a release.
Permission to contribute a change does not grant permission to publish a release.

## Release identifiers

Use versions `MAJOR.MINOR.PATCH` and matching Git tags `vMAJOR.MINOR.PATCH`, with
non-negative integer components and no leading zeroes. Increment MAJOR for
incompatible changes to the baseline's documented behavior or requirements,
MINOR for compatible additions, and PATCH for compatible fixes or clarifications.
Choose the version by reviewing the changes since the previous release and
their impact on consuming repositories.

Use the complete Git tag as the GitHub Release title, for example `v1.2.1`.
This is HTML Skeleton's release display convention; Semantic Versioning governs
version numbers, not release titles. Consumers may document a different local
title convention. The editable title does not replace the immutable tag or its
verified target.

Future formal releases must use **annotated Git tags**. A GitHub Release must
refer to the corresponding tag. Once published, release tags are immutable:
do not move, replace, or delete them. Corrections requiring a different commit
need a new version and tag.

Pre-1.0 development begins at `0.1.0`; incompatible changes may occur before
1.0. Document consumer impact in release notes. This baseline creates no release.

## Prepare the release

1. Fetch the current default branch (`main`) and tags from `origin`. Confirm
   that `origin` is `jamesreimer/html-skeleton` and the working tree is clean.
2. Select the intended release commit from reviewed, merged work on `main`.
   Record its full commit SHA and check it out for validation. Review the changes
   since the previous release, including documentation, dependency updates, and
   effects on consumers. Confirm repository CI passes for this commit.
3. Follow the [setup instructions](README.md#run-checks), then run:

   ```sh
   npm run validate
   npm run build:distribution
   git diff --check
   ```

   Require passing checks and a clean working tree. If checks fix files or a
   defect needs correction, submit the change through the contribution workflow
   and select and validate the resulting merged commit before proceeding.
4. Use the unused version recorded in `package.json`; require the tag to be `v`
   followed by that exact version. Inspect the generated ZIP against the explicit
   payload rule and tests. Check both local and remote tags and existing
   [GitHub Releases](https://github.com/jamesreimer/html-skeleton/releases).
   Prepare release notes describing the changes, consumer impact, and any
   adoption steps. Keep the notes outside the checkout so it remains clean.

## Create and verify the tag

The commands below require Git and the GitHub CLI authenticated with release
permissions. Replace the placeholder values with the chosen tag, full validated
commit SHA, and release-notes file path. Stop if any command or verification
fails; do not proceed to publication.

```sh
tag='vMAJOR.MINOR.PATCH'
release_commit='<full validated commit SHA>'
notes_file='<path to prepared release notes>'
git fetch origin &&
  git merge-base --is-ancestor "$release_commit" origin/main
```

Require exit status zero before tagging. The ancestry check returns status 1
when the selected commit is not contained in the current `origin/main`.
A failed fetch or any other error also stops the release. Use the merged commit,
which may differ from the reviewed PR-head SHA after a squash merge.

```sh
git tag -a "$tag" "$release_commit" -m "html-skeleton $tag"
```

Verify both the tag object's type and the commit it resolves to:

```sh
test "$(git cat-file -t "refs/tags/$tag")" = tag &&
  test "$(git rev-parse "refs/tags/$tag^{commit}")" = "$release_commit"
```

Require exit status zero. The first test rejects a lightweight tag even when it
points to the correct commit; the second rejects a tag pointing to another
commit. Resolving a tag to a commit alone does not prove that it is annotated.

## Publish and verify

With release publication authorization, push only the verified tag, without
force, and publish its corresponding GitHub Release:

```sh
git push origin "refs/tags/$tag"
```

Before creating the GitHub Release, define and run this verification:

```sh
verify_remote_tag() {
  local_tag_object=$(git rev-parse "refs/tags/$tag") &&
    remote_tag=$(git ls-remote --exit-code origin "refs/tags/$tag") &&
    remote_commit=$(git ls-remote --exit-code origin "refs/tags/$tag^{}") &&
    test "$remote_tag" = "$(printf '%s\t%s' "$local_tag_object" "refs/tags/$tag")" &&
    test "$remote_commit" = "$(printf '%s\t%s' "$release_commit" "refs/tags/$tag^{}")"
}
verify_remote_tag
```

Require exit status zero. The comparisons require the remote tag object SHA to
match the local tag object and the remote peeled (`^{}`) SHA to match
`$release_commit`. `--exit-code` fails when a requested ref is missing, including
the peeled entry required for an annotated tag. Any failure stops publication;
investigate without overwriting a published tag.

```sh
gh release create "$tag" --repo jamesreimer/html-skeleton --verify-tag \
  --title "$tag" --notes-file "$notes_file" "dist/html-skeleton-$tag.zip"
gh release view "$tag" --repo jamesreimer/html-skeleton \
  --json url,tagName,name,isDraft,isPrerelease,publishedAt,body
verify_remote_tag
```

`--verify-tag` prevents implicit tag creation; it does not check tag type or
the intended commit, which the earlier checks establish. After publication,
confirm the release is published (not a draft or prerelease), its title follows
the naming convention above, its tag and notes
are correct, and its page, source archives, and curated distribution asset are
available. Download the attached ZIP and compare its SHA-256 with the locally
validated artifact. GitHub source archives do not replace the curated ZIP. Recheck the remote
tag object and peeled commit against the same expected SHAs. If publication
fails after the tag push, inspect the remote tag and release state before
retrying; preserve the published tag.
