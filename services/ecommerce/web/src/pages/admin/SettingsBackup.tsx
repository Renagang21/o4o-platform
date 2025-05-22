import React, { useRef, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAdminSettingsStore } from '../../store/adminSettingsStore';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { AdminRoleProtectedRoute } from '../../components/AdminProtectedRoute';

const SettingsBackup: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const { notificationSettings, setNotificationSettings } = useAdminSettingsStore();
  const { admin } = useAdminAuthStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [restoreData, setRestoreData] = useState<any>(null);
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);

  // 백업(JSON 다운로드)
  const handleBackup = () => {
    const data = {
      theme,
      notificationSettings,
      admin: admin ? { email: admin.email, role: admin.role } : null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin-settings-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 복원(JSON 업로드)
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(null); setMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setRestoreData(data);
        setRestoreDialog(true);
      } catch {
        setErr('유효하지 않은 JSON 파일입니다.');
      }
    };
    reader.readAsText(file);
  };

  // 복원 적용
  const handleApplyRestore = () => {
    if (!restoreData) return;
    try {
      if (restoreData.theme) {
        setTheme(restoreData.theme);
        localStorage.setItem('theme', restoreData.theme);
      }
      if (restoreData.notificationSettings) {
        setNotificationSettings(restoreData.notificationSettings);
        localStorage.setItem('adminNotificationSettings', JSON.stringify(restoreData.notificationSettings));
      }
      setMsg('설정이 성공적으로 복원되었습니다.');
      setRestoreDialog(false);
    } catch {
      setErr('설정 복원에 실패했습니다.');
    }
  };

  return (
    <AdminRoleProtectedRoute roles={['superadmin']}>
      <div className="max-w-xl mx-auto p-8 bg-white rounded shadow mt-8">
        <h1 className="text-2xl font-bold mb-6">설정 백업 및 복원</h1>
        <div className="flex flex-col gap-6">
          <button
            className="btn btn-primary"
            onClick={handleBackup}
          >
            설정 백업 (JSON 다운로드)
          </button>
          <div>
            <input
              type="file"
              accept="application/json"
              ref={fileInput}
              className="hidden"
              onChange={handleRestoreFile}
            />
            <button
              className="btn btn-outline"
              onClick={() => fileInput.current?.click()}
            >
              설정 복원 (JSON 업로드)
            </button>
          </div>
          {msg && <div className="text-green-600" role="status">{msg}</div>}
          {err && <div className="text-red-600" role="alert">{err}</div>}
        </div>
        {/* 복원 확인 다이얼로그 */}
        {restoreDialog && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded shadow-lg p-8 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">설정 복원 확인</h2>
              <div className="mb-4">업로드한 설정으로 복원하시겠습니까? 기존 설정이 덮어써집니다.</div>
              <div className="flex gap-4 justify-end">
                <button className="btn btn-outline" onClick={() => setRestoreDialog(false)}>취소</button>
                <button className="btn btn-primary" onClick={handleApplyRestore}>복원</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminRoleProtectedRoute>
  );
};

export default SettingsBackup; 