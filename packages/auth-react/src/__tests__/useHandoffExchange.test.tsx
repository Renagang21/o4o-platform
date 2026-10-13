import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useHandoffExchange } from '../useHandoffExchange';

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  clear: vi.fn(),
  store: vi.fn(),
}));
vi.mock('@o4o/auth-client', () => ({
  exchangeHandoffToken: mocks.exchange,
  clearStoredTokens: mocks.clear,
  storeTokens: mocks.store,
}));
function Probe({ apiBaseUrl = 'https://fixture.test' }) {
  const state = useHandoffExchange({ apiBaseUrl });
  return (
    <output>
      {state.status === 'error'
        ? `${state.code}:${state.message}`
        : state.status}
    </output>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/handoff?token=synthetic');
  mocks.exchange.mockResolvedValue({
    ok: false,
    json: async () => ({ code: 'HANDOFF_TOKEN_INVALID', error: 'Expired' }),
  });
});
afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

it('StrictMode exchanges a single-use token once and clears stale tokens before the request', async () => {
  render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  );
  await screen.findByText('HANDOFF_TOKEN_INVALID:Expired');
  expect(mocks.exchange).toHaveBeenCalledTimes(1);
  expect(mocks.clear).toHaveBeenCalledTimes(1);
  expect(mocks.clear.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.exchange.mock.invocationCallOrder[0],
  );
  expect(mocks.store).not.toHaveBeenCalled();
});
it('a receiver rerender cannot consume the token again', async () => {
  const view = render(<Probe />);
  await screen.findByText('HANDOFF_TOKEN_INVALID:Expired');
  view.rerender(<Probe apiBaseUrl="https://changed.test" />);
  expect(mocks.exchange).toHaveBeenCalledTimes(1);
});
it('unmount before the exchange response cannot store a session', async () => {
  let complete!: (value: unknown) => void;
  mocks.exchange.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const view = render(<Probe />);
  view.unmount();
  complete({
    ok: true,
    json: async () => ({
      success: true,
      data: { tokens: { accessToken: 'synthetic', refreshToken: 'synthetic' } },
    }),
  });
  await waitFor(() => expect(mocks.store).not.toHaveBeenCalled());
});
it('missing token makes no exchange request', async () => {
  window.history.replaceState({}, '', '/handoff');
  render(<Probe />);
  await screen.findByText(':이동 정보가 없습니다. 다시 시도해 주세요.');
  expect(mocks.exchange).not.toHaveBeenCalled();
});
