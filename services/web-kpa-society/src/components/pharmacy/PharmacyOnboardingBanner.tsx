/**
 * PharmacyOnboardingBanner
 * WO-PHARMACIST-PROFILE-ROLE-ONBOARDING-V1
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
 *
 * 조건: pharmacistRole === 'pharmacy_owner' AND pharmacy 승인 없음
 * CTA: /pharmacy/approval 페이지로 이동 (신청 폼 작성 필요)
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function PharmacyOnboardingBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Guard: pharmacy_owner만 대상
  const isPharmacyOwner = user?.pharmacistRole === 'pharmacy_owner';

  if (!isPharmacyOwner) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <span style={styles.icon}>&#x1F3E5;</span>
        <div style={{ flex: 1 }}>
          <p style={styles.title}>약국을 운영하고 계신가요?</p>
          <p style={styles.desc}>
            약국 경영 서비스를 이용하시면 재고, 매출, 고객 관리를 한 곳에서 할 수 있습니다.
          </p>
        </div>
        <button
          style={styles.cta}
          onClick={() => navigate('/pharmacy/approval')}
        >
          내 약국 등록하기
        </button>
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
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  icon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e3a5f',
  },
  desc: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#475569',
    lineHeight: 1.5,
  },
  cta: {
    flexShrink: 0,
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
};
