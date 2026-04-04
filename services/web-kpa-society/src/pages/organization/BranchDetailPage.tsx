/**
 * BranchDetailPage - 분회 상세 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { organizationApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Organization, Officer } from '../../types';

export function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [branch, setBranch] = useState<Organization | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [branchRes, officersRes] = await Promise.all([
        organizationApi.getBranch(id!),
        organizationApi.getOfficers({ organizationId: id }),
      ]);

      setBranch(branchRes.data);
      setOfficers(officersRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="분회 정보를 불러오는 중..." />;
  }

  if (error || !branch) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="분회를 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 분회입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/organization/branches') }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={branch.name}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '조직소개', href: '/organization' },
          { label: '지부/분회', href: '/organization/branches' },
          { label: branch.name },
        ]}
      />

      {/* 기본 정보 */}
      <Card padding="large" style={{ marginBottom: '24px' }}>
        <h2 style={styles.sectionTitle}>분회 소개</h2>
        <p style={styles.description}>
          {branch.description || `${branch.name}은 지역 약사들의 권익 보호와 전문성 향상을 위해 활동하고 있습니다.`}
        </p>

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>회원 수</span>
            <span style={styles.infoValue}>{branch.memberCount}명</span>
          </div>
          {branch.address && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>주소</span>
              <span style={styles.infoValue}>{branch.address}</span>
            </div>
          )}
          {branch.phone && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>전화</span>
              <span style={styles.infoValue}>{branch.phone}</span>
            </div>
          )}
          {branch.email && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>이메일</span>
              <span style={styles.infoValue}>{branch.email}</span>
            </div>
          )}
        </div>
      </Card>

      {/* 임원 정보 */}
      {officers.length > 0 && (
        <Card padding="large" style={{ marginBottom: '24px' }}>
          <h2 style={styles.sectionTitle}>분회 임원</h2>
          <div style={styles.officerGrid}>
            {officers.map(officer => (
              <div key={officer.id} style={styles.officerItem}>
                <div style={styles.officerPhoto}>
                  {officer.photoUrl ? (
                    <img src={officer.photoUrl} alt={officer.name} style={styles.officerImage} />
                  ) : (
                    <span style={styles.officerPlaceholder}>👤</span>
                  )}
                </div>
                <div style={styles.officerInfo}>
                  <span style={styles.officerPosition}>{officer.position}</span>
                  <span style={styles.officerName}>{officer.name}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 바로가기 */}
      <div style={styles.quickLinks}>
        <Link to={`/forum?organization=${branch.id}`} style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>💬</span>
          <span>분회 포럼</span>
        </Link>
        <Link to={`/content?organization=${branch.id}`} style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>📢</span>
          <span>분회 공지</span>
        </Link>
      </div>

      <div style={styles.footer}>
        <Link to="/organization/branches" style={styles.backButton}>
          목록으로
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  sectionTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
  },
  description: {
    ...typography.bodyL,
    color: colors.neutral700,
    lineHeight: 1.8,
    marginBottom: '24px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  infoValue: {
    ...typography.bodyM,
    color: colors.neutral800,
    fontWeight: 500,
  },
  officerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '20px',
  },
  officerItem: {
    textAlign: 'center',
  },
  officerPhoto: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    margin: '0 auto 12px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  officerPlaceholder: {
    fontSize: '40px',
  },
  officerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  officerPosition: {
    ...typography.bodyS,
    color: colors.primary,
    fontWeight: 500,
  },
  officerName: {
    ...typography.bodyM,
    color: colors.neutral900,
    fontWeight: 500,
  },
  quickLinks: {
    display: 'flex',
    gap: '16px',
  },
  quickLink: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral700,
  },
  quickLinkIcon: {
    fontSize: '20px',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  backButton: {
    padding: '12px 32px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
