/**
 * SellerOps Settlement Dashboard
 *
 * 정산 현황 대시보드
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Download,
} from 'lucide-react';
import type {
  SettlementSummaryDto,
  SettlementBatchDto,
  CommissionDetailDto,
} from '../../dto/index.js';

interface SettlementDashboardProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const SettlementDashboard: React.FC<SettlementDashboardProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/sellerops',
}) => {
  const [summary, setSummary] = useState<SettlementSummaryDto | null>(null);
  const [batches, setBatches] = useState<SettlementBatchDto[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<CommissionDetailDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettlementData();
  }, [sellerId]);

  useEffect(() => {
    if (selectedBatch) {
      fetchCommissions(selectedBatch);
    }
  }, [selectedBatch]);

  const fetchSettlementData = async () => {
    setLoading(true);
    try {
      const [summaryRes, batchesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/settlement/summary?sellerId=${sellerId}`),
        fetch(`${apiBaseUrl}/settlement/batches?sellerId=${sellerId}`),
      ]);

      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
      if (batchesRes.ok) {
        setBatches(await batchesRes.json());
      }
    } catch (err) {
      console.error('Error fetching settlement data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissions = async (batchId: string) => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/settlement/commissions?sellerId=${sellerId}&batchId=${batchId}`
      );
      if (response.ok) {
        setCommissions(await response.json());
      }
    } catch (err) {
      console.error('Error fetching commissions:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" />
            진행중
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Calendar className="w-3 h-3" />
            마감
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            지급완료
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">정산 관리</h1>
        <p className="text-gray-600">정산 현황 및 수수료 내역</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">누적 정산액</p>
              <p className="text-2xl font-bold text-green-600">
                {summary?.totalSettled.toLocaleString()}원
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">정산 대기</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary?.pendingSettlement.toLocaleString()}원
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">이번 기간 매출</p>
              <p className="text-2xl font-bold">
                {summary?.currentPeriodSales.toLocaleString()}원
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">예상 수수료</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary?.currentPeriodCommission.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Settlement Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">정산 내역</h2>
          </div>
          <div className="divide-y">
            {batches.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                정산 내역이 없습니다
              </div>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedBatch === batch.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedBatch(batch.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {new Date(batch.periodStart).toLocaleDateString()} ~{' '}
                        {new Date(batch.periodEnd).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        거래 {batch.transactionCount}건
                      </p>
                    </div>
                    {getStatusBadge(batch.status)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      매출: {batch.totalAmount.toLocaleString()}원
                    </span>
                    <span className="text-gray-600">
                      수수료: {batch.commissionAmount.toLocaleString()}원
                    </span>
                  </div>
                  <div className="text-right mt-1">
                    <span className="font-medium text-blue-600">
                      정산액: {batch.netAmount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commission Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">수수료 상세</h2>
            {selectedBatch && (
              <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                <Download className="w-4 h-4" />
                내보내기
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {!selectedBatch ? (
              <div className="p-8 text-center text-gray-500">
                좌측에서 정산 기간을 선택하세요
              </div>
            ) : commissions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                수수료 내역이 없습니다
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">상품</th>
                    <th className="px-4 py-2 text-right">매출</th>
                    <th className="px-4 py-2 text-right">수수료율</th>
                    <th className="px-4 py-2 text-right">수수료</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="truncate max-w-[150px]">
                          {commission.productName}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {commission.saleAmount.toLocaleString()}원
                      </td>
                      <td className="px-4 py-2 text-right">
                        {commission.commissionRate}%
                      </td>
                      <td className="px-4 py-2 text-right text-orange-600">
                        {commission.commissionAmount.toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementDashboard;
