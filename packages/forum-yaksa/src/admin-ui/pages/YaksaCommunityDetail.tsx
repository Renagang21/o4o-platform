import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { Users, ArrowLeft, Settings, UserPlus } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  description?: string;
  type: 'personal' | 'branch' | 'division' | 'global';
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export default function YaksaCommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'feed'>('overview');

  useEffect(() => {
    if (id) {
      loadCommunityData();
    }
  }, [id]);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load community details
      const communityResponse = await authClient.api.get(`/yaksa/forum/communities/${id}`);
      if (!communityResponse.data.success) {
        throw new Error(communityResponse.data.error || 'Failed to load community');
      }
      setCommunity(communityResponse.data.data);

      // Load community members
      const membersResponse = await authClient.api.get(`/yaksa/forum/communities/${id}/members`);
      if (membersResponse.data.success) {
        setMembers(membersResponse.data.data);
      }
    } catch (err: any) {
      console.error('Error loading community:', err);
      setError(err.message || 'Failed to load community');
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

  const getMemberRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: '소유자',
      admin: '관리자',
      member: '회원',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">커뮤니티 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
          <p className="text-red-600">{error || '커뮤니티를 찾을 수 없습니다'}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {community.name}
            </h1>
            {community.description && (
              <p className="text-gray-600 text-lg">{community.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {getCommunityTypeLabel(community.type)}
              </span>
              <span className="text-sm text-gray-500">
                생성일: {new Date(community.createdAt).toLocaleDateString('ko-KR')}
              </span>
              <span className="text-sm text-gray-500">
                회원 {members.length}명
              </span>
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            onClick={() => {
              alert('커뮤니티 설정 기능은 곧 추가될 예정입니다');
            }}
          >
            <Settings className="w-4 h-4" />
            설정
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            개요
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            회원 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'feed'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            피드
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">커뮤니티 정보</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600 mb-1">이름</dt>
              <dd className="text-gray-900">{community.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600 mb-1">유형</dt>
              <dd className="text-gray-900">{getCommunityTypeLabel(community.type)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-gray-600 mb-1">설명</dt>
              <dd className="text-gray-900">{community.description || '설명 없음'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600 mb-1">생성일</dt>
              <dd className="text-gray-900">
                {new Date(community.createdAt).toLocaleString('ko-KR')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600 mb-1">최종 수정</dt>
              <dd className="text-gray-900">
                {new Date(community.updatedAt).toLocaleString('ko-KR')}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">회원 목록</h2>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => {
                alert('회원 초대 기능은 곧 추가될 예정입니다');
              }}
            >
              <UserPlus className="w-4 h-4" />
              회원 초대
            </button>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">회원이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {members.map((member) => (
                <div key={member.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">회원 ID: {member.userId}</p>
                    <p className="text-sm text-gray-600">
                      가입일: {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    member.role === 'owner'
                      ? 'bg-purple-100 text-purple-700'
                      : member.role === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {getMemberRoleLabel(member.role)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'feed' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">커뮤니티 피드</h2>
          <div className="text-center py-12">
            <p className="text-gray-600">피드 기능은 곧 추가될 예정입니다</p>
          </div>
        </div>
      )}
    </div>
  );
}
