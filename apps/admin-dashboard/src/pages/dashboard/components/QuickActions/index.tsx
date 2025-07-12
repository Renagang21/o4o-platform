/**
 * Quick Actions Widget (MVP)
 * 빠른 작업 위젯 - 관리자 주요 작업 버튼 모음
 */

import { memo, useState } from 'react';
import { 
  Users,
  Package,
  FileText,
  BarChart3,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-react';

interface QuickActionsProps {
  className?: string;
}

// 빠른 작업 아이템 타입 정의
interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  external?: boolean;
}

const QuickActions = memo<QuickActionsProps>(({ className = '' }) => {
  const [isLoading] = useState<string | null>(null);

  // 빠른 작업 항목들
  const quickActions: QuickActionItem[] = [
    {
      id: 'add-product',
      title: '상품 등록',
      description: '새로운 상품을 등록합니다',
      icon: <Package className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      href: '/admin/products/new',
    },
    {
      id: 'add-user',
      title: '사용자 추가',
      description: '새로운 사용자를 추가합니다',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      href: '/admin/users/new',
    },
    {
      id: 'create-post',
      title: '게시글 작성',
      description: '새 게시글을 작성합니다',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      href: '/admin/posts/new',
    },
    {
      id: 'manage-orders',
      title: '주문 관리',
      description: '대기 중인 주문을 확인합니다',
      icon: <Package className="w-5 h-5" />,
      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      href: '/admin/orders',
      badge: 12,
    },
    {
      id: 'forum-moderation',
      title: '포럼 관리',
      description: '승인 대기 게시글을 확인합니다',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'bg-pink-50 text-pink-600 hover:bg-pink-100',
      href: '/admin/forum/moderation',
      badge: 5,
    },
    {
      id: 'analytics',
      title: '통계 보기',
      description: '상세 분석 리포트를 확인합니다',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      href: '/admin/analytics',
    },
  ];

  const handleActionClick = (action: QuickActionItem) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      if (action.external) {
        window.open(action.href, '_blank');
      } else {
        // React Router 네비게이션 로직 (실제 구현시)
        window.location.href = action.href;
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 위젯 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-blue-600" />
          빠른 작업
        </h2>
        <div className="text-xs text-wp-text-secondary">
          자주 사용하는 관리 작업
        </div>
      </div>

      {/* 빠른 작업 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={isLoading === action.id}
            className={`
              relative p-4 rounded-lg border border-gray-200 transition-all duration-200
              hover:shadow-md hover:border-gray-300 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              ${action.color}
              group
            `}
          >
            {/* 로딩 스피너 */}
            {isLoading === action.id && (
              <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-wp-text-secondary" />
              </div>
            )}

            {/* 배지 */}
            {action.badge && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                {action.badge}
              </div>
            )}

            {/* 아이콘 */}
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-white/50">
                {action.icon}
              </div>
              {action.external && (
                <ExternalLink className="w-4 h-4 opacity-50" />
              )}
              {action.href && !action.external && (
                <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              )}
            </div>

            {/* 텍스트 */}
            <div className="text-left">
              <h3 className="font-medium text-sm text-gray-900 mb-1">
                {action.title}
              </h3>
              <p className="text-xs text-wp-text-secondary leading-relaxed">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* 추가 정보 */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-wp-text-secondary">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span>승인 대기: 17건</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span>검토 필요: 8건</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>정상 작동: 모든 서비스</span>
              </div>
            </div>
            <div className="text-xs text-wp-text-secondary">
              마지막 업데이트: 방금 전
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;