import React, { useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { Users, Building2, UserPlus, Plus } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  description?: string;
  type: 'personal' | 'branch' | 'division' | 'global';
  ownerUserId: string;
  createdAt: string;
}

export default function YaksaCommunityList() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authClient.api.get('/yaksa/forum/communities/mine');

      if (response.data.success) {
        setCommunities(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load communities');
      }
    } catch (err: any) {
      console.error('Error loading communities:', err);
      setError(err.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const getCommunityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      personal: '개인',
      branch: '지부',
      division: '분회',
      global: '전체',
    };
    return labels[type] || type;
  };

  const getCommunityTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      personal: <UserPlus className="w-4 h-4" />,
      branch: <Building2 className="w-4 h-4" />,
      division: <Users className="w-4 h-4" />,
      global: <Users className="w-4 h-4" />,
    };
    return icons[type] || <Users className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">커뮤니티 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadCommunities}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yaksa 커뮤니티</h1>
          <p className="text-gray-600 mt-1">
            내가 속한 커뮤니티 목록입니다
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => {
            // TODO: Add create community modal
            alert('커뮤니티 생성 기능은 곧 추가될 예정입니다');
          }}
        >
          <Plus className="w-4 h-4" />
          커뮤니티 생성
        </button>
      </div>

      {communities.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            참여 중인 커뮤니티가 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            새로운 커뮤니티를 생성하거나 기존 커뮤니티에 가입하세요
          </p>
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => {
              // TODO: Add create community modal
              alert('커뮤니티 생성 기능은 곧 추가될 예정입니다');
            }}
          >
            커뮤니티 생성하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <div
              key={community.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                window.location.href = `/admin/yaksa/communities/${community.id}`;
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {community.name}
                  </h3>
                  {community.description && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {community.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {getCommunityTypeIcon(community.type)}
                  {getCommunityTypeLabel(community.type)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  생성일: {new Date(community.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
