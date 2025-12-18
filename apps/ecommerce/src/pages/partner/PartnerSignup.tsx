/**
 * Partner Signup Page
 *
 * 파트너 가입 폼
 *
 * @package Phase K - Partner Flow
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '../../hooks/usePartner';
import { authClient } from '@o4o/auth-client';

export function PartnerSignup() {
  const navigate = useNavigate();
  const { signup, isPartner, isLoading } = usePartner();
  const user = authClient.getCurrentUser();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    youtube: '',
    instagram: '',
    blog: '',
    tiktok: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // 로그인 안 된 경우
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            로그인이 필요합니다
          </h2>
          <p className="text-gray-600 mb-6">
            파트너 가입을 위해 먼저 로그인해 주세요.
          </p>
          <button
            onClick={() => navigate('/login?redirect=/partner/signup')}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 이미 파트너인 경우
  if (!isLoading && isPartner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            이미 파트너입니다
          </h2>
          <p className="text-gray-600 mb-6">
            대시보드에서 활동을 시작하세요!
          </p>
          <button
            onClick={() => navigate('/partner/dashboard')}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setError('이용약관에 동의해 주세요.');
      return;
    }

    if (!formData.name.trim()) {
      setError('파트너명을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const socialLinks: Record<string, string> = {};
    if (formData.youtube) socialLinks.youtube = formData.youtube;
    if (formData.instagram) socialLinks.instagram = formData.instagram;
    if (formData.blog) socialLinks.blog = formData.blog;
    if (formData.tiktok) socialLinks.tiktok = formData.tiktok;

    const success = await signup(formData.name, socialLinks);

    setSubmitting(false);

    if (success) {
      navigate('/partner/dashboard');
    } else {
      setError('가입 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            파트너 가입
          </h1>
          <p className="text-gray-600">
            몇 가지 정보만 입력하면 바로 시작할 수 있어요.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* 파트너명 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              파트너명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="활동할 이름을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 소셜 링크 (선택) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소셜 채널 (선택)
            </label>
            <p className="text-sm text-gray-500 mb-4">
              활동 중인 채널이 있다면 입력해 주세요.
            </p>
            <div className="space-y-3">
              <input
                type="url"
                value={formData.youtube}
                onChange={(e) =>
                  setFormData({ ...formData, youtube: e.target.value })
                }
                placeholder="YouTube 채널 URL"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="url"
                value={formData.instagram}
                onChange={(e) =>
                  setFormData({ ...formData, instagram: e.target.value })
                }
                placeholder="Instagram 프로필 URL"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="url"
                value={formData.blog}
                onChange={(e) =>
                  setFormData({ ...formData, blog: e.target.value })
                }
                placeholder="블로그 URL"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="url"
                value={formData.tiktok}
                onChange={(e) =>
                  setFormData({ ...formData, tiktok: e.target.value })
                }
                placeholder="TikTok 프로필 URL"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 동의 */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                <span className="text-gray-900 font-medium">
                  파트너 이용약관
                </span>
                에 동의합니다. 커미션 정책, 정산 규정, 금지 행위 등을
                확인했습니다.
              </span>
            </label>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? '처리 중...' : '파트너 가입하기'}
          </button>
        </form>

        {/* 안내 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          가입 후 바로 추천 링크를 생성하고 활동을 시작할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
