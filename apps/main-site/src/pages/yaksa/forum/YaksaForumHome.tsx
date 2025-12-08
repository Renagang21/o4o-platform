/**
 * YaksaForumHome - Yaksa Forum Homepage
 *
 * Main entry point for pharmacist association forum.
 * Shows organization-based content with announcements and recent posts.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  YaksaNoticeCard,
  YaksaCategoryList,
  YaksaOrgNavigation,
  YaksaRoleBadge,
  yaksaStyles,
  applyYaksaTheme,
} from '@/components/yaksa/forum';
import {
  fetchYaksaHome,
  fetchYaksaUserProfile,
  type YaksaHomeData,
  type YaksaUser,
  type YaksaOrganization,
  type YaksaPost,
} from '@/lib/yaksa/forum-data';

interface YaksaForumHomeProps {
  initialOrgId?: string;
}

export function YaksaForumHome({ initialOrgId }: YaksaForumHomeProps) {
  const [orgId, setOrgId] = useState<string>(initialOrgId || '');
  const [homeData, setHomeData] = useState<YaksaHomeData | null>(null);
  const [user, setUser] = useState<YaksaUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply Yaksa theme on mount
  useEffect(() => {
    applyYaksaTheme();
  }, []);

  // Load user profile
  useEffect(() => {
    async function loadUser() {
      const profile = await fetchYaksaUserProfile();
      setUser(profile);
      if (profile?.organizationId && !initialOrgId) {
        setOrgId(profile.organizationId);
      }
    }
    loadUser();
  }, [initialOrgId]);

  // Load home data when orgId changes
  useEffect(() => {
    async function loadHomeData() {
      if (!orgId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchYaksaHome(orgId);
        setHomeData(data);
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, [orgId]);

  const handleOrgChange = (org: YaksaOrganization) => {
    setOrgId(org.id);
  };

  // No organization selected - redirect to selector
  if (!orgId && !loading) {
    return <YaksaOrgSelector onSelect={handleOrgChange} />;
  }

  if (loading) {
    return <YaksaHomeLoading />;
  }

  if (!homeData) {
    return (
      <div className="p-8 text-center">
        <p style={yaksaStyles.textMuted}>데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div
      className="yaksa-forum-home min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b shadow-sm"
        style={{
          backgroundColor: 'var(--yaksa-primary)',
          borderColor: 'var(--yaksa-primary-dark)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💊</span>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {homeData.organization.name}
                </h1>
                <p className="text-xs text-blue-100">약사회 커뮤니티</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{user.name}</span>
                <YaksaRoleBadge role={user.role} />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Organization Navigation */}
        <div className="mb-6">
          <YaksaOrgNavigation currentOrgId={orgId} onOrgChange={handleOrgChange} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Announcements */}
            {homeData.announcements.length > 0 && (
              <section
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--yaksa-surface)',
                  borderColor: 'var(--yaksa-border)',
                }}
              >
                <h2
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={yaksaStyles.textPrimary}
                >
                  📢 공지사항
                </h2>
                <div className="space-y-3">
                  {homeData.announcements.map((post) => (
                    <YaksaNoticeCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Posts */}
            <section
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--yaksa-surface)',
                borderColor: 'var(--yaksa-border)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold flex items-center gap-2"
                  style={yaksaStyles.textPrimary}
                >
                  📝 최근 게시글
                </h2>
                <a
                  href={`/yaksa/forum/category/all?orgId=${orgId}`}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--yaksa-accent)' }}
                >
                  전체보기 →
                </a>
              </div>
              <div className="space-y-2">
                {homeData.recentPosts.map((post) => (
                  <RecentPostItem key={post.id} post={post} />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <section
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--yaksa-surface)',
                borderColor: 'var(--yaksa-border)',
              }}
            >
              <h3
                className="text-sm font-semibold mb-3"
                style={yaksaStyles.textPrimary}
              >
                📊 현황
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold" style={{ color: 'var(--yaksa-primary)' }}>
                    {homeData.stats.totalMembers.toLocaleString()}
                  </p>
                  <p className="text-xs" style={yaksaStyles.textMuted}>
                    회원
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: 'var(--yaksa-accent)' }}>
                    {homeData.stats.totalPosts.toLocaleString()}
                  </p>
                  <p className="text-xs" style={yaksaStyles.textMuted}>
                    게시글
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: 'var(--yaksa-success)' }}>
                    {homeData.stats.newPostsToday}
                  </p>
                  <p className="text-xs" style={yaksaStyles.textMuted}>
                    오늘
                  </p>
                </div>
              </div>
            </section>

            {/* Categories */}
            <section
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--yaksa-surface)',
                borderColor: 'var(--yaksa-border)',
              }}
            >
              <h3
                className="text-sm font-semibold mb-3"
                style={yaksaStyles.textPrimary}
              >
                📁 게시판
              </h3>
              <YaksaCategoryList
                categories={homeData.categories}
                userRole={user?.role || 'guest'}
                compact
                showDescription={false}
              />
            </section>

            {/* Quick Links */}
            <section
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--yaksa-surface)',
                borderColor: 'var(--yaksa-border)',
              }}
            >
              <h3
                className="text-sm font-semibold mb-3"
                style={yaksaStyles.textPrimary}
              >
                🔗 바로가기
              </h3>
              <div className="space-y-2">
                <a
                  href={`/yaksa/forum/private?orgId=${orgId}`}
                  className="flex items-center gap-2 p-2 rounded transition-colors hover:bg-gray-50"
                >
                  <span>🔒</span>
                  <span className="text-sm" style={yaksaStyles.textPrimary}>
                    문의/상담 게시판
                  </span>
                </a>
                <a
                  href="/yaksa/forum/category/education"
                  className="flex items-center gap-2 p-2 rounded transition-colors hover:bg-gray-50"
                >
                  <span>📚</span>
                  <span className="text-sm" style={yaksaStyles.textPrimary}>
                    교육/연수
                  </span>
                </a>
                <a
                  href="/yaksa/forum/category/resources"
                  className="flex items-center gap-2 p-2 rounded transition-colors hover:bg-gray-50"
                >
                  <span>📁</span>
                  <span className="text-sm" style={yaksaStyles.textPrimary}>
                    자료실
                  </span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// Recent Post Item
function RecentPostItem({ post }: { post: YaksaPost }) {
  return (
    <a
      href={`/yaksa/forum/post/${post.slug}`}
      className="flex items-center gap-3 p-2 rounded transition-colors hover:bg-gray-50"
    >
      <span className="text-sm">{post.isPinned ? '📌' : getCategoryIcon(post.categoryId)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={yaksaStyles.textPrimary}>
          {post.title}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs" style={yaksaStyles.textMuted}>
        <span>{formatRelativeTime(post.createdAt)}</span>
        {post.commentCount > 0 && <span>[{post.commentCount}]</span>}
      </div>
    </a>
  );
}

// Organization Selector Fallback
function YaksaOrgSelector({ onSelect: _onSelect }: { onSelect: (org: YaksaOrganization) => void }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      <div
        className="max-w-md w-full p-8 rounded-lg border text-center"
        style={{
          backgroundColor: 'var(--yaksa-surface)',
          borderColor: 'var(--yaksa-border)',
        }}
      >
        <span className="text-4xl mb-4 block">🏢</span>
        <h2 className="text-xl font-bold mb-2" style={yaksaStyles.textPrimary}>
          소속 조직 선택
        </h2>
        <p className="text-sm mb-6" style={yaksaStyles.textMuted}>
          약사회 커뮤니티 이용을 위해 소속 조직을 선택해주세요.
        </p>
        <a
          href="/yaksa/forum/org/select"
          className="inline-block px-6 py-3 rounded-lg font-medium transition-colors"
          style={yaksaStyles.buttonPrimary}
        >
          조직 선택하기
        </a>
      </div>
    </div>
  );
}

// Loading State
function YaksaHomeLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function getCategoryIcon(categoryId: string): string {
  const icons: Record<string, string> = {
    notice: '📢',
    admin: '📋',
    education: '📚',
    info: '💊',
    counseling: '👨‍⚕️',
    resources: '📁',
    qna: '💬',
  };
  return icons[categoryId] || '📝';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

export default YaksaForumHome;
