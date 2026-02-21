/**
 * FunctionGateModal - 약사 직능 선택 모달 (단일 단계)
 *
 * WO-KPA-FUNCTION-GATE-V1: 직능 선택 (최초 1회)
 *
 * 5개 선택지, 한 번 선택으로 pharmacistFunction + pharmacistRole 동시 설정:
 * - 근무 약사 → pharmacy + general
 * - 개설 약사 → pharmacy + pharmacy_owner
 * - 병원 약사 → hospital + hospital
 * - 산업 약사 → industry + general
 * - 기타 약사 → other + other
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  useAuth,
  type PharmacistFunction,
  type PharmacistRole,
} from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import { FUNCTION_GATE_EXEMPT_ROLES, hasAnyRole, hasBranchRole } from '../lib/role-constants';

interface FunctionOption {
  key: string;
  label: string;
  description: string;
  pharmacistFunction: PharmacistFunction;
  pharmacistRole: PharmacistRole;
}

const options: FunctionOption[] = [
  { key: 'pharmacy_worker', label: '근무 약사', description: '약국 근무', pharmacistFunction: 'pharmacy', pharmacistRole: 'general' },
  { key: 'pharmacy_owner', label: '개설 약사', description: '약국 경영', pharmacistFunction: 'pharmacy', pharmacistRole: 'pharmacy_owner' },
  { key: 'hospital', label: '병원 약사', description: '의료기관 근무', pharmacistFunction: 'hospital', pharmacistRole: 'hospital' },
  { key: 'industry', label: '산업 약사', description: '제약/바이오 등', pharmacistFunction: 'industry', pharmacistRole: 'general' },
  { key: 'other', label: '기타 약사', description: '', pharmacistFunction: 'other', pharmacistRole: 'other' },
];

export default function FunctionGateModal() {
  const { user, setPharmacistProfile } = useAuth();
  const { activeModal, closeModal } = useAuthModal();

  const isOpen = activeModal === 'functionGate';
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) setSelectedKey(null);
  }, [isOpen]);

  // WO-KPA-C-ROLE-SYNC-NORMALIZATION-V1: 플랫폼 역할 + membership 역할 체크
  const isExempt = user
    ? hasAnyRole(user.roles, FUNCTION_GATE_EXEMPT_ROLES) || hasBranchRole(user.membershipRole)
    : false;

  // Close if exempt role or already set
  useEffect(() => {
    if (isOpen && (isExempt || (user?.pharmacistFunction && user?.pharmacistRole))) {
      closeModal();
    }
  }, [isOpen, user, isExempt, closeModal]);

  // ESC + scroll lock
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const selected = options.find(o => o.key === selectedKey);
    if (selected) {
      // WO-KPA-PHARMACY-PATH-COMPLEXITY-AUDIT-V1: 1회 API + 1회 리렌더로 통합
      setPharmacistProfile(selected.pharmacistFunction, selected.pharmacistRole);
      closeModal();
    }
  };

  return (
    <div style={styles.overlay} onClick={closeModal}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={closeModal} aria-label="닫기">
          <X size={20} />
        </button>

        <h2 style={styles.title}>본인의 약사 직능을 선택해 주세요</h2>
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
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '24px',
  },
  card: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
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
    cursor: 'pointer',
  },
};
