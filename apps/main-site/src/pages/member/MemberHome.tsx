/**
 * MemberHome - Member Portal Dashboard
 *
 * Phase 20-A: 회원 포털 통합 대시보드
 * 회원이 "여기만 보면 된다"고 느끼는 단 하나의 화면
 *
 * 4개 탭:
 * - 내 자격 (membership-yaksa)
 * - 내 신고 (reporting-yaksa)
 * - 내 회비 (annualfee-yaksa)
 * - 내 교육 (lms-yaksa)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/context';
import { PageLoading } from '@/components/common';

// Types
interface MemberSummary {
  id: string;
  name: string;
  licenseNumber: string;
  isVerified: boolean;
  isActive: boolean;
  memberStatus: 'active' | 'inactive' | 'pending';
  licenseStatus: 'valid' | 'expiring_soon' | 'expired';
  lastVerifiedAt?: string;
}

interface ReportSummary {
  currentYear: number;
  latestReport?: {
    id: string;
    year: number;
    status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'SUBMITTED' | 'REJECTED';
    submittedAt?: string;
    updatedAt: string;
  };
  pendingCount: number;
  totalCount: number;
}

interface FeeSummary {
  currentYear: number;
  status: 'paid' | 'unpaid' | 'overdue' | 'exempted';
  amount: number;
  dueDate?: string;
  paidAt?: string;
  hasReceipt: boolean;
  overdueYears: number;
}

interface EducationSummary {
  completionRate: number;
  totalCredits: number;
  currentYearCredits: number;
  pendingRequiredCount: number;
  urgentDeadlineCount: number;
}

interface DashboardData {
  member: MemberSummary | null;
  report: ReportSummary | null;
  fee: FeeSummary | null;
  education: EducationSummary | null;
}

type TabId = 'qualification' | 'reports' | 'fees' | 'education';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'qualification', label: '내 자격', icon: '🪪' },
  { id: 'reports', label: '내 신고', icon: '📋' },
  { id: 'fees', label: '내 회비', icon: '💳' },
  { id: 'education', label: '내 교육', icon: '📚' },
];

export function MemberHome() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('qualification');
  const [data, setData] = useState<DashboardData>({
    member: null,
    report: null,
    fee: null,
    education: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 병렬로 각 앱의 summary API 호출
      const [memberRes, reportRes, feeRes, educationRes] = await Promise.allSettled([
        authClient.api.get('/membership/members/me/summary'),
        authClient.api.get('/reporting/my-report'),
        authClient.api.get('/annualfee/members/me/summary'),
        authClient.api.get('/lms/yaksa/member/dashboard'),
      ]);

      setData({
        member: memberRes.status === 'fulfilled' ? memberRes.value.data?.data : null,
        report: reportRes.status === 'fulfilled' ? transformReportData(reportRes.value.data) : null,
        fee: feeRes.status === 'fulfilled' ? feeRes.value.data?.data : null,
        education: educationRes.status === 'fulfilled' ? transformEducationData(educationRes.value.data) : null,
      });
    } catch (err: any) {
      setError('회원 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🔒</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h1>
          <p className="text-gray-600 mb-6">회원 포털을 이용하려면 로그인해 주세요.</p>
          <Link
            to="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoading message="회원 정보를 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">회원 포털</h1>
          <p className="text-gray-600 mt-1">
            {data.member?.name || (user as any)?.displayName || (user as any)?.name || '회원'}님, 환영합니다
          </p>
        </div>
      </div>

      {/* Alert Banner - 긴급 알림 */}
      <AlertBanner data={data} />

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex space-x-1" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <StatusDot tab={tab.id} data={data} />
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              type="button"
              onClick={loadDashboardData}
              className="mt-2 text-red-600 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {activeTab === 'qualification' && <QualificationTab data={data.member} />}
        {activeTab === 'reports' && <ReportsTab data={data.report} />}
        {activeTab === 'fees' && <FeesTab data={data.fee} />}
        {activeTab === 'education' && <EducationTab data={data.education} />}
      </div>
    </div>
  );
}

// ===== Alert Banner =====
function AlertBanner({ data }: { data: DashboardData }) {
  const alerts: { type: 'error' | 'warning'; message: string; link?: string }[] = [];

  // 면허 만료
  if (data.member?.licenseStatus === 'expired') {
    alerts.push({
      type: 'error',
      message: '면허가 만료되었습니다. 갱신이 필요합니다.',
      link: '/member/profile',
    });
  } else if (data.member?.licenseStatus === 'expiring_soon') {
    alerts.push({
      type: 'warning',
      message: '면허 만료가 임박했습니다.',
      link: '/member/profile',
    });
  }

  // 연회비 연체
  if (data.fee?.status === 'overdue') {
    alerts.push({
      type: 'error',
      message: `연회비가 연체되었습니다. (${data.fee.overdueYears}년)`,
      link: '/member/fees',
    });
  }

  // 필수 교육 마감 임박
  if (data.education && data.education.urgentDeadlineCount > 0) {
    alerts.push({
      type: 'warning',
      message: `${data.education.urgentDeadlineCount}개의 필수 교육 마감이 임박했습니다.`,
      link: '/member/lms/required-courses',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
      <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-3 rounded-lg ${
              alert.type === 'error' ? 'bg-red-100' : 'bg-orange-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{alert.type === 'error' ? '🚨' : '⚠️'}</span>
              <span className={alert.type === 'error' ? 'text-red-800' : 'text-orange-800'}>
                {alert.message}
              </span>
            </div>
            {alert.link && (
              <Link
                to={alert.link}
                className={`text-sm font-medium underline hover:no-underline ${
                  alert.type === 'error' ? 'text-red-700' : 'text-orange-700'
                }`}
              >
                확인하기 →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Status Dot =====
function StatusDot({ tab, data }: { tab: TabId; data: DashboardData }) {
  let hasIssue = false;

  switch (tab) {
    case 'qualification':
      hasIssue = data.member?.memberStatus !== 'active' || data.member?.licenseStatus !== 'valid';
      break;
    case 'reports':
      hasIssue = (data.report?.pendingCount || 0) > 0;
      break;
    case 'fees':
      hasIssue = data.fee?.status === 'unpaid' || data.fee?.status === 'overdue';
      break;
    case 'education':
      hasIssue = (data.education?.pendingRequiredCount || 0) > 0;
      break;
  }

  if (!hasIssue) return null;

  return (
    <span className="w-2 h-2 bg-red-500 rounded-full" />
  );
}

// ===== Qualification Tab =====
function QualificationTab({ data }: { data: MemberSummary | null }) {
  if (!data) {
    return (
      <EmptyCard
        icon="🪪"
        title="회원 정보를 불러올 수 없습니다"
        description="회원 등록이 필요하거나 일시적인 오류일 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 상태 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <StatusCard
          label="회원 상태"
          value={getMemberStatusLabel(data.memberStatus)}
          status={data.memberStatus === 'active' ? 'success' : 'warning'}
          icon="👤"
        />
        <StatusCard
          label="면허 상태"
          value={getLicenseStatusLabel(data.licenseStatus)}
          status={data.licenseStatus === 'valid' ? 'success' : data.licenseStatus === 'expiring_soon' ? 'warning' : 'error'}
          icon="📜"
        />
      </div>

      {/* 상세 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="이름" value={data.name} />
          <InfoRow label="면허번호" value={data.licenseNumber} />
          <InfoRow
            label="검증상태"
            value={
              <Badge variant={data.isVerified ? 'success' : 'warning'}>
                {data.isVerified ? '검증됨' : '미검증'}
              </Badge>
            }
          />
          <InfoRow
            label="최근 검증일"
            value={data.lastVerifiedAt ? formatDate(data.lastVerifiedAt) : '-'}
          />
        </div>
      </div>

      {/* 딥링크 */}
      <div className="flex gap-3">
        <Link
          to="/mypage/profile"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>👤</span>
          <span>회원 정보 상세</span>
        </Link>
        <Link
          to="/member/profile"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>🪪</span>
          <span>면허 정보 확인</span>
        </Link>
      </div>
    </div>
  );
}

// ===== Reports Tab =====
function ReportsTab({ data }: { data: ReportSummary | null }) {
  if (!data) {
    return (
      <EmptyCard
        icon="📋"
        title="신고서 정보를 불러올 수 없습니다"
        description="아직 신고서가 없거나 일시적인 오류일 수 있습니다."
      />
    );
  }

  const { latestReport } = data;

  return (
    <div className="space-y-6">
      {/* 상태 요약 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {data.currentYear}년 신상신고서
          </h3>
          {latestReport && (
            <Badge variant={getReportStatusVariant(latestReport.status)}>
              {getReportStatusLabel(latestReport.status)}
            </Badge>
          )}
        </div>

        {latestReport ? (
          <div className="space-y-3">
            <InfoRow
              label="상태"
              value={getReportStatusLabel(latestReport.status)}
            />
            {latestReport.submittedAt && (
              <InfoRow
                label="제출일"
                value={formatDate(latestReport.submittedAt)}
              />
            )}
            <InfoRow
              label="최근 수정"
              value={formatDate(latestReport.updatedAt)}
            />
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="text-4xl block mb-2">📝</span>
            <p className="text-gray-600 mb-4">아직 신고서가 작성되지 않았습니다.</p>
            <Link
              to="/member/reports/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              신고서 작성하기
            </Link>
          </div>
        )}
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">총 신고서</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">처리 대기</p>
          <p className={`text-2xl font-bold ${data.pendingCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {data.pendingCount}
          </p>
        </div>
      </div>

      {/* 딥링크 */}
      <div className="flex gap-3">
        <Link
          to="/member/reports"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>📋</span>
          <span>신고서 목록</span>
        </Link>
        {latestReport && (
          <Link
            to={`/member/reports/${latestReport.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>📝</span>
            <span>신고서 상세</span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ===== Fees Tab =====
function FeesTab({ data }: { data: FeeSummary | null }) {
  if (!data) {
    return (
      <EmptyCard
        icon="💳"
        title="회비 정보를 불러올 수 없습니다"
        description="일시적인 오류일 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 올해 회비 상태 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {data.currentYear}년 연회비
          </h3>
          <Badge variant={getFeeStatusVariant(data.status)}>
            {getFeeStatusLabel(data.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InfoRow
            label="금액"
            value={`${data.amount.toLocaleString()}원`}
          />
          <InfoRow
            label="상태"
            value={getFeeStatusLabel(data.status)}
          />
          {data.dueDate && data.status !== 'paid' && (
            <InfoRow
              label="납부 기한"
              value={formatDate(data.dueDate)}
            />
          )}
          {data.paidAt && (
            <InfoRow
              label="납부일"
              value={formatDate(data.paidAt)}
            />
          )}
        </div>

        {data.status === 'unpaid' && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800 text-sm">
              연회비 미납 상태입니다. 기한 내에 납부해 주세요.
            </p>
          </div>
        )}

        {data.status === 'overdue' && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="text-red-800 text-sm">
              연회비가 연체되었습니다. ({data.overdueYears}년) 빠른 납부 바랍니다.
            </p>
          </div>
        )}
      </div>

      {/* 영수증 */}
      {data.hasReceipt && data.status === 'paid' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧾</span>
              <div>
                <p className="font-medium text-gray-900">영수증</p>
                <p className="text-sm text-gray-500">{data.currentYear}년 연회비 납부 영수증</p>
              </div>
            </div>
            <Link
              to="/member/fees/receipt"
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              다운로드
            </Link>
          </div>
        </div>
      )}

      {/* 딥링크 */}
      <div className="flex gap-3">
        <Link
          to="/mypage/fee-status"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>💳</span>
          <span>회비 상세</span>
        </Link>
        <Link
          to="/mypage/fee-exemption"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>📝</span>
          <span>감면 신청</span>
        </Link>
      </div>
    </div>
  );
}

// ===== Education Tab =====
function EducationTab({ data }: { data: EducationSummary | null }) {
  if (!data) {
    return (
      <EmptyCard
        icon="📚"
        title="교육 정보를 불러올 수 없습니다"
        description="일시적인 오류일 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="필수 교육 이수율"
          value={`${data.completionRate.toFixed(0)}%`}
          icon="📊"
          highlight={data.completionRate < 100}
        />
        <StatCard
          label="총 누적 평점"
          value={data.totalCredits.toFixed(1)}
          icon="🏆"
        />
        <StatCard
          label="올해 평점"
          value={data.currentYearCredits.toFixed(1)}
          icon="📅"
        />
        <StatCard
          label="미이수 필수 교육"
          value={data.pendingRequiredCount.toString()}
          icon="⚠️"
          highlight={data.pendingRequiredCount > 0}
        />
      </div>

      {/* 이수율 프로그레스 바 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">필수 교육 이수 현황</h3>
          <span className="text-sm text-gray-500">{data.completionRate.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              data.completionRate >= 100 ? 'bg-green-600' :
              data.completionRate >= 50 ? 'bg-blue-600' : 'bg-orange-600'
            }`}
            style={{ width: `${Math.min(data.completionRate, 100)}%` }}
          />
        </div>
        {data.completionRate >= 100 && (
          <p className="mt-2 text-sm text-green-600">
            모든 필수 교육을 이수했습니다!
          </p>
        )}
        {data.urgentDeadlineCount > 0 && (
          <p className="mt-2 text-sm text-orange-600">
            {data.urgentDeadlineCount}개의 교육 마감이 임박했습니다.
          </p>
        )}
      </div>

      {/* 딥링크 */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/member/lms/dashboard"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>📊</span>
          <span>교육 대시보드</span>
        </Link>
        <Link
          to="/member/lms/required-courses"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>📋</span>
          <span>필수 교육</span>
        </Link>
        <Link
          to="/member/lms/credits"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>🏅</span>
          <span>평점 관리</span>
        </Link>
        <Link
          to="/member/lms/license"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>🪪</span>
          <span>면허 정보</span>
        </Link>
      </div>
    </div>
  );
}

// ===== Helper Components =====

function EmptyCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <span className="text-5xl block mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}

function StatusCard({
  label,
  value,
  status,
  icon,
}: {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error';
  icon: string;
}) {
  const colors = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
  };
  const textColors = {
    success: 'text-green-800',
    warning: 'text-yellow-800',
    error: 'text-red-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${textColors[status]}`}>{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
}) {
  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ===== Helper Functions =====

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getMemberStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '정상',
    inactive: '비활성',
    pending: '승인 대기',
  };
  return labels[status] || status;
}

function getLicenseStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    valid: '정상',
    expiring_soon: '만료 임박',
    expired: '만료됨',
  };
  return labels[status] || status;
}

function getReportStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: '작성 중',
    REVIEWED: '검토 중',
    APPROVED: '승인됨',
    SUBMITTED: '제출됨',
    REJECTED: '반려됨',
  };
  return labels[status] || status;
}

function getReportStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    DRAFT: 'neutral',
    REVIEWED: 'info',
    APPROVED: 'success',
    SUBMITTED: 'info',
    REJECTED: 'error',
  };
  return variants[status] || 'neutral';
}

function getFeeStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: '납부 완료',
    unpaid: '미납',
    overdue: '연체',
    exempted: '감면',
  };
  return labels[status] || status;
}

function getFeeStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    paid: 'success',
    unpaid: 'warning',
    overdue: 'error',
    exempted: 'info',
  };
  return variants[status] || 'neutral';
}

function transformReportData(response: any): ReportSummary | null {
  if (!response?.success || !response?.data) {
    return {
      currentYear: new Date().getFullYear(),
      pendingCount: 0,
      totalCount: 0,
    };
  }

  const report = response.data;
  return {
    currentYear: new Date().getFullYear(),
    latestReport: {
      id: report.id,
      year: report.year,
      status: report.status,
      submittedAt: report.submittedAt,
      updatedAt: report.updatedAt,
    },
    pendingCount: report.status === 'DRAFT' || report.status === 'REJECTED' ? 1 : 0,
    totalCount: 1, // API에서 상세 조회 시에는 1건만 반환
  };
}

function transformEducationData(response: any): EducationSummary | null {
  if (!response) return null;

  return {
    completionRate: response.statistics?.completionRate || 0,
    totalCredits: response.creditSummary?.totalCredits || 0,
    currentYearCredits: response.creditSummary?.currentYearCredits || 0,
    pendingRequiredCount: response.statistics?.pendingCount || 0,
    urgentDeadlineCount: response.pendingAssignments?.filter((a: any) => {
      if (!a.dueDate || a.isCompleted) return false;
      const daysUntilDue = Math.floor(
        (new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDue > 0 && daysUntilDue <= 7;
    }).length || 0,
  };
}

export default MemberHome;
