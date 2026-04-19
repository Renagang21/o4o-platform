/**
 * CommunityHubPage — K-Cosmetics Community Hub Main Page
 *
 * WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
 * WO-KCOS-HOME-REBASE-TO-KPA-FRAME-V1: Shared Space Frame 기준 재구성
 *
 * Route: /community
 *
 * 섹션 순서 (Shared Space Frame):
 *  1. Hero / Summary (매장 활용 중심 환영 + CTA 3개)
 *  2. News / Notices (공지사항)
 *  3. Activity (인기 글 3 + 최근 글 5 요약)
 *  4. App Entry (3개 서비스 카드)
 *  5. Content Highlight (최근 + 추천 콘텐츠)
 *  6. Signage Preview (사이니지 미디어 + 플레이리스트)
 *  7. CTA / Guidance (매장 활용 CTA)
 *  8. Utility (광고 + 스폰서)
 */

import { useState, useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { communityApi, type CommunityAd, type CommunitySponsor } from '../../services/communityApi';
import { hubContentApi, type HubContentItemResponse } from '../../lib/api/hubContent';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts';
import { AdSection } from '../../components/community/AdSection';
import { SponsorBar } from '../../components/community/SponsorBar';

// ─── Types ──────────────────────────────────────────────────

interface FeedItem {
  id: string;
  title: string;
  author: string;
  category: string;
  viewCount: number;
  commentCount: number;
  date: string;
}

interface HubSignageMedia {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
}

interface HubSignagePlaylist {
  id: string;
  name: string;
  itemCount?: number;
}

// ─── App Entry Data ──────────────────────────────────────────

const appEntryCards = [
  {
    title: '뷰티 포럼',
    description: '뷰티 트렌드와 스킨케어 정보를 나누세요',
    href: '/forum',
    emoji: '💬',
  },
  {
    title: '콘텐츠 허브',
    description: '매장 운영에 유용한 콘텐츠를 확인하세요',
    href: '/library/content',
    emoji: '📄',
  },
  {
    title: '디지털 사이니지',
    description: '매장 디스플레이 콘텐츠를 관리하세요',
    href: '/partner/signage/content',
    emoji: '🖥',
  },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Content Card ───────────────────────────────────────────

function ContentCard({ item }: { item: HubContentItemResponse }) {
  const img = item.thumbnailUrl || item.imageUrl || null;
  const hasLink = !!item.linkUrl;

  return (
    <div
      onClick={() => { if (hasLink) window.open(item.linkUrl!, '_blank', 'noopener'); }}
      style={{
        ...styles.contentCard,
        cursor: hasLink ? 'pointer' : 'default',
        opacity: hasLink ? 1 : 0.8,
      }}
    >
      {img ? (
        <div style={styles.contentThumb}>
          <img
            src={img}
            alt={item.title}
            style={styles.thumbImg}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div style={{ ...styles.contentThumb, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, color: '#cbd5e1' }}>📄</span>
        </div>
      )}
      <div style={styles.contentBody}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          {item.cmsType && (
            <span style={styles.contentBadge}>{item.cmsType}</span>
          )}
          {item.isPinned && (
            <span style={styles.contentPinnedBadge}>추천</span>
          )}
        </div>
        <p style={styles.contentTitle}>{item.title}</p>
        {item.description && (
          <p style={styles.contentDesc}>{item.description}</p>
        )}
        <p style={styles.contentDate}>
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </div>
  );
}

// ─── Section Wrapper ────────────────────────────────────────

function Section({ title, linkTo, linkLabel, children }: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {linkTo && linkLabel && (
          <Link to={linkTo} style={styles.sectionLink}>{linkLabel}</Link>
        )}
      </div>
      {children}
    </section>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function CommunityHubPage() {
  const { isAuthenticated, user } = useAuth();

  // Feed data (forum posts)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Sponsors & Ads
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [pageAds, setPageAds] = useState<CommunityAd[]>([]);

  // Content (CMS hub content)
  const [contentItems, setContentItems] = useState<HubContentItemResponse[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Signage
  const [signageMedia, setSignageMedia] = useState<HubSignageMedia[]>([]);
  const [signagePlaylists, setSignagePlaylists] = useState<HubSignagePlaylist[]>([]);
  const [signageLoading, setSignageLoading] = useState(true);

  useEffect(() => {
    // Forum posts
    api.get('/forum/posts?limit=30')
      .then((res: any) => {
        const posts = res.data?.data?.posts ?? res.data?.posts ?? res.data ?? [];
        if (Array.isArray(posts)) {
          setFeedItems(posts.map((raw: any) => ({
            id: raw.id,
            title: raw.title || '(제목 없음)',
            author: raw.author?.name || raw.author?.email?.split('@')[0] || '익명',
            category: raw.category?.name || '일반',
            viewCount: raw.viewCount || 0,
            commentCount: raw.commentCount || 0,
            date: raw.createdAt,
          })));
        }
      })
      .catch(() => setFeedItems([]))
      .finally(() => setFeedLoading(false));

    // Sponsors & Ads
    communityApi.getSponsors().then((r: any) => setSponsors(r.data?.sponsors ?? r?.sponsors ?? [])).catch(() => {});
    communityApi.getPageAds().then((r: any) => setPageAds(r.data?.ads ?? r?.ads ?? [])).catch(() => {});

    // Hub content (CMS)
    hubContentApi.list({ sourceDomain: 'cms', limit: 50 })
      .then((res: any) => {
        const items = Array.isArray(res?.data) ? res.data : [];
        setContentItems(items);
      })
      .catch(() => setContentItems([]))
      .finally(() => setContentLoading(false));

    // Signage (media + playlists via hub content)
    Promise.all([
      hubContentApi.list({ sourceDomain: 'signage-media', limit: 4 })
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : [];
          setSignageMedia(items.map((m: any) => ({
            id: m.id,
            title: m.title,
            thumbnailUrl: m.thumbnailUrl,
          })));
        })
        .catch(() => setSignageMedia([])),
      hubContentApi.list({ sourceDomain: 'signage-playlist', limit: 4 })
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : [];
          setSignagePlaylists(items.map((p: any) => ({
            id: p.id,
            name: p.title,
            itemCount: undefined,
          })));
        })
        .catch(() => setSignagePlaylists([])),
    ]).finally(() => setSignageLoading(false));
  }, []);

  // Notices (category === '공지')
  const noticeItems = feedItems.filter((i) => i.category === '공지').slice(0, 5);

  // Hot posts top 3
  const hotPosts = [...feedItems].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3);

  // Recent posts 5
  const recentPosts = [...feedItems].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Content split: recommended (isPinned) vs recent
  const recommendedContent = contentItems.filter((c) => c.isPinned).slice(0, 6);
  const recommendedIds = new Set(recommendedContent.map((c) => c.id));
  const recentContent = contentItems.filter((c) => !recommendedIds.has(c.id)).slice(0, 6);

  // Hero greeting
  const greeting = isAuthenticated && user?.name
    ? `${user.name}님, 환영합니다`
    : '뷰티 매장 활용 서비스에 오신 것을 환영합니다';

  return (
    <div style={styles.page}>
      <div style={styles.content}>

        {/* ─── 1. Hero / Summary ─── */}
        <section style={styles.heroCard}>
          <h1 style={styles.heroTitle}>{greeting}</h1>
          <p style={styles.heroSubtitle}>
            매장 홍보와 마케팅에 필요한 콘텐츠를 한 곳에서 확인하세요
          </p>
          <div style={styles.heroCtas}>
            <Link to="/forum" style={styles.heroCta}>💬 포럼 참여</Link>
            <Link to="/library/content" style={styles.heroCta}>📄 콘텐츠 보기</Link>
            <Link to="/partner/signage/content" style={styles.heroCta}>🖥 사이니지 관리</Link>
          </div>
        </section>

        {/* ─── 2. News / Notices ─── */}
        <Section title="공지 / 새 소식" linkTo="/forum" linkLabel="전체보기 →">
          <div style={styles.card}>
            {feedLoading ? (
              <p style={styles.empty}>불러오는 중...</p>
            ) : noticeItems.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '24px 16px' }}>
                <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>아직 등록된 공지가 없습니다.</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0 0' }}>새 소식이 등록되면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <>
                {noticeItems.map((item, idx) => (
                  <Link key={item.id} to={`/forum/posts/${item.id}`} style={{
                    ...styles.listRow,
                    borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                  }}>
                    <span style={styles.noticeBadge}>공지</span>
                    <span style={styles.listTitle}>{item.title}</span>
                    <span style={styles.listDate}>{formatDate(item.date)}</span>
                  </Link>
                ))}
                <div style={{ padding: '8px 16px', textAlign: 'right' as const }}>
                  <Link to="/forum" style={{ fontSize: 12, color: '#DB2777', textDecoration: 'none', fontWeight: 500 }}>
                    전체 보기 →
                  </Link>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* ─── 3. Activity (인기 글 + 최근 글) ─── */}
        <Section title="최근 활동" linkTo="/forum" linkLabel="전체보기 →">
          {feedLoading ? (
            <div style={styles.card}>
              <p style={styles.empty}>불러오는 중...</p>
            </div>
          ) : feedItems.length === 0 ? (
            <div style={styles.card}>
              <div style={{ textAlign: 'center' as const, padding: '24px 16px' }}>
                <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 8px 0' }}>아직 게시물이 없습니다.</p>
                <Link to="/forum/write" style={{ fontSize: 13, color: '#DB2777', fontWeight: 600, textDecoration: 'none' }}>
                  첫 글 작성하기
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* 인기 글 Top 3 */}
              {hotPosts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={styles.subLabel}>인기 글</p>
                  <div style={styles.hotGrid}>
                    {hotPosts.map((item, idx) => (
                      <Link key={item.id} to={`/forum/posts/${item.id}`} style={styles.hotCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                          <span style={styles.hotRank}>{idx + 1}</span>
                          <span style={styles.categoryBadge}>{item.category}</span>
                        </div>
                        <p style={styles.hotTitle}>{item.title}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={styles.metaText}>{item.author}</span>
                          <span style={styles.metaText}>조회 {item.viewCount}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 최근 글 5개 */}
              {recentPosts.length > 0 && (
                <div>
                  <p style={styles.subLabel}>최근 글</p>
                  <div style={styles.card}>
                    {recentPosts.map((item, idx) => (
                      <Link key={item.id} to={`/forum/posts/${item.id}`} style={{
                        ...styles.listRow,
                        borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                      }}>
                        <span style={styles.categoryBadge}>{item.category}</span>
                        <span style={styles.listTitle}>{item.title}</span>
                        <span style={styles.listDate}>{formatDate(item.date)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Section>

        {/* ─── 4. App Entry (서비스 바로가기) ─── */}
        <section style={styles.section}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={styles.sectionTitle}>서비스 바로가기</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>각 서비스로 바로 이동하세요</p>
          </div>
          <div style={styles.appEntryGrid}>
            {appEntryCards.map((card) => (
              <Link key={card.href} to={card.href} style={styles.appEntryCard}>
                <span style={styles.appEntryEmoji}>{card.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={styles.appEntryTitle}>{card.title}</h3>
                  <p style={styles.appEntryDesc}>{card.description}</p>
                </div>
                <span style={styles.appEntryArrow}>→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── 5. Content Highlight ─── */}
        <Section title="콘텐츠" linkTo="/library/content" linkLabel="전체보기 →">
          {contentLoading ? (
            <p style={styles.empty}>불러오는 중...</p>
          ) : contentItems.length === 0 ? (
            <p style={styles.empty}>등록된 콘텐츠가 없습니다.</p>
          ) : (
            <>
              {recentContent.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={styles.subLabel}>최근 콘텐츠</p>
                  <div style={styles.contentGrid}>
                    {recentContent.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
              {recommendedContent.length > 0 && (
                <div>
                  <p style={styles.subLabel}>추천 콘텐츠</p>
                  <div style={styles.contentGrid}>
                    {recommendedContent.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Section>

        {/* ─── 6. Signage Preview ─── */}
        <Section title="디지털 사이니지" linkTo="/partner/signage/content" linkLabel="전체보기 →">
          {signageLoading ? (
            <p style={styles.empty}>사이니지 정보를 불러오는 중...</p>
          ) : (
            <div style={styles.signageColumns}>
              {/* Media */}
              <div>
                <p style={styles.subLabel}>영상</p>
                <div style={styles.card}>
                  {signageMedia.length === 0 ? (
                    <p style={{ ...styles.empty, padding: '16px 0' }}>등록된 사이니지 미디어가 없습니다.</p>
                  ) : (
                    signageMedia.map((m, idx) => (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                        borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                      }}>
                        <span style={{ color: '#94a3b8' }}>▶</span>
                        <span style={styles.signageItemTitle}>{m.title}</span>
                        <Link
                          to={`/store/signage?mediaId=${m.id}`}
                          style={styles.signageApplyLink}
                        >
                          매장에 적용 →
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Playlists */}
              <div>
                <p style={styles.subLabel}>플레이리스트</p>
                <div style={styles.card}>
                  {signagePlaylists.length === 0 ? (
                    <p style={{ ...styles.empty, padding: '16px 0' }}>플레이리스트가 없습니다.</p>
                  ) : (
                    signagePlaylists.map((p, idx) => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                        borderTop: idx > 0 ? '1px solid #f1f5f9' : 'none',
                      }}>
                        <span style={{ color: '#94a3b8' }}>♫</span>
                        <span style={styles.signageItemTitle}>{p.name}</span>
                        {p.itemCount != null && (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>{p.itemCount}개</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ─── 7. CTA / Guidance ─── */}
        <section style={styles.section}>
          <Link to="/partner/signage/content" style={styles.ctaCard}>
            <div style={styles.ctaIcon}>🖥</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>
                매장 홍보에 도움이 필요하세요?
              </p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                디지털 사이니지로 매장을 꾸며보세요
              </p>
            </div>
            <span style={styles.ctaLinkText}>사이니지 보기 →</span>
          </Link>
        </section>

        {/* ─── 8. Utility ─── */}
        <AdSection ads={pageAds} />
        <SponsorBar sponsors={sponsors} />

      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const PINK = '#DB2777';
const PINK_BG = '#fdf2f8';

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '60vh',
    backgroundColor: '#f8fafc',
  },
  content: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  sectionLink: {
    fontSize: 13,
    color: PINK,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Hero / Summary
  heroCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  heroCtas: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  heroCta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#475569',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    textDecoration: 'none',
  },

  // Shared card container
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },

  // List row (notices, recent posts)
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    textDecoration: 'none',
  },
  listTitle: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  listDate: {
    fontSize: 12,
    color: '#94a3b8',
    flexShrink: 0,
  },
  noticeBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: 10,
    fontWeight: 600,
    backgroundColor: PINK_BG,
    color: PINK,
    borderRadius: 4,
    flexShrink: 0,
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
    flexShrink: 0,
  },

  // Sub label
  subLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px 0',
  },

  // Hot posts
  hotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
  },
  hotCard: {
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    textDecoration: 'none',
  },
  hotRank: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  hotTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#334155',
    margin: '0 0 8px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  metaText: {
    fontSize: 10,
    color: '#94a3b8',
  },

  // App Entry
  appEntryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: 10,
  },
  appEntryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    textDecoration: 'none',
  },
  appEntryEmoji: {
    fontSize: 24,
    flexShrink: 0,
  },
  appEntryTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  appEntryDesc: {
    fontSize: 12,
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  appEntryArrow: {
    fontSize: 16,
    color: PINK,
    fontWeight: 600,
    flexShrink: 0,
  },

  // Content grid & cards
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  contentThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  contentBody: {
    padding: '8px 12px 10px',
  },
  contentBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
  },
  contentPinnedBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 500,
    backgroundColor: PINK_BG,
    color: PINK,
    borderRadius: 4,
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  contentDesc: {
    fontSize: 11,
    color: '#94a3b8',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
  },
  contentDate: {
    fontSize: 10,
    color: '#cbd5e1',
    margin: 0,
  },

  // Signage
  signageColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  signageItemTitle: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  signageApplyLink: {
    fontSize: 12,
    fontWeight: 600,
    color: PINK,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  // CTA / Guidance
  ctaCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 24px',
    backgroundColor: 'white',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    borderLeft: `3px solid ${PINK}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    textDecoration: 'none',
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PINK_BG,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  ctaLinkText: {
    fontSize: 13,
    fontWeight: 600,
    color: PINK,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  // Utility
  empty: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center' as const,
    padding: '24px 0',
  },
};
