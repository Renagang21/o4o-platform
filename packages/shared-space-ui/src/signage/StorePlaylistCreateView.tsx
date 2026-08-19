/**
 * StorePlaylistCreateView — 내 매장 플레이리스트 등록 화면(뒤로가기 + 제목 + 부제 + 생성 폼)
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A:
 *   KPA / K-Cosmetics / GlycoPharm 의 StorePlaylistCreatePage 3벌이 동일한 껍데기(뒤로가기 링크·
 *   h1·부제·SignagePlaylistCreateShell 배치)를 JSX 만 복제하고 있었다. 서비스별로 다른 것은
 *   accent 색 · 저장 API · 목록 경로 · 태그/설명 노출 여부뿐이므로 이를 props 로 받는다.
 *
 * ⚠️ 저장 endpoint(store-playlists)는 서비스별 KEEP-LEGACY 계약이므로 여기서 호출하지 않는다.
 *    (docs/baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md)
 */

import { SignagePlaylistCreateShell } from './SignagePlaylistCreateShell';
import type { SignagePlaylistCreateConfig, SignagePlaylistCreateValues } from './SignagePlaylistCreateShell';

export interface StorePlaylistCreateViewProps {
  /** 뒤로가기 링크 색 — 서비스 accent (기본 #2563eb) */
  accentColor?: string;
  /** 목록으로 돌아가기 · 취소 */
  onBack: () => void;
  onSubmit: (values: SignagePlaylistCreateValues) => Promise<void> | void;
  /** 태그·설명 노출 여부 등 서비스별 폼 config */
  config?: Partial<SignagePlaylistCreateConfig>;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}

export function StorePlaylistCreateView({
  accentColor = '#2563eb',
  onBack,
  onSubmit,
  config,
  backLabel = '← 내 플레이리스트로',
  title = '새 플레이리스트',
  subtitle = '플레이리스트를 만든 뒤 HUB 콘텐츠를 가져와 항목을 추가합니다.',
}: StorePlaylistCreateViewProps) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 14,
            color: accentColor,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 8,
            display: 'block',
          }}
        >
          {backLabel}
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{title}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{subtitle}</p>
      </div>

      <SignagePlaylistCreateShell
        config={{
          surface: 'store',
          submitLabel: '생성',
          namePlaceholder: '플레이리스트 이름을 입력하세요',
          ...config,
        }}
        onSubmit={onSubmit}
        onCancel={onBack}
      />
    </div>
  );
}

export default StorePlaylistCreateView;
