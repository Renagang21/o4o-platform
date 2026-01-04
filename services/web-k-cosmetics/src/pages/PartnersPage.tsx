/**
 * PartnersPage - 파트너 안내
 * WO-KCOS-HOME-UI-V1
 */

export function PartnersPage() {
  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.title}>파트너 안내</h1>
        <p style={styles.subtitle}>
          K-Cosmetics 네트워크와 함께하세요
        </p>
      </div>

      <div style={styles.container}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>파트너 매장이 되면</h2>
          <div style={styles.benefitGrid}>
            <div style={styles.benefit}>
              <span style={styles.benefitIcon}>🌐</span>
              <h3 style={styles.benefitTitle}>글로벌 노출</h3>
              <p style={styles.benefitDesc}>
                전 세계 K-Beauty 관심 고객에게 매장이 노출됩니다
              </p>
            </div>
            <div style={styles.benefit}>
              <span style={styles.benefitIcon}>✓</span>
              <h3 style={styles.benefitTitle}>Verified 배지</h3>
              <p style={styles.benefitDesc}>
                검증된 매장임을 알리는 공식 배지를 받습니다
              </p>
            </div>
            <div style={styles.benefit}>
              <span style={styles.benefitIcon}>👥</span>
              <h3 style={styles.benefitTitle}>관광객 연결</h3>
              <p style={styles.benefitDesc}>
                관광객 및 가이드 파트너와 연결됩니다
              </p>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>가입 조건</h2>
          <ul style={styles.conditionList}>
            <li>정식 사업자 등록된 화장품 판매업체</li>
            <li>오프라인 매장 운영 중</li>
            <li>정품 화장품만 취급</li>
            <li>기본 고객 서비스 제공 가능</li>
          </ul>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>가입 문의</h2>
          <p style={styles.contactText}>
            파트너 가입에 관심이 있으시면 아래로 연락해 주세요.
          </p>
          <div style={styles.contactInfo}>
            <p><strong>이메일:</strong> partner@k-cosmetics.site</p>
            <p><strong>전화:</strong> 1577-2779</p>
          </div>
        </section>

        <div style={styles.disclaimer}>
          <p>
            K-Cosmetics는 매장 정보 제공 플랫폼입니다.
            모든 상품 판매 및 결제는 각 파트너 매장에서 직접 이루어집니다.
          </p>
        </div>
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
    margin: '0 0 24px 0',
  },
  benefitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  benefit: {
    textAlign: 'center',
  },
  benefitIcon: {
    display: 'inline-block',
    fontSize: '32px',
    marginBottom: '12px',
  },
  benefitTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  benefitDesc: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
  conditionList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#333',
    fontSize: '15px',
    lineHeight: 2,
  },
  contactText: {
    fontSize: '15px',
    color: '#333',
    margin: '0 0 16px 0',
  },
  contactInfo: {
    backgroundColor: '#f8f9fa',
    padding: '16px 20px',
    borderRadius: '8px',
    fontSize: '15px',
    color: '#333',
  },
  disclaimer: {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#fff3e0',
    borderRadius: '12px',
    border: '1px solid #ffcc80',
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.6,
  },
};
