/**
 * HubBlogLibraryPage — GlycoPharm 매장 HUB 블로그 진열 + 매장으로 가져오기
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   KPA·K-Cosmetics·GlycoPharm 의 블로그/POP/QR 진열 화면 9개가 문구·아이콘·경로·accent 를 빼면
 *   동일한 마크업이었다. 화면은 공통 `HubImportLibraryView`, 상태는 공통 `useHubImportLibrary`
 *   (@o4o/store-ui-core) 로 이관하고 이 파일은 **API adapter + 서비스 config** 만 소유한다.
 *   backend · API 계약 무변경.
 *   (GlycoPharm 은 이번 WO 에서 처음 Core 로 편입된다. 화면 accent 는 Store HUB 기준 blue 로 정렬.)
 *
 * 데이터 흐름 (변경 없음):
 *   - HUB 목록: hubContentApi.list({ sourceDomain: 'blog' })
 *   - 단건 가져가기: importOperatorBlog(slug, sourceId)
 *   - 일괄 가져가기: 단건 endpoint fan-out (신규 backend 없음)
 *
 * HUB 목록은 운영자 **원본**의 읽기 전용 진열이고, 가져오기가 만드는 것은 매장 소유 **사본**이다.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { HubImportLibraryView, useHubImportLibrary } from '@o4o/store-ui-core';
import { hubContentApi } from '@/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '@/api/storeHub';
import { importOperatorBlog } from '@/api/blogStaff';

const PAGE_LIMIT = 20;

export function HubBlogLibraryPage() {
  const navigate = useNavigate();

  const fetchPage = useCallback(
    ({ page, limit }: { page: number; limit: number }) =>
      hubContentApi
        .list({ sourceDomain: 'blog', page, limit })
        .then((res) => ({ items: res.data ?? [], total: res.pagination?.total ?? 0 })),
    [],
  );

  const hub = useHubImportLibrary<HubContentItemResponse>({
    fetchPage,
    limit: PAGE_LIMIT,
    resolveStoreSlug: getStoreSlug,
    importOne: (storeSlug, id) => importOperatorBlog(storeSlug, id),
    messages: {
      loadError: 'HUB 블로그를 불러올 수 없습니다',
      storeMissing: '매장 정보를 확인할 수 없습니다',
      storeMissingBatchError: '매장 정보 미연결',
      importSuccess: (result) =>
        `"${(result as { title: string }).title}" 가져오기 완료 — 내 매장 블로그(초안)에 추가되었습니다`,
      importError: '가져오기에 실패했습니다',
      bulkSuccess: (n) => `${n}개 블로그가 내 매장에 추가되었습니다`,
      bulkError: (n) => `${n}개 블로그 가져오기에 실패했습니다`,
    },
  });

  return (
    <HubImportLibraryView
      core={hub}
      accent="blue"
      title="매장 HUB 블로그"
      description="GlycoPharm 운영자가 발행한 블로그 콘텐츠입니다. 선택해 일괄 가져가기 또는 행 클릭으로 단건 가져가기를 할 수 있습니다. 가져온 블로그는 매장 소유이며, 초안 상태로 복사되어 자유롭게 수정·발행할 수 있습니다."
      tableId="glyco-store-hub-blog"
      titleIcon={<FileText className="w-3.5 h-3.5" />}
      labels={{
        ownerLabel: '내 매장',
        producerBadge: '운영자 자료',
        bulkTooltip: '선택한 블로그를 내 매장 블로그(초안)로 일괄 가져갑니다',
        emptyMessage: '아직 운영자 게시 블로그가 없습니다',
      }}
      footerNote={
        <>
          가져온 블로그는{' '}
          <button
            onClick={() => navigate('/store/content/blog')}
            className="text-blue-600 hover:underline font-medium"
          >
            내 매장 블로그
          </button>{' '}
          에서 수정·발행할 수 있습니다.
        </>
      }
    />
  );
}

export default HubBlogLibraryPage;
