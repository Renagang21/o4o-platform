/**
 * Find Password Shortcode
 * Allows users to reset their password via email verification
 */

import React, { useState } from 'react';
import { Key, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { authClient } from '@o4o/auth-client';

// Find Password Component (exported for shortcode use)
export const FindPasswordComponent: React.FC<{
  title?: string;
  subtitle?: string;
  successMessage?: string;
  backUrl?: string;
}> = ({
  title = '비밀번호 찾기',
  subtitle = '가입 시 등록한 이메일 주소를 입력해주세요',
  successMessage = '비밀번호 재설정 링크를 이메일로 발송했습니다.',
  backUrl = '/login'
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const response = await authClient.api.post('/auth/forgot-password', { email });

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || successMessage);
      } else {
        setStatus('error');
        setMessage(response.data.message || '비밀번호 재설정에 실패했습니다.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Key className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
      </div>

      {status === 'success' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-4">{message}</p>
            <p className="text-xs text-gray-500">
              이메일을 확인하고 비밀번호 재설정 링크를 클릭해주세요.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              링크는 10분간 유효합니다.
            </p>
          </div>
          <div className="space-y-2 pt-4">
            <button
              onClick={() => window.location.href = backUrl}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인하기
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{message}</span>
            </div>
          )}

          <div>
            <label htmlFor="find-password-email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일 주소
            </label>
            <input
              id="find-password-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '비밀번호 재설정 링크 발송'
              )}
            </button>

            <button
              type="button"
              onClick={() => window.location.href = backUrl}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              로그인으로 돌아가기
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center text-xs text-gray-500">
        <a href="/find-id" className="text-blue-600 hover:underline">
          아이디를 잊으셨나요?
        </a>
      </div>
    </div>
  );
};

// Find Password Shortcode
export const findPasswordShortcode: ShortcodeDefinition = {
  name: 'find_password',
  component: ({ attributes }) => (
    <FindPasswordComponent
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      successMessage={attributes.success_message as string}
      backUrl={attributes.back_url as string || attributes.backUrl as string}
    />
  )
};

// Default export for auto-registration (FindPasswordShortcode.tsx → FindPassword)
export default FindPasswordComponent;
