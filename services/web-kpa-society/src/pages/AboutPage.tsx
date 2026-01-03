/**
 * 약사회 소개 페이지
 * Phase H8-FE: KPA Society Frontend
 */

export function AboutPage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>약사회 소개</h1>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>인사말</h2>
        <div style={styles.card}>
          <p style={styles.paragraph}>
            안녕하십니까. 약사회 홈페이지를 방문해 주셔서 감사합니다.
          </p>
          <p style={styles.paragraph}>
            약사회는 회원 약사들의 권익 보호와 국민 건강 증진을 위해
            최선을 다하고 있습니다. 앞으로도 약사 여러분과 함께
            더 나은 약사 사회를 만들어 나가겠습니다.
          </p>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>연혁</h2>
        <div style={styles.timeline}>
          <div style={styles.timelineItem}>
            <span style={styles.year}>2024</span>
            <span style={styles.event}>디지털 전환 서비스 시작</span>
          </div>
          <div style={styles.timelineItem}>
            <span style={styles.year}>2020</span>
            <span style={styles.event}>온라인 연수교육 시스템 도입</span>
          </div>
          <div style={styles.timelineItem}>
            <span style={styles.year}>2010</span>
            <span style={styles.event}>홈페이지 개편</span>
          </div>
          <div style={styles.timelineItem}>
            <span style={styles.year}>1953</span>
            <span style={styles.event}>약사회 창립</span>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>조직도</h2>
        <div style={styles.orgChart}>
          <div style={styles.orgLevel}>
            <div style={styles.orgBox}>회장</div>
          </div>
          <div style={styles.orgLevel}>
            <div style={styles.orgBox}>부회장</div>
            <div style={styles.orgBox}>감사</div>
          </div>
          <div style={styles.orgLevel}>
            <div style={styles.orgBox}>총무이사</div>
            <div style={styles.orgBox}>학술이사</div>
            <div style={styles.orgBox}>홍보이사</div>
          </div>
          <div style={styles.orgLevel}>
            <div style={styles.orgBox}>사무국</div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>오시는 길</h2>
        <div style={styles.card}>
          <p style={styles.contactInfo}>
            <strong>주소:</strong> 서울특별시 OO구 OO로 123
          </p>
          <p style={styles.contactInfo}>
            <strong>전화:</strong> 02-1234-5678
          </p>
          <p style={styles.contactInfo}>
            <strong>팩스:</strong> 02-1234-5679
          </p>
          <p style={styles.contactInfo}>
            <strong>이메일:</strong> info@kpa-society.kr
          </p>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '40px',
    textAlign: 'center',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #007bff',
  },
  card: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  paragraph: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#333',
    marginBottom: '12px',
  },
  timeline: {
    borderLeft: '3px solid #007bff',
    paddingLeft: '20px',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    position: 'relative',
  },
  year: {
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#007bff',
    minWidth: '60px',
  },
  event: {
    fontSize: '15px',
    color: '#333',
  },
  orgChart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  orgLevel: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  orgBox: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: '#fff',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  contactInfo: {
    fontSize: '15px',
    marginBottom: '8px',
    color: '#333',
  },
};
