# Build 004D — GitHub and isolated staging preparation

Status: source and local staging artifact prepared. **No GitHub push and no Cloudflare upload/deployment have run.** Public production is not approved for deployment.

## Repository

The workspace originally had no `.git` directory. A local `main` repository now targets `https://github.com/64reth/pit-a-pat-web.git`. Read-only `git ls-remote ... HEAD` succeeded with no HEAD, consistent with an empty repository at inspection time. No remote history was overwritten or force-pushed.

Before an approved push:

```sh
git status --short
npm run check:release
git diff --cached --stat
# Inspect the local commit, then authenticate GitHub if necessary.
# Only after owner approval:
git push -u origin main
```

`.gitignore` excludes environment files, private keys, local SQLite/player databases, Cloudflare output, generated builds, browser storage state, recordings, dependency directories and temporary release artifacts. The release-file checker examines candidate/staged files for forbidden paths, common embedded private keys/tokens and oversized GitHub blobs. It does not print credential contents. This is a local targeted check, not a substitute for GitHub's hosted secret scanning.

The application has no external service secret in its checked-in runtime configuration. CLI credentials belong in the local credential store or an approved CI secret, never in source, browser code or `.env` files committed to Git.

## Staging target and bindings

| Item | Staging | Production package |
|---|---|---|
| Worker | `pit-a-pat-online-staging` | `pit-a-pat-online` |
| `ACCOUNTS` | `Account` exported by staging Worker | `Account` exported by production Worker |
| `ROOMS` | `GameRoom` exported by staging Worker | `GameRoom` exported by production Worker |
| Storage | Independent SQLite Durable Object namespaces | Existing production namespaces remain untouched |
| `ASSETS` | This staging build's static assets | Production build's assets |
| Routes/domains | No production routes/custom domains configured | No changes made |

No binding, namespace transfer, route or resource references LUDI. Staging imports the same source implementation, not production data or namespace IDs. No local player database or guest/browser credential is part of the artifact.

The installed **cf CLI 0.15** uses `exports.Account` and `exports.GameRoom` with `storage: 'sqlite'` as its Durable Object lifecycle declarations. In this configuration format the exports map replaces an ordered Wrangler migration history; do not add a separate Wrangler config/tag that could bypass the staging guard. These live class declarations create independent namespaces under the new staging Worker. No class deletion, rename, transfer, import or wallet migration is requested. Existing room schema/version and SQL tables remain compatible; `lastAction` is optional public presentation metadata.

Reference: [Cloudflare CLI Durable Object lifecycle](https://developers.cloudflare.com/cf/projects/cloudflare-config/#manage-durable-object-lifecycle).

## Prepared artifact and checks

The ignored directory `artifacts/staging-build/.cloudflare/output/v0/` contains a standalone snapshot of the validated staging Build Output. `artifacts/staging-plan.json` records the names, bindings, storage lifecycle and no-data-copy policy. The ordinary root build output is restored to the production-named package for local preview; this does not deploy production.

```sh
npm ci
npm test
npm run test:isolation
npm run prepare:staging
npm run staging:dry-run
```

`staging-preflight.mjs` rejects a non-staging mode, wrong Worker, shared production namespace reference, pinned shared namespace ID, missing SQLite class or production/LUDI route. Build packaging rejects private credential/database filenames in public assets and strips Finder metadata.

The local isolation test runs staging and production **together in one Workers runtime**. Identical account IDs, reservation IDs and room codes remain separate. A production reward/reservation cannot fund a staging wallet, and the two rooms retain different modes and round IDs. This proves the local configuration's isolation; hosted resource assignments still require inspection after the approved staging deployment.

`cf deploy --prebuilt --mode staging --dry-run` completed successfully and reported only the staging `Account`, staging `GameRoom`, assets and non-secret configuration values. Nothing was uploaded. The staging build's root mode is explicitly `staging`.

## After approval — not executed

Authenticate the intended Cloudflare account using the installed CLI, inspect the selected account, rebuild/validate staging, then run the reviewed command:

```sh
npx cf auth login
npx cf auth whoami
npm run prepare:staging
npx cf deploy --prebuilt --mode staging --dry-run
# Only after owner approval of that exact staging target/account:
npx cf deploy --prebuilt --mode staging
```

No `deploy` script or automatic push-triggered workflow has been added. Public production deployment is a separate future decision.

## Remaining external blockers

- GitHub CLI reports unauthenticated; authenticated push is pending owner approval and credentials.
- Cloudflare CLI reports unauthenticated; target account selection, hosted namespace provisioning and staging URL cannot be completed locally without authentication/approval.
- Hosted Cloudflare hibernation, deployment recovery and account/namespace assignments must be verified on staging. Local Miniflare tests are not claimed as hosted validation.
- The inherited funded cancellation policy preserves reservations if a player never returns. An operator reconciliation policy/tool remains necessary before a public funded launch; no automatic losing-match refund/forfeit was introduced.

The running local build is identified by the footer and `/build-info.json`. Confirm that `.app[data-build]` matches `sourceBuild` in that endpoint when inspecting an already-open browser tab.
