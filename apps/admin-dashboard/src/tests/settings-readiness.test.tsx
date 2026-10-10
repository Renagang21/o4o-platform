import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailSettings from '../pages/settings/EmailSettings';
import AppServices from '../pages/settings/AppServices';
import { settingsService } from '../api/settings';
import { unifiedApi } from '../api/unified-client';
import toast from 'react-hot-toast';

vi.mock('../api/unified-client', () => ({ unifiedApi: { raw: { get: vi.fn(), put: vi.fn() } } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const get = vi.mocked(unifiedApi.raw.get);
const put = vi.mocked(unifiedApi.raw.put);
const email = { provider: 'smtp', smtpHost: 'smtp.example.invalid', smtpPort: 587,
  smtpUser: 'synthetic-user', smtpSecure: false, fromEmail: 'sender@example.invalid', fromName: 'Fixture' };
const reply = (data: unknown) => ({ data: { success: true, data } });
const renderAi = () => render(<MemoryRouter><AppServices /></MemoryRouter>);

beforeEach(() => vi.resetAllMocks());

describe('settings response contract', () => {
  it('unwraps general and email settings and sends only settings in updates', async () => {
    const general = { siteName: 'Fixture site' };
    get.mockResolvedValueOnce(reply(general)).mockResolvedValueOnce(reply(email));
    put.mockResolvedValueOnce(reply(general)).mockResolvedValueOnce(reply(email));
    expect(await settingsService.getGeneralSettings()).toEqual(general);
    expect(await settingsService.getEmailSettings()).toEqual(email);
    expect(await settingsService.updateGeneralSettings(general)).toEqual(general);
    expect(await settingsService.updateEmailSettings(email)).toEqual(email);
    expect(put).toHaveBeenLastCalledWith('/v1/settings/email', email);
  });

  it.each([{ success: false, data: email }, { success: true }, { success: true, data: [] }])(
    'rejects invalid settings responses: %j', async (body) => {
      get.mockResolvedValue({ data: body });
      put.mockResolvedValue({ data: body });
      await expect(settingsService.getEmailSettings()).rejects.toThrow('설정 응답');
      await expect(settingsService.updateEmailSettings(email)).rejects.toThrow('설정 응답');
    },
  );
});

describe('email settings workflow', () => {
  it('shows saved values, saves the edited body, and adopts the server result', async () => {
    get.mockResolvedValue(reply(email));
    const saved = { ...email, smtpHost: 'canonical.example.invalid' };
    put.mockResolvedValue(reply(saved));
    render(<EmailSettings />);
    const host = await screen.findByDisplayValue(email.smtpHost);
    fireEvent.change(host, { target: { value: 'edited.example.invalid' } });
    // Exercise the submit handler directly; no secret fixture is needed.
    fireEvent.submit(host.closest('form')!);
    await screen.findByDisplayValue(saved.smtpHost);
    expect(put).toHaveBeenCalledWith('/v1/settings/email', { ...email, smtpHost: 'edited.example.invalid' });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('DB에 저장'));
    expect(screen.getByText(/자동 적용되지 않습니다/)).toBeInTheDocument();
  });

  it('blocks edits and saving until the initial read completes', () => {
    get.mockImplementation(() => new Promise(() => {}));
    render(<EmailSettings />);
    expect(screen.getByLabelText(/SMTP 호스트/)).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: '설정 저장' }).closest('form')!);
    expect(put).not.toHaveBeenCalled();
  });

  it('blocks saving after a read failure and recovers only after retry', async () => {
    get.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(reply(email));
    render(<EmailSettings />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: '설정 저장' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: '설정 저장' }).closest('form')!);
    expect(put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByDisplayValue(email.smtpHost);
    expect(screen.getByRole('button', { name: '설정 저장' })).toBeEnabled();
  });

  it('reports a rejected save without announcing success', async () => {
    get.mockResolvedValue(reply(email));
    put.mockResolvedValue({ data: { success: false } });
    render(<EmailSettings />);
    const host = await screen.findByDisplayValue(email.smtpHost);
    fireEvent.submit(host.closest('form')!);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('SMTP 설정 저장에 실패했습니다.'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('AI services overview', () => {
  const models = { current: 'fixture-model', models: [{ id: 'fixture-model', displayName: 'Fixture Model', inputTokenLimit: 4096 }] };
  it('shows server model information and links to the existing policy editor', async () => {
    get.mockResolvedValue(reply(models));
    renderAi();
    await screen.findByText('Fixture Model');
    expect(screen.getByRole('link', { name: 'AI Query 설정으로 이동' })).toHaveAttribute('href', '/settings/ai-query');
    expect(screen.getByText(/사용 통계가 연결되어 있지 않습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '설정 저장' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/API Key/)).not.toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('shows a retryable error instead of indefinite loading or sample data', async () => {
    get.mockResolvedValueOnce({ data: { success: true, data: {} } }).mockResolvedValueOnce(reply(models));
    renderAi();
    await screen.findByRole('alert');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByText('Fixture Model');
    expect(get).toHaveBeenCalledTimes(2);
  });
});
