/**
 * ResourcesHomePage - 자료실 메인 페이지
 *
 * Content 집중: 문서/영상/이미지 자료 + 출처 필터
 * "콘텐츠 자산 보관·공유 공간"
 *
 * 컴포넌트 트리:
 * ResourcesHomePage
 * ├─ ResourcesHeader   - 타이틀 + 자료 등록/로그인
 * ├─ ResourcesTabs     - 유형 탭 (전체/문서/영상/이미지/업체/사이니지)
 * ├─ ResourceGrid      - 자료 카드 그리드
 * │  └─ ResourceCard   - 개별 자료 카드
 * └─ Pagination        - 페이지네이션
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResourcesHeader } from '../../components/resources/ResourcesHeader';
import { ResourcesTabs } from '../../components/resources/ResourcesTabs';
import { ResourceGrid } from '../../components/resources/ResourceGrid';
import { Pagination } from '../../components/common';
import { resourcesApi } from '../../api';
import { colors, spacing } from '../../styles/theme';
import type { ResourceTab } from '../../components/resources/ResourcesTabs';
import type { ResourceData } from '../../components/resources/ResourceCard';
import type { Resource } from '../../types';

function mapResource(r: Resource): ResourceData {
  // fileType 기반으로 type 결정
  const ext = (r.fileType || '').toLowerCase();
  let type: ResourceData['type'] = 'document';
  if (['mp4', 'avi', 'mov', 'webm', 'video'].some((v) => ext.includes(v))) {
    type = 'video';
  } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'image'].some((v) => ext.includes(v))) {
    type = 'image';
  }

  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    type,
    source: 'official',
    fileSize: r.fileSize,
    downloadCount: r.downloadCount,
    createdAt: r.createdAt,
  };
}

export function ResourcesHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const currentTab = (searchParams.get('tab') || 'all') as ResourceTab;
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    setLoading(true);
    resourcesApi.getResources({ page: currentPage, limit: 12 })
      .then((res) => {
        if (res.data) {
          setResources(res.data.map(mapResource));
          setTotalPages(res.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentPage]);

  const handleTabChange = (tab: ResourceTab) => {
    setSearchParams((prev) => {
      prev.set('tab', tab);
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(page));
      return prev;
    });
  };

  // 클라이언트 필터링
  const filteredResources = resources.filter((r) => {
    if (currentTab === 'all') return true;
    if (currentTab === 'corporate') return r.source === 'corporate';
    if (currentTab === 'signage') return r.source === 'signage';
    return r.type === currentTab;
  });

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <ResourcesHeader />

        <ResourcesTabs
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />

        {loading ? (
          <div style={styles.empty}>불러오는 중...</div>
        ) : filteredResources.length === 0 ? (
          <div style={styles.empty}>
            <p>자료가 없습니다</p>
          </div>
        ) : (
          <>
            <ResourceGrid resources={filteredResources} />
            {totalPages > 1 && (
              <div style={styles.paginationWrap}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ResourcesHomePage;

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
  },
  wrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
  empty: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.neutral500,
  },
  paginationWrap: {
    marginTop: spacing.xl,
  },
};
