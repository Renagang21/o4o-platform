import { authClient } from '@o4o/auth-client';

type AnyObj = Record<string, any>;

function unwrap<T = unknown>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as AnyObj).data as T;
  }
  return payload as T;
}

export async function apiGet<T = unknown>(url: string, config?: AnyObj): Promise<T> {
  const res = await authClient.api.get(url, config);
  return unwrap<T>(res.data);
}

export async function apiPost<T = unknown>(url: string, body?: any, config?: AnyObj): Promise<T> {
  const res = await authClient.api.post(url, body, config);
  return unwrap<T>(res.data);
}

export async function apiPut<T = unknown>(url: string, body?: any, config?: AnyObj): Promise<T> {
  const res = await authClient.api.put(url, body, config);
  return unwrap<T>(res.data);
}

export async function apiDelete<T = unknown>(url: string, config?: AnyObj): Promise<T> {
  const res = await authClient.api.delete(url, config);
  return unwrap<T>(res.data);
}

