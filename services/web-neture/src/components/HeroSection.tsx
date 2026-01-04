/**
 * HeroSection - Neture 메인 배너
 * kpa-society 스타일 그라데이션 배경 + 메인 메시지 + CTA 버튼
 */

import { Link } from 'react-router-dom';

interface HeroSectionProps {
  headline: string;
  subHeadline: string;
  supportText?: string;
}

export function HeroSection({ headline, subHeadline, supportText }: HeroSectionProps) {
  return (
    <section style={styles.hero}>
      <div style={styles.heroOverlay} />
      <div style={styles.heroContent}>
        <h1 style={styles.headline}>{headline}</h1>
        <p style={styles.subHeadline}>{subHeadline}</p>
        {supportText && <p style={styles.supportText}>{supportText}</p>}
        <div style={styles.ctaButtons}>
          <Link to="/login" style={styles.primaryButton}>
            로그인
          </Link>
          <Link to="/trials" style={styles.secondaryButton}>
            서비스 둘러보기
          </Link>
        </div>
      </div>
      {/* Decorative elements */}
      <div style={styles.decorCircle1} />
      <div style={styles.decorCircle2} />
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';
const PRIMARY_DARK = '#1D4ED8';

const styles: Record<string, React.CSSProperties> = {
  hero: {
    position: 'relative',
    background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${PRIMARY_DARK} 50%, #0F172A 100%)`,
    minHeight: '420px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '60px 20px',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
    opacity: 0.3,
  },
  heroContent: {
    position: 'relative',
    textAlign: 'center',
    zIndex: 1,
    maxWidth: '800px',
  },
  headline: {
    fontSize: '42px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '16px',
    lineHeight: 1.3,
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subHeadline: {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: '8px',
    fontWeight: 500,
  },
  supportText: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '32px',
  },
  ctaButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '24px',
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: '#fff',
    color: PRIMARY_COLOR,
    borderRadius: '30px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 600,
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  secondaryButton: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.8)',
    borderRadius: '30px',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 600,
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  decorCircle1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    top: '-100px',
    right: '-50px',
  },
  decorCircle2: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    bottom: '-80px',
    left: '-60px',
  },
};
