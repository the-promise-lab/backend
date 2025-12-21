type RewriteDatabaseUrlParams = {
  readonly originalDatabaseUrl: string;
  readonly localHost: string;
  readonly localPort: number;
};

type RewriteDatabaseUrlResult = {
  readonly rewrittenDatabaseUrl: string;
  readonly remoteHost: string;
  readonly remotePort: number;
};

/**
 * Rewrites a MySQL `DATABASE_URL` to point to a local SSH tunnel endpoint.
 * It also returns the original remote host/port for building the SSH tunnel.
 */
export function rewriteDatabaseUrlForLocalTunnel(
  params: RewriteDatabaseUrlParams,
): RewriteDatabaseUrlResult {
  const url: URL = new URL(params.originalDatabaseUrl);
  const remoteHost: string = url.hostname;
  const remotePort: number = url.port ? Number(url.port) : 3306;
  url.hostname = params.localHost;
  url.port = String(params.localPort);
  return {
    rewrittenDatabaseUrl: url.toString(),
    remoteHost,
    remotePort,
  };
}
