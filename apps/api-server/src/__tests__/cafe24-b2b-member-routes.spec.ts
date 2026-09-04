/**
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §8 · §9 · §10
 *
 * 라우트 계약 고정. DB·Cafe24 를 타지 않고 컨트롤러의 인증 경계만 검증한다.
 *   - 세션 없이 매장 화면에 들어갈 수 없다 (§10)
 *   - 세션이 있으면 매장 판매지원 첫 화면이 200 이다 (§8 PASS 조건)
 *   - 화면에 §9 홍보 3줄이 있고, 강제 가입/결제 유도 문구가 없다
 *   - 상태 변경(logout)은 GET 이 아니다 (CLAUDE.md §8-4)
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createCafe24B2bMemberController } from '../modules/cafe24/controllers/cafe24-b2b-member.controller.js';
import {
  CAFE24_B2B_SESSION_COOKIE,
  issueMemberSession,
} from '../modules/cafe24/cafe24-member-session.js';

const CLIENT_ID = 'TEST_CLIENT_ID';
const CLIENT_SECRET = 'TEST_CLIENT_SECRET';

const ORG_ID = '33333333-3333-4333-8333-333333333333';

function makeDataSource(): DataSource {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM organizations')) {
        return [{ store_name: '테스트 거래처 매장', store_code: 'c24b2b-abcdef123456', slug: null }];
      }
      if (sql.includes('store_capabilities')) {
        return [
          { capability_key: 'QR_MARKETING', enabled: true },
          { capability_key: 'TABLET', enabled: true },
          { capability_key: 'SIGNAGE', enabled: true },
          { capability_key: 'LIBRARY', enabled: true },
        ];
      }
      return [];
    }),
  } as unknown as DataSource;
}

function makeApp(dataSource: DataSource) {
  const app = express();
  app.use(cookieParser());
  app.use('/api/v1/cafe24-b2b', createCafe24B2bMemberController(dataSource));
  return app;
}

describe('cafe24-b2b member routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CAFE24_CLIENT_ID = CLIENT_ID;
    process.env.CAFE24_CLIENT_SECRET = CLIENT_SECRET;
    process.env.CAFE24_MEMBER_REDIRECT_URI = 'https://api.neture.co.kr/api/v1/cafe24-b2b/callback';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const session = () =>
    issueMemberSession(CLIENT_SECRET, {
      linkId: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
      organizationId: ORG_ID,
      mallId: 'testmall',
      shopNo: 1,
    });

  it('세션 없이 매장 화면에 접근할 수 없다 (§10)', async () => {
    const res = await request(makeApp(makeDataSource())).get('/api/v1/cafe24-b2b/store/support');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('CAFE24_B2B_SESSION_REQUIRED');
  });

  it('위조 세션도 통과하지 못한다 — identity spoofing 방지 (§10)', async () => {
    const forged = issueMemberSession('attacker-secret', {
      linkId: 'x',
      userId: 'x',
      organizationId: ORG_ID,
      mallId: 'testmall',
      shopNo: 1,
    });
    const res = await request(makeApp(makeDataSource()))
      .get('/api/v1/cafe24-b2b/store/support')
      .set('Cookie', `${CAFE24_B2B_SESSION_COOKIE}=${forged}`);
    expect(res.status).toBe(401);
  });

  it('세션이 있으면 매장 판매지원 첫 화면이 200 이다 (§8 PASS 조건)', async () => {
    const res = await request(makeApp(makeDataSource()))
      .get('/api/v1/cafe24-b2b/store/support')
      .set('Cookie', `${CAFE24_B2B_SESSION_COOKIE}=${session()}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('매장 판매지원');
    // §8 — 5개 항목
    for (const label of ['O4O 설명서', '내 설명서', 'QR', 'Tablet', 'Digital Signage']) {
      expect(res.text).toContain(label);
    }
    expect(res.text).toContain('테스트 거래처 매장');
  });

  it('§9 홍보는 3줄뿐이고 가입·결제 유도가 없다', async () => {
    const res = await request(makeApp(makeDataSource()))
      .get('/api/v1/cafe24-b2b/store/support')
      .set('Cookie', `${CAFE24_B2B_SESSION_COOKIE}=${session()}`);

    expect(res.text).toContain('Powered by O4O');
    expect(res.text).toContain('매장용 제품설명서 · QR · Tablet · Digital Signage');
    expect(res.text).toContain('O4O 독립 이용 문의');
    for (const banned of ['회원가입', '결제', '요금제', '앱스토어']) {
      expect(res.text).not.toContain(banned);
    }
  });

  it('/session 은 member_hash·user_identifier 를 응답하지 않는다 (§4 · §10)', async () => {
    const res = await request(makeApp(makeDataSource()))
      .get('/api/v1/cafe24-b2b/session')
      .set('Cookie', `${CAFE24_B2B_SESSION_COOKIE}=${session()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.organizationId).toBe(ORG_ID);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('memberHash');
    expect(serialized).not.toContain('member_hash');
    expect(serialized).not.toContain('userIdentifier');
  });

  it('logout 은 GET 으로 동작하지 않는다 (CLAUDE.md §8-4)', async () => {
    const app = makeApp(makeDataSource());
    expect((await request(app).get('/api/v1/cafe24-b2b/logout')).status).toBe(404);
    expect((await request(app).post('/api/v1/cafe24-b2b/logout')).status).toBe(200);
  });

  it('callback 은 서명되지 않은 state 를 거부한다 — 신뢰 경계 (§10)', async () => {
    const res = await request(makeApp(makeDataSource())).get(
      '/api/v1/cafe24-b2b/callback?code=abc&state=forged',
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CAFE24_B2B_STATE_INVALID');
  });

  it('자격정보가 없으면 503 이며 라우트가 열리지 않는다', async () => {
    delete process.env.CAFE24_CLIENT_SECRET;
    const res = await request(makeApp(makeDataSource())).get('/api/v1/cafe24-b2b/store/support');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('CAFE24_MEMBER_CREDENTIALS_NOT_CONFIGURED');
  });

  it('login 은 Cafe24 회원 로그인 화면으로 302 하며 회원 식별자 scope 만 요구한다 (§3)', async () => {
    const res = await request(makeApp(makeDataSource())).get(
      '/api/v1/cafe24-b2b/login?mallId=testmall',
    );
    expect(res.status).toBe(302);
    const location = res.headers.location as string;
    expect(location.startsWith('https://testmall.cafe24.com/api/v2/oauth/authorize')).toBe(true);
    expect(location).toContain('mall.read_customer_identifier');
    // §3 — 회원 이름/email/전화번호를 가져오지 않는다
    expect(location).not.toContain('mall.read_customer&');
    expect(location).not.toMatch(/scope=mall\.read_customer(?:$|&)/);
  });
});
