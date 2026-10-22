import { useEffect, useRef, useState, type RefObject } from 'react';
import type { LmsLearnerPort } from './contracts';

/** Playback bookmarks do not hydrate or increment completion metrics. */
export function ResumeVideo({ videoRef, src, courseId, lessonId, enabled, port, onTimeUpdate }: {
  videoRef: RefObject<HTMLVideoElement | null>; src: string; courseId: string; lessonId: string;
  enabled: boolean; port: LmsLearnerPort; onTimeUpdate: () => void;
}) {
  const [position, setPosition] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  const active = useRef(false);
  const changed = useRef(false);
  const lastSaved = useRef(0);
  const saving = useRef(false);
  const pendingForce = useRef(false);
  useEffect(() => {
    active.current = true;
    setReadFailed(false);
    if (enabled && port.getPlayback) port.getPlayback(courseId, lessonId).then(bookmark => {
      if (active.current) setPosition(bookmark?.positionSeconds ?? 0);
    }).catch(() => { if (active.current) { setReadFailed(true); setMessage('이어보기 위치를 불러오지 못했습니다. 처음부터 재생할 수 있습니다.'); } });
    return () => { active.current = false; };
  }, [courseId, lessonId, enabled, port, readAttempt]);

  async function save(force = false) {
    const video = videoRef.current;
    if (!enabled || !port.savePlayback || !video || !changed.current) return;
    if (saving.current) {
      if (force) pendingForce.current = true;
      return;
    }
    if (!force && Date.now() - lastSaved.current < 15000) return;
    const seconds = video.currentTime;
    if (!Number.isFinite(seconds) || seconds < 0) return;
    saving.current = true; lastSaved.current = Date.now();
    try {
      await port.savePlayback(courseId, lessonId, seconds);
      if (active.current) setMessage('이어보기 위치를 저장했습니다.');
    } catch {
      if (active.current) { setMessage('이어보기 위치 저장에 실패했습니다. 다시 저장해 주세요.'); }
    } finally {
      saving.current = false;
      if (pendingForce.current) {
        pendingForce.current = false;
        if (active.current) void save(true);
      }
    }
  }
  return <section aria-label="강의 영상">
    {position !== null && position > 0 && <button type="button" onClick={() => {
      const video = videoRef.current;
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(position, Math.max(0, video.duration - 1)); setPosition(null);
      }
    }}>이전 위치 {Math.floor(position / 60)}분 {Math.floor(position % 60)}초부터 이어보기</button>}
    <video ref={videoRef} src={src} controls preload="metadata"
      onTimeUpdate={() => { changed.current = true; onTimeUpdate(); void save(); }}
      onPause={() => void save(true)} onEnded={() => void save(true)} onError={() => setVideoError(true)}
      style={{ width: '100%', borderRadius: 12, background: '#000', marginBottom: 12 }} />
    {videoError && <div role="alert">영상을 재생하지 못했습니다. 주소와 접근 권한을 확인해 주세요. <button type="button" onClick={() => { setVideoError(false); videoRef.current?.load(); }}>다시 불러오기</button></div>}
    {enabled && port.savePlayback && <button type="button" onClick={() => void save(true)}>현재 위치 저장</button>}
    {readFailed && <button type="button" onClick={() => setReadAttempt(n => n + 1)}>이어보기 위치 다시 조회</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
