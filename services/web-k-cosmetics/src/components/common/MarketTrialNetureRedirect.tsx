/**
 * Market Trial → Neture Redirect
 *
 * WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
 *
 * K-Cosmetics 내부 Market Trial 실행 페이지는 Neture로 일원화되었으므로,
 * 기존 URL은 동일 경로의 Neture로 자동 리다이렉트됩니다.
 *
 * 매핑:
 *   /store/market-trial → https://neture.co.kr/market-trial
 */

import { useEffect, useMemo } from 'react';

const NETURE_BASE = 'https://neture.co.kr';

export default function MarketTrialNetureRedirect() {
  const target = useMemo(() => {
    const path = window.location.pathname.replace(/^\/store/, '');
    const search = window.location.search;
    return `${NETURE_BASE}${path}${search}`;
  }, []);

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div style={styles.container}>
      <div style={styles.icon}>🧪</div>
      <h1 style={styles.title}>유통 참여형 펀딩 (Market Trial)은 Neture에서 운영됩니다</h1>
      <p style={styles.description}>Neture 통합 허브로 이동 중입니다...</p>
      <a href={target} style={styles.link}>
        자동 이동되지 않으면 여기를 클릭하세요 →
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px',
  },
  link: {
    fontSize: '14px',
    color: '#db2777',
    textDecoration: 'underline',
  },
};
