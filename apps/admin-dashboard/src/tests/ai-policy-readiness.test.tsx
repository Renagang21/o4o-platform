import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiQuerySettings from '../pages/settings/AiQuerySettings';
import { unifiedApi } from '../api/unified-client';
import toast from 'react-hot-toast';

vi.mock('../api/unified-client', () => ({ unifiedApi: { raw: { get: vi.fn(), put: vi.fn() } } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const get = vi.mocked(unifiedApi.raw.get);
const put = vi.mocked(unifiedApi.raw.put);
const policy = { freeDailyLimit: 17, paidDailyLimit: 130, aiEnabled: false,
  defaultModel: 'fixture-model', systemPrompt: 'Saved prompt', updatedAt: '2026-10-10T00:00:00Z' };
const models = { models: [{ id: 'fixture-model', displayName: 'Fixture Model' }], source: 'static',
  fetchedAt: null, canonical: 'fixture-model', current: 'fixture-model' };
const reply = (data: unknown) => ({ data: { success: true, data } });
const submit = () => fireEvent.submit(document.querySelector('form')!);

beforeEach(() => {
  vi.resetAllMocks();
  get.mockImplementation(async (url) => reply(url === '/ai/policy' ? policy : models));
});

describe('AI policy readiness', () => {
  it.each([{ success: false, data: policy }, { success: true },
    { success: true, data: { ...policy, aiEnabled: 'true' } }])(
    'blocks editing and writes after an invalid policy read: %j', async (body) => {
      get.mockImplementation(async (url) => url === '/ai/policy' ? { data: body } : reply(models));
      render(<AiQuerySettings />);
      await screen.findByText(/저장된 AI 정책을 불러오지 못했습니다/);
      expect(screen.getByRole('button', { name: '설정 저장' })).toBeDisabled();
      submit();
      expect(put).not.toHaveBeenCalled();
    },
  );

  it('recovers a failed read using saved values instead of defaults', async () => {
    let fail = true;
    get.mockImplementation(async (url) => {
      if (url === '/ai/policy' && fail) throw new Error('offline');
      return reply(url === '/ai/policy' ? policy : models);
    });
    render(<AiQuerySettings />);
    await screen.findByRole('button', { name: '다시 불러오기' });
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByDisplayValue('Saved prompt');
    expect(screen.getByRole('button', { name: '설정 저장' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '비활성화됨' })).toBeInTheDocument();
  });

  it('rejects unsuccessful saves and retains the edited prompt', async () => {
    put.mockResolvedValue({ data: { success: false } });
    render(<AiQuerySettings />);
    fireEvent.change(await screen.findByDisplayValue('Saved prompt'), { target: { value: 'Edited prompt' } });
    submit();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('AI 정책 저장에 실패했습니다.'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Edited prompt')).toBeInTheDocument();
  });

  it('blocks duplicate submissions and refresh during a save, then adopts the server response', async () => {
    let resolveSave!: (value: ReturnType<typeof reply>) => void;
    put.mockImplementation(() => new Promise(resolve => { resolveSave = resolve; }));
    render(<AiQuerySettings />);
    await screen.findByDisplayValue('Saved prompt');
    submit();
    submit();
    expect(put).toHaveBeenCalledTimes(1);
    for (const refresh of screen.getAllByRole('button', { name: '새로고침', exact: true })) {
      expect(refresh).toBeDisabled();
    }
    expect(screen.getByDisplayValue('Saved prompt')).toBeDisabled();
    resolveSave(reply({ ...policy, systemPrompt: 'Canonical prompt' }));
    await screen.findByDisplayValue('Canonical prompt');
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it('ignores an older policy response after a newer read and edits', async () => {
    let resolveOld!: (value: ReturnType<typeof reply>) => void;
    let reads = 0;
    get.mockImplementation((url) => {
      if (url !== '/ai/policy') return Promise.resolve(reply(models));
      reads++;
      if (reads === 1) return new Promise(resolve => { resolveOld = resolve; });
      return Promise.resolve(reply(policy));
    });
    render(<StrictMode><AiQuerySettings /></StrictMode>);
    fireEvent.change(await screen.findByDisplayValue('Saved prompt'), { target: { value: 'Edited prompt' } });
    await act(async () => resolveOld(reply({ ...policy, systemPrompt: 'Old prompt' })));
    await waitFor(() => expect(reads).toBe(2));
    expect(screen.getByDisplayValue('Edited prompt')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Old prompt')).not.toBeInTheDocument();
  });

  it('shows model failures with retry while preserving the loaded policy', async () => {
    let fail = true;
    get.mockImplementation(async (url) => {
      if (url !== '/ai/policy' && fail) throw new Error('offline');
      return reply(url === '/ai/policy' ? policy : models);
    });
    render(<AiQuerySettings />);
    await screen.findByDisplayValue('Saved prompt');
    const retry = await screen.findByRole('button', { name: '모델 목록 다시 조회' });
    fail = false;
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByText(/모델 목록을 불러오지 못했습니다/)).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('Saved prompt')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/ai/models?refresh=1');
  });
});
