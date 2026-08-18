/**
 * Cafe24ConnectionService
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §4·§5
 *
 * cafe24_connections 원장 관리 + access token 확보(만료 시 자동 refresh).
 *
 * 불변식:
 *   1. token 은 저장 전 반드시 encrypt() — 평문 저장 경로를 만들지 않는다.
 *   2. refresh 는 access/refresh/만료시각을 **한 UPDATE 로** 교체한다
 *      (Cafe24 가 기존 refresh token 을 폐기하므로 부분 저장 시 연결이 죽는다).
 *   3. 어떤 로그·에러 메시지에도 token 값을 넣지 않는다.
 */

import type { DataSource, Repository } from 'typeorm';
import { Cafe24Connection } from '../entities/Cafe24Connection.entity.js';
import type { Cafe24ConnectionStatus } from '../entities/Cafe24Connection.entity.js';
import { encrypt, decrypt } from '../../../utils/crypto.js';
import { assertTokenEncryptionConfigured } from '../cafe24-token-crypto.js';
import { loadCafe24OAuthConfig, refreshAccessToken } from '../cafe24-oauth.client.js';
import type { Cafe24TokenResponse } from '../cafe24-oauth.client.js';
import logger from '../../../utils/logger.js';

/** access token 이 이 시간 안에 만료되면 미리 갱신한다 */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

/** 외부 노출용 요약 — token 은 절대 포함하지 않는다 */
export interface Cafe24ConnectionSummary {
  id: string;
  mallId: string;
  shopNo: number;
  status: Cafe24ConnectionStatus;
  scopes: string[];
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  lastRefreshedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toSummary(c: Cafe24Connection): Cafe24ConnectionSummary {
  return {
    id: c.id,
    mallId: c.mallId,
    shopNo: c.shopNo,
    status: c.status,
    scopes: c.scopes || [],
    accessTokenExpiresAt: c.accessTokenExpiresAt?.toISOString?.() ?? String(c.accessTokenExpiresAt),
    refreshTokenExpiresAt: c.refreshTokenExpiresAt?.toISOString?.() ?? String(c.refreshTokenExpiresAt),
    lastRefreshedAt: c.lastRefreshedAt ? c.lastRefreshedAt.toISOString() : null,
    lastError: c.lastError,
    createdAt: c.createdAt?.toISOString?.() ?? String(c.createdAt),
    updatedAt: c.updatedAt?.toISOString?.() ?? String(c.updatedAt),
  };
}

export class Cafe24ConnectionService {
  private readonly repo: Repository<Cafe24Connection>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(Cafe24Connection);
  }

  async list(): Promise<Cafe24Connection[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Cafe24Connection | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByMall(mallId: string, shopNo = 1): Promise<Cafe24Connection | null> {
    return this.repo.findOne({ where: { mallId, shopNo } });
  }

  /**
   * token 응답을 연결로 저장한다 (재승인 시 같은 (mall, shop) 행을 덮어쓴다).
   */
  async upsertFromTokenResponse(
    token: Cafe24TokenResponse,
    opts: { mallId: string; shopNo?: number; connectedByUserId?: string | null },
  ): Promise<Cafe24Connection> {
    // 약한 기본 키로 token 을 저장하지 않는다 (fail-closed)
    assertTokenEncryptionConfigured();

    const mallId = token.mall_id || opts.mallId;
    const shopNo = opts.shopNo ?? Number(token.shop_no ?? 1) ?? 1;

    const existing = await this.findByMall(mallId, shopNo);
    const patch: Partial<Cafe24Connection> = {
      mallId,
      shopNo,
      accessTokenEnc: encrypt(token.access_token),
      refreshTokenEnc: encrypt(token.refresh_token),
      accessTokenExpiresAt: new Date(token.expires_at),
      refreshTokenExpiresAt: new Date(token.refresh_token_expires_at),
      scopes: token.scopes ?? [],
      status: 'ACTIVE',
      lastError: null,
      lastRefreshedAt: new Date(),
      connectedByUserId: opts.connectedByUserId ?? existing?.connectedByUserId ?? null,
    };

    if (existing) {
      await this.repo.update({ id: existing.id }, patch);
      const reloaded = await this.repo.findOne({ where: { id: existing.id } });
      return reloaded as Cafe24Connection;
    }
    return this.repo.save(this.repo.create(patch));
  }

  /**
   * 유효한 access token(평문)을 반환한다. 필요하면 refresh 한다.
   * 반환값은 호출 즉시 사용하고 저장·로깅하지 않는다.
   */
  async getUsableAccessToken(connection: Cafe24Connection): Promise<string> {
    if (connection.status === 'DISCONNECTED') {
      throw new Error('CAFE24_CONNECTION_DISCONNECTED');
    }

    const now = Date.now();
    const accessExp = new Date(connection.accessTokenExpiresAt).getTime();
    if (accessExp - REFRESH_SKEW_MS > now) {
      return decrypt(connection.accessTokenEnc);
    }

    const refreshExp = new Date(connection.refreshTokenExpiresAt).getTime();
    if (refreshExp <= now) {
      await this.markStatus(connection.id, 'EXPIRED', 'refresh token expired — 재승인 필요');
      throw new Error('CAFE24_REFRESH_TOKEN_EXPIRED');
    }

    const cfg = loadCafe24OAuthConfig();
    if (!cfg) throw new Error('CAFE24_CREDENTIALS_NOT_CONFIGURED');
    // 갱신 결과도 저장 대상이므로 동일 전제를 요구한다
    assertTokenEncryptionConfigured();

    try {
      const token = await refreshAccessToken(cfg, connection.mallId, decrypt(connection.refreshTokenEnc));
      // 원자적 교체 — access/refresh/만료를 한 UPDATE 로 함께 쓴다.
      await this.repo.update(
        { id: connection.id },
        {
          accessTokenEnc: encrypt(token.access_token),
          refreshTokenEnc: encrypt(token.refresh_token),
          accessTokenExpiresAt: new Date(token.expires_at),
          refreshTokenExpiresAt: new Date(token.refresh_token_expires_at),
          scopes: token.scopes ?? connection.scopes,
          status: 'ACTIVE',
          lastError: null,
          lastRefreshedAt: new Date(),
        },
      );
      logger.info(`[cafe24] token refreshed mall=${connection.mallId} shop=${connection.shopNo}`);
      return token.access_token;
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown';
      await this.markStatus(connection.id, 'ERROR', `refresh 실패: ${reason}`);
      throw e;
    }
  }

  async markStatus(id: string, status: Cafe24ConnectionStatus, lastError: string | null): Promise<void> {
    await this.repo.update({ id }, { status, lastError });
  }

  /**
   * 연결 해제. token 은 즉시 사용 불가 상태로 만들되 행은 이력으로 남긴다.
   * (Cafe24 는 앱 삭제/재승인으로 실제 폐기가 이뤄지므로 O4O 측은 상태만 정리한다.)
   */
  async disconnect(id: string): Promise<void> {
    await this.repo.update(
      { id },
      { status: 'DISCONNECTED', lastError: null },
    );
  }
}
