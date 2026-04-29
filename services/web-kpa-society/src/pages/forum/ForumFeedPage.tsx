/**
 * ForumFeedPage — 포럼 게시글 피드 (/forum/:slug)
 *
 * WO-O4O-FORUM-MULTI-STRUCTURE-RECONSTRUCTION-V1
 *
 * 멀티 포럼 구조에서 단일 포럼의 정보 + 게시글 목록을 표시.
 */

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { homeApi } from '../../api';
import { LoadingSpinner } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

interface ForumDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconEmoji: string | null;
  forumType: string | null;
  tags: string[] | null;
  organizationId: string | null;
}

interface PostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[] | null;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  authorId: string | null;
  authorName: string | null;
}

export function ForumFeedPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [forum, setForum] = useState<ForumDetail | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    homeApi.getForumDetail(slug, { limit: 20 })
      .then((res) => {
        if (res?.data?.forum) {
          setForum(res.data.forum);
          setPosts(res.data.posts);
        } else {
          setError('포럼을 찾을 수 없습니다.');
        }
      })
      .catch((err: any) => {
        if (err?.response?.status === 404) {
          setError('포럼을 찾을 수 없습니다.');
        } else {
          setError('포럼 정보를 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleWriteClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/forum/${slug}/write` } });
    } else {
      navigate(`/forum/${slug}/write`);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div style={styles.errorWrap}>
        <h2 style={styles.errorTitle}>{error}</h2>
        <Link to="/forum" style={styles.backLink}>← 포럼 홈으로</Link>
      </div>
    );
  }
  if (!forum) return null;

  return (
    <div style={styles.page}>
      {/* Forum header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.titleRow}>
            {forum.iconEmoji && <span style={styles.icon}>{forum.iconEmoji}</span>}
            <h1 style={styles.title}>{forum.name}</h1>
          </div>
          {forum.description && <p style={styles.desc}>{forum.description}</p>}
          {forum.tags && forum.tags.length > 0 && (
            <div style={styles.tagRow}>
              {forum.tags.map((t) => (
                <span key={t} style={styles.tag}>#{t}</span>
              ))}
            </div>
          )}
          <div style={styles.actionRow}>
            <button onClick={handleWriteClick} style={styles.writeBtn}>+ 글쓰기</button>
            <Link to="/forum" style={styles.backLink}>← 포럼 홈</Link>
          </div>
        </div>
      </header>

      {/* Post list */}
      <main style={styles.main}>
        {posts.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>아직 게시글이 없습니다.</p>
            <button onClick={handleWriteClick} style={styles.writeBtnInline}>첫 글 작성하기</button>
          </div>
        ) : (
          <ul style={styles.postList}>
            {posts.map((p) => (
              <li key={p.id} style={styles.postItem}>
                <Link to={`/forum/post/${p.id}`} style={styles.postLink}>
                  <h3 style={styles.postTitle}>{p.title}</h3>
                  {p.excerpt && <p style={styles.postExcerpt}>{p.excerpt}</p>}
                  <div style={styles.postMeta}>
                    {p.authorName && <span>{p.authorName}</span>}
                    <span>·</span>
                    <span>{new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
                    <span>·</span>
                    <span>조회 {p.viewCount}</span>
                    <span>·</span>
                    <span>댓글 {p.commentCount}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default ForumFeedPage;

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 800, margin: '0 auto', padding: '0 16px' },
  header: { borderBottom: '1px solid #e2e8f0', padding: '32px 0 24px', marginBottom: 24 },
  headerInner: {},
  titleRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  icon: { fontSize: 28 },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  desc: { fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: '0 0 16px 0' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tag: {
    fontSize: '0.8125rem', color: '#1d4ed8', backgroundColor: '#eff6ff',
    borderRadius: 4, padding: '3px 8px',
  },
  actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 },
  writeBtn: {
    padding: '10px 18px', fontSize: '0.875rem', fontWeight: 600,
    color: '#fff', backgroundColor: '#2563eb', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },
  writeBtnInline: {
    padding: '8px 16px', fontSize: '0.875rem', fontWeight: 500,
    color: '#fff', backgroundColor: '#2563eb', border: 'none',
    borderRadius: 6, cursor: 'pointer',
  },
  backLink: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
  main: { paddingBottom: 48 },
  empty: { textAlign: 'center', padding: '48px 0', color: '#94a3b8' },
  emptyText: { fontSize: '0.95rem', marginBottom: 16 },
  postList: { listStyle: 'none', padding: 0, margin: 0 },
  postItem: { borderBottom: '1px solid #f1f5f9' },
  postLink: { display: 'block', padding: '16px 0', textDecoration: 'none' },
  postTitle: { fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' },
  postExcerpt: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: '0 0 8px 0' },
  postMeta: { display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: '0.75rem', color: '#94a3b8' },
  errorWrap: { textAlign: 'center', padding: '64px 16px' },
  errorTitle: { fontSize: '1.25rem', color: '#475569', marginBottom: 16 },
};
