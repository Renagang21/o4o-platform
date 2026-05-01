/**
 * ParticipationCreatePage - 참여 생성 안내 페이지
 *
 * WO-KPA-PARTICIPATION-SETS-404-CLEANUP-V1:
 * KPA 백엔드에 /api/v1/kpa/participation/* 엔드포인트가 없으며,
 * participation 실행은 Neture canonical에서 관리한다.
 * 따라서 이 페이지는 question builder UI를 제공하지 않고,
 * 사용자에게 안내만 표시한다.
 */

import { Link } from 'react-router-dom';
import { PageHeader, Card } from '../../components/common';
import { colors, typography, borderRadius } from '../../styles/theme';

interface ParticipationCreatePageProps {
  /** Override page title */
  pageTitle?: string;
  /** Override page description */
  pageDescription?: string;
  /** Override breadcrumb */
  breadcrumb?: Array<{ label: string; href?: string }>;
  /** Cancel/return navigation target */
  returnTo?: string;
}

export function ParticipationCreatePage({
  pageTitle,
  pageDescription,
  breadcrumb,
  returnTo,
}: ParticipationCreatePageProps = {}) {
  const back = returnTo ?? '/participation';

  return (
    <div style={styles.container}>
      <PageHeader
        title={pageTitle ?? '새 참여 만들기'}
        description={pageDescription ?? '설문/참여 생성 기능 안내'}
        breadcrumb={breadcrumb ?? [
          { label: '홈', href: '/' },
          { label: '참여', href: '/participation' },
          { label: '새로 만들기' },
        ]}
      />

      <Card padding="large" style={styles.notice}>
        <h2 style={styles.title}>참여/설문 기능은 준비 중입니다</h2>
        <p style={styles.message}>
          KPA에서는 현재 설문/참여 생성 기능을 제공하지 않습니다.
          관련 기능이 준비되면 별도 안내드리겠습니다.
        </p>
        <div style={styles.actions}>
          <Link to={back} style={styles.backButton}>
            돌아가기
          </Link>
        </div>
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  notice: {
    textAlign: 'center',
    marginTop: '24px',
  },
  title: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: '0 0 12px',
  },
  message: {
    ...typography.bodyM,
    color: colors.neutral600,
    margin: '0 0 24px',
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    color: colors.neutral700,
    fontSize: '14px',
    textDecoration: 'none',
  },
};
