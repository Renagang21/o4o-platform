/**
 * AudienceSection - 대상 사용자 섹션
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * - 약국 약사
 * - 병원 약사
 * - 산업 약사
 * - 기타 약사 직능
 */

const audiences = [
  {
    icon: '💊',
    title: '약국 약사',
    description: '지역약국에서 환자 상담과 조제 업무를 수행하는 약사',
  },
  {
    icon: '🏥',
    title: '병원 약사',
    description: '의료기관에서 임상약학 및 약물치료를 담당하는 약사',
  },
  {
    icon: '🔬',
    title: '산업 약사',
    description: '제약회사 및 연구기관에서 활동하는 약사',
  },
  {
    icon: '🎓',
    title: '기타 약사 직능',
    description: '학계, 공직, 기타 분야에서 활동하는 약사',
  },
];

export function AudienceSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>누구를 위한 플랫폼인가요?</h2>
        <div style={styles.grid}>
          {audiences.map((audience) => (
            <div key={audience.title} style={styles.card}>
              <div style={styles.icon}>{audience.icon}</div>
              <h3 style={styles.cardTitle}>{audience.title}</h3>
              <p style={styles.cardDescription}>{audience.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '64px 24px',
    backgroundColor: '#fff',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 40px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  card: {
    textAlign: 'center',
    padding: '24px 16px',
  },
  icon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  cardDescription: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
};

export default AudienceSection;
