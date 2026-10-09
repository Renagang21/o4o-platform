import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HandoffPage from '../HandoffPage';

const replace = vi.fn();
const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')!;
beforeEach(() => {
  localStorage.clear();
  replace.mockClear();
  Object.defineProperty(window, 'location', { configurable: true, value: {
    origin: 'https://pharmacy.test', search: '?token=synthetic&returnTo=%2F%09%2Foutside.example%2F', replace,
  } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', locationDescriptor);
});
it('reloads the local home for a browser-normalized external destination', async () => {
  const exchange = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { tokens: { accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' } } }) });
  vi.stubGlobal('fetch', exchange);
  render(<HandoffPage />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith('https://pharmacy.test/'));
  expect(exchange.mock.calls[0][1].credentials).toBeUndefined();
});
it('preserves the server approval denial and application link', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: false, error: '가입 승인 대기', serviceAccess: { next: 'pharmacy_pending' } }) }));
  render(<HandoffPage />);
  await screen.findByText('가입 승인 대기');
  expect(screen.getByRole('link', { name: '약국 가입 상태 확인' }).getAttribute('href')).toBe('https://store.neture.co.kr/start-pharmacy');
  expect(replace).not.toHaveBeenCalled();
});
