/**
 * ContentTypeSelectPage — 콘텐츠 타입 선택
 *
 * WO-CONTENT-HUB-STRUCTURE-AND-TABLE-FOUNDATION-V1
 *
 * /content/new → 타입 선택 화면
 *   - 문서  → /content/write (RichTextEditor)
 *   - 설문  → /content/new/survey (준비 중)
 *   - 퀴즈  → /content/new/quiz (준비 중)
 *   - 강의  → /content/new/lecture (준비 중)
 *
 * content_type은 생성 시 확정되며 이후 변경 불가.
 */

import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, HelpCircle, GraduationCap, ArrowLeft, Clock } from 'lucide-react';

// ─── Type Cards ──────────────────────────────────────────────

interface TypeCard {
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  route: string;
}

const TYPE_CARDS: TypeCard[] = [
  {
    label: '문서',
    description: '리치 텍스트 편집기로 글을 작성합니다',
    icon: <FileText size={28} />,
    available: true,
    route: '/content/write',
  },
  {
    label: '설문',
    description: '구성원 의견을 수집하는 설문을 만듭니다',
    icon: <ClipboardList size={28} />,
    available: false,
    route: '/content/new/survey',
  },
  {
    label: '퀴즈',
    description: '지식을 테스트하는 퀴즈를 만듭니다',
    icon: <HelpCircle size={28} />,
    available: false,
    route: '/content/new/quiz',
  },
  {
    label: '강의',
    description: '동영상·자료를 포함한 강의를 제작합니다',
    icon: <GraduationCap size={28} />,
    available: false,
    route: '/content/new/lecture',
  },
];

// ─── ContentTypeSelectPage ───────────────────────────────────

export function ContentTypeSelectPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/content')} style={styles.back}>
        <ArrowLeft size={16} /> 목록으로
      </button>

      <h1 style={styles.title}>콘텐츠 타입 선택</h1>
      <p style={styles.subtitle}>만들고자 하는 콘텐츠 유형을 선택하세요. 선택 후 변경할 수 없습니다.</p>

      <div style={styles.grid}>
        {TYPE_CARDS.map((card) => (
          <button
            key={card.label}
            onClick={() => { if (card.available) navigate(card.route); }}
            disabled={!card.available}
            style={{
              ...styles.card,
              ...(card.available ? styles.cardAvailable : styles.cardDisabled),
            }}
          >
            <div style={{
              ...styles.iconBox,
              ...(card.available ? styles.iconAvailable : styles.iconDisabled),
            }}>
              {card.icon}
            </div>
            <div style={styles.cardLabel}>{card.label}</div>
            <div style={styles.cardDesc}>{card.description}</div>
            {!card.available && (
              <div style={styles.comingSoon}>
                <Clock size={12} />
                준비 중
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ContentCreatorPlaceholder ───────────────────────────────
// 설문 / 퀴즈 / 강의 제작기 준비 중 페이지

export function ContentCreatorPlaceholder({ type }: { type: string }) {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/content/new')} style={styles.back}>
        <ArrowLeft size={16} /> 타입 선택으로
      </button>
      <div style={styles.placeholder}>
        <Clock size={40} style={{ color: '#94a3b8', marginBottom: 16 }} />
        <h2 style={styles.placeholderTitle}>{type} 제작기 준비 중</h2>
        <p style={styles.placeholderDesc}>현재 개발 중입니다. 곧 만나보실 수 있습니다.</p>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 16px 60px',
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.875rem',
    color: '#64748b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginBottom: 24,
    padding: 0,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: '0 0 32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  card: {
    padding: '28px 20px',
    borderRadius: 12,
    border: '2px solid transparent',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.15s',
  },
  cardAvailable: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    cursor: 'pointer',
  },
  cardDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  iconBox: {
    marginBottom: 16,
    width: 52,
    height: 52,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAvailable: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
  },
  iconDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  cardLabel: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: '0.875rem',
    color: '#64748b',
    lineHeight: 1.5,
  },
  comingSoon: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
    textAlign: 'center',
  },
  placeholderTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#334155',
    margin: '0 0 8px',
  },
  placeholderDesc: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: 0,
  },
};

export default ContentTypeSelectPage;
