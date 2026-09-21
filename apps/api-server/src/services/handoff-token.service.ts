/**
 * Handoff Token Service
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * WO-O4O-REDIS-SESSIONSYNC-REMOVAL-AND-MEMORYSTORE-DECOMMISSION-V1 §1 (Redis → PostgreSQL)
 *
 * PostgreSQL-based, single-use, short-lived token for cross-domain SSO handoff.
 *
 * Flow:
 * 1. Source service calls generateToken() → stores in handoff_tokens (60s TTL)
 * 2. Browser redirects to target service with token in URL
 * 3. Target service calls exchangeToken() → consumes the row (single-use)
 * 4. Target service receives userId, generates auth tokens for target domain
 *
 * 단일 사용 보장은 조건부 UPDATE ... RETURNING 의 원자성으로 확보한다.
 * (Redis GET + DEL 2-step 대비 경쟁 조건에 강하다.)
 *
 * WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-2 (2026-09-21):
 *   토큰은 두 형태 중 정확히 하나다 (DB CHECK 가 강제).
 *     SERVICE   HANDOFF: targetServiceKey (catalog 서비스) — 기존 동작 불변
 *     WORKSPACE HANDOFF: targetWorkspace = 'store' (store.neture.co.kr · 서비스 아님 · 가짜 serviceKey 0)
 *   별도 토큰 시스템을 만들지 않고 같은 행·같은 원자 consume 을 재사용한다.
 */

import { AppDataSource } from '../database/connection.js';
import { getService } from '../config/service-catalog.js';
import logger from '../utils/logger.js';

/** 현재 허용되는 workspace handoff 대상. DB CHECK(`CHK_handoff_tokens_target_kind`)와 1:1. */
export const HANDOFF_WORKSPACES = ['store'] as const;
export type HandoffWorkspace = (typeof HANDOFF_WORKSPACES)[number];

export function isHandoffWorkspace(value: unknown): value is HandoffWorkspace {
  return typeof value === 'string' && (HANDOFF_WORKSPACES as readonly string[]).includes(value);
}

export interface HandoffTokenPayload {
  userId: string;
  sourceServiceKey: string;
  /** SERVICE HANDOFF 일 때만 존재 */
  targetServiceKey?: string;
  /** WORKSPACE HANDOFF 일 때만 존재 */
  targetWorkspace?: HandoffWorkspace;
  createdAt: string;
}

export type HandoffTarget =
  | { kind: 'service'; targetServiceKey: string }
  | { kind: 'workspace'; targetWorkspace: HandoffWorkspace };

class HandoffTokenService {
  private static instance: HandoffTokenService;
  private readonly TOKEN_TTL = 60; // 60 seconds

  static getInstance(): HandoffTokenService {
    if (!HandoffTokenService.instance) {
      HandoffTokenService.instance = new HandoffTokenService();
    }
    return HandoffTokenService.instance;
  }

  /**
   * Generate a handoff token for cross-service navigation
   *
   * @param userId - User ID requesting the handoff
   * @param sourceServiceKey - Service key the user is coming from
   * @param target - 대상: catalog serviceKey(문자열 · 기존 호출 호환) 또는 HandoffTarget
   * @returns Token string (UUID)
   */
  async generateToken(
    userId: string,
    sourceServiceKey: string,
    target: string | HandoffTarget,
  ): Promise<string> {
    const resolved: HandoffTarget =
      typeof target === 'string' ? { kind: 'service', targetServiceKey: target } : target;

    let targetServiceKey: string | null = null;
    let targetWorkspace: HandoffWorkspace | null = null;
    if (resolved.kind === 'service') {
      // Validate target service exists in catalog
      const targetService = getService(resolved.targetServiceKey);
      if (!targetService) {
        throw new Error(`Unknown target service: ${resolved.targetServiceKey}`);
      }
      targetServiceKey = resolved.targetServiceKey;
    } else {
      if (!isHandoffWorkspace(resolved.targetWorkspace)) {
        throw new Error(`Unknown target workspace: ${String(resolved.targetWorkspace)}`);
      }
      targetWorkspace = resolved.targetWorkspace;
    }

    const rows: Array<{ id: string }> = await AppDataSource.query(
      `INSERT INTO handoff_tokens
         (user_id, source_service_key, target_service_key, target_workspace, expires_at)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' seconds')::interval)
       RETURNING id`,
      [userId, sourceServiceKey, targetServiceKey, targetWorkspace, String(this.TOKEN_TTL)],
    );

    const tokenId = rows?.[0]?.id;
    if (!tokenId) {
      throw new Error('Failed to store handoff token');
    }

    // 만료 레코드 정리 (60초 TTL · 저빈도 기능이므로 별도 스케줄러 불필요)
    void this.pruneExpired();

    logger.info('[Handoff] Token generated', {
      tokenId,
      userId,
      sourceServiceKey,
      targetServiceKey,
      targetWorkspace,
      ttl: this.TOKEN_TTL,
    });

    return tokenId;
  }

  /**
   * Exchange (consume) a handoff token — single-use
   *
   * @param tokenId - The handoff token to exchange
   * @returns Payload if valid, null if expired or already used
   */
  async exchangeToken(tokenId: string): Promise<HandoffTokenPayload | null> {
    // UUID 가 아니면 캐스팅 에러가 나므로 사전 차단
    if (!/^[0-9a-fA-F-]{36}$/.test(tokenId)) {
      logger.warn('[Handoff] Malformed token', { tokenId });
      return null;
    }

    // 조건부 UPDATE 로 원자적 선점 — 동시 요청 중 하나만 성공한다
    const result = await AppDataSource.query(
      `UPDATE handoff_tokens
          SET consumed_at = now()
        WHERE id = $1
          AND consumed_at IS NULL
          AND expires_at > now()
        RETURNING user_id, source_service_key, target_service_key, target_workspace, created_at`,
      [tokenId],
    );

    // TypeORM 의 UPDATE ... RETURNING 은 [rows, affected] 형태를 반환할 수 있다
    const rows = Array.isArray(result?.[0]) ? result[0] : result;
    const row = rows?.[0];

    if (!row) {
      logger.warn('[Handoff] Token not found, expired, or already used', { tokenId });
      return null;
    }

    const payload: HandoffTokenPayload = {
      userId: row.user_id,
      sourceServiceKey: row.source_service_key,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
    // 두 형태 중 정확히 하나 (DB CHECK) — 행 그대로 payload 에 반영한다
    if (row.target_service_key) {
      payload.targetServiceKey = row.target_service_key;
    } else if (isHandoffWorkspace(row.target_workspace)) {
      payload.targetWorkspace = row.target_workspace;
    } else {
      logger.warn('[Handoff] Token row has no valid target kind', { tokenId });
      return null;
    }

    logger.info('[Handoff] Token exchanged', {
      tokenId,
      userId: payload.userId,
      targetServiceKey: payload.targetServiceKey,
      targetWorkspace: payload.targetWorkspace,
    });

    return payload;
  }

  /** 만료된 토큰 정리 (실패해도 무시 — 발급 경로를 막지 않는다) */
  private async pruneExpired(): Promise<void> {
    try {
      await AppDataSource.query(
        `DELETE FROM handoff_tokens WHERE expires_at < now() - interval '1 hour'`,
      );
    } catch (error) {
      logger.warn('[Handoff] Failed to prune expired tokens (non-critical)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const handoffTokenService = HandoffTokenService.getInstance();
