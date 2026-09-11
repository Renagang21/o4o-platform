/**
 * JoinPage — KPA Branch 가입 신청
 * WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1
 *
 * `POST /kpa-branch/join` 하나로 끝난다. 분회 소속(branch_memberships)은 여기서 만들지 않는다 —
 * 가입 승인 후 운영자가 분회에 등록한다. 면허번호·직역은 가입 시점에 canonical 약사 프로필로 승격되며,
 * 이후 회원콘솔·신상신고 prefill 이 같은 값을 읽는다.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../config/service';
import { applyBranchJoin, toJoinFailure, JOIN_ACTIVITY_TYPE_OPTIONS } from '../lib/api/join';

const inputCls = 'w-full rounded border border-gray-300 px-3 py-2 text-sm';

export default function JoinPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [activityType, setActivityType] = useState('');
  const [tos, setTos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tos) {
      setError('이용약관에 동의해야 가입 신청할 수 있습니다.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await applyBranchJoin({
        email: email.trim(),
        password,
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(licenseNumber.trim() ? { licenseNumber: licenseNumber.trim() } : {}),
        ...(activityType ? { activityType } : {}),
        tos: true,
      });
      setDone(true);
    } catch (err) {
      const f = toJoinFailure(err);
      setError(f.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-xl font-bold text-gray-900">가입 신청이 접수되었습니다</h1>
        <p className="mt-3 text-sm text-gray-600">
          분회 운영자의 승인 후 이용할 수 있습니다. 승인되면 신청한 이메일과 비밀번호로 로그인해 주세요.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-primary-600 underline">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-bold text-gray-900">{BRAND.nameKo} 가입 신청</h1>
      <p className="mt-2 text-sm text-gray-500">
        신청 후 분회 운영자의 승인을 거쳐 회원이 됩니다.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="username"
          className={inputCls}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="new-password"
          className={inputCls}
          minLength={8}
          required
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          autoComplete="name"
          className={inputCls}
          required
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="휴대전화 (선택)"
          autoComplete="tel"
          className={inputCls}
        />
        <input
          type="text"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="약사 면허번호"
          className={inputCls}
          maxLength={100}
        />
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className={inputCls}
          aria-label="직역 구분"
        >
          <option value="">직역 구분 (선택)</option>
          {JOIN_ACTIVITY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} className="mt-0.5" />
          <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-primary-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? '신청 중…' : '가입 신청'}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        이미 회원이신가요?{' '}
        <Link to="/login" className="font-medium text-primary-600 underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
