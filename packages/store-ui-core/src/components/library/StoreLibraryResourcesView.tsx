/**
 * StoreLibraryResourcesView — 내 자료함 / 자료 (공통 화면 본체)
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * 원본 WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1 범위 그대로다 — 목록 표시 전용.
 * 검색·필터·정렬·pagination 은 원본 화면에 없었고 이번에 추가하지 않는다(신규 기능 금지).
 */

import { Library } from 'lucide-react';
import type { ReactNode } from 'react';
import { StoreLibraryPageShell } from './StoreLibraryPageShell';
import { StoreLibraryResourceRow } from './StoreLibraryResourceRow';
import { filterActiveResources } from './libraryHelpers';
import { useStoreLibraryList } from './useStoreLibraryList';
import type { StoreLibraryLabels, StoreLibraryResourceItem } from './types';

export interface StoreLibraryResourcesViewProps {
  /** 서비스 API adapter — endpoint·request·response 는 서비스 소유 */
  fetchResources: () => Promise<StoreLibraryResourceItem[]>;
  labels: StoreLibraryLabels;
  iconColor?: string;
  /** 원본 열기 아이콘 판정(서비스별 기존 동작 유지) */
  useLinkIcon?: (item: StoreLibraryResourceItem) => boolean;
  headerActions?: ReactNode;
}

export function StoreLibraryResourcesView({
  fetchResources,
  labels,
  iconColor,
  useLinkIcon,
  headerActions,
}: StoreLibraryResourcesViewProps) {
  const { items, loading, loadError, reload } = useStoreLibraryList(fetchResources);
  const visible = filterActiveResources(items);

  return (
    <StoreLibraryPageShell
      labels={labels}
      Icon={Library}
      iconColor={iconColor}
      loading={loading}
      loadError={loadError}
      isEmpty={visible.length === 0}
      onReload={reload}
      headerActions={headerActions}
    >
      {visible.map((item) => (
        <StoreLibraryResourceRow
          key={item.id}
          item={item}
          iconColor={iconColor}
          useLinkIcon={useLinkIcon}
        />
      ))}
    </StoreLibraryPageShell>
  );
}
