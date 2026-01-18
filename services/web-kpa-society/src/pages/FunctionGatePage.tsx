/**
 * FunctionGatePage - 직능 선택 게이트
 *
 * WO-KPA-FUNCTION-GATE-V1
 * - 승인 완료 + 직능 미선택 사용자에게 최초 1회 노출
 * - 선택 후 저장 및 이후 진입 경로로 이동
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type PharmacistFunction } from '../contexts/AuthContext';

const functionOptions: { value: PharmacistFunction; label: string }[] = [
  { value: 'pharmacy', label: '약국 약사' },
  { value: 'hospital', label: '병원 약사' },
  { value: 'industry', label: '산업 약사' },
  { value: 'other', label: '기타 약사' },
];

export function FunctionGatePage() {
  const navigate = useNavigate();
  const { setPharmacistFunction } = useAuth();
  const [selected, setSelected] = useState<PharmacistFunction | null>(null);

  const handleConfirm = () => {
    if (selected) {
      setPharmacistFunction(selected);
      navigate('/demo');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>본인의 약사 직능을 선택해 주세요</h1>

        <div style={styles.options}>
          {functionOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              style={{
                ...styles.optionButton,
                ...(selected === option.value ? styles.optionSelected : {}),
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected}
          style={{
            ...styles.confirmButton,
            opacity: selected ? 1 : 0.5,
            cursor: selected ? 'pointer' : 'not-allowed',
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
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
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
  },
  optionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
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
