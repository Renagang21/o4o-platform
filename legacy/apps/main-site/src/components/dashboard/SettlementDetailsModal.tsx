import React from 'react';
import { useSettlementDetail } from '../../hooks/useSettlements';
import type { Settlement } from '../../services/settlementApi';

interface SettlementDetailsModalProps {
  settlementId: string | null;
  onClose: () => void;
}

/**
 * Settlement Details Modal Component
 * Shows detailed information about a specific settlement
 */
export const SettlementDetailsModal: React.FC<SettlementDetailsModalProps> = ({
  settlementId,
  onClose,
}) => {
  const { data, isLoading } = useSettlementDetail(settlementId);

  if (!settlementId) return null;

  const settlement = data?.data;

  const formatCurrency = (amount: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">정산 상세 정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : settlement ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  settlement.status === 'completed' ? 'bg-green-100 text-green-800' :
                  settlement.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  settlement.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                  settlement.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {settlement.status === 'completed' ? '✓ 완료' :
                   settlement.status === 'processing' ? '⟳ 처리중' :
                   settlement.status === 'scheduled' ? '⏱ 예정' :
                   settlement.status === 'failed' ? '✗ 실패' :
                   settlement.status === 'pending' ? '⏳ 대기' : settlement.status}
                </span>
                <span className="text-sm text-gray-500">ID: {settlement.id.slice(0, 8)}...</span>
              </div>

              {/* Amount Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-700 mb-1">정산 금액</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(settlement.amount, settlement.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 mb-1">실지급액</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(settlement.netAmount, settlement.currency)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">수수료:</span>
                    <span className="ml-2 text-blue-900 font-medium">
                      {formatCurrency(settlement.fee, settlement.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">세금:</span>
                    <span className="ml-2 text-blue-900 font-medium">
                      {formatCurrency(settlement.tax, settlement.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipient Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">수령인 정보</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">수령인:</span>
                    <span className="text-sm font-medium text-gray-900">{settlement.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">유형:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {settlement.recipientType === 'partner' ? '파트너' :
                       settlement.recipientType === 'supplier' ? '공급사' : '플랫폼'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Account Info */}
              {settlement.bankAccount && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">계좌 정보</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">은행:</span>
                      <span className="text-sm font-medium text-gray-900">{settlement.bankAccount.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">계좌번호:</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {settlement.bankAccount.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">예금주:</span>
                      <span className="text-sm font-medium text-gray-900">{settlement.bankAccount.holderName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">처리 일정</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-gray-400"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">생성일</p>
                      <p className="text-sm text-gray-600">{formatDate(settlement.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${
                      settlement.status !== 'pending' ? 'bg-yellow-400' : 'bg-gray-300'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">예정일</p>
                      <p className="text-sm text-gray-600">{formatDate(settlement.scheduledAt)}</p>
                    </div>
                  </div>
                  {settlement.processedAt && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-400"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">처리 시작</p>
                        <p className="text-sm text-gray-600">{formatDate(settlement.processedAt)}</p>
                      </div>
                    </div>
                  )}
                  {settlement.completedAt && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-green-400"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">완료일</p>
                        <p className="text-sm text-gray-600">{formatDate(settlement.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Info */}
              {settlement.transactionId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">거래 정보</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">거래 ID:</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">{settlement.transactionId}</span>
                    </div>
                    {settlement.receiptUrl && (
                      <div className="pt-2">
                        <a
                          href={settlement.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          영수증 보기
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Failure Reason */}
              {settlement.status === 'failed' && settlement.failureReason && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="text-sm font-medium text-red-800 mb-2">실패 사유</h3>
                  <p className="text-sm text-red-700">{settlement.failureReason}</p>
                  {settlement.retryCount > 0 && (
                    <p className="text-xs text-red-600 mt-2">재시도 횟수: {settlement.retryCount}회</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {settlement.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">메모</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{settlement.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">정산 정보를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
