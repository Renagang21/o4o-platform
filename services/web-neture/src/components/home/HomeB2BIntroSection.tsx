/**
 * HomeB2BIntroSection - 사업자를 위한 B2B 허브
 * "여긴 판매몰이 아니다"를 명확히
 */

export function HomeB2BIntroSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <span style={styles.icon}>🏢</span>
        <h2 style={styles.title}>사업자를 위한 B2B 허브</h2>
        <p style={styles.description}>
          Neture는
          <br />
          서비스 참여 여부와 무관하게,
          <br />
          사업자라면 누구나 활용할 수 있는
          <br />
          B2B 조달과 연결의 공간입니다.
        </p>
        <p style={styles.note}>
          ※ 소비자 대상 판매 플랫폼이 아닙니다.
        </p>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#f8fafc',
    padding: '80px 20px',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 20px 0',
  },
  description: {
    fontSize: '16px',
    color: '#475569',
    lineHeight: 1.8,
    margin: '0 0 24px 0',
  },
  note: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
};
