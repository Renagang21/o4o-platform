/**
 * 제품 상세의 [영상 보기] — WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T5 · D7(2026-11-14).
 * 서버가 「이 영상의 제품」으로 찾아 준 영상(최대 3개)만 보인다. 근무자가 코너마다 짝짓지 않는다.
 * 누르기 전에는 재생기를 띄우지 않는다(자동 재생 · 데이터 사용 없음).
 */
import { useState, type CSSProperties } from 'react';
import { VideoPlayback } from './VideoPlayback';

export interface ProductVideoItem { id: string; title: string; kind: 'video' | 'youtube' | 'vimeo'; url: string }

export function readProductVideos(value: unknown): ProductVideoItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is ProductVideoItem => !!v && typeof v === 'object'
    && typeof (v as ProductVideoItem).id === 'string' && typeof (v as ProductVideoItem).url === 'string'
    && ['video', 'youtube', 'vimeo'].includes((v as ProductVideoItem).kind)).slice(0, 3);
}

const button: CSSProperties = { minHeight: 44, padding: '8px 14px', borderRadius: 10, border: '1px solid #0f766e', background: '#f0fdfa', color: '#0f766e', fontSize: 15, fontWeight: 600, cursor: 'pointer' };

export function ProductVideos({ videos }: Readonly<{ videos?: ProductVideoItem[] | null }>) {
  const [playing, setPlaying] = useState<ProductVideoItem | null>(null);
  if (!videos?.length) return null;
  return (
    <section aria-label="제품 영상" style={{ margin: '0 0 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {videos.map(video => (
          <button key={video.id} type="button" style={playing?.id === video.id ? { ...button, background: '#0f766e', color: '#fff' } : button}
            onClick={() => setPlaying(current => current?.id === video.id ? null : video)}>
            {playing?.id === video.id ? '■ 영상 닫기' : videos.length === 1 ? '▶ 영상 보기' : `▶ ${video.title}`}
          </button>
        ))}
      </div>
      {playing && (
        <div style={{ marginTop: 12, aspectRatio: '16 / 9', width: '100%', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <VideoPlayback key={playing.id} url={playing.url} kind={playing.kind} title={playing.title} onEnded={() => setPlaying(null)} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </section>
  );
}
