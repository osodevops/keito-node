# npm publication and released-tag recovery

The `release-please.yml` workflow publishes `@keito-ai/sdk` from an existing stable
GitHub Release at the genuine workflow invocation commit. Normal release creation
remains automatic. A failed upload can be retried for the same version only while
the selected release still matches the main-branch invocation:

```bash
gh workflow run release-please.yml --repo osodevops/keito-node --ref main -f tag=v0.1.1
```

If main has advanced beyond that release before a manual retry, the guard refuses
publication. Create a fresh patch release through Release Please. Never move an
existing tag, replace GitHub source/identity fields, disable provenance, or fall
back to a token to bypass a source mismatch. A queued automatic release invocation
can still publish if its original commit matches the release, even if main advances
while that invocation waits.

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
missing GitHub Releases, commits outside main, a release commit different from
the genuine `GITHUB_SHA`, mismatched package/lock/runtime
versions, existing registry versions, and an older version that would move `latest`
backwards. Registry authentication, rate-limit and transport failures are errors;
only an exact-version 404 alongside a valid existing `latest` package means an
unpublished version. The verified immutable commit is checked out before generation,
typechecking, tests and the clean installed-package smoke check. Identity, source
checkout and registry admission are checked again immediately before upload.

npm verifies provenance's source URI/ref and commit digest against the signing
certificate's genuine GitHub OIDC claims. The workflow leaves every `GITHUB_*`
field unchanged and checks out the release commit that equals `GITHUB_SHA`.
`GITHUB_REF` remains `refs/heads/main`; `GITHUB_WORKFLOW_REF`, run URL, OIDC claims
and builder identity also retain their genuine values.

After a successful run, verify the exact registry version, integrity and provenance,
then install that published artifact and rerun the documentation example checks.
A successful local package test does not establish public registry availability.

The first OIDC upload attempt, GitHub Actions run `41287256698`, accepted trusted
authentication but returned npm `E422`. It attempted source tag `v0.1.1` at
`43101e9d040bf8238d09e062332f9feacc5a6d9b` while the genuine main workflow invocation
was `b2774be6b48997dcf110975c093c50f07929eac4`. The local generator-only check with a
mocked signer had missed the registry's certificate source binding; it was not a
publication qualification. The package was not uploaded in that failed run.

Four correction regressions failed before the fix: source field overrides,
missing/malformed invocation SHA, and acceptance of a stale released-tag retry.
The guard suite includes the exact captured E422 source/invocation pair and real
temporary Git histories for a matching original invocation, stale retry, main
ancestry, immutable checkout and stale runtime versions. Only the subsequent
guarded GitHub Actions publication and registry provenance verification establish
successful signing, OIDC exchange and public package availability.

After the correction, all 37 guard tests and 125 SDK tests passed, along with
typechecking, generation drift, clean installed-package checks and `actionlint`.
A read-only real-release preflight rejected the captured stale `v0.1.1` retry
before GitHub Release or registry metadata lookup, without invoking publication.

Primary sources:

- [npm trusted publishing requirements and configuration](https://docs.npmjs.com/trusted-publishers/)
- [Pinned npm provenance generator](https://github.com/npm/cli/blob/v11.21.1/workspaces/libnpmpublish/lib/provenance.js)
- [Fulcio mapping of signed source ref and digest claims](https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md#mapping-oidc-token-claims-to-fulcio-oids)
- [GitHub workflow job conditions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idif)
