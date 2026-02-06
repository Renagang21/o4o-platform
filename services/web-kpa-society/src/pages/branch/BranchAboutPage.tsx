/**
 * BranchAboutPage - 분회 소개 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { useBranchContext } from '../../contexts/BranchContext';
import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';

interface BranchInfo {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  memberCount?: number;
  establishedDate?: string;
  region?: string;
}

export function BranchAboutPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branchName, basePath } = useBranchContext();
  const [info, setInfo] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getBranchInfo(branchId!);
      setInfo(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="분회 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="분회 소개"
        breadcrumb={[
          { label: '홈', href: `${basePath}` },
          { label: '분회 소개' },
        ]}
      />

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroIcon}>🏢</div>
        <h1 style={styles.heroTitle}>{branchName} 분회</h1>
        <p style={styles.heroSubtitle}>KPA-Society 소속</p>
      </div>

      {/* Info Cards */}
      <div style={styles.infoGrid}>
        <Card padding="large">
          <h2 style={styles.sectionTitle}>기본 정보</h2>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>분회명</span>
              <span style={styles.infoValue}>{info?.name || branchName}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>소속</span>
              <span style={styles.infoValue}>KPA-Society</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>관할지역</span>
              <span style={styles.infoValue}>{info?.region || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>회원 수</span>
              <span style={styles.infoValue}>{info?.memberCount || 0}명</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>설립일</span>
              <span style={styles.infoValue}>{info?.establishedDate || '-'}</span>
            </div>
          </div>
        </Card>

        <Card padding="large">
          <h2 style={styles.sectionTitle}>연락처</h2>
          <div style={styles.infoList}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>주소</span>
              <span style={styles.infoValue}>{info?.address || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>전화</span>
              <span style={styles.infoValue}>{info?.phone || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>이메일</span>
              <span style={styles.infoValue}>{info?.email || '-'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Description */}
      {info?.description && (
        <Card padding="large" style={{ marginTop: '24px' }}>
          <h2 style={styles.sectionTitle}>분회 소개</h2>
          <p style={styles.description}>{info.description}</p>
        </Card>
      )}

      {/* Quick Links */}
      <div style={styles.quickLinks}>
        <Link to={`${basePath}/about/officers`} style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>👥</span>
          <span style={styles.quickLinkLabel}>임원 안내</span>
          <span style={styles.quickLinkArrow}>→</span>
        </Link>
        <Link to={`${basePath}/about/contact`} style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>📞</span>
          <span style={styles.quickLinkLabel}>연락처 상세</span>
          <span style={styles.quickLinkArrow}>→</span>
        </Link>
        <Link to="/" style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>🏛️</span>
          <span style={styles.quickLinkLabel}>본부 사이트</span>
          <span style={styles.quickLinkArrow}>→</span>
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  hero: {
    textAlign: 'center',
    padding: '48px 20px',
    backgroundColor: colors.neutral50,
    borderRadius: '16px',
    marginBottom: '32px',
  },
  heroIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  heroSubtitle: {
    fontSize: '16px',
    color: colors.neutral500,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '20px',
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  infoLabel: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  infoValue: {
    fontSize: '15px',
    fontWeight: 500,
    color: colors.neutral900,
    textAlign: 'right',
  },
  description: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: colors.neutral700,
  },
  quickLinks: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quickLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: `1px solid ${colors.neutral200}`,
    textDecoration: 'none',
    transition: 'transform 0.2s',
  },
  quickLinkIcon: {
    fontSize: '24px',
    marginRight: '16px',
  },
  quickLinkLabel: {
    flex: 1,
    fontSize: '16px',
    fontWeight: 500,
    color: colors.neutral900,
  },
  quickLinkArrow: {
    fontSize: '18px',
    color: colors.neutral400,
  },
};
