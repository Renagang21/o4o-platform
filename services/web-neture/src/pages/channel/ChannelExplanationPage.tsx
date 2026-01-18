/**
 * ChannelExplanationPage - 업종별 채널 구조 설명 페이지 (통합 컴포넌트)
 *
 * WO-O4O-DENTAL-CHANNEL-STRUCTURE-EXPLANATION-V1: 치과
 * WO-O4O-PHARMACY-CHANNEL-STRUCTURE-EXPLANATION-V1: 약국
 * WO-O4O-OPTICAL-CHANNEL-STRUCTURE-EXPLANATION-V1: 안경원
 *
 * 공통 구조:
 * - 채널 주도권은 해당 업종에 있음
 * - 운영자는 지원자 역할
 * - QR은 연결 통로 (판매 유도 수단 아님)
 * - 톤: 중립적 설명체 (판매/광고 프레이밍 금지)
 */

import { Link } from 'react-router-dom';

interface IndustryConfig {
  id: string;
  name: string;
  nameShort: string;
  target: string;
  tvRole: string;
  supportExamples: {
    video: string;
    playlist: string;
    asset: string;
  };
  dontDoExamples: string[];
  doExamples: string[];
}

const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  dental: {
    id: 'dental',
    name: '치과',
    nameShort: '치과',
    target: '치과 원장, 치과 실무 운영자, 치과 네트워크 관계자',
    tvRole: '치과의 신뢰를 해치지 않는 정보 전달 채널',
    supportExamples: {
      video: '치과에서 활용 가능한 영상 자료',
      playlist: '구강 건강, 치료 안내 등 주제별 목록',
      asset: '필요에 따라 선택 가능한 개별 영상',
    },
    dontDoExamples: [
      '시스템 개발·관리',
      '영상 제작 책임',
      '외부 주체와의 복잡한 조율',
    ],
    doExamples: [
      '채널 사용 여부 결정',
      '콘텐츠 선택 및 편집',
      '참여 / 중단 결정',
    ],
  },
  pharmacy: {
    id: 'pharmacy',
    name: '약국',
    nameShort: '약국',
    target: '약국 원장, 약국 실무 운영자, 약사회 관계자',
    tvRole: '약국의 신뢰를 해치지 않는 정보 전달 채널',
    supportExamples: {
      video: '약국에서 활용 가능한 영상 자료',
      playlist: '건강 정보, 복약 안내 등 주제별 목록',
      asset: '필요에 따라 선택 가능한 개별 영상',
    },
    dontDoExamples: [
      '시스템 개발·관리',
      '영상 제작 책임',
      '외부 주체와의 복잡한 조율',
    ],
    doExamples: [
      '채널 사용 여부 결정',
      '콘텐츠 선택 및 편집',
      '참여 / 중단 결정',
    ],
  },
  optical: {
    id: 'optical',
    name: '안경원',
    nameShort: '안경원',
    target: '안경원 원장, 안경원 실무 운영자, 안경사협회 관계자',
    tvRole: '안경원의 신뢰를 해치지 않는 정보 전달 채널',
    supportExamples: {
      video: '안경원에서 활용 가능한 영상 자료',
      playlist: '시력 관리, 렌즈 안내 등 주제별 목록',
      asset: '필요에 따라 선택 가능한 개별 영상',
    },
    dontDoExamples: [
      '시스템 개발·관리',
      '영상 제작 책임',
      '외부 주체와의 복잡한 조율',
    ],
    doExamples: [
      '채널 사용 여부 결정',
      '콘텐츠 선택 및 편집',
      '참여 / 중단 결정',
    ],
  },
  medical: {
    id: 'medical',
    name: '의료기관',
    nameShort: '의료기관',
    target: '병원장, 의료기관 운영자, 의료 네트워크 관계자',
    tvRole: '의료기관의 신뢰를 해치지 않는 정보 전달 채널',
    supportExamples: {
      video: '의료기관에서 활용 가능한 영상 자료',
      playlist: '건강 정보, 진료 안내 등 주제별 목록',
      asset: '필요에 따라 선택 가능한 개별 영상',
    },
    dontDoExamples: [
      '시스템 개발·관리',
      '영상 제작 책임',
      '외부 주체와의 복잡한 조율',
    ],
    doExamples: [
      '채널 사용 여부 결정',
      '콘텐츠 선택 및 편집',
      '참여 / 중단 결정',
    ],
  },
};

interface ChannelExplanationPageProps {
  industryId: 'dental' | 'pharmacy' | 'optical' | 'medical';
}

export default function ChannelExplanationPage({ industryId }: ChannelExplanationPageProps) {
  const config = INDUSTRY_CONFIGS[industryId];

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

        {/* [1] 헤드라인 */}
        <header style={styles.header}>
          <p style={styles.headerLabel}>{config.name}을 위한 채널 구조 안내</p>
          <h1 style={styles.headline}>
            채널의 주도권은
            <br />
            {config.nameShort}에 있습니다.
          </h1>
          <p style={styles.headerSubtext}>
            이 문서는 o4o 기반 채널 구조가 {config.nameShort}의 신뢰와 통제권을
            <br />
            어떻게 유지하는지 설명합니다.
          </p>
        </header>

        {/* [2] 핵심 원칙 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>핵심 원칙</h2>
          <div style={styles.principleGrid}>
            <div style={styles.principleCard}>
              <div style={styles.principleIcon}>🎛️</div>
              <h3 style={styles.principleTitle}>채널 주도권</h3>
              <p style={styles.principleText}>
                {config.nameShort}이 사용하는 TV·디지털 채널의 주도권은 {config.nameShort}에 있습니다.
                무엇을 보여줄지, 사용할지 말지는 {config.nameShort}이 결정합니다.
              </p>
            </div>
            <div style={styles.principleCard}>
              <div style={styles.principleIcon}>🤝</div>
              <h3 style={styles.principleTitle}>운영자는 지원자</h3>
              <p style={styles.principleText}>
                운영자는 채널을 대신 운영하지 않습니다.
                콘텐츠를 지원하고, 선택과 편집은 {config.nameShort}이 합니다.
              </p>
            </div>
          </div>
        </section>

        {/* [3] 디지털 사이니지(TV)의 역할 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>디지털 사이니지(TV)의 역할</h2>
          <div style={styles.explanationBox}>
            <p style={styles.explanationText}>
              TV는 <strong>광고판이 아닙니다.</strong>
            </p>
            <p style={styles.explanationText}>
              {config.tvRole}로서,
              <br />
              {config.nameShort} 자체 콘텐츠가 중심이 됩니다.
            </p>
          </div>
          <ul style={styles.featureList}>
            <li style={styles.featureItem}>
              <span style={styles.featureIcon}>✔</span>
              <span>{config.nameShort}이 직접 선택한 콘텐츠만 표시</span>
            </li>
            <li style={styles.featureItem}>
              <span style={styles.featureIcon}>✔</span>
              <span>외부 광고가 {config.nameShort} 동의 없이 노출되지 않음</span>
            </li>
            <li style={styles.featureItem}>
              <span style={styles.featureIcon}>✔</span>
              <span>{config.nameShort}의 브랜드 정체성 유지</span>
            </li>
          </ul>
        </section>

        {/* [4] 운영자가 지원하는 것 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>운영자가 지원하는 것</h2>
          <div style={styles.supportGrid}>
            <div style={styles.supportCard}>
              <div style={styles.supportIcon}>🎬</div>
              <h3 style={styles.supportTitle}>동영상 콘텐츠</h3>
              <p style={styles.supportText}>{config.supportExamples.video}</p>
            </div>
            <div style={styles.supportCard}>
              <div style={styles.supportIcon}>📋</div>
              <h3 style={styles.supportTitle}>플레이리스트</h3>
              <p style={styles.supportText}>{config.supportExamples.playlist}</p>
            </div>
            <div style={styles.supportCard}>
              <div style={styles.supportIcon}>📁</div>
              <h3 style={styles.supportTitle}>개별 자료</h3>
              <p style={styles.supportText}>{config.supportExamples.asset}</p>
            </div>
          </div>
          <p style={styles.supportNote}>
            제공된 콘텐츠는 <strong>{config.nameShort}이 선택적으로 사용</strong>합니다.
            <br />
            사용 여부, 편집 여부 모두 {config.nameShort}의 결정입니다.
          </p>
        </section>

        {/* [5] 편집 구조 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>편집 구조</h2>
          <div style={styles.editBox}>
            <p style={styles.editText}>
              제공된 콘텐츠는 {config.nameShort} 운영자가
              <br />
              <strong>기술 지식 없이</strong>, <strong>직접</strong>
              <br />
              매장 운영자 대시보드 내 편집기를 통해
              <br />
              편집할 수 있습니다.
            </p>
          </div>
          <p style={styles.editNote}>
            콘텐츠는 지원, 선택과 편집은 {config.nameShort}
          </p>
        </section>

        {/* [6] QR 코드의 역할 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>QR 코드의 역할</h2>
          <div style={styles.qrExplanation}>
            <div style={styles.qrWrong}>
              <h3 style={styles.qrWrongTitle}>QR은 이런 것이 아닙니다</h3>
              <ul style={styles.qrWrongList}>
                <li>판매 유도 수단 ❌</li>
                <li>설명을 강요하는 도구 ❌</li>
                <li>외부 광고 연결 통로 ❌</li>
              </ul>
            </div>
            <div style={styles.qrRight}>
              <h3 style={styles.qrRightTitle}>QR의 실제 역할</h3>
              <p style={styles.qrRightText}>
                관심 있는 고객이
                <br />
                <strong>스스로 선택해 이동하는</strong>
                <br />
                연결 통로입니다.
              </p>
            </div>
          </div>
        </section>

        {/* [7] 하지 않아도 되는 것 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{config.nameShort}이 하지 않아도 되는 것</h2>
          <ul style={styles.dontList}>
            {config.dontDoExamples.map((item, index) => (
              <li key={index} style={styles.dontItem}>
                <span style={styles.dontIcon}>❌</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* [8] 역할 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{config.nameShort}의 역할</h2>
          <ul style={styles.doList}>
            {config.doExamples.map((item, index) => (
              <li key={index} style={styles.doItem}>
                <span style={styles.doIcon}>✔</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p style={styles.roleNote}>
            모든 결정권은 {config.nameShort}에 있습니다.
          </p>
        </section>

        {/* [9] 요약 */}
        <section style={styles.summarySection}>
          <h2 style={styles.summaryTitle}>요약</h2>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>채널 주도권</span>
              <span style={styles.summaryValue}>{config.nameShort}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>운영자 역할</span>
              <span style={styles.summaryValue}>지원</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>콘텐츠 선택</span>
              <span style={styles.summaryValue}>{config.nameShort}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>편집 권한</span>
              <span style={styles.summaryValue}>{config.nameShort}</span>
            </div>
          </div>
        </section>

        {/* [10] 다음 단계 */}
        <section style={styles.nextStep} className="no-print">
          <h2 style={styles.nextStepTitle}>더 알아보기</h2>
          <p style={styles.nextStepText}>
            o4o 플랫폼의 전체 구조와 참여 방식을 확인하세요.
          </p>
          <Link to="/o4o" style={styles.ctaButton}>
            o4o 플랫폼 소개 보기
          </Link>
        </section>

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

// Export industry-specific components
export function PharmacyChannelExplanationPage() {
  return <ChannelExplanationPage industryId="pharmacy" />;
}

export function OpticalChannelExplanationPage() {
  return <ChannelExplanationPage industryId="optical" />;
}

export function MedicalChannelExplanationPage() {
  return <ChannelExplanationPage industryId="medical" />;
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
    lineHeight: 1.6,
    margin: 0,
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
    margin: '8px 0',
  },

  // Feature List
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '12px',
  },
  featureIcon: {
    fontSize: '1rem',
    color: '#16a34a',
  },

  // Support Grid
  supportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  supportCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  },
  supportIcon: {
    fontSize: '1.5rem',
    marginBottom: '8px',
  },
  supportTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '4px',
  },
  supportText: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: 0,
  },
  supportNote: {
    fontSize: '0.95rem',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 1.6,
  },

  // Edit Box
  editBox: {
    backgroundColor: '#fefce8',
    border: '1px solid #fde047',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  editText: {
    fontSize: '1rem',
    color: '#0f172a',
    lineHeight: 1.8,
    margin: 0,
  },
  editNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // QR Explanation
  qrExplanation: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  qrWrong: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '20px',
  },
  qrWrongTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#dc2626',
    marginBottom: '12px',
  },
  qrWrongList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '0.9rem',
    color: '#7f1d1d',
    lineHeight: 1.8,
  },
  qrRight: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '20px',
  },
  qrRightTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#16a34a',
    marginBottom: '12px',
  },
  qrRightText: {
    fontSize: '0.95rem',
    color: '#166534',
    lineHeight: 1.6,
    margin: 0,
  },

  // Don't List
  dontList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 16px 0',
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
    margin: '0 0 16px 0',
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
  roleNote: {
    fontSize: '0.9rem',
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Summary Section
  summarySection: {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '40px',
  },
  summaryTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '20px',
    textAlign: 'center',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px 16px',
  },
  summaryLabel: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryValue: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#fff',
  },

  // Next Step
  nextStep: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  nextStepTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '12px',
  },
  nextStepText: {
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '20px',
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
