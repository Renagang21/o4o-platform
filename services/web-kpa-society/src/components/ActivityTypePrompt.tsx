/**
 * ActivityTypePrompt - 승인 후 첫 로그인 시 직능 분류 선택 배너
 * Phase 6: activity_type 미설정 회원에게 큰 분류 선택 유도
 * 프로필에서 언제든 수정 가능
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ACTIVITY_OPTIONS = [
  { value: 'pharmacy_owner', label: '약국 개설약사' },
  { value: 'pharmacy_employee', label: '약국 근무약사' },
  { value: 'hospital', label: '병원 약사' },
  { value: 'manufacturer', label: '제약회사' },
  { value: 'wholesaler', label: '도매회사' },
  { value: 'government', label: '공공기관/교육' },
  { value: 'other', label: '기타' },
  { value: 'inactive', label: '미활동' },
] as const;

interface MemberInfo {
  id: string;
  activity_type: string | null;
  membership_type: string;
}

export function ActivityTypePrompt() {
  const { setActivityType } = useAuth();
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
    fetch(`${baseUrl}/kpa/members/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) setMember(data.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || !member || member.activity_type || member.membership_type === 'student' || dismissed) {
    return null;
  }

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // WO-KPA-A-ACTIVITY-TYPE-SSOT-ALIGNMENT-V1: 단일 진입점 사용
      // setActivityType → PATCH /auth/me/profile → SSOT(profiles) + mirror(members) 동시 갱신
      await setActivityType(selected);
      setMember({ ...member, activity_type: selected });
    } catch {
      // 실패해도 배너만 닫음
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <strong style={styles.title}>직능 분류를 선택해주세요</strong>
        <p style={styles.desc}>
          회원님의 직능 분류가 아직 설정되지 않았습니다. 아래에서 선택해주세요.
        </p>
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
              {opt.label}
            </button>
          ))}
        </div>
        <div style={styles.actions}>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            style={{
              ...styles.saveBtn,
              opacity: (!selected || saving) ? 0.5 : 1,
            }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button onClick={() => setDismissed(true)} style={styles.dismissBtn}>
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
  },
  content: {
    maxWidth: '600px',
  },
  title: {
    fontSize: '15px',
    color: '#1e40af',
    display: 'block',
    marginBottom: '4px',
  },
  desc: {
    fontSize: '13px',
    color: '#3b82f6',
    margin: '0 0 16px 0',
  },
  options: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  optionBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    border: '1px solid #cbd5e1',
    borderRadius: '20px',
    backgroundColor: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  optionSelected: {
    backgroundColor: '#2563eb',
    color: '#fff',
    borderColor: '#2563eb',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  saveBtn: {
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  dismissBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    cursor: 'pointer',
  },
};
