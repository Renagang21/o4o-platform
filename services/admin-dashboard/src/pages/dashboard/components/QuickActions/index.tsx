/**
 * Quick Actions Component
 * 8개 빠른 액션 버튼
 */

import React from 'react';
import ActionButton from './ActionButton';
import { 
  Plus, 
  FileText, 
  UserCheck, 
  Package, 
  Percent, 
  BarChart3, 
  Users, 
  Settings 
} from 'lucide-react';

const QuickActions: React.FC = () => {
  const actions = [
    {
      id: 'new-product',
      title: '새 상품 추가',
      description: '새로운 상품을 등록합니다',
      icon: <Plus className="w-5 h-5" />,
      color: 'blue' as const,
      href: '/products/new',
      badge: null
    },
    {
      id: 'new-page',
      title: '새 페이지 생성',
      description: '새로운 콘텐츠 페이지를 만듭니다',
      icon: <FileText className="w-5 h-5" />,
      color: 'green' as const,
      href: '/pages/new',
      badge: null
    },
    {
      id: 'user-approval',
      title: '사용자 승인',
      description: '대기 중인 사용자를 승인합니다',
      icon: <UserCheck className="w-5 h-5" />,
      color: 'orange' as const,
      href: '/users/pending',
      badge: 3 // 실제로는 API에서 가져올 값
    },
    {
      id: 'order-management',
      title: '주문 처리',
      description: '주문 상태를 업데이트합니다',
      icon: <Package className="w-5 h-5" />,
      color: 'purple' as const,
      href: '/orders',
      badge: 12 // 실제로는 API에서 가져올 값
    },
    {
      id: 'coupon-create',
      title: '쿠폰 생성',
      description: '새로운 할인 쿠폰을 만듭니다',
      icon: <Percent className="w-5 h-5" />,
      color: 'pink' as const,
      href: '/coupons/new',
      badge: null
    },
    {
      id: 'detailed-report',
      title: '상세 리포트',
      description: '전체 분석 리포트를 확인합니다',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'indigo' as const,
      href: '/analytics',
      badge: null
    },
    {
      id: 'partner-approval',
      title: '파트너 승인',
      description: '파트너 신청을 검토합니다',
      icon: <Users className="w-5 h-5" />,
      color: 'gray' as const,
      href: '/partners/pending',
      badge: null,
      disabled: true, // 파트너스 시스템 미구현
      tooltip: '파트너스 시스템 준비 중입니다'
    },
    {
      id: 'policy-settings',
      title: '정책 설정',
      description: '관리자 정책을 설정합니다',
      icon: <Settings className="w-5 h-5" />,
      color: 'yellow' as const,
      href: '/settings/policies',
      badge: null,
      highlight: true // 새로 추가된 기능 강조
    }
  ];

  return (
    <div className="wp-card">
      <div className="wp-card-header">
        <h3 className="wp-card-title">빠른 작업</h3>
        <p className="text-sm text-gray-600 mt-1">
          자주 사용하는 기능에 빠르게 접근하세요
        </p>
      </div>
      
      <div className="wp-card-body">
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              {...action}
            />
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">대기 중인 작업</p>
              <p className="text-lg font-bold text-orange-600">15개</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">오늘 완료</p>
              <p className="text-lg font-bold text-green-600">8개</p>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>Tip:</strong> 키보드 단축키로 더 빠르게 접근할 수 있습니다. 
            Ctrl+Shift+N으로 새 상품 추가
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;