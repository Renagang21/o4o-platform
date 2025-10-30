import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Check } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { useAuth } from '../../contexts/AuthContext';

interface RoleSwitcherProps {
  data?: {
    showLabel?: boolean;
    className?: string;
  };
}

interface RoleOption {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: string;
}

/**
 * 역할 전환 버튼 (헤더용)
 *
 * - 복수 역할을 가진 사용자에게만 표시
 * - 드롭다운에서 역할 선택 및 기본 역할 설정
 * - 역할 전환 시 해당 허브로 SPA 라우팅
 */
export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ data = {} }) => {
  const { showLabel = true, className = '' } = data;
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  // Not authenticated or single role - don't show
  if (!isAuthenticated || !user || !user.roles || user.roles.length <= 1) {
    return null;
  }

  const roleOptions: Record<string, RoleOption> = {
    customer: {
      id: 'customer',
      name: '사용자',
      description: '제품 구매 및 사용',
      path: '/',
      icon: '👤'
    },
    seller: {
      id: 'seller',
      name: '판매자',
      description: '제품 판매 관리',
      path: '/seller',
      icon: '🛒'
    },
    supplier: {
      id: 'supplier',
      name: '공급자',
      description: '제품 공급 관리',
      path: '/supplier',
      icon: '🏭'
    },
    affiliate: {
      id: 'affiliate',
      name: '제휴자',
      description: '제품 추천 및 수익',
      path: '/affiliate',
      icon: '🤝'
    }
  };

  const currentRole = user.currentRole || user.roles[0];
  const defaultRole = user.defaultRole || user.roles[0];

  const handleRoleSwitch = async (newRole: string) => {
    try {
      // TODO: API 호출 - PATCH /me/preferences { currentRole: newRole }
      // await authClient.api.patch('/me/preferences', { currentRole: newRole });

      // SPA 라우팅
      const targetPath = roleOptions[newRole]?.path || '/';
      navigate(targetPath);

      // 상태 업데이트는 AuthContext에서 자동 처리
      console.log(`역할 전환: ${currentRole} → ${newRole}`);
    } catch (error) {
      console.error('역할 전환 실패:', error);
    }
  };

  const handleSetDefault = async (roleId: string) => {
    try {
      setIsSettingDefault(true);

      // TODO: API 호출 - PATCH /me/preferences { defaultRole: roleId }
      // await authClient.api.patch('/me/preferences', { defaultRole: roleId });

      console.log(`기본 역할 설정: ${roleId}`);
    } catch (error) {
      console.error('기본 역할 설정 실패:', error);
    } finally {
      setIsSettingDefault(false);
    }
  };

  const trigger = (
    <button
      className="role-switcher-toggle flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
      aria-label="역할 전환"
      tabIndex={0}
    >
      <Users size={18} />
      {showLabel && <span className="text-sm font-medium">역할 전환</span>}
    </button>
  );

  return (
    <div className={`role-switcher ${className}`}>
      <Dropdown trigger={trigger} alignment="right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900">역할 선택</div>
          <div className="text-xs text-gray-500 mt-0.5">
            현재: {roleOptions[currentRole]?.name || currentRole}
          </div>
        </div>

        {/* Role List */}
        <div className="py-2">
          {user.roles.map((roleId) => {
            const role = roleOptions[roleId];
            if (!role) return null;

            const isCurrent = roleId === currentRole;
            const isDefault = roleId === defaultRole;

            return (
              <div key={roleId} className="px-2">
                <button
                  onClick={() => handleRoleSwitch(roleId)}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-md transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  disabled={isCurrent}
                >
                  <span className="text-lg mt-0.5">{role.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {isCurrent && (
                        <Check size={14} className="text-blue-600" />
                      )}
                      {isDefault && !isCurrent && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          기본
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {role.description}
                    </div>
                  </div>
                </button>

                {/* Set Default Checkbox */}
                {isCurrent && !isDefault && (
                  <label className="flex items-center gap-2 px-3 py-1.5 mt-1 text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => handleSetDefault(roleId)}
                      disabled={isSettingDefault}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>기본 역할로 설정</span>
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            역할을 전환하면 해당 기능에 맞는 UI가 표시됩니다.
          </p>
        </div>
      </Dropdown>
    </div>
  );
};

export default RoleSwitcher;
