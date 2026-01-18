/**
 * SellerOverviewByIndustry - 업종별 판매자 안내 페이지
 *
 * WO-NETURE-O4O-SELLER-ENABLEMENT-MASTER-V1 > Track B
 * - /seller/overview/pharmacy (약국)
 * - /seller/overview/beauty (미용실·헬스장)
 * - /seller/overview/market (전통시장)
 *
 * IA 7개 섹션 100% 동일, 변경 허용 영역:
 * - [2] 대상 설명
 * - [6] 참여 예시
 */

import { Link } from 'react-router-dom';

export type IndustryType = 'pharmacy' | 'beauty' | 'market';

interface IndustryConfig {
  id: IndustryType;
  label: string;
  targetDescription: string[];
  targetNote: string;
  examples: {
    title: string;
    items: string[];
  }[];
}

const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
  pharmacy: {
    id: 'pharmacy',
    label: '약국',
    targetDescription: [
      '지역 내에서 약국을 운영하는 약사님',
      '대기 시간이 있는 조제 약국',
      '건강기능식품, 의약외품 등 다양한 상품을 취급하는 약국',
    ],
    targetNote: '이 문서는 약국 운영 방식을 바꾸라는 제안서가 아닙니다.',
    examples: [
      {
        title: '대기 공간 활용',
        items: [
          '조제 대기 시간 동안 정보 제공',
          '기존 TV/디스플레이 활용',
        ],
      },
      {
        title: '건강 정보 연결',
        items: [
          '건강기능식품 정보 안내',
          '지역 건강 서비스 연계',
        ],
      },
      {
        title: '신뢰 기반 참여',
        items: [
          '약국의 전문성 유지',
          '고객 신뢰를 해치지 않는 범위',
        ],
      },
    ],
  },
  beauty: {
    id: 'beauty',
    label: '미용실·헬스장',
    targetDescription: [
      '미용실, 헬스장, 네일샵 등 뷰티·웰니스 매장을 운영하시는 분',
      '고객이 일정 시간 머무는 공간을 가진 매장',
      '시술/운동 대기 시간이 자연스럽게 발생하는 업종',
    ],
    targetNote: '이 문서는 매장 운영 방식을 바꾸라는 제안서가 아닙니다.',
    examples: [
      {
        title: '대기 공간 활용',
        items: [
          '시술 대기 시간 정보 제공',
          '휴게 공간 디스플레이 활용',
        ],
      },
      {
        title: '고객 접점 확대',
        items: [
          '뷰티/건강 관련 정보 연결',
          '매장 특성에 맞는 콘텐츠',
        ],
      },
      {
        title: '매장 정체성 유지',
        items: [
          '기존 서비스에 영향 없음',
          '자연스러운 참여 구조',
        ],
      },
    ],
  },
  market: {
    id: 'market',
    label: '전통시장',
    targetDescription: [
      '전통시장 안에서 점포를 운영하시는 상인 분',
      '시장 상인회 또는 조합에 소속된 개별 점포',
      '시장 전체 구조에 참여하고자 하는 매장',
    ],
    targetNote: '이 문서는 새로운 사업을 시작하라는 제안서가 아닙니다.',
    examples: [
      {
        title: '시장 운영 구조 참여',
        items: [
          '시장 전체 서비스에 자동 노출',
          '개별 등록/설정 부담 없음',
        ],
      },
      {
        title: '비용 없는 참여',
        items: [
          '추가 비용 없이 참여 가능',
          '시장 단위 운영으로 부담 분산',
        ],
      },
      {
        title: '점포 정체성 유지',
        items: [
          '기존 영업 방식 그대로',
          '점포 특성 반영 가능',
        ],
      },
    ],
  },
};

interface SellerOverviewByIndustryProps {
  industry: IndustryType;
}

export default function SellerOverviewByIndustry({ industry }: SellerOverviewByIndustryProps) {
  const config = INDUSTRY_CONFIGS[industry];

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
          <p style={styles.headerLabel}>{config.label}을 운영하는 사장님을 위한 안내</p>
          <h1 style={styles.headline}>
            o4o 플랫폼에서
            <br />
            매장은 '운영자'가 아니라
            <br />
            '참여자'입니다.
          </h1>
        </header>

        {/* [2] 이 문서는 누구를 위한 것인가 (업종별 커스텀) */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>이 문서는 누구를 위한 것인가</h2>
          <p style={styles.paragraph}>
            이 문서는 다음과 같은 {config.label}을 위한 안내입니다.
          </p>
          <ul style={styles.bulletList}>
            {config.targetDescription.map((desc, index) => (
              <li key={index} style={styles.bulletItem}>{desc}</li>
            ))}
          </ul>
          <p style={styles.note}>
            👉 {config.targetNote}
          </p>
        </section>

        {/* [3] o4o에서 '매장'의 위치 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>o4o에서 '매장'의 위치</h2>
          <p style={styles.paragraph}>
            o4o 플랫폼에서 매장은
            <br />
            비즈니스를 설계하거나 운영하는 주체가 아닙니다.
          </p>
          <p style={styles.emphasisBox}>
            <strong>
              매장은 이미 만들어진 구조에 참여하여
              <br />
              실제 판매와 고객 접점을 담당하는 주체
            </strong>
            입니다.
          </p>
          <ul style={styles.crossList}>
            <li style={styles.crossItem}>구조 설계: ❌</li>
            <li style={styles.crossItem}>시스템 운영: ❌</li>
            <li style={styles.crossItem}>복잡한 설정: ❌</li>
          </ul>
        </section>

        {/* [4] 매장이 하지 않아도 되는 것 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>매장이 하지 않아도 되는 것</h2>
          <p style={styles.paragraph}>
            다음과 같은 일은 매장이 직접 할 필요가 없습니다.
          </p>
          <ul style={styles.bulletList}>
            <li style={styles.bulletItem}>사업 구조 설계</li>
            <li style={styles.bulletItem}>화면 구성 기획</li>
            <li style={styles.bulletItem}>콘텐츠 전체 운영</li>
            <li style={styles.bulletItem}>시스템 관리</li>
          </ul>
          <p style={styles.note}>
            이 역할은 <strong>운영 주체와 플랫폼이 담당</strong>합니다.
          </p>
        </section>

        {/* [5] 매장이 하면 되는 것 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>매장이 하면 되는 것</h2>
          <p style={styles.paragraph}>
            매장은 다음에만 집중하면 됩니다.
          </p>
          <ul style={styles.checkList}>
            <li style={styles.checkItem}>지금 운영 중인 매장 유지</li>
            <li style={styles.checkItem}>참여 여부 선택</li>
            <li style={styles.checkItem}>고객과의 실제 접점 유지</li>
          </ul>
          <p style={styles.emphasisBox}>
            <strong>
              지금 하던 일을 크게 바꾸지 않아도
              <br />
              참여할 수 있는 구조입니다.
            </strong>
          </p>
        </section>

        {/* [6] 참여 예시 (업종별 커스텀) */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>참여 예시</h2>
          <div style={styles.exampleGrid}>
            {config.examples.map((example, index) => (
              <div key={index} style={styles.exampleCard}>
                <h3 style={styles.exampleTitle}>{example.title}</h3>
                <ul style={styles.exampleList}>
                  {example.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* [7] 다음 단계 */}
        <section style={styles.nextStep}>
          <h2 style={styles.nextStepTitle}>다음 단계</h2>
          <p style={styles.nextStepText}>
            이 구조가 <strong>내 매장에 맞을 수 있겠다</strong>고 느껴진다면,
          </p>
          <p style={styles.nextStepText}>
            👉 먼저 <strong>o4o 플랫폼 구조를 확인</strong>해 보시기 바랍니다.
            <br />
            구조를 이해한 뒤 참여 여부를 판단하셔도 늦지 않습니다.
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
        </footer>
      </div>

      {/* Print Styles */}
      <style>{printStyles}</style>
    </div>
  );
}

// 업종별 페이지 컴포넌트
export function SellerOverviewPharmacy() {
  return <SellerOverviewByIndustry industry="pharmacy" />;
}

export function SellerOverviewBeauty() {
  return <SellerOverviewByIndustry industry="beauty" />;
}

export function SellerOverviewMarket() {
  return <SellerOverviewByIndustry industry="market" />;
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
    listStyle: 'disc',
    paddingLeft: '24px',
    margin: '16px 0',
  },
  bulletItem: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '8px',
  },
  checkList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0',
  },
  checkItem: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '8px',
    paddingLeft: '28px',
    position: 'relative',
  },
  crossList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0',
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  crossItem: {
    fontSize: '0.95rem',
    color: '#64748b',
  },

  // Emphasis Box
  emphasisBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
    fontSize: '1rem',
    color: '#0f172a',
    lineHeight: 1.6,
    textAlign: 'center',
    margin: '16px 0',
  },

  // Note
  note: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginTop: '16px',
  },

  // Example Grid
  exampleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  exampleCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
  },
  exampleTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '12px',
  },
  exampleList: {
    listStyle: 'disc',
    paddingLeft: '20px',
    margin: 0,
    fontSize: '0.9rem',
    color: '#475569',
    lineHeight: 1.6,
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
