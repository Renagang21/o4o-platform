/**
 * OfficersPage - 임원 안내 페이지
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { organizationApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Officer } from '../../types';

export function OfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await organizationApi.getOfficers();
      setOfficers(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 직책별 그룹화
  const groupedOfficers = officers.reduce((acc, officer) => {
    const group = officer.organizationName || '본부';
    if (!acc[group]) acc[group] = [];
    acc[group].push(officer);
    return acc;
  }, {} as Record<string, Officer[]>);

  if (loading) {
    return <LoadingSpinner message="임원 정보를 불러오는 중..." />;
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
        title="임원 안내"
        description="약사회 임원진을 소개합니다"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '조직소개', href: '/organization' },
          { label: '임원 안내' },
        ]}
      />

      {officers.length === 0 ? (
        <EmptyState
          icon="👥"
          title="임원 정보가 없습니다"
          description="임원 정보가 준비 중입니다."
        />
      ) : (
        Object.entries(groupedOfficers).map(([group, groupOfficers]) => (
          <Card key={group} padding="large" style={{ marginBottom: '24px' }}>
            <h2 style={styles.groupTitle}>{group}</h2>
            <div style={styles.officerGrid}>
              {groupOfficers.sort((a, b) => a.order - b.order).map(officer => (
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
                    {officer.phone && (
                      <span style={styles.officerContact}>📞 {officer.phone}</span>
                    )}
                    {officer.email && (
                      <span style={styles.officerContact}>✉️ {officer.email}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  groupTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: `2px solid ${colors.primary}`,
  },
  officerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '24px',
  },
  officerItem: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
  },
  officerPhoto: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: colors.white,
    margin: '0 auto 16px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `3px solid ${colors.neutral200}`,
  },
  officerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  officerPlaceholder: {
    fontSize: '48px',
  },
  officerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  officerPosition: {
    ...typography.bodyS,
    color: colors.primary,
    fontWeight: 600,
  },
  officerName: {
    ...typography.headingS,
    color: colors.neutral900,
  },
  officerContact: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
  },
};
