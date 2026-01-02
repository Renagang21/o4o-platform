import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  MessageSquarePlus,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type { CategoryRequestForm } from '@/types';
import { forumRequestApi } from '@/services/api';

export default function RequestCategoryPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryRequestForm>({
    name: '',
    description: '',
    reason: '',
  });
  const [errors, setErrors] = useState<Partial<CategoryRequestForm>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CategoryRequestForm> = {};

    if (!formData.name.trim()) {
      newErrors.name = '포럼 이름을 입력해주세요';
    } else if (formData.name.length < 2) {
      newErrors.name = '포럼 이름은 2자 이상이어야 합니다';
    } else if (formData.name.length > 50) {
      newErrors.name = '포럼 이름은 50자 이하여야 합니다';
    }

    if (!formData.description.trim()) {
      newErrors.description = '포럼 설명을 입력해주세요';
    } else if (formData.description.length < 10) {
      newErrors.description = '포럼 설명은 10자 이상이어야 합니다';
    }

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
      });

      if (response.error) {
        setSubmitError(response.error.message);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      // 3초 후 내 신청 목록 페이지로 이동
      setTimeout(() => {
        navigate('/forum/my-requests');
      }, 3000);
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
          <h2 className="mt-4 text-xl font-bold text-slate-800">
            신청이 완료되었습니다
          </h2>
          <p className="mt-2 text-slate-500">
            관리자 검토 후 결과를 알려드리겠습니다.
            <br />
            내 신청 목록으로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <NavLink
          to="/forum"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          포럼으로 돌아가기
        </NavLink>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquarePlus className="w-7 h-7 text-primary-600" />
          새 포럼 신청
        </h1>
        <p className="text-slate-500 mt-2">
          원하시는 포럼 카테고리가 없나요? 새 포럼을 신청해주세요.
          <br />
          관리자 검토 후 승인되면 포럼이 생성됩니다.
        </p>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{submitError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              포럼 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="예: 혈당 관리 팁"
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.name
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-slate-200 focus:ring-primary-500'
              } focus:outline-none focus:ring-2 focus:border-transparent`}
            />
            {errors.name && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              포럼 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="이 포럼에서 어떤 주제를 다루나요?"
              rows={4}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.description
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-slate-200 focus:ring-primary-500'
              } focus:outline-none focus:ring-2 focus:border-transparent resize-none`}
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              신청 사유 <span className="text-slate-400">(선택)</span>
            </label>
            <textarea
              id="reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="이 포럼이 필요한 이유를 설명해주세요 (선택사항)"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">안내사항</p>
            <ul className="mt-1 space-y-1 list-disc list-inside text-blue-600">
              <li>신청 후 관리자 검토까지 1-2일이 소요될 수 있습니다</li>
              <li>유사한 포럼이 이미 있는 경우 거절될 수 있습니다</li>
              <li>신청 결과는 내 신청 목록에서 확인할 수 있습니다</li>
            </ul>
          </div>
        </div>

        {/* Submit */}
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
            className="flex-1 px-6 py-3 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                신청 중...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                신청하기
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
