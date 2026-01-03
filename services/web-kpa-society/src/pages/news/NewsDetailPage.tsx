/**
 * NewsDetailPage - 공지/뉴스 상세 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { newsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Notice } from '../../types';

type NoticeType = 'notice' | 'branch-news' | 'kpa-news' | 'press';

const typeLabels: Record<NoticeType, string> = {
  notice: '공지사항',
  'branch-news': '지부/분회 소식',
  'kpa-news': '전체 약사회 소식',
  press: '보도자료',
};

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await newsApi.getNotice(id!);
      setNotice(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
          description={error || '삭제되었거나 존재하지 않는 게시글입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/news') }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title=""
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '공지/소식', href: '/news' },
          { label: typeLabels[notice.type as NoticeType], href: `/news/${notice.type}` },
        ]}
      />

      <Card padding="large">
        <div style={styles.header}>
          {notice.isPinned && <span style={styles.pinnedBadge}>중요</span>}
          <span style={styles.typeBadge}>{typeLabels[notice.type as NoticeType]}</span>
        </div>

        <h1 style={styles.title}>{notice.title}</h1>

        <div style={styles.meta}>
          <span style={styles.author}>{notice.authorName}</span>
          <span style={styles.separator}>·</span>
          <span>{new Date(notice.createdAt).toLocaleString()}</span>
          <span style={styles.separator}>·</span>
          <span>조회 {notice.viewCount}</span>
        </div>

        <div style={styles.content} dangerouslySetInnerHTML={{ __html: notice.content }} />

        {/* 첨부파일 */}
        {notice.attachments && notice.attachments.length > 0 && (
          <div style={styles.attachments}>
            <h3 style={styles.attachmentsTitle}>첨부파일</h3>
            <div style={styles.attachmentList}>
              {notice.attachments.map(file => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.attachmentItem}
                >
                  <span style={styles.attachmentIcon}>📎</span>
                  <span style={styles.attachmentName}>{file.filename}</span>
                  <span style={styles.attachmentSize}>({formatFileSize(file.size)})</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div style={styles.footer}>
        <Link to={`/news/${notice.type}`} style={styles.backButton}>
          목록으로
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  header: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  pinnedBadge: {
    padding: '4px 12px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  typeBadge: {
    padding: '4px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '13px',
  },
  title: {
    ...typography.headingXL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '16px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...typography.bodyM,
    color: colors.neutral500,
    paddingBottom: '24px',
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: '32px',
  },
  author: {
    fontWeight: 500,
    color: colors.neutral700,
  },
  separator: {
    color: colors.neutral300,
  },
  content: {
    ...typography.bodyL,
    color: colors.neutral800,
    lineHeight: 1.8,
    minHeight: '200px',
  },
  attachments: {
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  attachmentsTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  attachmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  attachmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
    textDecoration: 'none',
    color: colors.neutral700,
  },
  attachmentIcon: {
    fontSize: '16px',
  },
  attachmentName: {
    flex: 1,
    fontWeight: 500,
  },
  attachmentSize: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  backButton: {
    padding: '12px 32px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
