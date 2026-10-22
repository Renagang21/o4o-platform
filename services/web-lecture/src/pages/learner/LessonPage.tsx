/** 레슨 플레이어 — `@o4o/lms-ui` LessonPlayerView 재사용 (WO Phase 2 §11 Learner: 진행 · 퀴즈 · 과제) */
import { Link, useParams } from 'react-router-dom';
import { LessonPlayerView } from '@o4o/lms-ui';
import { ContentRenderer } from '@o4o/content-editor';
import { lecturePort, useLectureViewConfig } from '../../lib/lmsViewAdapter';

export default function LessonPage() {
  const { courseId = '', lessonId = '' } = useParams<{ courseId: string; lessonId: string }>();
  const config = useLectureViewConfig();
  return <main className="page page-wide">
    <LessonPlayerView
      key={`${config.accountId ?? "anonymous"}:${courseId}`}
      courseId={courseId}
      lessonId={lessonId}
      port={lecturePort}
      config={config}
      renderBelowContent={() => <p><Link to={`/contact?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(lessonId)}`}>이 강의 · 레슨 문의</Link></p>}
      renderHtml={(html) => <ContentRenderer html={html} />}
    />
  </main>;
}
