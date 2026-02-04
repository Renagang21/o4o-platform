/**
 * FunctionGatePage - 직능 + 직역 선택 게이트
 *
 * WO-KPA-FUNCTION-GATE-V1: 직능 선택 (최초 1회)
 * WO-PHARMACIST-PROFILE-ROLE-ONBOARDING-V1: 직역 선택 (최초 1회, 프로필에서 수정 가능)
 *
 * 2단계 흐름:
 * 1. 직능(PharmacistFunction) 미선택 → 직능 선택
 * 2. 직역(PharmacistRole) 미선택 → 직역 선택
 * 이미 설정된 단계는 건너뛴다.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  type PharmacistFunction,
  type PharmacistRole,
} from '../contexts/AuthContext';

type GateStep = 'function' | 'role';

const functionOptions: { value: PharmacistFunction; label: string }[] = [
  { value: 'pharmacy', label: '약국 약사' },
  { value: 'hospital', label: '병원 약사' },
  { value: 'industry', label: '산업 약사' },
  { value: 'other', label: '기타 약사' },
];

const roleOptions: { value: PharmacistRole; label: string; description: string }[] = [
  { value: 'general', label: '일반 약사', description: '근무약사 / 산업약사 등' },
  { value: 'pharmacy_owner', label: '약국 개설자', description: '약국 경영' },
  { value: 'hospital', label: '병원 약사', description: '의료기관 근무' },
  { value: 'other', label: '기타', description: '' },
];

function getInitialStep(user: { pharmacistFunction?: PharmacistFunction; pharmacistRole?: PharmacistRole } | null): GateStep {
  if (!user?.pharmacistFunction) return 'function';
  if (!user?.pharmacistRole) return 'role';
  return 'role'; // fallback (shouldn't reach here if gate is properly guarded)
}

export function FunctionGatePage() {
  const navigate = useNavigate();
  const { user, setPharmacistFunction, setPharmacistRole } = useAuth();

  const [step, setStep] = useState<GateStep>(() => getInitialStep(user));
  const [selectedFunction, setSelectedFunction] = useState<PharmacistFunction | null>(null);
  const [selectedRole, setSelectedRole] = useState<PharmacistRole | null>(null);

  // Re-evaluate step when user changes (e.g., function just set)
  useEffect(() => {
    if (user?.pharmacistFunction && user?.pharmacistRole) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleFunctionConfirm = () => {
    if (selectedFunction) {
      setPharmacistFunction(selectedFunction);
      // After setting function, move to role step if not already set
      if (!user?.pharmacistRole) {
        setStep('role');
      } else {
        navigate('/');
      }
    }
  };

  const handleRoleConfirm = () => {
    if (selectedRole) {
      setPharmacistRole(selectedRole);
      navigate('/');
    }
  };

  if (step === 'function') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.stepIndicator}>1 / 2</div>
          <h1 style={styles.title}>본인의 약사 직능을 선택해 주세요</h1>
          <p style={styles.subtitle}>화면 구성에 사용됩니다.</p>

          <div style={styles.options}>
            {functionOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFunction(option.value)}
                style={{
                  ...styles.optionButton,
                  ...(selectedFunction === option.value ? styles.optionSelected : {}),
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleFunctionConfirm}
            disabled={!selectedFunction}
            style={{
              ...styles.confirmButton,
              opacity: selectedFunction ? 1 : 0.5,
              cursor: selectedFunction ? 'pointer' : 'not-allowed',
            }}
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  // step === 'role'
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.stepIndicator}>2 / 2</div>
        <h1 style={styles.title}>본인의 약사 직역을 선택해 주세요</h1>
        <p style={styles.subtitle}>약국 경영 등 맞춤 서비스 안내에 사용됩니다.</p>

        <div style={styles.options}>
          {roleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRole(option.value)}
              style={{
                ...styles.optionButton,
                ...(selectedRole === option.value ? styles.optionSelected : {}),
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
          onClick={handleRoleConfirm}
          disabled={!selectedRole}
          style={{
            ...styles.confirmButton,
            opacity: selectedRole ? 1 : 0.5,
            cursor: selectedRole ? 'pointer' : 'not-allowed',
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
  stepIndicator: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: '8px',
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
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
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
