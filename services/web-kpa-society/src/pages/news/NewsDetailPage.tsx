/**
 * NewsDetailPage - 콘텐츠 상세 페이지
 *
 * APP-CONTENT Phase 2: @o4o/types/content 공유 상수 사용
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { newsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_SOURCE_COLORS,
  CONTENT_SOURCE_LABELS,
} from '@o4o/types/content';
import type { ContentType } from '@o4o/types/content';
import type { Notice } from '../../types';

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
          { label: '콘텐츠', href: '/news' },
          ...(notice.type && CONTENT_TYPE_LABELS[notice.type as ContentType]
            ? [{ label: CONTENT_TYPE_LABELS[notice.type as ContentType], href: `/news/${notice.type}` }]
            : []),
        ]}
      />

      <Card padding="large">
        <div style={styles.header}>
          {notice.isPinned && <span style={styles.pinnedBadge}>중요</span>}
          {notice.type && CONTENT_TYPE_LABELS[notice.type as ContentType] && (
            <span style={styles.typeBadge}>{CONTENT_TYPE_LABELS[notice.type as ContentType]}</span>
          )}
          {notice.metadata?.creatorType && CONTENT_SOURCE_LABELS[notice.metadata.creatorType] && (
            <span style={{
              ...styles.sourceBadge,
              backgroundColor: CONTENT_SOURCE_COLORS[notice.metadata.creatorType] || colors.neutral500,
            }}>
              {CONTENT_SOURCE_LABELS[notice.metadata.creatorType]}
            </span>
          )}
          {notice.metadata?.category && (
            <span style={styles.categoryBadge}>{notice.metadata.category}</span>
          )}
        </div>

        <h1 style={styles.title}>{notice.title}</h1>

        <div style={styles.meta}>
          {(notice.metadata?.supplierName || notice.metadata?.pharmacyName) && (
            <>
              <span style={styles.author}>{notice.metadata?.supplierName || notice.metadata?.pharmacyName}</span>
              <span style={styles.separator}>·</span>
            </>
          )}
          <span>{new Date(notice.publishedAt || notice.createdAt).toLocaleString()}</span>
        </div>

        {notice.summary && (
          <p style={styles.summary}>{notice.summary}</p>
        )}

        <div style={styles.content} dangerouslySetInnerHTML={{ __html: notice.body || notice.content }} />

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

      {/* 다음 행동 안내 */}
      <div style={styles.nextAction}>
        <p style={styles.nextActionText}>관련 소식을 계속 확인하세요</p>
        <Link to={notice.type ? `/news/${notice.type}` : '/news'} style={styles.nextActionLink}>
          콘텐츠 더 보기 →
        </Link>
      </div>

      <div style={styles.footer}>
        <Link to={notice.type ? `/news/${notice.type}` : '/news'} style={styles.backButton}>
          전체 콘텐츠 보기 →
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
  sourceBadge: {
    padding: '4px 12px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  categoryBadge: {
    padding: '4px 12px',
    backgroundColor: colors.neutral50,
    color: colors.neutral500,
    borderRadius: '4px',
    fontSize: '12px',
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
  summary: {
    ...typography.bodyL,
    color: colors.neutral600,
    margin: 0,
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
    lineHeight: 1.6,
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
  nextAction: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textAlign: 'center',
  },
  nextActionText: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '0 0 8px',
  },
  nextActionLink: {
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  footer: {
    marginTop: '24px',
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
