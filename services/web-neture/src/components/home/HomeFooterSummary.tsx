/**
 * HomeFooterSummary - Footer Summary Section
 * 정체성 재확인 + 기억에 남기기
 */

export function HomeFooterSummary() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <p style={styles.summary}>
          Neture는
          <br />
          공급자의 상품과 콘텐츠를
          <br />
          사업자가 안전하게 활용하도록 연결하는
          <br />
          <strong>B2B 플랫폼</strong>입니다.
        </p>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#0f172a',
    padding: '60px 20px',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center',
  },
  summary: {
    fontSize: '18px',
    color: '#e2e8f0',
    lineHeight: 1.8,
    margin: 0,
  },
};
