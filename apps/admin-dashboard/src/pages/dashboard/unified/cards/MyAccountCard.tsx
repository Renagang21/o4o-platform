/**
 * My Account Card
 * PoC: 계정 요약 카드 (항상 노출)
 */

import React from 'react';
import { User, Mail, Shield, Settings } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
import { Link } from 'react-router-dom';
import type { UnifiedCardProps, UserContextType } from '../types';
import { useUserContext } from '../useUserContext';

const CONTEXT_LABELS: Record<UserContextType, { label: string; color: string }> = {
  seller: { label: '판매자', color: 'bg-blue-100 text-blue-700' },
  supplier: { label: '공급자', color: 'bg-green-100 text-green-700' },
  partner: { label: '파트너', color: 'bg-purple-100 text-purple-700' },
  operator: { label: '서비스운영자', color: 'bg-gray-100 text-gray-700' },
  executive: { label: '임원', color: 'bg-orange-100 text-orange-700' },
  admin: { label: '관리자', color: 'bg-red-100 text-red-700' },
};

export const MyAccountCard: React.FC<UnifiedCardProps> = () => {
  const { user } = useAuth();
  const { contexts: userContexts } = useUserContext();

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500">
        로그인이 필요합니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile Section */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {user.name || '사용자'}
          </h3>
          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {user.email}
          </p>
        </div>
      </div>

      {/* Contexts Badges */}
      <div className="flex flex-wrap gap-2">
        {userContexts.map((ctx) => (
          <span
            key={ctx}
            className={`px-3 py-1 rounded-full text-xs font-medium ${CONTEXT_LABELS[ctx].color}`}
          >
            {CONTEXT_LABELS[ctx].label}
          </span>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <Link
          to="/profile"
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <User className="w-4 h-4" />
          프로필 편집
        </Link>
        <Link
          to="/settings"
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
          설정
        </Link>
      </div>

      {/* Subscription Status (if applicable) */}
      {(user as any).subscriptionStatus && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">구독 상태</span>
          </div>
          <span className={`font-medium ${
            (user as any).subscriptionStatus === 'active' ? 'text-green-600' : 'text-gray-500'
          }`}>
            {(user as any).subscriptionStatus === 'active' ? '활성' : '비활성'}
          </span>
        </div>
      )}
    </div>
  );
};

export default MyAccountCard;
