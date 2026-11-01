import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { pcmWav, useConsultationAudio } from './useConsultationAudio';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('encodes bounded mono 16k PCM without clipping or browser-specific compressed formats', () => {
  const data = new DataView(pcmWav(new Float32Array([-2, -0.5, 0, 0.5, 2])));
  expect(data.getUint32(24, true)).toBe(16000);
  expect(data.getUint16(22, true)).toBe(1);
  expect(data.getUint32(40, true)).toBe(10);
  expect(data.getInt16(44, true)).toBe(-32768);
  expect(data.getInt16(52, true)).toBe(32767);
});
it('releases a late microphone grant after the consultation scope changed without dispatching recognition', async () => {
  let grant!: (stream: MediaStream) => void;
  const stop = vi.fn(), recognize = vi.fn(), onTranscript = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(() => new Promise(resolve => { grant = resolve; })) } });
  const hook = renderHook(({ scope }) => useConsultationAudio(scope, onTranscript, { recognition: 'google-cloud', recognize }), { initialProps: { scope: 'customer-a' } });
  act(() => hook.result.current.startListening('en'));
  hook.rerender({ scope: 'customer-b' });
  await act(async () => grant({ getTracks: () => [{ stop }] } as unknown as MediaStream));
  expect(stop).toHaveBeenCalledOnce(); expect(recognize).not.toHaveBeenCalled(); expect(onTranscript).not.toHaveBeenCalled();
  expect(hook.result.current.listening).toBe(false);
});
it('discards a native speech response after reset without playing it or falling back to browser speech', async () => {
  let finish!: (audio: { audioBase64: string; mimeType: string }) => void;
  const Audio = vi.fn(), browserSpeak = vi.fn();
  vi.stubGlobal('Audio', Audio); vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), getVoices: () => [], speak: browserSpeak });
  const synthesize = vi.fn(() => new Promise<{ audioBase64: string; mimeType: string }>(resolve => { finish = resolve; }));
  const hook = renderHook(() => useConsultationAudio('customer-a', vi.fn(), { synthesis: 'google-cloud', synthesize }));
  act(() => hook.result.current.read('합성 문장', 'ko'));
  act(() => hook.result.current.reset());
  await act(async () => finish({ audioBase64: 'U1lOVEhFVElD', mimeType: 'audio/mpeg' }));
  expect(Audio).not.toHaveBeenCalled(); expect(browserSpeak).not.toHaveBeenCalled();
  expect(hook.result.current.speaking).toBe(false);
});
