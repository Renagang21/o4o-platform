/**
 * Self Profile Controller — 플랫폼 공통 ACCOUNT_CORE 자기 수정 계약
 *
 * WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1
 *
 *   GET   /api/v1/users/me/profile
 *   PATCH /api/v1/users/me/profile
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * canonical 판정 (WO §5 — B안)
 *   `PUT /api/v1/users/profile` 은 users.routes.ts 에 라우트로 등록된 적이 없다.
 *   구현은 modules/user/controllers/user.controller.ts 에 남아 있으나 mount 되지
 *   않았고, `/profile` 은 requireAdmin 뒤의 admin 전용 `PUT /:id` (param isUUID)
 *   에 걸려 비관리자 403 / 관리자 400 이 된다. 즉 literal 과 param 이 충돌한다.
 *   반면 살아 있는 self 축 관례는 `/users/me/contact` 다.
 *   → `/users/me/profile` 을 canonical 로 신설한다.
 *
 * 보안 계약 (WO §6)
 *   authenticate → req.user.id → allowlist validation → 자기 users row 만 update.
 *   대상 사용자는 **항상 인증 사용자 자신**이다. body/path 의 어떤 값으로도 다른
 *   사용자를 지목할 수 없다 (userId/id/email 은 allowlist 밖 → 400).
 *   requireAdmin·role 분기·serviceKey 로 owner 결정·businessInfo spread merge·
 *   임의 JSON 전체 update 는 하지 않는다.
 *   UPDATE 문은 allowlist 컬럼만 명시적으로 조립하며, 값은 전부 파라미터 바인딩한다.
 *
 * 필드 ownership (WO §7)
 *   여기서 다루는 것은 ACCOUNT_CORE(users) 뿐이다.
 *   membership/role · service_credentials · 직역/면허 · organizations ·
 *   businessInfo 는 각자의 기존 계약이 담당한다. 섞지 않는다.
 */
import type { Response } from 'express';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';

/** ACCOUNT_CORE 자기 수정 allowlist. 이 목록 밖은 어떤 경우에도 write 되지 않는다. */
export const SELF_PROFILE_EDITABLE_FIELDS = [
  'name',
  'firstName',
  'lastName',
  'nickname',
  'phone',
] as const;

export type SelfProfileEditableField = (typeof SELF_PROFILE_EDITABLE_FIELDS)[number];

/** users 컬럼 길이 제약 (User entity 기준). */
const MAX_LENGTH: Record<SelfProfileEditableField, number> = {
  name: 200,
  firstName: 100,
  lastName: 100,
  nickname: 100,
  phone: 20,
};

interface SelfProfileRow {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  phone: string | null;
  avatar: string | null;
  status: string | null;
  createdAt: Date | null;
}

function view(row: SelfProfileRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname,
    displayName: row.name,
    phone: row.phone,
    avatar: row.avatar,
    status: row.status,
    createdAt: row.createdAt,
    // 화면은 역할 하드코딩이 아니라 이 목록으로 편집 가능 여부를 판단한다.
    editableFields: [...SELF_PROFILE_EDITABLE_FIELDS],
  };
}

async function loadSelfProfile(userId: string): Promise<SelfProfileRow | null> {
  const rows: SelfProfileRow[] = await AppDataSource.query(
    `SELECT id, email, name, "firstName", "lastName", nickname, phone, avatar, status, "createdAt"
       FROM users
      WHERE id = $1::uuid
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** 공백만 들어온 값은 NULL 로 정리한다. 문자열이 아니면 undefined (=검증 실패). */
function normalizeText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class SelfProfileController {
  /** GET /api/v1/users/me/profile */
  static async getSelfProfile(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다.', code: 'UNAUTHORIZED' });
      return;
    }

    try {
      const row = await loadSelfProfile(userId);
      if (!row) {
        res.status(404).json({ success: false, error: '계정을 찾을 수 없습니다.', code: 'ACCOUNT_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: view(row) });
    } catch (error) {
      logger.error('[SelfProfileController.getSelfProfile] failed', { userId, error });
      res.status(500).json({
        success: false,
        error: '계정 정보를 불러오지 못했습니다.',
        code: 'ACCOUNT_LOAD_FAILED',
      });
    }
  }

  /** PATCH /api/v1/users/me/profile */
  static async updateSelfProfile(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다.', code: 'UNAUTHORIZED' });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ success: false, error: '요청 본문이 올바르지 않습니다.', code: 'INVALID_BODY' });
      return;
    }

    // allowlist 밖 필드는 조용히 무시하지 않고 거부한다.
    // (userId/id/email/roles/status/businessInfo 등 권한·경계 우회 시도 차단)
    const unknown = Object.keys(body).filter(
      (key) => !(SELF_PROFILE_EDITABLE_FIELDS as readonly string[]).includes(key),
    );
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

    for (const field of SELF_PROFILE_EDITABLE_FIELDS) {
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
      // name 은 NOT NULL 컬럼이다 (표시명 정본).
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
      // WHERE 는 항상 인증 사용자 자신. 다른 row 는 어떤 입력으로도 대상이 될 수 없다.
      params.push(userId);
      await AppDataSource.query(
        `UPDATE users SET ${sets.join(', ')}, "updatedAt" = NOW() WHERE id = $${params.length}::uuid`,
        params,
      );
      logger.info('[SelfProfileController.updateSelfProfile] updated', {
        userId,
        fields: sets.length,
      });

      const after = await loadSelfProfile(userId);
      if (!after) {
        res.status(404).json({ success: false, error: '계정을 찾을 수 없습니다.', code: 'ACCOUNT_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data: view(after) });
    } catch (error) {
      logger.error('[SelfProfileController.updateSelfProfile] failed', { userId, error });
      res.status(500).json({
        success: false,
        error: '계정 정보를 저장하지 못했습니다.',
        code: 'ACCOUNT_UPDATE_FAILED',
      });
    }
  }
}

export default SelfProfileController;
