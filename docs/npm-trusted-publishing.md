# npm publication and released-tag recovery

The `release-please.yml` workflow publishes `@keito-ai/sdk` from an existing stable
GitHub Release. Normal release creation remains automatic. A failed upload can be
retried for the same version without creating another release or moving its tag:

```bash
gh workflow run release-please.yml --repo osodevops/keito-node --ref main -f tag=v0.1.1
```

The npm package settings must authorize GitHub Actions owner `osodevops`, repository
`keito-node`, and workflow filename `release-please.yml`, with **Allow npm publish**
enabled. No GitHub environment is configured. A trusted connection must be active;
an expired connection needs replacement in npm settings. The workflow does not use
an npm token. Dist-tag management permission is unnecessary for its initial publish.

The GitHub-hosted job pins Node 24 and npm 11.21.1, disables dependency caching,
and grants `id-token: write` only to publication. npm requires at least 11.5.1 and
Node 22.14 for trusted publishing. The selected npm version was verified against
its public registry metadata and supports Node 24.

Publication refuses non-main workflow runs, arbitrary refs, prereleases, draft or
missing GitHub Releases, commits outside main, mismatched package/lock/runtime
versions, existing registry versions, and an older version that would move `latest`
backwards. Registry authentication, rate-limit and transport failures are errors;
only an exact-version 404 alongside a valid existing `latest` package means an
unpublished version. The verified immutable commit is checked out before generation,
typechecking, tests and the clean installed-package smoke check. Identity, source
checkout and registry admission are checked again immediately before upload.

npm's provenance generator reads package source from `GITHUB_SHA` and `GITHUB_REF`,
even when checkout uses an older release commit. The publish process receives those
two fields from the verified tag/commit. The actual workflow identity
`GITHUB_WORKFLOW_REF`, run URL, OIDC claims and builder identity remain unchanged.
This records the main workflow as builder and the released commit as source.

After a successful run, verify the exact registry version, integrity and provenance,
then install that published artifact and rerun the documentation example checks.
A successful local package test does not establish public registry availability.

Repair verification: three new workflow assertions failed before the change. The
final guard suite has 33 passing cases, including real temporary Git histories for
main ancestry, immutable checkout and stale runtime versions; all 121 SDK tests,
generation drift, source typechecking, installed-package checks and `actionlint`
passed. A read-only preflight selected `v0.1.1` at
`43101e9d040bf8238d09e062332f9feacc5a6d9b` and observed exact-version 404 alongside
the known `0.1.0` latest package. This preflight did not upload anything.

The registry-integrity-verified npm 11.21.1 tarball's actual provenance generator
was exercised with a mocked Sigstore signer. Its captured payload kept the main
workflow, GitHub-hosted builder and run invocation while recording the verified
release tag/SHA in `resolvedDependencies`. Signing, OIDC exchange and publication
still require the actual guarded GitHub Actions run and active npm connection.

Primary sources:

- [npm trusted publishing requirements and configuration](https://docs.npmjs.com/trusted-publishers/)
- [Pinned npm provenance generator](https://github.com/npm/cli/blob/v11.21.1/workspaces/libnpmpublish/lib/provenance.js)
- [GitHub workflow job conditions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idif)
