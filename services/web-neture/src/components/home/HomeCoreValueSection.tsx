/**
 * HomeCoreValueSection - Neture가 하는 일
 * "무엇을 파는가"가 아니라 "무엇을 가능하게 하는가"
 */

interface CoreValue {
  icon: string;
  title: string;
  description: string;
}

const coreValues: CoreValue[] = [
  {
    icon: '📦',
    title: '상품 공급',
    description: '서비스와 무관하게\n사업자 간 B2B 상품을 공급합니다.',
  },
  {
    icon: '📚',
    title: '콘텐츠 유통',
    description: '제품 설명, 교육 자료,\n마케팅 콘텐츠를 함께 제공합니다.',
  },
  {
    icon: '🔗',
    title: '서비스 연계',
    description: 'Trial과 다양한 서비스로\n공급 범위를 확장할 수 있습니다.',
  },
  {
    icon: '🔒',
    title: '안전한 전달',
    description: '사업자 전용,\n자격 기반으로 안전하게 전달됩니다.',
  },
];

export function HomeCoreValueSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>Neture가 하는 일</h2>
        <div style={styles.grid}>
          {coreValues.map((value, index) => (
            <div key={index} style={styles.card}>
              <span style={styles.icon}>{value.icon}</span>
              <h3 style={styles.cardTitle}>{value.title}</h3>
              <p style={styles.cardDescription}>
                {value.description.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < value.description.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#fff',
    padding: '80px 20px',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: '48px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '28px 20px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  },
  icon: {
    fontSize: '36px',
    display: 'block',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: PRIMARY_COLOR,
    margin: '0 0 12px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
};
