/**
 * MarketingMaterialsCreate — 공급자 마케팅 자료 등록
 *
 * WO-O4O-SUPPLIER-CONTENT-SUBMISSION-PHASE1-V1
 *
 * 경로: /supplierops/marketing-materials/new
 * 기능: 자료 입력 → 제출(cms_contents pending + kpa_approval_requests 생성)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { Send, Info } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface SubmitPayload {
  title: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  contentType: 'article' | 'image' | 'link' | 'product_info';
}

interface SubmitResponse {
  success: boolean;
  data?: {
    approvalRequestId: string;
    contentId: string;
    title: string;
    status: string;
  };
  error?: { code: string; message: string };
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/supplier/content-submissions';

const CONTENT_TYPE_OPTIONS = [
  { value: 'article', label: '아티클 (글)', description: '제품 설명, 사용법, 임상 정보 등 글 형태의 자료' },
  { value: 'product_info', label: '제품 정보', description: '제품 사양, 효능, 주의사항 등 정보성 자료' },
  { value: 'image', label: '이미지 자료', description: '제품 이미지, 인포그래픽, 포스터 등' },
  { value: 'link', label: '외부 링크', description: '관련 논문, 공식 사이트, 영상 등 외부 자료' },
] as const;

// ── API ──────────────────────────────────────────────────────────────────────

async function submitContent(payload: SubmitPayload): Promise<SubmitResponse> {
  const res = await authClient.api.post<SubmitResponse>(API_BASE, payload);
  return res.data;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MarketingMaterialsCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState<SubmitPayload>({
    title: '',
    summary: '',
    body: '',
    imageUrl: '',
    linkUrl: '',
    contentType: 'article',
  });

  const mutation = useMutation({
    mutationFn: submitContent,
    onSuccess: (res) => {
      if (res.success) {
        toast.success('자료가 제출되었습니다. 운영자 검토 후 HUB에 노출됩니다.');
        navigate('/supplierops/marketing-materials');
      } else {
        toast.error(res.error?.message ?? '제출 중 오류가 발생했습니다.');
      }
    },
    onError: () => {
      toast.error('제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('제목을 입력해 주세요.');
      return;
    }
    // 링크 유형인데 linkUrl 없으면 경고
    if (form.contentType === 'link' && !form.linkUrl?.trim()) {
      toast.error('링크 유형은 URL을 입력해 주세요.');
      return;
    }
    mutation.mutate({
      ...form,
      title: form.title.trim(),
      summary: form.summary?.trim() || undefined,
      body: form.body?.trim() || undefined,
      imageUrl: form.imageUrl?.trim() || undefined,
      linkUrl: form.linkUrl?.trim() || undefined,
    });
  };

  const selectedTypeInfo = CONTENT_TYPE_OPTIONS.find((o) => o.value === form.contentType);

  return (
    <div className="p-6">
      <PageHeader
        title="마케팅 자료 등록"
        subtitle="운영자 검토 후 약사 HUB에 노출됩니다."
        backUrl="/supplierops/marketing-materials"
        backLabel="목록으로"
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">

        {/* 자료 유형 */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            자료 유형 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer flex-col rounded-lg border-2 p-3 transition-colors ${
                  form.contentType === opt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="contentType"
                  value={opt.value}
                  checked={form.contentType === opt.value}
                  onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value as any }))}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                <span className="mt-0.5 text-xs text-gray-500">{opt.description}</span>
              </label>
            ))}
          </div>
          {selectedTypeInfo && (
            <p className="mt-2 flex items-center gap-1 text-xs text-blue-600">
              <Info size={12} />
              {selectedTypeInfo.description}
            </p>
          )}
        </div>

        {/* 제목 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="자료 제목을 입력하세요 (2~200자)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={200}
            required
          />
          <p className="mt-1 text-right text-xs text-gray-400">{form.title.length}/200</p>
        </div>

        {/* 요약 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            요약 <span className="text-gray-400">(선택)</span>
          </label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="자료 내용을 간략하게 요약해 주세요 (HUB 목록에 표시됩니다)"
            rows={2}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          />
        </div>

        {/* 본문 (링크 유형 제외) */}
        {form.contentType !== 'link' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              본문 내용 <span className="text-gray-400">(선택)</span>
            </label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="자료의 상세 내용을 입력해 주세요"
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
        )}

        {/* 이미지 URL (이미지 유형에서 강조) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            이미지 URL{' '}
            {form.contentType === 'image' && <span className="text-red-500">*</span>}
            {form.contentType !== 'image' && <span className="text-gray-400">(선택)</span>}
          </label>
          <input
            type="url"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          />
        </div>

        {/* 외부 링크 URL */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            외부 링크 URL{' '}
            {form.contentType === 'link' ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-gray-400">(선택)</span>
            )}
          </label>
          <input
            type="url"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/product-info"
            value={form.linkUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
          />
        </div>

        {/* 제출 안내 */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">제출 전 확인</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-700">
            <li>제출 후 내용 수정은 운영자에게 문의해 주세요.</li>
            <li>운영자 검토 후 약사 HUB에 노출됩니다 (1~3 영업일 소요).</li>
            <li>반려 시 사유를 확인하고 재등록 가능합니다.</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pb-6">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
            onClick={() => navigate('/supplierops/marketing-materials')}
            disabled={mutation.isPending}
          >
            취소
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={mutation.isPending}
          >
            <Send size={14} />
            {mutation.isPending ? '제출 중...' : '승인 요청 제출'}
          </button>
        </div>
      </form>
    </div>
  );
}
