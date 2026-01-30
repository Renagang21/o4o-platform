/**
 * OfficerManagePage
 *
 * WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1: 직책 관리 페이지
 *
 * 핵심 원칙:
 * - 임원은 "직책(표시 데이터)"이며 "권한"이 아님
 * - 이 페이지는 직책을 조회하고 표시하는 용도
 * - 권한 할당 UI가 아님
 *
 * 기능:
 * - 지부/분회 소속 임원 목록 조회
 * - 직책별 현황 조회 (회장, 부회장, 총무 등)
 *
 * 제한:
 * - 권한(Role) 할당 UI 없음
 * - 새로운 직책 생성 ❌
 * - 조직 구조 변경 ❌
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Award,
  Info,
} from 'lucide-react';
import {
  getOrganizationMembers,
  type OrganizationMember,
} from '@/lib/api/yaksaAdmin';

/**
 * 직책 라벨 (표시용)
 */
const OFFICIAL_ROLE_LABELS: Record<string, string> = {
  president: '회장',
  vice_president: '부회장',
  general_manager: '총무',
  auditor: '감사',
  director: '이사',
  branch_head: '분회장',
  district_head: '지부장',
  none: '일반회원',
};

/**
 * 직책 색상 (표시용)
 */
const OFFICIAL_ROLE_COLORS: Record<string, string> = {
  president: 'bg-purple-100 text-purple-700',
  vice_president: 'bg-blue-100 text-blue-700',
  general_manager: 'bg-indigo-100 text-indigo-700',
  auditor: 'bg-amber-100 text-amber-700',
  director: 'bg-cyan-100 text-cyan-700',
  branch_head: 'bg-green-100 text-green-700',
  district_head: 'bg-teal-100 text-teal-700',
  none: 'bg-gray-100 text-gray-600',
};

/**
 * 임원 직책인지 확인 (표시용)
 */
const isExecutivePosition = (officialRole?: string): boolean => {
  const executiveRoles = [
    'president', 'vice_president', 'general_manager', 'auditor',
    'director', 'branch_head', 'district_head',
  ];
  return officialRole ? executiveRoles.includes(officialRole) : false;
};

export function OfficerManagePage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterExecutivesOnly, setFilterExecutivesOnly] = useState(true);

  // 임시: 로그인한 관리자의 조직 ID (실제로는 auth context에서 가져와야 함)
  const organizationId = 'org-sample-id';

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getOrganizationMembers(organizationId);
      setMembers(response.data || []);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.');
      console.error('Failed to load members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // 필터링된 회원 목록
  const filteredMembers = filterExecutivesOnly
    ? members.filter((m) => isExecutivePosition(m.position))
    : members;

  // 직책별 통계
  const positionStats = members.reduce((acc, m) => {
    const pos = m.position || 'none';
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          관리자 센터로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">임원 현황</h1>
            <p className="text-gray-500 mt-1">
              지부/분회 임원진 현황을 조회합니다.
            </p>
          </div>
          <button
            onClick={loadMembers}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Info Banner - WO-KPA-AUTH-RBAC-EXECUTIVE-REFORM-V1 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">직책과 권한은 분리되어 있습니다</p>
            <p>
              임원 직책은 조직 내 역할을 표시하는 것이며, 시스템 권한과는 무관합니다.
              관리자 권한이 필요한 경우 별도로 권한 관리 메뉴에서 설정해야 합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Position Stats */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(OFFICIAL_ROLE_LABELS)
          .filter(([key]) => key !== 'none')
          .map(([key, label]) => (
            <div
              key={key}
              className={`p-3 rounded-lg ${OFFICIAL_ROLE_COLORS[key]} border`}
            >
              <div className="text-2xl font-bold">{positionStats[key] || 0}</div>
              <div className="text-xs font-medium">{label}</div>
            </div>
          ))}
      </div>

      {/* Filter Toggle */}
      <div className="mb-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={filterExecutivesOnly}
            onChange={(e) => setFilterExecutivesOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          임원만 표시
        </label>
        <span className="text-sm text-gray-500">
          총 {filteredMembers.length}명
          {filterExecutivesOnly && ` (전체 ${members.length}명 중 임원)`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {filterExecutivesOnly ? '임원이 없습니다.' : '소속 회원이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  회원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  직책
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소속
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {isExecutivePosition(member.position) ? (
                          <Award className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Users className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {member.userName || member.userId}
                        </div>
                        {member.isPrimary && (
                          <span className="text-xs text-blue-600">주 소속</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        OFFICIAL_ROLE_COLORS[member.position || 'none'] ||
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {OFFICIAL_ROLE_LABELS[member.position || 'none'] ||
                        member.position ||
                        '일반회원'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {(member as any).organizationName || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-6 text-sm text-gray-500">
        <p>
          * 직책 변경은 회원 상세 페이지에서 가능합니다.
        </p>
        <p>
          * 시스템 권한(관리자, 운영자 등)은 별도의 권한 관리 메뉴를 이용해 주세요.
        </p>
      </div>
    </div>
  );
}

export default OfficerManagePage;
