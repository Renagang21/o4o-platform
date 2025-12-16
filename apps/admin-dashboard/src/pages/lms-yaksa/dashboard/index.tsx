/**
 * LMS-Yaksa Dashboard Page
 *
 * Overview dashboard for Yaksa LMS administration
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Users,
  BookOpen,
  Award,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { adminApi, DashboardData } from '@/lib/api/lmsYaksa';
import { useAuth } from '@o4o/auth-context';
import { YaksaDashboardDesignCoreV1 } from './YaksaDashboardDesignCoreV1';

// Variant Type Definition
export type ViewVariant = 'default' | 'design-core-v1';

interface YaksaDashboardPageProps {
  variant?: ViewVariant;
}

export default function YaksaDashboardPage({ variant = 'default' }: YaksaDashboardPageProps) {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get organization ID from user context or route params
  const organizationId = user?.organizationId || 'default-org';

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await adminApi.getDashboard(organizationId);
        if (response.success && response.data) {
          setDashboardData(response.data);
        } else {
          setError(response.error || '대시보드 데이터를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        setError('대시보드 데이터를 불러오는데 실패했습니다.');
        console.error('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [organizationId]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  // Variant 분기: Design Core v1 렌더링
  if (variant === 'design-core-v1') {
    return <YaksaDashboardDesignCoreV1 dashboardData={dashboardData} />;
  }

  const { overview, assignments, credits, alerts } = dashboardData;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">약사 LMS 대시보드</h1>
          <p className="text-muted-foreground">
            보수교육 및 연수 현황을 한눈에 확인합니다.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Badge>
      </div>

      {/* Alerts Section */}
      {(alerts.overdueAssignments > 0 ||
        alerts.unverifiedCredits > 0 ||
        alerts.renewalRequired > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          {alerts.overdueAssignments > 0 && (
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertTitle>기한 초과</AlertTitle>
              <AlertDescription>
                {alerts.overdueAssignments}건의 배정이 기한을 초과했습니다.
              </AlertDescription>
            </Alert>
          )}
          {alerts.unverifiedCredits > 0 && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>검증 대기</AlertTitle>
              <AlertDescription>
                {alerts.unverifiedCredits}건의 평점이 검증 대기 중입니다.
              </AlertDescription>
            </Alert>
          )}
          {alerts.renewalRequired > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>갱신 필요</AlertTitle>
              <AlertDescription>
                {alerts.renewalRequired}명의 회원이 면허 갱신이 필요합니다.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="전체 회원"
          value={overview.totalMembers}
          icon={Users}
          description={`갱신 필요: ${overview.membersRequiringRenewal}명`}
        />
        <StatCard
          title="활성 정책"
          value={overview.activePolicies}
          icon={FileText}
          description={`필수 강좌: ${overview.requiredCourses}개`}
        />
        <StatCard
          title="이수율"
          value={`${assignments.completionRate.toFixed(1)}%`}
          icon={TrendingUp}
          description={`${assignments.completedAssignments}/${assignments.totalAssignments} 완료`}
          trend={assignments.completionRate >= 80 ? 'up' : 'down'}
        />
        <StatCard
          title="총 평점"
          value={credits.totalEarned.toFixed(1)}
          icon={Award}
          description={`평균: ${credits.averagePerMember.toFixed(1)} / 대기: ${credits.pendingVerification}`}
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Assignment Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              강좌 배정 현황
            </CardTitle>
            <CardDescription>
              전체 배정 현황 및 진행 상태
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">전체 배정</span>
                <span className="text-2xl font-bold">{assignments.totalAssignments}</span>
              </div>
              <div className="space-y-2">
                <ProgressBar
                  label="완료"
                  value={assignments.completedAssignments}
                  total={assignments.totalAssignments}
                  color="bg-green-500"
                />
                <ProgressBar
                  label="진행 중"
                  value={assignments.activeAssignments}
                  total={assignments.totalAssignments}
                  color="bg-blue-500"
                />
                <ProgressBar
                  label="기한 초과"
                  value={assignments.overdueCount}
                  total={assignments.totalAssignments}
                  color="bg-red-500"
                />
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">배정 회원 수</span>
                  <span className="font-medium">{assignments.memberCount}명</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              평점 현황
            </CardTitle>
            <CardDescription>
              연수 평점 획득 및 검증 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {credits.totalEarned.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">총 획득 평점</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {credits.averagePerMember.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">회원당 평균</div>
                </div>
              </div>
              {credits.pendingVerification > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">검증 대기 중</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100">
                      {credits.pendingVerification}건
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 작업</CardTitle>
          <CardDescription>자주 사용하는 관리 기능</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <QuickActionButton
              href="/admin/lms-yaksa/assignments"
              icon={BookOpen}
              label="강좌 배정"
              description="새로운 강좌 배정"
            />
            <QuickActionButton
              href="/admin/lms-yaksa/credits"
              icon={Award}
              label="평점 관리"
              description="평점 검증 및 조정"
            />
            <QuickActionButton
              href="/admin/lms-yaksa/required-policy"
              icon={FileText}
              label="정책 관리"
              description="필수 교육 정책"
            />
            <QuickActionButton
              href="/admin/lms-yaksa/license-profiles"
              icon={Users}
              label="회원 관리"
              description="면허 프로필 관리"
            />
          </div>
        </CardContent>
      </Card>
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
}

function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
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

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}건</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

function QuickActionButton({ href, icon: Icon, label, description }: QuickActionButtonProps) {
  return (
    <a
      href={href}
      className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent transition-colors"
    >
      <Icon className="h-8 w-8 mb-2 text-primary" />
      <span className="font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </a>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
