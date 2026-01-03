/**
 * ResourcesListPage - 자료실 목록 페이지
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { resourcesApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Resource } from '../../types';

type ResourceCategory = 'forms' | 'guidelines' | 'policies';

const categoryLabels: Record<ResourceCategory, string> = {
  forms: '서식/양식',
  guidelines: '가이드라인',
  policies: '규정/정관',
};

export function ResourcesListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const getCategoryFromPath = (): ResourceCategory | undefined => {
    const path = location.pathname;
    if (path.includes('/docs/forms')) return 'forms';
    if (path.includes('/docs/guidelines')) return 'guidelines';
    if (path.includes('/docs/policies')) return 'policies';
    return undefined;
  };

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentCategory = getCategoryFromPath();
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    loadData();
  }, [currentPage, currentCategory, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await resourcesApi.getResources({
        category: currentCategory,
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
      });

      setResources(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const handleDownload = async (resource: Resource) => {
    try {
      const res = await resourcesApi.downloadResource(resource.id);
      window.open(res.data.downloadUrl, '_blank');
    } catch {
      window.open(resource.file.url, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📑';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📁';
  };

  const pageTitle = currentCategory ? categoryLabels[currentCategory] : '자료실';

  if (loading) {
    return <LoadingSpinner message="자료를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={pageTitle}
        description="필요한 자료를 다운로드하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '자료실', href: '/docs' },
          ...(currentCategory ? [{ label: categoryLabels[currentCategory] }] : []),
        ]}
      />

      {/* 카테고리 탭 */}
      <div style={styles.tabs}>
        <a
          href="/docs"
          style={{
            ...styles.tab,
            ...(location.pathname === '/docs' ? styles.tabActive : {}),
          }}
        >
          전체
        </a>
        <a
          href="/docs/forms"
          style={{
            ...styles.tab,
            ...(currentCategory === 'forms' ? styles.tabActive : {}),
          }}
        >
          서식/양식
        </a>
        <a
          href="/docs/guidelines"
          style={{
            ...styles.tab,
            ...(currentCategory === 'guidelines' ? styles.tabActive : {}),
          }}
        >
          가이드라인
        </a>
        <a
          href="/docs/policies"
          style={{
            ...styles.tab,
            ...(currentCategory === 'policies' ? styles.tabActive : {}),
          }}
        >
          규정/정관
        </a>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon="📁"
          title="자료가 없습니다"
          description="등록된 자료가 없습니다."
        />
      ) : (
        <>
          <div style={styles.list}>
            {resources.map(resource => (
              <Card key={resource.id} padding="medium">
                <div style={styles.item}>
                  <span style={styles.fileIcon}>
                    {getFileIcon(resource.file.mimeType)}
                  </span>
                  <div style={styles.itemInfo}>
                    <h3 style={styles.itemTitle}>{resource.title}</h3>
                    {resource.description && (
                      <p style={styles.itemDescription}>{resource.description}</p>
                    )}
                    <div style={styles.itemMeta}>
                      <span style={styles.categoryBadge}>
                        {categoryLabels[resource.category]}
                      </span>
                      <span>{resource.file.filename}</span>
                      <span>·</span>
                      <span>{formatFileSize(resource.file.size)}</span>
                      <span>·</span>
                      <span>다운로드 {resource.downloadCount}회</span>
                    </div>
                  </div>
                  <button
                    style={styles.downloadButton}
                    onClick={() => handleDownload(resource)}
                  >
                    다운로드
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  fileIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  itemDescription: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
    marginBottom: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    ...typography.bodyS,
    color: colors.neutral500,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '11px',
  },
  downloadButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
