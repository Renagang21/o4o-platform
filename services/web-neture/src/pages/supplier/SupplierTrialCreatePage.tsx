/**
 * Supplier Trial Create Page
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * 공급자가 Market Trial을 생성하고 제출하는 페이지.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTrial, submitTrial } from '../../api/trial';
import type { CreateTrialPayload } from '../../api/trial';

const SERVICE_KEY_OPTIONS = [
  { key: 'glycopharm', label: 'GlycoPharm' },
  { key: 'k-cosmetics', label: 'K-Cosmetics' },
];

export default function SupplierTrialCreatePage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibleServiceKeys, setVisibleServiceKeys] = useState<string[]>([]);
  const [outcomeType, setOutcomeType] = useState<'product' | 'cash'>('product');
  const [outcomeDescription, setOutcomeDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [fundingStartAt, setFundingStartAt] = useState('');
  const [fundingEndAt, setFundingEndAt] = useState('');
  const [trialPeriodDays, setTrialPeriodDays] = useState('30');
  // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
  const [targetAmount, setTargetAmount] = useState('');
  const [trialUnitPrice, setTrialUnitPrice] = useState('');
  const [rewardRate, setRewardRate] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 정산 계산 미리보기
  const settlementPreview = (() => {
    const unit = Number(trialUnitPrice);
    const rate = Number(rewardRate);
    if (!unit || unit <= 0) return null;
    const total = unit * (1 + rate / 100);
    const qty = Math.floor(total / unit);
    const rem = total - qty * unit;
    return { total: Math.round(total), qty, rem: Math.round(rem) };
  })();

  const toggleServiceKey = (key: string) => {
    setVisibleServiceKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSaveDraft = async () => {
    await handleCreate(false);
  };

  const handleSubmit = async () => {
    await handleCreate(true);
  };

  const handleCreate = async (autoSubmit: boolean) => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!fundingStartAt || !fundingEndAt) {
      setError('모집 기간을 설정해주세요.');
      return;
    }
    if (!trialPeriodDays || Number(trialPeriodDays) <= 0) {
      setError('Trial 기간(일)을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: CreateTrialPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        visibleServiceKeys,
        outcomeSnapshot: outcomeDescription.trim()
          ? { expectedType: outcomeType, description: outcomeDescription.trim() }
          : undefined,
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
        fundingStartAt: new Date(fundingStartAt).toISOString(),
        fundingEndAt: new Date(fundingEndAt).toISOString(),
        trialPeriodDays: Number(trialPeriodDays),
        // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
        targetAmount: targetAmount ? Number(targetAmount) : undefined,
        trialUnitPrice: trialUnitPrice ? Number(trialUnitPrice) : undefined,
        rewardRate: Number(rewardRate) || 0,
      };

      const created = await createTrial(payload);

      if (autoSubmit) {
        await submitTrial(created.id);
      }

      navigate('/supplier/dashboard', {
        state: { message: autoSubmit ? 'Trial이 제출되었습니다.' : 'Trial이 저장되었습니다.' },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Trial 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Market Trial 등록</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 신제품 A 약국 시험 도입"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Trial의 목적과 세부 사항을 입력하세요."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 대상 서비스 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">대상 서비스</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_KEY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleServiceKey(opt.key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  visibleServiceKeys.includes(opt.key)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 결과 약속 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">결과 약속</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                value="product"
                checked={outcomeType === 'product'}
                onChange={() => setOutcomeType('product')}
              />
              제품 제공
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                value="cash"
                checked={outcomeType === 'cash'}
                onChange={() => setOutcomeType('cash')}
              />
              현금 보상
            </label>
          </div>
          <input
            type="text"
            value={outcomeDescription}
            onChange={(e) => setOutcomeDescription(e.target.value)}
            placeholder="예: 시험 참여 매장에 정식 제품 1박스 제공"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 펀딩 구조 — WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1 */}
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800">펀딩 구조 설정</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                목표 금액 (원)
              </label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                min="0"
                placeholder="예: 1000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제품 단가 (원)
              </label>
              <input
                type="number"
                value={trialUnitPrice}
                onChange={(e) => setTrialUnitPrice(e.target.value)}
                min="0"
                placeholder="예: 2000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              리워드 (%) — 참여자에게 돌아가는 추가 환원 비율
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={rewardRate}
                onChange={(e) => setRewardRate(e.target.value)}
                min="0"
                max="100"
                step="0.5"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">% (0 = 리워드 없음)</span>
            </div>
          </div>

          {/* 계산 미리보기 */}
          {settlementPreview && (
            <div className="p-3 bg-white border border-blue-200 rounded-lg text-sm">
              <p className="font-medium text-blue-700 mb-1">정산 계산 미리보기 (단가 1개 기준)</p>
              <p className="text-gray-600">
                단가 {Number(trialUnitPrice).toLocaleString()}원 + 리워드 {rewardRate}%
                → 총 {settlementPreview.total.toLocaleString()}원
              </p>
              {settlementPreview.qty > 0 && (
                <p className="text-gray-600">
                  → 약 {settlementPreview.qty}개
                  {settlementPreview.rem > 0 ? ` + 잔액 ${settlementPreview.rem.toLocaleString()}원` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 참여 인원 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최대 참여 매장 수 (비워두면 무제한)
          </label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            min="1"
            placeholder="예: 50"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 모집 기간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              모집 시작일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fundingStartAt}
              onChange={(e) => setFundingStartAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              모집 종료일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fundingEndAt}
              onChange={(e) => setFundingEndAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Trial 기간 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trial 기간 (일) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={trialPeriodDays}
            onChange={(e) => setTrialPeriodDays(e.target.value)}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            임시저장
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '처리 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
