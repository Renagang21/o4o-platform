/**
 * InfoPageLayout - 정보 페이지용 공통 레이아웃
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * 서비스 상세 소개 및 참여 안내 페이지에서 사용
 */

import React from 'react';
import { PlatformHeader } from './PlatformHeader';
import { PlatformFooter } from './PlatformFooter';

export type BadgeType = 'demo' | 'independent' | 'none';

export interface InfoPageLayoutProps {
  children: React.ReactNode;
  /** 페이지 제목 */
  title: string;
  /** 페이지 설명 (한 줄) */
  subtitle?: string;
  /** 배지 타입 */
  badgeType?: BadgeType;
  /** 상단 아이콘 */
  icon?: string;
}

const BADGE_CONFIG: Record<Exclude<BadgeType, 'none'>, { text: string; style: React.CSSProperties }> = {
  demo: {
    text: '도입 검토용 데모',
    style: {
      display: 'inline-block',
      fontSize: '0.875rem',
      fontWeight: 500,
      backgroundColor: '#fef3c7',
      color: '#92400e',
      padding: '6px 12px',
      borderRadius: '16px',
      marginBottom: '16px',
    },
  },
  independent: {
    text: '독립 운영 가능',
    style: {
      display: 'inline-block',
      fontSize: '0.875rem',
      fontWeight: 500,
      backgroundColor: '#d1fae5',
      color: '#065f46',
      padding: '6px 12px',
      borderRadius: '16px',
      marginBottom: '16px',
    },
  },
};

export function InfoPageLayout({
  children,
  title,
  subtitle,
  badgeType = 'none',
  icon,
}: InfoPageLayoutProps) {
  const badge = badgeType !== 'none' ? BADGE_CONFIG[badgeType] : null;

  return (
    <div style={styles.wrapper}>
      <PlatformHeader />
      <main style={styles.main}>
        <div style={styles.container}>
          {/* Hero Section */}
          <div style={styles.hero}>
            {icon && <div style={styles.icon}>{icon}</div>}
            {badge && <span style={badge.style}>{badge.text}</span>}
            <h1 style={styles.title}>{title}</h1>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>

          {/* Content */}
          <div style={styles.content}>
            {children}
          </div>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#64748b',
    margin: 0,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
};

export default InfoPageLayout;
