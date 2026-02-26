/**
 * FunctionGatePage - 약사 직능 선택 게이트 (단일 단계)
 *
 * WO-KPA-FUNCTION-GATE-V1: 직능 선택 (최초 1회)
 * WO-ROLE-NORMALIZATION-PHASE3-C-V1: activityType 기반 전환
 *
 * 5개 선택지 → activityType 설정:
 * - 근무 약사 → pharmacy_employee
 * - 개설 약사 → pharmacy_owner
 * - 병원 약사 → hospital
 * - 산업 약사 → other_industry
 * - 기타 약사 → other
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface FunctionOption {
  key: string;
  label: string;
  description: string;
  activityType: string;
}

const options: FunctionOption[] = [
  { key: 'pharmacy_worker', label: '근무 약사', description: '약국 근무', activityType: 'pharmacy_employee' },
  { key: 'pharmacy_owner', label: '개설 약사', description: '약국 경영', activityType: 'pharmacy_owner' },
  { key: 'hospital', label: '병원 약사', description: '의료기관 근무', activityType: 'hospital' },
  { key: 'industry', label: '산업 약사', description: '제약/바이오 등', activityType: 'other_industry' },
  { key: 'other', label: '기타 약사', description: '', activityType: 'other' },
];

export function FunctionGatePage() {
  const navigate = useNavigate();
  const { user, setActivityType } = useAuth();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Already set → go to dashboard
  useEffect(() => {
    if (user?.activityType) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleConfirm = async () => {
    const selected = options.find(o => o.key === selectedKey);
    if (selected) {
      await setActivityType(selected.activityType);
      navigate('/dashboard');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>본인의 약사 직능을 선택해 주세요</h1>
        <p style={styles.subtitle}>맞춤 서비스 안내에 사용됩니다.</p>

        <div style={styles.options}>
          {options.map((option) => (
            <button
              key={option.key}
              onClick={() => setSelectedKey(option.key)}
              style={{
                ...styles.optionButton,
                ...(selectedKey === option.key ? styles.optionSelected : {}),
              }}
            >
              <span style={styles.optionLabel}>{option.label}</span>
              {option.description && (
                <span style={styles.optionDesc}>{option.description}</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedKey}
          style={{
            ...styles.confirmButton,
            opacity: selectedKey ? 1 : 0.5,
            cursor: selectedKey ? 'pointer' : 'not-allowed',
          }}
        >
          확인
        </button>
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
    backgroundColor: '#f8fafc',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    textAlign: 'center',
    margin: '0 0 32px 0',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  optionButton: {
    padding: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: '1rem',
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
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: 400,
  },
  confirmButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
  },
};

export default FunctionGatePage;
