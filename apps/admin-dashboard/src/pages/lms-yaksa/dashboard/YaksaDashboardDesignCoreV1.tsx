/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Design Core Phase 2-B - Yaksa Dashboard Design Core v1 Variant
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @purpose Design Core v1.0 컴포넌트를 사용한 대시보드 Variant
 * @status Variant (기존 화면과 공존)
 * @date 2025-12-16
 *
 * 사용 컴포넌트:
 * - AGPageHeader: 페이지 헤더
 * - AGSection: 섹션 구분
 * - AGKPIBlock, AGKPIGrid: KPI 카드
 * - AGCard: 위젯 카드
 *
 * ⚠️ 이 Variant는 기존 화면을 대체하지 않으며, variant prop으로 선택됩니다.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { DashboardData } from '@/lib/api/lmsYaksa';
import { AGPageHeader } from '@o4o/ui/layout';
import { AGSection } from '@o4o/ui/layout';
import { AGKPIBlock, AGKPIGrid } from '@o4o/ui/ag-components';
import { AGCard } from '@o4o/ui/ag-components';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  FileText,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// Props Interface
// ═══════════════════════════════════════════════════════════════════════════

interface YaksaDashboardDesignCoreV1Props {
  dashboardData: DashboardData;
}

// ═══════════════════════════════════════════════════════════════════════════
// Design Core v1 Dashboard Variant
// ═══════════════════════════════════════════════════════════════════════════

export function YaksaDashboardDesignCoreV1({ dashboardData }: YaksaDashboardDesignCoreV1Props) {
  const { overview, assignments, credits, alerts } = dashboardData;

  // KPI 데이터 변환
  const kpiItems = [
    {
      title: '전체 회원',
      value: overview.totalMembers.toLocaleString(),
      subtitle: `갱신 필요: ${overview.membersRequiringRenewal}명`,
      colorMode: 'info' as const,
    },
    {
      title: '활성 정책',
      value: overview.activePolicies.toString(),
      subtitle: `필수 강좌: ${overview.requiredCourses}개`,
      colorMode: 'neutral' as const,
    },
    {
      title: '이수율',
      value: `${assignments.completionRate.toFixed(1)}%`,
      delta: assignments.completionRate >= 80 ? '+양호' : '-주의',
      trend: assignments.completionRate >= 80 ? 'up' as const : 'down' as const,
      subtitle: `${assignments.completedAssignments}/${assignments.totalAssignments} 완료`,
      colorMode: assignments.completionRate >= 80 ? 'positive' as const : 'negative' as const,
    },
    {
      title: '총 평점',
      value: credits.totalEarned.toFixed(1),
      subtitle: `평균: ${credits.averagePerMember.toFixed(1)} / 대기: ${credits.pendingVerification}`,
      colorMode: 'neutral' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header - AGPageHeader 사용 */}
      <AGPageHeader
        title="약사 LMS 대시보드"
        description="보수교육 및 연수 현황을 한눈에 확인합니다."
        icon={<BookOpen className="w-5 h-5" />}
      />

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Alerts Section - 기존 로직 유지, AGCard 사용 */}
        {(alerts.overdueAssignments > 0 ||
          alerts.unverifiedCredits > 0 ||
          alerts.renewalRequired > 0) && (
          <AGSection spacing="sm">
            <div className="grid gap-4 md:grid-cols-3">
              {alerts.overdueAssignments > 0 && (
                <AGCard padding="md" className="border-l-4 border-l-red-500">
                  <div className="flex items-center gap-3">
                    <span className="text-red-500">⚠️</span>
                    <div>
                      <p className="font-medium text-gray-900">기한 초과</p>
                      <p className="text-sm text-gray-500">
                        {alerts.overdueAssignments}건의 배정이 기한을 초과했습니다.
                      </p>
                    </div>
                  </div>
                </AGCard>
              )}
              {alerts.unverifiedCredits > 0 && (
                <AGCard padding="md" className="border-l-4 border-l-yellow-500">
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-500">📋</span>
                    <div>
                      <p className="font-medium text-gray-900">검증 대기</p>
                      <p className="text-sm text-gray-500">
                        {alerts.unverifiedCredits}건의 평점이 검증 대기 중입니다.
                      </p>
                    </div>
                  </div>
                </AGCard>
              )}
              {alerts.renewalRequired > 0 && (
                <AGCard padding="md" className="border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-500">🔄</span>
                    <div>
                      <p className="font-medium text-gray-900">갱신 필요</p>
                      <p className="text-sm text-gray-500">
                        {alerts.renewalRequired}명의 회원이 면허 갱신이 필요합니다.
                      </p>
                    </div>
                  </div>
                </AGCard>
              )}
            </div>
          </AGSection>
        )}

        {/* KPI Summary Section - AGKPIBlock + AGKPIGrid 사용 */}
        <AGSection
          title="핵심 지표"
          description="실시간 운영 현황"
          spacing="md"
        >
          <AGKPIGrid columns={4}>
            {kpiItems.map((kpi, index) => (
              <AGKPIBlock
                key={index}
                title={kpi.title}
                value={kpi.value}
                delta={kpi.delta}
                trend={kpi.trend}
                subtitle={kpi.subtitle}
                colorMode={kpi.colorMode}
              />
            ))}
          </AGKPIGrid>
        </AGSection>

        {/* Detailed Stats Section - AGCard 사용 */}
        <AGSection
          title="상세 현황"
          description="배정 및 평점 현황"
          spacing="lg"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Assignment Status Card */}
            <AGCard
              header={
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">강좌 배정 현황</span>
                </div>
              }
              padding="lg"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">전체 배정</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {assignments.totalAssignments}
                  </span>
                </div>
                <div className="space-y-3">
                  <ProgressItem
                    label="완료"
                    value={assignments.completedAssignments}
                    total={assignments.totalAssignments}
                    colorClass="bg-green-500"
                  />
                  <ProgressItem
                    label="진행 중"
                    value={assignments.activeAssignments}
                    total={assignments.totalAssignments}
                    colorClass="bg-blue-500"
                  />
                  <ProgressItem
                    label="기한 초과"
                    value={assignments.overdueCount}
                    total={assignments.totalAssignments}
                    colorClass="bg-red-500"
                  />
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">배정 회원 수</span>
                    <span className="font-medium text-gray-900">{assignments.memberCount}명</span>
                  </div>
                </div>
              </div>
            </AGCard>

            {/* Credits Summary Card */}
            <AGCard
              header={
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">평점 현황</span>
                </div>
              }
              padding="lg"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {credits.totalEarned.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">총 획득 평점</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {credits.averagePerMember.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">회원당 평균</div>
                  </div>
                </div>
                {credits.pendingVerification > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">⏳</span>
                        <span className="text-sm font-medium text-gray-700">검증 대기 중</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                        {credits.pendingVerification}건
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AGCard>
          </div>
        </AGSection>

        {/* Quick Actions Section - AGCard 사용 */}
        <AGSection
          title="빠른 작업"
          description="자주 사용하는 관리 기능"
          spacing="md"
        >
          <AGCard padding="lg">
            <div className="grid gap-4 md:grid-cols-4">
              <QuickActionItem
                href="/admin/lms-yaksa/assignments"
                icon={<BookOpen className="h-8 w-8" />}
                label="강좌 배정"
                description="새로운 강좌 배정"
              />
              <QuickActionItem
                href="/admin/lms-yaksa/credits"
                icon={<Award className="h-8 w-8" />}
                label="평점 관리"
                description="평점 검증 및 조정"
              />
              <QuickActionItem
                href="/admin/lms-yaksa/required-policy"
                icon={<FileText className="h-8 w-8" />}
                label="정책 관리"
                description="필수 교육 정책"
              />
              <QuickActionItem
                href="/admin/lms-yaksa/license-profiles"
                icon={<Users className="h-8 w-8" />}
                label="회원 관리"
                description="면허 프로필 관리"
              />
            </div>
          </AGCard>
        </AGSection>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components (파일 내부용)
// ═══════════════════════════════════════════════════════════════════════════

interface ProgressItemProps {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}

function ProgressItem({ label, value, total, colorClass }: ProgressItemProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-900">{value}건</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface QuickActionItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function QuickActionItem({ href, icon, label, description }: QuickActionItemProps) {
  return (
    <a
      href={href}
      className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="mb-2 text-blue-600">{icon}</div>
      <span className="font-medium text-gray-900">{label}</span>
      <span className="text-xs text-gray-500">{description}</span>
    </a>
  );
}

export default YaksaDashboardDesignCoreV1;

// ═══════════════════════════════════════════════════════════════════════════
// Design Core Phase 2-B Variant - End of File
// ═══════════════════════════════════════════════════════════════════════════
