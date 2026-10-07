/**
 * 플랫폼 문의 — 은퇴 유형 'siteguide' 접수 거부 (CHECK-O4O-SITEGUIDE-RETIREMENT-V1 §5)
 *
 * 운영에서 삭제한 siteguide 문의가 공개 접수(POST /api/v1/platform/inquiries)로 다시 생기지 않아야 하고,
 * 다른 유형의 접수 동작은 그대로여야 한다. DB · 메일은 mock 이다.
 */

const mockRepo = {
  create: jest.fn((v: Record<string, unknown>) => ({ id: 'inq-1', ...v })),
  save: jest.fn(async (v: unknown) => v),
};

jest.mock('../database/connection.js', () => ({
  AppDataSource: { getRepository: () => mockRepo },
}));
jest.mock('../services/email.service.js', () => ({
  emailService: { sendEmail: jest.fn(async () => undefined) },
}));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { submitInquiry } from '../controllers/platformInquiryController.js';

function makeRes() {
  const res: { statusCode?: number; body?: any; status: jest.Mock; json: jest.Mock } = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

const base = { name: '테스트', email: 'tester@example.com', subject: '제목', message: '내용' };
const req = (body: Record<string, unknown>) =>
  ({ body, ip: '127.0.0.1', socket: {}, headers: {} }) as any;

describe('platform inquiry — retired type', () => {
  beforeEach(() => {
    mockRepo.create.mockClear();
    mockRepo.save.mockClear();
  });

  it("type 'siteguide' 는 400 RETIRED_INQUIRY_TYPE 으로 거부하고 저장하지 않는다", async () => {
    const res = makeRes();
    await submitInquiry(req({ ...base, type: 'siteguide' }), res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'RETIRED_INQUIRY_TYPE' });
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it.each(['platform', 'partnership', 'other'])("type '%s' 는 기존대로 접수된다 (201)", async (type) => {
    const res = makeRes();
    await submitInquiry(req({ ...base, type }), res as any);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ success: true });
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type }));
  });

  it('type 생략 시 기본값 platform 으로 접수된다', async () => {
    const res = makeRes();
    await submitInquiry(req({ ...base }), res as any);
    expect(res.statusCode).toBe(201);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'platform' }));
  });
});
