/**
 * NewsSection - 약사공론 기사 영역
 * WO-KPA-INTRANET-MAIN-V1-FINAL
 *
 * 정책:
 * - 약사공론 홈페이지 API와 연동
 * - 관리자 화면 없음 (연동 영역)
 * - 기사 클릭 시 약사공론 사이트로 이동
 */

import { colors } from '../../styles/theme';
import { NewsArticle } from '../../types/mainpage';

interface NewsSectionProps {
  articles: NewsArticle[];
  loading?: boolean;
  error?: string;
}

export function NewsSection({ articles, loading = false, error }: NewsSectionProps) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>📰 약사공론 소식</h3>
        </div>
        <div style={styles.loadingState}>
          <span style={styles.loadingText}>기사를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>📰 약사공론 소식</h3>
        </div>
        <div style={styles.errorState}>
          <span style={styles.errorText}>기사를 불러올 수 없습니다.</span>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>📰 약사공론 소식</h3>
        </div>
        <div style={styles.emptyState}>
          <span style={styles.emptyText}>등록된 기사가 없습니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📰 약사공론 소식</h3>
        <a
          href="https://www.kpanews.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.viewAll}
        >
          약사공론 바로가기 →
        </a>
      </div>

      <div style={styles.articlesGrid}>
        {articles.slice(0, 4).map((article) => (
          <a
            key={article.id}
            href={article.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.articleCard}
          >
            {article.thumbnailUrl && (
              <div style={styles.thumbnailWrapper}>
                <img
                  src={article.thumbnailUrl}
                  alt={article.title}
                  style={styles.thumbnail}
                />
              </div>
            )}
            <div style={styles.articleContent}>
              {article.category && (
                <span style={styles.category}>{article.category}</span>
              )}
              <h4 style={styles.articleTitle}>{article.title}</h4>
              <p style={styles.articleSummary}>{article.summary}</p>
              <span style={styles.publishedDate}>
                {new Date(article.publishedAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  viewAll: {
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
  },
  articlesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  articleCard: {
    display: 'flex',
    flexDirection: 'column',
    textDecoration: 'none',
    borderRadius: '8px',
    overflow: 'hidden',
    border: `1px solid ${colors.neutral200}`,
    transition: 'box-shadow 0.2s',
  },
  thumbnailWrapper: {
    width: '100%',
    height: '120px',
    overflow: 'hidden',
    backgroundColor: colors.neutral100,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  articleContent: {
    padding: '14px',
  },
  category: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
    marginBottom: '8px',
  },
  articleTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 8px 0',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  articleSummary: {
    fontSize: '12px',
    color: colors.neutral600,
    margin: '0 0 8px 0',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  publishedDate: {
    fontSize: '11px',
    color: colors.neutral400,
  },
  loadingState: {
    padding: '40px',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  errorState: {
    padding: '40px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '14px',
    color: colors.accentRed,
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
};
