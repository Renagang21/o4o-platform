/**
 * AccountRecoveryPage - 계정 찾기 (아이디 + 비밀번호)
 * WO-O4O-ACCOUNT-RECOVERY-UNIFICATION-V1
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, ArrowLeft, CheckCircle, AlertCircle, Search, KeyRound } from 'lucide-react';
import { api } from '../../lib/apiClient';

const SERVICE_URL = import.meta.env.VITE_SERVICE_URL || 'https://glycopharm.co.kr';

type Tab = 'find-id' | 'find-password';

export default function AccountRecoveryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('find-id');

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">계정 찾기</h2>
          <p className="mt-2 text-sm text-slate-500">아이디 또는 비밀번호를 찾을 수 있습니다</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('find-id')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'find-id'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Search className="inline w-4 h-4 mr-1" />
            아이디 찾기
          </button>
          <button
            onClick={() => setActiveTab('find-password')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'find-password'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <KeyRound className="inline w-4 h-4 mr-1" />
            비밀번호 찾기
          </button>
        </div>

        {activeTab === 'find-id' ? <FindIdTab /> : <FindPasswordTab />}

        <div className="text-center">
          <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

function FindIdTab() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ found: boolean; maskedEmail?: string; createdAt?: string } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const response = await api.post('/auth/find-id', { phone: phone.replace(/[^0-9]/g, '') });
      const data = response.data as any;
      const result = data.data ?? data;
      setResult(result);
    } catch (err: any) {
      if (err.response?.data) {
        const data = err.response.data;
        const result = data.data ?? data;
        setResult(result);
      } else {
        setError('서버와의 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (result?.found) {
    return (
      <div className="space-y-4 pt-4">
        <div className="rounded-xl bg-green-50 p-6 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-3" />
          <p className="text-sm text-slate-600 mb-2">등록된 계정을 찾았습니다</p>
          <p className="text-lg font-semibold text-slate-900">{result.maskedEmail}</p>
          {result.createdAt && (
            <p className="text-xs text-slate-500 mt-1">
              가입일: {new Date(result.createdAt).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="flex-1 py-2.5 text-center text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700"
          >
            로그인하기
          </Link>
          <button
            onClick={() => { setResult(null); setPhone(''); }}
            className="flex-1 py-2.5 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            다시 찾기
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <p className="text-sm text-slate-600">가입 시 등록한 전화번호를 입력해주세요.</p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && !result.found && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          해당 전화번호로 등록된 계정이 없습니다.
        </div>
      )}

      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호 (예: 010-1234-5678)"
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !phone.trim()}
        className="w-full py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '조회 중...' : '아이디 찾기'}
      </button>
    </form>
  );
}

function FindPasswordTab() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email, serviceUrl: SERVICE_URL });
      setIsSubmitted(true);
    } catch (err: any) {
      if (err.response) {
        setError('요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError('서버와의 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-4 pt-4">
        <div className="rounded-xl bg-green-50 p-6 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-3" />
          <p className="font-medium text-slate-900">이메일을 확인해주세요</p>
          <p className="text-sm text-slate-600 mt-1">
            비밀번호 재설정 링크를 보내드렸습니다.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
          </p>
        </div>
        <button
          onClick={() => { setIsSubmitted(false); setEmail(''); }}
          className="w-full py-2.5 text-sm font-medium border border-slate-300 rounded-xl hover:bg-slate-50"
        >
          다른 이메일로 재시도
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <p className="text-sm text-slate-600">가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '처리 중...' : '비밀번호 재설정 링크 보내기'}
      </button>
    </form>
  );
}
