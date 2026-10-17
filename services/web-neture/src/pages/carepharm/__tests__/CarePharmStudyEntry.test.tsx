import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ account: 'a', authenticated: true, post: vi.fn() }));
vi.mock('../../../contexts', () => ({ useAuth: () => ({ user: { id: state.account }, isAuthenticated: state.authenticated }) }));
vi.mock('../../../lib/apiClient', () => ({ api: { post: state.post } }));
import StudyEntry from '../CarePharmStudyEntry';
const assign = vi.fn();
beforeEach(() => { assign.mockReset(); vi.stubGlobal('location', { ...window.location, assign }); state.account = 'a'; state.authenticated = true; state.post.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('sends a guest through the existing Study login-and-resume entry without issuing a handoff', () => {
  state.authenticated = false; render(<StudyEntry />); fireEvent.click(screen.getByRole('button'));
  expect(assign).toHaveBeenCalledWith('https://neture.co.kr/service-entry/lecture?returnPath=%2F'); expect(state.post).not.toHaveBeenCalled();
});
it('uses the real handoff helper and existing Study identity, rejects a wrong host, and permits retry', async () => {
  state.post.mockResolvedValue({ data: { data: { targetUrl: 'https://evil.test/handoff' } } }); render(<StudyEntry />);
  fireEvent.click(screen.getByRole('button')); await screen.findByRole('alert');
  expect(state.post).toHaveBeenCalledWith('/auth/handoff', { targetServiceKey: 'lecture', returnPath: '/' });
  fireEvent.click(screen.getByRole('button')); await waitFor(() => expect(state.post).toHaveBeenCalledTimes(2));
});
it('locks duplicate requests and discards a previous account response', async () => {
  let finish!: (value: unknown) => void; state.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const ui = render(<StudyEntry />); const button = screen.getByRole('button');
  fireEvent.click(button); fireEvent.click(button); expect(state.post).toHaveBeenCalledTimes(1);
  state.account = 'b'; ui.rerender(<StudyEntry />);
  await act(async () => finish({ data: { data: { targetUrl: 'https://study.neture.co.kr/handoff?token=fixture' } } }));
  expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false);
});
