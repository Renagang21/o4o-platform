import React, { useState } from 'react';
import { DropshippingRouter } from '@shared/components/dropshipping/DropshippingRouter';
import { realtimeSync } from '@shared/components/dropshipping/services/realtimeSync';

// 데모용 역할 선택 컴포넌트 (실제로는 로그인된 사용자의 역할을 사용)
const RoleSelector: React.FC<{ onRoleSelect: (role: string) => void }> = ({ onRoleSelect }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center mb-8">드랍쉬핑 플랫폼</h1>
        <p className="text-gray-600 text-center mb-8">
          역할을 선택하여 드랍쉬핑 시스템을 체험해보세요
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onRoleSelect('seller')}
            className="p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className="text-blue-600 font-bold text-xl mb-2">판매자</div>
            <p className="text-sm text-gray-600">
              상품 판매, 재고 관리, 가격 정책 설정
            </p>
          </button>
          
          <button
            onClick={() => onRoleSelect('supplier')}
            className="p-6 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <div className="text-green-600 font-bold text-xl mb-2">공급자</div>
            <p className="text-sm text-gray-600">
              상품 공급, 배송 관리, 정산 관리
            </p>
          </button>
          
          <button
            onClick={() => onRoleSelect('partner')}
            className="p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <div className="text-purple-600 font-bold text-xl mb-2">파트너</div>
            <p className="text-sm text-gray-600">
              마케팅 캠페인, 커미션 관리, 성과 분석
            </p>
          </button>
          
          <button
            onClick={() => onRoleSelect('admin')}
            className="p-6 border-2 border-red-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all"
          >
            <div className="text-red-600 font-bold text-xl mb-2">관리자</div>
            <p className="text-sm text-gray-600">
              전체 시스템 관리, 사용자 관리, 모니터링
            </p>
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>데모 모드:</strong> 실제 서비스에서는 로그인 시 사용자의 역할이 자동으로 결정됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export const DropshippingPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  React.useEffect(() => {
    // 실시간 동기화 서비스 초기화
    realtimeSync.initializeMockData();
  }, []);

  if (!selectedRole) {
    return <RoleSelector onRoleSelect={setSelectedRole} />;
  }

  return (
    <DropshippingRouter 
      userRole={selectedRole as 'seller' | 'supplier' | 'partner' | 'admin'} 
    />
  );
};