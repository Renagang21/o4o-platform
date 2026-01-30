/**
 * SellerOps Profile Page Wrapper
 */

import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  User,
  Mail,
  Phone,
  Building,
  CheckCircle,
  Clock,
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuthStore();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            활성
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4" />
            승인 대기
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">내 정보</h1>
        <p className="text-gray-600">판매자 프로필 관리</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">{user?.name || '판매자'}</h2>
              <div className="mt-2">{getStatusBadge((user as any)?.status || 'active')}</div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{user?.email || 'seller@example.com'}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-600">
                <Building className="w-4 h-4" />
                <span>조직 연결됨</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">프로필 정보</h2>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">
                    {user?.name || '판매자'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">
                    {user?.email || 'seller@example.com'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">
                    {user?.phone || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    계정 상태
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">
                    {getStatusBadge((user as any)?.status || 'active')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
