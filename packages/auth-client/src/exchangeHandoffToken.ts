/** Public single-use token exchange: no credentials or auth/refresh interceptors. */
export function exchangeHandoffToken(apiBaseUrl: string, token: string): Promise<Response> {
  return fetch(`${apiBaseUrl}/api/v1/auth/handoff/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}
