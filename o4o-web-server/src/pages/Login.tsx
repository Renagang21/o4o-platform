import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../services/ecommerce/web/src/store/authStore';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => (user: any) => state.user = user);
  const setIsAuthenticated = useAuthStore((state) => (auth: boolean) => state.isAuthenticated = auth);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
      if (email === 'fail@yaksa.site') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        // mock: 로그인 성공 처리 및 역할 부여
        let role = 'b2c';
        if (email.includes('admin')) role = 'admin';
        else if (email.includes('yaksa')) role = 'yaksa';
        const user = { email, role };
        setUser(user);
        setIsAuthenticated(true);
        // 역할별 리디렉션
        if (role === 'admin' || role === 'superadmin') navigate('/admin/main', { replace: true });
        else if (role === 'yaksa') navigate('/yaksa-shop', { replace: true });
        else navigate('/shop', { replace: true });
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">로그인</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">이메일</label>
            <input type="email" className="input input-bordered w-full" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">비밀번호</label>
            <input type="password" className="input input-bordered w-full" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? '로그인 중...' : '로그인'}</button>
          {error && <div className="text-red-600 text-center mt-2 text-sm">{error}</div>}
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          계정이 없으신가요? <Link to="/register" className="text-blue-600 hover:underline">회원가입</Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 