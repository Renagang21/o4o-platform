/**
 * HowItWorksSection - 이용 방법 섹션
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-KPA-HOME-REFINE-V1: 문구 축소
 */

const steps = [
  {
    step: 1,
    title: '회원 가입',
    description: '이메일로 가입',
  },
  {
    step: 2,
    title: '약사 승인',
    description: '면허 확인 후 승인',
  },
  {
    step: 3,
    title: '서비스 이용',
    description: '승인 후 전체 서비스 이용',
  },
];

export function HowItWorksSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>어떻게 시작하나요?</h2>
        <div style={styles.stepsContainer}>
          {steps.map((item, index) => (
            <div key={item.step} style={styles.stepItem}>
              <div style={styles.stepNumber}>{item.step}</div>
              <div style={styles.stepContent}>
                <h3 style={styles.stepTitle}>{item.title}</h3>
                <p style={styles.stepDescription}>{item.description}</p>
              </div>
              {index < steps.length - 1 && <div style={styles.connector} />}
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
    backgroundColor: '#f8fafc',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 48px 0',
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    position: 'relative',
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.125rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    paddingTop: '4px',
  },
  stepTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  stepDescription: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  connector: {
    position: 'absolute',
    left: '19px',
    top: '48px',
    width: '2px',
    height: '24px',
    backgroundColor: '#cbd5e1',
  },
};

export default HowItWorksSection;
