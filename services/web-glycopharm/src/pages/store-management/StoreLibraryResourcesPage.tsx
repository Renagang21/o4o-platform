/**
 * StoreLibraryResourcesPage — GlycoPharm 내 자료함 / 자료
 *
 * WO-O4O-STORE-LIBRARY-CROSSSERVICE-PHASE2-B-V1: 기본 진입 구조(목록 표시 전용)
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreLibraryResourcesView 로 이관.
 *   GlycoPharm 고유 동작(링크형 자료 아이콘)은 useLinkIcon 으로 주입한다.
 *
 * API: getStoreLibraryItems() → /glycopharm/pharmacy/library (변경 없음)
 */

import { useCallback } from 'react';
import {
  StoreLibraryResourcesView,
  type StoreLibraryLabels,
  type StoreLibraryResourceItem,
} from '@o4o/store-ui-core';
import { getStoreLibraryItems } from '@/api/storeLibrary';

const LABELS: StoreLibraryLabels = {
  breadcrumbRoot: '내 자료함',
  pageTitle: '자료',
  subtitle: '콘텐츠를 만들 때 참고할 원소스 자료를 보관합니다.',
  emptyTitle: '등록된 자료가 없습니다.',
  emptyHint: '커뮤니티 자료실 또는 공급자 라이브러리에서 자료를 가져올 수 있습니다.',
};

/** 기존 동작 유지: mimeType 이 http 로 시작하는 링크형 자료는 LinkIcon 을 쓴다. */
const useLinkIcon = (item: StoreLibraryResourceItem) => !!item.mimeType?.startsWith('http');

export default function StoreLibraryResourcesPage() {
  const fetchResources = useCallback(async () => {
    const res = await getStoreLibraryItems({ limit: 100 });
    return res.data?.items ?? [];
  }, []);

  return (
    <StoreLibraryResourcesView
      fetchResources={fetchResources}
      labels={LABELS}
      useLinkIcon={useLinkIcon}
    />
  );
}
