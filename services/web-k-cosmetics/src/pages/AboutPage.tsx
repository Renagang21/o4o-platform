/**
 * AboutPage - 플랫폼 소개
 * WO-KCOS-HOME-UI-V1
 */

export function AboutPage() {
  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.title}>플랫폼 소개</h1>
        <p style={styles.subtitle}>
          K-Cosmetics Distribution Network
        </p>
      </div>

      <div style={styles.container}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>우리는 누구인가</h2>
          <p style={styles.text}>
            K-Cosmetics Distribution Network는 검증된 국내 화장품 매장을 연결하는 플랫폼입니다.
          </p>
          <p style={styles.text}>
            한국 화장품(K-Beauty)의 가치를 전 세계에 알리고,
            소비자가 신뢰할 수 있는 매장에서 정품 화장품을 구매할 수 있도록 돕습니다.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>우리의 역할</h2>
          <div style={styles.roleGrid}>
            <div style={styles.role}>
              <h3 style={styles.roleTitle}>매장 검증</h3>
              <p style={styles.roleDesc}>
                플랫폼 기준에 따라 매장을 검증하고 Verified 배지를 부여합니다
              </p>
            </div>
            <div style={styles.role}>
              <h3 style={styles.roleTitle}>정보 제공</h3>
              <p style={styles.roleDesc}>
                소비자에게 매장 정보, 위치, 서비스 안내를 제공합니다
              </p>
            </div>
            <div style={styles.role}>
              <h3 style={styles.roleTitle}>연결</h3>
              <p style={styles.roleDesc}>
                소비자와 매장을 연결하여 K-Beauty 경험을 돕습니다
              </p>
            </div>
          </div>
        </section>

        <section style={styles.noticeSection}>
          <h2 style={styles.noticeTitle}>중요 안내</h2>
          <div style={styles.noticeContent}>
            <p style={styles.noticeText}>
              K-Cosmetics.site는 <strong>직접 판매를 하지 않습니다.</strong>
            </p>
            <p style={styles.noticeText}>
              모든 구매 및 결제는 각 파트너 매장에서 직접 이루어지며,
              상품, 가격, 결제, 고객 서비스는 해당 매장이 담당합니다.
            </p>
            <p style={styles.noticeText}>
              플랫폼은 매장 정보 제공 및 연결 역할만 수행합니다.
            </p>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>운영 회사</h2>
          <div style={styles.companyInfo}>
            <p><strong>회사명:</strong> ㈜쓰리라이프존</p>
            <p><strong>사업자등록번호:</strong> 108-86-02873</p>
            <p><strong>대표:</strong> 대표자명</p>
            <p><strong>주소:</strong> 서울시 강남구</p>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  hero: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '64px 24px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#aaa',
    margin: 0,
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '24px',
    border: '1px solid #e9ecef',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 20px 0',
  },
  text: {
    fontSize: '15px',
    color: '#333',
    lineHeight: 1.8,
    margin: '0 0 16px 0',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  role: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  roleTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  roleDesc: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
  noticeSection: {
    backgroundColor: '#fff3e0',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '24px',
    border: '1px solid #ffcc80',
  },
  noticeTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e65100',
    margin: '0 0 20px 0',
  },
  noticeContent: {},
  noticeText: {
    fontSize: '15px',
    color: '#333',
    lineHeight: 1.8,
    margin: '0 0 12px 0',
  },
  companyInfo: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#333',
    lineHeight: 2,
  },
};
