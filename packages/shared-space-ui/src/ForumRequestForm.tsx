/**
 * ForumRequestForm — 포럼 개설 신청 공통 폼 (Forum Request)
 *
 * WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1
 *
 * 4서비스(KPA / GlycoPharm / K-Cosmetics / Neture) 의 포럼 개설 신청 폼을 단일
 * 컴포넌트로 공통화한다. 직전 WO-O4O-FORUM-REQUEST-TAG-INPUT-PARITY-V1 로 GP/KCos/Neture
 * 신청 폼이 ~95% 동일해졌고, KPA 는 forumType(open/closed) 선택만 추가 → `showForumType`
 * opt-in 으로 흡수한다.
 *
 * - serviceCode / API client 호출 / 성공 navigate 는 각 서비스 page wrapper 가 담당
 *   (`onSubmit` 콜백 + `onSuccess`). 이 컴포넌트는 API client 를 import 하지 않는다.
 * - tag 는 자유입력형(O4O Tag Policy V1): trim, '#' 제거, 빈값/중복 제거, 30자 제한,
 *   최소 1개·최대 5개. backend ForumRequestService.create 의 TAGS_REQUIRED 와 정렬.
 * - 서비스 테마/문구는 props 로 주입(과도한 추상화 금지).
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquarePlus, ArrowLeft, Send, AlertCircle, CheckCircle, X } from 'lucide-react';

export type ForumRequestFormTheme = 'blue' | 'emerald' | 'pink' | 'primary';

export type ForumRequestFormPayload = {
  name: string;
  description: string;
  reason: string;
  tags: string[];
  forumType?: 'open' | 'closed';
};

export interface ForumRequestFormProps {
  /** 신청 제출. 각 서비스 page 가 serviceCode 를 붙여 API client 를 호출하고 결과를 반환한다. */
  onSubmit: (payload: ForumRequestFormPayload) => Promise<{ success: boolean; error?: string }>;
  /** 성공 후 콜백(보통 navigate). 미지정 시 성공 화면만 표시. */
  onSuccess?: () => void;
  /** 헤더 back 링크 + 취소 버튼 target (SPA route) */
  backTo: string;
  backLabel?: string;
  title?: string;
  description?: ReactNode;
  successMessage?: ReactNode;
  submitLabel?: string;
  /** KPA 전용: 포럼 유형(open/closed) 선택 노출 */
  showForumType?: boolean;
  defaultForumType?: 'open' | 'closed';
  /** 태그 입력 placeholder (서비스별 예시) */
  tagPlaceholder?: string;
  theme?: ForumRequestFormTheme;
}

interface ThemeTokens {
  icon: string;
  inputRing: string;
  tagsRing: string;
  chipBg: string;
  chipText: string;
  chipHover: string;
  radioActive: string;
  noticeBg: string;
  noticeIcon: string;
  noticeTitle: string;
  noticeText: string;
  submit: string;
}

const THEMES: Record<ForumRequestFormTheme, ThemeTokens> = {
  blue: {
    icon: 'text-blue-600',
    inputRing: 'focus:ring-blue-500',
    tagsRing: 'focus-within:ring-blue-500',
    chipBg: 'bg-blue-100',
    chipText: 'text-blue-700',
    chipHover: 'hover:text-blue-900',
    radioActive: 'border-blue-500 bg-blue-50',
    noticeBg: 'bg-blue-50',
    noticeIcon: 'text-blue-600',
    noticeTitle: 'text-blue-700',
    noticeText: 'text-blue-600',
    submit: 'bg-blue-600 hover:bg-blue-700',
  },
  emerald: {
    icon: 'text-emerald-600',
    inputRing: 'focus:ring-emerald-500',
    tagsRing: 'focus-within:ring-emerald-500',
    chipBg: 'bg-emerald-100',
    chipText: 'text-emerald-700',
    chipHover: 'hover:text-emerald-900',
    radioActive: 'border-emerald-500 bg-emerald-50',
    noticeBg: 'bg-emerald-50',
    noticeIcon: 'text-emerald-600',
    noticeTitle: 'text-emerald-700',
    noticeText: 'text-emerald-600',
    submit: 'bg-emerald-600 hover:bg-emerald-700',
  },
  pink: {
    icon: 'text-pink-600',
    inputRing: 'focus:ring-pink-500',
    tagsRing: 'focus-within:ring-pink-500',
    chipBg: 'bg-pink-100',
    chipText: 'text-pink-700',
    chipHover: 'hover:text-pink-900',
    radioActive: 'border-pink-500 bg-pink-50',
    noticeBg: 'bg-pink-50',
    noticeIcon: 'text-pink-600',
    noticeTitle: 'text-pink-700',
    noticeText: 'text-pink-600',
    submit: 'bg-pink-600 hover:bg-pink-700',
  },
  primary: {
    icon: 'text-primary-600',
    inputRing: 'focus:ring-primary-500',
    tagsRing: 'focus-within:ring-primary-500',
    chipBg: 'bg-primary-100',
    chipText: 'text-primary-700',
    chipHover: 'hover:text-primary-900',
    radioActive: 'border-primary-500 bg-primary-50',
    noticeBg: 'bg-blue-50',
    noticeIcon: 'text-blue-600',
    noticeTitle: 'text-blue-700',
    noticeText: 'text-blue-600',
    submit: 'bg-primary-600 hover:bg-primary-700',
  },
};

interface FormState {
  name: string;
  description: string;
  reason: string;
  forumType: 'open' | 'closed';
}

type FormErrors = Partial<{ name: string; description: string; tags: string }>;

export function ForumRequestForm({
  onSubmit,
  onSuccess,
  backTo,
  backLabel = '포럼으로 돌아가기',
  title = '새 포럼 신청',
  description = '원하시는 포럼이 없나요? 새 포럼을 신청해주세요.',
  successMessage = '관리자 검토 후 결과를 알려드리겠습니다.',
  submitLabel = '신청하기',
  showForumType = false,
  defaultForumType = 'open',
  tagPlaceholder = '태그 입력 (예: 주제, 분야)',
  theme = 'blue',
}: ForumRequestFormProps) {
  const t = THEMES[theme];

  const [formData, setFormData] = useState<FormState>({
    name: '',
    description: '',
    reason: '',
    forumType: defaultForumType,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || tag.length > 30 || selectedTags.includes(tag) || selectedTags.length >= 5) return;
    setSelectedTags((prev) => [...prev, tag]);
    setTagInput('');
    if (errors.tags) setErrors((prev) => ({ ...prev, tags: undefined }));
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((x) => x !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const validateForm = (): boolean => {
    const next: FormErrors = {};
    if (!formData.name.trim()) next.name = '포럼 이름을 입력해주세요';
    else if (formData.name.length < 2) next.name = '포럼 이름은 2자 이상이어야 합니다';
    else if (formData.name.length > 50) next.name = '포럼 이름은 50자 이하여야 합니다';
    if (!formData.description.trim()) next.description = '포럼 설명을 입력해주세요';
    else if (formData.description.length < 10) next.description = '포럼 설명은 10자 이상이어야 합니다';
    if (selectedTags.length === 0) next.tags = '태그를 1개 이상 입력해주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        reason: formData.reason.trim(),
        tags: selectedTags,
        ...(showForumType ? { forumType: formData.forumType } : {}),
      });
      if (!result.success) {
        setSubmitError(result.error || '신청에 실패했습니다.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      setIsSuccess(true);
      if (onSuccess) onSuccess();
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
          <p className="mt-2 text-slate-500">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link to={backTo} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquarePlus className={`w-7 h-7 ${t.icon}`} />
          {title}
        </h1>
        <p className="text-slate-500 mt-2">{description}</p>
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
            <label htmlFor="forum-req-name" className="block text-sm font-medium text-slate-700 mb-2">
              포럼 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="forum-req-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 포럼 이름"
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.name ? 'border-red-300 focus:ring-red-500' : `border-slate-200 ${t.inputRing}`
              } focus:outline-none focus:ring-2 focus:border-transparent`}
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* 포럼 설명 */}
          <div>
            <label htmlFor="forum-req-desc" className="block text-sm font-medium text-slate-700 mb-2">
              포럼 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="forum-req-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="이 포럼에서 어떤 주제를 다루나요?"
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.description ? 'border-red-300 focus:ring-red-500' : `border-slate-200 ${t.inputRing}`
              } focus:outline-none focus:ring-2 focus:border-transparent resize-none`}
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.description}
              </p>
            )}
          </div>

          {/* 태그 (자유입력 — O4O Tag Policy V1) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              태그 <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              포럼을 찾고 분류하는 데 사용할 태그를 1개 이상 입력하세요. Enter 또는 쉼표로 추가합니다. (최대 5개)
            </p>
            <div
              className={`flex flex-wrap gap-2 items-center px-3 py-2 rounded-lg border ${
                errors.tags ? 'border-red-300' : 'border-slate-200'
              } ${t.tagsRing} focus-within:ring-2 focus-within:border-transparent bg-white min-h-[44px]`}
            >
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${t.chipBg} ${t.chipText} text-sm font-medium`}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className={`ml-0.5 ${t.chipHover} transition-colors`}
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
                onBlur={() => {
                  if (tagInput.trim()) addTag(tagInput);
                }}
                placeholder={selectedTags.length === 0 ? tagPlaceholder : ''}
                className="flex-1 min-w-[120px] py-1 text-sm outline-none bg-transparent"
              />
            </div>
            {errors.tags && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.tags}
              </p>
            )}
          </div>

          {/* 신청 사유 (선택) */}
          <div>
            <label htmlFor="forum-req-reason" className="block text-sm font-medium text-slate-700 mb-2">
              신청 사유 <span className="text-slate-400">(선택)</span>
            </label>
            <textarea
              id="forum-req-reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="이 포럼이 필요한 이유를 설명해주세요 (선택사항)"
              rows={3}
              className={`w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 ${t.inputRing} focus:border-transparent resize-none`}
            />
          </div>

          {/* 포럼 유형 (KPA 전용) */}
          {showForumType && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                포럼 유형 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    formData.forumType === 'open' ? t.radioActive : 'border-slate-200 bg-white hover:border-slate-300'
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
                    formData.forumType === 'closed' ? t.radioActive : 'border-slate-200 bg-white hover:border-slate-300'
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
          )}
        </div>

        {/* 안내사항 */}
        <div className={`${t.noticeBg} rounded-xl p-4 flex gap-3`}>
          <AlertCircle className={`w-5 h-5 ${t.noticeIcon} flex-shrink-0 mt-0.5`} />
          <div className={`text-sm ${t.noticeTitle}`}>
            <p className="font-medium">안내사항</p>
            <ul className={`mt-1 space-y-1 list-disc list-inside ${t.noticeText}`}>
              <li>신청 후 관리자 검토까지 1-2일이 소요될 수 있습니다</li>
              <li>유사한 포럼이 이미 있는 경우 거절될 수 있습니다</li>
              <li>신청 결과는 내 신청 목록에서 확인할 수 있습니다</li>
            </ul>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <Link
            to={backTo}
            className="flex-1 px-6 py-3 text-center text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 px-6 py-3 text-white ${t.submit} rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                신청 중...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ForumRequestForm;
