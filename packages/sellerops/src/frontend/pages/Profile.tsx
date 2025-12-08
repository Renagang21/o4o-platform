/**
 * SellerOps Profile Page
 *
 * 판매자 프로필 관리
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  Save,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import type { SellerProfileDto, UpdateProfileDto } from '../../dto/index.js';

interface ProfileProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const Profile: React.FC<ProfileProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/sellerops',
}) => {
  const [profile, setProfile] = useState<SellerProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>({});

  useEffect(() => {
    fetchProfile();
  }, [sellerId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/profile?sellerId=${sellerId}`
      );
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/profile?sellerId=${sellerId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditMode(false);
        alert('프로필이 저장되었습니다.');
      }
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

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
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
            <XCircle className="w-4 h-4" />
            정지됨
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          프로필 정보를 불러올 수 없습니다.
        </div>
      </div>
    );
  }

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
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <div className="mt-2">{getStatusBadge(profile.status)}</div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{profile.contactEmail}</span>
              </div>
              {profile.contactPhone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{profile.contactPhone}</span>
                </div>
              )}
              {profile.organizationId && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Building className="w-4 h-4" />
                  <span>조직 연결됨</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t text-sm text-gray-500">
              <p>가입일: {new Date(profile.createdAt).toLocaleDateString()}</p>
              <p>
                최종 수정: {new Date(profile.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">프로필 정보</h2>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  수정
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        name: profile.name,
                        contactEmail: profile.contactEmail,
                        contactPhone: profile.contactPhone,
                      });
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        저장
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg">
                      {profile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactEmail: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg">
                      {profile.contactEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={formData.contactPhone || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPhone: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="010-0000-0000"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg">
                      {profile.contactPhone || '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    계정 상태
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg">
                    {getStatusBadge(profile.status)}
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
