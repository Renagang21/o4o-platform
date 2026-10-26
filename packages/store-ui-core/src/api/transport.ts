/** Callers supply credential providers and tenant scope; the shared JSON transport refreshes once. */
export type JsonRequest = <T>(url: string, options?: RequestInit) => Promise<T>;
export interface JsonApiClient {
  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  patch<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

export function createAuthenticatedJsonRequest({
  getAccessToken,
  tryRefreshToken,
}: {
  getAccessToken: () => string | null;
  tryRefreshToken: () => Promise<string | null>;
}): JsonRequest {
  return async function request<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const newToken = await tryRefreshToken();
      if (newToken) {
        response = await fetch(url, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${newToken}` },
        });
      }
    }

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ message: "Network error" }));
      const error: any = new Error(
        body.error || body.message || `HTTP ${response.status}`,
      );
      error.status = response.status;
      error.code = body.code;
      throw error;
    }

    return response.json();
  };
}
