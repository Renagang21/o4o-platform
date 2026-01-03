/**
 * BranchNewsDetailPage - 분회 뉴스 상세
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';

import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';
import type { Notice } from '../../types';

export function BranchNewsDetailPage() {
  const { branchId, id } = useParams<{ branchId: string; id: string }>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [branchId, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getNewsDetail(branchId!, id!);
      setNotice(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="게시글을 불러오는 중..." />;
  }

  if (error || !notice) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="게시글을 찾을 수 없습니다"
          description={error || '요청하신 게시글이 존재하지 않습니다.'}
          action={{ label: '목록으로', onClick: () => window.history.back() }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="분회 소식"
        breadcrumb={[
          { label: '홈', href: `/branch/${branchId}` },
          { label: '소식', href: `/branch/${branchId}/news` },
          { label: notice.title },
        ]}
      />

      <Card padding="large">
        <div style={styles.header}>
          {notice.isImportant && (
            <span style={styles.importantBadge}>중요</span>
          )}
          <h1 style={styles.title}>{notice.title}</h1>
          <div style={styles.meta}>
            <span>{notice.author}</span>
            <span>•</span>
            <span>{notice.createdAt}</span>
            <span>•</span>
            <span>조회 {notice.views}</span>
          </div>
        </div>

        <div style={styles.content}>
          {notice.content}
        </div>

        {notice.attachments && notice.attachments.length > 0 && (
          <div style={styles.attachments}>
            <h3 style={styles.attachmentsTitle}>첨부파일</h3>
            {notice.attachments.map((file, i) => (
              <a key={i} href={file.url} style={styles.attachment}>
                📎 {file.name}
              </a>
            ))}
          </div>
        )}
      </Card>

      <div style={styles.actions}>
        <Link to={`/branch/${branchId}/news`} style={styles.backButton}>
          ← 목록으로
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  header: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  importantBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '12px',
    lineHeight: 1.4,
  },
  meta: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    color: colors.neutral500,
  },
  content: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: colors.neutral800,
    whiteSpace: 'pre-wrap',
  },
  attachments: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  attachmentsTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '12px',
  },
  attachment: {
    display: 'block',
    padding: '10px 14px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
    marginBottom: '8px',
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '14px',
  },
  actions: {
    marginTop: '24px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
