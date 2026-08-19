/**
 * StorePageShell — "내 매장" 기능 화면 공통 페이지 골격
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A
 *
 * 4서비스의 내 매장 기능 화면이 각자 손으로 짜고 있던
 *   breadcrumb → 아이콘+제목 → 부제 → 우측 액션(+새로고침)
 * 헤더와 그 아래 loading / error / empty / list 4상태 분기를 한 단위로 모은다.
 *
 * 원본은 자료함 전용이던 `StoreLibraryPageShell` 이며, 자료함 밖(취급제품·제작물·QR·POP 등)에서도
 * 쓸 수 있도록 라벨·폭·아이콘·상태 블록을 선택 항목으로 일반화한 것이다.
 * StoreLibraryPageShell 은 이 컴포넌트에 위임한다 — 렌더 결과 무변경.
 *
 * 설계 원칙:
 *   - serviceKey 분기를 넣지 않는다. 색·문구·폭은 서비스가 주입한다.
 *   - `state` 를 주지 않으면 상태 분기 없이 children 을 그대로 렌더한다
 *     (이미 자체 목록 컴포넌트가 4상태를 처리하는 화면용).
 */

import { RefreshCw } from 'lucide-react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { LoadError } from '@o4o/ui';

export interface StorePageShellLabels {
  /** breadcrumb 최상위 — 미지정 시 breadcrumb 자체를 렌더하지 않는다 */
  breadcrumbRoot?: string;
  /** breadcrumb 현재 위치 겸 제목 */
  pageTitle: string;
  /** 제목 아래 설명 — 미지정 시 렌더하지 않는다. 여러 줄이 필요하면 ReactNode 로 준다. */
  subtitle?: ReactNode;
}

export interface StorePageShellState {
  loading: boolean;
  loadError: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyHint?: string;
  /** 목록 영역(정상 상태)의 wrapper style */
  listStyle?: CSSProperties;
}

export interface StorePageShellProps {
  labels: StorePageShellLabels;
  /** 제목·빈 목록 아이콘 */
  Icon?: ComponentType<{ size?: number; style?: CSSProperties }>;
  /** 아이콘 색 — 서비스 theme 주입 (기본 #3b82f6) */
  iconColor?: string;
  /** 본문 최대 폭 (기본 900) */
  maxWidth?: number | string;
  /** 헤더 우측 추가 액션 (새로고침 왼쪽) */
  headerActions?: ReactNode;
  /** 주입 시 헤더 우측에 새로고침 버튼을 렌더한다 */
  onReload?: () => void;
  /** 4상태 분기 — 미주입 시 children 을 그대로 렌더한다 */
  state?: StorePageShellState;
  children: ReactNode;
  /** 모달 등 화면 하단 부착물 */
  footer?: ReactNode;
}

export const storePageStyles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: { fontSize: '13px', color: '#64748b', margin: '6px 0 0' },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
    flexShrink: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textAlign: 'center',
  },
};

export function StorePageShell({
  labels,
  Icon,
  iconColor = '#3b82f6',
  maxWidth = 900,
  headerActions,
  onReload,
  state,
  children,
  footer,
}: StorePageShellProps) {
  const containerStyle: CSSProperties = { padding: '24px', maxWidth, margin: '0 auto' };

  let body: ReactNode;
  if (!state) {
    body = children;
  } else if (state.loading) {
    body = (
      <div style={storePageStyles.empty}>
        <p style={{ color: '#64748b', fontSize: 14 }}>불러오는 중...</p>
      </div>
    );
  } else if (state.loadError) {
    // 조회 실패를 "없습니다"(empty) 로 위장하지 않는다(4상태 계약).
    body = <LoadError onRetry={() => onReload?.()} />;
  } else if (state.isEmpty) {
    body = (
      <div style={storePageStyles.empty}>
        {Icon && <Icon size={32} style={{ color: '#cbd5e1', marginBottom: 12 }} />}
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{state.emptyTitle}</p>
        {state.emptyHint && (
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>{state.emptyHint}</p>
        )}
      </div>
    );
  } else {
    body = <div style={state.listStyle}>{children}</div>;
  }

  return (
    <div style={containerStyle}>
      <div style={storePageStyles.header}>
        <div>
          {labels.breadcrumbRoot && (
            <div style={storePageStyles.breadcrumb}>
              <span>{labels.breadcrumbRoot}</span>
              <span style={{ color: '#94a3b8' }}>/</span>
              <span style={{ color: '#334155' }}>{labels.pageTitle}</span>
            </div>
          )}
          <h1 style={storePageStyles.title}>
            {Icon && <Icon size={20} style={{ color: iconColor }} />}
            {labels.pageTitle}
          </h1>
          {labels.subtitle && <p style={storePageStyles.subtitle}>{labels.subtitle}</p>}
        </div>
        {/* 모바일(390)에서 액션이 3개 이상이면 줄바꿈해야 가로 overflow 가 나지 않는다 (§9). */}
        {(headerActions || onReload) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
            {headerActions}
            {onReload && (
              <button onClick={onReload} style={storePageStyles.refreshBtn} disabled={state?.loading}>
                <RefreshCw size={14} />
                새로고침
              </button>
            )}
          </div>
        )}
      </div>

      {body}

      {footer}
    </div>
  );
}
