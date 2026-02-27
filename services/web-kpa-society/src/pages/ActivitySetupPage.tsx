/**
 * ActivitySetupPage - 직능 분류 설정 전용 페이지
 *
 * WO-KPA-A-AUTH-UX-STATE-UNIFICATION-V1
 *
 * AuthGate가 activityType 미설정 + 비면제 사용자를 이 페이지로 리다이렉트.
 * 선택 완료 → SSOT(profiles) + mirror(members) 동시 갱신 → /dashboard
 *
 * 이미 설정된 사용자가 직접 URL 접근 시 /dashboard로 리다이렉트.
 */

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isActivityTypeExempt } from '../lib/role-constants';

const ACTIVITY_OPTIONS = [
  { value: 'pharmacy_owner', label: '약국 개설약사', desc: '약국을 운영하고 있습니다' },
  { value: 'pharmacy_employee', label: '약국 근무약사', desc: '약국에서 근무하고 있습니다' },
  { value: 'hospital', label: '병원 약사', desc: '의료기관에서 근무합니다' },
  { value: 'manufacturer', label: '제약회사', desc: '제약/바이오 분야' },
  { value: 'wholesaler', label: '도매회사', desc: '의약품 유통 분야' },
  { value: 'government', label: '공공기관/교육', desc: '공무원, 교육기관 등' },
  { value: 'other', label: '기타', desc: '' },
  { value: 'inactive', label: '미활동', desc: '현재 약사 활동을 하지 않습니다' },
] as const;

export function ActivitySetupPage() {
  const navigate = useNavigate();
  const { user, isLoading, setActivityType } = useAuth();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return null;

  // 비로그인 → 홈
  if (!user) return <Navigate to="/" replace />;

  // 이미 설정됨 or 면제 → dashboard
  if (
    user.activityType ||
    isActivityTypeExempt(user.roles, user.membershipRole, user.membershipType)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await setActivityType(selected);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.stepBadge}>필수 설정</div>
          <h1 style={styles.title}>직능 분류를 선택해주세요</h1>
          <p style={styles.subtitle}>
            {user.name}님, 환영합니다. 맞춤 서비스 제공을 위해 현재 직능을 선택해주세요.
          </p>
        </div>

        <div style={styles.options}>
          {ACTIVITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              style={{
                ...styles.optionBtn,
                ...(selected === opt.value ? styles.optionSelected : {}),
              }}
            >
              <span style={styles.optionLabel}>{opt.label}</span>
              {opt.desc && <span style={styles.optionDesc}>{opt.desc}</span>}
            </button>
          ))}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!selected || saving}
          style={{
            ...styles.submitBtn,
            opacity: (!selected || saving) ? 0.5 : 1,
            cursor: (!selected || saving) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : '시작하기'}
        </button>

        <p style={styles.footnote}>
          프로필에서 언제든 변경할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  stepBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px',
  },
  optionBtn: {
    padding: '14px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s',
    textAlign: 'left' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  optionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionLabel: {
    fontWeight: 500,
  },
  optionDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 400,
  },
  error: {
    color: '#dc2626',
    fontSize: '13px',
    textAlign: 'center',
    margin: '0 0 16px 0',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
  },
  footnote: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '16px',
    marginBottom: 0,
  },
};

export default ActivitySetupPage;
