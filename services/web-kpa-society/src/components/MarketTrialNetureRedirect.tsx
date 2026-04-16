/**
 * Market Trial → Neture Redirect
 *
 * WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
 *
 * Market Trial 실행은 Neture 단독으로 통합되었습니다.
 * KPA의 기존 /market-trial/* URL은 backward-compatibility를 위해 유지하되,
 * 진입 시 자동으로 https://neture.co.kr/market-trial/* 로 이동합니다.
 *
 * 지원 경로:
 *  - /market-trial         → https://neture.co.kr/market-trial
 *  - /market-trial/my      → https://neture.co.kr/market-trial/my
 *  - /market-trial/:id     → https://neture.co.kr/market-trial/:id
 */

import { useEffect, useMemo } from 'react';

const NETURE_BASE = 'https://neture.co.kr';

export function MarketTrialNetureRedirect() {
  const target = useMemo(() => {
    const path = window.location.pathname + window.location.search;
    return `${NETURE_BASE}${path}`;
  }, []);

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div style={styles.container}>
      <div style={styles.icon}>🧪</div>
      <h1 style={styles.title}>Market Trial은 Neture에서 운영됩니다</h1>
      <p style={styles.description}>Neture로 이동 중입니다...</p>
      <a href={target} style={styles.link}>
        자동 이동되지 않으면 여기를 클릭하세요 →
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '4rem 1rem',
    textAlign: 'center',
    color: '#475569',
    maxWidth: '480px',
    margin: '0 auto',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '0.75rem',
  },
  description: {
    fontSize: '0.9375rem',
    marginBottom: '1.5rem',
  },
  link: {
    display: 'inline-block',
    color: '#2563eb',
    fontSize: '0.875rem',
    textDecoration: 'underline',
  },
};
