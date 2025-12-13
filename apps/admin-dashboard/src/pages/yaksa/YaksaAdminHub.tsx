/**
 * Yaksa Admin Hub - Integrated Dashboard
 *
 * Phase 19-D: 통합 행정 대시보드 UI
 * 운영자가 매일 첫 화면으로 여는 "한 장의 화면"
 *
 * 6 Widgets:
 * 1. 미납/연체 청구서 (annualfee)
 * 2. 면허 만료/갱신 임박 (membership)
 * 3. 교육 미이수/기한 임박 (lms)
 * 4. 승인 대기 신고서 (reporting)
 * 5. 자동화 실패 큐 (scheduler failure queue)
 * 6. Scheduler 상태/헬스 (jobs/last run/next run)
 *
 * Important: NO action buttons - Human-in-the-Loop maintained
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CreditCard,
  Shield,
  BookOpen,
  FileText,
  AlertTriangle,
  Activity,
  RefreshCw,
  Clock,
  ChevronRight,
  Building,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import {
  yaksaSchedulerApi,
  IntegratedDashboardData,
  OverdueInvoiceWidget,
  ExpiringVerificationWidget,
  PendingAssignmentWidget,
  PendingReportWidget,
  FailureQueueWidget,
  SchedulerHealthWidget,
} from '@/lib/api/yaksaScheduler';

// Mock data for development/fallback
const MOCK_DATA: IntegratedDashboardData = {
  overdueInvoices: {
    totalCount: 5,
    totalAmount: 250000,
    items: [
      { id: '1', invoiceNumber: 'INV-2024-001', memberName: '김약사', amount: 50000, dueDate: new Date('2024-11-01'), daysOverdue: 42 },
      { id: '2', invoiceNumber: 'INV-2024-002', memberName: '이약사', amount: 50000, dueDate: new Date('2024-11-15'), daysOverdue: 28 },
      { id: '3', invoiceNumber: 'INV-2024-003', memberName: '박약사', amount: 50000, dueDate: new Date('2024-12-01'), daysOverdue: 12 },
    ],
  },
  expiringVerifications: {
    thisWeekCount: 3,
    thisMonthCount: 12,
    items: [
      { id: '1', memberName: '정약사', licenseNumber: 'PH-2020-1234', expiresAt: new Date('2024-12-20'), daysUntilExpiry: 7 },
      { id: '2', memberName: '최약사', licenseNumber: 'PH-2019-5678', expiresAt: new Date('2024-12-25'), daysUntilExpiry: 12 },
    ],
  },
  pendingAssignments: {
    totalPending: 25,
    overdueCount: 5,
    nearDeadlineCount: 8,
    items: [
      { id: '1', memberName: '홍약사', courseName: '약사 보수교육 2024', assignedAt: new Date('2024-10-01'), dueDate: new Date('2024-12-31'), daysRemaining: 18 },
      { id: '2', memberName: '윤약사', courseName: '신규 의약품 교육', assignedAt: new Date('2024-11-01'), dueDate: new Date('2024-12-20'), daysRemaining: 7 },
    ],
  },
  pendingReports: {
    draftCount: 3,
    reviewedCount: 5,
    failedSubmissionCount: 1,
    items: [
      { id: '1', reportType: '연간 업무 보고서', reportYear: 2024, submitterName: '관리자', status: 'draft', submittedAt: undefined },
      { id: '2', reportType: '분기별 현황 보고', reportYear: 2024, submitterName: '담당자', status: 'reviewed', submittedAt: new Date('2024-12-10') },
    ],
  },
  failureQueue: {
    pendingCount: 2,
    exhaustedCount: 0,
    recentFailures: [
      { id: '1', jobName: 'invoice_overdue_check', targetService: 'annualfee-yaksa', errorMessage: 'DB connection timeout', failedAt: new Date('2024-12-13T10:30:00'), retryCount: 1 },
    ],
  },
  schedulerHealth: {
    activeJobs: 9,
    pausedJobs: 0,
    errorJobs: 0,
    recentRuns: [
      { jobId: '1', jobName: 'invoice_overdue_check', status: 'success', executedAt: new Date('2024-12-13T09:00:00'), duration: 1250 },
      { jobId: '2', jobName: 'verification_expiry_check', status: 'success', executedAt: new Date('2024-12-13T08:00:00'), duration: 890 },
    ],
    successRate: 98.5,
  },
  lastUpdated: new Date(),
};

export default function YaksaAdminHub() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<IntegratedDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);

  const organizationId = selectedOrgId || user?.organizationId;

  useEffect(() => {
    fetchDashboard();
  }, [organizationId]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await yaksaSchedulerApi.getIntegratedDashboard(organizationId);
      if (response.success && response.data) {
        setDashboardData(response.data);
      } else {
        // Use mock data in development
        console.warn('Using mock data:', response.error);
        setDashboardData(MOCK_DATA);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      // Use mock data as fallback
      setDashboardData(MOCK_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboard();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error && !dashboardData) {
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Yaksa Admin Hub</h1>
          <p className="text-muted-foreground">
            약사회 통합 행정 대시보드 - 모든 서비스 현황을 한눈에
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Organization Filter Placeholder */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4" />
            <span>{user?.organizationName || '전체 조직'}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-2 border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <Badge variant="outline" className="text-xs">
            최종 업데이트: {new Date(dashboardData.lastUpdated).toLocaleTimeString('ko-KR')}
          </Badge>
        </div>
      </div>

      {/* 6 Widget Grid - 2 rows x 3 columns */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Widget 1: 미납/연체 청구서 */}
        <OverdueInvoicesCard data={dashboardData.overdueInvoices} />

        {/* Widget 2: 면허 만료/갱신 임박 */}
        <ExpiringVerificationsCard data={dashboardData.expiringVerifications} />

        {/* Widget 3: 교육 미이수/기한 임박 */}
        <PendingAssignmentsCard data={dashboardData.pendingAssignments} />

        {/* Widget 4: 승인 대기 신고서 */}
        <PendingReportsCard data={dashboardData.pendingReports} />

        {/* Widget 5: 자동화 실패 큐 */}
        <FailureQueueCard data={dashboardData.failureQueue} />

        {/* Widget 6: Scheduler 상태/헬스 */}
        <SchedulerHealthCard data={dashboardData.schedulerHealth} />
      </div>
    </div>
  );
}

// ============================================
// Widget Components
// ============================================

interface OverdueInvoicesCardProps {
  data: OverdueInvoiceWidget;
}

function OverdueInvoicesCard({ data }: OverdueInvoicesCardProps) {
  const urgencyClass = data.totalCount > 10 ? 'border-red-500' : data.totalCount > 5 ? 'border-yellow-500' : 'border-green-500';

  return (
    <Card className={`border-l-4 ${urgencyClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-red-500" />
            미납/연체 청구서
          </CardTitle>
          <CardDescription>annualfee-yaksa</CardDescription>
        </div>
        <Link
          to="/admin/membership/fees"
          className="text-sm text-primary hover:underline flex items-center"
        >
          상세보기 <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold text-red-600">{data.totalCount}건</div>
              <div className="text-sm text-muted-foreground">
                총 {data.totalAmount.toLocaleString()}원
              </div>
            </div>
            {data.totalCount > 0 && (
              <Badge variant="destructive">요주의</Badge>
            )}
          </div>
          {data.items.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">최근 연체 목록</div>
              {data.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[120px]">{item.memberName}</span>
                  <span className="text-red-500 font-medium">
                    {item.daysOverdue}일 연체
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExpiringVerificationsCardProps {
  data: ExpiringVerificationWidget;
}

function ExpiringVerificationsCard({ data }: ExpiringVerificationsCardProps) {
  const urgencyClass = data.thisWeekCount > 5 ? 'border-red-500' : data.thisWeekCount > 0 ? 'border-yellow-500' : 'border-green-500';

  return (
    <Card className={`border-l-4 ${urgencyClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-500" />
            면허 만료/갱신 임박
          </CardTitle>
          <CardDescription>membership-yaksa</CardDescription>
        </div>
        <Link
          to="/admin/membership/verifications"
          className="text-sm text-primary hover:underline flex items-center"
        >
          상세보기 <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{data.thisWeekCount}</div>
              <div className="text-xs text-muted-foreground">이번 주</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{data.thisMonthCount}</div>
              <div className="text-xs text-muted-foreground">이번 달</div>
            </div>
          </div>
          {data.items.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">만료 임박</div>
              {data.items.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[120px]">{item.memberName}</span>
                  <span className={`font-medium ${item.daysUntilExpiry <= 7 ? 'text-red-500' : 'text-yellow-500'}`}>
                    D-{item.daysUntilExpiry}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PendingAssignmentsCardProps {
  data: PendingAssignmentWidget;
}

function PendingAssignmentsCard({ data }: PendingAssignmentsCardProps) {
  const urgencyClass = data.overdueCount > 5 ? 'border-red-500' : data.overdueCount > 0 ? 'border-yellow-500' : 'border-green-500';

  return (
    <Card className={`border-l-4 ${urgencyClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            교육 미이수/기한 임박
          </CardTitle>
          <CardDescription>lms-yaksa</CardDescription>
        </div>
        <Link
          to="/admin/lms-yaksa/assignments"
          className="text-sm text-primary hover:underline flex items-center"
        >
          상세보기 <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-3xl font-bold">{data.totalPending}</div>
              <div className="text-xs text-muted-foreground">미이수 건</div>
            </div>
            <div className="flex gap-2">
              {data.overdueCount > 0 && (
                <Badge variant="destructive">{data.overdueCount} 초과</Badge>
              )}
              {data.nearDeadlineCount > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  {data.nearDeadlineCount} 임박
                </Badge>
              )}
            </div>
          </div>
          {data.items.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">마감 임박</div>
              {data.items.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[100px]">{item.memberName}</span>
                  <span className="truncate max-w-[80px] text-muted-foreground text-xs">{item.courseName}</span>
                  {item.daysRemaining !== undefined && (
                    <span className={`font-medium ${item.daysRemaining <= 7 ? 'text-red-500' : 'text-blue-500'}`}>
                      D-{item.daysRemaining}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PendingReportsCardProps {
  data: PendingReportWidget;
}

function PendingReportsCard({ data }: PendingReportsCardProps) {
  const totalPending = data.draftCount + data.reviewedCount;
  const urgencyClass = data.failedSubmissionCount > 0 ? 'border-red-500' : totalPending > 5 ? 'border-yellow-500' : 'border-green-500';

  return (
    <Card className={`border-l-4 ${urgencyClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            승인 대기 신고서
          </CardTitle>
          <CardDescription>reporting-yaksa</CardDescription>
        </div>
        <Link
          to="/admin/reporting/submissions"
          className="text-sm text-primary hover:underline flex items-center"
        >
          상세보기 <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-600">{data.draftCount}</div>
              <div className="text-xs text-muted-foreground">초안</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{data.reviewedCount}</div>
              <div className="text-xs text-muted-foreground">검토됨</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">{data.failedSubmissionCount}</div>
              <div className="text-xs text-muted-foreground">실패</div>
            </div>
          </div>
          {data.items.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">최근 대기</div>
              {data.items.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[140px]">{item.reportType}</span>
                  <Badge variant="outline" className="text-xs">
                    {item.status === 'draft' ? '초안' : item.status === 'reviewed' ? '검토됨' : item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface FailureQueueCardProps {
  data: FailureQueueWidget;
}

function FailureQueueCard({ data }: FailureQueueCardProps) {
  const urgencyClass = data.exhaustedCount > 0 ? 'border-red-500' : data.pendingCount > 0 ? 'border-yellow-500' : 'border-green-500';

  return (
    <Card className={`border-l-4 ${urgencyClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            자동화 실패 큐
          </CardTitle>
          <CardDescription>yaksa-scheduler</CardDescription>
        </div>
        <Link
          to="/admin/yaksa-scheduler/failures"
          className="text-sm text-primary hover:underline flex items-center"
        >
          상세보기 <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{data.pendingCount}</div>
              <div className="text-xs text-muted-foreground">재시도 대기</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{data.exhaustedCount}</div>
              <div className="text-xs text-muted-foreground">재시도 소진</div>
            </div>
          </div>
          {data.recentFailures.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">최근 실패</div>
              {data.recentFailures.slice(0, 2).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[120px] font-medium">{item.jobName}</span>
                    <span className="text-xs text-muted-foreground">{item.targetService}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.retryCount}회
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {data.pendingCount === 0 && data.exhaustedCount === 0 && (
            <div className="flex items-center justify-center gap-2 text-green-600 py-4">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">실패 없음</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SchedulerHealthCardProps {
  data: SchedulerHealthWidget;
}

function SchedulerHealthCard({ data }: SchedulerHealthCardProps) {
  const isHealthy = data.errorJobs === 0 && data.successRate >= 95;
  const urgencyClass = data.errorJobs > 0 ? 'border-red-500' : data.successRate < 90 ? 'border-yellow-500' : 'border-green-500';

  return (
    <Card className={`border-l-4 ${urgencyClass}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Scheduler 상태
          </CardTitle>
          <CardDescription>Jobs / Health</CardDescription>
        </div>
        <Link
          to="/admin/yaksa-scheduler/jobs"
          className="text-sm text-primary hover:underline flex items-center"
        >
          상세보기 <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <span className={`text-lg font-semibold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {isHealthy ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
            <Badge variant={isHealthy ? 'default' : 'destructive'} className="text-xs">
              {data.successRate.toFixed(1)}% 성공률
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{data.activeJobs}</div>
              <div className="text-xs text-muted-foreground">활성</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-600">{data.pausedJobs}</div>
              <div className="text-xs text-muted-foreground">일시중지</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">{data.errorJobs}</div>
              <div className="text-xs text-muted-foreground">오류</div>
            </div>
          </div>
          {data.recentRuns.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground">최근 실행</div>
              {data.recentRuns.slice(0, 2).map((run) => (
                <div key={run.jobId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {run.status === 'success' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="truncate max-w-[100px]">{run.jobName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {run.duration}ms
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Skeleton Component
// ============================================

function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
