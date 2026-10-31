import { useEffect, useMemo, useRef, useState } from 'react';
import { useConsultationSpeech } from './useConsultationSpeech';

export interface ConsultationAudioOptions {
  recognition?: 'browser' | 'google-cloud'; synthesis?: 'browser' | 'google-cloud';
  recognize?: (audioBase64: string, language: string) => Promise<{ text: string; language: string }>;
  synthesize?: (text: string, language: string) => Promise<{ audioBase64: string; mimeType: string }>;
  onLanguage?: (language: string) => void;
  onAccessDenied?: () => void;
}
export function pcmWav(samples: Float32Array, sampleRate = 16000): ArrayBuffer {
  const data = new ArrayBuffer(44 + samples.length * 2), view = new DataView(data);
  const write = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.codePointAt(0)!));
  write(0, 'RIFF'); view.setUint32(4, data.byteLength - 8, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * (sample < 0 ? 32768 : 32767), true));
  return data;
}
function encoded(data: ArrayBuffer) {
  const bytes = new Uint8Array(data); let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCodePoint(...bytes.subarray(i, i + 8192));
  return btoa(text);
}

/** Recording buffers exist only in memory, are bounded, and are discarded on every scope change. */
export function useConsultationAudio(scope: string, onTranscript: (text: string) => void, options: ConsultationAudioOptions = {}) {
  const browser = useConsultationSpeech(scope, onTranscript);
  const callbacks = useRef({ options, onTranscript }); callbacks.current = { options, onTranscript };
  const recording = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null);
  const player = useRef<HTMLAudioElement | null>(null), url = useRef<string | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const [listening, setListening] = useState(false), [speaking, setSpeaking] = useState(false), [message, setMessage] = useState('');
  const reset = () => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const previous = recording.current; recording.current = null;
    if (previous?.state === 'recording') previous.stop();
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    player.current?.pause(); player.current = null;
    if (url.current) { URL.revokeObjectURL(url.current); }
    url.current = null;
    browser.reset(); setListening(false); setSpeaking(false); setMessage('');
  };
  const resetRef = useRef(reset); resetRef.current = reset;
  useEffect(() => {
    resetRef.current();
    const hide = () => resetRef.current();
    const visibility = () => { if (document.visibilityState === 'hidden') hide(); };
    window.addEventListener('pagehide', hide); document.addEventListener('visibilitychange', visibility);
    return () => { hide(); window.removeEventListener('pagehide', hide); document.removeEventListener('visibilitychange', visibility); };
  }, [scope, options.recognition, options.synthesis]);
  const failure = (cause: unknown) => {
    setMessage((cause as Error).message || '음성 처리를 완료하지 못했습니다. 문자 입력·표시를 이용해 주세요.');
    if ([401, 403].includes((cause as { status?: number }).status ?? 0)) callbacks.current.options.onAccessDenied?.();
  };
  const startListening = (language: string) => {
    if (callbacks.current.options.recognition !== 'google-cloud') { browser.startListening(language); return; }
    reset(); const version = generation.current; setListening(true);
    void (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (version !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
        stream.current = media;
        const recorder = new MediaRecorder(media); recording.current = recorder;
        const chunks: Blob[] = []; let size = 0;
        recorder.ondataavailable = event => { size += event.data.size; if (size <= 4_000_000) chunks.push(event.data); else resetRef.current(); };
        recorder.onerror = () => { if (version === generation.current) { resetRef.current(); setMessage('마이크 녹음에 실패했습니다. 문자를 입력해 주세요.'); } };
        recorder.onstop = () => {
          media.getTracks().forEach(track => track.stop());
          if (timer.current) clearTimeout(timer.current);
          if (version !== generation.current) return;
          void (async () => {
            let context: AudioContext | null = null;
            try {
              context = new AudioContext();
              const audio = await context.decodeAudioData(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
              if (audio.duration > 60 || audio.duration < 0.2) throw new Error('0.2초 이상, 최대 60초까지 말해 주세요.');
              const offline = new OfflineAudioContext(1, Math.floor(audio.duration * 16000), 16000);
              const source = offline.createBufferSource(); source.buffer = audio; source.connect(offline.destination); source.start();
              const resampled = await offline.startRendering();
              if (version !== generation.current) return;
              const result = await callbacks.current.options.recognize!(encoded(pcmWav(resampled.getChannelData(0))), language);
              if (version !== generation.current) return;
              callbacks.current.options.onLanguage?.(result.language); callbacks.current.onTranscript(result.text);
            } catch (cause) { if (version === generation.current) failure(cause); }
            finally { await context?.close(); if (version === generation.current) { recording.current = null; setListening(false); } }
          })();
        };
        recorder.start(); timer.current = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 59000);
      } catch (cause) { if (version === generation.current) { reset(); failure(cause); } }
    })();
  };
  const read = (text: string, language: string) => {
    if (callbacks.current.options.synthesis !== 'google-cloud') { browser.read(text, language); return; }
    reset(); const version = generation.current; setSpeaking(true);
    void callbacks.current.options.synthesize!(text, language).then(result => {
      if (version !== generation.current) return;
      if (result.mimeType !== 'audio/mpeg') throw new Error('음성 형식을 확인하지 못했습니다.');
      const bytes = Uint8Array.from(atob(result.audioBase64), char => char.codePointAt(0)!);
      const address = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })); url.current = address;
      const audio = new Audio(address); player.current = audio;
      audio.onended = () => { if (version === generation.current) resetRef.current(); };
      audio.onerror = () => { if (version === generation.current) { resetRef.current(); setMessage('음성 재생에 실패했습니다. 표시된 문장을 이용해 주세요.'); } };
      return audio.play();
    }).catch(cause => { if (version === generation.current) { setSpeaking(false); failure(cause); } });
  };
  const controls = useRef({ reset, startListening, read, finishListening: () => {}, stopReading: () => {} });
  controls.current = { reset, startListening, read,
    finishListening: () => { if (recording.current?.state === 'recording') recording.current.stop(); else browser.finishListening(); },
    stopReading: () => { if (options.synthesis === 'google-cloud') reset(); else browser.stopReading(); } };
  const stable = useMemo(() => ({ reset: () => controls.current.reset(), startListening: (language: string) => controls.current.startListening(language),
    read: (text: string, language: string) => controls.current.read(text, language), finishListening: () => controls.current.finishListening(), stopReading: () => controls.current.stopReading() }), []);
  return { ...browser, inputSupported: options.recognition === 'google-cloud'
    ? !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined' && typeof AudioContext !== 'undefined' && typeof OfflineAudioContext !== 'undefined' : browser.inputSupported,
    outputSupported: options.synthesis === 'google-cloud' ? typeof Audio !== 'undefined' : browser.outputSupported,
    listening: listening || browser.listening, speaking: speaking || browser.speaking, message: message || browser.message,
    ...stable,
  };
}
