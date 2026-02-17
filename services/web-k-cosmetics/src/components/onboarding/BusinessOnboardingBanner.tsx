/**
 * BusinessOnboardingBanner
 * WO-BUSINESS-SERVICE-ONBOARDING-UNIFIED-V1
 *
 * K-Cosmetics 매장/약국 운영자 온보딩 배너
 * 가드: 로그인 상태 AND operator/partner 역할이 아닌 사용자
 * CTA: 기존 /partners/apply 페이지로 이동
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';

export function BusinessOnboardingBanner() {
  const { user, isAuthenticated } = useAuth();

  // Guard: 로그인 + operator/partner가 아닌 사용자에게만 노출
  if (!isAuthenticated || !user) return null;
  if (user.roles.some(r => ['operator', 'partner'].includes(r))) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <span style={styles.icon}>&#x1F3EA;</span>
        <div style={{ flex: 1 }}>
          <p style={styles.title}>K-Beauty 매장을 운영하고 계신가요?</p>
          <p style={styles.desc}>
            K-Cosmetics 파트너가 되어 화장품 유통·마케팅 서비스를 이용하세요.
          </p>
        </div>
        <Link to="/partners/apply" style={styles.cta}>
          파트너 신청하기
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    backgroundColor: '#fdf2f8',
    border: '1px solid #fbcfe8',
    borderRadius: '12px',
    padding: '20px 24px',
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
    color: '#831843',
  },
  desc: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  cta: {
    flexShrink: 0,
    padding: '10px 20px',
    backgroundColor: '#e91e63',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
};
