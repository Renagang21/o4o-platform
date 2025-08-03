import { FC, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { mockAuthService } from '../services/mockAuth';

const ForgotPassword: FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // API 서버 연결 시도, 실패 시 모의 서비스 사용
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '비밀번호 재설정 요청에 실패했습니다.');
        }
      } catch (apiError: any) {
        // console.log('API 서버 연결 실패, 모의 서비스 사용');
        await mockAuthService.forgotPassword(email);
      }

      setSuccess(true);
      setLoading(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error instanceof Error ? error.message : '비밀번호 재설정 요청에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">이메일 발송 완료!</h2>
          <p className="text-gray-600 mb-6">
            <span className="font-semibold">{email}</span>로<br />
            비밀번호 재설정 링크를 발송했습니다.<br />
            이메일을 확인해주세요.
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              로그인 페이지로 돌아가기
            </Link>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              다른 이메일로 재시도
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          뒤로가기
        </button>

        {/* 로고 */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-indigo-600 mb-2">🌿 Neture</h1>
          </Link>
          <p className="text-gray-600">비밀번호 찾기</p>
        </div>

        {/* 설명 */}
        <div className="text-center mb-6">
          <Mail className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">
            가입한 이메일 주소를 입력하시면<br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}

        {/* 이메일 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="가입한 이메일을 입력하세요"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                비밀번호 재설정 이메일 발송
              </>
            )}
          </button>
        </form>

        {/* 링크들 */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-600">
            계정이 기억나셨나요?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              로그인
            </Link>
          </p>
          <p className="text-gray-600">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
              회원가입
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
