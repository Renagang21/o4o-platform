/**
 * Admin Forum Dashboard
 *
 * Phase A-1: Forum 운영 대시보드 신설
 * - 실시간 통계 (API 연동)
 * - 카테고리별 현황
 * - 신고 대기 큐
 * - 최근 활동
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  MessageSquare,
  Users,
  FileText,
  Settings,
  Shield,
  Folder,
  AlertTriangle,
  TrendingUp,
  Clock,
  Eye,
  Plus,
  ChevronRight,
  Pin,
} from 'lucide-react';
import { apiEndpoints } from '@/config/apps.config';

// Shared types (Phase 19-B)
import type { ForumCategoryResponse } from '@o4o/types/forum';

interface ForumStats {
  totalPosts: number;
  totalComments: number;
  activeUsers: number;
  todayPosts: number;
  pendingModeration: number;
}

// Extends shared ForumCategoryResponse with admin-specific fields
interface ForumCategory extends Pick<ForumCategoryResponse, 'id' | 'name' | 'slug' | 'description' | 'postCount' | 'iconUrl' | 'isPinned' | 'iconEmoji'> {
  order: number;
}

interface ForumModerationItem {
  id: string;
  type: 'post' | 'comment' | 'user';
  reason: string;
  reportedBy: {
    id: string;
    name: string;
  };
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface RecentActivity {
  id: string;
  type: 'post' | 'comment' | 'report';
  user: {
    id: string;
    name: string;
  };
  action: string;
  target?: string;
  createdAt: string;
}

export default function ForumDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ForumModerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const togglePin = async (categoryId: string, pinned: boolean) => {
    try {
      const res = await fetch(`${apiEndpoints.forum.categories}/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: pinned }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, isPinned: pinned } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [statsRes, categoriesRes, moderationRes] = await Promise.all([
          fetch(apiEndpoints.forum.stats).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(apiEndpoints.forum.categories).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${apiEndpoints.forum.moderation}?status=pending&limit=5`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        // Set data with fallbacks
        setStats(statsRes || {
          totalPosts: 0,
          totalComments: 0,
          activeUsers: 0,
          todayPosts: 0,
          pendingModeration: 0,
        });

        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
        setModerationQueue(Array.isArray(moderationRes?.items) ? moderationRes.items :
                          Array.isArray(moderationRes) ? moderationRes : []);
      } catch (err) {
        console.error('Forum dashboard fetch error:', err);
        setError('포럼 데이터를 불러오는데 실패했습니다.');
        // Set fallback data for UI display
        setStats({
          totalPosts: 0,
          totalComments: 0,
          activeUsers: 0,
          todayPosts: 0,
          pendingModeration: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <ForumDashboardSkeleton />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            포럼 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            커뮤니티 포럼을 관리하고 모더레이션하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/forum/categories">
              <Settings className="w-4 h-4 mr-2" />
              포럼 설정
            </Link>
          </Button>
          <Button asChild>
            <Link to="/forum/posts/new">
              <Plus className="w-4 h-4 mr-2" />
              새 공지사항
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="전체 게시글"
          value={stats?.totalPosts || 0}
          icon={FileText}
          description={`오늘 ${stats?.todayPosts || 0}개`}
          trend={stats?.todayPosts && stats.todayPosts > 0 ? 'up' : undefined}
        />
        <StatCard
          title="전체 댓글"
          value={stats?.totalComments || 0}
          icon={MessageSquare}
          description="누적"
        />
        <StatCard
          title="활성 사용자"
          value={stats?.activeUsers || 0}
          icon={Users}
          description="최근 7일"
          variant="success"
        />
        <StatCard
          title="신고 대기"
          value={stats?.pendingModeration || 0}
          icon={Shield}
          description="검토 필요"
          variant={stats?.pendingModeration && stats.pendingModeration > 0 ? 'danger' : 'default'}
        />
        <StatCard
          title="카테고리"
          value={categories.length}
          icon={Folder}
          description="활성 카테고리"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>포럼 카테고리</CardTitle>
                <CardDescription>카테고리별 게시글 현황</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/forum/categories">
                  전체 보기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-1">등록된 카테고리가 없습니다.</p>
                  <p className="text-sm text-muted-foreground/70 mb-4">포럼을 시작하려면 카테고리를 먼저 만들어주세요.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/forum/categories">
                      <Plus className="w-4 h-4 mr-1" />
                      카테고리 만들기
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.slice(0, 5).map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => navigate(`/forum/boards?category=${category.slug}`)}
                    >
                      <div className="flex items-center gap-3">
                        {category.iconUrl ? (
                          <img
                            src={category.iconUrl}
                            alt={category.name}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : category.iconEmoji ? (
                          <span className="text-2xl flex-shrink-0">{category.iconEmoji}</span>
                        ) : (
                          <Folder className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{category.name}</p>
                            {category.isPinned && (
                              <Pin className="w-3.5 h-3.5 text-primary" />
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={category.isPinned ? 'text-primary' : 'text-muted-foreground'}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(category.id, !category.isPinned);
                          }}
                        >
                          <Pin className="w-4 h-4" />
                        </Button>
                        <div className="text-right">
                          <p className="text-lg font-bold">{category.postCount}</p>
                          <p className="text-xs text-muted-foreground">게시글</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Moderation */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>빠른 작업</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickActionButton
                icon={FileText}
                label="공지사항 작성"
                description="새 공지사항 등록"
                onClick={() => navigate('/forum/posts/new')}
              />
              <QuickActionButton
                icon={MessageSquare}
                label="게시판 관리"
                description="전체 게시글 보기"
                onClick={() => navigate('/forum/boards')}
              />
              <QuickActionButton
                icon={Users}
                label="사용자 관리"
                description="권한 및 차단 관리"
                onClick={() => navigate('/forum/users')}
              />
              <QuickActionButton
                icon={Shield}
                label="신고 검토"
                description={`${stats?.pendingModeration || 0}개 대기 중`}
                onClick={() => navigate('/forum/moderation')}
                variant={stats?.pendingModeration && stats.pendingModeration > 0 ? 'danger' : 'default'}
              />
              <QuickActionButton
                icon={Folder}
                label="카테고리 설정"
                description="포럼 카테고리 관리"
                onClick={() => navigate('/forum/categories')}
              />
            </CardContent>
          </Card>

          {/* Moderation Queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${moderationQueue.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  신고 대기
                </CardTitle>
              </div>
              {moderationQueue.length > 0 && (
                <Badge variant="destructive">{moderationQueue.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {moderationQueue.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">대기 중인 신고가 없습니다.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {moderationQueue.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type === 'post' ? '게시글' : item.type === 'comment' ? '댓글' : '사용자'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-sm truncate">{item.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          신고자: {item.reportedBy.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                    <Link to="/forum/moderation">
                      <Eye className="w-4 h-4 mr-2" />
                      모든 신고 보기
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Sub-components

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: 'up' | 'down';
  variant?: 'default' | 'success' | 'danger';
}

function StatCard({ title, value, icon: Icon, description, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-green-600',
    danger: 'text-destructive',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variant === 'default' ? 'text-muted-foreground' : variantStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={`text-2xl font-bold ${variantStyles[variant]}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {trend && (
            <TrendingUp
              className={`h-4 w-4 ${
                trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
              }`}
            />
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function QuickActionButton({ icon: Icon, label, description, onClick, variant = 'default' }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left rounded-lg border transition-colors hover:bg-accent ${
        variant === 'danger' ? 'border-destructive/30 hover:border-destructive/50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${variant === 'danger' ? 'text-destructive' : 'text-primary'}`} />
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ForumDashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
