import type { AIPlaceholderProps } from '../types.js';
import { NEUTRALS } from '../theme.js';

export function AIPlaceholder({
  title = 'AI 추천 예정',
  description = 'AI 기반 맞춤 추천 서비스가 준비 중입니다',
  icon = '🤖',
}: AIPlaceholderProps) {
  return (
    <div style={S.container}>
      <div style={S.iconWrap}>
        {typeof icon === 'string' ? <span style={S.emoji}>{icon}</span> : icon}
      </div>
      <h3 style={S.title}>{title}</h3>
      <p style={S.desc}>{description}</p>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    backgroundColor: NEUTRALS[50],
    borderRadius: '16px',
    border: `2px dashed ${NEUTRALS[200]}`,
    textAlign: 'center',
  },
  iconWrap: {
    marginBottom: '16px',
  },
  emoji: {
    fontSize: '40px',
  },
  title: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    color: NEUTRALS[700],
  },
  desc: {
    margin: '8px 0 0',
    fontSize: '0.875rem',
    color: NEUTRALS[400],
    lineHeight: 1.5,
  },
};
