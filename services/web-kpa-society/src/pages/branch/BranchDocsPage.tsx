/**
 * BranchDocsPage - 분회 자료실
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';

import { useBranchContext } from '../../contexts/BranchContext';
import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';
import type { Resource } from '../../types';

export function BranchDocsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { basePath } = useBranchContext();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [branchId, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getResources(branchId!, { page, limit: 15 });
      setResources(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📕';
      case 'doc':
      case 'docx': return '📘';
      case 'xls':
      case 'xlsx': return '📗';
      case 'ppt':
      case 'pptx': return '📙';
      case 'zip': return '📦';
      default: return '📄';
    }
  };

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
        title="자료실"
        breadcrumb={[
          { label: '홈', href: `${basePath}` },
          { label: '자료실' },
        ]}
      />

      {resources.length === 0 ? (
        <EmptyState
          icon="📁"
          title="자료가 없습니다"
          description="등록된 자료가 없습니다."
        />
      ) : (
        <Card>
          <div style={styles.list}>
            {resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.fileUrl || '#'}
                style={styles.item}
                download
              >
                <div style={styles.itemIcon}>
                  {getFileIcon(resource.fileType || 'file')}
                </div>
                <div style={styles.itemContent}>
                  <span style={styles.itemTitle}>{resource.title}</span>
                  <div style={styles.itemMeta}>
                    <span>{resource.category}</span>
                    <span>•</span>
                    <span>{resource.fileSize}</span>
                    <span>•</span>
                    <span>{resource.createdAt}</span>
                  </div>
                </div>
                <div style={styles.downloadIcon}>⬇️</div>
              </a>
            ))}
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.neutral200}`,
    textDecoration: 'none',
    gap: '16px',
  },
  itemIcon: {
    fontSize: '28px',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  itemTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: colors.neutral900,
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral500,
  },
  downloadIcon: {
    fontSize: '18px',
    color: colors.neutral400,
    flexShrink: 0,
  },
};
