/**
 * LmsMemberLicense
 *
 * 약사 회원용 면허 정보 페이지
 * - 면허 기본 정보
 * - 갱신 상태 및 요건
 * - 평점 현황
 * - 갱신 이력
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { PageHeader, PageLoading, EmptyState } from '@/components/common';
import { LicenseProfileCard } from '@/components/lms-yaksa';
import type { LicenseProfile, CreditSummary } from '@/lib/api/lmsYaksaMember';

export function LmsMemberLicense() {
  const [profile, setProfile] = useState<LicenseProfile | null>(null);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLicenseInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [profileRes, summaryRes] = await Promise.all([
        authClient.api.get('/lms/yaksa/member/license'),
        authClient.api.get('/lms/yaksa/member/credits/summary'),
      ]);

      setProfile(profileRes.data);
      setCreditSummary(summaryRes.data);
    } catch (err: any) {
      console.error('Failed to load license info:', err);
      setError('면허 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicenseInfo();
  }, [loadLicenseInfo]);

  if (isLoading) {
    return <PageLoading message="면허 정보를 불러오는 중..." />;
  }

  // 갱신 요건 계산
  const renewalRequirements = calculateRenewalRequirements(profile, creditSummary);

  // 면허 상태 계산
  const licenseStatus = getLicenseStatus(profile);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="면허 정보"
        subtitle="면허 현황 및 갱신 관리"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '회원', href: '/member' },
          { label: '교육 대시보드', href: '/member/lms/dashboard' },
          { label: '면허 정보' },
        ]}
        actions={
          <Link
            to="/member/lms/dashboard"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← 대시보드로
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
            <button
              type="button"
              onClick={loadLicenseInfo}
              className="ml-4 text-red-600 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        ) : !profile ? (
          <EmptyState
            icon="🪪"
            title="면허 정보가 없습니다"
            description="등록된 면허 정보가 없습니다. 관리자에게 문의해주세요."
          />
        ) : (
          <div className="space-y-6">
            {/* 면허 상태 배너 */}
            <div
              className={`p-4 rounded-lg border ${
                licenseStatus.type === 'valid'
                  ? 'bg-green-50 border-green-200'
                  : licenseStatus.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{licenseStatus.icon}</span>
                <div>
                  <h3
                    className={`font-semibold ${
                      licenseStatus.type === 'valid'
                        ? 'text-green-800'
                        : licenseStatus.type === 'warning'
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}
                  >
                    {licenseStatus.title}
                  </h3>
                  <p
                    className={`text-sm ${
                      licenseStatus.type === 'valid'
                        ? 'text-green-700'
                        : licenseStatus.type === 'warning'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}
                  >
                    {licenseStatus.description}
                  </p>
                </div>
              </div>
            </div>

            {/* 면허 정보 카드 */}
            <LicenseProfileCard profile={profile} showDetails />

            {/* 갱신 요건 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">갱신 요건</h3>

              <div className="space-y-4">
                {renewalRequirements.map((req, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        req.isMet ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      {req.isMet ? (
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span className="text-gray-400 text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4
                        className={`font-medium ${
                          req.isMet ? 'text-green-800' : 'text-gray-900'
                        }`}
                      >
                        {req.title}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">{req.description}</p>
                      {req.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">진행률</span>
                            <span className="font-medium">
                              {req.current} / {req.required}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                req.isMet ? 'bg-green-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(req.progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 갱신 필요 시 안내 */}
              {profile.isRenewalRequired && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Link
                    to="/member/lms/required-courses"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    필수 교육 이수하기
                  </Link>
                </div>
              )}
            </div>

            {/* 면허 상세 정보 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">면허 상세 정보</h3>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <dt className="text-sm text-gray-500 mb-1">면허 번호</dt>
                  <dd className="font-medium text-gray-900">
                    {profile.licenseNumber || '미등록'}
                  </dd>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <dt className="text-sm text-gray-500 mb-1">면허 유형</dt>
                  <dd className="font-medium text-gray-900">
                    {profile.licenseType || '약사 면허'}
                  </dd>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <dt className="text-sm text-gray-500 mb-1">발급일</dt>
                  <dd className="font-medium text-gray-900">
                    {profile.licenseIssuedAt
                      ? new Date(profile.licenseIssuedAt).toLocaleDateString('ko-KR')
                      : '미등록'}
                  </dd>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <dt className="text-sm text-gray-500 mb-1">만료일</dt>
                  <dd className="font-medium text-gray-900">
                    {profile.licenseExpiresAt
                      ? new Date(profile.licenseExpiresAt).toLocaleDateString('ko-KR')
                      : '없음'}
                  </dd>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <dt className="text-sm text-gray-500 mb-1">마지막 검증일</dt>
                  <dd className="font-medium text-gray-900">
                    {profile.lastVerifiedAt
                      ? new Date(profile.lastVerifiedAt).toLocaleDateString('ko-KR')
                      : '미검증'}
                  </dd>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <dt className="text-sm text-gray-500 mb-1">총 누적 평점</dt>
                  <dd className="font-medium text-gray-900">
                    {profile.totalCredits.toFixed(1)} 평점
                  </dd>
                </div>
              </dl>
            </div>

            {/* 문의 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <h4 className="font-medium text-blue-800">도움이 필요하신가요?</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    면허 정보 수정이나 갱신 관련 문의는 관리자에게 연락해주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 면허 상태 계산
interface LicenseStatus {
  type: 'valid' | 'warning' | 'error';
  icon: string;
  title: string;
  description: string;
}

function getLicenseStatus(profile: LicenseProfile | null): LicenseStatus {
  if (!profile) {
    return {
      type: 'error',
      icon: '❌',
      title: '면허 정보 없음',
      description: '등록된 면허 정보가 없습니다.',
    };
  }

  if (profile.isRenewalRequired) {
    return {
      type: 'error',
      icon: '⚠️',
      title: '갱신 필요',
      description: '면허 갱신이 필요합니다. 필수 교육을 이수해주세요.',
    };
  }

  if (profile.licenseExpiresAt) {
    const daysUntilExpiry = Math.floor(
      (new Date(profile.licenseExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        type: 'error',
        icon: '🚨',
        title: '면허 만료',
        description: '면허가 만료되었습니다. 갱신 절차를 진행해주세요.',
      };
    }

    if (daysUntilExpiry <= 90) {
      return {
        type: 'warning',
        icon: '⏰',
        title: '만료 임박',
        description: `면허 만료까지 ${daysUntilExpiry}일 남았습니다.`,
      };
    }
  }

  return {
    type: 'valid',
    icon: '✅',
    title: '정상',
    description: '면허가 유효한 상태입니다.',
  };
}

// 갱신 요건 계산
interface RenewalRequirement {
  title: string;
  description: string;
  isMet: boolean;
  progress?: number;
  current?: string;
  required?: string;
}

function calculateRenewalRequirements(
  profile: LicenseProfile | null,
  summary: CreditSummary | null
): RenewalRequirement[] {
  const currentYear = new Date().getFullYear();
  const annualTarget = 8; // 연간 8평점 목표

  const requirements: RenewalRequirement[] = [];

  // 1. 연간 평점 요건
  const currentYearCredits = summary?.currentYearCredits || 0;
  requirements.push({
    title: `${currentYear}년 연간 평점`,
    description: '연간 최소 8평점 이상 취득해야 합니다.',
    isMet: currentYearCredits >= annualTarget,
    progress: (currentYearCredits / annualTarget) * 100,
    current: currentYearCredits.toFixed(1),
    required: annualTarget.toFixed(1),
  });

  // 2. 필수 교육 이수
  // Note: 실제로는 API에서 필수 교육 이수 현황을 받아야 함
  requirements.push({
    title: '필수 교육 이수',
    description: '지정된 필수 교육을 모두 이수해야 합니다.',
    isMet: !profile?.isRenewalRequired,
  });

  // 3. 면허 유효 기간
  if (profile?.licenseExpiresAt) {
    const isValid = new Date(profile.licenseExpiresAt) > new Date();
    requirements.push({
      title: '면허 유효 기간',
      description: '면허가 유효 기간 내에 있어야 합니다.',
      isMet: isValid,
    });
  }

  return requirements;
}

export default LmsMemberLicense;
