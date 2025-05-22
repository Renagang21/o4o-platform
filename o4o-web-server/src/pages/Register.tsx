import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'b2c' | 'yaksa'>('b2c');
  const [agree, setAgree] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(false);
    if (!agree) {
      setError('약관에 동의해야 회원가입이 가능합니다.');
      return;
    }
    if (role === 'yaksa' && (!licenseNumber || !phone)) {
      setError('약사 회원은 면허번호와 전화번호를 모두 입력해야 합니다.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email === 'fail@yaksa.site') {
        setError('이미 사용 중인 이메일입니다.');
      } else if (role === 'b2c') {
        setSuccess(true);
        setError(null);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1200);
      } else if (role === 'yaksa') {
        setPending(true);
        setError(null);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">회원가입</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">이메일</label>
            <input type="email" className="input input-bordered w-full" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">비밀번호</label>
            <input type="password" className="input input-bordered w-full" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">이름</label>
            <input type="text" className="input input-bordered w-full" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">사용자 유형</label>
            <select className="input input-bordered w-full" value={role} onChange={e => setRole(e.target.value as 'b2c' | 'yaksa')}>
              <option value="b2c">일반 사용자</option>
              <option value="yaksa">약사(기업)</option>
            </select>
          </div>
          {role === 'yaksa' && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">면허번호</label>
                <input type="text" className="input input-bordered w-full" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required={role === 'yaksa'} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">전화번호</label>
                <input type="tel" className="input input-bordered w-full" value={phone} onChange={e => setPhone(e.target.value)} required={role === 'yaksa'} />
              </div>
              <div className="text-xs text-blue-600 mt-1">약사 회원은 가입 후 관리자의 승인 절차가 필요합니다.</div>
            </>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="agree" checked={agree} onChange={e => setAgree(e.target.checked)} />
            <label htmlFor="agree" className="text-sm">약관에 동의합니다.</label>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? '가입 중...' : '회원가입'}</button>
          {error && <div className="text-red-600 text-center mt-2 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-center mt-2 text-sm">회원가입이 완료되었습니다! 홈으로 이동합니다.</div>}
          {pending && <div className="text-blue-600 text-center mt-2 text-sm">약사 회원 가입이 완료되었습니다. 관리자의 승인 후 이용 가능합니다.</div>}
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요? <Link to="/login" className="text-blue-600 hover:underline">로그인</Link>
        </div>
      </div>
    </div>
  );
};

export default Register; 