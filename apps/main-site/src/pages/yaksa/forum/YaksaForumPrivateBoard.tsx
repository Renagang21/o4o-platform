/**
 * YaksaForumPrivateBoard - Private Board Page
 *
 * Member-only private board for sensitive discussions.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  YaksaRoleBadge,
  yaksaStyles,
  applyYaksaTheme,
} from '@/components/yaksa/forum';
import {
  fetchYaksaPrivatePosts,
  fetchYaksaUserProfile,
  hasRoleAccess,
  type YaksaPost,
  type YaksaUser,
} from '@/lib/yaksa/forum-data';

interface YaksaForumPrivateBoardProps {
  orgId: string;
}

export function YaksaForumPrivateBoard({ orgId }: YaksaForumPrivateBoardProps) {
  const [posts, setPosts] = useState<YaksaPost[]>([]);
  const [user, setUser] = useState<YaksaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    applyYaksaTheme();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const userData = await fetchYaksaUserProfile();
        setUser(userData);

        // Check access
        if (!userData || !hasRoleAccess(userData.role, 'member')) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const result = await fetchYaksaPrivatePosts(orgId);
        setPosts(result.posts);
      } catch (error) {
        console.error('Error loading private posts:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgId]);

  // Access Denied
  if (accessDenied) {
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
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-bold mb-2" style={yaksaStyles.textPrimary}>
            접근 권한 없음
          </h2>
          <p className="mb-6" style={yaksaStyles.textMuted}>
            이 게시판은 회원 이상만 접근할 수 있습니다.
            <br />
            로그인 후 다시 시도해주세요.
          </p>
          <div className="space-y-2">
            <a
              href="/login?redirect=/yaksa/forum/private"
              className="block px-6 py-3 rounded-lg font-medium"
              style={yaksaStyles.buttonPrimary}
            >
              로그인
            </a>
            <a
              href="/yaksa/forum"
              className="block px-6 py-3 rounded-lg font-medium"
              style={yaksaStyles.buttonSecondary}
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PrivateBoardLoading />;
  }

  return (
    <div
      className="yaksa-forum-private-board min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      {/* Header */}
      <header
        className="border-b shadow-sm"
        style={{
          backgroundColor: 'var(--yaksa-primary)',
          borderColor: 'var(--yaksa-primary-dark)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <a href="/yaksa/forum" className="text-white hover:opacity-80">
              ← 홈
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl">🔒</span>
            <div>
              <h1 className="text-2xl font-bold text-white">문의/상담 게시판</h1>
              <p className="text-blue-100 mt-1">
                회원 전용 비공개 게시판입니다
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Notice */}
        <div
          className="p-4 rounded-lg border mb-6"
          style={{
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            borderColor: 'var(--yaksa-info)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--yaksa-info)' }}>
            ℹ️ 이 게시판의 글은 회원만 열람할 수 있으며, 작성자와 운영진에게만 공개됩니다.
          </p>
        </div>

        {/* Write Button */}
        <div className="flex justify-end mb-4">
          <a
            href={`/yaksa/forum/write?orgId=${orgId}&private=true`}
            className="px-4 py-2 rounded font-medium"
            style={yaksaStyles.buttonPrimary}
          >
            문의하기
          </a>
        </div>

        {/* Post List */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--yaksa-surface)',
            borderColor: 'var(--yaksa-border)',
          }}
        >
          {posts.length === 0 ? (
            <div className="p-8 text-center">
              <p style={yaksaStyles.textMuted}>등록된 문의가 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--yaksa-border)' }}>
              {posts.map((post) => (
                <PrivatePostItem key={post.id} post={post} currentUserId={user?.id} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Private Post Item
function PrivatePostItem({
  post,
  currentUserId,
}: {
  post: YaksaPost;
  currentUserId?: string;
}) {
  const isOwner = currentUserId === post.author.id;

  return (
    <a
      href={`/yaksa/forum/post/${post.slug}`}
      className="block p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            backgroundColor: post.status === 'approved'
              ? 'rgba(34, 197, 94, 0.1)'
              : post.status === 'pending'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'var(--yaksa-surface-tertiary)',
          }}
        >
          {post.status === 'approved' ? '✓' : post.status === 'pending' ? '⏳' : '💬'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate" style={yaksaStyles.textPrimary}>
              {post.title}
            </h3>
            {post.commentCount > 0 && (
              <span className="text-sm" style={{ color: 'var(--yaksa-accent)' }}>
                [{post.commentCount}]
              </span>
            )}
            {isOwner && (
              <span className="px-1.5 py-0.5 rounded text-xs" style={yaksaStyles.badgeInfo}>
                내 문의
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs" style={yaksaStyles.textMuted}>
            <span className="flex items-center gap-1">
              <span>{post.author.name}</span>
              <YaksaRoleBadge role={post.author.role} size="sm" showLabel={false} />
            </span>
            <span>{formatRelativeTime(post.createdAt)}</span>
            <StatusLabel status={post.status} />
          </div>
        </div>
      </div>
    </a>
  );
}

function StatusLabel({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: '답변대기', color: 'var(--yaksa-warning)' },
    approved: { label: '답변완료', color: 'var(--yaksa-success)' },
    rejected: { label: '처리불가', color: 'var(--yaksa-critical)' },
  };

  const { label, color } = config[status] || { label: status, color: 'var(--yaksa-text-muted)' };

  return (
    <span style={{ color }}>
      {label}
    </span>
  );
}

function PrivateBoardLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-24 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
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

export default YaksaForumPrivateBoard;
