import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@o4o/ui';
import { Button } from '@o4o/ui';
import { cookieAuthClient } from '@o4o/auth-client';

export const FindId: FC = () => {
  const navigate = useNavigate();
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
      const response = await cookieAuthClient.api.post('/auth/find-id', { email });

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || '입력하신 이메일로 아이디 정보를 발송했습니다.');
      } else {
        setStatus('error');
        setMessage(response.data.message || '아이디 찾기에 실패했습니다.');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">아이디 찾기</h2>
            <p className="mt-2 text-sm text-gray-600">
              가입 시 등록한 이메일 주소를 입력해주세요
            </p>
          </div>

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-4">{message}</p>
                <p className="text-xs text-gray-500">
                  이메일을 확인하고 아이디를 찾아주세요.
                </p>
              </div>
              <div className="space-y-2 pt-4">
                <Button className="w-full" onClick={() => navigate('/login')}>
                  로그인하기
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStatus('idle')}
                >
                  다시 시도
                </Button>
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 주소
                </label>
                <input
                  id="email"
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '아이디 찾기'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/login')}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  로그인으로 돌아가기
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            <button
              onClick={() => navigate('/find-password')}
              className="text-blue-600 hover:underline"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FindId;
