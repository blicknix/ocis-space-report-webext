# Contributing space-report to oCIS

The right place is **[owncloud/web-extensions](https://github.com/owncloud/web-extensions)**. It is ownCloud's monorepo for extensions outside core Web, e.g. group-management, draw-io and advanced-search. Merged extensions are published as `owncloud/web-extensions:<app>-<version>` and can be added to the `ocis_full` deployment example.

`web-extensions-space-report.patch` contains the extension already adapted to that repo:

- `packages/web-app-space-report/` with the repo layout:
  - `src/`, `public/manifest.json`, `l10n/`
  - `tests/unit` (Vitest) and `tests/e2e` (Playwright)
  - README, Apache-2.0 LICENSE
- Mount in `docker-compose.yml`, entry in the CI test matrix (`.github/workflows/test.yml`) and in the root README.

Checked against the repo's own tooling:
- `eslint`, `prettier`, `vue-tsc`, unit tests (20), build
- REUSE lint
- dependency license check: jsPDF and jspdf-autotable are both MIT
- the e2e test, run against oCIS 8.2.0

## Repo rules

- **License:** Apache-2.0 (the standalone project said AGPL-3.0; the patch uses Apache-2.0).
- **New dependencies need an issue first.** jsPDF and jspdf-autotable are new to the repo. Open the issue below before the PR.
- **Signed commits with DCO:** `git commit -S -s`, conventional commit messages (`feat: …`), rebase and no merge commits.
- **CI does not run for PRs from forks.** A maintainer mirrors your branch, so expect some back-and-forth.
- **Strings must be translatable.** `l10n/translations.json` starts empty; Transifex fills it after the merge.
- **Contact:** Matrix `#ocis:matrix.org`.

## Steps

```bash
# 1. fork owncloud/web-extensions on GitHub, then:
git clone git@github.com:<you>/web-extensions.git && cd web-extensions
git checkout -b feat/space-report
git am -S --signoff ../web-extensions-space-report.patch   # re-sign with your own key
pnpm install                                               # updates pnpm-lock.yaml for jspdf
git add pnpm-lock.yaml && git commit -S -s -m "chore: update lockfile for space-report"

# 2. verify
pnpm --filter space-report check:types && pnpm lint && pnpm --filter space-report test:unit
pnpm --filter space-report build && docker compose up -d   # https://host.docker.internal:9200, admin/admin
pnpm --filter space-report test:e2e

# 3. push and open the PR (title: "feat: add space-report extension"), linking the issue
```

The patch's commit carries the `Co-Authored-By: Claude` trailer. Keep or remove it as you prefer before pushing.

## Draft issue

**Title:** Proposal: space-report extension (admin status report incl. orphaned spaces)

> I'd like to contribute an admin extension, "Space report". It shows:
>
> - counts of personal, project and Vault spaces
> - total used and assigned quota, spaces near or over quota, top lists
> - **orphaned spaces**: personal spaces whose owner no longer exists in the user backend, and projects without (live) members
>
> Reports can be exported as PDF, Markdown and CSV, or saved to the admin's personal space. It uses only existing Graph endpoints (`/graph/v1beta1/drives`, `/graph/v1.0/users`, `/graph/v1.0/groups`) and needs no server changes.
>
> **New dependencies:** `jspdf` (MIT) and `jspdf-autotable` (MIT) generate the PDF in the browser. The bundle grows to about 460 kB (150 kB gzip). It is a single file, because Web loads extensions via requirejs. The alternative would be dropping PDF and keeping only Markdown, CSV and browser print. Is adding these OK?
>
> **Note for oCIS:** `GET /graph/v1.0/users` and `/groups` are read without paging. With an LDAP size limit the lists come back truncated without any indication. The extension works around this by confirming every missing ID with `GET /users/{id}`. Proper paging or a truncation flag in Graph would help other admin tools too.
>
> Implementation is ready (lint, types, unit and e2e tests pass); happy to open the PR once the dependency question is settled.
