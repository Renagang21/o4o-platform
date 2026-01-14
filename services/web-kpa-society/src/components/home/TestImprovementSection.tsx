/**
 * TestImprovementSection - 서비스 테스트 & 개선 참여 섹션
 *
 * Work Order: WO-TEST-HOMEPAGE-SECTION-V1
 *
 * 구성:
 * 1. 테스트 안내 영역 (카드 기반)
 * 2. 테스트 의견 게시판 (포럼 연동)
 * 3. 서비스 업데이트 게시판 (포럼 연동)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';

// Types
interface ForumPost {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  commentCount: number;
}

// 서비스별 설정
interface ServiceConfig {
  serviceName: string;
  serviceDescription: string;
  primaryColor: string;
}

// 기본 설정 (KPA Society)
const defaultConfig: ServiceConfig = {
  serviceName: '청명광역약사회',
  serviceDescription: '지부·분회 회원 관리, 교육 신청, 공동구매 등 약사회 운영을 지원하는 SaaS 플랫폼',
  primaryColor: colors.primary,
};

// 테스트 안내 카드 콘텐츠
const guideCards = [
  {
    icon: '🎯',
    title: '이 서비스의 목적',
    description: '실제 사용자가 편리하게 이용할 수 있는 서비스를 만들기 위해 여러분의 피드백을 수집합니다.',
  },
  {
    icon: '👥',
    title: '참여 방법',
    description: '서비스를 자유롭게 사용해보시고, 불편한 점이나 개선 아이디어가 있으면 의견을 남겨주세요.',
  },
  {
    icon: '💡',
    title: '의견 남기기',
    description: '아래 테스트 의견 게시판에서 직접 글을 작성하거나, 기존 의견에 댓글로 의견을 더할 수 있습니다.',
  },
  {
    icon: '✅',
    title: '의견 반영 방식',
    description: '작성해주신 의견은 검토 후 서비스 업데이트에 반영되며, 처리 결과는 댓글로 안내드립니다.',
  },
];

// Mock 데이터 (실제 API 연동 전)
const mockFeedbackPosts: ForumPost[] = [
  { id: '1', title: '회원 검색 기능 개선 요청', author: '지부 운영자', createdAt: '2026-01-13', commentCount: 3 },
  { id: '2', title: '교육 신청 화면이 불편합니다', author: '분회 임원', createdAt: '2026-01-12', commentCount: 1 },
  { id: '3', title: '공지사항 알림 기능 추가 요청', author: '일반 회원', createdAt: '2026-01-10', commentCount: 5 },
];

const mockUpdatePosts: ForumPost[] = [
  { id: '1', title: '조직 현황 페이지 UI 개선', author: '운영팀', createdAt: '2026-01-14', commentCount: 0 },
  { id: '2', title: '회원 가입 신청 프로세스 개선', author: '운영팀', createdAt: '2026-01-11', commentCount: 0 },
  { id: '3', title: '모바일 반응형 지원 강화', author: '운영팀', createdAt: '2026-01-08', commentCount: 0 },
];

interface Props {
  config?: Partial<ServiceConfig>;
}

export function TestImprovementSection({ config = {} }: Props) {
  const mergedConfig = { ...defaultConfig, ...config };
  const [feedbackPosts, setFeedbackPosts] = useState<ForumPost[]>([]);
  const [updatePosts, setUpdatePosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 실제 포럼 API 연동
    setTimeout(() => {
      setFeedbackPosts(mockFeedbackPosts);
      setUpdatePosts(mockUpdatePosts);
      setLoading(false);
    }, 300);
  }, []);

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        {/* Section Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>서비스 테스트 &amp; 개선 참여</h2>
          <p style={styles.subtitle}>
            {mergedConfig.serviceDescription}에 대한 여러분의 의견을 들려주세요.
            함께 더 나은 서비스를 만들어갑니다.
          </p>
        </div>

        {/* Guide Cards */}
        <div style={styles.cardsGrid}>
          {guideCards.map((card, index) => (
            <div key={index} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>
                  {card.icon}
                </span>
                <h3 style={styles.cardTitle}>{card.title}</h3>
              </div>
              <p style={styles.cardDescription}>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Forum Boards */}
        <div style={styles.boardsGrid}>
          {/* Feedback Board */}
          <div style={styles.board}>
            <div style={styles.boardHeader}>
              <div style={styles.boardTitleWrap}>
                <span style={styles.boardIcon}>💬</span>
                <h3 style={styles.boardTitle}>테스트 의견</h3>
              </div>
              <Link to="/forum/feedback" style={styles.writeLink}>
                글쓰기 →
              </Link>
            </div>
            <div style={styles.boardContent}>
              {loading ? (
                <p style={styles.emptyMessage}>로딩 중...</p>
              ) : feedbackPosts.length === 0 ? (
                <p style={styles.emptyMessage}>
                  아직 등록된 의견이 없습니다. 첫 번째 의견을 남겨주세요!
                </p>
              ) : (
                feedbackPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/forum/post/${post.id}`}
                    style={{
                      ...styles.postItem,
                      borderBottom: index < feedbackPosts.length - 1 ? `1px solid ${colors.gray200}` : 'none',
                    }}
                  >
                    <div style={styles.postInfo}>
                      <p style={styles.postTitle}>{post.title}</p>
                      <p style={styles.postMeta}>{post.author} · {post.createdAt}</p>
                    </div>
                    {post.commentCount > 0 && (
                      <span style={styles.commentBadge}>댓글 {post.commentCount}</span>
                    )}
                  </Link>
                ))
              )}
            </div>
            <div style={styles.boardFooter}>
              <Link to="/forum/feedback" style={styles.viewAllLink}>전체 보기 →</Link>
            </div>
          </div>

          {/* Updates Board */}
          <div style={styles.board}>
            <div style={styles.boardHeader}>
              <div style={styles.boardTitleWrap}>
                <span style={styles.boardIcon}>🔔</span>
                <h3 style={styles.boardTitle}>서비스 업데이트</h3>
              </div>
            </div>
            <div style={styles.boardContent}>
              {loading ? (
                <p style={styles.emptyMessage}>로딩 중...</p>
              ) : updatePosts.length === 0 ? (
                <p style={styles.emptyMessage}>아직 등록된 업데이트가 없습니다.</p>
              ) : (
                updatePosts.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/forum/post/${post.id}`}
                    style={{
                      ...styles.postItem,
                      borderBottom: index < updatePosts.length - 1 ? `1px solid ${colors.gray200}` : 'none',
                    }}
                  >
                    <div style={styles.postInfo}>
                      <p style={styles.postTitle}>{post.title}</p>
                      <p style={styles.postMeta}>{post.author} · {post.createdAt}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <div style={styles.boardFooter}>
              <Link to="/forum/updates" style={styles.viewAllLink}>전체 보기 →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '48px 20px',
    backgroundColor: colors.gray100,
    borderTop: `1px solid ${colors.gray200}`,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.gray900,
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '16px',
    color: colors.gray600,
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: 1.6,
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    border: `1px solid ${colors.gray200}`,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  cardIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: colors.gray100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.gray900,
    margin: 0,
  },
  cardDescription: {
    fontSize: '14px',
    color: colors.gray600,
    lineHeight: 1.6,
    margin: 0,
  },
  boardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  board: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: `1px solid ${colors.gray200}`,
    overflow: 'hidden',
  },
  boardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderBottom: `1px solid ${colors.gray200}`,
  },
  boardTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  boardIcon: {
    fontSize: '18px',
  },
  boardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.gray900,
    margin: 0,
  },
  writeLink: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.gray600,
    textDecoration: 'none',
  },
  boardContent: {
    minHeight: '180px',
  },
  emptyMessage: {
    padding: '40px 20px',
    textAlign: 'center',
    color: colors.gray500,
    fontSize: '14px',
  },
  postItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    textDecoration: 'none',
  },
  postInfo: {
    flex: 1,
    minWidth: 0,
  },
  postTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.gray800,
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  postMeta: {
    fontSize: '12px',
    color: colors.gray500,
    margin: 0,
  },
  commentBadge: {
    marginLeft: '12px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.gray600,
    backgroundColor: colors.gray200,
    borderRadius: '4px',
    flexShrink: 0,
  },
  boardFooter: {
    padding: '12px 20px',
    borderTop: `1px solid ${colors.gray200}`,
    backgroundColor: colors.gray100,
  },
  viewAllLink: {
    fontSize: '14px',
    color: colors.gray600,
    textDecoration: 'none',
  },
};

export default TestImprovementSection;
