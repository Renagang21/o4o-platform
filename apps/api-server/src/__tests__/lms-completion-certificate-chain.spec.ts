/**
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §15
 *
 * production smoke 결함: 강의를 100% 수료했는데 `내 수료증` 이 비어 있었다.
 *   GET /lms/completions/me → 1건, GET /lms/certificates/me → 0건
 *   서버 로그: '[Completion] Certificate auto-issue skipped —
 *              Course must be completed before issuing certificate'
 *
 * 원인: 자동 수료 체인 3곳(Enrollment·Assignment·Quiz)이 `enrollment.complete()` 로
 *      메모리 상태만 바꾼 뒤 저장하지 않은 채 `createCompletion()` 을 호출했다.
 *      CertificateService 는 enrollment 를 DB 에서 다시 읽어 isCompleted() 를 검사하므로
 *      항상 실패했고, 수료증이 한 번도 발급되지 않았다.
 *
 * 계약: 체인 호출 전에 수료 상태를 저장한다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (f: string) =>
  readFileSync(join(__dirname, '../modules/lms/services/', f), 'utf-8');

const CASES: Array<[string, string]> = [
  ['EnrollmentService.ts', 'recordLessonProgressCompletion (video/article)'],
  ['AssignmentService.ts', 'assignment 제출 경로'],
  ['QuizService.ts', 'quiz 제출 경로'],
];

describe('LMS 자동 수료 체인 — 수료증 발급 전 enrollment 저장 (§15)', () => {
  it.each(CASES)('%s: complete() 직후 createCompletion 이전에 저장한다', (file) => {
    const src = read(file);
    const completeAt = src.indexOf('enrollment.complete(');
    expect(completeAt).toBeGreaterThan(-1);
    const chainAt = src.indexOf('createCompletion(', completeAt);
    expect(chainAt).toBeGreaterThan(completeAt);
    const between = src.slice(completeAt, chainAt);
    expect(between).toContain('await this.enrollmentRepository.save(enrollment);');
  });

  it('CertificateService 는 DB 의 enrollment 완료 상태를 계속 검사한다 (계약 불변)', () => {
    const cert = read('CertificateService.ts');
    expect(cert).toContain('if (!enrollment.isCompleted())');
    expect(cert).toContain('Course must be completed before issuing certificate');
  });

  it('CompletionService 는 수료 생성 시 수료증을 자동 발급한다 (계약 불변)', () => {
    const comp = read('CompletionService.ts');
    expect(comp).toContain('certService.issueCertificate({ userId, courseId })');
  });
});
