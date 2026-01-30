/**
 * Settlement Detail Page
 *
 * DS-4 정산 배치 상세 및 상태 관리 화면
 *
 * 경로: /admin/dropshipping/settlements/:id
 *
 * DS-4.2/DS-4.3 준수:
 * - 계산 결과는 Read-only
 * - 상태 전이 버튼은 화이트리스트 기반
 * - 서버 에러 메시지 그대로 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
} from '@o4o/ui';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Calculator,
  Clock,
  CheckCircle,
  XCircle,
  History,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  getSettlementBatch,
  getSettlementBatchLogs,
  confirmSettlement,
  startProcessingSettlement,
  markSettlementAsPaid,
  markSettlementAsFailed,
  retrySettlement,
  SettlementBatch,
  SettlementLog,
  SettlementBatchStatus,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_COLORS,
  getSettlementAllowedTransitions,
} from '../../api/dropshipping-admin';

const SettlementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [settlement, setSettlement] = useState<SettlementBatch | null>(null);
  const [logs, setLogs] = useState<SettlementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Modal state
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');

  const fetchSettlement = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [settlementResponse, logsResponse] = await Promise.all([
        getSettlementBatch(id),
        getSettlementBatchLogs(id),
      ]);

      if (settlementResponse.success) {
        setSettlement(settlementResponse.data);
      }
      if (logsResponse.success) {
        setLogs(logsResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch settlement:', err);
      setError(err.message || '정산 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  const handleAction = async (action: 'confirm' | 'start-processing' | 'mark-paid' | 'retry') => {
    if (!id) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      let response;
      switch (action) {
        case 'confirm':
          response = await confirmSettlement(id);
          break;
        case 'start-processing':
          response = await startProcessingSettlement(id);
          break;
        case 'mark-paid':
          response = await markSettlementAsPaid(id);
          break;
        case 'retry':
          response = await retrySettlement(id);
          break;
      }
      if (response?.success) {
        setSettlement(response.data);
        const logsResponse = await getSettlementBatchLogs(id);
        if (logsResponse.success) {
          setLogs(logsResponse.data);
        }
      }
    } catch (err: any) {
      console.error(`Failed to ${action}:`, err);
      setUpdateError(err.message || '처리에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkFailed = async () => {
    if (!id || !failReason.trim()) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const response = await markSettlementAsFailed(id, failReason.trim());
      if (response.success) {
        setSettlement(response.data);
        setShowFailModal(false);
        setFailReason('');
        const logsResponse = await getSettlementBatchLogs(id);
        if (logsResponse.success) {
          setLogs(logsResponse.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to mark as failed:', err);
      setUpdateError(err.message || '처리에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error || '정산 배치를 찾을 수 없습니다.'}</p>
        </div>
        <Link to="/admin/dropshipping/settlements" className="mt-4 inline-block">
          <AGButton variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />}>
            목록으로
          </AGButton>
        </Link>
      </div>
    );
  }

  const allowedTransitions = getSettlementAllowedTransitions(settlement.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title={`정산 ${settlement.batchNumber}`}
        description="Settlement Batch 상세"
        icon={<Calculator className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Link to="/admin/dropshipping/settlements">
              <AGButton variant="ghost" size="sm" iconLeft={<ArrowLeft className="w-4 h-4" />}>
                목록
              </AGButton>
            </Link>
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchSettlement}
              iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              새로고침
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {updateError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{updateError}</p>
          </div>
        )}

        {/* Status & Actions */}
        <AGSection title="상태">
          <AGCard padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600">현재 상태:</span>
                <AGTag color={SETTLEMENT_STATUS_COLORS[settlement.status]} size="md">
                  {SETTLEMENT_STATUS_LABELS[settlement.status]}
                </AGTag>
              </div>

              {allowedTransitions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {/* DS-4.3: 상태별 허용된 액션만 표시 */}
                  {settlement.status === 'open' && allowedTransitions.includes('closed') && (
                    <AGButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleAction('confirm')}
                      disabled={updating}
                    >
                      {updating ? '처리중...' : '정산 확정 (마감)'}
                    </AGButton>
                  )}
                  {settlement.status === 'closed' && allowedTransitions.includes('processing') && (
                    <AGButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleAction('start-processing')}
                      disabled={updating}
                    >
                      {updating ? '처리중...' : '처리 시작'}
                    </AGButton>
                  )}
                  {settlement.status === 'processing' && (
                    <>
                      {allowedTransitions.includes('paid') && (
                        <AGButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleAction('mark-paid')}
                          disabled={updating}
                        >
                          {updating ? '처리중...' : '지급 완료'}
                        </AGButton>
                      )}
                      {allowedTransitions.includes('failed') && (
                        <AGButton
                          variant="danger"
                          size="sm"
                          onClick={() => setShowFailModal(true)}
                          disabled={updating}
                        >
                          지급 실패
                        </AGButton>
                      )}
                    </>
                  )}
                  {settlement.status === 'failed' && allowedTransitions.includes('processing') && (
                    <AGButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleAction('retry')}
                      disabled={updating}
                    >
                      {updating ? '처리중...' : '재시도'}
                    </AGButton>
                  )}
                </div>
              )}

              {allowedTransitions.length === 0 && (
                <span className="text-sm text-gray-500">
                  (최종 상태 - 변경 불가)
                </span>
              )}
            </div>
          </AGCard>
        </AGSection>

        {/* Settlement Summary (Read-only) */}
        <AGSection title="정산 요약 (읽기 전용)">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AGCard padding="lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">총 거래액</p>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(settlement.totalAmount)}</p>
                </div>
              </div>
            </AGCard>
            <AGCard padding="lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">수수료</p>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(settlement.commissionAmount)}</p>
                </div>
              </div>
            </AGCard>
            <AGCard padding="lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">차감액</p>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(settlement.deductionAmount)}</p>
                </div>
              </div>
            </AGCard>
            <AGCard padding="lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">순정산액</p>
                  <p className="text-lg font-bold text-green-600">{formatPrice(settlement.netAmount)}</p>
                </div>
              </div>
            </AGCard>
          </div>
        </AGSection>

        {/* Settlement Details */}
        <AGSection title="정산 정보">
          <AGCard padding="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">배치 번호</h4>
                <p className="text-gray-900">{settlement.batchNumber}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">정산 유형</h4>
                <p className="text-gray-900">
                  {settlement.settlementType === 'seller' && '판매자 정산'}
                  {settlement.settlementType === 'supplier' && '공급자 정산'}
                  {settlement.settlementType === 'platform-extension' && '플랫폼 확장'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">정산 기간</h4>
                <p className="text-gray-900">
                  {new Date(settlement.periodStart).toLocaleDateString('ko-KR')} ~ {new Date(settlement.periodEnd).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">생성일</h4>
                <p className="text-gray-900">{formatDate(settlement.createdAt)}</p>
              </div>
              {settlement.sellerId && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">판매자 ID</h4>
                  <p className="text-gray-900 font-mono text-sm">{settlement.sellerId}</p>
                </div>
              )}
              {settlement.supplierId && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">공급자 ID</h4>
                  <p className="text-gray-900 font-mono text-sm">{settlement.supplierId}</p>
                </div>
              )}
            </div>
          </AGCard>
        </AGSection>

        {/* Timeline */}
        <AGSection title="처리 타임라인">
          <AGCard padding="lg">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">생성:</span>
                <span className="text-sm">{formatDate(settlement.createdAt)}</span>
              </div>
              {settlement.closedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-600">마감:</span>
                  <span className="text-sm">{formatDate(settlement.closedAt)}</span>
                </div>
              )}
              {settlement.paidAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-600">지급:</span>
                  <span className="text-sm">{formatDate(settlement.paidAt)}</span>
                </div>
              )}
            </div>
          </AGCard>
        </AGSection>

        {/* Audit Logs */}
        <AGSection title="변경 이력">
          <AGCard padding="lg">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>변경 이력이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="border-l-2 border-gray-200 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{log.action}</span>
                      {log.previousStatus && log.newStatus && (
                        <span className="text-sm text-gray-500">
                          {SETTLEMENT_STATUS_LABELS[log.previousStatus]} → {SETTLEMENT_STATUS_LABELS[log.newStatus]}
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-sm text-gray-600 mb-1">사유: {log.reason}</p>
                    )}
                    {log.calculationDetails && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-1">
                        계산결과: 총 {formatPrice(log.calculationDetails.totalAmount)},
                        수수료 {formatPrice(log.calculationDetails.commissionAmount)},
                        순정산 {formatPrice(log.calculationDetails.netAmount)}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {log.actorType}:{log.actor} | {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AGCard>
        </AGSection>
      </div>

      {/* Fail Modal */}
      {showFailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4 text-red-600">
              지급 실패 처리
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                실패 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
                placeholder="실패 사유를 입력하세요 (필수)"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <AGButton
                variant="ghost"
                onClick={() => setShowFailModal(false)}
                disabled={updating}
              >
                취소
              </AGButton>
              <AGButton
                variant="danger"
                onClick={handleMarkFailed}
                disabled={!failReason.trim() || updating}
              >
                {updating ? '처리중...' : '실패 처리'}
              </AGButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementDetailPage;
