/**
 * ResourceCard - 자료 카드
 *
 * Content 자산: 문서/영상/이미지 + 출처 배지
 */

import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

export interface ResourceData {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'video' | 'image';
  source: 'pharmacist' | 'corporate' | 'signage' | 'official';
  sourceName?: string;
  fileSize?: string;
  downloadCount: number;
  createdAt: string;
}

const typeIcons: Record<ResourceData['type'], string> = {
  document: '📄',
  video: '🎬',
  image: '🖼️',
};

const typeLabels: Record<ResourceData['type'], string> = {
  document: '문서',
  video: '영상',
  image: '이미지',
};

const sourceLabels: Record<ResourceData['source'], string> = {
  pharmacist: '약사 등록',
  corporate: '업체 제공',
  signage: '사이니지',
  official: '약사회',
};

export function ResourceCard({ resource }: { resource: ResourceData }) {
  const isCorporate = resource.source === 'corporate';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.typeIcon}>{typeIcons[resource.type]}</span>
        <div style={styles.badges}>
          <span style={styles.typeBadge}>{typeLabels[resource.type]}</span>
          <span style={{
            ...styles.sourceBadge,
            ...(isCorporate ? styles.corporateSource : {}),
          }}>
            {sourceLabels[resource.source]}
            {resource.sourceName ? ` · ${resource.sourceName}` : ''}
          </span>
        </div>
      </div>

      <h3 style={styles.title}>{resource.title}</h3>
      <p style={styles.description}>{resource.description}</p>

      <div style={styles.meta}>
        {resource.fileSize && <span>{resource.fileSize}</span>}
        <span>다운로드 {resource.downloadCount}회</span>
        <span>{formatDate(resource.createdAt)}</span>
      </div>

      <button style={styles.downloadBtn}>
        다운로드
      </button>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeIcon: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  badges: {
    display: 'flex',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.7rem',
    fontWeight: 600,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
  },
  sourceBadge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.7rem',
    fontWeight: 500,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral50,
    color: colors.neutral500,
  },
  corporateSource: {
    backgroundColor: `${colors.accentYellow}15`,
    color: colors.accentYellow,
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
    lineHeight: 1.4,
  },
  description: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.neutral500,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  meta: {
    display: 'flex',
    gap: spacing.md,
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  downloadBtn: {
    alignSelf: 'flex-start',
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: '0.813rem',
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
};
