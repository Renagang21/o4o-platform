/**
 * LmsCertificatesPage - 완료 기록 페이지
 *
 * 핵심 원칙:
 * - 이 기능은 교육이나 평가를 위한 것이 아닙니다
 * - 안내 흐름의 완료 기록을 관리하는 도구입니다
 *
 * NOTE: 수료증/인증서 발급 기능은 도메인별로 판단해야 합니다.
 * Learning App은 순차 전달 도구이며, 수료 인증은 별도 App 영역입니다.
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { lmsApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { Certificate } from '../../types';

export function LmsCertificatesPage() {
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

      const res = await lmsApi.getMyCertificates({
        page: currentPage,
        limit: 12,
      });

      setCertificates(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '완료 기록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const cert = certificates.find(c => c.id === id);
      if (cert?.downloadUrl) {
        window.open(cert.downloadUrl, '_blank');
      }
    } catch (err) {
      alert('다운로드에 실패했습니다.');
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="완료 기록을 확인하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="완료 기록을 불러오는 중..." />;
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
        title="완료 기록"
        description="완료한 안내 흐름의 기록을 확인하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '안내', href: '/lms/courses' },
          { label: '완료 기록' },
        ]}
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon="📋"
          title="완료 기록이 없습니다"
          description="안내 흐름을 완료하면 기록이 생성됩니다."
          action={{ label: '안내 흐름 보기', onClick: () => window.location.href = '/lms/courses' }}
        />
      ) : (
        <>
          <div style={styles.grid}>
            {certificates.map(cert => (
              <Card key={cert.id} padding="large">
                <div style={styles.certIcon}>🎓</div>
                <h3 style={styles.certTitle}>{cert.courseName}</h3>
                <div style={styles.certInfo}>
                  <p>발급일: {new Date(cert.issuedAt).toLocaleDateString()}</p>
                  <p>인증번호: {cert.certificateNumber}</p>
                </div>
                <button
                  style={styles.downloadButton}
                  onClick={() => handleDownload(cert.id)}
                >
                  📥 다운로드
                </button>
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
  certIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  certTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    textAlign: 'center',
    margin: 0,
    marginBottom: '16px',
  },
  certInfo: {
    ...typography.bodyS,
    color: colors.neutral500,
    textAlign: 'center',
    marginBottom: '20px',
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
