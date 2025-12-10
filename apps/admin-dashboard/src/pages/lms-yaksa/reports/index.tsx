/**
 * LMS-Yaksa Reports Page
 *
 * Generate and view various LMS reports and statistics
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Download,
  AlertTriangle,
  Users,
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  FileText,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  adminApi,
  AdminStats,
  LicenseProfile,
  CourseAssignment,
} from '@/lib/api/lmsYaksa';
import { AssignmentStatusTag, CreditBadge } from '@/components/lms-yaksa';
import { useAuth } from '@o4o/auth-context';

export default function ReportsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [expiringLicenses, setExpiringLicenses] = useState<LicenseProfile[]>([]);
  const [overdueAssignments, setOverdueAssignments] = useState<CourseAssignment[]>([]);
  const [pendingCoursesData, setPendingCoursesData] = useState<{
    summary: {
      totalRequiredCourses: number;
      totalAssignments: number;
      totalCompleted: number;
      totalPending: number;
      totalOverdue: number;
    };
    courses: Array<{
      courseId: string;
      totalAssigned: number;
      completed: number;
      inProgress: number;
      pending: number;
      overdue: number;
      completionRate: number;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // TODO: Get organization ID from user context or route params
  const organizationId = user?.organizationId || 'default-org';

  // Fetch all reports data
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsRes, expiringRes, overdueRes, pendingRes] = await Promise.all([
        adminApi.getStats(organizationId),
        adminApi.getLicenseExpiring(organizationId),
        adminApi.getOverdueAssignments(organizationId),
        adminApi.getPendingRequiredCourses(organizationId),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (expiringRes.success && expiringRes.data) {
        setExpiringLicenses(expiringRes.data);
      }
      if (overdueRes.success && overdueRes.data) {
        setOverdueAssignments(overdueRes.data);
      }
      if (pendingRes.success && pendingRes.data) {
        setPendingCoursesData(pendingRes.data);
      }
    } catch (err) {
      setError('보고서 데이터를 불러오는데 실패했습니다.');
      console.error('Fetch reports error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Expire overdue assignments
  const handleExpireOverdue = async () => {
    try {
      const response = await adminApi.expireOverdue();
      if (response.success && response.data) {
        alert(`${response.data.expiredCount}건의 배정이 만료 처리되었습니다.`);
        fetchReports();
      }
    } catch (err) {
      setError('만료 처리 중 오류가 발생했습니다.');
    }
  };

  // Export functions (mock implementations)
  const handleExportCSV = (reportType: string) => {
    // In real implementation, this would generate and download a CSV file
    alert(`${reportType} 보고서를 CSV로 내보냅니다.`);
  };

  const handleExportPDF = (reportType: string) => {
    // In real implementation, this would generate and download a PDF file
    alert(`${reportType} 보고서를 PDF로 내보냅니다.`);
  };

  if (isLoading) {
    return <ReportsPageSkeleton />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">보고서 및 통계</h1>
          <p className="text-muted-foreground">
            LMS 현황 및 다양한 통계 보고서를 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="전체 회원"
            value={stats.members.totalProfiles}
            icon={Users}
            description={`갱신 필요: ${stats.members.profilesRequiringRenewal}명`}
          />
          <StatCard
            title="이수율"
            value={`${stats.assignments.completionRate.toFixed(1)}%`}
            icon={TrendingUp}
            description={`${stats.assignments.completedAssignments}/${stats.assignments.totalAssignments}`}
            trend={stats.assignments.completionRate >= 80 ? 'up' : 'down'}
          />
          <StatCard
            title="총 평점"
            value={stats.members.totalCreditsEarned.toFixed(1)}
            icon={Award}
            description={`평균: ${stats.members.averageCreditsPerMember.toFixed(1)}`}
          />
          <StatCard
            title="활성 정책"
            value={stats.policies.activeCount}
            icon={FileText}
            description="현재 활성화된 정책"
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">종합 현황</TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            필수 강좌
            {pendingCoursesData && pendingCoursesData.summary.totalOverdue > 0 && (
              <Badge variant="destructive" className="text-xs">
                {pendingCoursesData.summary.totalOverdue}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            면허 갱신
            {expiringLicenses.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {expiringLicenses.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            기한 초과
            {overdueAssignments.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueAssignments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Assignment Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    강좌 배정 현황
                  </CardTitle>
                  <CardDescription>전체 배정 상태 분포</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCSV('강좌배정')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">
                          {stats.assignments.totalAssignments}
                        </p>
                        <p className="text-sm text-muted-foreground">전체 배정</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">
                          {stats.assignments.completedAssignments}
                        </p>
                        <p className="text-sm text-muted-foreground">완료</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <ProgressBar
                        label="완료"
                        value={stats.assignments.completedAssignments}
                        total={stats.assignments.totalAssignments}
                        color="bg-green-500"
                      />
                      <ProgressBar
                        label="진행 중"
                        value={stats.assignments.activeAssignments}
                        total={stats.assignments.totalAssignments}
                        color="bg-blue-500"
                      />
                      <ProgressBar
                        label="기한 초과"
                        value={stats.assignments.overdueAssignments}
                        total={stats.assignments.totalAssignments}
                        color="bg-red-500"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Member Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    회원 현황
                  </CardTitle>
                  <CardDescription>면허 및 평점 현황</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCSV('회원현황')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-3xl font-bold text-purple-600">
                          {stats.members.totalProfiles}
                        </p>
                        <p className="text-sm text-muted-foreground">전체 회원</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-3xl font-bold text-orange-600">
                          {stats.members.profilesRequiringRenewal}
                        </p>
                        <p className="text-sm text-muted-foreground">갱신 필요</p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">총 획득 평점</span>
                        <span className="text-lg font-bold">
                          {stats.members.totalCreditsEarned.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">회원당 평균</span>
                        <span className="text-lg font-bold">
                          {stats.members.averageCreditsPerMember.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  필수 강좌 이수 현황
                </CardTitle>
                <CardDescription>강좌별 이수 및 미이수 현황</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCSV('필수강좌')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportPDF('필수강좌')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingCoursesData ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">
                        {pendingCoursesData.summary.totalRequiredCourses}
                      </p>
                      <p className="text-xs text-muted-foreground">필수 강좌</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {pendingCoursesData.summary.totalAssignments}
                      </p>
                      <p className="text-xs text-muted-foreground">전체 배정</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {pendingCoursesData.summary.totalCompleted}
                      </p>
                      <p className="text-xs text-muted-foreground">완료</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        {pendingCoursesData.summary.totalPending}
                      </p>
                      <p className="text-xs text-muted-foreground">대기</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {pendingCoursesData.summary.totalOverdue}
                      </p>
                      <p className="text-xs text-muted-foreground">기한 초과</p>
                    </div>
                  </div>

                  {/* Course Table */}
                  {pendingCoursesData.courses.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>강좌 ID</TableHead>
                          <TableHead>전체 배정</TableHead>
                          <TableHead>완료</TableHead>
                          <TableHead>진행 중</TableHead>
                          <TableHead>대기</TableHead>
                          <TableHead>기한 초과</TableHead>
                          <TableHead>이수율</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingCoursesData.courses.map((course) => (
                          <TableRow key={course.courseId}>
                            <TableCell className="font-mono text-sm">
                              {course.courseId.substring(0, 12)}...
                            </TableCell>
                            <TableCell>{course.totalAssigned}</TableCell>
                            <TableCell className="text-green-600">{course.completed}</TableCell>
                            <TableCell className="text-blue-600">{course.inProgress}</TableCell>
                            <TableCell>{course.pending}</TableCell>
                            <TableCell className="text-red-600">{course.overdue}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500"
                                    style={{ width: `${course.completionRate}%` }}
                                  />
                                </div>
                                <span className="text-sm">
                                  {course.completionRate.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      필수 강좌 데이터가 없습니다.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  데이터를 불러오는 중...
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expiring Licenses Tab */}
        <TabsContent value="expiring">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  면허 갱신 필요 회원
                </CardTitle>
                <CardDescription>
                  면허 만료가 임박하거나 갱신이 필요한 회원 목록
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCSV('면허갱신')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expiringLicenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자 ID</TableHead>
                      <TableHead>면허 번호</TableHead>
                      <TableHead>만료일</TableHead>
                      <TableHead>총 평점</TableHead>
                      <TableHead>당해 평점</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringLicenses.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-mono text-sm">
                          {profile.userId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{profile.licenseNumber || '-'}</TableCell>
                        <TableCell>
                          {profile.licenseExpiresAt
                            ? new Date(profile.licenseExpiresAt).toLocaleDateString('ko-KR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <CreditBadge credits={profile.totalCredits} size="sm" />
                        </TableCell>
                        <TableCell>
                          <CreditBadge credits={profile.currentYearCredits} size="sm" />
                        </TableCell>
                        <TableCell>
                          {profile.isRenewalRequired ? (
                            <Badge variant="destructive">갱신 필요</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600">
                              정상
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  면허 갱신이 필요한 회원이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Tab */}
        <TabsContent value="overdue">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Clock className="h-5 w-5" />
                  기한 초과 배정
                </CardTitle>
                <CardDescription>마감일이 지났지만 완료되지 않은 배정</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCSV('기한초과')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                {overdueAssignments.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleExpireOverdue}>
                    <Clock className="h-4 w-4 mr-2" />
                    일괄 만료 처리
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {overdueAssignments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자 ID</TableHead>
                      <TableHead>강좌 ID</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>진행률</TableHead>
                      <TableHead>마감일</TableHead>
                      <TableHead>배정일</TableHead>
                      <TableHead>필수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-mono text-sm">
                          {assignment.userId.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {assignment.courseId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <AssignmentStatusTag
                            status={assignment.status}
                            isOverdue={true}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${assignment.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-sm">{assignment.progressPercent}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-red-600">
                          {assignment.dueDate
                            ? new Date(assignment.dueDate).toLocaleDateString('ko-KR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(assignment.assignedAt).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          {assignment.isMandatory ? (
                            <Badge variant="destructive" className="text-xs">
                              필수
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              선택
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  기한 초과 배정이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
        <span className="font-medium">
          {value}건 ({percentage.toFixed(1)}%)
        </span>
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

function ReportsPageSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
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
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
