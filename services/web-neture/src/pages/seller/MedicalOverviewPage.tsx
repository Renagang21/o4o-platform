/**
 * MedicalOverviewPage - 의료기관 전용 설명 페이지
 *
 * WO-NETURE-O4O-MEDICAL-OVERVIEW-V1
 * - /seller/overview/medical 경로
 * - 대상: 치과, 의원, 병원 등 의료기관 전반
 * - 목적: 의료기관 대상 o4o 플랫폼 구조 설명
 * - 톤: 중립적 설명체 (판매/광고 프레이밍 금지)
 *
 * 핵심 메시지:
 * - 의료기관을 대신 운영하지 않는다
 * - 구조를 제공한다
 * - 자율성과 통제권 강조
 */

import { Link } from 'react-router-dom';

export default function MedicalOverviewPage() {
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

        {/* [1] Hero */}
        <HeroSection />

        {/* [2] 콘텐츠 중요성 섹션 */}
        <ContentImportanceSection />

        {/* [3] 대기시간 · TV · 동영상 구조 */}
        <WaitingRoomSection />

        {/* [4] 동영상 소스 구조 */}
        <VideoSourceSection />

        {/* [5] 출력물 · QR · 샘플 연결 */}
        <QRSection />

        {/* [6] 의료기관·근무자 참여 구조 */}
        <ParticipationSection />

        {/* [7] o4o 제공/비제공 경계 */}
        <BoundarySection />

        {/* [8] Next Step */}
        <NextStepSection />

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            © 2026 o4o Platform · Neture
          </p>
          <p style={styles.footerNote}>
            이 문서는 구조 설명을 위한 자료입니다. 제안서·계약서·홍보물이 아닙니다.
          </p>
        </footer>
      </div>

      {/* Print Styles */}
      <style>{printStyles}</style>
    </div>
  );
}

/**
 * [1] Hero Section
 * 의료기관 대상 핵심 메시지
 */
function HeroSection() {
  return (
    <header style={styles.header}>
      <p style={styles.headerLabel}>치과·의원·병원 등 의료기관을 위한 안내</p>
      <h1 style={styles.headline}>
        의료기관을 대신 운영하지 않습니다.
        <br />
        구조를 제공합니다.
      </h1>
      <p style={styles.headerSubtext}>
        이 문서는 o4o 플랫폼이 의료기관에게
        <br />
        어떤 구조를 제공하는지 설명합니다.
      </p>
    </header>
  );
}

/**
 * [2] 콘텐츠 중요성 섹션
 * 의료기관 콘텐츠 제작의 현실적 한계, 자율성과 통제권 강조
 */
function ContentImportanceSection() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>의료기관과 콘텐츠</h2>
      <div style={styles.explanationBox}>
        <p style={styles.explanationText}>
          의료기관에서 콘텐츠를 직접 제작하고 관리하는 것은
          <br />
          <strong>현실적으로 어렵습니다.</strong>
        </p>
      </div>
      <ul style={styles.featureList}>
        <li style={styles.featureItem}>
          <span style={styles.featureIcon}>•</span>
          <span>영상 제작에 투입할 시간과 인력 부족</span>
        </li>
        <li style={styles.featureItem}>
          <span style={styles.featureIcon}>•</span>
          <span>외부 제작 의뢰 시 비용과 품질 관리 부담</span>
        </li>
        <li style={styles.featureItem}>
          <span style={styles.featureIcon}>•</span>
          <span>지속적인 콘텐츠 갱신의 어려움</span>
        </li>
      </ul>
      <div style={styles.emphasisBox}>
        <p style={styles.emphasisText}>
          그러나 <strong>무엇을 보여줄지 결정하는 권한</strong>은
          <br />
          반드시 <strong>의료기관에 있어야 합니다.</strong>
        </p>
      </div>
      <p style={styles.noteText}>
        o4o는 콘텐츠를 제공하되,
        <br />
        선택과 통제의 주도권은 의료기관에 둡니다.
      </p>
    </section>
  );
}

/**
 * [3] 대기시간 · TV · 동영상 구조
 * 동영상 목록 개념, 선택/배치/편집 가능 구조 설명
 */
function WaitingRoomSection() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>대기 공간과 디지털 채널</h2>
      <div style={styles.cardGrid}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📺</div>
          <h3 style={styles.cardTitle}>TV / 디스플레이</h3>
          <p style={styles.cardText}>
            대기 공간의 TV는 광고판이 아닙니다.
            <br />
            의료기관이 선택한 정보만 표시됩니다.
          </p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📋</div>
          <h3 style={styles.cardTitle}>플레이리스트 구조</h3>
          <p style={styles.cardText}>
            동영상은 목록 단위로 관리됩니다.
            <br />
            필요한 목록만 선택해 사용합니다.
          </p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>✏️</div>
          <h3 style={styles.cardTitle}>직접 편집</h3>
          <p style={styles.cardText}>
            기술 지식 없이 대시보드에서
            <br />
            직접 선택·배치·편집할 수 있습니다.
          </p>
        </div>
      </div>
      <p style={styles.sectionNote}>
        외부 광고가 의료기관 동의 없이 노출되지 않습니다.
      </p>
    </section>
  );
}

/**
 * [4] 동영상 소스 구조
 * 의료기관 / 운영자 / 전문업체 / 커뮤니티
 */
function VideoSourceSection() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>동영상 소스 구조</h2>
      <p style={styles.paragraph}>
        의료기관이 사용할 수 있는 동영상은
        <br />
        다양한 소스에서 제공됩니다.
      </p>
      <div style={styles.sourceGrid}>
        <div style={styles.sourceItem}>
          <div style={styles.sourceIcon}>🏥</div>
          <div style={styles.sourceContent}>
            <h4 style={styles.sourceTitle}>의료기관 자체 제작</h4>
            <p style={styles.sourceText}>직접 제작한 영상을 업로드해 사용</p>
          </div>
        </div>
        <div style={styles.sourceItem}>
          <div style={styles.sourceIcon}>🤝</div>
          <div style={styles.sourceContent}>
            <h4 style={styles.sourceTitle}>운영자 제공</h4>
            <p style={styles.sourceText}>플랫폼 운영자가 준비한 콘텐츠</p>
          </div>
        </div>
        <div style={styles.sourceItem}>
          <div style={styles.sourceIcon}>🎬</div>
          <div style={styles.sourceContent}>
            <h4 style={styles.sourceTitle}>전문 제작업체</h4>
            <p style={styles.sourceText}>의료 콘텐츠 전문 제작사의 영상</p>
          </div>
        </div>
        <div style={styles.sourceItem}>
          <div style={styles.sourceIcon}>👥</div>
          <div style={styles.sourceContent}>
            <h4 style={styles.sourceTitle}>커뮤니티 공유</h4>
            <p style={styles.sourceText}>참여 의료기관 간 공유 콘텐츠</p>
          </div>
        </div>
      </div>
      <div style={styles.emphasisBox}>
        <p style={styles.emphasisText}>
          어떤 소스를 사용할지는
          <br />
          <strong>의료기관이 선택합니다.</strong>
        </p>
      </div>
    </section>
  );
}

/**
 * [5] 출력물 · QR · 샘플 연결
 * QR 자동 생성, 의료기관 코드 / 근무자 코드 개념
 */
function QRSection() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>QR 코드와 연결 구조</h2>
      <div style={styles.qrExplanation}>
        <div style={styles.qrRight}>
          <h3 style={styles.qrRightTitle}>QR의 역할</h3>
          <p style={styles.qrRightText}>
            QR은 환자가 <strong>스스로 선택해</strong>
            <br />
            추가 정보로 이동하는 <strong>연결 통로</strong>입니다.
          </p>
          <p style={styles.qrRightNote}>
            판매 유도 수단이 아닙니다.
          </p>
        </div>
        <div style={styles.qrTypes}>
          <h3 style={styles.qrTypesTitle}>QR 코드 유형</h3>
          <ul style={styles.qrTypeList}>
            <li>
              <strong>의료기관 코드</strong>
              <span>: 해당 의료기관 전용 연결</span>
            </li>
            <li>
              <strong>근무자 코드</strong>
              <span>: 개별 근무자 식별 (선택)</span>
            </li>
          </ul>
        </div>
      </div>
      <p style={styles.sectionNote}>
        QR 코드는 시스템에서 자동 생성되며,
        <br />
        출력물·포스터 등에 활용할 수 있습니다.
      </p>
    </section>
  );
}

/**
 * [6] 의료기관·근무자 참여 구조
 * "참여자" 개념, 강제 아님, 선택 구조 강조
 */
function ParticipationSection() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>참여 구조</h2>
      <div style={styles.explanationBox}>
        <p style={styles.explanationText}>
          의료기관은 o4o 플랫폼에서
          <br />
          <strong>'운영자'가 아니라 '참여자'</strong>입니다.
        </p>
      </div>
      <ul style={styles.checkList}>
        <li style={styles.checkItem}>
          <span style={styles.checkIcon}>✓</span>
          <span>참여는 <strong>선택</strong>입니다 — 강제가 아닙니다</span>
        </li>
        <li style={styles.checkItem}>
          <span style={styles.checkIcon}>✓</span>
          <span>참여 범위를 의료기관이 결정합니다</span>
        </li>
        <li style={styles.checkItem}>
          <span style={styles.checkIcon}>✓</span>
          <span>언제든 참여를 중단할 수 있습니다</span>
        </li>
      </ul>
      <div style={styles.participationNote}>
        <p style={styles.participationNoteTitle}>근무자 참여 (선택)</p>
        <p style={styles.participationNoteText}>
          근무자 개인이 참여할 경우,
          <br />
          개별 코드가 부여되어 활동 이력이 구분됩니다.
          <br />
          이 역시 <strong>선택 사항</strong>입니다.
        </p>
      </div>
    </section>
  );
}

/**
 * [7] o4o 제공/비제공 경계
 * 구조 / 기술 / 연결 vs 운영 / 매출 책임
 */
function BoundarySection() {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>o4o가 하는 것과 하지 않는 것</h2>
      <div style={styles.boundaryGrid}>
        <div style={styles.boundaryProvide}>
          <h3 style={styles.boundaryTitle}>
            <span style={styles.boundaryIconCheck}>✓</span> o4o가 제공하는 것
          </h3>
          <ul style={styles.boundaryList}>
            <li>구조 설계</li>
            <li>기술 시스템</li>
            <li>콘텐츠 연결</li>
            <li>확장 기반</li>
          </ul>
        </div>
        <div style={styles.boundaryNotProvide}>
          <h3 style={styles.boundaryTitle}>
            <span style={styles.boundaryIconX}>✕</span> o4o가 하지 않는 것
          </h3>
          <ul style={styles.boundaryList}>
            <li>의료기관 운영 대행</li>
            <li>콘텐츠 결정 (선택은 의료기관)</li>
            <li>매출 책임</li>
            <li>환자 유치 보장</li>
          </ul>
        </div>
      </div>
      <p style={styles.boundaryNote}>
        o4o는 구조를 제공하고, 의료기관은 그 안에서 자율적으로 운영합니다.
      </p>
    </section>
  );
}

/**
 * [8] Next Step
 * 구조 공감 여부 기준, 문의/다음 단계 CTA
 */
function NextStepSection() {
  return (
    <section style={styles.nextStep} className="no-print">
      <h2 style={styles.nextStepTitle}>다음 단계</h2>
      <p style={styles.nextStepText}>
        이 구조에 공감하신다면,
        <br />
        o4o 플랫폼 전체 구조를 확인해 보세요.
      </p>
      <p style={styles.nextStepSubtext}>
        공감이 전제되지 않으면 다음 단계로 진행하지 않습니다.
      </p>
      <div style={styles.ctaGroup}>
        <Link to="/o4o" style={styles.ctaPrimary}>
          o4o 플랫폼 소개 보기
        </Link>
        <Link to="/partners/apply" style={styles.ctaSecondary}>
          구조 상담 요청
        </Link>
      </div>
    </section>
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
    margin: '0 0 16px 0',
  },
  headerSubtext: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: 1.6,
  },

  // Section
  section: {
    marginBottom: '48px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '20px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  sectionNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    textAlign: 'center',
    marginTop: '20px',
    fontStyle: 'italic',
  },
  paragraph: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '20px',
    textAlign: 'center',
  },

  // Explanation Box
  explanationBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  explanationText: {
    fontSize: '1rem',
    color: '#0f172a',
    lineHeight: 1.7,
    margin: 0,
  },

  // Emphasis Box
  emphasisBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    margin: '20px 0',
  },
  emphasisText: {
    fontSize: '1rem',
    color: '#0f172a',
    lineHeight: 1.6,
    margin: 0,
  },

  // Feature List
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 20px 0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '12px',
    lineHeight: 1.6,
  },
  featureIcon: {
    fontSize: '1rem',
    color: '#64748b',
    marginTop: '2px',
  },

  noteText: {
    fontSize: '0.95rem',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.6,
  },

  // Card Grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '2rem',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '8px',
  },
  cardText: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },

  // Source Grid
  sourceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  sourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
  },
  sourceIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  sourceContent: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '4px',
  },
  sourceText: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0,
  },

  // QR Section
  qrExplanation: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  qrRight: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '20px',
  },
  qrRightTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#16a34a',
    marginBottom: '12px',
  },
  qrRightText: {
    fontSize: '0.95rem',
    color: '#166534',
    lineHeight: 1.6,
    margin: '0 0 12px 0',
  },
  qrRightNote: {
    fontSize: '0.85rem',
    color: '#15803d',
    fontStyle: 'italic',
    margin: 0,
  },
  qrTypes: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
  },
  qrTypesTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '12px',
  },
  qrTypeList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '0.9rem',
    color: '#334155',
    lineHeight: 1.8,
  },

  // Check List
  checkList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 20px 0',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '12px',
    lineHeight: 1.6,
  },
  checkIcon: {
    fontSize: '1rem',
    color: '#16a34a',
    marginTop: '2px',
  },

  // Participation Note
  participationNote: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '20px',
  },
  participationNoteTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '8px',
  },
  participationNoteText: {
    fontSize: '0.9rem',
    color: '#78350f',
    lineHeight: 1.6,
    margin: 0,
  },

  // Boundary Grid
  boundaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  boundaryProvide: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    padding: '24px',
  },
  boundaryNotProvide: {
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    padding: '24px',
  },
  boundaryTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  boundaryIconCheck: {
    color: '#16a34a',
  },
  boundaryIconX: {
    color: '#dc2626',
  },
  boundaryList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '0.95rem',
    lineHeight: 1.8,
  },
  boundaryNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    textAlign: 'center',
  },

  // Next Step
  nextStep: {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '40px 32px',
    textAlign: 'center',
    marginBottom: '40px',
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
    marginBottom: '8px',
  },
  nextStepSubtext: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: '24px',
  },
  ctaGroup: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
  ctaSecondary: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    border: '1px solid rgba(255, 255, 255, 0.3)',
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
    marginBottom: '8px',
  },
  footerNote: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
    fontStyle: 'italic',
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
