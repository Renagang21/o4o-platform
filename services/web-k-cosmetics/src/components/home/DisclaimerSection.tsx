/**
 * DisclaimerSection - 책임 고지 섹션
 * WO-KCOS-HOME-UI-V1
 *
 * 중요: "직접 판매 아님" 명확히 전달
 */

export function DisclaimerSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.notice}>
          <div style={styles.icon}>⚠️</div>
          <div style={styles.content}>
            <h3 style={styles.title}>중요 안내</h3>
            <p style={styles.text}>
              모든 구매 및 결제는 각 매장에서 직접 이루어집니다.
            </p>
            <p style={styles.text}>
              k-cosmetics.site는 판매자가 아닌 연결 플랫폼입니다.
            </p>
            <p style={styles.subText}>
              각 매장이 상품, 가격, 결제, 고객 서비스를 직접 담당합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#fff',
    padding: '48px 24px',
    borderTop: '1px solid #e9ecef',
  },
  container: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  notice: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
    backgroundColor: '#fff3e0',
    borderRadius: '12px',
    border: '1px solid #ffcc80',
  },
  icon: {
    fontSize: '28px',
    flexShrink: 0,
  },
  content: {},
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e65100',
    margin: '0 0 12px 0',
  },
  text: {
    fontSize: '14px',
    color: '#1a1a1a',
    margin: '0 0 4px 0',
    lineHeight: 1.6,
  },
  subText: {
    fontSize: '13px',
    color: '#666',
    margin: '8px 0 0 0',
    lineHeight: 1.5,
  },
};
