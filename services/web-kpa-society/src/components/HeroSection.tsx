/**
 * HeroSection - 공식 포털 스타일 배너
 * 절제된 단색 배경 + 핵심 메시지
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
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: colors.neutral800,
    minHeight: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '700px',
  },
  headline: {
    fontSize: '32px',
    fontWeight: 600,
    color: colors.white,
    marginBottom: '12px',
    lineHeight: 1.4,
  },
  subHeadline: {
    fontSize: '17px',
    color: colors.neutral300,
    marginBottom: '6px',
    fontWeight: 400,
  },
  supportText: {
    fontSize: '15px',
    color: colors.neutral400,
    marginBottom: '28px',
  },
  ctaButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: colors.white,
    color: colors.neutral800,
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  secondaryButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: colors.neutral300,
    border: `1px solid ${colors.neutral600}`,
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
