/**
 * HomeB2BIntroSection_v2 - 참여자 유형별 안내 섹션
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * 섹션 ⑤: 참여자 유형별 안내 (전환 구간)
 *
 * 목적: 자기 유형에 맞는 진입점 제공
 * - "나는 공급자인가, 파트너인가?"를 스스로 판단할 수 있게
 * - 주요 CTA 역할
 */

import { Link } from 'react-router-dom';

interface ParticipantType {
  icon: string;
  title: string;
  description: string;
  linkTo: string;
  linkLabel: string;
}

const participantTypes: ParticipantType[] = [
  {
    icon: '📦',
    title: '공급자',
    description: '제품과 콘텐츠를 등록하고\n파트너에게 공급합니다.',
    linkTo: '/supplier',
    linkLabel: '공급자로 시작하기',
  },
  {
    icon: '🏪',
    title: '파트너',
    description: '현장에서 서비스와 제품을\n활용합니다.',
    linkTo: '/partner',
    linkLabel: '파트너로 참여하기',
  },
];

export function HomeB2BIntroSection_v2() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>어떤 역할로 참여하시겠습니까?</h2>
        <p style={styles.sectionDescription}>
          사업자라면 누구나 참여할 수 있습니다
        </p>

        <div style={styles.grid}>
          {participantTypes.map((type, index) => (
            <div key={index} style={styles.card}>
              <span style={styles.icon}>{type.icon}</span>
              <h3 style={styles.cardTitle}>{type.title}</h3>
              <p style={styles.cardDescription}>
                {type.description.split('\n').map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < type.description.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </p>
              <Link to={type.linkTo} style={styles.cardLink}>
                {type.linkLabel} →
              </Link>
            </div>
          ))}
        </div>

        <p style={styles.note}>
          ※ 소비자 대상 판매 플랫폼이 아닙니다.
          <br />
          ※ 사업자등록증이 있는 사업자만 참여할 수 있습니다.
        </p>
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
    maxWidth: '700px',
    margin: '0 auto',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '12px',
  },
  sectionDescription: {
    fontSize: '15px',
    color: '#64748b',
    marginBottom: '48px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
    marginBottom: '32px',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 24px 0',
  },
  cardLink: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  note: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.8,
    margin: 0,
  },
};
