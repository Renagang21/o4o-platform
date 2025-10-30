/**
 * 판매자 허브 페이지
 *
 * - RoleGuard로 seller 역할만 접근 가능
 * - HubLayout 사용하여 역할별 UI 표시
 */

import React from 'react';
import { HubLayout } from '../../components/layout/HubLayout';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardForRole, sortDashboardCards } from '../../config/roles';

export const SellerHub: React.FC = () => {
  const { user } = useAuth();
  const currentRole = user?.currentRole || user?.roles?.[0] || 'seller';
  const dashboardConfig = getDashboardForRole(currentRole);
  const sortedCards = sortDashboardCards(dashboardConfig.cards);

  return (
    <HubLayout requiredRole="seller">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCards.map((card) => (
          <div
            key={card.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {/* 배지 */}
            {card.badge && (
              <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded mb-3">
                {card.badge === 'urgent' ? '긴급' : card.badge === 'new' ? '신규' : card.badge}
              </span>
            )}

            {/* 제목 */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{card.description}</p>

            {/* 통계 */}
            {card.stat && (
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900">{card.stat.value}</div>
                <div className="text-sm text-gray-500">{card.stat.label}</div>
                {card.stat.trend && card.stat.trendValue && (
                  <div
                    className={`text-xs font-medium mt-1 ${
                      card.stat.trend === 'up'
                        ? 'text-green-600'
                        : card.stat.trend === 'down'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {card.stat.trendValue}
                  </div>
                )}
              </div>
            )}

            {/* 액션 버튼 */}
            {card.actions && card.actions.length > 0 && (
              <div className="flex gap-2">
                {card.actions.map((action, idx) => (
                  <a
                    key={idx}
                    href={action.url}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      action.variant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            )}

            {/* 기본 링크 (액션이 없을 경우) */}
            {(!card.actions || card.actions.length === 0) && card.url && (
              <a
                href={card.url}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                자세히 보기 →
              </a>
            )}
          </div>
        ))}
      </div>
    </HubLayout>
  );
};

export default SellerHub;
