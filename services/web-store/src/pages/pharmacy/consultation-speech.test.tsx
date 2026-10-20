import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ org: 'store', user: 'owner', get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/client', () => ({ coreApiClient: state }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: state.org }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.user } }) }));
import Page from './StoreMultilingualConsultationPage';
import { consultationSpeechLocale, useConsultationSpeech } from './useConsultationSpeech';

class Recognition {
  static instances: Recognition[] = [];
  lang = ''; continuous = true; interimResults = true;
  onresult: ((event: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(); stop = vi.fn(); abort = vi.fn();
  constructor() { Recognition.instances.push(this); }
  result(text: string) { this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] }); }
}
class Utterance {
  lang = ''; voice: unknown; onend: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
const synthesis = { getVoices: vi.fn(), speak: vi.fn(), cancel: vi.fn() };
const latest = () => Recognition.instances[Recognition.instances.length - 1]!;
beforeEach(() => {
  vi.clearAllMocks(); state.org = 'store'; state.user = 'owner'; Recognition.instances = [];
  vi.stubGlobal('SpeechRecognition', Recognition); vi.stubGlobal('webkitSpeechRecognition', undefined);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance); vi.stubGlobal('speechSynthesis', synthesis);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  synthesis.getVoices.mockReturnValue(['ko-KR', 'en-US', 'ja-JP'].map(lang => ({ lang })));
  state.get.mockImplementation(async () => ({ success: true, data: { organizationId: state.org,
    languages: [{ key: 'en', label: 'English' }, { key: 'ja', label: 'Japanese' }], phrases: [{ key: 'welcome', text: '안녕하세요.' }],
    modes: [{ key: 'counter-pharmacist', label: '매대 약사 상담', entitled: true, allowed: true, professional: true },
      { key: 'floor-staff', label: '매장 직원 응대', entitled: true, allowed: true, professional: false }] } }));
  state.post.mockImplementation(async (_path, body) => ({ success: true, data: { organizationId: state.org, ...body, source: body.text ?? '안녕하세요.', translation: 'Translated words' } }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('starts only on a click, places final voice text in the editor, and waits for explicit translation', async () => {
  render(<Page />); await screen.findByRole('textbox');
  expect(Recognition.instances).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: '마이크 켜기' }));
  expect(latest().lang).toBe('ko-KR'); expect(latest().continuous).toBe(false); expect(latest().interimResults).toBe(false);
  act(() => latest().result('한국어 상담 문장'));
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('한국어 상담 문장');
  expect(state.post).not.toHaveBeenCalled();
  expect((screen.getByRole('button', { name: '번역하기' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '음성 입력 마치기' })); expect(latest().stop).toHaveBeenCalled();
  act(() => latest().onend?.());
  fireEvent.click(screen.getByRole('button', { name: '번역하기' })); await screen.findAllByText('Translated words');
  expect(state.post.mock.calls[0][1].text).toBe('한국어 상담 문장');
});
it('keeps nonprofessional outgoing phrases fixed and records the customer in the selected language', async () => {
  render(<Page />); await screen.findByRole('textbox');
  fireEvent.change(screen.getByLabelText('상담 방식'), { target: { value: 'floor-staff' } });
  expect(screen.queryByRole('button', { name: '마이크 켜기' })).toBeNull(); expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  fireEvent.change(screen.getByLabelText('고객 언어'), { target: { value: 'ja' } });
  fireEvent.click(screen.getByRole('button', { name: '마이크 켜기' })); expect(latest().lang).toBe('ja-JP');
  act(() => { latest().result('顧客の質問'); latest().onend?.(); });
  fireEvent.click(screen.getByRole('button', { name: '번역하기' })); await screen.findAllByText('Translated words');
  fireEvent.click(screen.getByRole('button', { name: '번역문 읽어주기' }));
  expect(synthesis.speak.mock.calls[0][0].lang).toBe('ko-KR');
});
it.each(['not-allowed', 'no-speech', 'network', 'audio-capture', 'language-not-supported'])('keeps typed input usable after recognition error %s', async error => {
  render(<Page />); const editor = await screen.findByRole('textbox');
  fireEvent.change(editor, { target: { value: 'Typed words' } });
  fireEvent.click(screen.getByRole('button', { name: '마이크 켜기' }));
  act(() => latest().onerror?.({ error }));
  expect(screen.getByRole('status').textContent).toMatch(/문자/);
  expect((editor as HTMLTextAreaElement).value).toBe('Typed words');
  fireEvent.click(screen.getByRole('button', { name: '번역하기' })); await screen.findAllByText('Translated words');
});
it('bounds voice text and drops callbacks after language, account, store, pagehide and unmount', async () => {
  const view = render(<Page />); await screen.findByRole('textbox');
  fireEvent.click(screen.getByRole('button', { name: '마이크 켜기' })); act(() => latest().result('a'.repeat(1100)));
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toHaveLength(1000);
  expect(screen.getByRole('alert').textContent).toContain('1,000자');
  for (const change of ['language', 'account', 'store', 'pagehide']) {
    if (screen.queryByRole('button', { name: '음성 입력 마치기' })) act(() => latest().onend?.());
    fireEvent.click(screen.getByRole('button', { name: '마이크 켜기' })); const previous = latest();
    if (change === 'language') fireEvent.change(screen.getByLabelText('고객 언어'), { target: { value: 'ja' } });
    else if (change === 'pagehide') fireEvent(window, new Event('pagehide'));
    else { if (change === 'account') state.user = 'other'; else state.org = 'other-store'; view.rerender(<Page />); await screen.findByRole('textbox'); }
    expect(previous.abort).toHaveBeenCalled(); act(() => previous.result('STALE'));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  }
  fireEvent.click(screen.getByRole('button', { name: '마이크 켜기' })); const previous = latest(); view.unmount();
  expect(previous.abort).toHaveBeenCalled(); act(() => previous.result('STALE'));
});
it('reads only on demand, selects current voices, cancels playback and ignores late playback errors', async () => {
  render(<Page />); fireEvent.change(await screen.findByRole('textbox'), { target: { value: '검토한 문장' } });
  fireEvent.click(screen.getByRole('button', { name: '번역하기' })); await screen.findAllByText('Translated words');
  expect(synthesis.speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '번역문 읽어주기' }));
  const first = synthesis.speak.mock.calls[0][0]; expect(first.lang).toBe('en-US'); expect(first.voice.lang).toBe('en-US');
  fireEvent.click(screen.getByRole('button', { name: '읽어주기 중지' })); expect(synthesis.cancel).toHaveBeenCalled();
  act(() => first.onerror?.()); expect(screen.queryByRole('status')).toBeNull();
  synthesis.getVoices.mockReturnValue([{ lang: 'ko-KR' }]);
  fireEvent.click(screen.getByRole('button', { name: '번역문 읽어주기' }));
  expect(screen.getByRole('status').textContent).toContain('선택 언어의 음성'); expect(synthesis.speak).toHaveBeenCalledTimes(1);
  synthesis.getVoices.mockReturnValue([{ lang: 'en-GB' }]);
  fireEvent.click(screen.getByRole('button', { name: '번역문 읽어주기' })); expect(synthesis.speak.mock.calls[1][0].voice.lang).toBe('en-GB');
  fireEvent.click(screen.getByRole('button', { name: '새 상담 · 내용 지우기' })); expect(synthesis.cancel).toHaveBeenCalledTimes(2);
});
it('handles unsupported and prefixed APIs, background cancellation, start failures and playback errors', () => {
  vi.stubGlobal('SpeechRecognition', undefined); vi.stubGlobal('SpeechSynthesisUtterance', undefined); vi.stubGlobal('speechSynthesis', undefined);
  const text = vi.fn(); const view = renderHook(() => useConsultationSpeech('scope', text));
  expect(view.result.current.inputSupported).toBe(false); expect(view.result.current.outputSupported).toBe(false);
  act(() => view.result.current.startListening('ko')); expect(view.result.current.message).toContain('지원하지');
  view.unmount(); vi.stubGlobal('webkitSpeechRecognition', Recognition); vi.stubGlobal('SpeechSynthesisUtterance', Utterance); vi.stubGlobal('speechSynthesis', synthesis);
  const supported = renderHook(() => useConsultationSpeech('scope', text));
  act(() => supported.result.current.startListening('en'));
  const previous = latest(); vi.spyOn(document, 'visibilityState', 'get').mockReturnValueOnce('hidden');
  fireEvent(document, new Event('visibilitychange')); expect(previous.abort).toHaveBeenCalled();
  act(() => previous.result('STALE')); expect(text).not.toHaveBeenCalled();
  synthesis.speak.mockImplementationOnce(() => { throw new Error('audio failed'); });
  act(() => supported.result.current.read('words', 'en')); expect(supported.result.current.message).toContain('시작하지');
  act(() => supported.result.current.read('words', 'en')); act(() => synthesis.speak.mock.calls[synthesis.speak.mock.calls.length - 1][0].onerror());
  expect(supported.result.current.message).toContain('완료하지');
  act(() => supported.result.current.read('words', 'en'));
  fireEvent(window, new Event('pagehide')); expect(synthesis.cancel).toHaveBeenCalled();
  supported.unmount();
  vi.stubGlobal('SpeechRecognition', class extends Recognition { start = vi.fn(() => { throw new Error('permission failure'); }); });
  const failed = renderHook(() => useConsultationSpeech('scope', text));
  act(() => failed.result.current.startListening('ko')); expect(failed.result.current.message).toContain('시작하지');
});
it.each(Object.entries(consultationSpeechLocale))('selects locale for %s without auto submitting', (language, locale) => {
  const text = vi.fn(); const view = renderHook(() => useConsultationSpeech('scope', text));
  act(() => view.result.current.startListening(language)); expect(latest().lang).toBe(locale); expect(text).not.toHaveBeenCalled();
});
