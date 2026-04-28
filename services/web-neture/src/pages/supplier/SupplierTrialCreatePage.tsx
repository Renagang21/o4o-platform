/**
 * Supplier Trial Create Page
 *
 * WO-O4O-MARKET-TRIAL-PHASE1-V1
 * WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1
 * WO-MARKET-TRIAL-PROPOSAL-STRUCTURE-V1
 *
 * 공급자가 Market Trial을 "매장 참여 설득 제안서" 구조로 작성하는 페이지.
 * 4개 섹션: 한 줄 제안 → 왜 이걸 해야 하는가 → 매장 활용 방법 → 참여 조건 및 혜택
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import { createTrial, submitTrial, updateTrial } from '../../api/trial';
import type { CreateTrialPayload, Trial } from '../../api/trial';

// WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1
const SALES_SCENARIO_TEMPLATE = `<h3>1. 진열 위치 및 방법</h3>
<p>예: 카운터 옆 진열대, POP 부착</p>
<h3>2. 고객 안내 멘트</h3>
<p>예: "새로 입고된 건강기능식품입니다. 무료 체험 가능합니다."</p>
<h3>3. 할인/프로모션 조건</h3>
<p>예: 첫 구매 10% 할인, 2+1 행사</p>
<h3>4. 기대 효과</h3>
<p>예: 월 평균 30개 판매, 객단가 15,000원 상승 기대</p>`;

const EMPTY_HTML_PATTERN = /^(<p>(<br\s*\/?>|\s|&nbsp;)*<\/p>\s*)*$/;

/** WO-MARKET-TRIAL-EDIT-FLOW-V1 */
interface SupplierTrialFormProps {
  mode?: 'create' | 'edit';
  trialId?: string;
  initialData?: Trial;
}

export default function SupplierTrialCreatePage({
  mode = 'create',
  trialId,
  initialData,
}: SupplierTrialFormProps = {}) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(initialData?.title || '');
  // WO-MARKET-TRIAL-PROPOSAL-STRUCTURE-V1
  const [oneLiner, setOneLiner] = useState(initialData?.oneLiner || '');
  // WO-MARKET-TRIAL-VIDEO-FIELD-V1
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [outcomeType, setOutcomeType] = useState<'product' | 'cash'>(initialData?.outcomeSnapshot?.expectedType || 'product');
  const [outcomeDescription, setOutcomeDescription] = useState(initialData?.outcomeSnapshot?.description || '');
  const [maxParticipants, setMaxParticipants] = useState(initialData?.maxParticipants ? String(initialData.maxParticipants) : '');
  const [fundingStartAt, setFundingStartAt] = useState(initialData?.startDate ? initialData.startDate.slice(0, 10) : '');
  const [fundingEndAt, setFundingEndAt] = useState(initialData?.endDate ? initialData.endDate.slice(0, 10) : '');
  const [trialPeriodDays, setTrialPeriodDays] = useState(initialData?.trialPeriodDays ? String(initialData.trialPeriodDays) : '30');
  // WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1
  const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount ? String(initialData.targetAmount) : '');
  const [trialUnitPrice, setTrialUnitPrice] = useState(initialData?.trialUnitPrice ? String(initialData.trialUnitPrice) : '');
  const [rewardRate, setRewardRate] = useState(initialData?.rewardRate != null ? String(initialData.rewardRate) : '0');
  // WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1
  const [salesScenarioContent, setSalesScenarioContent] = useState(initialData?.salesScenarioContent || SALES_SCENARIO_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // WO-MARKET-TRIAL-FORM-GUIDANCE-ENHANCEMENT-V1: 인라인 에러
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleSaveDraft = async () => {
    await handleCreate(false);
  };

  const handleSubmit = async () => {
    await handleCreate(true);
  };

  const handleCreate = async (autoSubmit: boolean) => {
    // WO-MARKET-TRIAL-FORM-GUIDANCE-ENHANCEMENT-V1: 전체 필드 검증 + 인라인 에러
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = '제목을 입력해주세요.';
    if (!oneLiner.trim() || oneLiner.trim().length < 10) errors.oneLiner = '한 줄 제안을 10자 이상 입력해주세요.';
    if (videoUrl.trim()) {
      try { new URL(videoUrl.trim()); } catch {
        errors.videoUrl = '영상 URL 형식이 올바르지 않습니다.';
      }
    }
    if (!fundingStartAt || !fundingEndAt) errors.funding = '모집 기간을 설정해주세요.';
    if (!trialPeriodDays || Number(trialPeriodDays) <= 0) errors.trialPeriodDays = 'Trial 기간(일)을 입력해주세요.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('입력 항목을 확인해주세요.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // WO-MARKET-TRIAL-FORM-GUIDANCE-ENHANCEMENT-V1: 제출 확인
    if (autoSubmit) {
      const confirmed = window.confirm('제출 후에는 수정이 제한될 수 있습니다. 제출하시겠습니까?');
      if (!confirmed) return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const scenarioHtml = salesScenarioContent?.trim();
      const payload: CreateTrialPayload = {
        title: title.trim(),
        oneLiner: oneLiner.trim(),
        videoUrl: videoUrl.trim() || undefined,
        description: description.trim() || undefined,
        salesScenarioContent: scenarioHtml && !EMPTY_HTML_PATTERN.test(scenarioHtml) ? scenarioHtml : undefined,
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

      if (mode === 'edit' && trialId) {
        await updateTrial(trialId, payload);
        navigate(`/supplier/market-trial/${trialId}`, {
          state: { message: 'Trial이 수정되었습니다.' },
        });
      } else {
        const created = await createTrial(payload);
        if (autoSubmit) {
          await submitTrial(created.id);
        }
        navigate('/supplier/dashboard', {
          state: { message: autoSubmit ? 'Trial이 제출되었습니다.' : 'Trial이 저장되었습니다.' },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Trial 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {mode === 'edit' ? '유통 참여형 펀딩 수정' : '유통 참여형 펀딩 등록'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">매장 참여를 설득하는 제안서를 작성하세요.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* ─── 섹션 1: 한 줄 제안 ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">한 줄 제안</h2>
            <p className="text-xs text-gray-500 mt-0.5">참여 여부를 결정하는 핵심 메시지입니다</p>
          </div>

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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.title ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            {fieldErrors.title && <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>}
          </div>

          {/* 한 줄 제안 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              한 줄 제안 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={oneLiner}
              onChange={(e) => setOneLiner(e.target.value)}
              maxLength={120}
              placeholder="매장에서 바로 팔 수 있는 간 건강 제품 테스트"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.oneLiner ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            <div className="flex justify-between mt-1">
              {fieldErrors.oneLiner ? <p className="text-xs text-red-500">{fieldErrors.oneLiner}</p> : <span />}
              <p className="text-xs text-gray-400">{oneLiner.length}/120</p>
            </div>
          </div>

          {/* 대표 영상 — WO-MARKET-TRIAL-VIDEO-FIELD-V1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">대표 영상 (선택)</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="영상 URL을 입력하세요 (YouTube, Vimeo 또는 기타 URL 가능)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.videoUrl ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            {fieldErrors.videoUrl
              ? <p className="text-xs text-red-500 mt-1">{fieldErrors.videoUrl}</p>
              : <p className="text-xs text-gray-400 mt-1">제품 사용이나 매장 판매 모습을 보여주면 참여율이 높아집니다</p>
            }
          </div>
        </div>

        {/* ─── 섹션 2: 왜 이걸 해야 하는가 ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">왜 이걸 해야 하는가</h2>
            <p className="text-xs text-gray-500 mt-0.5">제품 설명이 아니라, 매장에서 왜 이 제품을 취급해야 하는지를 중심으로 작성하세요</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">매장 관점의 필요성</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={"1) 이 제품이 필요한 고객은 누구입니까?\n2) 매장에서 왜 지금 취급해야 합니까?\n3) 기존 제품과 무엇이 다릅니까?"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* ─── 섹션 3: 매장 활용 방법 ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">매장 활용 방법</h2>
            <p className="text-xs text-gray-500 mt-0.5">매장에서 이 상품을 어떻게 판매할지 구체적으로 작성해주세요</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                판매 시나리오 설명
              </label>
              <button
                type="button"
                onClick={() => setSalesScenarioContent(SALES_SCENARIO_TEMPLATE)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                예시 다시 넣기
              </button>
            </div>
            <RichTextEditor
              value={salesScenarioContent}
              onChange={(c) => setSalesScenarioContent(c.html)}
              preset="compact"
              minHeight="280px"
              placeholder="판매 시나리오를 작성하세요..."
            />
          </div>
        </div>

        {/* ─── 섹션 4: 참여 조건 및 혜택 ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">참여 조건 및 혜택</h2>
            <p className="text-xs text-gray-500 mt-0.5">매장이 참여하기 위해 필요한 조건과, 참여 시 얻는 혜택을 명확히 작성하세요</p>
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
            <div>
              <h3 className="text-sm font-semibold text-blue-800">펀딩 구조 설정</h3>
              <p className="text-xs text-blue-600 mt-1">매장이 제품 단가로 참여하면, 설정한 리워드 비율만큼 추가 혜택을 받을 수 있습니다.</p>
            </div>

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
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  모집 시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fundingStartAt}
                  onChange={(e) => setFundingStartAt(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.funding ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.funding ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
            </div>
            {fieldErrors.funding && <p className="text-xs text-red-500 mt-1">{fieldErrors.funding}</p>}
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${fieldErrors.trialPeriodDays ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            {fieldErrors.trialPeriodDays && <p className="text-xs text-red-500 mt-1">{fieldErrors.trialPeriodDays}</p>}
          </div>
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
            {mode === 'edit' ? '수정 완료' : '임시저장'}
          </button>
          {mode !== 'edit' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '운영자 검토 요청'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
