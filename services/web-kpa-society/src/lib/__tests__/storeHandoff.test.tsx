import { StrictMode } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import HandoffPage from '../../../../web-store/src/pages/HandoffPage';

vi.mock('@o4o/auth-client', async (importOriginal) => ({
  ...await importOriginal<typeof import('@o4o/auth-client')>(),
  clearStoredTokens: vi.fn(),
  storeTokens: vi.fn(),
}));
vi.mock('../../../../web-store/src/lib/apiClient', () => ({ API_BASE_URL: 'https://api.neture.co.kr' }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

it('StrictMode effect replay exchanges the single-use Store token once', async () => {
  window.history.replaceState({}, '', '/handoff?token=synthetic');
  const exchange = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: 'HANDOFF_TOKEN_INVALID' }) });
  vi.stubGlobal('fetch', exchange);
  render(<StrictMode><HandoffPage /></StrictMode>);
  await waitFor(() => expect(exchange).toHaveBeenCalledTimes(1));
  expect(JSON.parse(exchange.mock.calls[0][1].body)).toEqual({ token: 'synthetic' });
});
