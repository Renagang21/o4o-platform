/**
 * ForumFeedPage — 포럼 게시글 피드 (/forum/:slug)
 *
 * WO-O4O-FORUM-UX-QUICK-WINS-V1
 *
 * 개선:
 * - 태그 클릭 필터 (post tags 기반)
 * - 정렬 탭 (최근 / 인기)
 * - 포럼 상단 CTA 배너
 * - 빈 상태 메시지 개선
 */

import { useEffect, useMemo, useState } from 'react';
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

type SortKey = 'recent' | 'popular';

const css = `
  .ff-sort-btn {
    background: none;
    border: none;
    padding: 6px 14px;
    font-size: 0.813rem;
    font-weight: 500;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
  }
  .ff-sort-btn:hover { color: #475569; background: #f1f5f9; }
  .ff-sort-btn.active { color: #2563eb; background: #eff6ff; }
  .ff-tag-chip {
    background: none;
    border: 1px solid #e2e8f0;
    padding: 4px 11px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    border-radius: 999px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .ff-tag-chip:hover { border-color: #2563eb; color: #2563eb; }
  .ff-tag-chip.active { background: #eff6ff; border-color: #2563eb; color: #2563eb; }
  .ff-post-item:hover { background: #fafbfc; }
`;

export function ForumFeedPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [forum, setForum] = useState<ForumDetail | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('recent');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Inject CSS once
  useEffect(() => {
    const id = 'forum-feed-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = css;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    homeApi.getForumDetail(slug, { limit: 50 })
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

  // Collect tags from all posts
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  // Filter + sort
  const displayedPosts = useMemo(() => {
    let list = selectedTag
      ? posts.filter((p) => (p.tags || []).includes(selectedTag))
      : posts;
    if (sort === 'popular') {
      list = [...list].sort((a, b) => (b.viewCount + b.likeCount * 2) - (a.viewCount + a.likeCount * 2));
    } else {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [posts, sort, selectedTag]);

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
        <div style={styles.titleRow}>
          {forum.iconEmoji && <span style={styles.icon}>{forum.iconEmoji}</span>}
          <h1 style={styles.title}>{forum.name}</h1>
        </div>
        {forum.description && <p style={styles.desc}>{forum.description}</p>}
        {forum.tags && forum.tags.length > 0 && (
          <div style={styles.forumTagRow}>
            {forum.tags.map((t) => (
              <span key={t} style={styles.forumTag}>#{t}</span>
            ))}
          </div>
        )}
        <div style={styles.actionRow}>
          <button onClick={handleWriteClick} style={styles.writeBtn}>+ 글쓰기</button>
          <Link to="/forum" style={styles.backLink}>← 포럼 홈</Link>
        </div>
      </header>

      {/* CTA Banner */}
      <div style={styles.ctaBanner}>
        <span style={styles.ctaText}>질문이나 정보를 이 포럼에 공유해보세요</span>
        <button onClick={handleWriteClick} style={styles.ctaBtn}>글 작성하기</button>
      </div>

      {/* Controls: tag filter + sort */}
      <div style={styles.controls}>
        {availableTags.length > 0 && (
          <div style={styles.tagBar}>
            <button
              className={`ff-tag-chip${selectedTag === null ? ' active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              전체
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                className={`ff-tag-chip${selectedTag === tag ? ' active' : ''}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
        <div style={styles.sortTabs}>
          <button
            className={`ff-sort-btn${sort === 'recent' ? ' active' : ''}`}
            onClick={() => setSort('recent')}
          >
            최근
          </button>
          <button
            className={`ff-sort-btn${sort === 'popular' ? ' active' : ''}`}
            onClick={() => setSort('popular')}
          >
            인기
          </button>
        </div>
      </div>

      {/* Post list */}
      <main style={styles.main}>
        {displayedPosts.length === 0 ? (
          <div style={styles.empty}>
            {selectedTag ? (
              <>
                <p style={styles.emptyIcon}>🔍</p>
                <p style={styles.emptyTitle}>'{selectedTag}' 태그 글이 없습니다</p>
                <button
                  style={styles.emptyTagReset}
                  onClick={() => setSelectedTag(null)}
                >
                  전체 글 보기
                </button>
              </>
            ) : (
              <>
                <p style={styles.emptyIcon}>✏️</p>
                <p style={styles.emptyTitle}>아직 글이 없습니다</p>
                <p style={styles.emptySubtitle}>첫 글을 작성해서 대화를 시작해보세요</p>
                <button onClick={handleWriteClick} style={styles.emptyWriteBtn}>
                  첫 글 작성하기
                </button>
              </>
            )}
          </div>
        ) : (
          <ul style={styles.postList}>
            {displayedPosts.map((p) => (
              <li key={p.id} className="ff-post-item" style={styles.postItem}>
                <Link to={`/forum/post/${p.id}`} style={styles.postLink}>
                  <h3 style={styles.postTitle}>{p.title}</h3>
                  {p.excerpt && <p style={styles.postExcerpt}>{p.excerpt}</p>}
                  {p.tags && p.tags.length > 0 && (
                    <div style={styles.postTagRow}>
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} style={styles.postTag}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={styles.postMeta}>
                    {p.authorName && <span>{p.authorName}</span>}
                    <span>·</span>
                    <span>{new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
                    <span>·</span>
                    <span>조회 {p.viewCount}</span>
                    <span>·</span>
                    <span>댓글 {p.commentCount}</span>
                    {p.likeCount > 0 && (
                      <>
                        <span>·</span>
                        <span>❤ {p.likeCount}</span>
                      </>
                    )}
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
  header: { borderBottom: '1px solid #e2e8f0', padding: '32px 0 24px', marginBottom: 0 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  icon: { fontSize: 28 },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 },
  desc: { fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' },
  forumTagRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 16 },
  forumTag: {
    fontSize: '0.8125rem', color: '#1d4ed8', backgroundColor: '#eff6ff',
    borderRadius: 4, padding: '3px 8px',
  },
  actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 },
  writeBtn: {
    padding: '10px 18px', fontSize: '0.875rem', fontWeight: 600,
    color: '#fff', backgroundColor: '#2563eb', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },
  backLink: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
  // CTA Banner
  ctaBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    backgroundColor: '#f0f9ff',
    borderLeft: '3px solid #2563eb',
    borderRadius: '0 8px 8px 0',
    margin: '20px 0 0',
    gap: 12,
  },
  ctaText: {
    fontSize: '0.875rem',
    color: '#1e40af',
    fontWeight: 500,
  },
  ctaBtn: {
    padding: '7px 14px',
    fontSize: '0.813rem',
    fontWeight: 600,
    color: '#2563eb',
    backgroundColor: '#fff',
    border: '1px solid #93c5fd',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  // Controls
  controls: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    padding: '16px 0 12px',
    borderBottom: '1px solid #f1f5f9',
  },
  tagBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    flex: 1,
  },
  sortTabs: {
    display: 'flex',
    gap: 2,
    flexShrink: 0,
  },
  main: { paddingBottom: 48 },
  empty: { textAlign: 'center', padding: '56px 0' },
  emptyIcon: { fontSize: '2rem', margin: '0 0 12px' },
  emptyTitle: { fontSize: '1rem', fontWeight: 600, color: '#475569', margin: '0 0 6px' },
  emptySubtitle: { fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 20px' },
  emptyWriteBtn: {
    padding: '10px 24px', fontSize: '0.875rem', fontWeight: 600,
    color: '#fff', backgroundColor: '#2563eb', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },
  emptyTagReset: {
    padding: '8px 16px', fontSize: '0.875rem', fontWeight: 500,
    color: '#2563eb', backgroundColor: '#eff6ff', border: 'none',
    borderRadius: 6, cursor: 'pointer',
  },
  postList: { listStyle: 'none', padding: 0, margin: 0 },
  postItem: { borderBottom: '1px solid #f1f5f9', borderRadius: 4, transition: 'background 0.12s' },
  postLink: { display: 'block', padding: '16px 8px', textDecoration: 'none' },
  postTitle: { fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' },
  postExcerpt: { fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: '0 0 8px 0' },
  postTagRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 6 },
  postTag: {
    fontSize: '0.75rem', color: '#3b82f6', backgroundColor: '#eff6ff',
    borderRadius: 4, padding: '2px 7px',
  },
  postMeta: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, fontSize: '0.75rem', color: '#94a3b8' },
  errorWrap: { textAlign: 'center', padding: '64px 16px' },
  errorTitle: { fontSize: '1.25rem', color: '#475569', marginBottom: 16 },
};
