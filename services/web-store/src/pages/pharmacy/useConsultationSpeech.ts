import { useCallback, useEffect, useRef, useState } from 'react';

// SpeechRecognition is still prefixed in some browsers and is absent from lib.dom.
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export const consultationSpeechLocale: Record<string, string> = {
  ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', vi: 'vi-VN', th: 'th-TH', id: 'id-ID',
};

/** Browser-only, transient speech. No recording blobs, automatic translation or persistence. */
export function useConsultationSpeech(scope: string, onTranscript: (text: string) => void) {
  const constructor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
  const synthesis = window.speechSynthesis;
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const transcript = useRef(onTranscript);
  transcript.current = onTranscript;
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [message, setMessage] = useState('');

  const stopReading = useCallback(() => {
    if (utterance.current) { utterance.current = null; synthesis?.cancel(); }
    setSpeaking(false);
  }, [synthesis]);
  const reset = useCallback(() => {
    const previous = recognition.current;
    recognition.current = null;
    try { previous?.abort(); } catch { /* The browser may already have stopped. */ }
    setListening(false); stopReading(); setMessage('');
  }, [stopReading]);

  useEffect(() => {
    reset();
    const hide = () => reset();
    const visibility = () => { if (document.visibilityState === 'hidden') reset(); };
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', visibility);
    return () => { reset(); window.removeEventListener('pagehide', hide); document.removeEventListener('visibilitychange', visibility); };
  }, [scope, reset]);

  function startListening(language: string) {
    reset();
    if (!constructor || !consultationSpeechLocale[language]) {
      setMessage('이 브라우저는 음성 입력을 지원하지 않습니다. 문자를 직접 입력해 주세요.'); return;
    }
    try {
      const current = new constructor();
      recognition.current = current;
      current.lang = consultationSpeechLocale[language]; current.continuous = false; current.interimResults = false;
      current.onresult = event => {
        if (recognition.current !== current) return;
        const text = Array.from(event.results).slice(event.resultIndex).filter(result => result.isFinal).map(result => result[0]?.transcript ?? '').join(' ').trim();
        if (text) transcript.current(text);
      };
      current.onerror = event => {
        if (recognition.current !== current) return;
        recognition.current = null; setListening(false);
        setMessage(event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? '마이크 사용이 허용되지 않았습니다. 브라우저 권한을 확인하거나 문자를 입력해 주세요.'
          : event.error === 'no-speech' ? '음성을 듣지 못했습니다. 다시 말하거나 문자를 입력해 주세요.'
            : event.error === 'audio-capture' ? '마이크를 찾지 못했습니다. 연결을 확인하거나 문자를 입력해 주세요.'
              : event.error === 'language-not-supported' ? '이 기기에서 선택 언어의 음성 입력을 지원하지 않습니다. 문자를 입력해 주세요.'
                : '음성 입력을 완료하지 못했습니다. 네트워크를 확인하거나 문자를 입력해 주세요.');
      };
      current.onend = () => { if (recognition.current === current) { recognition.current = null; setListening(false); } };
      setListening(true); current.start();
    } catch { reset(); setMessage('음성 입력을 시작하지 못했습니다. 브라우저와 마이크 권한을 확인해 주세요.'); }
  }
  function finishListening() {
    try { recognition.current?.stop(); }
    catch { reset(); setMessage('음성 입력을 마쳤습니다. 입력된 문장을 확인해 주세요.'); }
  }
  function read(text: string, language: string) {
    reset();
    if (!synthesis || !window.SpeechSynthesisUtterance || !consultationSpeechLocale[language]) {
      setMessage('이 브라우저는 읽어주기를 지원하지 않습니다. 문자 화면을 이용해 주세요.'); return;
    }
    // Fetch on every click: voice lists can become available after initial page load.
    const available = synthesis.getVoices();
    const voice = available.find(item => item.lang.toLowerCase() === consultationSpeechLocale[language].toLowerCase())
      ?? available.find(item => item.lang.split(/[-_]/)[0].toLowerCase() === language);
    if (available.length && !voice) {
      setMessage('선택 언어의 음성이 기기에 없습니다. 기기의 음성 설정을 확인하거나 문자 화면을 이용해 주세요.'); return;
    }
    try {
      const current = new SpeechSynthesisUtterance(text);
      current.lang = consultationSpeechLocale[language];
      if (voice) current.voice = voice;
      utterance.current = current;
      current.onend = () => { if (utterance.current === current) { utterance.current = null; setSpeaking(false); } };
      current.onerror = () => { if (utterance.current === current) { utterance.current = null; setSpeaking(false); setMessage('읽어주기를 완료하지 못했습니다. 기기의 음성 설정을 확인하거나 문자 화면을 이용해 주세요.'); } };
      setSpeaking(true); synthesis.speak(current);
    } catch { stopReading(); setMessage('읽어주기를 시작하지 못했습니다. 문자 화면을 이용해 주세요.'); }
  }
  return { inputSupported: !!constructor, outputSupported: !!synthesis && !!window.SpeechSynthesisUtterance,
    listening, speaking, message, startListening, finishListening, read, stopReading, reset };
}
