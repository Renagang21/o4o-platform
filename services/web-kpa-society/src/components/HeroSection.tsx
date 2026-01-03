/**
 * HeroSection - 경기도약사회 스타일 배너
 * 그라데이션 배경 + 메인 메시지 + CTA 버튼
 */

import { Link } from 'react-router-dom';
import { colors } from '../styles/theme';

interface HeroSectionProps {
  headline?: string;
  subHeadline?: string;
  supportText?: string;
}

export function HeroSection({
  headline = '약사회는 회원 여러분과 함께합니다',
  subHeadline = '지역 약사회의 공식 업무 지원 플랫폼',
  supportText = '공지, 교육, 회원 관리를 하나의 플랫폼에서',
}: HeroSectionProps) {
  return (
    <section style={styles.hero}>
      <div style={styles.heroOverlay} />
      <div style={styles.heroContent}>
        <h1 style={styles.headline}>{headline}</h1>
        <p style={styles.subHeadline}>{subHeadline}</p>
        <p style={styles.supportText}>{supportText}</p>
        <div style={styles.ctaButtons}>
          <Link to="/about" style={styles.primaryButton}>
            약사회 소개
          </Link>
          <Link to="/notices" style={styles.secondaryButton}>
            공지사항 보기
          </Link>
        </div>
      </div>
      {/* Decorative elements */}
      <div style={styles.decorCircle1} />
      <div style={styles.decorCircle2} />
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    position: 'relative',
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 50%, ${colors.neutral900} 100%)`,
    minHeight: '400px',
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
    color: colors.white,
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
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: colors.white,
    color: colors.primary,
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
    color: colors.white,
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
