/** Preserve the account session while moving to an explicitly selected service. */
export async function requestServiceHandoff(
  api: { post(path: string, body: unknown): Promise<{ data: { data?: { targetUrl?: string } } }> },
  target: { serviceKey?: string; workspace?: string; origin: string; returnPath: string },
): Promise<string> {
  const response = await api.post('/auth/handoff', {
    ...(target.serviceKey ? { targetServiceKey: target.serviceKey } : { targetWorkspace: target.workspace }),
    returnPath: target.returnPath,
  });
  const href = response.data.data?.targetUrl;
  if (!href) throw new Error('Missing service handoff');
  const url = new URL(href);
  if (url.protocol !== 'https:' || url.origin !== target.origin || url.pathname !== '/handoff') {
    throw new Error('Invalid service handoff');
  }
  return href;
}
