/**
 * CertificateVerifyPage — 수료증 공개 검증 페이지
 *
 * WO-O4O-LMS-CERTIFICATE-VERIFICATION-V1
 * 경로: /certificate/verify/:certificateId
 * 접근: 공개 (로그인 불필요)
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface VerifyResult {
  valid: boolean;
  certificate?: {
    certificateId: string;
    certificateCode: string;
    userName: string;
    courseTitle: string;
    completedAt: string | null;
    issuedAt: string | null;
    issuer: string;
  };
}

export default function CertificateVerifyPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!certificateId) {
      setResult({ valid: false });
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        const res = await fetch(`${apiBase}/api/v1/lms/certificates/${certificateId}/verify`);
        if (!res.ok) throw new Error('Network error');
        const data: VerifyResult = await res.json();
        setResult(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [certificateId]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* 헤더 */}
        <div style={styles.header}>
          <div style={styles.logo}>O4O LMS</div>
          <h1 style={styles.title}>수료증 검증</h1>
          <p style={styles.subtitle}>Certificate Verification</p>
        </div>

        {/* 본문 */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.statusBox}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>검증 중...</p>
            </div>
          ) : error ? (
            <div style={{ ...styles.statusBox, ...styles.errorBox }}>
              <div style={styles.iconLarge}>⚠️</div>
              <p style={styles.errorTitle}>검증 서비스에 일시적 오류가 발생했습니다.</p>
              <p style={styles.errorSub}>잠시 후 다시 시도해 주세요.</p>
            </div>
          ) : result?.valid && result.certificate ? (
            <div style={styles.validBox}>
              <div style={styles.badgeValid}>검증 완료</div>
              <div style={styles.iconLarge}>🎓</div>
              <p style={styles.userName}>{result.certificate.userName} 님은</p>
              <p style={styles.courseTitle}>"{result.certificate.courseTitle}"</p>
              <p style={styles.completionStatement}>과정을 정상적으로 이수하였습니다.</p>

              <div style={styles.infoTable}>
                {result.certificate.completedAt && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>완료일</span>
                    <span style={styles.infoValue}>{result.certificate.completedAt}</span>
                  </div>
                )}
                {result.certificate.issuedAt && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>발급일</span>
                    <span style={styles.infoValue}>{result.certificate.issuedAt}</span>
                  </div>
                )}
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>인증번호</span>
                  <span style={{ ...styles.infoValue, fontFamily: 'monospace' }}>
                    {result.certificate.certificateCode}
                  </span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>발급기관</span>
                  <span style={styles.infoValue}>{result.certificate.issuer}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...styles.statusBox, ...styles.invalidBox }}>
              <div style={styles.iconLarge}>✗</div>
              <p style={styles.invalidTitle}>유효하지 않은 수료증입니다.</p>
              <p style={styles.invalidSub}>
                인증번호 또는 발급 기관에 문의해 주세요.
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            이 페이지는 O4O LMS가 발급한 수료증의 진위 여부를 공개적으로 확인하는 서비스입니다.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#1e3a5f',
    padding: '32px 32px 24px',
    textAlign: 'center',
  },
  logo: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#a8c0d6',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '12px',
    color: '#a8c0d6',
    letterSpacing: '1px',
  },
  body: {
    padding: '32px',
  },
  statusBox: {
    textAlign: 'center',
    padding: '32px 16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#1e3a5f',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  iconLarge: {
    fontSize: '56px',
    marginBottom: '16px',
  },
  errorBox: {
    backgroundColor: '#fef9f0',
    borderRadius: '12px',
    border: '1px solid #fde68a',
  },
  errorTitle: {
    color: '#92400e',
    fontWeight: 600,
    fontSize: '15px',
    margin: '0 0 8px',
  },
  errorSub: {
    color: '#b45309',
    fontSize: '13px',
    margin: 0,
  },
  validBox: {
    textAlign: 'center',
  },
  badgeValid: {
    display: 'inline-block',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontSize: '13px',
    fontWeight: 600,
    padding: '4px 14px',
    borderRadius: '20px',
    marginBottom: '20px',
  },
  userName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 6px',
  },
  courseTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e3a5f',
    margin: '0 0 8px',
  },
  completionStatement: {
    fontSize: '15px',
    color: '#374151',
    margin: '0 0 28px',
  },
  infoTable: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '16px 20px',
    textAlign: 'left',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500,
  },
  invalidBox: {
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  invalidTitle: {
    color: '#991b1b',
    fontWeight: 700,
    fontSize: '17px',
    margin: '0 0 8px',
  },
  invalidSub: {
    color: '#b91c1c',
    fontSize: '13px',
    margin: 0,
  },
  footer: {
    borderTop: '1px solid #f3f4f6',
    padding: '20px 32px',
    backgroundColor: '#f9fafb',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.6,
  },
};
