/**
 * PartnerOverviewInfoPage - 파트너·운영자 설명용 1페이지
 *
 * WO-NETURE-O4O-SELLER-ENABLEMENT-MASTER-V1 > Track C
 * - /partner/overview-info 경로
 * - 대상: 매장을 직접 설득·관리·연결해야 하는 주체
 *   (시장 운영자, 협회·조직, 브랜드/제품 공급사, 지역 파트너)
 * - 핵심: "매장에게 무엇을 요구하지 말아야 하는가"
 */

import { Link } from 'react-router-dom';

export default function PartnerOverviewInfoPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Print Button */}
        <div style={styles.printButtonWrapper} className="no-print">
          <button onClick={handlePrint} style={styles.printButton}>
            PDF로 저장 / 인쇄
          </button>
        </div>

        {/* 운영형 알파 상태 (WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE) */}
        <div style={styles.alphaBanner}>
          <div style={styles.alphaBadgeWrapper}>
            <span style={styles.alphaIndicator}></span>
            <span style={styles.alphaBadgeText}>운영형 알파 · v0.8.0</span>
          </div>
          <p style={styles.alphaBannerText}>
            파트너·운영자와 함께 운영 구조를 검증하는 단계입니다
          </p>
        </div>

        {/* [1] 헤드라인 */}
        <header style={styles.header}>
          <p style={styles.headerLabel}>파트너·운영자를 위한 안내</p>
          <h1 style={styles.headline}>
            매장은 '운영 대상'이 아니라
            <br />
            '참여 주체'입니다.
          </h1>
        </header>

        {/* [2] 이 문서는 누구를 위한 것인가 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>이 문서는 누구를 위한 것인가</h2>
          <p style={styles.paragraph}>
            이 문서는 다음과 같은 역할을 가진 분들을 위한 안내입니다.
          </p>
          <ul style={styles.bulletList}>
            <li style={styles.bulletItem}>
              <strong>시장 운영자</strong>
              <br />
              전통시장, 상가, 쇼핑몰 등을 운영하는 주체
            </li>
            <li style={styles.bulletItem}>
              <strong>협회·조직</strong>
              <br />
              약사회, 미용협회, 상인회 등 소속 매장을 연결하는 조직
            </li>
            <li style={styles.bulletItem}>
              <strong>브랜드/제품 공급사</strong>
              <br />
              매장을 통해 제품을 유통하거나 홍보하려는 기업
            </li>
            <li style={styles.bulletItem}>
              <strong>지역 파트너</strong>
              <br />
              특정 지역의 매장들을 연결하려는 주체
            </li>
          </ul>
          <p style={styles.note}>
            👉 이 문서는 <strong>매장에게 무엇을 요구할지 고민하는 분</strong>을 위한 가이드입니다.
          </p>
        </section>

        {/* [3] 핵심 원칙 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>핵심 원칙</h2>
          <div style={styles.principleGrid}>
            <div style={styles.principleCard}>
              <div style={styles.principleIcon}>❌</div>
              <h3 style={styles.principleTitle}>매장은 운영 대상이 아닙니다</h3>
              <p style={styles.principleText}>
                매장에게 시스템 운영, 콘텐츠 관리, 설정 작업을 요구하지 마세요.
              </p>
            </div>
            <div style={styles.principleCard}>
              <div style={styles.principleIcon}>✔</div>
              <h3 style={styles.principleTitle}>매장은 참여 주체입니다</h3>
              <p style={styles.principleText}>
                매장은 이미 만들어진 구조에 참여하여 고객 접점을 담당합니다.
              </p>
            </div>
          </div>
        </section>

        {/* [4] 역할 분담 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>역할 분담</h2>
          <div style={styles.roleTable}>
            <div style={styles.roleRow}>
              <div style={styles.roleHeader}>역할</div>
              <div style={styles.roleHeader}>담당 주체</div>
            </div>
            <div style={styles.roleRow}>
              <div style={styles.roleCell}>사업 구조 설계</div>
              <div style={styles.roleCell}><strong>운영자 / 플랫폼</strong></div>
            </div>
            <div style={styles.roleRow}>
              <div style={styles.roleCell}>콘텐츠 기획·운영</div>
              <div style={styles.roleCell}><strong>운영자 / 플랫폼</strong></div>
            </div>
            <div style={styles.roleRow}>
              <div style={styles.roleCell}>시스템 설정·관리</div>
              <div style={styles.roleCell}><strong>플랫폼</strong></div>
            </div>
            <div style={styles.roleRow}>
              <div style={styles.roleCell}>매장 정보 등록</div>
              <div style={styles.roleCell}><strong>운영자</strong> (매장 대신)</div>
            </div>
            <div style={styles.roleRow}>
              <div style={styles.roleCell}>고객 접점·판매</div>
              <div style={styles.roleCell}><strong>매장</strong></div>
            </div>
            <div style={styles.roleRow}>
              <div style={styles.roleCell}>참여 여부 결정</div>
              <div style={styles.roleCell}><strong>매장</strong></div>
            </div>
          </div>
        </section>

        {/* [5] 매장에게 요구하지 말아야 할 것 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>매장에게 요구하지 말아야 할 것</h2>
          <ul style={styles.dontList}>
            <li style={styles.dontItem}>
              <span style={styles.dontIcon}>❌</span>
              <span>시스템 로그인/관리</span>
            </li>
            <li style={styles.dontItem}>
              <span style={styles.dontIcon}>❌</span>
              <span>콘텐츠 직접 등록</span>
            </li>
            <li style={styles.dontItem}>
              <span style={styles.dontIcon}>❌</span>
              <span>복잡한 설정 작업</span>
            </li>
            <li style={styles.dontItem}>
              <span style={styles.dontIcon}>❌</span>
              <span>정기적인 관리 업무</span>
            </li>
            <li style={styles.dontItem}>
              <span style={styles.dontIcon}>❌</span>
              <span>기술적 문제 해결</span>
            </li>
          </ul>
          <p style={styles.emphasisBox}>
            매장의 부담을 최소화할수록
            <br />
            <strong>참여율과 지속성이 높아집니다.</strong>
          </p>
        </section>

        {/* [6] 매장에게 안내할 것 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>매장에게 안내할 것</h2>
          <ul style={styles.doList}>
            <li style={styles.doItem}>
              <span style={styles.doIcon}>✔</span>
              <span>참여 구조 설명 (1페이지 안내문 활용)</span>
            </li>
            <li style={styles.doItem}>
              <span style={styles.doIcon}>✔</span>
              <span>참여 시 매장의 역할 (고객 접점 유지)</span>
            </li>
            <li style={styles.doItem}>
              <span style={styles.doIcon}>✔</span>
              <span>참여 여부 선택권이 매장에 있음</span>
            </li>
            <li style={styles.doItem}>
              <span style={styles.doIcon}>✔</span>
              <span>운영/설계는 운영자가 책임짐</span>
            </li>
          </ul>
          <div style={styles.resourceLink}>
            <p style={styles.resourceText}>매장 안내용 자료:</p>
            <Link to="/seller/overview" style={styles.resourceButton}>
              판매자(매장) 전용 안내 페이지 →
            </Link>
          </div>
        </section>

        {/* [7] 다음 단계 */}
        <section style={styles.nextStep}>
          <h2 style={styles.nextStepTitle}>다음 단계</h2>
          <p style={styles.nextStepText}>
            o4o 플랫폼의 전체 구조와 운영자의 역할을 이해하려면,
            <br />
            먼저 플랫폼 소개 페이지를 확인하세요.
          </p>
          <Link to="/guide/o4o-overview" style={styles.ctaButton}>
            o4o 플랫폼 소개 보기
          </Link>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            © 2026 o4o Platform · Neture
          </p>
        </footer>
      </div>

      {/* Print Styles */}
      <style>{printStyles}</style>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#fff',
    minHeight: '100vh',
  },
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '48px 24px',
  },

  // Alpha Banner (WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE)
  alphaBanner: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '16px 24px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  alphaBadgeWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '20px',
    marginBottom: '10px',
  },
  alphaIndicator: {
    width: '6px',
    height: '6px',
    backgroundColor: '#34d399',
    borderRadius: '50%',
  },
  alphaBadgeText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.9)',
  },
  alphaBannerText: {
    fontSize: '14px',
    color: '#065f46',
    margin: 0,
  },

  // Print Button
  printButtonWrapper: {
    textAlign: 'right',
    marginBottom: '24px',
  },
  printButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: '48px',
    paddingBottom: '32px',
    borderBottom: '2px solid #e2e8f0',
  },
  headerLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '16px',
  },
  headline: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.4,
    margin: 0,
  },

  // Section
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  paragraph: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '16px',
  },

  // Lists
  bulletList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0',
  },
  bulletItem: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: '16px',
    paddingLeft: '16px',
    borderLeft: '3px solid #e2e8f0',
  },

  // Note
  note: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginTop: '16px',
  },

  // Principle Grid
  principleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  principleCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
  },
  principleIcon: {
    fontSize: '2rem',
    marginBottom: '12px',
  },
  principleTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '8px',
  },
  principleText: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.5,
    margin: 0,
  },

  // Role Table
  roleTable: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  roleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  },
  roleHeader: {
    backgroundColor: '#f1f5f9',
    padding: '12px 16px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#0f172a',
    borderBottom: '1px solid #e2e8f0',
  },
  roleCell: {
    padding: '12px 16px',
    fontSize: '0.9rem',
    color: '#334155',
    borderBottom: '1px solid #e2e8f0',
  },

  // Don't List
  dontList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0',
  },
  dontItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '12px',
  },
  dontIcon: {
    fontSize: '1rem',
  },

  // Do List
  doList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0',
  },
  doItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '12px',
  },
  doIcon: {
    fontSize: '1rem',
    color: '#16a34a',
  },

  // Emphasis Box
  emphasisBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '20px',
    fontSize: '1rem',
    color: '#0f172a',
    lineHeight: 1.6,
    textAlign: 'center',
    marginTop: '24px',
  },

  // Resource Link
  resourceLink: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '24px',
  },
  resourceText: {
    fontSize: '0.9rem',
    color: '#166534',
    marginBottom: '12px',
  },
  resourceButton: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#16a34a',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    borderRadius: '6px',
    textDecoration: 'none',
  },

  // Next Step
  nextStep: {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    marginTop: '48px',
  },
  nextStepTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '16px',
  },
  nextStepText: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 1.7,
    marginBottom: '16px',
  },
  ctaButton: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    marginTop: '8px',
  },

  // Footer
  footer: {
    textAlign: 'center',
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
};

const printStyles = `
  @media print {
    .no-print {
      display: none !important;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4;
      margin: 15mm;
    }
  }
`;
