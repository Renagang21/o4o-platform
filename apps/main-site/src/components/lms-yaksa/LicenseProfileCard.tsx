/**
 * LicenseProfileCard Component
 *
 * Displays license profile information with renewal status
 */

import type { LicenseProfile } from '@/lib/api/lmsYaksaMember';

interface LicenseProfileCardProps {
  profile: LicenseProfile;
  showDetails?: boolean;
  className?: string;
}

export function LicenseProfileCard({
  profile,
  showDetails = false,
  className = '',
}: LicenseProfileCardProps) {
  const isExpiringSoon =
    profile.licenseExpiresAt &&
    new Date(profile.licenseExpiresAt).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000; // 90 days

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">면허 정보</h3>
          {profile.licenseNumber && (
            <p className="text-sm text-gray-500">면허번호: {profile.licenseNumber}</p>
          )}
        </div>
        {profile.isRenewalRequired && (
          <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
            갱신 필요
          </span>
        )}
        {!profile.isRenewalRequired && isExpiringSoon && (
          <span className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded">
            만료 임박
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Credits */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 mb-1">총 누적 평점</p>
          <p className="text-2xl font-bold text-blue-700">{profile.totalCredits.toFixed(1)}</p>
        </div>

        {/* Current Year Credits */}
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-600 mb-1">당해년도 평점</p>
          <p className="text-2xl font-bold text-green-700">
            {profile.currentYearCredits.toFixed(1)}
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <dl className="space-y-2 text-sm">
            {profile.licenseIssuedAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">발급일</dt>
                <dd className="font-medium">
                  {new Date(profile.licenseIssuedAt).toLocaleDateString('ko-KR')}
                </dd>
              </div>
            )}
            {profile.licenseExpiresAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">만료일</dt>
                <dd
                  className={`font-medium ${
                    isExpiringSoon ? 'text-orange-600' : ''
                  }`}
                >
                  {new Date(profile.licenseExpiresAt).toLocaleDateString('ko-KR')}
                </dd>
              </div>
            )}
            {profile.lastVerifiedAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">마지막 검증</dt>
                <dd className="font-medium">
                  {new Date(profile.lastVerifiedAt).toLocaleDateString('ko-KR')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Renewal Warning */}
      {profile.isRenewalRequired && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-red-700">
              면허 갱신이 필요합니다. 필수 교육을 이수해주세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LicenseProfileCard;
