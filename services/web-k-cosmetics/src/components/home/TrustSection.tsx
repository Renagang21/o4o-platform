/**
 * TrustSection - 신뢰 요소 섹션
 * WO-KCOS-HOME-UI-V1
 */

interface TrustItem {
  icon: string;
  title: string;
  description: string;
}

const trustItems: TrustItem[] = [
  {
    icon: '✓',
    title: '검증된 매장',
    description: '플랫폼 기준을 충족한 매장만 등록됩니다',
  },
  {
    icon: '✓',
    title: '정품 보장',
    description: '공식 유통 제품만 취급하는 매장입니다',
  },
  {
    icon: '✓',
    title: '파트너 운영',
    description: '각 매장이 직접 운영하며 책임집니다',
  },
  {
    icon: '✓',
    title: '플랫폼 관리',
    description: '지속적인 품질 관리 기준을 적용합니다',
  },
];

export function TrustSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.grid}>
          {trustItems.map((item, index) => (
            <div key={index} style={styles.item}>
              <span style={styles.icon}>{item.icon}</span>
              <div style={styles.content}>
                <h3 style={styles.title}>{item.title}</h3>
                <p style={styles.description}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#fff',
    padding: '48px 24px',
    borderBottom: '1px solid #e9ecef',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  icon: {
    fontSize: '20px',
    color: '#2e7d32',
    fontWeight: 700,
    flexShrink: 0,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: '50%',
  },
  content: {},
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 4px 0',
  },
  description: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
};
