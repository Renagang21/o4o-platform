/**
 * Cafe24 OAuth Controller
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §5
 * WO-O4O-CAFE24-OAUTH-CALLBACK-AUTH-BOUNDARY-FIX-V1 (callback 인증 경계)
 *
 * mount: /api/v1/admin/cafe24
 *   GET    /callback?code=&state=       → code 교환 + connection 저장
 *                                         **O4O 로그인 밖** · 신뢰 근거 = 서명 state
 *   ── 아래는 O4O 관리자 전용 (authenticate + requireRole) ──
 *   GET    /authorize?mallId=&shopNo=   → Cafe24 승인 URL 발급 (리다이렉트 아님, URL 반환)
 *   GET    /connections                 → 연결 목록 (token 미포함)
 *   POST   /connections/:id/refresh     → 강제 갱신 (동작 확인용)
 *   DELETE /connections/:id             → 연결 해제
 *
 * 소유권 결정 없음: 이 라우트는 O4O 관리자만 쓴다. mall 을 어떤 organization/supplier 가
 * 소유하는지는 이번 단계에서 정하지 않는다 (WO §5).
 *
 * 응답·로그에 access/refresh token 을 절대 싣지 않는다 (WO §3).
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';
import { Cafe24ConnectionService, toSummary } from '../services/cafe24-connection.service.js';
import {
  loadCafe24OAuthConfig,
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
} from '../cafe24-oauth.client.js';
import { issueState, verifyState } from '../cafe24-oauth-state.js';
import { isTokenEncryptionConfigured } from '../cafe24-token-crypto.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = ['platform:super_admin', 'neture:admin', 'neture:operator'];

export function createCafe24OAuthController(dataSource: DataSource): Router {
  const router = Router();
  const service = new Cafe24ConnectionService(dataSource);

  // ── 인증 경계 ────────────────────────────────────────────────────────────
  // callback 만 O4O 로그인 앞에 둔다. Cafe24(외부 도메인) 가 브라우저를 되돌려보내는
  // 지점이라 O4O 세션 쿠키가 실린다는 보장이 없다. 대신 **authorize 단계에서 발급한
  // 서명 state 검증**을 신뢰 경계로 쓴다 — 무검증 public 이 아니다.
  // (WO-O4O-CAFE24-OAUTH-CALLBACK-AUTH-BOUNDARY-FIX-V1)
  /** Cafe24 승인 후 redirect 착지점. code → token 교환 후 connection 저장. */
  router.get('/callback', async (req: AuthRequest, res: Response) => {
    const cfg = loadCafe24OAuthConfig();
    if (!cfg) {
      return res.status(503).json({ success: false, error: 'Cafe24 자격정보 미설정', code: 'CAFE24_CREDENTIALS_NOT_CONFIGURED' });
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'code/state 누락', code: 'CAFE24_CALLBACK_INVALID' });
    }

    // 서명·만료·형식을 한 번에 판정한다. 실패 사유는 구분해 노출하지 않는다(정보 최소화).
    const payload = verifyState(cfg.clientSecret, state);
    if (!payload) {
      return res.status(400).json({ success: false, error: 'state 검증 실패', code: 'CAFE24_STATE_INVALID' });
    }

    // Cafe24 가 mall_id 를 덧붙여 보내면 state 의 mall 과 일치해야 한다.
    // code 교환 대상은 언제나 **state 의 mallId** 이며, query 값을 신뢰하지 않는다.
    const claimedMall =
      typeof req.query.mall_id === 'string'
        ? req.query.mall_id.trim()
        : typeof req.query.mallId === 'string'
          ? req.query.mallId.trim()
          : '';
    if (claimedMall && claimedMall !== payload.mallId) {
      logger.warn(`[cafe24] callback mall mismatch state=${payload.mallId} query=${claimedMall}`);
      return res.status(400).json({ success: false, error: 'mall 불일치', code: 'CAFE24_STATE_MALL_MISMATCH' });
    }

    try {
      const token = await exchangeAuthorizationCode(cfg, payload.mallId, code);
      const conn = await service.upsertFromTokenResponse(token, {
        mallId: payload.mallId,
        shopNo: payload.shopNo,
        // callback 은 인증 경계 밖이므로 req.user 가 없다.
        // authorize 를 시작한 관리자 id 를 state 에서 가져온다 (attribution 전용).
        connectedByUserId: payload.uid ?? null,
      });
      logger.info(`[cafe24] connection established mall=${conn.mallId} shop=${conn.shopNo}`);
      return res.json({ success: true, data: toSummary(conn) });
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown';
      logger.error(`[cafe24] callback failed mall=${payload.mallId} reason=${reason}`);
      return res.status(502).json({ success: false, error: 'Cafe24 token 교환 실패', code: reason });
    }
  });

  // callback 을 제외한 나머지 관리 route 는 인증 없이 노출되지 않게 가둔다 (CLAUDE.md §8).
  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  /** 승인 URL 발급. 실제 이동은 클라이언트가 한다(관리자 브라우저). */
  router.get('/authorize', (req: AuthRequest, res: Response) => {
    const cfg = loadCafe24OAuthConfig();
    if (!cfg) {
      return res.status(503).json({
        success: false,
        error: 'Cafe24 자격정보가 설정되지 않았습니다 (CAFE24_CLIENT_ID/SECRET/REDIRECT_URI)',
        code: 'CAFE24_CREDENTIALS_NOT_CONFIGURED',
      });
    }

    // callback 에서 실패하기 전에 미리 막는다 — 약한 기본 키로 token 을 저장하지 않는다.
    if (!isTokenEncryptionConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'ENCRYPTION_KEY 가 설정되지 않아 token 을 안전하게 저장할 수 없습니다',
        code: 'CAFE24_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED',
      });
    }

    const mallId = typeof req.query.mallId === 'string' ? req.query.mallId.trim() : '';
    const shopNo = Number(req.query.shopNo ?? 1) || 1;
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(mallId)) {
      return res.status(400).json({ success: false, error: 'mallId 형식이 올바르지 않습니다', code: 'INVALID_MALL_ID' });
    }

    try {
      const state = issueState(cfg.clientSecret, mallId, shopNo, req.user?.id ?? null);
      return res.json({
        success: true,
        data: { authorizeUrl: buildAuthorizeUrl(cfg, mallId, state), mallId, shopNo, scopes: cfg.scopes },
      });
    } catch (e) {
      logger.error('[cafe24] authorize URL build failed', e);
      return res.status(400).json({ success: false, error: 'authorize URL 생성 실패', code: 'CAFE24_AUTHORIZE_FAILED' });
    }
  });

  router.get('/connections', async (_req: AuthRequest, res: Response) => {
    const rows = await service.list();
    return res.json({ success: true, data: rows.map(toSummary) });
  });

  /** 갱신 동작 확인용. 성공해도 token 은 응답하지 않는다. */
  router.post('/connections/:id/refresh', async (req: AuthRequest, res: Response) => {
    const target = await service.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ success: false, error: '연결을 찾을 수 없습니다', code: 'CAFE24_CONNECTION_NOT_FOUND' });
    }
    try {
      await service.getUsableAccessToken(target);
      const reloaded = await service.findById(target.id);
      return res.json({ success: true, data: reloaded ? toSummary(reloaded) : null });
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown';
      return res.status(502).json({ success: false, error: 'token 갱신 실패', code: reason });
    }
  });

  router.delete('/connections/:id', async (req: AuthRequest, res: Response) => {
    await service.disconnect(req.params.id);
    return res.json({ success: true, data: { id: req.params.id, status: 'DISCONNECTED' } });
  });

  return router;
}
