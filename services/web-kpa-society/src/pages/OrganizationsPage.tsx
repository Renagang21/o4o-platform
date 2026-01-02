import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { kpaApi, Organization } from '../api/kpa';

/**
 * Organizations List Page
 * (A) 조직 목록 조회
 */

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'headquarters' | 'branch' | 'chapter'>('all');

  useEffect(() => {
    loadOrganizations();
  }, [filter]);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = filter !== 'all' ? { type: filter } : undefined;
      const response = await kpaApi.listOrganizations(params);
      setOrganizations(response.data);
    } catch (err: any) {
      setError(err.message || '조직 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'headquarters':
        return '본부';
      case 'branch':
        return '지부';
      case 'chapter':
        return '분회';
      default:
        return type;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>조직 목록</h1>
        <p style={styles.subtitle}>약사회 조직 구조를 확인하세요</p>
      </div>

      {/* Filter */}
      <div style={styles.filterContainer}>
        {(['all', 'headquarters', 'branch', 'chapter'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              ...styles.filterButton,
              ...(filter === type ? styles.filterButtonActive : {}),
            }}
          >
            {type === 'all' ? '전체' : getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <div style={styles.loading}>Loading...</div>}

      {error && (
        <div style={styles.error}>
          <p>{error}</p>
          <button onClick={loadOrganizations} style={styles.retryButton}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && (
        <div style={styles.grid}>
          {organizations.map((org) => (
            <Link to={`/organizations/${org.id}`} key={org.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.typeTag}>{getTypeLabel(org.type)}</span>
                {!org.isActive && <span style={styles.inactiveTag}>비활성</span>}
              </div>
              <h3 style={styles.orgName}>{org.name}</h3>
              <p style={styles.orgCode}>{org.code}</p>
              {org.description && (
                <p style={styles.orgDescription}>{org.description}</p>
              )}
              {org.memberCount !== undefined && (
                <p style={styles.memberCount}>회원 {org.memberCount}명</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && organizations.length === 0 && (
        <div style={styles.empty}>등록된 조직이 없습니다.</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 32,
  },
  filterButton: {
    padding: '10px 20px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: '#0066cc',
    color: '#fff',
    borderColor: '#0066cc',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: 40,
    color: '#d32f2f',
  },
  retryButton: {
    marginTop: 16,
    padding: '10px 24px',
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 24,
  },
  card: {
    display: 'block',
    padding: 24,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  typeTag: {
    padding: '4px 10px',
    fontSize: 12,
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: 4,
    fontWeight: 500,
  },
  inactiveTag: {
    padding: '4px 10px',
    fontSize: 12,
    background: '#ffebee',
    color: '#c62828',
    borderRadius: 4,
    fontWeight: 500,
  },
  orgName: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orgCode: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  orgDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 1.5,
  },
  memberCount: {
    fontSize: 14,
    color: '#0066cc',
    marginTop: 12,
  },
  empty: {
    textAlign: 'center',
    padding: 60,
    color: '#888',
  },
};
