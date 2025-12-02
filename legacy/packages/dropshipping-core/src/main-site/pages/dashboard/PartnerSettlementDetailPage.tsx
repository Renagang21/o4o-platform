/**
 * Partner Settlement Detail Page
 * Phase 4-1: 파트너 정산 상세 페이지
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ArrowLeft, Save, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import type { PartnerSettlementDetail, SettlementStatus } from '@/types/settlement';
import { partnerSettlementAPI } from '@/services/partnerSettlementApi';
import { handleApiError } from '@/utils/apiErrorHandler';

export const PartnerSettlementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [settlement, setSettlement] = useState<PartnerSettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 메모 편집 상태
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);

  // 정산 상세 조회
  const fetchSettlementDetail = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await partnerSettlementAPI.fetchPartnerSettlementDetail(id);
      if (response.success) {
        setSettlement(response.data);
        setMemoText(response.data.memo_internal || '');
      }
    } catch (err) {
      const errorMessage = handleApiError(err, '정산 상세 정보');
      setError(errorMessage);
      setSettlement(null);
    } finally {
      setLoading(false);
    }
  };

  // Retry handler
  const handleRetry = () => {
    fetchSettlementDetail();
  };

  useEffect(() => {
    fetchSettlementDetail();
  }, [id]);

  // 상태 배지
  const getStatusBadge = (status: SettlementStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            정산 준비중
          </span>
        );
      case 'PENDING_PAYOUT':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
            지급 대기
          </span>
        );
      case 'PAID':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            지급 완료
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
            취소됨
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
            임시
          </span>
        );
      default:
        return null;
    }
  };

  // 금액 포맷
  const formatCurrency = (amount: number | undefined | null, currency: string = 'KRW') => {
    const value = amount ?? 0;
    if (currency === 'KRW') {
      return `₩ ${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  // 날짜 포맷
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    return dateString.split('T')[0];
  };

  // 전환율 계산
  const calculateCVR = (conversions: number, clicks: number): string => {
    if (clicks === 0) return '0%';
    return ((conversions / clicks) * 100).toFixed(2) + '%';
  };

  // 상태 변경 가능 여부 확인
  const getAvailableTransitions = (currentStatus: SettlementStatus): SettlementStatus[] => {
    switch (currentStatus) {
      case 'OPEN':
        return ['PENDING_PAYOUT', 'CANCELLED'];
      case 'PENDING_PAYOUT':
        return ['PAID', 'CANCELLED'];
      case 'PAID':
      case 'CANCELLED':
      case 'DRAFT':
        return [];
      default:
        return [];
    }
  };

  // 상태 변경 핸들러
  const handleStatusChange = async (newStatus: SettlementStatus) => {
    if (!id || !settlement) return;

    const confirmMessage =
      newStatus === 'CANCELLED'
        ? '정산을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        : `정산 상태를 "${getStatusLabel(newStatus)}"(으)로 변경하시겠습니까?`;

    if (!confirm(confirmMessage)) return;

    try {
      const response = await partnerSettlementAPI.updatePartnerSettlementStatus(id, {
        status: newStatus,
      });

      if (response.success) {
        alert(response.message || '정산 상태가 업데이트되었습니다.');
        fetchSettlementDetail();
      }
    } catch (err: any) {
      console.error('정산 상태 변경 실패:', err);
      alert(err.message || '정산 상태 변경에 실패했습니다.');
    }
  };

  // 상태 레이블
  const getStatusLabel = (status: SettlementStatus): string => {
    switch (status) {
      case 'OPEN':
        return '정산 준비중';
      case 'PENDING_PAYOUT':
        return '지급 대기';
      case 'PAID':
        return '지급 완료';
      case 'CANCELLED':
        return '취소됨';
      case 'DRAFT':
        return '임시';
      default:
        return status;
    }
  };

  // 메모 저장 핸들러
  const handleSaveMemo = async () => {
    if (!id || !settlement) return;

    setSavingMemo(true);

    try {
      const response = await partnerSettlementAPI.updatePartnerSettlementMemo(id, {
        memo_internal: memoText,
      });

      if (response.success) {
        alert(response.message || '메모가 저장되었습니다.');
        setSettlement(response.data);
        setEditingMemo(false);
      }
    } catch (err: any) {
      console.error('메모 저장 실패:', err);
      alert(err.message || '메모 저장에 실패했습니다.');
    } finally {
      setSavingMemo(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500">데이터를 불러오는 중입니다...</div>
    );
  }

  if (error) {
    return (
      <div className="p-12">
        <EmptyState
          icon={<AlertCircle className="w-16 h-16 text-red-400" />}
          title="정산 상세 정보를 불러올 수 없습니다"
          description={error}
          action={
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              다시 시도
            </button>
          }
        />
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="p-12">
        <EmptyState
          icon={<FileText className="w-16 h-16 text-gray-400" />}
          title="정산 정보를 찾을 수 없습니다"
          description="요청하신 정산 데이터가 존재하지 않습니다."
          action={
            <button
              onClick={() => navigate('/dashboard/partner/settlements')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              정산 목록으로 돌아가기
            </button>
          }
        />
      </div>
    );
  }

  const availableTransitions = getAvailableTransitions(settlement.status);

  return (
    <>
      <Breadcrumb
        items={[
          { label: '파트너 대시보드', href: '/dashboard/partner' },
          { label: '정산', href: '/dashboard/partner/settlements' },
          {
            label: `${formatDate(settlement.period_start)} ~ ${formatDate(settlement.period_end)}`,
            isCurrent: true,
          },
        ]}
      />

      <div className="mb-4">
        <button
          onClick={() => navigate('/dashboard/partner/settlements')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          정산 목록으로 돌아가기
        </button>
      </div>

      <PageHeader
        title="정산 상세"
        subtitle={`정산 기간: ${formatDate(settlement.period_start)} ~ ${formatDate(settlement.period_end)}`}
      >
        {getStatusBadge(settlement.status)}
      </PageHeader>

      <div className="space-y-6">
        {/* 정산 요약 카드 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">정산 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">정산 ID</div>
              <div className="text-base font-mono text-gray-900">{settlement.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">정산 상태</div>
              <div>{getStatusBadge(settlement.status)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">생성일</div>
              <div className="text-base text-gray-900">{formatDate(settlement.created_at)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">마지막 업데이트</div>
              <div className="text-base text-gray-900">{formatDate(settlement.updated_at)}</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">총 커미션</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(settlement.gross_commission_amount, settlement.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">조정 금액</div>
                <div className={`text-2xl font-bold ${settlement.adjustment_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {settlement.adjustment_amount >= 0 ? '+' : ''}
                  {formatCurrency(settlement.adjustment_amount, settlement.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">지급 예정 금액</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(settlement.net_payout_amount, settlement.currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 성과 요약 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 요약</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">총 클릭수</div>
              <div className="text-xl font-bold text-gray-900">
                {(settlement.total_clicks ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">총 전환수</div>
              <div className="text-xl font-bold text-gray-900">
                {(settlement.total_conversions ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">총 매출</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(settlement.total_revenue, settlement.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">평균 전환율</div>
              <div className="text-xl font-bold text-gray-900">
                {calculateCVR(settlement.total_conversions, settlement.total_clicks)}
              </div>
            </div>
          </div>
        </div>

        {/* 링크별 상세 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">링크별 상세</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    링크 이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    랜딩 URL
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    클릭수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전환수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    매출
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    커미션율
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    커미션 금액
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settlement.lines.map((line, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {line.link_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {line.landing_url}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {line.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {line.conversions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(line.revenue, settlement.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {(line.commission_rate * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(line.commission_amount, settlement.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 내부 메모 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">내부 메모</h2>
            {!editingMemo && (
              <button
                onClick={() => setEditingMemo(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                편집
              </button>
            )}
          </div>
          {editingMemo ? (
            <div>
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="정산 관련 메모를 입력하세요."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {savingMemo ? '저장 중...' : '메모 저장'}
                </button>
                <button
                  onClick={() => {
                    setEditingMemo(false);
                    setMemoText(settlement.memo_internal || '');
                  }}
                  disabled={savingMemo}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-700 whitespace-pre-wrap">
              {settlement.memo_internal || '메모가 없습니다.'}
            </div>
          )}
        </div>

        {/* 상태 변경 액션 */}
        {availableTransitions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">상태 변경</h2>
            <div className="flex flex-wrap gap-3">
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    status === 'CANCELLED'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {status === 'PENDING_PAYOUT' && '지급 대기 상태로 변경'}
                  {status === 'PAID' && '지급 완료 처리'}
                  {status === 'CANCELLED' && '정산 취소'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PartnerSettlementDetailPage;
