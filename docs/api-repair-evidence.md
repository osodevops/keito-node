# Published SDK and public contract repair

The SDK source at `4ad313f660c7810c982d2c5465ba08fd9cbdf1ad` contained unreleased timer helpers, but the last published package was 0.1.0. The repair keeps the package identity `@keito-ai/sdk` and makes the documented constructor, API origin and expense capture contract usable in the next published artifact.

## Changes

- Default requests use `https://app.keito.ai`. Explicit credentials override environment variables; missing credentials fail locally without exposing values. Optional `/api/v2` base suffixes normalize to the origin, ambiguous base URLs and cross-origin resource paths are refused, and authenticated requests do not follow redirects.
- Existing timer helper behavior remains intact. Expense item reads, updates, deletes and receipt upload/download/removal use the existing server routes and authorization contract.
- Multipart uploads leave the boundary to fetch and are never automatically replayed. Unkeyed mutations are not automatically retried after network/gateway uncertainty. Time and expense JSON mutations accept explicit idempotency keys for safe identical retries.
- The bundled OpenAPI source is the coordinator's reviewed app specification. Generated request types honor explicit `required` lists instead of treating defaulted properties as mandatory. Query-filter types derive from operation schemas; expense updates retain nullable properties and exclude immutable fields.
- The public errors keep their real `Keito*Error` names. Generic outcome callers can select `source: api`; the historical source default remains unchanged, with its separate agent metadata admission documented.
- Release Please uses its checked-in config/manifest and updates the annotated runtime version. CI and publication both run a clean packed-artifact installation check before publication.

## Evidence

- Baseline: all 61 existing tests and source typechecking passed.
- Red: 14 new focused assertions failed on unchanged implementation for missing expense/receipt methods, no-argument environment construction, missing credential rejection, unsafe POST replay, URL restrictions and redirect policy. Existing assertions remained green.
- A later parsed-origin counterexample failed before its fix: WHATWG URL normalization removed a newline from a resource path, changing the destination. The request now checks its normalized origin before attaching credentials; that focused regression passed.
- Package-consumer checking caught an additional type compatibility regression during schema refresh: a normal expense create without `entry_type` stopped compiling because the generator treated the server default as required. `--default-non-nullable false` keeps explicit required lists authoritative, and the installed-artifact consumer covers this exact call.
- Independent review reproduced a pre-existing README pagination failure: `list()` returned a Promise that the example attempted to iterate directly. The artifact check now executes that actual README code block, demonstrated the same TypeError before correction, and verifies both pages after the missing `await` was added. Blended-reporting documentation now distinguishes local estimates from invoices or settled revenue.
- Final validation commands: `npm run generate`, `npm run typecheck`, `npm test`, `npm run test:package`, and `git diff --check`. The package check builds, packs, clean-installs, imports ESM and CommonJS, compiles `.mts` and `.cts` consumers against installed declarations, and exercises paging and expense/receipt examples with mocked HTTP and synthetic credentials.
- No customer data or authenticated production request is needed for these checks. This record does not claim a package was published; the coordinator verifies registry artifacts after the guarded release.

The research challenge favored testing built tarballs, exact URL construction, retry safety and public exports. These were checked against the local client and API contract and the primary npm pack and Release Please generic-version updater documentation:

- https://docs.npmjs.com/cli/v11/commands/npm-pack/
- https://github.com/googleapis/release-please/blob/main/docs/customizing.md#updating-arbitrary-files

The existing release PR targets 0.2.0. Its refreshed version files, latest-head checks and registry artifact must be verified before the website claims that version is available.
