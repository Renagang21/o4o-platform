/** 강의 상세 — `@o4o/lms-ui` CourseDetailView 재사용 (WO Phase 2 §11 Learner) */
import { useParams } from 'react-router-dom';
import { CourseDetailView } from '@o4o/lms-ui';
import { ContentRenderer } from '@o4o/content-editor';
import { lecturePort, useLectureViewConfig } from '../../lib/lmsViewAdapter';

export default function CourseDetailPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const config = useLectureViewConfig();
  return <main className="page page-wide">
    <CourseDetailView
      courseId={courseId}
      port={lecturePort}
      config={config}
      renderDescription={(course) => course.description ? <ContentRenderer html={course.description} /> : null}
    />
  </main>;
}
