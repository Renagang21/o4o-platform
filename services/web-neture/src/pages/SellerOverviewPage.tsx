/**
 * SellerOverviewPage - 판매자(매장) 전용 1페이지 요약
 *
 * WO-NETURE-SELLER-OVERVIEW-PAGE-V1
 * WO-NETURE-SELLER-OVERVIEW-PAGE-V2: 무재고 판매 컨셉 추가
 * - /seller/overview 경로
 * - 대상: 각 매장 단위 판매자(점주)
 * - 용도: 현장 설득 / 링크 공유 / 출력
 * - 목표: "이건 내가 할 일인가?"를 1분 안에 판단
 *
 * IA:
 * [1] 헤드라인
 * [2] 이 문서는 누구를 위한 것인가
 * [3] o4o에서 '매장'의 위치
 * [4] 매장이 하지 않아도 되는 것
 * [5] 매장이 하면 되는 것
 * [6] 무재고 판매 구조 (NEW)
 * [7] 참여 예시 (3)
 * [8] 다음 단계
 */

import { Link } from 'react-router-dom';

export default function SellerOverviewPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Print Button (화면에서만 표시) */}
        <div style={styles.printButtonWrapper} className="no-print">
          <button onClick={handlePrint} style={styles.printButton}>
            PDF로 저장 / 인쇄
          </button>
        </div>

        {/* [1] 헤드라인 */}
        <header style={styles.header}>
          <p style={styles.headerLabel}>매장을 운영하는 사장님을 위한 안내</p>
          <h1 style={styles.headline}>
            o4o 플랫폼에서
            <br />
            매장은 '운영자'가 아니라
            <br />
            '참여자'입니다.
          </h1>
        </header>

        {/* [2] 이 문서는 누구를 위한 것인가 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>이 문서는 누구를 위한 것인가</h2>
          <p style={styles.paragraph}>
            이 문서는 다음과 같은 매장을 위한 안내입니다.
          </p>
          <ul style={styles.bulletList}>
            <li style={styles.bulletItem}>전통시장 안에서 점포를 운영하는 매장</li>
            <li style={styles.bulletItem}>
              미용실, 헬스장, 약국처럼
              <br />
              <strong>고객이 머무는 공간을 가진 매장</strong>
            </li>
            <li style={styles.bulletItem}>
              매장 운영은 안정적이지만
              <br />
              새로운 홍보·판매 방식은 부담스러운 경우
            </li>
          </ul>
          <p style={styles.note}>
            👉 이 문서는 <strong>사업을 새로 시작하라는 제안서가 아닙니다.</strong>
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

        {/* [6] 무재고 판매 구조 (WO-NETURE-SELLER-OVERVIEW-PAGE-V2) */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>무재고 판매 구조</h2>
          <p style={styles.paragraph}>
            매장은 재고를 보유하지 않아도 판매에 참여할 수 있습니다.
          </p>
          <div style={styles.noInventoryGrid}>
            <div style={styles.noInventoryCard}>
              <div style={styles.noInventoryIcon}>📦</div>
              <h3 style={styles.noInventoryTitle}>재고 부담 없음</h3>
              <p style={styles.noInventoryText}>
                창고, 보관, 재고 관리가 필요 없습니다.
              </p>
            </div>
            <div style={styles.noInventoryCard}>
              <div style={styles.noInventoryIcon}>🚚</div>
              <h3 style={styles.noInventoryTitle}>배송 부담 없음</h3>
              <p style={styles.noInventoryText}>
                포장, 배송 처리는 공급사가 담당합니다.
              </p>
            </div>
            <div style={styles.noInventoryCard}>
              <div style={styles.noInventoryIcon}>✅</div>
              <h3 style={styles.noInventoryTitle}>취급만 선택</h3>
              <p style={styles.noInventoryText}>
                어떤 상품을 노출할지만 결정하면 됩니다.
              </p>
            </div>
          </div>
          <p style={styles.note}>
            👉 <strong>매장은 채널을 소유하고, 노출을 결정합니다.</strong>
            <br />
            실제 판매와 배송은 구조가 처리합니다.
          </p>
        </section>

        {/* [7] 참여 예시 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>참여 예시</h2>
          <div style={styles.exampleGrid}>
            <div style={styles.exampleCard}>
              <h3 style={styles.exampleTitle}>전통시장 내 개별 점포</h3>
              <ul style={styles.exampleList}>
                <li>시장 운영 구조에 참여</li>
                <li>추가 비용 없이 노출 기회 확보</li>
              </ul>
            </div>
            <div style={styles.exampleCard}>
              <h3 style={styles.exampleTitle}>미용실 · 헬스장 · 약국</h3>
              <ul style={styles.exampleList}>
                <li>대기 시간, TV 화면 등 기존 공간 활용</li>
                <li>매장 성격을 해치지 않는 참여</li>
              </ul>
            </div>
            <div style={styles.exampleCard}>
              <h3 style={styles.exampleTitle}>전문 매장</h3>
              <ul style={styles.exampleList}>
                <li>매장 정체성 유지</li>
                <li>새로운 홍보·판매 접점 확보</li>
              </ul>
            </div>
          </div>
        </section>

        {/* [8] 다음 단계 */}
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
    lineHeight: 1.7,
  },

  // No-Inventory Grid (WO-NETURE-SELLER-OVERVIEW-PAGE-V2)
  noInventoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '16px',
    marginBottom: '20px',
  },
  noInventoryCard: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  noInventoryIcon: {
    fontSize: '2rem',
    marginBottom: '12px',
  },
  noInventoryTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '8px',
  },
  noInventoryText: {
    fontSize: '0.9rem',
    color: '#475569',
    lineHeight: 1.5,
    margin: 0,
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
