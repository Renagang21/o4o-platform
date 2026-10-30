import type { LmsHttpClient, LmsApiResponse } from '@o4o/lms-client';
import type { Paginated, LectureCourse, LectureCertificate, InstructorApplication, OperatorCourseReview, MissingCertificate, CertificateOperation } from './types';
export const createLectureOperatorApi = (lmsHttp: LmsHttpClient) => ({
  missingCertificates: (search = '') => lmsHttp.get<LmsApiResponse<{ items: MissingCertificate[] }>>('/lms/operator/certificates/missing', { search }),
  courses: (params?: { status?: string; search?: string; page?: number; limit?: number; contentKind?: string }) =>
    lmsHttp.get<Paginated<LectureCourse>>('/lms/operator/courses', { contentKind: 'all', ...(params ?? {}) }),
  /** 운영자 검토 전용 read-only 조회 (11차 P2) — 수강 등록·write 없음. */
  review: (id: string) =>
    lmsHttp.get<LmsApiResponse<OperatorCourseReview>>(`/lms/operator/courses/${id}/review`),
  approve: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/approve`),
  reject: (id: string, reason: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/reject`, { reason }),
  publish: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/courses/${id}/publish`),
  unpublish: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/unpublish`),
  archive: (id: string) => lmsHttp.post<LmsApiResponse<unknown>>(`/lms/operator/courses/${id}/archive`),

  applications: (params?: { status?: string; page?: number; limit?: number }) =>
    lmsHttp.get<Paginated<InstructorApplication>>('/lms/instructor/applications', params),
  approveApplication: (id: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/instructor/applications/${id}/approve`),
  rejectApplication: (id: string, reason?: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/instructor/applications/${id}/reject`, { reason }),

  issueCertificate: (dto: { userId: string; courseId: string; enrollmentId?: string }) =>
    lmsHttp.post<LmsApiResponse<{ certificate: LectureCertificate }>>('/lms/certificates/issue', dto),
  certificateOperations: (id: string, page = 1) =>
    lmsHttp.get<LmsApiResponse<{ operations: CertificateOperation[]; page: number; hasMore: boolean }>>(`/lms/certificates/${id}/operations`, { page }),
  /** operationId: 같은 요청의 재시도는 이력·변경을 한 번만 남긴다. */
  revokeCertificate: (id: string, reason?: string, operationId?: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/certificates/${id}/revoke`, { reason, ...(operationId ? { operationId } : {}) }),
  renewCertificate: (id: string, months?: number, operationId?: string) =>
    lmsHttp.post<LmsApiResponse<unknown>>(`/lms/certificates/${id}/renew`, { ...(months ? { months } : {}), ...(operationId ? { operationId } : {}) }),
});
export type LectureOperatorApi = ReturnType<typeof createLectureOperatorApi>;


/** 백엔드 오류 메시지 추출 (axios envelope `{ success:false, error, code }`). */
export function errorMessage(err: unknown, fallback: string): string {
  const e = err as any;
  return e?.response?.data?.error || e?.response?.data?.message || (e instanceof Error ? e.message : null) || fallback;
}
export function errorCode(err: unknown): string | undefined {
  return (err as any)?.response?.data?.code;
}
/** HTTP status (없으면 undefined) — "미존재(404)" 와 그 외 실패를 구분해야 하는 화면에서 쓴다 (6차 P2). */
export function errorStatus(err: unknown): number | undefined {
  const s = (err as any)?.response?.status;
  return typeof s === 'number' ? s : undefined;
}

export type * from './types';
