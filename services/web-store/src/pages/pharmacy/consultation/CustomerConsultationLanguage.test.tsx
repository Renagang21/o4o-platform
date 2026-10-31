import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const audio = vi.hoisted(() => ({ reset: vi.fn(), stopReading: vi.fn() }));
vi.mock('../../../api/client', () => ({ coreApiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../useConsultationAudio', () => ({ useConsultationAudio: (_scope: string, transcript: (text: string) => void, options: any) => ({
  ...audio, inputSupported: true, outputSupported: false, listening: false, speaking: false, message: '',
  startListening: (language: string) => { void options.recognize('synthetic-audio', language).then((result: { text: string; language: string }) => { options.onLanguage(result.language); transcript(result.text); }); },
}) }));
import Page from './CustomerConsultationPage';
const id = '11111111-1111-4111-8111-111111111111', token = 'a'.repeat(64), requests = vi.fn();
let epoch = 'customer-a';
beforeEach(() => {
  vi.clearAllMocks(); epoch = 'customer-a'; localStorage.clear();
  localStorage.setItem('o4o:consultation-customer-device:v1', JSON.stringify({ id, token, name: 'Fixture counter' }));
  vi.stubGlobal('fetch', requests);
  requests.mockImplementation(async (url, options) => {
    const data = String(url).endsWith('/read') ? { id, name: 'Fixture counter', epoch, version: 1, state: 'active', language: 'ko', shared: null,
      languages: [{ key: 'ko', label: '한국어' }, { key: 'ja', label: '日本語' }],
      runtime: { recognition: 'google-cloud', synthesis: 'browser', translation: 'policy', detectLanguage: true, speechLanguages: ['ko', 'en', 'zh'] } }
      : { text: '합성 음성 문장', language: JSON.parse(options.body).language === 'auto' ? 'ko' : 'ja' };
    return { ok: true, json: async () => ({ success: true, data }) };
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
it('honors manual Japanese outside automatic candidates, allows automatic retry and resets the choice for the next customer', async () => {
  render(<Page />);
  const language = await screen.findByRole('combobox', { name: '언어' });
  const automatic = screen.getByRole('checkbox', { name: '음성 언어 자동 감지' });
  expect((automatic as HTMLInputElement).checked).toBe(true);
  fireEvent.change(language, { target: { value: 'ja' } });
  expect((automatic as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '눌러서 말하기' }));
  await waitFor(() => expect(requests.mock.calls.filter(([url]) => String(url).endsWith('/speech/recognize'))).toHaveLength(1));
  const first = requests.mock.calls.find(([url]) => String(url).endsWith('/speech/recognize'))![1];
  expect(JSON.parse(first.body)).toMatchObject({ language: 'ja', epoch: 'customer-a' });
  expect(first.credentials).toBe('omit'); expect(first.headers).toEqual({ 'Content-Type': 'application/json' });
  await screen.findByDisplayValue('합성 음성 문장');
  fireEvent.click(automatic);
  fireEvent.click(screen.getByRole('button', { name: '눌러서 말하기' }));
  await waitFor(() => expect(requests.mock.calls.filter(([url]) => String(url).endsWith('/speech/recognize'))).toHaveLength(2));
  expect(JSON.parse(requests.mock.calls.filter(([url]) => String(url).endsWith('/speech/recognize'))[1][1].body).language).toBe('auto');
  await act(async () => { epoch = 'customer-b'; fireEvent(window, new Event('pageshow')); });
  await waitFor(() => expect((screen.getByRole('textbox', { name: '전달할 내용' }) as HTMLTextAreaElement).value).toBe(''));
  expect((screen.getByRole('checkbox', { name: '음성 언어 자동 감지' }) as HTMLInputElement).checked).toBe(true);
});
