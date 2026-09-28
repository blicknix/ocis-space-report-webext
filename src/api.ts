import { GraphDrive } from './report'

export type VaultStatus = 'ok' | 'disabled' | 'mfa-required' | 'error'

export class GraphError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly mfaRequired = false
  ) {
    super(message)
    this.name = 'GraphError'
  }
}

/**
 * Lists all spaces of one type via /graph/v1beta1/drives (the "all drives" endpoint Admin Settings
 * uses). Vault spaces live behind the /vault prefix and need an MFA-level token.
 */
export async function fetchDrives({
  serverUrl,
  accessToken,
  driveType,
  vault = false,
  signal
}: {
  serverUrl: string
  accessToken: string
  driveType: 'personal' | 'project'
  vault?: boolean
  signal?: AbortSignal
}): Promise<GraphDrive[]> {
  const base = serverUrl.replace(/\/+$/, '') + (vault ? '/vault' : '')
  const query = new URLSearchParams({ $filter: `driveType eq ${driveType}`, $orderby: 'name asc' })
  const res = await fetch(`${base}/graph/v1beta1/drives?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    credentials: 'omit',
    signal
  })
  if (!res.ok) {
    const mfa = res.headers.has('x-ocis-mfa-required')
    throw new GraphError(res.status, `Listing ${vault ? 'vault ' : ''}${driveType} spaces failed: HTTP ${res.status}`, mfa)
  }
  const body = await res.json().catch(() => null)
  // oCIS answers `null` when there are no spaces at all
  return Array.isArray(body?.value) ? body.value : []
}
