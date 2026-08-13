/**
 * HubQrLibraryPage — 매장 HUB QR 진열 + 매장으로 가져오기
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   KPA·K-Cosmetics·GlycoPharm 의 블로그/POP/QR 진열 화면 9개가 문구·아이콘·경로·accent 를 빼면
 *   동일한 마크업이었다. 화면은 공통 `HubImportLibraryView`, 상태는 공통 `useHubImportLibrary`
 *   (@o4o/store-ui-core) 로 이관하고 이 파일은 **API adapter + 서비스 config** 만 소유한다.
 *   backend · API 계약 무변경.
 *
 * 데이터 흐름 (변경 없음):
 *   - HUB 목록: hubContentApi.list({ sourceDomain: 'qr' })
 *   - 단건 가져가기: importOperatorQr(slug, sourceId)
 *   - 일괄 가져가기: 단건 endpoint fan-out (신규 backend 없음)
 *
 * HUB 목록은 운영자 **원본**의 읽기 전용 진열이고, 가져오기가 만드는 것은 매장 소유 **사본**이다.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, QrCode } from 'lucide-react';
import { HubImportLibraryView, useHubImportLibrary } from '@o4o/store-ui-core';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { importOperatorQr } from '../../api/qrStaff';

const PAGE_LIMIT = 20;

export function HubQrLibraryPage() {
  const navigate = useNavigate();

  const fetchPage = useCallback(
    ({ page, limit }: { page: number; limit: number }) =>
      hubContentApi
        .list({ serviceKey: 'kpa', sourceDomain: 'qr', page, limit })
        .then((res) => ({ items: res.data ?? [], total: res.pagination?.total ?? 0 })),
    [],
  );

  const hub = useHubImportLibrary<HubContentItemResponse>({
    fetchPage,
    limit: PAGE_LIMIT,
    resolveStoreSlug: getStoreSlug,
    importOne: (storeSlug, id) => importOperatorQr(storeSlug, id),
    messages: {
      loadError: 'HUB QR 을 불러올 수 없습니다',
      storeMissing: '매장 정보를 확인할 수 없습니다',
      storeMissingBatchError: '매장 정보 미연결',
      importSuccess: (result) =>
        `"${(result as { title: string; slug: string }).title}" 가져오기 완료 — 내 약국 QR 에 추가되었습니다 (slug: ${(result as { title: string; slug: string }).slug})`,
      importError: '가져오기에 실패했습니다',
      bulkSuccess: (n) => `${n}개 QR 이 내 약국에 추가되었습니다`,
      bulkError: (n) => `${n}개 QR 가져오기에 실패했습니다`,
    },
  });

  return (
    <HubImportLibraryView
      core={hub}
      accent="blue"
      title="매장 HUB QR-code"
      description="KPA 운영자가 발행한 QR 템플릿을 선택해 가져가거나(매장별 slug 새로 발급), 내 약국용 QR-code 를 직접 만드세요."
      tableId="store-hub-qr"
      titleIcon={<QrCode className="w-3.5 h-3.5" />}
      labels={{
        ownerLabel: '내 약국',
        producerBadge: '운영자 자료',
        bulkTooltip: '선택한 QR 템플릿을 내 약국 QR-code 로 일괄 가져갑니다',
        emptyMessage: '아직 운영자 발행 QR 템플릿이 없습니다',
      }}
      headerAction={
        <button
          type="button"
          onClick={() => navigate('/store/marketing/qr')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          QR-code 만들기
        </button>
      }
      /* WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3): 현재 페이지만 정렬되는 UI 는 노출하지 않는다. */
      sortable={false}
      footerNote={
        <>
          가져온 자료는 내 매장의 독립 사본으로 저장됩니다. 같은 자료를 다시 가져오면 매장별 slug 가 새로 발급된 새로운 사본이 생성됩니다.{' '}
          가져온 QR 은{' '}
          <button
            onClick={() => navigate('/store/marketing/qr')}
            className="text-blue-600 hover:underline font-medium"
          >
            내 약국 QR
          </button>{' '}
          에서 수정·출력·통계를 활용할 수 있습니다.
        </>
      }
    />
  );
}

export default HubQrLibraryPage;
