import { getAccessToken } from '../contexts/AuthContext';
import { captureStoreOrganizationHeaders } from '../lib/storeOrganizationHeader';
import { tryRefreshToken } from './token-refresh';

/** Keep the original store and request body when retrying product requests. */
export async function storeProductFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const scopedHeaders = captureStoreOrganizationHeaders(headers);
  const requestOptions = { ...options, headers: scopedHeaders };
  const response = await fetch(url, requestOptions);
  if (response.status !== 401) return response;
  const refreshed = await tryRefreshToken();
  if (!refreshed) return response;
  scopedHeaders.set('Authorization', `Bearer ${refreshed}`);
  return fetch(url, requestOptions);
}
