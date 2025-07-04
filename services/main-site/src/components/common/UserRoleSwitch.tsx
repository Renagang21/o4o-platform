import React, { useState } from 'react';

type UserRole = 'supplier' | 'reseller' | 'partner' | 'customer' | 'expert';

interface RoleInfo {
  id: UserRole;
  name: string;
  icon: string;
  description: string;
  features: string[];
  color: string;
}

interface UserRoleSwitchProps {
  currentRole: UserRole;
  availableRoles: UserRole[];
  onRoleChange: (role: UserRole) => void;
  showDescription?: boolean;
}

const UserRoleSwitch: React.FC<UserRoleSwitchProps> = ({
  currentRole,
  availableRoles,
  onRoleChange,
  showDescription = true
}) => {
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);

  const roleInfoMap: Record<UserRole, RoleInfo> = {
    supplier: {
      id: 'supplier',
      name: '공급자',
      icon: '🏭',
      description: '제품을 개발하고 공급하는 역할',
      features: ['제품 등록', '판매자 관리', '정보 업데이트', '품질 관리'],
      color: 'role-supplier'
    },
    reseller: {
      id: 'reseller',
      name: '판매자',
      icon: '🛒',
      description: '제품을 판매하고 고객을 관리하는 역할',
      features: ['제품 선택', '고객 관리', '주문 처리', '마케팅'],
      color: 'role-reseller'
    },
    partner: {
      id: 'partner',
      name: '파트너',
      icon: '🤝',
      description: '제품을 추천하고 홍보하는 역할',
      features: ['제품 추천', '콘텐츠 제작', '수수료 수익', '성과 분석'],
      color: 'role-partner'
    },
    customer: {
      id: 'customer',
      name: '구매자',
      icon: '👤',
      description: '제품을 구매하고 사용하는 역할',
      features: ['제품 구매', '리뷰 작성', 'Q&A 참여', '혜택 활용'],
      color: 'role-customer'
    },
    expert: {
      id: 'expert',
      name: '전문가',
      icon: '👨‍⚕️',
      description: '제품을 검증하고 전문 의견을 제공하는 역할',
      features: ['제품 검증', '전문 상담', '교육 콘텐츠', '신뢰도 평가'],
      color: 'role-expert'
    }
  };

  const getCurrentRoleInfo = () => roleInfoMap[currentRole];
  const getAvailableRoles = () => availableRoles.filter(role => role !== currentRole);

  const handleRoleChange = (newRole: UserRole) => {
    onRoleChange(newRole);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      {/* 현재 역할 표시 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">역할 선택</h3>
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <span className="text-2xl">{getCurrentRoleInfo().icon}</span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                현재 역할: {getCurrentRoleInfo().name}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getCurrentRoleInfo().color} bg-opacity-20 text-${getCurrentRoleInfo().color}`}>
                활성
              </span>
            </div>
            {showDescription && (
              <p className="text-sm text-gray-600 mt-1">
                {getCurrentRoleInfo().description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 다른 역할로 전환 */}
      {getAvailableRoles().length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">🔄 다른 역할로 전환:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getAvailableRoles().map((roleId) => {
              const role = roleInfoMap[roleId];
              return (
                <div
                  key={roleId}
                  className="relative border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredRole(roleId)}
                  onMouseLeave={() => setHoveredRole(null)}
                  onClick={() => handleRoleChange(roleId)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl">{role.icon}</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{role.name}</h5>
                      {showDescription && (
                        <p className="text-sm text-gray-600 mt-1 mb-3">
                          {role.description}
                        </p>
                      )}
                      
                      {/* 주요 기능 미리보기 */}
                      <div className="space-y-1">
                        {role.features.slice(0, hoveredRole === roleId ? role.features.length : 2).map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                            {feature}
                          </div>
                        ))}
                        {hoveredRole !== roleId && role.features.length > 2 && (
                          <div className="text-sm text-gray-400">
                            +{role.features.length - 2}개 더
                          </div>
                        )}
                      </div>

                      {/* 전환 버튼 */}
                      <button
                        className={`mt-3 w-full px-3 py-2 text-sm font-medium rounded-md transition-colors
                          ${hoveredRole === roleId 
                            ? `bg-${role.color} bg-opacity-20 text-${role.color} border border-${role.color} border-opacity-30` 
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoleChange(roleId);
                        }}
                      >
                        {role.name}로 전환하기
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 mt-0.5">ℹ️</span>
          <div className="text-sm text-blue-700">
            <p className="font-medium">역할 전환 안내</p>
            <p className="mt-1">
              역할을 전환하면 해당 기능에 맞는 UI와 메뉴가 표시됩니다. 
              언제든지 다른 역할로 전환할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 역할별 권한 안내 (고급 모드) */}
      {hoveredRole && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-2">
            {roleInfoMap[hoveredRole].icon} {roleInfoMap[hoveredRole].name} 역할 상세
          </h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h6 className="font-medium text-gray-700 mb-1">주요 기능</h6>
              <ul className="space-y-1 text-gray-600">
                {roleInfoMap[hoveredRole].features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h6 className="font-medium text-gray-700 mb-1">접근 권한</h6>
              <div className="space-y-1 text-gray-600">
                <div className="flex items-center justify-between">
                  <span>제품 정보:</span>
                  <span className={`text-xs px-2 py-0.5 rounded text-trust-verified bg-trust-verified bg-opacity-10`}>
                    전체
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>고객 데이터:</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    hoveredRole === 'customer' ? 'text-trust-unverified bg-trust-unverified bg-opacity-10' : 'text-trust-verified bg-trust-verified bg-opacity-10'
                  }`}>
                    {hoveredRole === 'customer' ? '개인정보만' : '허가된 범위'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>관리 기능:</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ['supplier', 'expert'].includes(hoveredRole) ? 'text-trust-verified bg-trust-verified bg-opacity-10' : 'text-trust-unverified bg-trust-unverified bg-opacity-10'
                  }`}>
                    {['supplier', 'expert'].includes(hoveredRole) ? '고급' : '기본'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleSwitch;