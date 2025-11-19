/**
 * Seller Channels Page
 * Phase PD-9-UI: Multichannel RPA
 *
 * Seller channel account management
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { ChannelApi, type SellerChannelAccount, type ExternalChannel } from '../../services/channelApi';

export const SellerChannelsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<SellerChannelAccount[]>([]);
  const [availableChannels, setAvailableChannels] = useState<ExternalChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedChannelCode, setSelectedChannelCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsData, channelsData] = await Promise.all([
        ChannelApi.getChannelAccounts(),
        ChannelApi.listAvailableChannels(),
      ]);
      setAccounts(accountsData);
      setAvailableChannels(channelsData);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelCode || !displayName) {
      alert('모든 필드를 입력해주세요');
      return;
    }

    try {
      setCreating(true);
      await ChannelApi.createChannelAccount({
        channelCode: selectedChannelCode,
        displayName,
      });
      setShowCreateModal(false);
      setSelectedChannelCode('');
      setDisplayName('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '채널 계정 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAccount = async (account: SellerChannelAccount) => {
    if (!confirm(`"${account.displayName}" 채널 계정을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await ChannelApi.deleteChannelAccount(account.id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '채널 계정 삭제에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: '판매자 대시보드', href: '/dashboard/seller' },
            { label: '채널 관리', isCurrent: true },
          ]}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '채널 관리', isCurrent: true },
        ]}
      />

      <PageHeader
        title="채널 관리"
        subtitle="외부 판매 채널 계정을 연결하고 관리하세요"
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            채널 계정 추가
          </button>
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Channel Accounts List */}
      <div className="bg-white rounded-lg shadow">
        {accounts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-2">연결된 채널 계정이 없습니다</div>
            <p className="text-sm text-gray-500">
              채널 계정을 추가하여 상품을 외부 채널에 내보내세요
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    채널
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    계정 이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마지막 동기화
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">
                          {account.channel?.name || account.channelCode}
                        </div>
                        {account.channelCode === 'test_channel' && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            테스트
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.displayName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          활성
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.lastSyncAt
                        ? new Date(account.lastSyncAt).toLocaleString('ko-KR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box for Test Channel */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">테스트 채널 안내</p>
            <p>
              현재 <strong>테스트 채널</strong>만 사용 가능합니다. 네이버 스마트스토어, 쿠팡 등 실제 채널은 추후 지원 예정입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Create Channel Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">채널 계정 추가</h3>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  채널 선택
                </label>
                <select
                  value={selectedChannelCode}
                  onChange={(e) => setSelectedChannelCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">채널을 선택하세요</option>
                  {availableChannels.map((channel) => (
                    <option key={channel.code} value={channel.code}>
                      {channel.name}
                      {channel.code === 'test_channel' && ' (테스트용)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  계정 이름
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="예: 내 테스트 채널 1번"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  구분하기 쉬운 이름을 입력하세요
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedChannelCode('');
                    setDisplayName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {creating ? '생성 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SellerChannelsPage;
