/**
 * Cafe24 B2B 거래처 매장 — 회원 로그인 Pilot Controller
 *
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §3 · §8 · §9 · §10 · §12
 *
 * mount: /api/v1/cafe24-b2b
 *   GET  /login?mallId=&shopNo=   → Cafe24 회원 로그인·동의 화면으로 302
 *   GET  /callback?code=&state=   → token 교환 → user_identifier → provisioning → 세션 쿠키 → 302
 *   GET  /store/support           → 매장 판매지원 첫 화면 (SSR HTML 200)
 *   GET  /session                 → 현재 세션 요약 (JSON, 검증용)
 *   POST /logout                  → 세션 쿠키 폐기
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 인증 경계 (CLAUDE.md §8 · WO §10)
 *
 *   이 라우터는 **O4O 로그인 밖**이다. 거래처 매장은 O4O 에 가입하지 않기 때문이다(§2).
 *   그래서 `authenticate` 를 걸 수 없다. 대신 두 개의 서명 경계를 쓴다:
 *
 *     /callback     → `/login` 이 발급한 HMAC 서명 state (cafe24-oauth-state 재사용)
 *     /store/*      → `/callback` 이 발급한 HMAC 서명 세션 쿠키 (cafe24-member-session)
 *
 *   무검증 public route 는 `/login` 하나뿐이고, 그것은 외부로 redirect 만 한다
 *   (상태를 바꾸지 않는다). 세션 쿠키는 `path=/api/v1/cafe24-b2b` 로 스코프돼
 *   O4O 의 다른 라우트에는 전송조차 되지 않는다.
 *
 *   **identity spoofing 방지**(§10): 회원 식별자는 요청 파라미터에서 받지 않는다.
 *   반드시 Cafe24 Customer Access Token 으로 `GET /customers/identifier` 를 호출해
 *   서버가 직접 가져온다. 클라이언트가 user_identifier 를 주장할 통로가 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 로그 정책 (§10)
 *   Customer Access Token · authorization code · user_identifier 원문을 로그에 남기지
 *   않는다. 회원 식별은 항상 `maskMemberHash()` 결과(앞 8자)로만 기록한다.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import {
  loadCafe24MemberAuthConfig,
  buildMemberAuthorizeUrl,
  exchangeMemberAuthorizationCode,
  fetchCustomerIdentifier,
} from '../cafe24-member-auth.client.js';
import { parseCafe24Timestamp } from '../cafe24-oauth.client.js';
import { issueState, verifyState } from '../cafe24-oauth-state.js';
import {
  CAFE24_B2B_SESSION_COOKIE,
  CAFE24_B2B_SESSION_COOKIE_OPTIONS,
  issueMemberSession,
  verifyMemberSession,
  type Cafe24MemberSession,
} from '../cafe24-member-session.js';
import { deriveCafe24MemberHash, maskMemberHash } from '../cafe24-member-identity.js';
import { Cafe24B2bStoreProvisioningService } from '../../../services/cafe24-b2b/Cafe24B2bStoreProvisioningService.js';
import logger from '../../../utils/logger.js';

const CREDENTIALS_MISSING = {
  success: false as const,
  error: 'Cafe24 회원 인증 자격정보 미설정 (CAFE24_CLIENT_ID/SECRET/CAFE24_MEMBER_REDIRECT_URI)',
  code: 'CAFE24_MEMBER_CREDENTIALS_NOT_CONFIGURED',
};

/** 매장 판매지원 첫 화면 경로 (§8) */
const STORE_SUPPORT_PATH = '/api/v1/cafe24-b2b/store/support';

/** §9 — O4O 홍보는 이 3줄이 전부다. 강제 가입·결제 유도 문구를 넣지 않는다. */
const O4O_CONTACT_EMAIL = process.env.O4O_CONTACT_EMAIL || 'contact@neture.co.kr';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createCafe24B2bMemberController(dataSource: DataSource): Router {
  const router = Router();
  const provisioning = new Cafe24B2bStoreProvisioningService(dataSource);

  /**
   * 세션 쿠키 검증. 없으면 null 을 돌려주고 호출 측이 401 을 낸다.
   * `authenticate` 미들웨어를 쓰지 않는 이유는 파일 상단 "인증 경계" 참조.
   */
  function readSession(req: Request, secret: string): Cafe24MemberSession | null {
    const raw = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      CAFE24_B2B_SESSION_COOKIE
    ];
    if (!raw) return null;
    return verifyMemberSession(secret, raw);
  }

  // ── 1. 로그인 시작 ────────────────────────────────────────────────────────
  /**
   * Cafe24 회원 로그인·동의 화면으로 보낸다.
   * 상태를 바꾸지 않으므로 GET 이며, 서명 state 만 발급한다 (CLAUDE.md §8-4 준수).
   */
  router.get('/login', (req: Request, res: Response) => {
    const cfg = loadCafe24MemberAuthConfig();
    if (!cfg) return res.status(503).json(CREDENTIALS_MISSING);

    const mallId =
      (typeof req.query.mallId === 'string' ? req.query.mallId : '').trim() ||
      (process.env.CAFE24_B2B_DEFAULT_MALL_ID || '').trim();
    if (!mallId) {
      return res.status(400).json({
        success: false,
        error: 'mallId 가 필요합니다',
        code: 'CAFE24_B2B_MALL_ID_REQUIRED',
      });
    }

    const shopNo = Number(req.query.shopNo ?? 1) || 1;

    let url: string;
    try {
      // state 서명 키는 운영자 축과 동일하게 client_secret 을 쓴다 (DB 에 없는 값).
      url = buildMemberAuthorizeUrl(cfg, mallId, issueState(cfg.clientSecret, mallId, shopNo, null));
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'mall 식별자가 올바르지 않습니다',
        code: e instanceof Error ? e.message : 'INVALID_MALL_ID',
      });
    }

    logger.info(`[cafe24-b2b] member login start mall=${mallId} shop=${shopNo}`);
    return res.redirect(302, url);
  });

  // ── 2. 로그인 콜백 ────────────────────────────────────────────────────────
  /**
   * code → Customer Access Token → user_identifier → provisioning → 세션 발급.
   *
   * 신뢰 근거는 서명 state 다. Cafe24 가 붙여 보내는 mall_id 는 state 값과 대조만 하고
   * 신뢰하지 않는다 (운영자 축 callback 과 동일 정책).
   */
  router.get('/callback', async (req: Request, res: Response) => {
    const cfg = loadCafe24MemberAuthConfig();
    if (!cfg) return res.status(503).json(CREDENTIALS_MISSING);

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      return res
        .status(400)
        .json({ success: false, error: 'code/state 누락', code: 'CAFE24_B2B_CALLBACK_INVALID' });
    }

    const payload = verifyState(cfg.clientSecret, state);
    if (!payload) {
      return res
        .status(400)
        .json({ success: false, error: 'state 검증 실패', code: 'CAFE24_B2B_STATE_INVALID' });
    }

    const claimedMall =
      typeof req.query.mall_id === 'string' ? req.query.mall_id.trim() : '';
    if (claimedMall && claimedMall !== payload.mallId) {
      logger.warn(`[cafe24-b2b] callback mall mismatch state=${payload.mallId} query=${claimedMall}`);
      return res
        .status(400)
        .json({ success: false, error: 'mall 불일치', code: 'CAFE24_B2B_STATE_MALL_MISMATCH' });
    }

    try {
      const token = await exchangeMemberAuthorizationCode(cfg, payload.mallId, code);

      // 회원 식별자는 **서버가 직접** 가져온다 — 요청 파라미터를 신뢰하지 않는다 (§10).
      const identifier = await fetchCustomerIdentifier(
        cfg,
        payload.mallId,
        token.access_token,
        payload.shopNo,
      );

      const result = await provisioning.provision({
        clientId: cfg.clientId,
        mallId: payload.mallId,
        shopNo: identifier.shopNo,
        userIdentifier: identifier.userIdentifier,
      });

      // §11 — Cafe24 timestamp 는 offset 없는 KST 벽시계 문자열이다. 기존 파서를 재사용하며
      // `new Date()` 로 직접 파싱하지 않는다. 파싱 실패는 세션 발급을 막지 않고(기본 TTL 사용)
      // 상한만 포기한다.
      let tokenExpiresAt: Date | null = null;
      try {
        tokenExpiresAt = token.expires_at ? parseCafe24Timestamp(token.expires_at) : null;
      } catch {
        logger.warn('[cafe24-b2b] member token expires_at 파싱 실패 — 기본 세션 TTL 사용');
      }

      const session = issueMemberSession(
        cfg.clientSecret,
        {
          linkId: result.linkId,
          userId: result.userId,
          organizationId: result.organizationId,
          mallId: payload.mallId,
          shopNo: identifier.shopNo,
        },
        tokenExpiresAt,
      );
      res.cookie(CAFE24_B2B_SESSION_COOKIE, session, CAFE24_B2B_SESSION_COOKIE_OPTIONS);

      // 원문 식별자 대신 hash 앞 8자만 남긴다 (§10).
      const masked = maskMemberHash(
        deriveCafe24MemberHash({
          clientId: cfg.clientId,
          mallId: payload.mallId,
          shopNo: identifier.shopNo,
          userIdentifier: identifier.userIdentifier,
        }),
      );
      logger.info(
        `[cafe24-b2b] member signed in mall=${payload.mallId} shop=${identifier.shopNo} member=${masked} org=${result.organizationId} created=${JSON.stringify(result.created)}`,
      );

      return res.redirect(302, STORE_SUPPORT_PATH);
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown';
      logger.error(`[cafe24-b2b] member callback failed mall=${payload.mallId} reason=${reason}`);
      return res
        .status(502)
        .json({ success: false, error: 'Cafe24 회원 인증 실패', code: reason });
    }
  });

  // ── 3. 매장 판매지원 첫 화면 (§8) ─────────────────────────────────────────
  /**
   * Pilot 성공 화면. 각 기능 본체 연결은 이번 범위 밖이며(§14), 이 화면이 200 이면
   * "Cafe24 회원 로그인 → identity 확인 → provisioning → 매장 진입" 이 성립한 것이다.
   */
  router.get('/store/support', async (req: Request, res: Response) => {
    const cfg = loadCafe24MemberAuthConfig();
    if (!cfg) return res.status(503).json(CREDENTIALS_MISSING);

    const session = readSession(req, cfg.clientSecret);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Cafe24 회원 로그인이 필요합니다',
        code: 'CAFE24_B2B_SESSION_REQUIRED',
      });
    }

    // 매장 표시 정보는 세션이 아니라 DB(SSOT)에서 읽는다 — 쿠키에 매장명을 담지 않는다.
    const rows = await dataSource.query(
      `SELECT o.name AS store_name,
              o.code AS store_code,
              (SELECT s.slug FROM platform_store_slugs s
                WHERE s.store_id = o.id AND s.service_key = 'cafe24-b2b' AND s.is_active = true
                LIMIT 1) AS slug
         FROM organizations o
        WHERE o.id = $1
        LIMIT 1`,
      [session.organizationId],
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '매장을 찾을 수 없습니다',
        code: 'CAFE24_B2B_STORE_NOT_FOUND',
      });
    }
    const store = rows[0];

    const capabilityRows = await dataSource.query(
      `SELECT capability_key, enabled FROM store_capabilities
        WHERE organization_id = $1 AND source = 'cafe24-b2b'
        ORDER BY capability_key`,
      [session.organizationId],
    );

    const items: Array<{ key: string; label: string; desc: string }> = [
      { key: 'LIBRARY', label: 'O4O 설명서', desc: 'O4O 가 제공하는 제품 설명서를 매장에서 그대로 사용합니다' },
      { key: 'LIBRARY', label: '내 설명서', desc: '매장이 직접 만든 설명서를 보관·관리합니다' },
      { key: 'QR_MARKETING', label: 'QR', desc: '설명서를 QR 로 연결해 매대·포장에 붙입니다' },
      { key: 'TABLET', label: 'Tablet', desc: '매장 태블릿으로 제품 정보를 보여줍니다' },
      { key: 'SIGNAGE', label: 'Digital Signage', desc: '매장 화면에 제품 콘텐츠를 재생합니다' },
    ];
    const enabled = new Set(
      (Array.isArray(capabilityRows) ? capabilityRows : [])
        .filter((c: { enabled: boolean }) => c.enabled)
        .map((c: { capability_key: string }) => c.capability_key),
    );

    const cards = items
      .map(
        (it) => `
      <li class="card${enabled.has(it.key) ? '' : ' off'}">
        <div class="card-title">${escapeHtml(it.label)}</div>
        <div class="card-desc">${escapeHtml(it.desc)}</div>
        <div class="card-state">${enabled.has(it.key) ? '이용 가능' : '준비 중'}</div>
      </li>`,
      )
      .join('');

    const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>매장 판매지원</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; padding:32px 20px; font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif; line-height:1.6; }
  .wrap { max-width:760px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  .store { font-size:14px; opacity:.7; margin-bottom:28px; }
  ul { list-style:none; padding:0; margin:0; display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); }
  .card { border:1px solid rgba(128,128,128,.35); border-radius:10px; padding:16px; }
  .card.off { opacity:.5; }
  .card-title { font-weight:600; margin-bottom:6px; }
  .card-desc { font-size:13px; opacity:.75; }
  .card-state { font-size:12px; margin-top:10px; opacity:.6; }
  footer { margin-top:40px; padding-top:16px; border-top:1px solid rgba(128,128,128,.25); font-size:12px; opacity:.65; }
  footer div { margin:2px 0; }
</style>
</head>
<body>
<div class="wrap">
  <h1>매장 판매지원</h1>
  <div class="store">${escapeHtml(store.store_name || '')} · ${escapeHtml(store.slug || store.store_code || '')}</div>
  <ul>${cards}</ul>
  <footer>
    <div>Powered by O4O</div>
    <div>매장용 제품설명서 · QR · Tablet · Digital Signage</div>
    <div>O4O 독립 이용 문의: ${escapeHtml(O4O_CONTACT_EMAIL)}</div>
  </footer>
</div>
</body>
</html>`;

    res.status(200).type('html').send(html);
  });

  // ── 4. 세션 요약 (검증용 · read-only) ─────────────────────────────────────
  /** 재로그인 멱등성 실증(§12-10)에서 같은 user/org 가 재사용됐는지 확인하는 데 쓴다. */
  router.get('/session', (req: Request, res: Response) => {
    const cfg = loadCafe24MemberAuthConfig();
    if (!cfg) return res.status(503).json(CREDENTIALS_MISSING);

    const session = readSession(req, cfg.clientSecret);
    if (!session) {
      return res
        .status(401)
        .json({ success: false, error: '세션 없음', code: 'CAFE24_B2B_SESSION_REQUIRED' });
    }
    // member_hash / user_identifier 는 응답에 싣지 않는다 (§4·§10).
    return res.json({
      success: true,
      data: {
        linkId: session.linkId,
        userId: session.userId,
        organizationId: session.organizationId,
        mallId: session.mallId,
        shopNo: session.shopNo,
        expiresAt: new Date(session.exp).toISOString(),
      },
    });
  });

  // ── 5. 로그아웃 ───────────────────────────────────────────────────────────
  /** 상태 변경이므로 POST 다 (CLAUDE.md §8-4). O4O 계정·매장은 남고 세션만 끊는다. */
  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie(CAFE24_B2B_SESSION_COOKIE, { path: CAFE24_B2B_SESSION_COOKIE_OPTIONS.path });
    return res.json({ success: true, data: { loggedOut: true } });
  });

  return router;
}
