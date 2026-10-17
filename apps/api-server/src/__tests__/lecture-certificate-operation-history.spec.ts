const actor = '10000000-0000-4000-8000-000000000001';
const id = '20000000-0000-4000-8000-000000000001';
const save = jest.fn(), findOne = jest.fn(), courseFind = jest.fn(), enrollmentUpdate = jest.fn(), query = jest.fn();
const manager = { getRepository: jest.fn(), query };
const transaction = jest.fn(async (run: any) => run(manager));
const rootQuery = jest.fn();
jest.mock('../database/connection.js', () => ({ AppDataSource: { getRepository: () => ({ findOne, create: (v: any) => v, save }), transaction: (run: any) => transaction(run), query: (...args: any[]) => rootQuery(...args) } }));
jest.mock('@o4o/lms-core', () => {
  class Certificate {
    isValid = true; courseId = 'course'; id = '20000000-0000-4000-8000-000000000001'; expiresAt: Date | null = null;
    revoke() { this.isValid = false; }
    renew(months: number) { this.isValid = true; this.expiresAt = new Date(Date.UTC(2026, months, 1)); }
    static generateCertificateNumber() { return 'FIXTURE'; }
    static generateVerificationCode() { return 'fixture-only'; }
  }
  return { Certificate, Course: class Course {}, Enrollment: class Enrollment {} };
}, { virtual: true });
const getCourse = jest.fn(), getEnrollment = jest.fn();
jest.mock('../modules/lms/services/CourseService.js', () => ({ CourseService: { getInstance: () => ({ getCourse }) } }));
jest.mock('../modules/lms/services/EnrollmentService.js', () => ({ EnrollmentService: { getInstance: () => ({ getEnrollmentByUserAndCourse: getEnrollment }) } }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn() } }));
import { Certificate, Course } from '@o4o/lms-core';
import { CertificateService } from '../modules/lms/services/CertificateService.js';
import { certificateReason } from '../modules/lms/services/certificate-operation-log.js';

let service: CertificateService;
beforeEach(() => {
  jest.clearAllMocks();
  manager.getRepository.mockImplementation((entity: unknown) => entity === Certificate ? { findOne, save } : entity === Course ? { findOne: courseFind } : { update: enrollmentUpdate });
  findOne.mockResolvedValue(Object.assign(new Certificate(), { id, courseId: 'course' }));
  enrollmentUpdate.mockResolvedValue({ affected: 1 });
  courseFind.mockResolvedValue({ id: 'course', serviceKey: 'lecture' });
  save.mockImplementation(async value => ({ ...value, id: value.id ?? id })); query.mockResolvedValue([]); rootQuery.mockResolvedValue([]);
  getCourse.mockResolvedValue({ id: 'course', serviceKey: 'lecture' });
  getEnrollment.mockResolvedValue({ id: 'enrollment', isCompleted: () => true });
  service = new CertificateService();
});
it('persists the trimmed revocation reason, actor and state on the same transaction manager', async () => {
  const changed = await service.revokeCertificate(id, '  잘못 발급  ', actor);
  expect(changed.isValid).toBe(false);
  expect(findOne).toHaveBeenCalledWith({ where: { id }, lock: { mode: 'pessimistic_write' } });
  const [sql, args] = query.mock.calls[0]; expect(sql).toContain('action_logs'); expect(args[0]).toBe(actor);
  const meta = JSON.parse(args[1].toPostgres());
  expect(meta).toMatchObject({ certificateId: id, action: 'revoke', reason: '잘못 발급', before: { isValid: true }, after: { isValid: false } });
  expect(JSON.stringify(args)).not.toContain('잘못 발급');
});
it('propagates audit failure through the transaction instead of claiming a successful mutation', async () => {
  query.mockRejectedValueOnce(new Error('audit unavailable'));
  await expect(service.revokeCertificate(id, '사유', actor)).rejects.toThrow('audit unavailable');
  expect(transaction).toHaveBeenCalledTimes(1); expect(save).toHaveBeenCalledTimes(1);
});
it('records manual issue and enrollment linkage together with the certificate', async () => {
  findOne.mockResolvedValueOnce(null);
  await service.issueCertificate({ userId: 'user', courseId: 'course' }, actor);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(enrollmentUpdate).toHaveBeenCalledWith('enrollment', { certificateId: expect.any(String) });
  expect(JSON.parse(query.mock.calls[0][1][1].toPostgres())).toMatchObject({ action: 'issue', before: null });
});
it('does not call the audit writer after enrollment linkage fails', async () => {
  findOne.mockResolvedValueOnce(null); enrollmentUpdate.mockRejectedValueOnce(new Error('link failed'));
  await expect(service.issueCertificate({ userId: 'user', courseId: 'course' }, actor)).rejects.toThrow('link failed');
  expect(query).not.toHaveBeenCalled();
});
it('keeps automatic issuance out of operator history', async () => {
  findOne.mockResolvedValueOnce(null);
  // Existing automatic issuance updates its enrollment through the legacy service.
  const svc = service as any; svc.enrollmentService.updateEnrollment = jest.fn();
  await service.issueCertificate({ userId: 'user', courseId: 'course' });
  expect(transaction).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled();
});
it('renews a revoked certificate and records its before/after states', async () => {
  findOne.mockResolvedValueOnce(Object.assign(new Certificate(), { isValid: false }));
  await service.renewCertificate(id, 6, actor);
  expect(JSON.parse(query.mock.calls[0][1][1].toPostgres())).toMatchObject({ action: 'renew', before: { isValid: false }, after: { isValid: true } });
});
it('rechecks lecture scope after locking before saving', async () => {
  courseFind.mockResolvedValueOnce(null);
  await expect(service.revokeCertificate(id, '', actor)).rejects.toMatchObject({ status: 404 });
  expect(save).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled();
});
it.each([0, -1, 1.5, NaN, Infinity, '6'])('rejects an invalid renewal period %s without a write', async months => {
  await expect(service.renewCertificate(id, months as number, actor)).rejects.toMatchObject({ status: 400 });
  expect(transaction).not.toHaveBeenCalled();
});
it.each([{}, 1, 'bad\0note', '가'.repeat(2001)])('rejects malformed or oversized reasons', async reason => {
  await expect(service.revokeCertificate(id, reason, actor)).rejects.toMatchObject({ status: 400 });
  expect(transaction).not.toHaveBeenCalled();
});
it('preserves the existing optional reason contract', () => {
  expect(certificateReason(undefined)).toBeNull(); expect(certificateReason('  ')).toBeNull();
});
it('paginates only this certificate’s minimal operator records', async () => {
  rootQuery.mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({ id: String(index) })));
  const result = await service.getOperationHistory(id, 2);
  expect(result.items).toHaveLength(20); expect(result.hasMore).toBe(true);
  expect(rootQuery.mock.calls[0][1]).toEqual([id, 20]);
  expect(rootQuery.mock.calls[0][0]).toContain("service_key='lecture'");
});
it('rejects invalid history pages before querying', async () => {
  await expect(service.getOperationHistory(id, -1)).rejects.toMatchObject({ status: 400 });
  expect(rootQuery).not.toHaveBeenCalled();
});
it('audits generic validity edits without allowing ownership edits', async () => {
  const changed = await service.updateCertificate(id, { isValid: false, userId: 'forged' } as any, actor);
  expect(changed.isValid).toBe(false); expect((changed as any).userId).not.toBe('forged');
  expect(JSON.parse(query.mock.calls[0][1][1].toPostgres()).action).toBe('update');
});

it('rejects issuance if the enrollment disappeared before the transactional link update', async () => {
  findOne.mockResolvedValueOnce(null); enrollmentUpdate.mockResolvedValueOnce({ affected: 0 });
  await expect(service.issueCertificate({ userId: 'user', courseId: 'course' }, actor)).rejects.toMatchObject({ status: 409 });
  expect(query).not.toHaveBeenCalled();
});
