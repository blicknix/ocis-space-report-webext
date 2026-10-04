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
- **Top lists**
  - largest spaces
  - fullest spaces, measured against their quota
- **Table** of every space: type, name, owner, used, quota, % full, last modified. It is sortable and searchable.
- **Exports**, generated in the browser (nothing is stored on the server):
  - **PDF**: A4 report with overview, key figures, top lists and the full space list, with page numbers. Built with jsPDF using the standard Helvetica font, so characters outside Latin-1 (e.g. Greek, CJK) print as `?`.
  - **Markdown**: the same content as tables, e.g. for a wiki or ticket.
  - **CSV**: the rows currently shown in the table (respects filter/search).
  - **Print**: the page itself.

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

- Usage and quota come from `quota.used` and `quota.total` of each space, as reported by oCIS.
- These are space quotas, not raw bytes on the storage backend. Trash and versions count only as far as oCIS includes them in `quota.used`.
- Nothing is stored anywhere. Every refresh is a live query.

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
```

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
| `src/api.ts` | Graph call |
| `src/views/ReportView.vue` | The page |
