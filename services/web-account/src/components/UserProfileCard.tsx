/**
 * User Profile Card
 * 사용자 프로필 정보 표시
 */

import { User as UserIcon, Mail, Shield } from 'lucide-react';
import type { User } from '../contexts/AuthContext';

// WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role labels
const ROLE_LABELS: Record<string, string> = {
  'platform:super_admin': '최고 관리자',
  'platform:admin': '관리자',
  'neture:admin': '관리자',
  'neture:operator': '운영자',
  'neture:supplier': '공급자',
  'neture:partner': '파트너',
  'neture:seller': '셀러',
  'kpa-society:admin': 'KPA 관리자',
  'kpa-society:operator': 'KPA 운영자',
  'k-cosmetics:admin': 'K-Cosmetics 관리자',
  'k-cosmetics:operator': 'K-Cosmetics 운영자',
  'glycopharm:admin': 'GlycoPharm 관리자',
  'glycopharm:operator': 'GlycoPharm 운영자',
  'glucoseview:admin': 'GlucoseView 관리자',
  'glucoseview:operator': 'GlucoseView 운영자',
  user: '사용자',
};

export default function UserProfileCard({ user }: { user: User }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
          <UserIcon size={24} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{user.name || '사용자'}</h2>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <Mail size={14} />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <Shield size={14} />
            <span>{user.roles.map(r => ROLE_LABELS[r] || r).join(', ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
