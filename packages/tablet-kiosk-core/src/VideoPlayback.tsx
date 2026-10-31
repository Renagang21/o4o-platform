import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hostedVideo } from './videoEmbed';

type YouTubePlayer = { playVideo(): void; destroy(): void };
type YouTubeApi = { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer };
type VideoWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let youtubeReady: Promise<YouTubeApi> | null = null;

function loadYouTube(): Promise<YouTubeApi> {
  const win = window as VideoWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (youtubeReady) return youtubeReady;
  youtubeReady = new Promise((resolve, reject) => {
    const previous = win.onYouTubeIframeAPIReady;
    const timer = setTimeout(() => { document.querySelector('script[data-o4o-youtube-api]')?.remove(); youtubeReady = null; reject(new Error('영상 재생기를 불러오지 못했습니다.')); }, 20000);
    win.onYouTubeIframeAPIReady = () => {
      try { previous?.(); } finally {
        clearTimeout(timer);
        if (win.YT?.Player) resolve(win.YT);
        else { youtubeReady = null; reject(new Error('영상 재생기를 확인하지 못했습니다.')); }
      }
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-o4o-youtube-api]');
    if (!script) {
      script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api';
      script.dataset.o4oYoutubeApi = 'true'; script.async = true;
      document.head.appendChild(script);
    }
    script.onerror = () => { clearTimeout(timer); script?.remove(); youtubeReady = null; reject(new Error('YouTube 연결을 확인해 주세요.')); };
  });
  return youtubeReady;
}

export interface VideoPlaybackProps {
  url: string;
  kind: 'video' | 'youtube' | 'vimeo';
  title?: string;
  muted?: boolean;
  controls?: boolean;
  onEnded?: () => void;
  onError?: (message: string) => void;
  style?: CSSProperties;
}

/** End-of-video is the only success completion signal; no per-video loop or duration cutoff. */
export function VideoPlayback({ url, kind, title = '영상', muted = true, controls = true, onEnded, onError, style }: VideoPlaybackProps) {
  const host = useRef<HTMLDivElement>(null), native = useRef<HTMLVideoElement>(null), iframe = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onEnded, onError }); callbacks.current = { onEnded, onError };
  const play = useRef<() => void>(() => {});
  const [state, setState] = useState<'loading' | 'playing' | 'blocked' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const lifecycle = useRef<{ fail(message: string): void; waiting(): void; playing(): void; ended(): void } | null>(null);
  useEffect(() => {
    let current = true, failed = false, ended = false;
    let timer: ReturnType<typeof setTimeout> | undefined, player: YouTubePlayer | undefined;
    const clear = () => clearTimeout(timer);
    const fail = (text: string) => {
      if (!current || failed || ended) return;
      failed = true; clear(); setState('error'); setMessage(text); callbacks.current.onError?.(text);
    };
    const waiting = () => { clear(); timer = setTimeout(() => fail('영상을 불러오지 못했습니다. 연결과 영상 상태를 확인해 주세요.'), 30000); };
    const playing = () => { if (current && !failed) { clear(); setState('playing'); } };
    const finish = () => { if (current && !failed && !ended) { ended = true; clear(); callbacks.current.onEnded?.(); } };
    const blocked = () => { if (current) { clear(); setState('blocked'); } };
    lifecycle.current = { fail, waiting, playing, ended: finish };
    setState('loading'); setMessage(''); waiting();
    const parsed = hostedVideo(url);
    if (kind !== 'video' && (!parsed || parsed.provider !== kind)) fail('개별 영상 주소를 확인해 주세요.');
    else if (kind === 'youtube' && parsed) {
      void loadYouTube().then(api => {
        if (!current || failed || !host.current) return;
        const node = document.createElement('div'); host.current.replaceChildren(node);
        player = new api.Player(node, {
          host: 'https://www.youtube-nocookie.com', videoId: parsed.id,
          width: '100%', height: '100%',
          playerVars: { autoplay: 1, mute: muted ? 1 : 0, controls: controls ? 1 : 0, playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: () => { if (current && !failed) { play.current = () => player?.playVideo(); player?.playVideo(); } },
            onStateChange: (event: { data: number }) => {
              if (!current) return;
              if (event.data === 0) finish();
              else if (event.data === 1) playing();
              else if (event.data === 3) waiting();
              else if (event.data === 2) clear();
            },
            onError: () => fail('YouTube 영상을 재생할 수 없습니다. 공개·퍼가기 허용 상태를 확인해 주세요.'),
            onAutoplayBlocked: blocked,
          },
        });
      }).catch(() => fail('YouTube 재생기를 불러오지 못했습니다.'));
    } else if (kind === 'video') {
      const element = native.current;
      play.current = () => {
        if (!element || !current) return;
        void element.play().catch(error => { if (error?.name === 'NotAllowedError') blocked(); else fail('보관 영상을 재생하지 못했습니다.'); });
      };
      play.current();
    }
    const receive = (event: MessageEvent) => {
      if (kind !== 'vimeo' || event.origin !== 'https://player.vimeo.com' || event.source !== iframe.current?.contentWindow) return;
      let data = event.data;
      try { if (typeof data === 'string') data = JSON.parse(data); } catch { return; }
      if (!data || typeof data !== 'object') return;
      const send = (method: string, value?: unknown) => iframe.current?.contentWindow?.postMessage({ method, value }, 'https://player.vimeo.com');
      play.current = () => send('play');
      if (data.event === 'ready') {
        for (const value of ['ended', 'error', 'play', 'bufferstart', 'bufferend']) send('addEventListener', value);
        send('play');
      } else if (data.event === 'ended') finish();
      else if (data.event === 'play' || data.event === 'bufferend') playing();
      else if (data.event === 'bufferstart') waiting();
      else if (data.event === 'error') {
        if (data.data?.name === 'NotAllowedError') blocked(); else fail('Vimeo 영상을 재생할 수 없습니다.');
      }
    };
    window.addEventListener('message', receive);
    return () => { current = false; clear(); lifecycle.current = null; play.current = () => {}; window.removeEventListener('message', receive); player?.destroy(); };
  }, [url, kind, muted, controls]);
  const parsed = hostedVideo(url);
  const fill: CSSProperties = { width: '100%', height: '100%', objectFit: 'contain', border: 0 };
  return <div data-video-playback="" style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
    {kind === 'video' ? <video ref={native} src={url} autoPlay muted={muted} playsInline controls={controls} style={fill}
      onPlaying={() => lifecycle.current?.playing()} onWaiting={() => lifecycle.current?.waiting()} onStalled={() => lifecycle.current?.waiting()}
      onEnded={() => lifecycle.current?.ended()} onError={() => lifecycle.current?.fail('보관 영상을 불러오지 못했습니다.')} aria-label={title} />
      : kind === 'youtube' ? <div ref={host} style={fill} aria-label={title} />
      : parsed && <iframe ref={iframe} src={`https://player.vimeo.com/video/${parsed.id}?autoplay=1&muted=${muted ? 1 : 0}&playsinline=1&controls=${controls ? 1 : 0}&dnt=1`} title={title} style={fill} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />}
    {state === 'loading' && <span role="status" style={{ position: 'absolute', left: 8, top: 8, color: 'white', background: '#111827', padding: 6 }}>영상 준비 중…</span>}
    {state === 'blocked' && <button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => { setState('loading'); lifecycle.current?.waiting(); play.current(); }} style={{ position: 'absolute', inset: '40% 20%', minHeight: 44, zIndex: 2 }}>영상 재생 시작</button>}
    {state === 'error' && <p role="alert" style={{ position: 'absolute', inset: '30% 8%', color: 'white', background: '#111827', padding: 12 }}>{message}</p>}
  </div>;
}
