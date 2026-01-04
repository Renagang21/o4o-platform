/**
 * HowItWorks - 이용 방법 섹션
 * WO-KCOS-HOME-UI-V1
 */

interface Step {
  number: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: '1',
    title: '매장 찾기',
    description: '검증된 매장을 탐색하고\n원하는 매장을 선택합니다',
  },
  {
    number: '2',
    title: '매장 방문',
    description: '매장에서 제품을\n직접 체험해 봅니다',
  },
  {
    number: '3',
    title: '매장에서 구매',
    description: '해당 매장에서\n직접 구매합니다',
  },
];

export function HowItWorks() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>이용 방법</h2>
        <p style={styles.sectionDesc}>
          K-화장품을 만나는 간단한 3단계
        </p>

        <div style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={index} style={styles.step}>
              <div style={styles.stepNumber}>{step.number}</div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepDescription}>{step.description}</p>
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
    padding: '64px 24px',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  sectionDesc: {
    fontSize: '15px',
    color: '#666',
    margin: '0 0 48px 0',
    textAlign: 'center',
  },
  stepsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '48px',
    flexWrap: 'wrap',
  },
  step: {
    textAlign: 'center',
    flex: '1 1 200px',
    maxWidth: '220px',
  },
  stepNumber: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  stepTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  stepDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.6,
    whiteSpace: 'pre-line',
  },
};
