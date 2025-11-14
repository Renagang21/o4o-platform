/**
 * Create Admin Settlement Modal
 * Phase 4-2: 관리자 정산 생성 모달
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { adminSettlementAPI } from '../../../services/adminSettlementApi';
import type { CreateAdminSettlementRequest, SettlementRole } from '../../../types/settlement';

interface CreateAdminSettlementModalProps {
  onClose: () => void;
  onSettlementCreated: (settlementId: string) => void;
}

export const CreateAdminSettlementModal: React.FC<CreateAdminSettlementModalProps> = ({
  onClose,
  onSettlementCreated,
}) => {
  const [role, setRole] = useState<SettlementRole>('partner');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 정산 생성 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!periodStart || !periodEnd) {
      setError('정산 기간을 입력해주세요.');
      return;
    }

    if (periodStart > periodEnd) {
      setError('시작일은 종료일보다 이전이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateAdminSettlementRequest = {
        role,
        period_start: periodStart,
        period_end: periodEnd,
        auto_calculate_from_analytics: autoCalculate,
        memo_internal: memo || undefined,
      };

      const response = await adminSettlementAPI.createAdminSettlement(payload);

      if (response.success) {
        alert(response.message || '정산이 성공적으로 생성되었습니다.');
        onSettlementCreated(response.data.id);
      }
    } catch (err: any) {
      console.error('정산 생성 실패:', err);
      setError(err.message || '정산 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모달 외부 클릭 핸들러
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 역할별 설명 텍스트
  const getRoleDescription = () => {
    switch (role) {
      case 'partner':
        return '파트너의 커미션을 기준으로 정산을 생성합니다.';
      case 'supplier':
        return '공급자의 공급가를 기준으로 정산을 생성합니다.';
      case 'seller':
        return '판매자의 매출/마진을 기준으로 정산을 생성합니다.';
      default:
        return '';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">새 정산 생성</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* 역할 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              정산 대상 <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as SettlementRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="partner">파트너</option>
              <option value="supplier">공급자</option>
              <option value="seller">판매자</option>
            </select>
          </div>

          {/* 설명 */}
          <p className="text-sm text-gray-600">{getRoleDescription()}</p>

          {/* 정산 기간 시작일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              정산 기간 시작일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* 정산 기간 종료일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              정산 기간 종료일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* 자동 계산 체크박스 */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="autoCalculate"
              checked={autoCalculate}
              onChange={(e) => setAutoCalculate(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="autoCalculate" className="text-sm text-gray-700">
              Analytics 데이터를 기반으로 자동 계산
            </label>
          </div>

          {/* 내부 메모 (선택) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내부 메모 (선택)
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="정산 관련 메모를 입력하세요."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '생성 중...' : '정산 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAdminSettlementModal;
