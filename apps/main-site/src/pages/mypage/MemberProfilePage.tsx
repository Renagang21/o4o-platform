/**
 * MemberProfilePage
 *
 * Phase 2: 회원 마이페이지 고도화
 * - 기본 정보 조회
 * - 소속 정보 (주 소속 + 겸직)
 * - 연회비 현황
 * - 내 변경 이력 조회
 */

import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@/context';
import { PageLoading } from '@/components/common';

// Type definitions matching membership-yaksa
type PharmacistType = 'working' | 'owner' | 'hospital' | 'public' | 'industry' | 'retired' | 'other';
type WorkplaceType = 'pharmacy' | 'hospital' | 'public' | 'company' | 'education' | 'research' | 'other';
type OfficialRole = 'president' | 'vice_president' | 'general_manager' | 'auditor' | 'director' | 'branch_head' | 'district_head' | 'none';
type Gender = 'male' | 'female' | 'other';

const PHARMACIST_TYPE_LABELS: Record<PharmacistType, string> = {
  working: '근무약사',
  owner: '개설약사',
  hospital: '병원약사',
  public: '공직약사',
  industry: '산업약사',
  retired: '은퇴약사',
  other: '기타',
};

const WORKPLACE_TYPE_LABELS: Record<WorkplaceType, string> = {
  pharmacy: '약국',
  hospital: '병원',
  public: '관공서',
  company: '기업',
  education: '교육기관',
  research: '연구기관',
  other: '기타',
};

const OFFICIAL_ROLE_LABELS: Record<OfficialRole, string> = {
  president: '회장',
  vice_president: '부회장',
  general_manager: '총무',
  auditor: '감사',
  director: '이사',
  branch_head: '지부장',
  district_head: '분회장',
  none: '일반회원',
};

const GENDER_LABELS: Record<Gender, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
};

interface Affiliation {
  id: string;
  organizationId: string;
  organizationName?: string;
  position: string;
  isPrimary: boolean;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

interface MembershipYear {
  id: string;
  year: number;
  amount: number;
  paid: boolean;
  paidAt?: string;
  dueDate?: string;
}

interface AuditLog {
  id: string;
  action: string;
  changedFields: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    label: string;
  }>;
  createdAt: string;
}

interface MemberProfile {
  id: string;
  licenseNumber: string;
  name: string;
  birthdate: string;
  phone?: string;
  email?: string;
  isVerified: boolean;
  isActive: boolean;
  // Phase 1 fields
  gender?: Gender;
  licenseIssuedAt?: string;
  licenseRenewalAt?: string;
  pharmacistType?: PharmacistType;
  pharmacyName?: string;
  pharmacyAddress?: string;
  workplaceName?: string;
  workplaceAddress?: string;
  workplaceType?: WorkplaceType;
  yaksaJoinDate?: string;
  officialRole?: OfficialRole;
  registrationNumber?: string;
  category?: {
    id: string;
    name: string;
  };
  // Phase 2 fields
  affiliations?: Affiliation[];
  membershipYears?: MembershipYear[];
}

type ActiveTab = 'profile' | 'affiliations' | 'fees' | 'history';

export function MemberProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await authClient.api.get('/membership/me');
      if (response.data.success) {
        setProfile(response.data.data);
      } else {
        setError('회원 정보를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('회원 정보가 등록되지 않았습니다. 관리자에게 문의해 주세요.');
      } else {
        setError('회원 정보를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  /**
   * WO-O4O-MEMBERSHIP-UI-API-CONTRACT-AUDIT-AND-MINIMAL-RECOVERY-V1
   *
   * 회원 변경 이력(감사 로그) 기능은 **프로덕션 미배포** 상태다
   *   - `yaksa_member_audit_logs` 를 만드는 migration 이 없고 프로덕션에 테이블이 없다(read-only 실측).
   * 기존 호출 경로 `/membership/audit-logs/member/:id` 도 **존재하지 않는 route** 였다.
   *
   * 게다가 정상 route(`/membership/members/:memberId/logs`)는 현재
   * 플랫폼 관리자 전용 guard 아래에 있어 **회원 본인은 접근할 수 없다**.
   * 회원 본인에게 자기 이력을 열어주려면 별도 권한 설계가 필요하므로 여기서 결정하지 않는다.
   *
   * 없는 endpoint 호출만 제거하고 아래 UI 는 기존 빈 상태를 그대로 렌더한다.
   * 기능 배포와 본인 열람 권한은 별도 후속 WO 로 분리한다.
   */
  const loadAuditLogs = useCallback(async () => {
    if (!profile?.id) return;
    setAuditLogs([]);
  }, [profile?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (activeTab === 'history' && profile?.id) {
      loadAuditLogs();
    }
  }, [activeTab, profile?.id, loadAuditLogs]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoading message="회원 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const primaryAffiliation = profile.affiliations?.find((a) => a.isPrimary);
  const secondaryAffiliations = profile.affiliations?.filter((a) => !a.isPrimary) || [];
  const currentYear = new Date().getFullYear();
  const currentYearFee = profile.membershipYears?.find((y) => y.year === currentYear);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">내 회원 정보</h1>
          <p className="text-gray-600 mt-1">약사회 회원 정보를 확인하세요</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'profile', label: '기본 정보' },
              { id: 'affiliations', label: '소속 정보' },
              { id: 'fees', label: '연회비' },
              { id: 'history', label: '변경 이력' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <>
            {/* 기본 정보 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  👤
                </span>
                기본 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="이름" value={profile.name} />
                <InfoRow label="면허번호" value={profile.licenseNumber} />
                <InfoRow label="생년월일" value={formatDate(profile.birthdate)} />
                <InfoRow
                  label="성별"
                  value={profile.gender ? GENDER_LABELS[profile.gender] : '-'}
                />
                <InfoRow label="연락처" value={profile.phone || '-'} />
                <InfoRow label="이메일" value={profile.email || '-'} />
                <InfoRow
                  label="회원분류"
                  value={profile.category?.name || '-'}
                />
                <InfoRow
                  label="회원등록번호"
                  value={profile.registrationNumber || '-'}
                />
              </div>
            </div>

            {/* 면허 정보 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  📜
                </span>
                면허 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="면허번호" value={profile.licenseNumber} />
                <InfoRow
                  label="발급일"
                  value={profile.licenseIssuedAt ? formatDate(profile.licenseIssuedAt) : '-'}
                />
                <InfoRow
                  label="갱신일"
                  value={profile.licenseRenewalAt ? formatDate(profile.licenseRenewalAt) : '-'}
                />
                <InfoRow
                  label="검증상태"
                  value={
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profile.isVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {profile.isVerified ? '검증됨' : '미검증'}
                    </span>
                  }
                />
              </div>
            </div>

            {/* 약사 유형 & 직책 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  💊
                </span>
                약사 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  label="약사유형"
                  value={
                    profile.pharmacistType
                      ? PHARMACIST_TYPE_LABELS[profile.pharmacistType]
                      : '-'
                  }
                />
                <InfoRow
                  label="약사회 직책"
                  value={
                    profile.officialRole && profile.officialRole !== 'none' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {OFFICIAL_ROLE_LABELS[profile.officialRole]}
                      </span>
                    ) : (
                      OFFICIAL_ROLE_LABELS.none
                    )
                  }
                />
                <InfoRow
                  label="약사회 가입일"
                  value={profile.yaksaJoinDate ? formatDate(profile.yaksaJoinDate) : '-'}
                />
                <InfoRow
                  label="회원상태"
                  value={
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profile.isActive
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {profile.isActive ? '활성' : '비활성'}
                    </span>
                  }
                />
              </div>
            </div>

            {/* 근무지 정보 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                  🏥
                </span>
                근무지 정보
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  label="근무지명"
                  value={profile.workplaceName || profile.pharmacyName || '-'}
                />
                <InfoRow
                  label="근무지유형"
                  value={
                    profile.workplaceType
                      ? WORKPLACE_TYPE_LABELS[profile.workplaceType]
                      : '-'
                  }
                />
                <InfoRow
                  label="근무지 주소"
                  value={profile.workplaceAddress || profile.pharmacyAddress || '-'}
                  className="md:col-span-2"
                />
              </div>
            </div>
          </>
        )}

        {/* Affiliations Tab */}
        {activeTab === 'affiliations' && (
          <>
            {/* 주 소속 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  🏛️
                </span>
                주 소속
              </h2>
              {primaryAffiliation ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow
                    label="소속 조직"
                    value={primaryAffiliation.organizationName || primaryAffiliation.organizationId}
                  />
                  <InfoRow label="직위" value={primaryAffiliation.position || '-'} />
                  <InfoRow label="소속일" value={formatDate(primaryAffiliation.startDate)} />
                  <InfoRow
                    label="상태"
                    value={
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        주 소속
                      </span>
                    }
                  />
                </div>
              ) : (
                <p className="text-gray-500">등록된 주 소속이 없습니다.</p>
              )}
            </div>

            {/* 겸직 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  🔗
                </span>
                겸직 현황
              </h2>
              {secondaryAffiliations.length > 0 ? (
                <div className="space-y-4">
                  {secondaryAffiliations.map((aff) => (
                    <div key={aff.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">조직</p>
                          <p className="font-medium">{aff.organizationName || aff.organizationId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">직위</p>
                          <p className="font-medium">{aff.position || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">기간</p>
                          <p className="font-medium">
                            {formatDate(aff.startDate)}
                            {aff.endDate && ` ~ ${formatDate(aff.endDate)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">등록된 겸직이 없습니다.</p>
              )}
            </div>
          </>
        )}

        {/* Fees Tab */}
        {activeTab === 'fees' && (
          <>
            {/* 올해 연회비 현황 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  💳
                </span>
                {currentYear}년 연회비
              </h2>
              {currentYearFee ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow
                    label="납부 상태"
                    value={
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          currentYearFee.paid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {currentYearFee.paid ? '납부 완료' : '미납'}
                      </span>
                    }
                  />
                  <InfoRow
                    label="금액"
                    value={`${currentYearFee.amount.toLocaleString()}원`}
                  />
                  {currentYearFee.paid && currentYearFee.paidAt && (
                    <InfoRow label="납부일" value={formatDate(currentYearFee.paidAt)} />
                  )}
                  {!currentYearFee.paid && currentYearFee.dueDate && (
                    <InfoRow label="납부 기한" value={formatDate(currentYearFee.dueDate)} />
                  )}
                </div>
              ) : (
                <p className="text-gray-500">연회비 정보가 없습니다.</p>
              )}
            </div>

            {/* 연회비 이력 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">연회비 납부 이력</h2>
              {profile.membershipYears && profile.membershipYears.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          연도
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          금액
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          상태
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          납부일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {profile.membershipYears
                        .sort((a, b) => b.year - a.year)
                        .map((year) => (
                          <tr key={year.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{year.year}년</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {year.amount.toLocaleString()}원
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  year.paid
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {year.paid ? '납부' : '미납'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {year.paidAt ? formatDate(year.paidAt) : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">납부 이력이 없습니다.</p>
              )}
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                📋
              </span>
              최근 변경 이력
            </h2>
            {auditLogs.length > 0 ? (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.action === 'create'
                            ? 'bg-green-100 text-green-800'
                            : log.action === 'update'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.action === 'create' ? '생성' : log.action === 'update' ? '수정' : log.action}
                      </span>
                      <span className="text-sm text-gray-500">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <div className="space-y-1">
                      {log.changedFields.slice(0, 5).map((field, idx) => (
                        <p key={idx} className="text-sm text-gray-600">
                          <span className="font-medium">{field.label || field.field}:</span>{' '}
                          {formatValue(field.oldValue)} → {formatValue(field.newValue)}
                        </p>
                      ))}
                      {log.changedFields.length > 5 && (
                        <p className="text-sm text-gray-400">
                          +{log.changedFields.length - 5}개 필드 변경
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">변경 이력이 없습니다.</p>
            )}
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            회원 정보 수정이 필요하시면 관리자에게 문의하시거나 신상신고서를 제출해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper component
function InfoRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

// Helper functions
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '(없음)';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  return String(value);
}

export default MemberProfilePage;
