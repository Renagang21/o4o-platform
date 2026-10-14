import { getAccessToken } from '../contexts/AuthContext';
import { captureStoreOrganizationHeaders } from '../lib/storeOrganizationHeader';
import { tryRefreshToken } from './token-refresh';

/** Keep the original store and request body across authentication retries. */
export async function storeScopedFetch(url: string, options: RequestInit = {}, contentType?: string, policy: { retainOriginalOnRetryFailure?: boolean; injectAccessToken?: boolean } = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (contentType && !headers.has('Content-Type')) headers.set('Content-Type', contentType);
  if (policy.injectAccessToken !== false && !headers.has('Authorization')) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const scopedHeaders = captureStoreOrganizationHeaders(headers);
  const requestOptions = { ...options, headers: scopedHeaders };
  const response = await fetch(url, requestOptions);
  if (response.status !== 401) return response;
  const refreshed = await tryRefreshToken();
  if (!refreshed) return response;
  scopedHeaders.set('Authorization', `Bearer ${refreshed}`);
  const retried = await fetch(url, requestOptions);
  return policy.retainOriginalOnRetryFailure && !retried.ok ? response : retried;
}
