// Report documents (Markdown, PDF) built from the same data the page shows.
import { SpaceKind, SpaceRow, Summary, formatBytes, formatPercent } from './report'

export interface ReportMeta {
  server: string
  generatedAt: Date
  generatedBy: string
  thresholdPercent: number
  vault: 'ok' | 'disabled' | 'mfa-required' | 'error'
  /** false: other users' personal spaces were not visible to the caller */
  complete: boolean
}

export interface ReportData {
  meta: ReportMeta
  summary: Summary
  rows: SpaceRow[]
}

const KIND_LABEL: Record<SpaceKind, string> = {
  personal: 'Personal',
  project: 'Project',
  'vault-personal': 'Vault personal',
  'vault-project': 'Vault project'
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10)
export const dateTime = (d: Date) =>
  `${isoDate(d)} ${d.toTimeString().slice(0, 5)}`
const shortDate = (s: string | null) => (s ? isoDate(new Date(s)) : '-')

export const reportFileName = (meta: ReportMeta, ext: 'md' | 'pdf') =>
  `space-report-${meta.server.replace(/[^\w.-]+/g, '_')}-${isoDate(meta.generatedAt)}.${ext}`

/** Shared content model so Markdown and PDF always say the same thing. */
export function sections({ meta, summary, rows }: ReportData) {
  const { byKind, total } = summary
  const personalUsed = rows.filter((r) => r.kind === 'personal').map((r) => r.used).sort((a, b) => a - b)
  const avg = personalUsed.length ? personalUsed.reduce((a, b) => a + b, 0) / personalUsed.length : 0
  const mid = Math.floor(personalUsed.length / 2)
  const median = !personalUsed.length
    ? 0
    : personalUsed.length % 2
      ? personalUsed[mid]
      : (personalUsed[mid - 1] + personalUsed[mid]) / 2

  const notes: string[] = []
  if (!meta.complete) {
    notes.push("Other users' personal spaces were not visible to the generating account; personal numbers are incomplete.")
  }
  if (meta.vault === 'mfa-required') notes.push('Vault spaces are not included (listing them requires an MFA session).')
  if (meta.vault === 'error') notes.push('Vault spaces could not be loaded and are not included.')
  notes.push('"Used" is the usage oCIS reports against each space quota, not raw backend storage.')

  const overview: [string, string, string, string][] = [
    ['Type', 'Spaces', 'Used', 'Quota assigned'],
    ...(['personal', 'project', 'vault-personal', 'vault-project'] as SpaceKind[])
      .filter((k) => k === 'personal' || k === 'project' || meta.vault === 'ok')
      .map((k): [string, string, string, string] => [
        KIND_LABEL[k] + (byKind[k].disabled ? ` (${byKind[k].disabled} disabled)` : ''),
        String(byKind[k].count),
        formatBytes(byKind[k].used),
        formatBytes(byKind[k].quotaAssigned) + (byKind[k].unlimited ? ` (+${byKind[k].unlimited} unlimited)` : '')
      ]),
    ['Total', String(total.count), formatBytes(total.used), formatBytes(total.quotaAssigned)]
  ]

  const keyFigures: [string, string][] = [
    [`Spaces >= ${meta.thresholdPercent} % full`, String(total.overThreshold)],
    ['Spaces at or over quota', String(total.exceeded)],
    ['Spaces without quota', String(total.unlimited)],
    ['Average per personal space', formatBytes(avg)],
    ['Median per personal space', formatBytes(median)]
  ]

  const largest = summary.largest.map((r, i) => [String(i + 1), r.name, KIND_LABEL[r.kind], formatBytes(r.used)])
  const fullest = summary.fullest.map((r, i) => [
    String(i + 1),
    r.name,
    KIND_LABEL[r.kind],
    formatPercent(r.ratio),
    `${formatBytes(r.used)} / ${formatBytes(r.quota)}`
  ])
  const all = [...rows]
    .sort((a, b) => b.used - a.used)
    .map((r) => [
      KIND_LABEL[r.kind],
      r.name + (r.disabled ? ' (disabled)' : ''),
      r.owner,
      formatBytes(r.used),
      r.quota ? formatBytes(r.quota) : 'unlimited',
      formatPercent(r.ratio),
      shortDate(r.lastModified)
    ])

  return { notes, overview, keyFigures, largest, fullest, all }
}

// ---- Markdown -----------------------------------------------------------------------------

const mdCell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

function mdTable(header: string[], rows: string[][], rightAlign: number[] = []) {
  const align = header.map((_, i) => (rightAlign.includes(i) ? '---:' : '---'))
  return [
    `| ${header.map(mdCell).join(' | ')} |`,
    `| ${align.join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`)
  ].join('\n')
}

export function buildMarkdown(data: ReportData): string {
  const { meta } = data
  const s = sections(data)
  const [ovHeader, ...ovRows] = s.overview
  const out: string[] = [
    `# Space report – ${meta.server}`,
    '',
    `Generated ${dateTime(meta.generatedAt)} by ${meta.generatedBy || 'unknown'}`,
    '',
    ...s.notes.map((n) => `> ${n}`),
    '',
    '## Overview',
    '',
    mdTable(ovHeader, ovRows, [1, 2, 3]),
    '',
    mdTable(['Key figure', 'Value'], s.keyFigures, [1]),
    '',
    `## Largest spaces`,
    '',
    s.largest.length ? mdTable(['#', 'Space', 'Type', 'Used'], s.largest, [0, 3]) : '_No data_',
    '',
    `## Fullest spaces (by quota)`,
    '',
    s.fullest.length
      ? mdTable(['#', 'Space', 'Type', 'Full', 'Used / Quota'], s.fullest, [0, 3, 4])
      : '_No spaces with a quota_',
    '',
    `## All spaces (${s.all.length})`,
    '',
    mdTable(['Type', 'Name', 'Owner', 'Used', 'Quota', 'Full', 'Last modified'], s.all, [3, 4, 5, 6]),
    ''
  ]
  return out.join('\n')
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
