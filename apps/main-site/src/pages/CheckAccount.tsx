import { FC, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const CheckAccount: FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: 'found' | 'not-found' | null;
    message: string;
  }>({ type: null, message: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResult({ type: null, message: '' });

    try {
      // TODO: 실제 API 연동
      // const response = await authAPI.checkAccount(email);
      
      // 임시로 랜덤 결과 생성 (데모용)
      setTimeout(() => {
        const isRegistered = Math.random() > 0.5; // 50% 확률로 가입/미가입
        
        if (isRegistered) {
          setResult({
            type: 'found',
            message: '등록된 계정입니다. 로그인을 진행하세요.'
          });
        } else {
          setResult({
            type: 'not-found',
            message: '등록되지 않은 이메일입니다. 회원가입을 진행하세요.'
          });
        }
        setLoading(false);
      }, 1500);

    } catch (error: any) {
    // Error logging - use proper error handler
      setError('계정 확인에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const resetCheck = () => {
    setResult({ type: null, message: '' });
    setEmail('');
    setError('');
  };

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
          <p className="text-gray-600">계정 확인</p>
        </div>

        {/* 결과가 있을 때 */}
        {result.type && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            {result.type === 'found' ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {result.type === 'found' ? '계정 찾음!' : '계정 없음'}
            </h2>
            
            <p className="text-gray-600 mb-2">
              <span className="font-semibold">{email}</span>
            </p>
            <p className="text-gray-600 mb-6">{result.message}</p>

            <div className="space-y-3">
              {result.type === 'found' ? (
                <Link
                  to="/login"
                  className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  로그인하러 가기
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="block w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  회원가입하러 가기
                </Link>
              )}
              
              <button
                onClick={resetCheck}
                className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                다른 이메일로 확인
              </button>
            </div>
          </motion.div>
        )}

        {/* 결과가 없을 때 - 초기 화면 */}
        {!result.type && (
          <>
            {/* 설명 */}
            <div className="text-center mb-6">
              <Search className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">
                이메일 주소를 입력하시면<br />
                계정 가입 여부를 확인해드립니다.
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
                  placeholder="확인할 이메일을 입력하세요"
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
                    확인 중...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    계정 가입 여부 확인
                  </>
                )}
              </button>
            </form>

            {/* 링크들 */}
            <div className="mt-8 text-center space-y-4">
              <p className="text-gray-600">
                바로 로그인하시겠어요?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  로그인
                </Link>
              </p>
              <p className="text-gray-600">
                새 계정을 만드시겠어요?{' '}
                <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  회원가입
                </Link>
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CheckAccount;
