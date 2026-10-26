/**
 * PublicVideoViewer — QR 동영상 전용 공개 뷰어
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * QR(landingType='video') 스캔 시 QrLandingPage 가 일반 카드 UI 대신 이 컴포넌트를 렌더한다.
 * KPA 레이아웃(헤더/사이드바/푸터) 바깥에서 렌더되며(App.tsx 의 /qr/:slug 는 Layout 미적용),
 * 본 컴포넌트 자체도 전체 화면 검은 배경 + 동영상 플레이어 중심으로만 구성한다.
 *
 * - 헤더/사이드바/푸터 없음 (구조적으로 미포함)
 * - 검은 배경, 동영상 플레이어 중심, 모바일 대응
 * - 전체화면 버튼 제공 (F11 강제 실행은 웹 보안 정책상 하지 않음)
 * - embed 변환은 toVideoEmbed (YouTube/Vimeo 최소 구현)
 */

import { useRef, useState } from 'react';
import { Maximize, AlertCircle } from 'lucide-react';
import { toVideoEmbed } from '../../utils/videoEmbed';

interface PublicVideoViewerProps {
  videoUrl: string | null | undefined;
  title?: string;
}

export default function PublicVideoViewer({ videoUrl, title }: PublicVideoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showChrome, setShowChrome] = useState(true);

  const embed = videoUrl ? toVideoEmbed(videoUrl) : null;

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  };

  if (!embed || !embed.embedUrl) {
    return (
      <div style={styles.page}>
        <div style={styles.errorBox}>
          <AlertCircle size={40} style={{ color: '#888' }} />
          <p style={styles.errorText}>동영상을 재생할 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={styles.page}
      onClick={() => setShowChrome((s) => !s)}
    >
      <div style={styles.playerWrap}>
        <iframe
          src={embed.embedUrl}
          title={title || '동영상'}
          style={styles.iframe}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {showChrome && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
          style={styles.fullscreenBtn}
          aria-label="전체화면"
        >
          <Maximize size={18} />
          <span style={styles.fullscreenLabel}>전체화면</span>
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerWrap: {
    position: 'relative',
    width: '100%',
    maxWidth: '1280px',
    aspectRatio: '16 / 9',
    backgroundColor: '#000',
  },
  iframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  fullscreenBtn: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
  },
  fullscreenLabel: {
    fontSize: '14px',
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  errorText: {
    color: '#aaa',
    fontSize: '15px',
  },
};
