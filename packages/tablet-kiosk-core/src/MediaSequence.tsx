import { useEffect, type CSSProperties } from 'react';
import { useMediaSequence } from './useMediaSequence';
import { VideoPlayback } from './VideoPlayback';

export interface SequenceMedia { id: string; type: 'image' | 'video' | 'youtube' | 'vimeo'; url: string; durationMs?: number; title?: string }

export function MediaSequence({ items, resetKey, defaultImageDurationMs = 10000, style, controls = false }: Readonly<{
  items: SequenceMedia[]; resetKey: string; defaultImageDurationMs?: number; style?: CSSProperties; controls?: boolean;
}>) {
  const sequence = useMediaSequence(items.map(item => item.id), resetKey);
  const item = items[sequence.index];
  const { token, next, allFailed, failedCurrent } = sequence;
  const type = item?.type, durationMs = item?.durationMs;
  useEffect(() => {
    if (type !== 'image' || allFailed || failedCurrent) return;
    const timer = setTimeout(() => next(token), durationMs || defaultImageDurationMs);
    return () => clearTimeout(timer);
  }, [type, durationMs, token, next, allFailed, failedCurrent, defaultImageDurationMs]);
  if (!item) return null;
  return <div data-media-sequence="" style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
    {!sequence.allFailed && (item.type === 'image'
      ? <img key={sequence.token} src={item.url} alt={item.title ?? ''} draggable={false} onError={() => sequence.fail('이미지를 불러오지 못했습니다.', sequence.token)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      : <VideoPlayback key={sequence.token} url={item.url} kind={item.type} title={item.title} controls={controls} onEnded={() => sequence.next(sequence.token)} onError={message => sequence.fail(message, sequence.token)} />)}
    {sequence.failedCount > 0 && <output style={{ position: 'absolute', left: 8, bottom: 8, right: 8, background: '#111827', color: 'white', padding: 8, zIndex: 2 }}>
      {sequence.allFailed ? '재생할 수 있는 영상이 없습니다.' : '재생하지 못한 자료를 건너뜁니다.'}
      <button type="button" onPointerDown={event => event.stopPropagation()} onClick={sequence.retry} style={{ minHeight: 44, marginLeft: 8 }}>다시 재생</button>
    </output>}
  </div>;
}
