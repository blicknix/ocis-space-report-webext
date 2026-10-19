# space-report — oCIS Web extension

A status report of all spaces for admins, in the oCIS Web UI.

- **Counts**
  - personal spaces
  - project spaces, including how many are disabled
  - Vault spaces, if Vault mode is on
- **Storage**
  - total used and total quota assigned
  - spaces without a quota (unlimited)
  - average and median usage per personal space
- **Alerts**
  - spaces at or above a fill threshold (default 90 %)
  - spaces at or over their quota
- **Orphaned spaces** (Admin role only), with the storage they hold:
  - personal spaces whose owner no longer exists in the user backend (e.g. deleted in LDAP/Keycloak)
  - project spaces without any member
  - project spaces whose members are all deleted users, deleted groups or empty groups
  - also listed, but not counted as orphaned: projects without a manager, personal spaces of disabled accounts
- **Top lists**
  - largest spaces
  - fullest spaces, measured against their quota
- **Table** of every space: type, name, owner, used, quota, % full, last modified. It is sortable and searchable.
- **Exports**, generated in the browser:
  - **PDF**: A4 report with overview, key figures, top lists and the full space list, with page numbers. Built with jsPDF using the standard Helvetica font, so characters outside Latin-1 (e.g. Greek, CJK) print as `?`.
  - **Markdown**: the same content as tables, e.g. for a wiki or ticket.
  - **CSV**: the rows currently shown in the table (respects filter/search).
  - **Print**: the page itself.
  - **Save to my files**: stores the PDF or Markdown report in your personal space, in the folder `Space reports` (configurable, created if missing). File names carry date and time; existing files are never overwritten.

  PDF and Markdown always cover all spaces, regardless of the table filter.

Tested against oCIS Web **12.5.0** (oCIS 8.x).

## Access

- **Who sees it:** users with the `Drives.List.all` permission. It appears in the app switcher as **Space report**.
- **Personal spaces of other users:** oCIS only lists them for accounts with full user-management permission, i.e. the Admin role. For other roles, the page shows a hint that the numbers are incomplete.
- **MFA:** if MFA is enabled, opening the page requires it, the same as Admin Settings. That MFA-level session is also what makes Vault spaces listable. Without it, Vault is skipped with a note.

## Data source

The page makes read-only calls to the "all drives" Graph endpoint, the same one Admin Settings uses:

```
GET /graph/v1beta1/drives?$filter=driveType eq personal
GET /graph/v1beta1/drives?$filter=driveType eq project
GET /vault/graph/v1beta1/drives?...        # only if Vault mode is enabled
```

- The orphan check additionally reads `GET /graph/v1.0/users` and `GET /graph/v1.0/groups?$expand=members`. oCIS reads these without paging, so an LDAP size limit can cut the lists short. Every owner or member missing from a list is therefore confirmed with a direct lookup (`/users/{id}`, `/groups/{id}`). Only a 404 counts as "gone"; lookup errors are reported as "not verified" and never counted as orphaned. At most 500 lookups per run (8 in parallel).
- Usage and quota come from `quota.used` and `quota.total` of each space, as reported by oCIS.
- These are space quotas, not raw bytes on the storage backend. Trash and versions count only as far as oCIS includes them in `quota.used`.
- Every refresh is a live query. Nothing is stored unless you use "Save to my files".

## Deploy

```bash
npm ci
npm run build      # -> dist/manifest.json + dist/js/space-report.js (single file, ~450 kB / 145 kB gzip incl. jsPDF)
```

- Copy `dist/` to `$WEB_ASSET_APPS_PATH/space-report/` and restart `web`. This works the same way as the feature-access extension, e.g. with the same init container / volume.
- Optional settings go in `apps.yaml`:

```yaml
space-report:
  config:
    thresholdPercent: 90   # "almost full" from this fill level
    topN: 10               # entries in the top lists
    saveFolder: Space reports   # folder in the personal space for "Save to my files" ("" = root)
```

## Test locally

Needs Docker, Node 22+, `curl`, `jq`.

```bash
npm ci
npm run build:w &                               # rebuilds dist/ on every save
docker compose -f dev/docker-compose.yml up -d  # oCIS with dist/ mounted as /web/apps/space-report
dev/seed.sh                                     # demo users' personal spaces, projects with quotas/data
```

- Open <https://localhost:9200> (self-signed certificate), log in as `admin` / `admin`, open **Space report** in the app switcher.
- After a rebuild just reload the page (`WEB_CACHE_TTL=0` is set).
- **Orphans:** `dev/make-orphan.sh einstein` deletes einstein directly in the built-in LDAP. That is what happens when a user is removed in Keycloak/LDAP. Refresh the report: einstein's personal space and the project "Einstein only" show up as orphaned. Deleting the user in Admin Settings instead would also delete the personal space, so it leaves no orphan.
- **Vault:** uncomment the two `*_VAULT_MODE` variables in `dev/docker-compose.yml`.
- Stop with `docker compose -f dev/docker-compose.yml down -v`.

## Deploy with the oCIS Helm chart

```bash
npm ci && npm run build
docker build -t registry.example.org/ocis/space-report:0.1.0 .
docker push registry.example.org/ocis/space-report:0.1.0
helm upgrade ocis owncloud/ocis -n ocis -f your-values.yaml -f deploy/values-space-report.yaml
```

`deploy/values-space-report.yaml` adds an init container to the web pods. It copies the extension into the chart's `apps` emptyDir (`/var/lib/ocis/web/assets/apps`) and sets the config via `services.web.config.externalApps`. No CSP changes are needed: the extension only calls oCIS itself.

## Development

```bash
npm test
npm run check-types
```

| File | Purpose |
|---|---|
| `src/report.ts` | Normalising, aggregation, formatting, CSV (pure, tested) |
| `src/export.ts` | Report content model + Markdown |
| `src/pdf.ts` | PDF layout (jsPDF + autotable) |
| `src/orphans.ts` | Orphan analysis (pure, tested) |
| `src/save.ts` | Saving into the personal space (WebDAV) |
| `src/api.ts` | Graph call |
| `src/views/ReportView.vue` | The page |
