/**
 * ChannelSalesStructurePage - o4o 기반 채널·판매 구조 통합 설명 페이지
 *
 * WO-O4O-CHANNEL-SALES-STRUCTURE-EXPLANATION-V1
 * - /channel/structure 경로
 * - 대상: 치과·약국·안경원·화장품 매장 운영자
 * - 목적: 채널 주도권 + 무재고 판매 구조 설명
 * - 톤: 중립적 설명체 (판매/광고 프레이밍 금지)
 *
 * 핵심 메시지:
 * - 채널의 주도권은 근무처·매장에 있음
 * - 운영자는 콘텐츠와 도구를 지원
 * - 판매 구조는 매장형 업종에서만 무재고로 선택 연결
 */

import { Link } from 'react-router-dom';

export default function ChannelSalesStructurePage() {
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

        {/* 헤드라인 */}
        <header style={styles.header}>
          <p style={styles.headerLabel}>o4o 기반 채널·판매 구조 안내</p>
          <h1 style={styles.headline}>
            채널의 주도권은
            <br />
            근무처·매장에 있습니다.
          </h1>
          <p style={styles.headerSubtext}>
            이 설명은 근무처·매장(치과·약국·안경원·화장품 매장)이
            <br />
            이미 사용하고 있는 채널을 주체적으로 활용하면서,
            <br />
            필요한 경우 구매·판매 구조를 선택적으로 연결할 수 있는 방식에 대한 안내입니다.
          </p>
        </header>

        {/* [1] 디지털 채널은 무엇이 되는가 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. 디지털 채널은 무엇이 되는가</h2>
          <p style={styles.paragraph}>
            대기 공간의 TV, 안내 화면, 태블릿 등은
            <br />
            광고판이 아니라 <strong>신뢰를 유지한 정보 채널</strong>입니다.
          </p>
          <ul style={styles.bulletList}>
            <li style={styles.bulletItem}>전달하고 싶은 정보</li>
            <li style={styles.bulletItem}>공간의 성격에 맞는 메시지</li>
            <li style={styles.bulletItem}>방문자에게 도움이 되는 콘텐츠</li>
          </ul>
          <p style={styles.emphasisText}>
            이 채널은 <strong>근무처·매장의 기준으로 정돈</strong>됩니다.
          </p>
        </section>

        {/* [2] 운영자(사업자)는 무엇을 지원하는가 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. 운영자(사업자)는 무엇을 지원하는가</h2>
          <p style={styles.paragraph}>
            운영자(사업자)는 채널을 대신 운영하지 않습니다.
            <br />
            <strong>선택에 필요한 재료와 도구를 지원</strong>합니다.
          </p>
          <div style={styles.supportGrid}>
            <div style={styles.supportCard}>
              <div style={styles.supportIcon}>🎬</div>
              <h3 style={styles.supportTitle}>동영상 콘텐츠</h3>
            </div>
            <div style={styles.supportCard}>
              <div style={styles.supportIcon}>📋</div>
              <h3 style={styles.supportTitle}>플레이리스트</h3>
            </div>
            <div style={styles.supportCard}>
              <div style={styles.supportIcon}>📁</div>
              <h3 style={styles.supportTitle}>개별 자료</h3>
            </div>
            <div style={styles.supportCard}>
              <div style={styles.supportIcon}>🛠️</div>
              <h3 style={styles.supportTitle}>편집 도구</h3>
            </div>
          </div>
          <div style={styles.noteBox}>
            콘텐츠는 지원되고, 선택과 편집은 근무처·매장이 합니다.
          </div>
        </section>

        {/* [3] 편집은 어떻게 이루어지는가 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. 편집은 어떻게 이루어지는가</h2>
          <p style={styles.paragraph}>
            근무처·매장 운영자는 별도의 기술 지식 없이도,
          </p>
          <ul style={styles.checkList}>
            <li style={styles.checkItem}>
              <span style={styles.checkIcon}>✔</span>
              <span>제공된 동영상과 목록을 조합하고</span>
            </li>
            <li style={styles.checkItem}>
              <span style={styles.checkIcon}>✔</span>
              <span>보여줄 순서와 구성을 직접 정하며</span>
            </li>
            <li style={styles.checkItem}>
              <span style={styles.checkIcon}>✔</span>
              <span>언제든 변경·중단을 선택할 수 있습니다.</span>
            </li>
          </ul>
          <div style={styles.noteBox}>
            채널의 최종 결정권은 근무처·매장에 있습니다.
          </div>
        </section>

        {/* [4] QR 코드는 어떤 역할을 하는가 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. QR 코드는 어떤 역할을 하는가</h2>
          <p style={styles.paragraph}>
            TV와 안내 화면은 <strong>관심의 시작점</strong>입니다.
            <br />
            QR 코드는 <strong>선택적인 연결 통로</strong>입니다.
          </p>
          <div style={styles.qrGrid}>
            <div style={styles.qrWrong}>
              <ul style={styles.qrWrongList}>
                <li>구매를 강요하지 않습니다 ❌</li>
                <li>설명을 대신하지 않습니다 ❌</li>
              </ul>
            </div>
            <div style={styles.qrRight}>
              <p style={styles.qrRightText}>
                관심 있는 사람만
                <br />
                <strong>스스로 이동</strong>합니다 ✔
              </p>
            </div>
          </div>
          <div style={styles.noteBox}>
            신뢰를 해치지 않는 연결 방식입니다.
          </div>
        </section>

        {/* [5] 매장형 업종에서 가능한 구매·판매 구조 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. 매장형 업종에서 가능한 구매·판매 구조</h2>
          <p style={styles.sectionSubtitle}>(약국·안경원·화장품 매장)</p>
          <p style={styles.paragraph}>
            근무처·매장이 <strong>매장형 업종</strong>인 경우,
            <br />
            정보 채널 활용에 더해 <strong>판매 구조를 선택적으로 연결</strong>할 수 있습니다.
          </p>
          <div style={styles.salesGrid}>
            <div style={styles.salesCard}>
              <h3 style={styles.salesCardTitle}>B2B 구매 (선택)</h3>
              <ul style={styles.salesCardList}>
                <li>매장 단위의 B2B 구매</li>
                <li>조건부 독점 또는 제한 구매 가능</li>
                <li><strong>구매 여부는 매장이 결정</strong></li>
              </ul>
            </div>
            <div style={styles.salesCard}>
              <h3 style={styles.salesCardTitle}>B2C 판매 (무재고)</h3>
              <ul style={styles.salesCardList}>
                <li>재고 보유 없이 판매</li>
                <li>보관·배송 부담 없음</li>
                <li><strong>취급과 노출만 매장이 선택</strong></li>
              </ul>
            </div>
          </div>
          <div style={styles.highlightBox}>
            무재고 판매를 기본 전제로 합니다.
          </div>
        </section>

        {/* [6] 주문 접점은 어디에 있는가 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>6. 주문 접점은 어디에 있는가</h2>
          <p style={styles.paragraph}>
            동일한 구조를 다음 접점에서 활용할 수 있습니다.
          </p>
          <div style={styles.touchpointGrid}>
            <div style={styles.touchpointItem}>📺 TV</div>
            <div style={styles.touchpointItem}>🖥️ 키오스크</div>
            <div style={styles.touchpointItem}>📱 태블릿</div>
            <div style={styles.touchpointItem}>📄 전단지</div>
            <div style={styles.touchpointItem}>📲 QR 코드</div>
          </div>
          <div style={styles.noteBox}>
            매장이 이미 가진 장비를 그대로 사용합니다.
          </div>
        </section>

        {/* [7] 업종별 예시 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>7. 업종별 예시</h2>
          <div style={styles.exampleGrid}>
            <div style={styles.exampleCard}>
              <h3 style={styles.exampleTitle}>🦷 치과</h3>
              <ul style={styles.exampleList}>
                <li>정보 채널 중심</li>
                <li>판매·구매 구조 미적용</li>
                <li><strong>신뢰 공간 유지</strong></li>
              </ul>
            </div>
            <div style={styles.exampleCard}>
              <h3 style={styles.exampleTitle}>💊 약국</h3>
              <ul style={styles.exampleList}>
                <li>정보 + 선택적 판매</li>
                <li>건강 관련 상품의 무재고 B2C</li>
                <li>QR로 자율적 주문</li>
              </ul>
            </div>
            <div style={styles.exampleCard}>
              <h3 style={styles.exampleTitle}>👓 안경원</h3>
              <ul style={styles.exampleList}>
                <li>정보 + 선택적 판매</li>
                <li>관리 용품·액세서리 무재고 판매</li>
                <li>진열 부담 최소화</li>
              </ul>
            </div>
            <div style={styles.exampleCard}>
              <h3 style={styles.exampleTitle}>💄 화장품 매장</h3>
              <ul style={styles.exampleList}>
                <li>체험은 오프라인</li>
                <li>주문은 QR로 연결</li>
                <li>색상·옵션은 온라인 선택</li>
              </ul>
            </div>
          </div>
          <div style={styles.noteBox}>
            체험 공간과 판매 구조를 분리합니다.
          </div>
        </section>

        {/* 요약 */}
        <section style={styles.summarySection}>
          <h2 style={styles.summaryTitle}>핵심 요약</h2>
          <p style={styles.summaryText}>
            근무처·매장은 <strong>채널의 주체</strong>로 남고,
            <br />
            운영자는 <strong>콘텐츠와 도구를 지원</strong>하며,
            <br />
            판매 구조는 매장형 업종에서만 <strong>무재고로 선택 연결</strong>됩니다.
          </p>
        </section>

        {/* 관계도 이미지 영역 (추후 이미지 삽입) */}
        <section style={styles.diagramSection} className="no-print">
          <h2 style={styles.diagramTitle}>구조 관계도</h2>
          <div style={styles.diagramPlaceholder}>
            <p style={styles.diagramPlaceholderText}>
              관계도 이미지가 이 위치에 들어갑니다.
              <br />
              (이미지 파일 준비 후 교체)
            </p>
          </div>
        </section>

        {/* 다음 단계 */}
        <section style={styles.nextStep} className="no-print">
          <h2 style={styles.nextStepTitle}>더 알아보기</h2>
          <div style={styles.nextStepLinks}>
            <Link to="/o4o" style={styles.ctaButton}>
              o4o 플랫폼 소개
            </Link>
            <Link to="/channel/dental" style={styles.ctaButtonSecondary}>
              치과 전용 안내
            </Link>
            <Link to="/channel/pharmacy" style={styles.ctaButtonSecondary}>
              약국 전용 안내
            </Link>
          </div>
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

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#fff',
    minHeight: '100vh',
  },
  container: {
    maxWidth: '800px',
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
    color: PRIMARY_COLOR,
    fontWeight: 600,
    marginBottom: '16px',
  },
  headline: {
    fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.4,
    margin: '0 0 20px 0',
  },
  headerSubtext: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: 1.7,
  },

  // Section
  section: {
    marginBottom: '48px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  sectionSubtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '12px',
    fontStyle: 'italic',
  },
  paragraph: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '16px',
  },
  emphasisText: {
    fontSize: '1rem',
    color: '#0f172a',
    lineHeight: 1.7,
    marginTop: '16px',
  },

  // Bullet List
  bulletList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0',
  },
  bulletItem: {
    fontSize: '1rem',
    color: '#334155',
    lineHeight: 1.6,
    marginBottom: '8px',
    paddingLeft: '20px',
    position: 'relative',
  },

  // Check List
  checkList: {
    listStyle: 'none',
    padding: 0,
    margin: '16px 0',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '12px',
  },
  checkIcon: {
    color: '#16a34a',
    flexShrink: 0,
  },

  // Support Grid
  supportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },

  // Note Box
  noteBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '0.95rem',
    color: '#0369a1',
    textAlign: 'center',
    fontWeight: 500,
  },

  // Highlight Box
  highlightBox: {
    backgroundColor: '#fefce8',
    border: '1px solid #fde047',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '1rem',
    color: '#854d0e',
    textAlign: 'center',
    fontWeight: 600,
    marginTop: '20px',
  },

  // QR Grid
  qrGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  qrWrong: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
  },
  qrWrongList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '0.9rem',
    color: '#991b1b',
    lineHeight: 1.8,
  },
  qrRight: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrRightText: {
    fontSize: '0.95rem',
    color: '#166534',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: 0,
  },

  // Sales Grid
  salesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  salesCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
  },
  salesCardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '12px',
  },
  salesCardList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '0.9rem',
    color: '#334155',
    lineHeight: 1.8,
  },

  // Touchpoint Grid
  touchpointGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  touchpointItem: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '0.95rem',
    color: '#334155',
  },

  // Example Grid
  exampleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  exampleCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
  },
  exampleTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '12px',
  },
  exampleList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '0.85rem',
    color: '#334155',
    lineHeight: 1.8,
  },

  // Summary Section
  summarySection: {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '40px',
    textAlign: 'center',
  },
  summaryTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '16px',
  },
  summaryText: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 1.8,
    margin: 0,
  },

  // Diagram Section
  diagramSection: {
    marginBottom: '40px',
  },
  diagramTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '16px',
    textAlign: 'center',
  },
  diagramPlaceholder: {
    backgroundColor: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
  },
  diagramPlaceholderText: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    lineHeight: 1.6,
    margin: 0,
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
    marginBottom: '20px',
  },
  nextStepLinks: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ctaButton: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
  ctaButtonSecondary: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    border: '1px solid #e2e8f0',
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
