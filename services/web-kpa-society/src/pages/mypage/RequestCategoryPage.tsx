/**
 * RequestCategoryPage - 포럼 개설 신청 (KPA Society)
 *
 * WO-FORUM-TAG-POLICY-ALIGNMENT-PHASE2-V1
 * 자유입력 태그 (O4O Tag Policy V1)
 */

import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  MessageSquarePlus,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { forumRequestApi } from '../../api/forum';

type ForumType = 'open' | 'closed';

interface CategoryRequestForm {
  name: string;
  description: string;
  reason?: string;
  forumType: ForumType;
}

export default function RequestCategoryPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryRequestForm>({
    name: '',
    description: '',
    reason: '',
    forumType: 'open',
  });
  const [errors, setErrors] = useState<Partial<CategoryRequestForm & { tags: string }>>({});

  // 태그 상태 (자유입력)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || tag.length > 30 || selectedTags.includes(tag)) return;
    setSelectedTags((prev) => [...prev, tag]);
    setTagInput('');
    if (errors.tags) setErrors((prev) => ({ ...prev, tags: undefined }));
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CategoryRequestForm & { tags: string }> = {};
    if (!formData.name.trim()) newErrors.name = '포럼 이름을 입력해주세요';
    else if (formData.name.length < 2) newErrors.name = '포럼 이름은 2자 이상이어야 합니다';
    else if (formData.name.length > 50) newErrors.name = '포럼 이름은 50자 이하여야 합니다';
    if (!formData.description.trim()) newErrors.description = '포럼 설명을 입력해주세요';
    else if (formData.description.length < 10) newErrors.description = '포럼 설명은 10자 이상이어야 합니다';
    if (selectedTags.length === 0) newErrors.tags = '태그를 1개 이상 입력해주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await forumRequestApi.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        reason: formData.reason?.trim() || undefined,
        forumType: formData.forumType,
        tags: selectedTags,
      });
      if (!response.success) {
        setSubmitError(response.error || '신청에 실패했습니다.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => navigate('/mypage/my-requests?entityType=forum_category'), 3000);
    } catch {
      setSubmitError('신청 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-800">신청이 완료되었습니다</h2>
          <p className="mt-2 text-slate-500">
            관리자 검토 후 결과를 알려드리겠습니다.
            <br />내 신청에서 진행 상태를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <NavLink
          to="/forum"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />포럼으로 돌아가기
        </NavLink>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquarePlus className="w-7 h-7 text-blue-600" />새 포럼 신청
        </h1>
        <p className="text-slate-500 mt-2">
          원하시는 포럼이 없으신가요? 새 포럼 개설을 신청해 주세요.
          <br />관리자 검토 후 승인되면 포럼이 생성됩니다.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">

          {/* 포럼 이름 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              포럼 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 약국 경영 토론"
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.name
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-slate-200 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 focus:border-transparent`}
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />{errors.name}
              </p>
            )}
          </div>

          {/* 포럼 설명 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              포럼 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="이 포럼에서 어떤 주제를 다루나요?"
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.description
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-slate-200 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 focus:border-transparent resize-none`}
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />{errors.description}
              </p>
            )}
          </div>

          {/* ================================================================
              태그 입력 (자유입력 — O4O Tag Policy V1)
          ================================================================ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              태그 <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">포럼의 주제를 나타내는 태그를 자유롭게 입력해주세요. Enter 또는 쉼표로 추가합니다.</p>

            {/* 선택된 태그 chips + 입력 */}
            <div
              className={`flex flex-wrap gap-2 items-center px-3 py-2 rounded-lg border ${
                errors.tags ? 'border-red-300' : 'border-slate-200'
              } focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white min-h-[44px]`}
            >
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:text-blue-900 transition-colors"
                    aria-label={`${tag} 제거`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                placeholder={selectedTags.length === 0 ? '태그 입력 (예: 약국경영, 마케팅)' : ''}
                className="flex-1 min-w-[120px] py-1 text-sm outline-none bg-transparent"
              />
            </div>

            {errors.tags && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />{errors.tags}
              </p>
            )}
          </div>

          {/* 신청 사유 */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
              신청 사유 <span className="text-slate-400">(선택)</span>
            </label>
            <textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="이 포럼이 기존 포럼과 어떻게 다른지와 개설 목적을 간단히 작성해주세요. (운영자가 중복 여부와 필요성을 검토할 때 참고합니다)"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 포럼 유형 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              포럼 유형 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  formData.forumType === 'open'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="forumType"
                  value="open"
                  checked={formData.forumType === 'open'}
                  onChange={() => setFormData({ ...formData, forumType: 'open' })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-800">공개 포럼</div>
                  <p className="text-xs text-slate-500 mt-1">모든 회원이 자유롭게 참여할 수 있는 포럼</p>
                </div>
              </label>
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  formData.forumType === 'closed'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="forumType"
                  value="closed"
                  checked={formData.forumType === 'closed'}
                  onChange={() => setFormData({ ...formData, forumType: 'closed' })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-800">비공개 포럼</div>
                  <p className="text-xs text-slate-500 mt-1">승인된 회원만 참여할 수 있는 포럼</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 안내사항 */}
        <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">안내사항</p>
            <ul className="mt-1 space-y-1 list-disc list-inside text-blue-600">
              <li>신청 후 관리자 검토까지 1-2일이 소요될 수 있습니다</li>
              <li>유사한 포럼이 이미 있는 경우 거절될 수 있습니다</li>
              <li>신청 결과는 내 신청 탭에서 확인할 수 있습니다</li>
            </ul>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <NavLink
            to="/forum"
            className="flex-1 px-6 py-3 text-center text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            취소
          </NavLink>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                신청 중...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />신청하기
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
