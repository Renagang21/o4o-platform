/**
 * PharmacyOnboardingBanner
 * WO-PHARMACIST-PROFILE-ROLE-ONBOARDING-V1
 *
 * 조건: pharmacistRole === 'pharmacy_owner' AND pharmacy Context 없음
 * CTA: pharmacy_join JoinRequest 생성
 */

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { joinRequestApi } from '../../api/joinRequestApi';

type BannerState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export function PharmacyOnboardingBanner() {
  const { user } = useAuth();
  const { accessibleOrganizations } = useOrganization();
  const [state, setState] = useState<BannerState>('idle');

  // Guard: pharmacy_owner만 대상, pharmacy context가 없을 때만 표시
  const isPharmacyOwner = user?.pharmacistRole === 'pharmacy_owner';
  const hasPharmacyContext = accessibleOrganizations.some(
    (org) => org.type === 'pharmacy'
  );

  if (!isPharmacyOwner || hasPharmacyContext) {
    return null;
  }

  const handleJoinRequest = async () => {
    setState('submitting');
    try {
      await joinRequestApi.create({
        organizationId: 'pharmacy-1',
        requestType: 'pharmacy_join',
        requestedRole: 'admin',
      });
      setState('success');
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.status === 409) {
        setState('duplicate');
      } else {
        setState('error');
      }
    }
  };

  if (state === 'success') {
    return (
      <div style={styles.banner}>
        <div style={styles.content}>
          <span style={styles.icon}>&#x2705;</span>
          <div>
            <p style={styles.title}>요청이 접수되었습니다</p>
            <p style={styles.desc}>승인 후 약국경영 서비스를 이용하실 수 있습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'duplicate') {
    return (
      <div style={styles.banner}>
        <div style={styles.content}>
          <span style={styles.icon}>&#x23F3;</span>
          <div>
            <p style={styles.title}>이미 요청하셨습니다</p>
            <p style={styles.desc}>승인 대기 중입니다. 잠시만 기다려 주세요.</p>
          </div>
        </div>
      </div>
    );
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
          style={{
            ...styles.cta,
            opacity: state === 'submitting' ? 0.6 : 1,
            cursor: state === 'submitting' ? 'not-allowed' : 'pointer',
          }}
          onClick={handleJoinRequest}
          disabled={state === 'submitting'}
        >
          {state === 'submitting' ? '요청 중...' : '내 약국 등록하기'}
        </button>
      </div>
      {state === 'error' && (
        <p style={styles.error}>요청에 실패했습니다. 다시 시도해 주세요.</p>
      )}
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
  },
  error: {
    marginTop: '8px',
    marginBottom: 0,
    fontSize: '0.8rem',
    color: '#dc2626',
  },
};
