/**
 * MarketTrialSection - 커뮤니티 메인 "마켓트라이얼 소식" 블록
 *
 * WO-MARKET-TRIAL-COMMUNITY-HOME-BLOCK-IMPLEMENT-V1
 *
 * 배치: 공지사항(NoticeSection) 아래, 최근 활동(ActivitySection) 위
 * 데이터: Gateway API (/api/market-trial/gateway) — 독립 fetch
 * 역할: 모집중 Trial 요약 노출 + Trial 허브 진입
 *
 * accessStatus 분기:
 *   accessible      → "참여하기" (상세로 이동)
 *   not_logged_in   → "로그인 후 참여하세요"
 *   no_kpa_membership → "약사회 회원 가입 후 참여"
 *   not_pharmacy_member / pending_approval → 안내 문구
 *   no_trials       → 블록 숨김
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGateway, type AccessStatus, type GatewayTrialSummary } from '../../api/marketTrial';
import { useAuthModal } from '../../contexts/LoginModalContext';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

interface GatewayData {
  accessStatus: AccessStatus;
  openTrialCount: number;
  trials: GatewayTrialSummary[];
}

export function MarketTrialSection() {
  const [data, setData] = useState<GatewayData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { openLoginModal } = useAuthModal();

  useEffect(() => {
    getGateway()
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // 로딩 중이거나 데이터 없으면 렌더 안 함
  if (!loaded) return null;

  // no_trials이거나 모집중 Trial 없으면 블록 숨김
  if (!data || data.accessStatus === 'no_trials' || data.trials.length === 0) {
    return null;
  }

  const { accessStatus, trials } = data;
  // 최대 3건만 표시
  const visibleTrials = trials.slice(0, 3);

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>마켓트라이얼 소식</h2>
        <Link to="/market-trial" style={styles.moreLink}>전체 보기 →</Link>
      </div>

      {/* 비접근 상태 안내 배너 */}
      {accessStatus !== 'accessible' && (
        <AccessBanner status={accessStatus} onLoginClick={openLoginModal} />
      )}

      <div style={styles.card}>
        <ul style={styles.list}>
          {visibleTrials.map((trial) => (
            <TrialRow
              key={trial.id}
              trial={trial}
              accessStatus={accessStatus}
              onLoginClick={openLoginModal}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── 접근 상태 안내 배너 ──

function AccessBanner({ status, onLoginClick }: { status: AccessStatus; onLoginClick: () => void }) {
  const config = getAccessBannerConfig(status);
  if (!config) return null;

  return (
    <div style={styles.banner}>
      <span style={styles.bannerText}>{config.message}</span>
      {config.action === 'login' && (
        <button onClick={onLoginClick} style={styles.bannerButton}>
          로그인
        </button>
      )}
      {config.action === 'link' && config.href && (
        <Link to={config.href} style={styles.bannerLink}>
          {config.linkText}
        </Link>
      )}
    </div>
  );
}

function getAccessBannerConfig(status: AccessStatus): {
  message: string;
  action: 'login' | 'link' | 'none';
  href?: string;
  linkText?: string;
} | null {
  switch (status) {
    case 'not_logged_in':
      return { message: '로그인하면 시범판매에 참여할 수 있습니다.', action: 'login' };
    case 'no_kpa_membership':
      return { message: '약사회 회원 가입 후 참여할 수 있습니다.', action: 'none' };
    case 'not_pharmacy_member':
      return { message: '약국 회원 인증 후 참여할 수 있습니다.', action: 'link', href: '/pharmacy/approval', linkText: '인증하기' };
    case 'pending_approval':
      return { message: '약국 회원 승인 대기 중입니다. 승인 후 참여할 수 있습니다.', action: 'none' };
    default:
      return null;
  }
}

// ── Trial 행 ──

function TrialRow({
  trial,
  accessStatus,
  onLoginClick,
}: {
  trial: GatewayTrialSummary;
  accessStatus: AccessStatus;
  onLoginClick: () => void;
}) {
  const deadlineText = trial.fundingEndAt
    ? `마감 ${new Date(trial.fundingEndAt).toLocaleDateString()}`
    : null;

  return (
    <li style={styles.listItem}>
      <div style={styles.rowTop}>
        <span style={styles.statusBadge}>모집중</span>
        {trial.supplierName && (
          <span style={styles.supplier}>{trial.supplierName}</span>
        )}
      </div>
      <div style={styles.rowTitle}>{trial.title}</div>
      <div style={styles.rowMeta}>
        <span>참여 {trial.currentParticipants}{trial.maxParticipants ? ` / ${trial.maxParticipants}` : ''}명</span>
        {deadlineText && <span>{deadlineText}</span>}
      </div>
      <div style={styles.rowAction}>
        {accessStatus === 'accessible' ? (
          <Link to={`/market-trial/${trial.id}`} style={styles.ctaPrimary}>
            참여하기
          </Link>
        ) : accessStatus === 'not_logged_in' ? (
          <button onClick={onLoginClick} style={styles.ctaSecondary}>
            로그인 후 참여
          </button>
        ) : (
          <Link to="/market-trial" style={styles.ctaMuted}>
            자세히 보기
          </Link>
        )}
      </div>
    </li>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  moreLink: {
    fontSize: '0.813rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: shadows.sm,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: `${spacing.md} 0`,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: '4px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    backgroundColor: '#DCFCE7',
    color: '#166534',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  supplier: {
    fontSize: '0.8125rem',
    color: colors.neutral400,
  },
  rowTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral800,
    marginBottom: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: {
    display: 'flex',
    gap: spacing.md,
    fontSize: '0.8125rem',
    color: colors.neutral500,
    marginBottom: spacing.sm,
  },
  rowAction: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  ctaPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  ctaSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 16px',
    backgroundColor: colors.neutral100,
    color: colors.primary,
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none',
    border: `1px solid ${colors.neutral200}`,
    cursor: 'pointer',
  },
  ctaMuted: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 16px',
    backgroundColor: 'transparent',
    color: colors.neutral500,
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
    fontWeight: 500,
    textDecoration: 'none',
    border: `1px solid ${colors.neutral200}`,
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    flexWrap: 'wrap' as const,
  },
  bannerText: {
    fontSize: '0.8125rem',
    color: '#1E40AF',
    lineHeight: 1.5,
  },
  bannerButton: {
    padding: '4px 12px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: borderRadius.sm,
    fontSize: '0.75rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  bannerLink: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.primary,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  },
};
