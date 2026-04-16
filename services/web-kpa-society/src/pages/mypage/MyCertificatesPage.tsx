/**
 * MyCertificatesPage - 수료증 관리 페이지
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import { mypageApi } from '../../api';
import { useAuth, getAccessToken } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { Certificate } from '../../types';

export function MyCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copyFeedback, setCopyFeedback] = useState<{ [id: string]: 'success' | 'fail' }>({});

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

  const handleCopyLink = async (cert: Certificate) => {
    const verifyUrl = `${window.location.origin}/certificate/verify/${cert.id}`;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopyFeedback(prev => ({ ...prev, [cert.id]: 'success' }));
    } catch {
      setCopyFeedback(prev => ({ ...prev, [cert.id]: 'fail' }));
    } finally {
      setTimeout(() => setCopyFeedback(prev => { const next = { ...prev }; delete next[cert.id]; return next; }), 2500);
    }
  };

  const handleDownload = async (cert: Certificate) => {
    try {
      const token = getAccessToken();
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
      const response = await fetch(
        `${apiBase}/api/v1/lms/certificates/${cert.id}/pdf`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!response.ok) throw new Error('PDF 다운로드에 실패했습니다.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.certificateNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('수료증 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
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
        title="이수현황"
        description="수료한 교육 과정의 수료증을 확인하세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: `/mypage` },
          { label: '이수현황' },
        ]}
      />
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />

      {certificates.length === 0 ? (
        <EmptyState
          icon="📋"
          title="완료 기록이 없습니다"
          description="안내 흐름을 완료하면 기록이 생성됩니다."
          action={{ label: '안내 흐름 보기', onClick: () => window.location.href = `/lms/courses` }}
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
                  <div style={styles.actionRow}>
                    <button
                      style={styles.downloadButton}
                      onClick={() => handleDownload(cert)}
                    >
                      📥 다운로드
                    </button>
                    <button
                      style={styles.copyButton}
                      onClick={() => handleCopyLink(cert)}
                    >
                      🔗 검증 링크 복사
                    </button>
                  </div>
                  {copyFeedback[cert.id] && (
                    <p style={{
                      fontSize: '12px',
                      marginTop: '8px',
                      color: copyFeedback[cert.id] === 'success' ? '#15803d' : '#b91c1c',
                      textAlign: 'center',
                    }}>
                      {copyFeedback[cert.id] === 'success'
                        ? '검증 링크가 복사되었습니다.'
                        : '링크 복사에 실패했습니다.'}
                    </p>
                  )}
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
  actionRow: {
    display: 'flex',
    gap: '8px',
  },
  downloadButton: {
    flex: 1,
    padding: '12px 8px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  copyButton: {
    flex: 1,
    padding: '12px 8px',
    backgroundColor: colors.white,
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
