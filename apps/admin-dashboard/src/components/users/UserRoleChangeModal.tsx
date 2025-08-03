/**
 * UserRoleChangeModal - 사용자 역할 변경 모달
 * 일괄 사용자 역할 변경 및 변경 사항 확인 UX 제공 컴포넌트
 */

import { FC, MouseEvent, useState } from 'react';
import { Shield, X, Check, Users, AlertTriangle } from 'lucide-react';
import { User, UserRole, ROLE_LABELS } from '../../types/user';

interface UserRoleChangeModalProps {
  _isOpen: boolean;
  onClose: () => void;
  onConfirm: (newRole: UserRole) => void;
  users: User[];
  isLoading?: boolean;
}

const UserRoleChangeModal: FC<UserRoleChangeModalProps> = ({
  _isOpen,
  onClose,
  onConfirm,
  users,
  isLoading = false
}) => {
  const [selectedRole, setSelectedRole] = useState('customer');

  if (!_isOpen) return null;

  const userCount = users.length;

  // 현재 관리자 수 체크
  const currentAdminCount = users.filter((user: any) => user.role === 'admin').length;
  const willRemoveAllAdmins = selectedRole !== 'admin' && currentAdminCount === users.length;
  
  // 역할 변경 대상 분석
  const roleChanges = users.reduce((acc: any, user: any) => {
    if (user.role !== selectedRole) {
      acc[user.role] = (acc[user.role] || 0) + 1;
    }
    return acc;
  }, {} as Record<UserRole, number>);

  const hasChanges = Object.keys(roleChanges).length > 0;

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading && hasChanges) {
      onConfirm(selectedRole as any);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-change-modal-title"
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 id="role-change-modal-title" className="text-lg font-medium text-wp-text-primary">
                사용자 역할 변경
              </h3>
              <p className="text-sm text-wp-text-secondary">
                {userCount}명 사용자 역할을 변경합니다
              </p>
            </div>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-wp-text-secondary hover:text-wp-text-primary transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 모달 본문 */}
        <div className="p-6">
          {/* 선택 사용자 목록 */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-wp-text-secondary" />
              <span className="text-sm font-medium text-wp-text-primary">
                선택 사용자 ({userCount}명)
              </span>
            </div>
            <div className="bg-wp-bg-tertiary rounded-lg p-3 max-h-32 overflow-y-auto">
              {users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-wp-text-primary">{user.name}</span>
                    <span className="text-xs text-wp-text-secondary">({user.email})</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-wp-bg-tertiary text-wp-text-primary">
                    {ROLE_LABELS[user.role as UserRole]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 새 역할 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-wp-text-primary mb-3">
              변경할 역할 선택
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role as UserRole)}
                  disabled={isLoading}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    selectedRole === role
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border border-gray-200 hover:border-gray-300 text-wp-text-primary'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{label}</span>
                    {selectedRole === role && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-wp-text-secondary mt-1">
                    {role === 'admin' && '시스템 관리 권한'}
                    {role === 'customer' && '일반 고객 권한'}
                    {role === 'business' && '사업자 고객 권한'}
                    {role === 'affiliate' && '제휴 파트너 권한'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 변경 사항 요약 */}
          {hasChanges && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-wp-text-primary mb-3">변경 사항 요약</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="space-y-2">
                  {Object.entries(roleChanges).map(([fromRole, count]) => (
                    <div key={fromRole} className="flex items-center justify-between text-sm">
                      <span className="text-wp-text-secondary">
                        {ROLE_LABELS[fromRole as UserRole]}에서 {ROLE_LABELS[selectedRole as UserRole]}로
                      </span>
                      <span className="font-medium text-blue-900">{String(count)}명</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 경고 메시지 */}
          {willRemoveAllAdmins && (
            <div className="mb-6">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800 mb-1">
                      위험: 모든 관리자 권한 제거
                    </h4>
                    <p className="text-sm text-red-700">
                      선택한 사용자들이 모든 관리자입니다. 
                      이 작업으로 시스템에 관리자가 없어질 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasChanges && (
            <div className="mb-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      선택한 사용자들이 모두 이미 '{ROLE_LABELS[selectedRole as UserRole]}' 역할입니다.
                      변경할 내용이 없습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 확인 메시지 */}
          {hasChanges && (
            <div className="mb-6">
              <p className="text-sm text-wp-text-secondary">
                정말로 선택한 {userCount}명 사용자 역할을 '{ROLE_LABELS[selectedRole as UserRole]}'로 변경하시겠습니까?
              </p>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-wp-bg-tertiary rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="wp-button wp-button-secondary"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`wp-button ${willRemoveAllAdmins ? 'wp-button-danger' : 'wp-button-primary'}`}
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                처리 중...
              </div>
            ) : (
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                역할 변경
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserRoleChangeModal;