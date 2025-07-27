import { useState, useEffect, FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL에서 토큰 추출
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          setError(`인증 실패: ${error}`);
          setLoading(false);
          return;
        }

        if (!token) {
          setError('토큰이 없습니다');
          setLoading(false);
          return;
        }

        // 토큰을 사용하여 사용자 정보 가져오기
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          
          // 로컬 상태에 저장
          localStorage.setItem('auth_token', token);
          
          // AuthContext에 사용자 정보 설정
          await login(userData.data);

          // 사용자 역할에 따라 적절한 페이지로 리다이렉트
          switch (userData.data.role) {
            case 'admin':
            case 'manager':
              navigate('/admin');
              break;
            case 'business':
              navigate('/retailer/dashboard');
              break;
            case 'affiliate':
              navigate('/affiliate/dashboard');
              break;
            default:
              navigate('/');
          }
        } else {
          setError('사용자 정보를 가져올 수 없습니다');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('인증 처리 중 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-900">로그인 처리중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">로그인 실패</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            다시 로그인하기
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;