/**
 * LMS 강의 생성 — 태그 필수 계약 회귀 테스트
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §10/§15
 *
 * 닫으려는 결함 (production 실측):
 *   pharmacyhub.co.kr `/instructor/courses/new` 의 `강의 생성` 이 항상 실패했다.
 *   backend `CourseService.createCourse` 는 O4O Tag Policy V1 로 태그를 필수로 요구하는데,
 *   PH 는 공통 form shell 대신 제목·설명만 있는 자체 form 을 두어 태그를 보낼 수 없었다
 *   (`POST /lms/courses` 500 → 화면에 `태그를 1개 이상 입력해주세요`).
 *   CTA 는 있는데 어떤 입력으로도 성공할 수 없는 상태 = §4 dead CTA.
 *
 * 고정하는 계약:
 *   (A) backend 는 생성 시 태그를 필수로 유지한다.
 *   (B) PH·KPA 신규 강의 화면은 **같은 공통 shell** 을 `requireTags` 로 쓴다 (form 복제 금지).
 *   (C) PH client dto 가 tags 를 서버로 전달한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §11/§14: LMS 화면은 services/web-lecture 단일 소유.
const courseService = read('apps/api-server/src/modules/lms/services/CourseService.ts');
const lectureCourseEdit = read('services/web-lecture/src/pages/instructor/InstructorCourseEditPage.tsx');
const lectureApi = read('services/web-lecture/src/api/lecture.ts');

describe('LMS 강의 생성 태그 계약 (§10/§15 → Lecture Phase 2)', () => {
  it('backend 생성 경로가 태그를 필수로 유지한다', () => {
    expect(courseService).toContain('const sanitizedTags = sanitizeCourseTags(data.tags);');
    expect(courseService).toContain('태그를 1개 이상 입력해주세요');
  });

  it('Lecture 강사 강의 화면이 태그를 입력받고 1개 이상을 화면에서 먼저 강제한다', () => {
    expect(lectureCourseEdit).toContain('const tags = parseTags(tagsText);');
    expect(lectureCourseEdit).toContain("if (tags.length === 0) { toast.error('태그를 1개 이상 입력하세요.'); return; }");
    expect(lectureCourseEdit).toContain('const payload: CourseInput = { ...form, tags };');
    expect(lectureCourseEdit).toContain('instructorApi.createCourse(payload)');
    expect(lectureCourseEdit).toContain('instructorApi.updateCourse(courseId, payload)');
  });

  it('Lecture create dto 가 tags 를 서버로 전달한다 (serviceKey 는 보내지 않는다 — §8)', () => {
    expect(lectureApi).toMatch(/export interface CourseInput \{[\s\S]{0,240}tags\?: string\[\];/);
    expect(lectureApi).toContain("createCourse: (dto: CourseInput) => lmsHttp.post<LmsApiResponse<{ course: LectureCourse }>>('/lms/courses', dto)");
    expect(lectureCourseEdit).not.toContain('serviceKey:');
  });

  it('PH / KPA 강사 강의 화면은 삭제되었다 (§14)', () => {
    for (const rel of [
      'services/web-pharmacy-hub/src/pages/instructor',
      'services/web-pharmacy-hub/src/api/lms.ts',
      'services/web-kpa-society/src/pages/instructor',
      'services/web-kpa-society/src/api/lms-instructor.ts',
    ]) {
      expect(fs.existsSync(path.join(REPO_ROOT, rel))).toBe(false);
    }
  });
});
