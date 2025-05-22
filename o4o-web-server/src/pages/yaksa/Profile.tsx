import React, { useState } from 'react';
import YaksaProtectedRoute from '../../components/YaksaProtectedRoute';

const mockUser = {
  name: '홍길동',
  email: 'yaksa1@yaksa.site',
  phone: '010-1234-5678',
  licenseNumber: 'PH123456',
};

const Profile: React.FC = () => {
  const [user, setUser] = useState(mockUser);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('저장되었습니다. (mock)');
    setTimeout(() => setMessage(null), 1500);
  };
  const handleLogout = () => {
    // 실제 구현 시 authStore.logout() 등 호출
    setMessage('로그아웃 되었습니다. (mock)');
    setTimeout(() => setMessage(null), 1500);
  };

  return (
    <YaksaProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 w-full max-w-md mx-auto space-y-4">
          <h1 className="text-2xl font-bold mb-4 text-center">내 정보</h1>
          {message && <div className="text-green-600 text-center mb-2">{message}</div>}
          <div>
            <label className="block text-sm font-semibold mb-1">이름</label>
            <input name="name" type="text" className="input input-bordered w-full" value={user.name} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">이메일</label>
            <input name="email" type="email" className="input input-bordered w-full" value={user.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">전화번호</label>
            <input name="phone" type="tel" className="input input-bordered w-full" value={user.phone} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">면허번호</label>
            <input name="licenseNumber" type="text" className="input input-bordered w-full" value={user.licenseNumber} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">비밀번호 변경</label>
            <input type="password" className="input input-bordered w-full" value={password} onChange={handlePasswordChange} placeholder="새 비밀번호" />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary w-full">저장</button>
            <button type="button" className="btn btn-outline w-full" onClick={handleLogout}>로그아웃</button>
          </div>
        </form>
      </div>
    </YaksaProtectedRoute>
  );
};

export default Profile; 