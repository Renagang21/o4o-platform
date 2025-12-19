/**
 * MemberProfilePage
 *
 * Phase 4: Member Profile UI Integration
 *
 * 약사가 '내 정보'를 신뢰하고 관리할 수 있는 화면
 *
 * 구성:
 * 1. Profile Summary (프로필 요약 - 면허번호 READ-ONLY)
 * 2. Pharmacy Info (약국 정보 - 본인만 수정)
 *
 * Policy Enforcement:
 * - 면허번호: READ-ONLY (입력 불가, 수정 불가)
 * - 약국 정보: 본인만 수정 가능
 * - 수정 시 책임 안내 필수
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent } from '@o4o/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMemberProfilePage } from '@/hooks/useMemberProfile';
import {
  ProfileSummarySection,
  PharmacyInfoSection,
} from '@/components/member';

export function MemberProfilePage() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const {
    profile,
    license,
    pharmacy,
    isLoading,
    isLoadingProfile,
    isLoadingLicense,
    isLoadingPharmacy,
    profileError,
    licenseError,
    pharmacyError,
    updatePharmacyAsync,
    isUpdatingPharmacy,
    refetchProfile,
    refetchPharmacy,
  } = useMemberProfilePage();

  // 로그인 필수 가드
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isLoggedIn, navigate]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Not logged in (redirect in progress)
  if (!isLoggedIn) {
    return null;
  }

  // Handle pharmacy save
  const handlePharmacySave = async (data: Parameters<typeof updatePharmacyAsync>[0]) => {
    await updatePharmacyAsync(data);
  };

  // Check for critical errors (both profile and license failed)
  const hasCriticalError = profileError && licenseError;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with back link */}
      <div className="mb-6">
        <Link
          to="/member/home"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          홈으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
        <p className="text-sm text-gray-500 mt-1">
          프로필 및 약국 정보를 확인하고 관리하세요.
        </p>
      </div>

      {/* Critical Error */}
      {hasCriticalError && (
        <Card className="mb-4">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  프로필을 불러올 수 없습니다
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  잠시 후 다시 시도해 주세요.
                </p>
              </div>
              <Button
                onClick={() => {
                  refetchProfile();
                  refetchPharmacy();
                }}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {/* [1] Profile Summary (includes License - READ-ONLY) */}
        <ProfileSummarySection
          profile={profile?.data ?? null}
          license={license?.data ?? null}
          isLoading={isLoadingProfile || isLoadingLicense}
          error={profileError}
        />

        {/* [2] Pharmacy Info (editable by self) */}
        <PharmacyInfoSection
          data={pharmacy?.data ?? null}
          canEdit={pharmacy?.canEdit ?? true}
          editWarning={pharmacy?.editWarning}
          isLoading={isLoadingPharmacy}
          error={pharmacyError}
          onSave={handlePharmacySave}
          isSaving={isUpdatingPharmacy}
        />
      </div>

      {/* Policy Reminder */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-2">안내</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>면허번호는 행정 정보로 본 화면에서 수정할 수 없습니다.</li>
          <li>약국 정보는 본인만 수정할 수 있으며, 정확성은 본인의 책임입니다.</li>
          <li>정보 변경이 필요한 경우 관리자에게 문의하세요.</li>
        </ul>
      </div>

      {/* Loading indicator for data fetch */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-gray-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          데이터 로딩 중...
        </div>
      )}
    </div>
  );
}

export default MemberProfilePage;
