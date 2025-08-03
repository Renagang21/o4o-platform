/**
 * UserDeleteModal - 사용자 삭제 확인 모달
 * 단일 및 일괄 사용자 삭제 시 확인 메시지 제공 컴포넌트
 */

import { FC, MouseEvent } from 'react';
import { AlertTriangle, X, Trash2, Users } from 'lucide-react';
import { User } from '../../types/user';

interface UserDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  users: User | User[];
  isLoading?: boolean;
}

const UserDeleteModal: FC<UserDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  users,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const isMultiple = Array.isArray(users);
  const userCount = isMultiple ? users.length : 1;
  const userName = isMultiple ? '' : (users as User).name;
  const userEmail = isMultiple ? '' : (users as User).email;

  // 관리자 사용자 체크
  const hasAdminUsers = isMultiple 
    ? (users as User[]).some(user => user.role === 'admin')
    : (users as User).role === 'admin';

  // 활성 사용자 체크  
  const hasActiveUsers = isMultiple
    ? (users as User[]).some(user => user.status === 'approved')
    : (users as User).status === 'approved';

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-300">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-lg font-medium text-wp-text-primary">
                {isMultiple ? '사용자 일괄 삭제' : '사용자 삭제'}
              </h3>
              <p className="text-sm text-wp-text-secondary">
                {isMultiple 
                  ? `${userCount}명 사용자를 삭제합니다`
                  : '사용자를 삭제합니다'
                }
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
          {/* 사용자 정보 표시 */}
          {isMultiple ? (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-4 h-4 text-wp-text-secondary" />
                <span className="text-sm font-medium text-wp-text-primary">
                  삭제 대상 사용자 ({userCount}명)
                </span>
              </div>
              <div className="bg-wp-bg-tertiary rounded-lg p-3 max-h-32 overflow-y-auto">
                {(users as User[]).map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-wp-text-primary">{user.name}</span>
                      <span className="text-xs text-wp-text-secondary">({user.email})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.role === 'admin' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          관리자
                        </span>
                      )}
                      {user.status === 'approved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          활성
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="bg-wp-bg-tertiary rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-wp-text-primary">{userName}</p>
                    <p className="text-sm text-wp-text-secondary">{userEmail}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(users as User).role === 'admin' && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        관리자
                      </span>
                    )}
                    {(users as User).status === 'approved' && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        활성
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 경고 메시지 */}
          <div className="mb-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800 mb-1">
                    삭제 경고
                  </h4>
                  <div className="text-sm text-red-700 space-y-1">
                    <p>
                      {isMultiple 
                        ? `선택한 ${userCount}명 사용자가 영구적으로 삭제됩니다.`
                        : `${userName} 사용자가 영구적으로 삭제됩니다.`
                      }
                    </p>
                    <p className="font-medium">
                      이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 추가 경고 (관리자 또는 활성 사용자) */}
          {(hasAdminUsers || hasActiveUsers) && (
            <div className="mb-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex">
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">
                      추가 주의사항
                    </h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      {hasAdminUsers && (
                        <p>• 관리자 권한을 가진 사용자가 포함되어 있습니다.</p>
                      )}
                      {hasActiveUsers && (
                        <p>• 현재 활성화된 사용자가 포함되어 있습니다.</p>
                      )}
                      <p className="font-medium">
                        삭제하기 전에 신중히 검토해 주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 삭제 확인 메시지 */}
          <div className="mb-6">
            <p className="text-sm text-wp-text-secondary">
              {isMultiple 
                ? `정말로 선택한 ${userCount}명 사용자를 삭제하시겠습니까?`
                : `정말로 "${userName}" 사용자를 삭제하시겠습니까?`
              }
            </p>
          </div>
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
            className="wp-button wp-button-danger"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                삭제 중...
              </div>
            ) : (
              <div className="flex items-center">
                <Trash2 className="w-4 h-4 mr-2" />
                {isMultiple ? `${userCount}명 삭제` : '사용자 삭제'}
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDeleteModal;