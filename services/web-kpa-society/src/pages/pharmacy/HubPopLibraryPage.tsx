/**
 * HubPopLibraryPage — 매장 HUB POP 진열 + 매장으로 가져오기
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   KPA·K-Cosmetics·GlycoPharm 의 블로그/POP/QR 진열 화면 9개가 문구·아이콘·경로·accent 를 빼면
 *   동일한 마크업이었다. 화면은 공통 `HubImportLibraryView`, 상태는 공통 `useHubImportLibrary`
 *   (@o4o/store-ui-core) 로 이관하고 이 파일은 **API adapter + 서비스 config** 만 소유한다.
 *   backend · API 계약 무변경.
 *
 * 데이터 흐름 (변경 없음):
 *   - HUB 목록: hubContentApi.list({ sourceDomain: 'pop' })
 *   - 단건 가져가기: importOperatorPop(slug, sourceId)
 *   - 일괄 가져가기: 단건 endpoint fan-out (신규 backend 없음)
 *
 * HUB 목록은 운영자 **원본**의 읽기 전용 진열이고, 가져오기가 만드는 것은 매장 소유 **사본**이다.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone } from 'lucide-react';
import { HubImportLibraryView, useHubImportLibrary } from '@o4o/store-ui-core';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { importOperatorPop } from '../../api/popStaff';

const PAGE_LIMIT = 20;

export function HubPopLibraryPage() {
  const navigate = useNavigate();

  const fetchPage = useCallback(
    ({ page, limit }: { page: number; limit: number }) =>
      hubContentApi
        .list({ serviceKey: 'kpa', sourceDomain: 'pop', page, limit })
        .then((res) => ({ items: res.data ?? [], total: res.pagination?.total ?? 0 })),
    [],
  );

  const hub = useHubImportLibrary<HubContentItemResponse>({
    fetchPage,
    limit: PAGE_LIMIT,
    resolveStoreSlug: getStoreSlug,
    importOne: (storeSlug, id) => importOperatorPop(storeSlug, id),
    messages: {
      loadError: 'HUB POP 을 불러올 수 없습니다',
      storeMissing: '매장 정보를 확인할 수 없습니다',
      storeMissingBatchError: '매장 정보 미연결',
      importSuccess: (result) =>
        `"${(result as { title: string }).title}" 가져오기 완료 — 내 약국 POP(초안)에 추가되었습니다`,
      importError: '가져오기에 실패했습니다',
      bulkSuccess: (n) => `${n}개 POP 이 내 약국에 추가되었습니다`,
      bulkError: (n) => `${n}개 POP 가져오기에 실패했습니다`,
    },
  });

  return (
    <HubImportLibraryView
      core={hub}
      accent="blue"
      title="매장 HUB POP"
      description="KPA 운영자가 발행한 POP 을 선택해 내 약국으로 가져가거나(초안 사본), 내 약국용 POP 을 직접 만드세요."
      tableId="store-hub-pop"
      titleIcon={<Megaphone className="w-3.5 h-3.5" />}
      labels={{
        ownerLabel: '내 약국',
        producerBadge: '운영자 자료',
        bulkTooltip: '선택한 POP 을 내 약국 POP(초안)으로 일괄 가져갑니다',
        emptyMessage: '아직 운영자 게시 POP 이 없습니다',
      }}
      headerAction={
        <button
          type="button"
          onClick={() => navigate('/store/marketing/pop')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          POP 만들기
        </button>
      }
      /* WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3): 현재 페이지만 정렬되는 UI 는 노출하지 않는다. */
      sortable={false}
      footerNote={
        <>
          가져온 자료는 내 매장의 독립 사본으로 저장됩니다. 같은 자료를 다시 가져오면 새로운 사본이 생성됩니다.{' '}
          가져온 POP 은{' '}
          <button
            onClick={() => navigate('/store/content/pop')}
            className="text-blue-600 hover:underline font-medium"
          >
            내 약국 POP
          </button>{' '}
          에서 수정할 수 있습니다.
        </>
      }
    />
  );
}

export default HubPopLibraryPage;
