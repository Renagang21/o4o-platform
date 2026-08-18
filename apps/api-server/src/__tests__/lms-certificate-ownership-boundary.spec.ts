/**
 * LMS Certificate Ownership / Read Authorization Boundary — Regression Test
 *
 * WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1
 * 선행: WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1 (service boundary)
 *       WO-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1 (enrollment ownership)
 *
 * 닫으려는 결함:
 *   cross-service boundary 는 닫혔지만, **같은 서비스 안에서는** certificate id 만 알면
 *   타 사용자의 수료증(이름/이메일/과정/발급정보)을 읽을 수 있었다.
 *
 * 계약:
 *   private read  → 본인 200 / 같은 서비스 타인 404 / 타 서비스 404 / 없는 id 404
 *   public verify → 기존 공개 계약 유지 (owner guard 미적용) + 최소 필드만 반환
 *   management    → 기존 requireKpaAdmin 계약 유지 (user-facing 에 bypass 추가 금지)
 */

import * as fs from 'fs';
import * as path from 'path';

const mockCertificateService = {
  getCertificate: jest.fn(),
  getCertificateByNumber: jest.fn(),
  verifyCertificate: jest.fn(),
  listCertificates: jest.fn(),
};
const mockGenerateCertificatePdf = jest.fn();

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({}),
    query: async () => [] as any[],
  },
}));

jest.mock('../modules/lms/services/CertificateService.js', () => ({
  CertificateService: { getInstance: () => mockCertificateService },
}));

jest.mock('../modules/lms/utils/certificatePdf.js', () => ({
  generateCertificatePdf: (...args: unknown[]) => mockGenerateCertificatePdf(...args),
}));

import { CertificateController } from '../modules/lms/controllers/CertificateController.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const CERT_ID = 'ffffffff-0000-0000-0000-000000000005';
const COURSE_ID = 'cccccccc-0000-0000-0000-000000000004';
const CERT_NUMBER = 'KPA-2026-000123';
const VICTIM_EMAIL = 'victim@example.com';
const NOT_FOUND_BODY = { success: false, error: 'Certificate not found', code: 'NOT_FOUND' };

function fakeRes() {
  const state: any = { statusCode: 0, body: null, headers: {} as Record<string, unknown>, ended: false };
  const res: any = {
    status(code: number) { state.statusCode = code; return res; },
    json(body: unknown) { state.body = body; return res; },
    setHeader(k: string, v: unknown) { state.headers[k] = v; return res; },
    end(payload?: unknown) { state.ended = true; state.payload = payload; return res; },
    get statusCode() { return state.statusCode; },
    get body() { return state.body; },
    get headers() { return state.headers; },
    get ended() { return state.ended; },
  };
  return res;
}

function fakeReq(opts: {
  userId?: string;
  roles?: string[];
  params?: Record<string, string>;
  query?: Record<string, unknown>;
}): any {
  return {
    user: opts.userId ? { id: opts.userId, roles: opts.roles ?? [] } : undefined,
    params: opts.params ?? {},
    query: opts.query ?? {},
    body: {},
    baseUrl: '/api/v1/lms',
    originalUrl: '/api/v1/lms',
    path: '/',
  };
}

function certificateOf(userId: string, serviceKey: string | null = 'kpa-society') {
  return {
    id: CERT_ID,
    userId,
    courseId: COURSE_ID,
    certificateNumber: CERT_NUMBER,
    credits: 2,
    isValid: true,
    issuedAt: new Date('2026-01-02T00:00:00.000Z'),
    completedAt: new Date('2026-01-01T00:00:00.000Z'),
    issuerName: '대한약사회',
    issuerTitle: '회장',
    isExpired: () => false,
    user: { id: userId, name: '홍길동', email: VICTIM_EMAIL },
    course: { id: COURSE_ID, serviceKey, title: '테스트 과정' },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCertificateService.listCertificates.mockResolvedValue({ certificates: [], total: 0 });
  mockGenerateCertificatePdf.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
});

describe('private read — GET /certificates/:id', () => {
  it('본인 certificate 는 조회된다', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_A));
    const res = fakeRes();
    await CertificateController.getCertificate(fakeReq({ userId: USER_A, params: { id: CERT_ID } }), res);

    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.certificate?.userId).toBe(USER_A);
  });

  it('같은 서비스 타인 certificate → 404 (수평 인가 차단)', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_B));
    const res = fakeRes();
    await CertificateController.getCertificate(fakeReq({ userId: USER_A, params: { id: CERT_ID } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual(NOT_FOUND_BODY);
    expect(JSON.stringify(res.body)).not.toContain(VICTIM_EMAIL);
  });

  it('cross-service certificate 는 소유자여도 404 (scope 가 먼저다)', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_A, 'glycopharm'));
    const res = fakeRes();
    await CertificateController.getCertificate(
      fakeReq({ userId: USER_A, params: { id: CERT_ID }, query: { serviceKey: 'kpa-society' } }),
      res,
    );

    expect(res.statusCode).toBe(404);
  });

  it('없는 certificate → 404 + 타인 응답과 구분되지 않는다', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(null);
    const missing = fakeRes();
    await CertificateController.getCertificate(fakeReq({ userId: USER_A, params: { id: CERT_ID } }), missing);

    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_B));
    const foreign = fakeRes();
    await CertificateController.getCertificate(fakeReq({ userId: USER_A, params: { id: CERT_ID } }), foreign);

    expect(missing.statusCode).toBe(404);
    expect(foreign.statusCode).toBe(missing.statusCode);
    expect(foreign.body).toEqual(missing.body);
  });

  it('미인증 요청 → 401 + 조회 미실행', async () => {
    const res = fakeRes();
    await CertificateController.getCertificate(fakeReq({ params: { id: CERT_ID } }), res);

    expect(res.statusCode).toBe(401);
    expect(mockCertificateService.getCertificate).not.toHaveBeenCalled();
  });

  it('알 수 없는 serviceKey → 400 (조회 이전 차단)', async () => {
    const res = fakeRes();
    await CertificateController.getCertificate(
      fakeReq({ userId: USER_A, params: { id: CERT_ID }, query: { serviceKey: 'not-a-service' } }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(mockCertificateService.getCertificate).not.toHaveBeenCalled();
  });

  it('elevated role 도 user-facing private read 를 bypass 하지 않는다', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_B));
    const res = fakeRes();
    await CertificateController.getCertificate(
      fakeReq({ userId: USER_A, roles: ['lms:instructor', 'kpa:admin'], params: { id: CERT_ID } }),
      res,
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('private read — GET /certificates/number/:certificateNumber', () => {
  it('본인 certificateNumber 는 조회된다', async () => {
    mockCertificateService.getCertificateByNumber.mockResolvedValue(certificateOf(USER_A));
    const res = fakeRes();
    await CertificateController.getCertificateByNumber(
      fakeReq({ userId: USER_A, params: { certificateNumber: CERT_NUMBER } }),
      res,
    );

    expect(res.body?.success).toBe(true);
  });

  it('certificateNumber 소지는 인가 근거가 아니다 → 타인 404', async () => {
    mockCertificateService.getCertificateByNumber.mockResolvedValue(certificateOf(USER_B));
    const res = fakeRes();
    await CertificateController.getCertificateByNumber(
      fakeReq({ userId: USER_A, params: { certificateNumber: CERT_NUMBER } }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual(NOT_FOUND_BODY);
  });

  it('cross-service → 404', async () => {
    mockCertificateService.getCertificateByNumber.mockResolvedValue(certificateOf(USER_A, 'k-cosmetics'));
    const res = fakeRes();
    await CertificateController.getCertificateByNumber(
      fakeReq({ userId: USER_A, params: { certificateNumber: CERT_NUMBER }, query: { serviceKey: 'kpa-society' } }),
      res,
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('download / PDF — GET /certificates/:id/pdf', () => {
  it('본인 수료증 PDF 는 정상 발급된다', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_A));
    const res = fakeRes();
    await CertificateController.downloadPdf(fakeReq({ userId: USER_A, params: { id: CERT_ID } }), res);

    expect(mockGenerateCertificatePdf).toHaveBeenCalledTimes(1);
    expect(res.headers['Content-Type']).toBe('application/pdf');
    expect(res.ended).toBe(true);
  });

  it('타인 수료증 PDF 는 404 (403 아님) + PDF 미생성', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_B));
    const res = fakeRes();
    await CertificateController.downloadPdf(fakeReq({ userId: USER_A, params: { id: CERT_ID } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual(NOT_FOUND_BODY);
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });

  it('cross-service 수료증 PDF 는 소유자여도 차단된다', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_A, 'glycopharm'));
    const res = fakeRes();
    await CertificateController.downloadPdf(
      fakeReq({ userId: USER_A, params: { id: CERT_ID }, query: { serviceKey: 'kpa-society' } }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect(mockGenerateCertificatePdf).not.toHaveBeenCalled();
  });
});

describe('목록 read — GET /certificates, GET /certificates/me', () => {
  const filtersOfLastCall = () => mockCertificateService.listCertificates.mock.calls[0][0] as any;

  it('목록은 항상 요청자 본인 범위로 축소된다', async () => {
    const res = fakeRes();
    await CertificateController.listCertificates(fakeReq({ userId: USER_A, query: { page: '1' } }), res);

    expect(mockCertificateService.listCertificates).toHaveBeenCalledTimes(1);
    expect(filtersOfLastCall().userId).toBe(USER_A);
    expect(res.body?.success).toBe(true);
  });

  it('요청이 타인 userId 를 지정해도 본인으로 덮어쓴다 (혼입 0)', async () => {
    const res = fakeRes();
    await CertificateController.listCertificates(fakeReq({ userId: USER_A, query: { userId: USER_B } }), res);
    expect(filtersOfLastCall().userId).toBe(USER_A);
  });

  it('elevated role 도 user-facing 목록에서 전체를 얻지 못한다', async () => {
    const res = fakeRes();
    await CertificateController.listCertificates(
      fakeReq({ userId: USER_A, roles: ['lms:instructor', 'kpa:admin'], query: {} }),
      res,
    );
    expect(filtersOfLastCall().userId).toBe(USER_A);
  });

  it('목록도 canonical serviceKey 로 덮어쓴다 (client raw 값 미신뢰)', async () => {
    const res = fakeRes();
    await CertificateController.listCertificates(fakeReq({ userId: USER_A, query: { serviceKey: 'kpa' } }), res);
    expect(filtersOfLastCall().serviceKey).toBe('kpa-society');
  });

  it('미인증 목록 요청 → 401', async () => {
    const res = fakeRes();
    await CertificateController.listCertificates(fakeReq({ query: {} }), res);
    expect(res.statusCode).toBe(401);
    expect(mockCertificateService.listCertificates).not.toHaveBeenCalled();
  });

  it('GET /certificates/me 는 기존대로 본인 범위를 유지한다', async () => {
    const res = fakeRes();
    await CertificateController.getMyCertificates(fakeReq({ userId: USER_A, query: { userId: USER_B } }), res);
    expect(filtersOfLastCall().userId).toBe(USER_A);
  });
});

describe('public verify — 공개 계약 유지 + 개인정보 최소화', () => {
  it('GET /certificates/:id/verify 는 미인증에서도 동작한다 (owner guard 미적용)', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_B));
    const res = fakeRes();
    await CertificateController.verifyPublic(fakeReq({ params: { id: CERT_ID } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body?.valid).toBe(true);
  });

  it('공개 진위확인 응답에 개인정보(user id / email)를 노출하지 않는다', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(certificateOf(USER_B));
    const res = fakeRes();
    await CertificateController.verifyPublic(fakeReq({ params: { id: CERT_ID } }), res);

    const payload = JSON.stringify(res.body);
    expect(payload).not.toContain(VICTIM_EMAIL);
    expect(payload).not.toContain(USER_B);
    expect(Object.keys(res.body.certificate).sort()).toEqual([
      'certificateCode',
      'certificateId',
      'completedAt',
      'courseTitle',
      'issuedAt',
      'issuer',
      'userName',
    ]);
  });

  it('무효/없는 수료증은 기존대로 200 { valid: false }', async () => {
    mockCertificateService.getCertificate.mockResolvedValue(null);
    const res = fakeRes();
    await CertificateController.verifyPublic(fakeReq({ params: { id: CERT_ID } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ valid: false });
  });

  it('verificationCode 진위확인도 최소 필드만 반환한다', async () => {
    mockCertificateService.verifyCertificate.mockResolvedValue(certificateOf(USER_B));
    const res = fakeRes();
    await CertificateController.verifyCertificate(
      fakeReq({ userId: USER_A, params: { verificationCode: 'VC-1234' } }),
      res,
    );

    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.verified).toBe(true);
    const payload = JSON.stringify(res.body);
    expect(payload).not.toContain(VICTIM_EMAIL);
    expect(payload).not.toContain(USER_B);
  });

  it('verificationCode 진위확인도 cross-service 는 차단된다 (기존 계약 유지)', async () => {
    mockCertificateService.verifyCertificate.mockResolvedValue(certificateOf(USER_B, 'glycopharm'));
    const res = fakeRes();
    await CertificateController.verifyCertificate(
      fakeReq({ userId: USER_A, params: { verificationCode: 'VC-1234' }, query: { serviceKey: 'kpa-society' } }),
      res,
    );

    expect(res.statusCode).toBe(404);
  });
});

describe('정적 회귀 가드', () => {
  const CONTROLLER = 'apps/api-server/src/modules/lms/controllers/CertificateController.ts';
  const GUARD = 'apps/api-server/src/modules/lms/utils/lms-certificate-owner-guard.ts';
  const ROUTES = 'apps/api-server/src/modules/lms/routes/lms.routes.ts';

  it('private read 경로가 공통 helper 를 사용한다 (경로별 중복 구현 금지)', () => {
    const src = read(CONTROLLER);
    const byId = src.match(/resolveOwnedCertificateByIdOrRespond\(req, res, id\)/g) ?? [];
    expect(byId.length).toBe(2); // getCertificate + downloadPdf
    expect(src).toContain('resolveOwnedCertificateByNumberOrRespond(req, res, certificateNumber)');
    expect(src).not.toContain('certificate.userId !== userId');
  });

  it('owner guard 는 scope 판정 후에 ownership 을 확인한다', () => {
    const src = read(GUARD);
    expect(src.indexOf('guardLoadedCourseScope')).toBeLessThan(src.indexOf('certificate.userId !== userId'));
  });

  it('user-facing certificate 라우트에 elevated bypass 가 추가되지 않았다', () => {
    const routes = read(ROUTES).split('\n');
    for (const p of [
      "router.get('/certificates/:id'",
      "router.get('/certificates/:id/pdf'",
      "router.get('/certificates/number/:certificateNumber'",
    ]) {
      const line = routes.find((l) => l.includes(p));
      expect(line).toBeDefined();
      expect(line).toContain('requireAuth');
      expect(line).not.toContain('requireKpaAdmin');
    }
  });

  it('management 라우트는 기존 requireKpaAdmin 계약을 유지한다', () => {
    const routes = read(ROUTES).split('\n');
    for (const p of [
      "router.post('/certificates/issue'",
      "router.patch('/certificates/:id'",
      "router.post('/certificates/:id/revoke'",
      "router.post('/certificates/:id/renew'",
    ]) {
      const line = routes.find((l) => l.includes(p));
      expect(line).toBeDefined();
      expect(line).toContain('requireKpaAdmin');
    }
  });

  it('공개 verify 는 owner guard 대상이 아니다 (private 계약과 분리)', () => {
    const src = read(CONTROLLER);
    const verifyPublic = src.slice(
      src.indexOf('static async verifyPublic'),
      src.indexOf('static async downloadPdf'),
    );
    expect(verifyPublic).not.toContain('resolveOwnedCertificateByIdOrRespond');
    expect(verifyPublic).toContain('toPublicVerificationView');
  });
});
