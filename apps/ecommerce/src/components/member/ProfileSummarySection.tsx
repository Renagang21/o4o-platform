/**
 * ProfileSummarySection
 *
 * Phase 4: 프로필 요약 섹션
 *
 * 표시:
 * - 이름
 * - 면허번호 (READ-ONLY - 텍스트로만 표시)
 * - 약사 유형
 * - 소속 조직
 *
 * Policy Enforcement:
 * - 면허번호: 입력 컴포넌트 사용 금지
 * - 수정 버튼/아이콘/포커스 ❌
 */

import { User, IdCard, Briefcase, Building2, AlertCircle, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@o4o/ui';
import type { MemberProfileData, LicenseData } from '@/lib/api/member';

interface ProfileSummarySectionProps {
  profile: MemberProfileData | null;
  license: LicenseData | null;
  isLoading?: boolean;
  error?: Error | null;
}

export function ProfileSummarySection({
  profile,
  license,
  isLoading,
  error,
}: ProfileSummarySectionProps) {
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            프로필 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || (!profile && !license)) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <User className="h-5 w-5" />
            프로필 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            프로필 정보를 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          프로필 정보
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Name */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {profile?.name || '이름 없음'}
          </h2>
          {profile?.isActive === false && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
              비활성
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* License Number - READ-ONLY */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <IdCard className="h-4 w-4" />
              면허번호
              <Lock className="h-3 w-3 text-gray-400" />
            </div>
            <div className="font-mono text-lg font-medium text-gray-900">
              {license?.licenseNumber || profile?.licenseNumber || '-'}
            </div>
            {license?.isVerified && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                인증됨
              </span>
            )}
            <p className="mt-2 text-xs text-gray-400">
              면허번호는 행정 정보로, 수정할 수 없습니다.
            </p>
          </div>

          {/* Pharmacist Type */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Briefcase className="h-4 w-4" />
              약사 유형
            </div>
            <div className="text-lg font-medium text-gray-900">
              {formatPharmacistType(profile?.pharmacistType)}
            </div>
          </div>

          {/* Organization */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 md:col-span-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Building2 className="h-4 w-4" />
              소속 조직
            </div>
            <div className="text-lg font-medium text-gray-900">
              {profile?.organizationId || '소속 조직 없음'}
            </div>
          </div>

          {/* License Dates (if available) */}
          {(license?.licenseIssuedAt || license?.licenseRenewalAt) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 md:col-span-2">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <IdCard className="h-4 w-4" />
                면허 발급 정보
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">발급일: </span>
                  <span className="font-medium">
                    {license.licenseIssuedAt
                      ? new Date(license.licenseIssuedAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">갱신일: </span>
                  <span className="font-medium">
                    {license.licenseRenewalAt
                      ? new Date(license.licenseRenewalAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Format pharmacist type for display
 */
function formatPharmacistType(type: string | null | undefined): string {
  if (!type) return '미지정';

  const typeMap: Record<string, string> = {
    general: '일반 약사',
    hospital: '병원 약사',
    industrial: '산업 약사',
    research: '연구 약사',
    government: '공직 약사',
    education: '교육 약사',
  };

  return typeMap[type] || type;
}
