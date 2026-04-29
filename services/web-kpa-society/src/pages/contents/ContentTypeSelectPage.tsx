/**
 * ContentTypeSelectPage — 콘텐츠 타입 선택
 *
 * WO-CONTENT-HUB-STRUCTURE-AND-TABLE-FOUNDATION-V1
 * WO-KPA-CONTENT-CREATE-TYPE-CARDS-EXPANSION-AND-RENAMING-V1
 * WO-KPA-CONTENT-QUIZ-REMOVE-V1: 퀴즈 제거 (LMS 전용 기능으로 분리)
 *
 * /content/new → 타입 선택 화면
 *   - 문서       → /content/write (RichTextEditor)
 *   - 설문       → /content/new/survey (ParticipationCreatePage)
 *   - 코스형 자료 → /content/new/course (CourseNewPage)
 *
 * 퀴즈는 /lms 영역 전용 (강의 레슨 타입 QUIZ). 콘텐츠 허브에서 생성 불가.
 * content_type은 생성 시 확정되며 이후 변경 불가.
 */

import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, GraduationCap, ArrowLeft } from 'lucide-react';

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
    available: true,
    route: '/content/new/survey',
  },
  {
    label: '코스형 자료',
    description: '주제가 있는 분량 많은 콘텐츠를 목록형으로 구성하여 제작합니다',
    icon: <GraduationCap size={28} />,
    available: true,
    route: '/content/new/course',
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
          </button>
        ))}
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
};

export default ContentTypeSelectPage;
