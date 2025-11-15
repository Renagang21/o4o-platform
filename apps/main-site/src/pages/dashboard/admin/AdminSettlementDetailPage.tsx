/**
 * Admin Settlement Detail Page
 * Phase 4-2: 관리자 정산 상세 페이지
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import { PageHeader } from '../../../components/common/PageHeader';
import { EmptyState } from '../../../components/common/EmptyState';
import { ArrowLeft, Save, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import type {
  AdminSettlementDetail,
  SettlementStatus,
  PayoutMethod,
  PartnerSettlementDetail,
  SupplierSettlementDetail,
  SellerSettlementDetail,
} from '../../../types/settlement';
import { adminSettlementAPI } from '../../../services/adminSettlementApi';
import { handleApiError } from '../../../utils/apiErrorHandler';

export const AdminSettlementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [settlement, setSettlement] = useState<AdminSettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 메모 편집 상태
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);

  // 지급 정보 편집 상태
  const [editingPayout, setEditingPayout] = useState(false);
  const [payoutDate, setPayoutDate] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | ''>('');
  const [payoutNote, setPayoutNote] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);

  // 정산 상세 조회
  const fetchSettlementDetail = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await adminSettlementAPI.fetchAdminSettlementDetail(id);
      if (response.success) {
        setSettlement(response.data);
        setMemoText(response.data.memo_internal || '');
        setPayoutDate(response.data.payout_date || '');
        setPayoutMethod(response.data.payout_method || '');
        setPayoutNote(response.data.payout_note || '');
      }
    } catch (err) {
      const errorMessage = handleApiError(err, '정산 상세 정보');
      setError(errorMessage);
      setSettlement(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchSettlementDetail();
  };

  useEffect(() => {
    fetchSettlementDetail();
  }, [id]);

  // 역할별 컬러 테마
  const getThemeColors = () => {
    if (!settlement) return { primary: 'indigo', secondary: 'indigo' };

    switch (settlement.role) {
      case 'partner':
        return { primary: 'purple', secondary: 'purple' };
      case 'supplier':
        return { primary: 'blue', secondary: 'blue' };
      case 'seller':
        return { primary: 'green', secondary: 'green' };
      default:
        return { primary: 'indigo', secondary: 'indigo' };
    }
  };

  const themeColors = getThemeColors();

  // 역할 배지
  const getRoleBadge = () => {
    if (!settlement) return null;

    switch (settlement.role) {
      case 'partner':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
            파트너 정산
          </span>
        );
      case 'supplier':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            공급자 정산
          </span>
        );
      case 'seller':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            판매자 정산
          </span>
        );
      default:
        return null;
    }
  };

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
      const response = await adminSettlementAPI.updateAdminSettlementStatus(id, {
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
      const response = await adminSettlementAPI.updateAdminSettlementMemo(id, {
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

  // 지급 정보 저장 핸들러
  const handleSavePayout = async () => {
    if (!id || !settlement) return;

    setSavingPayout(true);

    try {
      const response = await adminSettlementAPI.updateAdminSettlementPayout(id, {
        payout_date: payoutDate || undefined,
        payout_method: payoutMethod || undefined,
        payout_note: payoutNote || undefined,
      });

      if (response.success) {
        alert(response.message || '지급 정보가 저장되었습니다.');
        setSettlement(response.data);
        setEditingPayout(false);
      }
    } catch (err: any) {
      console.error('지급 정보 저장 실패:', err);
      alert(err.message || '지급 정보 저장에 실패했습니다.');
    } finally {
      setSavingPayout(false);
    }
  };

  // 지급 방법 레이블
  const getPayoutMethodLabel = (method: PayoutMethod | ''): string => {
    switch (method) {
      case 'BANK_TRANSFER':
        return '계좌이체';
      case 'POINT':
        return '포인트 지급';
      case 'OTHER':
        return '기타';
      default:
        return '미지정';
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
              onClick={() => navigate('/dashboard/admin/settlements')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
          { label: '관리자 대시보드', href: '/dashboard/admin' },
          { label: '정산 관리', href: '/dashboard/admin/settlements' },
          {
            label: `${formatDate(settlement.period_start)} ~ ${formatDate(settlement.period_end)}`,
            isCurrent: true,
          },
        ]}
      />

      <div className="mb-4">
        <button
          onClick={() => navigate('/dashboard/admin/settlements')}
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
        <div className="flex items-center gap-2">
          {getRoleBadge()}
          {getStatusBadge(settlement.status)}
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Admin 지급 정보 카드 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">지급 정보 (Admin 전용)</h2>
            {!editingPayout && (
              <button
                onClick={() => setEditingPayout(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                편집
              </button>
            )}
          </div>

          {editingPayout ? (
            <div className="space-y-4">
              {/* 지급일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  지급일
                </label>
                <input
                  type="date"
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* 지급 방법 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  지급 방법
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">선택하세요</option>
                  <option value="BANK_TRANSFER">계좌이체</option>
                  <option value="POINT">포인트 지급</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>

              {/* 지급 메모 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  지급 메모
                </label>
                <textarea
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  rows={3}
                  placeholder="지급 관련 메모를 입력하세요."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={handleSavePayout}
                  disabled={savingPayout}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {savingPayout ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setEditingPayout(false);
                    setPayoutDate(settlement.payout_date || '');
                    setPayoutMethod(settlement.payout_method || '');
                    setPayoutNote(settlement.payout_note || '');
                  }}
                  disabled={savingPayout}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">지급일</div>
                <div className="text-base text-gray-900">
                  {settlement.payout_date ? formatDate(settlement.payout_date) : '미지정'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">지급 방법</div>
                <div className="text-base text-gray-900">
                  {getPayoutMethodLabel(settlement.payout_method || '')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">지급 메모</div>
                <div className="text-base text-gray-900">
                  {settlement.payout_note || '없음'}
                </div>
              </div>
            </div>
          )}
        </div>

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
              <div className="text-base text-gray-900">
                {formatDate(settlement.created_at)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">마지막 업데이트</div>
              <div className="text-base text-gray-900">
                {formatDate(settlement.updated_at)}
              </div>
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
                <div
                  className={`text-2xl font-bold ${
                    settlement.adjustment_amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {settlement.adjustment_amount >= 0 ? '+' : ''}
                  {formatCurrency(settlement.adjustment_amount, settlement.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">지급 예정 금액</div>
                <div className={`text-2xl font-bold text-${themeColors.primary}-600`}>
                  {formatCurrency(settlement.net_payout_amount, settlement.currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 역할별 성과 요약 */}
        {settlement.role === 'partner' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 요약 (파트너)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">총 클릭수</div>
                <div className="text-xl font-bold text-gray-900">
                  {((settlement as PartnerSettlementDetail).total_clicks ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 전환수</div>
                <div className="text-xl font-bold text-gray-900">
                  {((settlement as PartnerSettlementDetail).total_conversions ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 매출</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    (settlement as PartnerSettlementDetail).total_revenue || 0,
                    settlement.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">평균 전환율</div>
                <div className="text-xl font-bold text-gray-900">
                  {((settlement as PartnerSettlementDetail).total_clicks || 0) > 0
                    ? (
                        ((settlement as PartnerSettlementDetail).total_conversions! /
                          (settlement as PartnerSettlementDetail).total_clicks!) *
                        100
                      ).toFixed(2) + '%'
                    : '0%'}
                </div>
              </div>
            </div>
          </div>
        )}

        {settlement.role === 'supplier' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 요약 (공급자)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">총 공급 금액</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    (settlement as SupplierSettlementDetail).total_supply_amount || 0,
                    settlement.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 주문 수</div>
                <div className="text-xl font-bold text-gray-900">
                  {((settlement as SupplierSettlementDetail).total_orders ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 상품 수량</div>
                <div className="text-xl font-bold text-gray-900">
                  {((settlement as SupplierSettlementDetail).total_items ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {settlement.role === 'seller' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 요약 (판매자)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">총 매출</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    (settlement as SellerSettlementDetail).total_revenue || 0,
                    settlement.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 원가</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    (settlement as SellerSettlementDetail).total_cost || 0,
                    settlement.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 마진</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(
                    (settlement as SellerSettlementDetail).total_margin_amount || 0,
                    settlement.currency
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">평균 마진율</div>
                <div className="text-xl font-bold text-gray-900">
                  {((settlement as SellerSettlementDetail).average_margin_rate || 0) * 100}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 라인 아이템 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">상세 내역</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {settlement.role === 'partner' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        링크 이름
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        클릭수
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        전환수
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        매출
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        커미션
                      </th>
                    </>
                  )}
                  {settlement.role === 'supplier' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        주문 번호
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상품명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        판매자
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        수량
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        공급가
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        합계
                      </th>
                    </>
                  )}
                  {settlement.role === 'seller' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        주문 번호
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        상품명
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        수량
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        매출
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        원가
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        마진
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settlement.role === 'partner' &&
                  (settlement as PartnerSettlementDetail).lines?.map((line, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{line.link_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {line.clicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {line.conversions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(line.revenue, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(line.commission_amount, settlement.currency)}
                      </td>
                    </tr>
                  ))}

                {settlement.role === 'supplier' &&
                  (settlement as SupplierSettlementDetail).lines?.map((line, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{line.order_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{line.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{line.seller_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {line.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(line.supply_price, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(line.line_total, settlement.currency)}
                      </td>
                    </tr>
                  ))}

                {settlement.role === 'seller' &&
                  (settlement as SellerSettlementDetail).lines?.map((line, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{line.order_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{line.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {line.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(line.line_revenue || 0, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(line.line_cost || 0, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(line.line_margin_amount || 0, settlement.currency)}
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
                className="text-sm text-indigo-600 hover:text-indigo-800"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="정산 관련 메모를 입력하세요."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
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

export default AdminSettlementDetailPage;
