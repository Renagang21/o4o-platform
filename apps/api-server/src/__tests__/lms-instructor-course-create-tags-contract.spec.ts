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

const courseService = read('apps/api-server/src/modules/lms/services/CourseService.ts');
const phCourseEdit = read('services/web-pharmacy-hub/src/pages/instructor/InstructorCourseEditPage.tsx');
const phLms = read('services/web-pharmacy-hub/src/api/lms.ts');
const kpaCourseNew = read('services/web-kpa-society/src/pages/instructor/courses/CourseNewPage.tsx');

describe('LMS 강의 생성 태그 계약 (§10/§15)', () => {
  it('backend 생성 경로가 태그를 필수로 유지한다', () => {
    expect(courseService).toContain('const sanitizedTags = sanitizeCourseTags(data.tags);');
    expect(courseService).toContain('태그를 1개 이상 입력해주세요');
  });

  it('PH 신규 강의 화면이 공통 InstructorCourseFormShell 을 쓴다', () => {
    expect(phCourseEdit).toContain('InstructorCourseFormShell');
    expect(phCourseEdit).toContain('requireTags: true');
  });

  it('PH 신규 강의 화면에 제목·설명만 받는 자체 form 이 남아 있지 않다', () => {
    expect(phCourseEdit).not.toContain('setNewForm');
    expect(phCourseEdit).not.toContain("placeholder=\"강의 제목을 입력하세요\"");
  });

  it('PH create dto 가 tags 를 서버로 전달한다', () => {
    expect(phLms).toContain('instructorCreateCourse: async (dto: {');
    expect(phLms).toMatch(/instructorCreateCourse: async \(dto: \{[\s\S]{0,240}tags\?: string\[\];/);
    expect(phCourseEdit).toContain('tags: values.tags,');
  });

  it('KPA 신규 강의 화면도 같은 shell 계약을 유지한다 (서비스 분기 없음)', () => {
    expect(kpaCourseNew).toContain('InstructorCourseFormShell');
    expect(kpaCourseNew).toContain('requireTags: true');
  });
});
