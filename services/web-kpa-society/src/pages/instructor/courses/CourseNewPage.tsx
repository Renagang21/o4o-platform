/**
 * CourseNewPage — /instructor/courses/new
 * WO-O4O-LMS-FOUNDATION-V1
 * WO-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1: 기본정보 form 을 공통 `InstructorCourseFormShell`
 *   (@o4o/operator-core-ui) 로 위임. 저장(createCourse)·라우팅은 본 wrapper 가 담당.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { InstructorCourseFormShell, type InstructorCourseFormValues } from '@o4o/operator-core-ui';
import { lmsInstructorApi, type ContentKind } from '../../../api/lms-instructor';
// WO-O4O-KPA-COMMUNITY-CONTENT-LECTURE-CREATION-GUIDE-MODAL-V1: 강의 제작 가이드(공통 모달, communityLecture 모드)
import { ContentCreationGuideModal } from '../../pharmacy/ContentCreationGuideModal';

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 680, margin: '0 auto', padding: '32px 20px' },
  backLink: { fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 20, display: 'inline-block' },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 28px' },
  title: { fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 },
  guideBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    background: '#fff', border: '1px solid #4f46e5', borderRadius: 6,
    fontSize: 13, fontWeight: 500, color: '#4f46e5', cursor: 'pointer',
  },
};

interface CourseNewPageProps {
  /** Override page title (default: "새 강의 만들기") */
  pageTitle?: string;
  /** Override back link text (default: "← 강의 목록") */
  backLinkText?: string;
  /** Override cancel/back navigation target (default: "/instructor/courses") */
  returnTo?: string;
  /**
   * 저장 성공 후 이동할 경로를 반환.
   * 미지정 시 기본 LMS 흐름(`/instructor/courses/${id}`)을 따른다.
   * WO-KPA-CONTENT-SECTION-CREATE-FLOW-ALIGN-V1: content hub 진입 시 hub 섹션으로 복귀.
   */
  redirectAfterCreate?: (courseId: string) => string;
  /** id 없이 저장 성공 시(이론상 없음) 이동할 fallback. 미지정 시 returnTo, 그것도 없으면 /instructor/courses. */
  redirectAfterCreateFallback?: string;
  /**
   * WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 코스 분류.
   *   - 'lecture'(기본): /instructor/courses/new에서 생성 — 일반 강의로 저장
   *   - 'content_resource': /content/courses/new에서 생성 — 콘텐츠 허브의 코스형 자료
   * 미지정 시 백엔드에서 'lecture' 기본 적용.
   */
  contentKind?: ContentKind;
}

export default function CourseNewPage({
  pageTitle,
  backLinkText,
  returnTo,
  redirectAfterCreate,
  redirectAfterCreateFallback,
  contentKind,
}: CourseNewPageProps = {}) {
  const navigate = useNavigate();
  const [guideOpen, setGuideOpen] = useState(false);
  const back = () => navigate(returnTo ?? '/instructor/courses');

  const handleSubmit = async (values: InstructorCourseFormValues) => {
    const res: any = await lmsInstructorApi.createCourse({
      title: values.title,
      description: values.description,
      tags: values.tags.length > 0 ? values.tags : undefined,
      contentKind, // 미지정 시 백엔드에서 'lecture' 기본
      visibility: values.visibility,            // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1
      reusablePolicy: values.reusablePolicy,     // WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1
      requiresApproval: values.requiresApproval, // WO-O4O-LMS-VISIBILITY-ENROLLMENT-INTEGRATION-V1
    });
    // API returns { success, data: Course }
    const courseId = res.data?.data?.id;
    if (courseId) {
      const target = redirectAfterCreate ? redirectAfterCreate(courseId) : `/instructor/courses/${courseId}`;
      navigate(target, { state: { justCreated: true } });
    } else {
      navigate(redirectAfterCreateFallback ?? returnTo ?? '/instructor/courses');
    }
  };

  return (
    <div style={styles.page}>
      <span style={styles.backLink} onClick={back}>{backLinkText ?? '← 강의 목록'}</span>
      <div style={styles.titleRow}>
        <h1 style={styles.title}>{pageTitle ?? '새 강의 만들기'}</h1>
        {/* WO-O4O-KPA-COMMUNITY-CONTENT-LECTURE-CREATION-GUIDE-MODAL-V1: 보조(outline) 강의 제작 가이드 */}
        <button type="button" onClick={() => setGuideOpen(true)} style={styles.guideBtn}>
          <Lightbulb size={14} />
          강의 제작 가이드
        </button>
      </div>

      <ContentCreationGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} mode="communityLecture" />

      <InstructorCourseFormShell
        config={{
          accent: '#4f46e5',
          submitLabel: '강의 생성',
          submittingLabel: '생성 중...',
          requireDescription: true,
          requireTags: true,
        }}
        onSubmit={handleSubmit}
        onCancel={back}
      />
    </div>
  );
}
