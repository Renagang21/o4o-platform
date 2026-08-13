/**
 * StoreLibraryPageShell — 자료함 화면 공통 껍데기(헤더 + 4상태 본문)
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * Resources / Contents 두 화면이 동일하게 갖고 있던 breadcrumb · 제목 · 새로고침 ·
 * loading / error / empty / list 분기를 한 단위로 모은다. LoadError(@o4o/ui) 계약 유지.
 */

import { RefreshCw } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { LoadError } from '@o4o/ui';
import { libraryStyles } from './libraryStyles';
import type { StoreLibraryLabels } from './types';

export interface StoreLibraryPageShellProps {
  labels: StoreLibraryLabels;
  /** 제목·빈 목록 아이콘 (Resources=Library / Contents=BookOpen) */
  Icon: ComponentType<{ size?: number; style?: React.CSSProperties }>;
  /** 아이콘 색 — 서비스 theme 주입 (기본 #3b82f6) */
  iconColor?: string;
  loading: boolean;
  loadError: boolean;
  isEmpty: boolean;
  onReload: () => void;
  /** 헤더 우측 추가 액션(새로고침 왼쪽에 놓인다) */
  headerActions?: ReactNode;
  /** 목록 본문 */
  children: ReactNode;
  /** 모달 등 화면 하단 부착물 */
  footer?: ReactNode;
}

export function StoreLibraryPageShell({
  labels,
  Icon,
  iconColor = '#3b82f6',
  loading,
  loadError,
  isEmpty,
  onReload,
  headerActions,
  children,
  footer,
}: StoreLibraryPageShellProps) {
  return (
    <div style={libraryStyles.container}>
      <div style={libraryStyles.header}>
        <div>
          <div style={libraryStyles.breadcrumb}>
            <span>{labels.breadcrumbRoot}</span>
            <span style={{ color: '#94a3b8' }}>/</span>
            <span style={{ color: '#334155' }}>{labels.pageTitle}</span>
          </div>
          <h1 style={libraryStyles.title}>
            <Icon size={20} style={{ color: iconColor }} />
            {labels.pageTitle}
          </h1>
          <p style={libraryStyles.subtitle}>{labels.subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {headerActions}
          <button onClick={onReload} style={libraryStyles.refreshBtn} disabled={loading}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {loading ? (
        <div style={libraryStyles.empty}>
          <p style={{ color: '#64748b', fontSize: 14 }}>불러오는 중...</p>
        </div>
      ) : loadError ? (
        // 조회 실패를 "없습니다"(empty) 로 위장하지 않는다(4상태 계약).
        <LoadError onRetry={() => void onReload()} />
      ) : isEmpty ? (
        <div style={libraryStyles.empty}>
          <Icon size={32} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{labels.emptyTitle}</p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>{labels.emptyHint}</p>
        </div>
      ) : (
        <div style={libraryStyles.list}>{children}</div>
      )}

      {footer}
    </div>
  );
}
