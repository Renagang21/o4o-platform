/**
 * SupplierOps Profile Page
 */

import React, { useState, useEffect } from 'react';
import { Building, User, Mail, Phone, MapPin, CheckCircle, Clock } from 'lucide-react';

interface SupplierProfile {
  id: string;
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;
  businessNumber: string;
  address: string;
  approvalStatus: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setProfile({
        id: '1',
        companyName: '코스메틱스 코리아',
        representativeName: '김대표',
        email: 'contact@cosmetics-korea.com',
        phone: '02-1234-5678',
        businessNumber: '123-45-67890',
        address: '서울시 강남구 테헤란로 123',
        approvalStatus: 'active',
      });
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            승인됨
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">공급자 정보</h1>
        <p className="text-gray-600">공급자 계정 정보를 확인하고 수정하세요</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.companyName}</h2>
              <p className="text-gray-500">{profile?.businessNumber}</p>
            </div>
          </div>
          {profile && getStatusBadge(profile.approvalStatus)}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사명
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Building className="w-5 h-5 text-gray-400" />
                <span>{profile?.companyName}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                대표자명
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <span>{profile?.representativeName}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <span>{profile?.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-400" />
                <span>{profile?.phone}</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{profile?.address}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              정보 수정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
