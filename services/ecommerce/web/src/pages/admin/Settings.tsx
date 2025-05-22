import React, { useState } from 'react';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useAdminSettingsStore } from '../../store/adminSettingsStore';
import { useThemeStore } from '../../store/themeStore';
import AdminProtectedRoute from '../../components/AdminProtectedRoute';

const notificationOptions = [
  { key: 'order', label: '주문 관련 알림' },
  { key: 'signup', label: '신규 가입 알림' },
  { key: 'error', label: '오류/시스템 알림' },
];

const Settings: React.FC = () => {
  const { admin, updateAdminInfo } = useAdminAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notificationSettings, setNotificationSettings } = useAdminSettingsStore();

  // Form state
  const [name, setName] = useState(admin?.name || '');
  const [email, setEmail] = useState(admin?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (newPassword && newPassword !== confirmPassword) {
      setErr('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    // Mock: update info (replace with real API)
    setTimeout(() => {
      setLoading(false);
      setMsg('정보가 성공적으로 변경되었습니다.');
    }, 1000);
  };

  const handleNotificationChange = (key: string) => {
    setNotificationSettings({
      ...notificationSettings,
      [key]: !notificationSettings[key],
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-6">설정</h1>
      <form onSubmit={handleInfoSubmit} className="space-y-4" aria-label="관리자 정보 수정 폼">
        <div>
          <label className="block font-semibold mb-1" htmlFor="name">이름</label>
          <input id="name" type="text" className="input input-bordered w-full" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="email">이메일</label>
          <input id="email" type="email" className="input input-bordered w-full" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="currentPassword">현재 비밀번호</label>
          <input id="currentPassword" type="password" className="input input-bordered w-full" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="newPassword">새 비밀번호</label>
          <input id="newPassword" type="password" className="input input-bordered w-full" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="confirmPassword">새 비밀번호 확인</label>
          <input id="confirmPassword" type="password" className="input input-bordered w-full" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? '저장 중...' : '정보 저장'}</button>
        {msg && <div className="text-green-600 mt-2" role="status">{msg}</div>}
        {err && <div className="text-red-600 mt-2" role="alert">{err}</div>}
      </form>
      <hr className="my-8" />
      <div className="flex items-center justify-between mb-6" aria-label="테마 설정">
        <span className="font-semibold">테마</span>
        <button
          className="btn btn-sm btn-outline"
          onClick={toggleTheme}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? '🌙 다크 모드' : '☀️ 라이트 모드'}
        </button>
      </div>
      <hr className="my-8" />
      <div aria-label="알림 설정">
        <div className="font-semibold mb-2">알림 수신 항목</div>
        <ul className="space-y-2">
          {notificationOptions.map(opt => (
            <li key={opt.key} className="flex items-center gap-2">
              <input
                id={`notif-${opt.key}`}
                type="checkbox"
                checked={!!notificationSettings[opt.key]}
                onChange={() => handleNotificationChange(opt.key)}
                className="checkbox"
              />
              <label htmlFor={`notif-${opt.key}`}>{opt.label}</label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default function ProtectedSettings() {
  return <AdminProtectedRoute><Settings /></AdminProtectedRoute>;
} 