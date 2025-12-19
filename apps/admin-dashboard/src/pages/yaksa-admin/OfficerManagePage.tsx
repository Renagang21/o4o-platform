/**
 * OfficerManagePage
 *
 * Phase 1: 임원 관리 페이지
 *
 * 기능:
 * - 지부/분회 소속 회원 목록 조회
 * - 임원 역할 할당 / 해제
 *
 * 제한:
 * - 새로운 Role/Position 생성 ❌
 * - 조직 구조 변경 ❌
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Shield,
  AlertCircle,
} from 'lucide-react';
import {
  getOrganizationMembers,
  updateMemberRole,
  type OrganizationMember,
} from '@/lib/api/yaksaAdmin';

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  manager: '임원',
  member: '일반 회원',
  moderator: '운영자',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
  moderator: 'bg-green-100 text-green-700',
};

export function OfficerManagePage() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<OrganizationMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('member');

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

  const handleRoleChange = async () => {
    if (!showRoleModal) return;

    setActionInProgress(showRoleModal.userId);
    try {
      await updateMemberRole(organizationId, showRoleModal.userId, {
        role: selectedRole as 'admin' | 'manager' | 'member' | 'moderator',
      });
      setShowRoleModal(null);
      await loadMembers();
    } catch (err) {
      setError('역할 변경 중 오류가 발생했습니다.');
      console.error('Failed to update role:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const openRoleModal = (member: OrganizationMember) => {
    setShowRoleModal(member);
    setSelectedRole(member.role);
  };

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
            <h1 className="text-2xl font-bold text-gray-900">임원 관리</h1>
            <p className="text-gray-500 mt-1">
              지부/분회 소속 회원의 역할을 관리합니다.
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

      {/* Info */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">
          <strong>주의:</strong> 임원 역할 변경은 해당 회원의 관리자 권한에 영향을 줍니다.
          새로운 역할이나 직책을 생성할 수 없으며, 기존 역할만 할당할 수 있습니다.
        </p>
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
      ) : members.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">소속 회원이 없습니다.</p>
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
                  현재 역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  직책
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-500" />
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
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {member.position || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openRoleModal(member)}
                      disabled={actionInProgress === member.userId}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      역할 변경
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              역할 변경
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                <strong>{showRoleModal.userName || showRoleModal.userId}</strong> 회원의 역할을 변경합니다.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 역할 선택
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">일반 회원</option>
                <option value="moderator">운영자</option>
                <option value="manager">임원</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowRoleModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleRoleChange}
                disabled={actionInProgress === showRoleModal.userId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                변경 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfficerManagePage;
