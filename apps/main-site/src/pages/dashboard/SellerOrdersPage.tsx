/**
 * Seller Orders Page
 * Phase 3-7: 판매자 주문 관리 전체 페이지
 * Phase PD-9-UI: Multichannel Order Import
 */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { SellerOrdersSection } from '../../components/dashboard/seller/SellerOrdersSection';
import { ChannelApi, type SellerChannelAccount } from '../../services/channelApi';

export const SellerOrdersPage: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [channelAccounts, setChannelAccounts] = useState<SellerChannelAccount[]>([]);
  const [selectedChannelAccountId, setSelectedChannelAccountId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importKey, setImportKey] = useState(0); // Key to force re-render of SellerOrdersSection

  const handleOpenImportModal = async () => {
    setShowImportModal(true);
    setSelectedChannelAccountId('');

    try {
      const accounts = await ChannelApi.getChannelAccounts();
      setChannelAccounts(accounts.filter(acc => acc.isActive));
    } catch (error) {
      console.error('Failed to load channel accounts:', error);
      alert('채널 계정을 불러오는데 실패했습니다.');
    }
  };

  const handleImportOrders = async () => {
    if (!selectedChannelAccountId) {
      alert('채널 계정을 선택해주세요.');
      return;
    }

    try {
      setImporting(true);

      const result = await ChannelApi.importOrders(selectedChannelAccountId, {
        limit: 50,
      });

      alert(
        `주문 가져오기 완료!\n` +
        `- 가져온 주문: ${result.imported}개\n` +
        `- 건너뛴 주문: ${result.skipped}개\n` +
        `- 실패한 주문: ${result.failed}개`
      );

      setShowImportModal(false);
      // Force refresh of orders list
      setImportKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Failed to import orders:', error);
      alert(error.response?.data?.message || '주문 가져오기에 실패했습니다.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '주문 관리', isCurrent: true },
        ]}
      />

      <PageHeader
        title="주문 관리"
        subtitle="판매자의 주문을 확인하고 처리합니다."
        actions={
          <button
            onClick={handleOpenImportModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            채널 주문 가져오기
          </button>
        }
      />

      <SellerOrdersSection key={importKey} mode="full-page" />

      {/* Import Orders Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">채널 주문 가져오기</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                외부 채널에서 신규 주문을 가져옵니다. 이미 가져온 주문은 건너뜁니다.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  채널 계정 선택
                </label>
                {channelAccounts.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      연결된 채널 계정이 없습니다.{' '}
                      <a
                        href="/dashboard/seller/channels"
                        className="font-medium underline hover:text-yellow-900"
                      >
                        채널 계정을 먼저 추가
                      </a>
                      해주세요.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedChannelAccountId}
                    onChange={(e) => setSelectedChannelAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">채널을 선택하세요</option>
                    {channelAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.channel?.name || account.channelCode} - {account.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleImportOrders}
                disabled={!selectedChannelAccountId || importing || channelAccounts.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {importing ? '가져오는 중...' : '주문 가져오기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SellerOrdersPage;
