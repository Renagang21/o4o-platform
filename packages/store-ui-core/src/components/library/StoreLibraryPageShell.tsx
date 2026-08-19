/**
 * StoreLibraryPageShell — 자료함 화면 공통 껍데기(헤더 + 4상태 본문)
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * Resources / Contents 두 화면이 동일하게 갖고 있던 breadcrumb · 제목 · 새로고침 ·
 * loading / error / empty / list 분기를 한 단위로 모은다. LoadError(@o4o/ui) 계약 유지.
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A:
 *   같은 골격을 자료함 밖에서도 쓰기 위해 StorePageShell 로 일반화하고 여기서는 위임만 한다.
 *   자료함 화면의 렌더 결과(폭 900 · list style · 문구 계약)는 변경하지 않는다.
 */

import type { ComponentType, ReactNode } from 'react';
import { StorePageShell } from '../page/StorePageShell';
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
    <StorePageShell
      labels={{
        breadcrumbRoot: labels.breadcrumbRoot,
        pageTitle: labels.pageTitle,
        subtitle: labels.subtitle,
      }}
      Icon={Icon}
      iconColor={iconColor}
      maxWidth={900}
      headerActions={headerActions}
      onReload={onReload}
      state={{
        loading,
        loadError,
        isEmpty,
        emptyTitle: labels.emptyTitle,
        emptyHint: labels.emptyHint,
        listStyle: libraryStyles.list,
      }}
      footer={footer}
    >
      {children}
    </StorePageShell>
  );
}
