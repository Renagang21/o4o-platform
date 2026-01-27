/**
 * LectureGrid - 강의 카드 그리드
 *
 * LectureCard 목록을 3열 그리드로 표시
 */

import { LectureCard } from './LectureCard';
import type { LectureData } from './LectureCard';
import { spacing } from '../../styles/theme';

interface LectureGridProps {
  lectures: LectureData[];
}

export function LectureGrid({ lectures }: LectureGridProps) {
  return (
    <div style={styles.grid}>
      {lectures.map((lecture) => (
        <LectureCard key={lecture.id} lecture={lecture} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.lg,
  },
};
