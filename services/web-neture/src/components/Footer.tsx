export function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div>
            <p style={styles.company}>
              © 2026 ㈜쓰리라이프존 | 사업자등록번호 108-86-02873
            </p>
            <p style={styles.contact}>
              고객센터 1577-2779 | sohae2100@gmail.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e9ecef',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  company: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 4px 0',
  },
  contact: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
};
