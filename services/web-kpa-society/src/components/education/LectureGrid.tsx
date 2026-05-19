/**
 * LectureGrid - 강의 카드 그리드
 *
 * WO-O4O-LECTURE-EVENT-GRID-RESPONSIVE-V1:
 *   기존 gridTemplateColumns: 'repeat(3, 1fr)' 고정 → @o4o/ui ResponsiveGrid 적용.
 *   mobile 1열 → sm 2열 → lg 3열 mobile-first 전환.
 */

import { ResponsiveGrid } from '@o4o/ui';
import { LectureCard } from './LectureCard';
import type { LectureData } from './LectureCard';

interface LectureGridProps {
  lectures: LectureData[];
}

export function LectureGrid({ lectures }: LectureGridProps) {
  return (
    <ResponsiveGrid cols={{ base: 1, sm: 2, lg: 3 }} gap="default">
      {lectures.map((lecture) => (
        <LectureCard key={lecture.id} lecture={lecture} />
      ))}
    </ResponsiveGrid>
  );
}
