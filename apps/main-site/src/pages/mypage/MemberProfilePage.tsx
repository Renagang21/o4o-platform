/**
 * MemberProfilePage
 *
 * Phase 1: 회원 마이페이지 - 회원 정보 조회/수정
 * membership-yaksa Phase 1 필드 지원
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
}

export function MemberProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">내 회원 정보</h1>
          <p className="text-gray-600 mt-1">약사회 회원 정보를 확인하세요</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

// Helper function
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

export default MemberProfilePage;
