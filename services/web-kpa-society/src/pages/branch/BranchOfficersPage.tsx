/**
 * BranchOfficersPage - 분회 임원 안내
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';

import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';
import type { Officer } from '../../types';

export function BranchOfficersPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getOfficers(branchId!);
      setOfficers(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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

  // Group officers by position type
  const leadership = officers.filter(o => ['회장', '분회장', '부회장'].some(p => o.position.includes(p)));
  const executives = officers.filter(o => !['회장', '분회장', '부회장'].some(p => o.position.includes(p)));

  return (
    <div style={styles.container}>
      <PageHeader
        title="임원 안내"
        breadcrumb={[
          { label: '홈', href: `/branch/${branchId}` },
          { label: '분회 소개', href: `/branch/${branchId}/about` },
          { label: '임원 안내' },
        ]}
      />

      {officers.length === 0 ? (
        <EmptyState
          icon="👥"
          title="임원 정보가 없습니다"
          description="등록된 임원 정보가 없습니다."
        />
      ) : (
        <>
          {/* Leadership */}
          {leadership.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>분회장단</h2>
              <div style={styles.leadershipGrid}>
                {leadership.map((officer) => (
                  <Card key={officer.id} padding="large" style={styles.leaderCard}>
                    <div style={styles.leaderAvatar}>
                      <span>👤</span>
                    </div>
                    <div style={styles.leaderInfo}>
                      <span style={styles.leaderPosition}>{officer.position}</span>
                      <span style={styles.leaderName}>{officer.name}</span>
                      {officer.pharmacy && (
                        <span style={styles.leaderPharmacy}>{officer.pharmacy}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Executives */}
          {executives.length > 0 && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>임원진</h2>
              <Card>
                <div style={styles.executiveList}>
                  {executives.map((officer) => (
                    <div key={officer.id} style={styles.executiveItem}>
                      <div style={styles.executiveAvatar}>
                        <span>👤</span>
                      </div>
                      <div style={styles.executiveInfo}>
                        <span style={styles.executiveName}>{officer.name}</span>
                        <span style={styles.executivePosition}>{officer.position}</span>
                      </div>
                      {officer.pharmacy && (
                        <span style={styles.executivePharmacy}>{officer.pharmacy}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '20px',
  },
  leadershipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  leaderCard: {
    textAlign: 'center',
  },
  leaderAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    margin: '0 auto 16px',
  },
  leaderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  leaderPosition: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.primary,
  },
  leaderName: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  leaderPharmacy: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  executiveList: {
    display: 'flex',
    flexDirection: 'column',
  },
  executiveItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.neutral200}`,
    gap: '16px',
  },
  executiveAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  executiveInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  executiveName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  executivePosition: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  executivePharmacy: {
    fontSize: '14px',
    color: colors.neutral500,
    textAlign: 'right',
  },
};
