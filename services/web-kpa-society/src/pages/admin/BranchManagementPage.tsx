/**
 * BranchManagementPage - 분회 관리 (목록)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { adminApi } from '../../api/admin';
import { colors } from '../../styles/theme';

interface Branch {
  id: string;
  code: string;
  name: string;
  memberCount?: number;
  officerCount?: number;
  isActive: boolean;
  createdAt: string;
  metadata?: {
    address?: string;
    phone?: string;
    email?: string;
  };
}

export function BranchManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getBranches();
      setBranches(res.data.items);
    } catch (err) {
      // 데모용 샘플 데이터 (테스트용 분회 1개)
      setBranches([
        {
          id: 'branch-1',
          code: 'SAMPLE',
          name: '샘플분회',
          memberCount: 25,
          officerCount: 5,
          isActive: true,
          createdAt: '2024-01-15',
          metadata: { address: '서울시 강남구 테헤란로 123', phone: '02-1234-5678', email: 'sample@kpa.or.kr' },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    try {
      await adminApi.deleteBranch(branchId);
      setBranches(branches.filter(b => b.id !== branchId));
      setDeleteConfirm(null);
      alert('분회가 삭제되었습니다.');
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    try {
      await adminApi.updateBranch(branch.id, { isActive: !branch.isActive });
      setBranches(branches.map(b =>
        b.id === branch.id ? { ...b, isActive: !b.isActive } : b
      ));
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="분회 목록을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="분회 관리"
        description="소속 분회를 관리합니다."
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '관리자', href: '/admin' },
          { label: '분회 관리' },
        ]}
      />

      {/* 상단 액션 */}
      <div style={styles.actions}>
        <div style={styles.summary}>
          전체 <strong>{branches.length}</strong>개 분회
        </div>
        <Link to="/admin/branches/new" style={styles.createButton}>
          + 새 분회 등록
        </Link>
      </div>

      {/* 분회 목록 */}
      {branches.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="등록된 분회가 없습니다"
          description="새 분회를 등록해주세요."
          action={{ label: '분회 등록', onClick: () => window.location.href = '/admin/branches/new' }}
        />
      ) : (
        <div style={styles.list}>
          {branches.map(branch => (
            <Card key={branch.id}>
              <div style={styles.branchCard}>
                <div style={styles.branchInfo}>
                  <div style={styles.branchHeader}>
                    <h3 style={styles.branchName}>{branch.name}</h3>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: branch.isActive ? colors.accentGreen : colors.neutral400,
                    }}>
                      {branch.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                  <div style={styles.branchMeta}>
                    <span>코드: {branch.code}</span>
                    <span>•</span>
                    <span>회원 {branch.memberCount ?? 0}명</span>
                    <span>•</span>
                    <span>임원 {branch.officerCount ?? 0}명</span>
                  </div>
                  {branch.metadata?.address && (
                    <div style={styles.branchAddress}>
                      📍 {branch.metadata.address}
                    </div>
                  )}
                </div>

                <div style={styles.branchActions}>
                  <Link
                    to={`/branch/${branch.id}`}
                    style={styles.actionButton}
                    target="_blank"
                  >
                    사이트 보기
                  </Link>
                  <Link to={`/admin/branches/${branch.id}/edit`} style={styles.actionButton}>
                    수정
                  </Link>
                  <button
                    style={{ ...styles.actionButton, ...styles.toggleButton }}
                    onClick={() => handleToggleActive(branch)}
                  >
                    {branch.isActive ? '비활성화' : '활성화'}
                  </button>
                  {deleteConfirm === branch.id ? (
                    <div style={styles.confirmButtons}>
                      <button
                        style={{ ...styles.actionButton, ...styles.deleteConfirmButton }}
                        onClick={() => handleDelete(branch.id)}
                      >
                        확인
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => setDeleteConfirm(null)}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      style={{ ...styles.actionButton, ...styles.deleteButton }}
                      onClick={() => setDeleteConfirm(branch.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  summary: {
    fontSize: '14px',
    color: colors.neutral600,
  },
  createButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  branchCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    padding: '8px',
  },
  branchInfo: {
    flex: 1,
  },
  branchHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  branchName: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  statusBadge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  branchMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '6px',
  },
  branchAddress: {
    fontSize: '13px',
    color: colors.neutral600,
  },
  branchActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  actionButton: {
    padding: '8px 14px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  toggleButton: {
    backgroundColor: colors.neutral200,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  confirmButtons: {
    display: 'flex',
    gap: '4px',
  },
  deleteConfirmButton: {
    backgroundColor: '#DC2626',
    color: colors.white,
  },
};
