/**
 * HomeCoreValueSection_v2 - o4o 생태계 구조 설명 섹션
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * 섹션 ②: o4o 생태계 구조 설명
 *
 * 목적: 생태계의 3주체(공급자, 파트너, 플랫폼)와 흐름을 시각적으로 전달
 * - 텍스트가 아닌 다이어그램/시퀀스로 구조 인지
 * - "무엇이 움직이는가"를 보여줌
 */

interface EcosystemRole {
  icon: string;
  title: string;
  description: string;
}

const ecosystemRoles: EcosystemRole[] = [
  {
    icon: '📦',
    title: '공급자',
    description: '제품과 콘텐츠를\n직접 등록합니다.',
  },
  {
    icon: '🔗',
    title: 'Neture',
    description: '정보를 정리하고\n연결을 중개합니다.',
  },
  {
    icon: '🏪',
    title: '파트너',
    description: '현장에서 서비스와\n제품을 활용합니다.',
  },
];

export function HomeCoreValueSection_v2() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>o4o 생태계 구조</h2>
        <p style={styles.sectionDescription}>
          공급자 → Neture → 파트너로 이어지는 연결 구조
        </p>

        <div style={styles.flowContainer}>
          {ecosystemRoles.map((role, index) => (
            <div key={index} style={styles.roleWrapper}>
              <div style={styles.roleCard}>
                <span style={styles.icon}>{role.icon}</span>
                <h3 style={styles.roleTitle}>{role.title}</h3>
                <p style={styles.roleDescription}>
                  {role.description.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < role.description.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
              {index < ecosystemRoles.length - 1 && (
                <span style={styles.arrow}>→</span>
              )}
            </div>
          ))}
        </div>

        <div style={styles.flowItems}>
          <div style={styles.flowItem}>
            <span style={styles.flowIcon}>📄</span>
            <span style={styles.flowLabel}>상품 정보</span>
          </div>
          <div style={styles.flowItem}>
            <span style={styles.flowIcon}>📚</span>
            <span style={styles.flowLabel}>교육 콘텐츠</span>
          </div>
          <div style={styles.flowItem}>
            <span style={styles.flowIcon}>🎯</span>
            <span style={styles.flowLabel}>마케팅 자료</span>
          </div>
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
    maxWidth: '900px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: '12px',
  },
  sectionDescription: {
    fontSize: '15px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '48px',
  },
  flowContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0',
    marginBottom: '48px',
    flexWrap: 'wrap',
  },
  roleWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  roleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '28px 24px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    minWidth: '160px',
  },
  icon: {
    fontSize: '36px',
    display: 'block',
    marginBottom: '16px',
  },
  roleTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: PRIMARY_COLOR,
    margin: '0 0 12px 0',
  },
  roleDescription: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  arrow: {
    fontSize: '24px',
    color: '#94a3b8',
    padding: '0 16px',
  },
  flowItems: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    flexWrap: 'wrap',
  },
  flowItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#f1f5f9',
    borderRadius: '24px',
  },
  flowIcon: {
    fontSize: '18px',
  },
  flowLabel: {
    fontSize: '14px',
    color: '#475569',
    fontWeight: 500,
  },
};
