import { storeScopedFetch } from './storeScopedFetch';

type ErrorFactory = (body: any, status: number) => Error;

function defaultStoreError(body: any, status: number): Error {
  return Object.assign(new Error(body.error || body.message || `HTTP ${status}`), { status, code: body.code });
}

/** Parse JSON while letting each API preserve its existing error contract. */
export async function readStoreJson<T>(response: Response, makeError: ErrorFactory = defaultStoreError): Promise<T> {
  if (response.ok) return response.json();
  const body = await response.json().catch(() => ({ message: 'Network error' }));
  throw makeError(body, response.status);
}

export async function storeJsonFetch<T>(url: string, options: RequestInit = {}, makeError?: ErrorFactory): Promise<T> {
  const response = await storeScopedFetch(url, options, 'application/json');
  return readStoreJson<T>(response, makeError);
}
