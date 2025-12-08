/**
 * PartnerOps Profile Page
 *
 * Partner profile management:
 * - Register as partner
 * - Update profile info
 * - SNS account linking
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { authClient } from '@o4o/auth-client';
import {
  User,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  Instagram,
  Youtube,
  Link as LinkIcon,
} from 'lucide-react';

interface PartnerProfile {
  id: string;
  name: string;
  partnerCode: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  snsAccounts: Record<string, string>;
  totalConversions: number;
  totalCommission: number;
  createdAt: string;
}

const Profile: React.FC = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instagram: '',
    youtube: '',
    blog: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/partnerops/profile');
      if (response.data?.data) {
        const p = response.data.data;
        setProfile(p);
        setFormData({
          name: p.name || '',
          description: p.description || '',
          instagram: p.snsAccounts?.instagram || '',
          youtube: p.snsAccounts?.youtube || '',
          blog: p.snsAccounts?.blog || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      // Demo data
      const demo: PartnerProfile = {
        id: 'demo-partner',
        name: user?.name || '파트너',
        partnerCode: 'PARTNER001',
        description: '뷰티 및 라이프스타일 인플루언서',
        status: 'approved',
        snsAccounts: {
          instagram: '@beauty_partner',
          youtube: 'BeautyPartnerChannel',
          blog: 'https://blog.example.com',
        },
        totalConversions: 342,
        totalCommission: 1542000,
        createdAt: new Date().toISOString(),
      };
      setProfile(demo);
      setFormData({
        name: demo.name,
        description: demo.description,
        instagram: demo.snsAccounts.instagram || '',
        youtube: demo.snsAccounts.youtube || '',
        blog: demo.snsAccounts.blog || '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authClient.api.put('/partnerops/profile', {
        name: formData.name,
        description: formData.description,
        snsAccounts: {
          instagram: formData.instagram,
          youtube: formData.youtube,
          blog: formData.blog,
        },
      });
      setEditing(false);
      fetchProfile();
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('프로필 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      await authClient.api.post('/partnerops/profile/apply', {
        name: formData.name,
        description: formData.description,
        snsAccounts: {
          instagram: formData.instagram,
          youtube: formData.youtube,
          blog: formData.blog,
        },
      });
      alert('파트너 신청이 완료되었습니다. 승인을 기다려주세요.');
      fetchProfile();
    } catch (err) {
      console.error('Failed to apply:', err);
      alert('파트너 신청에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" /> 승인됨
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            <Clock className="w-4 h-4" /> 심사중
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            <X className="w-4 h-4" /> 거절됨
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

  // Not registered as partner yet
  if (!profile) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-4">파트너 등록</h1>
            <p className="text-gray-600 mb-6">
              파트너로 등록하고 제품을 홍보하여 커미션을 받으세요.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름 / 채널명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="파트너 이름"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">소개</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="간단한 자기소개"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  <Instagram className="w-4 h-4 inline mr-1" /> Instagram
                </label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  <Youtube className="w-4 h-4 inline mr-1" /> YouTube
                </label>
                <input
                  type="text"
                  value={formData.youtube}
                  onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="채널명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  <LinkIcon className="w-4 h-4 inline mr-1" /> 블로그/웹사이트
                </label>
                <input
                  type="text"
                  value={formData.blog}
                  onChange={(e) => setFormData({ ...formData, blog: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://"
                />
              </div>

              <button
                onClick={handleApply}
                disabled={saving || !formData.name}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '신청 중...' : '파트너 신청하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <p className="text-gray-600">파트너 코드: {profile.partnerCode}</p>
                {getStatusBadge(profile.status)}
              </div>
            </div>
            {!editing && profile.status === 'approved' && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                수정
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">소개</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Instagram</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">YouTube</label>
                <input
                  type="text"
                  value={formData.youtube}
                  onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">블로그/웹사이트</label>
                <input
                  type="text"
                  value={formData.blog}
                  onChange={(e) => setFormData({ ...formData, blog: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600">소개</h3>
                <p className="mt-1">{profile.description || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">총 전환</h3>
                  <p className="mt-1 text-xl font-bold">{profile.totalConversions}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">총 커미션</h3>
                  <p className="mt-1 text-xl font-bold text-blue-600">
                    {profile.totalCommission.toLocaleString()}원
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">SNS 계정</h3>
                <div className="space-y-2">
                  {profile.snsAccounts?.instagram && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="w-4 h-4" />
                      {profile.snsAccounts.instagram}
                    </div>
                  )}
                  {profile.snsAccounts?.youtube && (
                    <div className="flex items-center gap-2 text-sm">
                      <Youtube className="w-4 h-4" />
                      {profile.snsAccounts.youtube}
                    </div>
                  )}
                  {profile.snsAccounts?.blog && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="w-4 h-4" />
                      {profile.snsAccounts.blog}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t text-sm text-gray-500">
                가입일: {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
