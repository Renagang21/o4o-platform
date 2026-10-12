import { useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import { ServiceEnrollmentPolicyAgreement, useServiceEnrollmentPolicies } from '@o4o/shared-space-ui';
/** 강의 상세 — `@o4o/lms-ui` CourseDetailView 재사용 (WO Phase 2 §11 Learner) */
import { useParams } from 'react-router-dom';
import { CourseDetailView } from '@o4o/lms-ui';
import { ContentRenderer } from '@o4o/content-editor';
import { lecturePort, enrollWithPolicy, useLectureViewConfig } from '../../lib/lmsViewAdapter';

export default function CourseDetailPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const config = useLectureViewConfig();
  const { user } = useAuth();
  const agreement = useServiceEnrollmentPolicies('lecture', async () => (await api.get('/public/services/lecture/enrollment-policies')).data.data, `${user?.id ?? 'signed-out'}:${courseId}`);
  const latest = useRef(agreement); latest.current = agreement;
  const port = useMemo(() => ({ ...lecturePort, enroll: async (id: string) => {
    const existing = await lecturePort.getEnrollment(id);
    if (existing?.status === 'approved') return lecturePort.enroll(id);
    if (!latest.current.ready) throw new Error('서비스 약관을 먼저 확인해 주세요.');
    try { return await enrollWithPolicy(id, latest.current.references!); }
    catch (error: any) { if (['POLICY_VERSION_MISMATCH', 'ENROLLMENT_POLICY_REQUIRED'].includes(error?.response?.data?.code)) latest.current.reload(); throw error; }
  } }), [courseId, user?.id]);
  return <main className="page page-wide">
    <CourseDetailView
      courseId={courseId}
      port={port}
      config={config}
      renderAfterCourseCard={({ enrollment }) => config.isAuthenticated && (!enrollment || ['cancelled', 'rejected', 'expired'].includes(enrollment.status ?? '')) ? <ServiceEnrollmentPolicyAgreement agreement={agreement} /> : null}
      renderDescription={(course) => course.description ? <ContentRenderer html={course.description} /> : null}
    />
  </main>;
}
