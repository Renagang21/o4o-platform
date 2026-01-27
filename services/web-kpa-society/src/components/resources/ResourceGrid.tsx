/**
 * ResourceGrid - 자료 카드 그리드
 */

import { ResourceCard } from './ResourceCard';
import type { ResourceData } from './ResourceCard';
import { spacing } from '../../styles/theme';

interface ResourceGridProps {
  resources: ResourceData[];
}

export function ResourceGrid({ resources }: ResourceGridProps) {
  return (
    <div style={styles.grid}>
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.lg,
  },
};
