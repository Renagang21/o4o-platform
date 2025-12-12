/**
 * Cosmetics Partner Campaigns Page
 *
 * Phase 6-F: Influencer Tools Expansion
 * - Campaign 생성 및 관리
 * - Social Share 콘텐츠 생성
 * - Campaign Analytics
 */

import React, { useState } from 'react';

// Types
interface Campaign {
  id: string;
  title: string;
  type: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  startDate: string;
  endDate?: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface ShareContent {
  platform: string;
  title: string;
  description: string;
  hashtags: string[];
  copyText: string;
}

// Campaign Types
const CAMPAIGN_TYPES = [
  { id: 'product_launch', name: '신제품 런칭', icon: '🚀' },
  { id: 'seasonal', name: '시즌 캠페인', icon: '🌸' },
  { id: 'flash_sale', name: '플래시 세일', icon: '🔥' },
  { id: 'routine_share', name: '루틴 공유', icon: '💫' },
];

const PLATFORMS = [
  { id: 'instagram', name: '인스타그램', icon: '📸' },
  { id: 'facebook', name: '페이스북', icon: '👤' },
  { id: 'twitter', name: '트위터(X)', icon: '🐦' },
  { id: 'kakao', name: '카카오톡', icon: '💬' },
  { id: 'blog', name: '블로그', icon: '📝' },
];

const CONTENT_TYPES = [
  { id: 'product', name: '제품 홍보' },
  { id: 'routine', name: '루틴 공유' },
  { id: 'storefront', name: '스토어 홍보' },
];

// Mock campaigns
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    title: '봄맞이 스킨케어 캠페인',
    type: 'seasonal',
    status: 'active',
    startDate: '2024-12-01',
    endDate: '2024-12-31',
    clicks: 1234,
    conversions: 56,
    revenue: 890000,
  },
  {
    id: '2',
    title: '신제품 세럼 런칭',
    type: 'product_launch',
    status: 'scheduled',
    startDate: '2024-12-15',
    clicks: 0,
    conversions: 0,
    revenue: 0,
  },
  {
    id: '3',
    title: '12월 플래시 세일',
    type: 'flash_sale',
    status: 'completed',
    startDate: '2024-11-25',
    endDate: '2024-11-26',
    clicks: 2456,
    conversions: 189,
    revenue: 2340000,
  },
];

const CosmeticsPartnerCampaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'social' | 'analytics'>('campaigns');

  // Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    type: 'product_launch',
    startDate: '',
    endDate: '',
  });

  // Social Share State
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [selectedContentType, setSelectedContentType] = useState('product');
  const [socialTone, setSocialTone] = useState('casual');
  const [generatedShare, setGeneratedShare] = useState<ShareContent | null>(null);

  // Create Campaign
  const createCampaign = () => {
    if (!newCampaign.title.trim() || !newCampaign.startDate) {
      alert('캠페인 제목과 시작일을 입력해주세요.');
      return;
    }

    const campaign: Campaign = {
      id: Date.now().toString(),
      title: newCampaign.title,
      type: newCampaign.type,
      status: 'draft',
      startDate: newCampaign.startDate,
      endDate: newCampaign.endDate || undefined,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    };

    setCampaigns([campaign, ...campaigns]);
    setShowCreateModal(false);
    setNewCampaign({ title: '', type: 'product_launch', startDate: '', endDate: '' });
  };

  // Generate Social Content (Mock)
  const generateSocialContent = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const platformConfig: Record<string, { emoji: string; cta: string }> = {
      instagram: { emoji: '✨', cta: '프로필 링크에서 확인하세요!' },
      facebook: { emoji: '💖', cta: '자세히 보기' },
      twitter: { emoji: '🔥', cta: '지금 확인!' },
      kakao: { emoji: '💬', cta: '링크 확인하기' },
      blog: { emoji: '📝', cta: '더 자세한 내용은 블로그에서' },
    };

    const config = platformConfig[selectedPlatform];

    setGeneratedShare({
      platform: selectedPlatform,
      title: `${config.emoji} 요즘 빠져있는 스킨케어`,
      description: `${config.emoji} 요즘 빠져있는 스킨케어\n\n정말 좋아서 공유해요!\n\n매일 쓰고 있는 제품이에요.\n\n${socialTone === 'trendy' ? '이게 바로 트렌드!' : '강추!'}`,
      hashtags: ['스킨케어', '피부관리', '뷰티', '화장품추천', '데일리루틴'],
      copyText: `${config.emoji} 요즘 빠져있는 스킨케어\n\n정말 좋아서 공유해요!\n\n#스킨케어 #피부관리 #뷰티\n\n👉 ${config.cta}`,
    });
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
  };

  // Get status badge
  const getStatusBadge = (status: Campaign['status']) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
      paused: 'bg-yellow-100 text-yellow-700',
    };
    const labels: Record<string, string> = {
      draft: '초안',
      scheduled: '예약됨',
      active: '진행 중',
      completed: '완료',
      paused: '일시정지',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">캠페인 & 소셜</h1>
        {activeTab === 'campaigns' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
          >
            + 새 캠페인
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'campaigns'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          캠페인 관리
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'social'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          소셜 콘텐츠
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'analytics'
              ? 'text-pink-600 border-b-2 border-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          분석
        </button>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Campaign Templates */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="font-medium text-gray-700 mb-3">빠른 캠페인 시작</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CAMPAIGN_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setNewCampaign({ ...newCampaign, type: type.id, title: type.name });
                    setShowCreateModal(true);
                  }}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-pink-50 hover:border-pink-300 border border-transparent text-center"
                >
                  <span className="text-2xl">{type.icon}</span>
                  <div className="text-sm mt-1">{type.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Campaign List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">캠페인</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">상태</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">기간</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">클릭</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">전환</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">수익</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span>{CAMPAIGN_TYPES.find((t) => t.id === campaign.type)?.icon}</span>
                        <span className="font-medium">{campaign.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(campaign.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {campaign.startDate}
                      {campaign.endDate && ` ~ ${campaign.endDate}`}
                    </td>
                    <td className="px-6 py-4 text-sm">{campaign.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">{campaign.conversions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">₩{campaign.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button className="text-pink-600 hover:text-pink-700 text-sm">
                        {campaign.status === 'draft' ? '발행' : '상세'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Social Content Tab */}
      {activeTab === 'social' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generator */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">소셜 콘텐츠 생성</h2>

            {/* Platform */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">플랫폼</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={`px-3 py-2 rounded-lg flex items-center gap-1 ${
                      selectedPlatform === platform.id
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{platform.icon}</span>
                    <span className="text-sm">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">콘텐츠 유형</label>
              <select
                value={selectedContentType}
                onChange={(e) => setSelectedContentType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">톤</label>
              <div className="flex gap-2">
                {['casual', 'professional', 'trendy'].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setSocialTone(tone)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      socialTone === tone
                        ? 'bg-pink-100 border-2 border-pink-600'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {tone === 'casual' ? '캐주얼' : tone === 'professional' ? '전문적' : '트렌디'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateSocialContent}
              className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700"
            >
              콘텐츠 생성하기
            </button>
          </div>

          {/* Result */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">생성된 콘텐츠</h2>

            {generatedShare ? (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">전체 텍스트</span>
                    <button
                      onClick={() => copyToClipboard(generatedShare.copyText)}
                      className="text-pink-600 text-sm hover:underline"
                    >
                      복사
                    </button>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                    {generatedShare.copyText}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">해시태그</span>
                    <button
                      onClick={() =>
                        copyToClipboard(generatedShare.hashtags.map((h) => `#${h}`).join(' '))
                      }
                      className="text-pink-600 text-sm hover:underline"
                    >
                      복사
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {generatedShare.hashtags.map((tag) => (
                      <span key={tag} className="text-blue-600 text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg">
                    인스타그램으로 공유
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>플랫폼과 콘텐츠 유형을 선택하고</p>
                <p>소셜 콘텐츠를 생성해보세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-gray-500 text-sm">총 캠페인</div>
              <div className="text-2xl font-bold">{campaigns.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-gray-500 text-sm">총 클릭</div>
              <div className="text-2xl font-bold">
                {campaigns.reduce((sum, c) => sum + c.clicks, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-gray-500 text-sm">총 전환</div>
              <div className="text-2xl font-bold">
                {campaigns.reduce((sum, c) => sum + c.conversions, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-gray-500 text-sm">총 수익</div>
              <div className="text-2xl font-bold text-pink-600">
                ₩{campaigns.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Chart Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">캠페인 성과 추이</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
              차트 영역 (추후 구현)
            </div>
          </div>

          {/* Top Campaigns */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">상위 캠페인</h3>
            <div className="space-y-3">
              {campaigns
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3)
                .map((campaign, index) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <div className="font-medium">{campaign.title}</div>
                        <div className="text-sm text-gray-500">
                          클릭 {campaign.clicks.toLocaleString()} / 전환 {campaign.conversions.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-pink-600">₩{campaign.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">새 캠페인 만들기</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 제목</label>
              <input
                type="text"
                value={newCampaign.title}
                onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                placeholder="캠페인 이름을 입력하세요"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 유형</label>
              <select
                value={newCampaign.type}
                onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {CAMPAIGN_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={newCampaign.startDate}
                  onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  value={newCampaign.endDate}
                  onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={createCampaign}
                className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerCampaigns;
