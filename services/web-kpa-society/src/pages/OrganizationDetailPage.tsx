import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { kpaApi, Organization } from '../api/kpa';

/**
 * Organization Detail Page
 * (A) 조직 상세 조회
 */

interface OrganizationDetail extends Organization {
  parent?: Organization;
  children?: Organization[];
}

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOrganization(id);
    }
  }, [id]);

  const loadOrganization = async (orgId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await kpaApi.getOrganization(orgId, {
        includeParent: true,
        includeChildren: true,
        includeMemberCount: true,
      });
      setOrganization(response.data);
    } catch (err: any) {
      if (err.status === 404) {
        setError('조직을 찾을 수 없습니다.');
      } else {
        setError(err.message || '조직 정보를 불러오는데 실패했습니다.');
      }
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>{error || '알 수 없는 오류가 발생했습니다.'}</p>
          <Link to="/organizations" style={styles.backButton}>
            조직 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <nav style={styles.breadcrumb}>
        <Link to="/organizations" style={styles.breadcrumbLink}>조직 목록</Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span>{organization.name}</span>
      </nav>

      {/* Main Info */}
      <div style={styles.mainCard}>
        <div style={styles.cardHeader}>
          <span style={styles.typeTag}>{getTypeLabel(organization.type)}</span>
          {!organization.isActive && <span style={styles.inactiveTag}>비활성</span>}
        </div>

        <h1 style={styles.title}>{organization.name}</h1>
        <p style={styles.code}>코드: {organization.code}</p>

        {organization.description && (
          <p style={styles.description}>{organization.description}</p>
        )}

        <div style={styles.meta}>
          {organization.memberCount !== undefined && (
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>회원 수</span>
              <span style={styles.metaValue}>{organization.memberCount}명</span>
            </div>
          )}
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>생성일</span>
            <span style={styles.metaValue}>
              {new Date(organization.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
      </div>

      {/* Parent Organization */}
      {organization.parent && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>상위 조직</h2>
          <Link to={`/organizations/${organization.parent.id}`} style={styles.orgLink}>
            <span style={styles.typeTagSmall}>{getTypeLabel(organization.parent.type)}</span>
            <span>{organization.parent.name}</span>
          </Link>
        </div>
      )}

      {/* Child Organizations */}
      {organization.children && organization.children.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>하위 조직 ({organization.children.length})</h2>
          <div style={styles.childGrid}>
            {organization.children.map((child) => (
              <Link to={`/organizations/${child.id}`} key={child.id} style={styles.childCard}>
                <span style={styles.typeTagSmall}>{getTypeLabel(child.type)}</span>
                <span style={styles.childName}>{child.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 20px',
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: 60,
    color: '#d32f2f',
  },
  backButton: {
    display: 'inline-block',
    marginTop: 16,
    padding: '10px 24px',
    background: '#0066cc',
    color: '#fff',
    borderRadius: 8,
    textDecoration: 'none',
  },
  breadcrumb: {
    marginBottom: 24,
    fontSize: 14,
    color: '#666',
  },
  breadcrumbLink: {
    color: '#0066cc',
    textDecoration: 'none',
  },
  breadcrumbSeparator: {
    margin: '0 8px',
    color: '#ccc',
  },
  mainCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 32,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 24,
  },
  cardHeader: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  typeTag: {
    padding: '6px 12px',
    fontSize: 13,
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: 4,
    fontWeight: 500,
  },
  typeTagSmall: {
    padding: '3px 8px',
    fontSize: 11,
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: 4,
    fontWeight: 500,
  },
  inactiveTag: {
    padding: '6px 12px',
    fontSize: 13,
    background: '#ffebee',
    color: '#c62828',
    borderRadius: 4,
    fontWeight: 500,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  code: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  meta: {
    display: 'flex',
    gap: 32,
    paddingTop: 16,
    borderTop: '1px solid #eee',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#888',
  },
  metaValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a1a',
  },
  section: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  orgLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    background: '#f5f5f5',
    borderRadius: 8,
    textDecoration: 'none',
    color: '#1a1a1a',
  },
  childGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  childCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: '#f5f5f5',
    borderRadius: 8,
    textDecoration: 'none',
    color: '#1a1a1a',
    transition: 'background 0.2s',
  },
  childName: {
    fontWeight: 500,
  },
};
