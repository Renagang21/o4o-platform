import { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { createLectureOperatorApi, LectureOperationsProvider, OperatorCoursesPage, OperatorCourseReviewPage, OperatorInstructorsPage, OperatorCertificatesPage } from '@o4o/operator-core-ui/modules/lecture-operations';
const http = authClient.api;
const api = createLectureOperatorApi({
  get: async (url, params) => (await http.get(url, { params })).data,
  post: async (url, data) => (await http.post(url, data ?? {})).data,
  patch: async (url, data) => (await http.patch(url, data ?? {})).data,
  delete: async url => (await http.delete(url)).data,
});
function path(source: string) {
  if (source.startsWith('/certificates/verify/')) return `https://study.neture.co.kr${source}`;
  if (source === '/operator') return '/operations/lecture/courses';
  const review = /^\/operator\/courses\/([^/]+)\/review$/.exec(source);
  return review ? `/operations/lecture/courses/${review[1]}` : source.replace(/^\/operator\//, '/operations/lecture/');
}
export default function CentralLectureOperations({ area, courseId }: { area: string; courseId?: string }) {
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const toast = { success: (text: string) => setNotice({ error: false, text }), error: (text: string) => setNotice({ error: true, text }) };
  return <section className="central-service-work"><LectureOperationsProvider api={api} toast={toast} path={path}>
    {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.text}</p>}
    {area === 'instructors' ? <OperatorInstructorsPage /> : area === 'certificates' ? <OperatorCertificatesPage /> : courseId ? <OperatorCourseReviewPage /> : <OperatorCoursesPage />}
  </LectureOperationsProvider></section>;
}
