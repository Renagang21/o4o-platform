/**
 * HomeNetureRoleSection - 네뚜레의 역할 설명 섹션
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * 섹션 ③: 네뚜레의 역할 설명 (신규)
 *
 * 목적: Neture가 생태계에서 담당하는 구체적 기능 소개
 * - "Neture = 연결자/정리자"로 인식
 * - "판매자가 아니다"를 암시
 */

interface NetureRole {
  icon: string;
  title: string;
  description: string;
}

const netureRoles: NetureRole[] = [
  {
    icon: '📦',
    title: '상품 정보 정리',
    description: '공급자가 등록한 상품 정보를\n체계적으로 정리합니다.',
  },
  {
    icon: '📚',
    title: '콘텐츠 연결',
    description: '교육 자료, 마케팅 콘텐츠를\n파트너에게 연결합니다.',
  },
  {
    icon: '🔗',
    title: '파트너 매칭',
    description: '적합한 공급자와 파트너를\n연결합니다.',
  },
  {
    icon: '📊',
    title: '서비스 연계',
    description: 'Trial 등 다양한 서비스와\n연동을 지원합니다.',
  },
];

export function HomeNetureRoleSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>Neture가 하는 일</h2>
        <p style={styles.sectionDescription}>
          판매가 아닌, 연결과 정리
        </p>

        <div style={styles.grid}>
          {netureRoles.map((role, index) => (
            <div key={index} style={styles.card}>
              <span style={styles.icon}>{role.icon}</span>
              <h3 style={styles.cardTitle}>{role.title}</h3>
              <p style={styles.cardDescription}>
                {role.description.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < role.description.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <p style={styles.note}>
          ※ Neture는 상품을 직접 판매하지 않습니다.
        </p>
      </div>
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#f8fafc',
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
    marginBottom: '12px',
  },
  sectionDescription: {
    fontSize: '15px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '48px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
    marginBottom: '32px',
  },
  card: {
    backgroundColor: '#fff',
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
  note: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    margin: 0,
  },
};
