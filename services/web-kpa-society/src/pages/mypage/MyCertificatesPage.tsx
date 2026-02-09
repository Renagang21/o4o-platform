/**
 * MyCertificatesPage - 수료증 관리 페이지
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { mypageApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { Certificate } from '../../types';

/**
 * 현재 URL 경로에서 서비스 컨텍스트 prefix를 추출
 * - /branch-services/:branchId/* → '/branch-services/:branchId' (Service C)
 * - 기타 → '' (빈 문자열, 커뮤니티)
 */
function getServicePrefix(pathname: string): string {
  // 분회 서비스 컨텍스트 (Service C): /branch-services/:branchId/*
  const branchServicesMatch = pathname.match(/^(\/branch-services\/[^/]+)/);
  if (branchServicesMatch) return branchServicesMatch[1];

  // 메인 커뮤니티 컨텍스트
  return '';
}

export function MyCertificatesPage() {
  const location = useLocation();
  const servicePrefix = getServicePrefix(location.pathname);
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user) loadData();
  }, [user, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await mypageApi.getMyCertificates({
        page: currentPage,
        limit: 12,
      });

      setCertificates(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (cert: Certificate) => {
    if (cert.downloadUrl) {
      window.open(cert.downloadUrl, '_blank');
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="수료증을 확인하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="수료증을 불러오는 중..." />;
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
        title="수료증 관리"
        description="수료한 교육 과정의 수료증을 확인하세요"
        breadcrumb={[
          { label: '홈', href: servicePrefix || '/' },
          { label: '마이페이지', href: `${servicePrefix}/mypage` },
          { label: '수료증' },
        ]}
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon="📋"
          title="완료 기록이 없습니다"
          description="안내 흐름을 완료하면 기록이 생성됩니다."
          action={{ label: '안내 흐름 보기', onClick: () => window.location.href = `${servicePrefix}/lms/courses` }}
        />
      ) : (
        <>
          <div style={styles.grid}>
            {certificates.map(cert => (
              <Card key={cert.id} padding="large">
                <div style={styles.certContent}>
                  <div style={styles.certIcon}>🎓</div>
                  <h3 style={styles.certTitle}>{cert.courseName}</h3>
                  <div style={styles.certInfo}>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>발급일</span>
                      <span style={styles.infoValue}>
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>인증번호</span>
                      <span style={styles.infoValue}>{cert.certificateNumber}</span>
                    </div>
                  </div>
                  <button
                    style={styles.downloadButton}
                    onClick={() => handleDownload(cert)}
                  >
                    📥 다운로드
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  certContent: {
    textAlign: 'center',
  },
  certIcon: {
    fontSize: '56px',
    marginBottom: '16px',
  },
  certTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '16px',
  },
  certInfo: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  infoLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  infoValue: {
    ...typography.bodyS,
    color: colors.neutral800,
    fontWeight: 500,
  },
  downloadButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
