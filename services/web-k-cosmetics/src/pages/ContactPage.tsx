/**
 * ContactPage - 문의
 * WO-KCOS-HOME-UI-V1
 */

export function ContactPage() {
  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.title}>문의</h1>
        <p style={styles.subtitle}>
          궁금한 점이 있으시면 연락해 주세요
        </p>
      </div>

      <div style={styles.container}>
        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>일반 문의</h3>
            <p style={styles.cardDesc}>
              플랫폼 이용 및 서비스에 관한 일반 문의
            </p>
            <div style={styles.contactInfo}>
              <p><strong>이메일:</strong> info@k-cosmetics.site</p>
              <p><strong>전화:</strong> 1577-2779</p>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>파트너 문의</h3>
            <p style={styles.cardDesc}>
              매장 파트너 가입 및 제휴 관련 문의
            </p>
            <div style={styles.contactInfo}>
              <p><strong>이메일:</strong> partner@k-cosmetics.site</p>
              <p><strong>전화:</strong> 1577-2779</p>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>관광객/가이드 문의</h3>
            <p style={styles.cardDesc}>
              단체 관광 및 가이드 파트너십 문의
            </p>
            <div style={styles.contactInfo}>
              <p><strong>이메일:</strong> tour@k-cosmetics.site</p>
              <p><strong>전화:</strong> 1577-2779</p>
            </div>
          </div>
        </div>

        <div style={styles.notice}>
          <h3 style={styles.noticeTitle}>안내사항</h3>
          <p style={styles.noticeText}>
            개별 매장의 상품, 가격, 결제, 배송에 관한 문의는 해당 매장에 직접 연락해 주세요.
          </p>
          <p style={styles.noticeText}>
            K-Cosmetics.site는 매장 정보 제공 플랫폼이며, 직접 판매를 하지 않습니다.
          </p>
        </div>

        <div style={styles.companySection}>
          <h3 style={styles.companyTitle}>운영 회사 정보</h3>
          <div style={styles.companyInfo}>
            <p>㈜쓰리라이프존</p>
            <p>사업자등록번호: 108-86-02873</p>
            <p>서울시 강남구</p>
          </div>
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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '28px',
    border: '1px solid #e9ecef',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
  },
  contactInfo: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#333',
    lineHeight: 1.8,
  },
  notice: {
    backgroundColor: '#fff3e0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #ffcc80',
  },
  noticeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e65100',
    margin: '0 0 12px 0',
  },
  noticeText: {
    fontSize: '14px',
    color: '#333',
    margin: '0 0 8px 0',
    lineHeight: 1.6,
  },
  companySection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e9ecef',
    textAlign: 'center',
  },
  companyTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#666',
    margin: '0 0 12px 0',
  },
  companyInfo: {
    fontSize: '13px',
    color: '#999',
    lineHeight: 1.8,
  },
};
