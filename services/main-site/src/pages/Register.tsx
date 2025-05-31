import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'b2c' | 'yaksa'>('b2c');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('모든 필드를 입력하세요.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setError('');
    // TODO: 실제 회원가입 로직 연결
    // 회원가입 성공 시 로그인 페이지로 이동
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">회원가입</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-1">회원 유형</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="b2c"
                  checked={role === 'b2c'}
                  onChange={() => setRole('b2c')}
                  className="accent-blue-600"
                />
                소비자
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="yaksa"
                  checked={role === 'yaksa'}
                  onChange={() => setRole('yaksa')}
                  className="accent-blue-600"
                />
                약사
              </label>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-1">이름</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-1">이메일</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 mb-1">비밀번호</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400 dark:bg-gray-700 dark:text-white"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            회원가입
          </button>
        </form>
        <div className="my-4 flex items-center justify-between">
          <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
          <span className="mx-2 text-gray-400 text-sm">또는</span>
          <span className="h-px flex-1 bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex flex-col gap-2">
          <button className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-300 text-gray-800 rounded hover:bg-yellow-400 transition">
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" alt="카카오" className="w-5 h-5" />
            카카오로 회원가입
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-2 bg-white border text-gray-700 rounded hover:bg-gray-100 transition dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="구글" className="w-5 h-5" />
            구글로 회원가입
          </button>
        </div>
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">로그인</Link>
        </div>
      </div>
    </div>
  );
};

export default Register; 