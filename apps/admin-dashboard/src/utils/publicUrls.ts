export interface PublicPostUrlParams {
  id?: string;
  slug?: string;
  isDraft?: boolean;
  previewToken?: string;
}

const DEFAULT_DEV_PUBLIC_PORT = '5173'; // Vite default for main-site

export function getPublicOrigin(): string {
  const envOrigin = import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined;
  if (envOrigin && typeof envOrigin === 'string' && envOrigin.trim()) {
    return envOrigin.replace(/\/$/, '');
  }

  // Heuristics for local/dev when env is not set
  try {
    const { protocol, hostname, port } = window.location;
    // localhost: switch admin (3001) -> web (5173)
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port) {
      return `${protocol}//${hostname}:${DEFAULT_DEV_PUBLIC_PORT}`;
    }
    // admin subdomain -> strip admin.
    if (hostname.startsWith('admin.')) {
      const publicHost = hostname.replace(/^admin\./, '');
      return `${protocol}//${publicHost}`;
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  } catch {
    return '';
  }
}

export function buildPublicPostUrl(params: PublicPostUrlParams): string {
  const origin = getPublicOrigin();
  const base = origin || '';
  const identifier = (params.slug && params.slug.trim()) || params.id || '';
  let path = `/posts/${identifier}`;

  // Draft preview handling (optional, falls back if no policy)
  if (params.isDraft) {
    // If preview endpoint is standardized on public site, prefer it
    path = params.id ? `/preview/posts/${params.id}` : path;
  }

  const url = new URL(path, base || window.location.origin);
  if (params.previewToken) {
    url.searchParams.set('previewToken', params.previewToken);
  }
  return url.toString();
}

