/**
 * Pharmacy-Hub Account Controller — 내 계정(프로필) 조회·수정
 *
 * WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1  (범위 B)
 *
 *   GET   /api/v1/pharmacy-hub/store-owner/account/profile
 *   PATCH /api/v1/pharmacy-hub/store-owner/account/profile
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 PH service-scoped 엔드포인트인가
 *   공통 `/api/v1/users/*` 는 `/password` 를 제외하면 전부 `router.use(requireAdmin)`
 *   뒤에 있다 (users.routes.ts). 즉 일반 사용자의 프로필 조회·수정 공통 계약이 없고,
 *   `GET /users/profile` 은 admin 전용 `/:id` 에 걸려 403 을 반환한다.
 *   `PUT /api/v1/kpa/mypage/profile` 은 KPA 서비스 전용이라 PH 가 쓸 수 없다.
 *   → 공통 가드 정책을 바꾸지 않고(WO 변경 금지 항목), PH scope 안에서
 *     **users 자기 행만** 다루는 최소 계약을 둔다.
 *
 * SSOT
 *   사용자 프로필  users (name · nickname · phone)
 *   비밀번호       PUT /api/v1/users/password (기존 인증 계약 — 여기서 다루지 않음)
 *   알림           기존 notification 계약
 *
 * 보안 계약
 *   대상 사용자는 **항상 인증 사용자 자신**이다. body 의 어떤 필드로도 다른 사용자를
 *   지목할 수 없다 (userId/id/email 은 allowlist 밖 → 400).
 *   email 변경은 별도 인증 절차 소관이라 이 경로에서 수정하지 않는다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';

const EDITABLE_FIELDS = ['name', 'nickname', 'phone'] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const MAX_LENGTH: Record<EditableField, number> = {
  name: 100,
  nickname: 100,
  phone: 50,
};

interface ProfileRow {
  id: string;
  email: string;
  name: string | null;
  nickname: string | null;
  phone: string | null;
  status: string | null;
}

function view(row: ProfileRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    nickname: row.nickname,
    phone: row.phone,
    status: row.status,
    editableFields: [...EDITABLE_FIELDS],
  };
}

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const rows: ProfileRow[] = await AppDataSource.query(
    `SELECT id, email, name, nickname, phone, status
       FROM users
      WHERE id = $1::uuid
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** 공백만 들어온 값은 NULL 로 정리한다. */
function normalizeText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class PharmacyHubAccountController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다.', code: 'UNAUTHORIZED' });
      return;
    }

    try {
      const row = await loadProfile(userId);
      if (!row) {
        res.status(404).json({ success: false, error: '계정을 찾을 수 없습니다.', code: 'ACCOUNT_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: view(row) });
    } catch (error) {
      logger.error('[PharmacyHubAccountController.getProfile] failed', { userId, error });
      res.status(500).json({
        success: false,
        error: '계정 정보를 불러오지 못했습니다.',
        code: 'ACCOUNT_LOAD_FAILED',
      });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다.', code: 'UNAUTHORIZED' });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ success: false, error: '요청 본문이 올바르지 않습니다.', code: 'INVALID_BODY' });
      return;
    }

    // allowlist 밖 필드는 조용히 무시하지 않고 거부한다 (userId/email 우회 차단 포함).
    const unknown = Object.keys(body).filter((k) => !(EDITABLE_FIELDS as readonly string[]).includes(k));
    if (unknown.length > 0) {
      res.status(400).json({
        success: false,
        error: `수정할 수 없는 항목입니다: ${unknown.join(', ')}`,
        code: 'FIELD_NOT_EDITABLE',
      });
      return;
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    for (const field of EDITABLE_FIELDS) {
      if (!(field in body)) continue;
      const value = normalizeText(body[field]);
      if (value === undefined) {
        res.status(400).json({
          success: false,
          error: `${field} 값이 올바르지 않습니다.`,
          code: 'VALIDATION_FAILED',
        });
        return;
      }
      if (value !== null && value.length > MAX_LENGTH[field]) {
        res.status(400).json({
          success: false,
          error: `${field} 는 ${MAX_LENGTH[field]}자를 넘을 수 없습니다.`,
          code: 'VALIDATION_FAILED',
        });
        return;
      }
      if (field === 'name' && value === null) {
        res.status(400).json({ success: false, error: '이름을 입력해 주세요.', code: 'VALIDATION_FAILED' });
        return;
      }
      params.push(value);
      sets.push(`"${field}" = $${params.length}`);
    }

    if (sets.length === 0) {
      res.status(400).json({ success: false, error: '변경할 항목이 없습니다.', code: 'NO_CHANGES' });
      return;
    }

    try {
      params.push(userId);
      await AppDataSource.query(
        `UPDATE users SET ${sets.join(', ')}, "updatedAt" = NOW() WHERE id = $${params.length}::uuid`,
        params,
      );
      logger.info('[PharmacyHubAccountController.updateProfile] updated', {
        userId,
        fields: sets.length,
      });

      const after = await loadProfile(userId);
      if (!after) {
        res.status(404).json({ success: false, error: '계정을 찾을 수 없습니다.', code: 'ACCOUNT_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: view(after) });
    } catch (error) {
      logger.error('[PharmacyHubAccountController.updateProfile] failed', { userId, error });
      res.status(500).json({
        success: false,
        error: '계정 정보를 저장하지 못했습니다.',
        code: 'ACCOUNT_UPDATE_FAILED',
      });
    }
  }
}

export default PharmacyHubAccountController;
