/**
 * ServiceJoinService — Google-only 시대의 서비스 가입 write-path SSOT
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1
 *
 * 전환 전: 서비스 가입 = `AuthRegisterController.register`
 *   (email + password 로 users 를 만들고 service_memberships + service_credentials 를 함께 생성)
 * 전환 후: 서비스 가입 = **이미 Google 로 인증된 users.id 에 membership 을 다는 일**
 *
 * 따라서 이 경로는
 *   - users 를 만들지 않는다 (신규 계정은 `POST /auth/google/signup` 하나뿐이다)
 *   - credential 을 만들지 않는다 (password 축이 없다)
 *   - email 로 사용자를 찾지 않는다 (Identity Key 는 session 의 users.id 다)
 *   - status 는 항상 'pending' 이다 (운영자 승인 전 active 금지)
 *
 * 축 분리(불변): users(Identity) / service_memberships(서비스 접근) /
 * role_assignments(권한) / 서비스별 profile(자격·사업자). 이 서비스는 두 번째 축만 쓴다.
 */
import { AppDataSource } from '../../database/connection.js';
import { User } from '../../modules/auth/entities/User.js';
import logger from '../../utils/logger.js';

/** 이미 가입 이력이 있을 때 호출부가 서비스별 문구로 분기할 수 있도록 상태를 그대로 돌려준다. */
export type ExistingMembershipStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'withdrawn';

export type ServiceJoinResult =
  | { outcome: 'created'; status: 'pending' }
  | { outcome: 'reapplied'; status: 'pending' }
  | { outcome: 'duplicate'; status: ExistingMembershipStatus };

export interface ServiceJoinInput {
  /** 인증된 세션의 users.id — 호출부가 requireAuth 로 확보한다. email 로 찾지 않는다. */
  userId: string;
  serviceKey: string;
  /** service_memberships.role. 자가 신청 가능한 역할만 호출부가 허용한다. */
  role: string;
  /**
   * 가입 신청과 함께 받은 사업자/연락 정보. 기존 users 행의 비어 있는 칸만 채운다.
   * 이미 값이 있으면 덮어쓰지 않는다 (가입 신청이 프로필을 지우면 안 된다).
   */
  profile?: Record<string, unknown>;
}

/** 재신청을 허용하는 상태 — 정책은 서비스별 호출부가 좁힐 수 있다. */
const REAPPLIABLE: ReadonlySet<string> = new Set(['rejected', 'suspended']);

export class ServiceJoinService {
  /**
   * 인증된 사용자를 해당 서비스에 pending 으로 가입 신청시킨다.
   *
   * 반환값이 `duplicate` 면 호출부가 서비스별 409 문구로 응답한다.
   * 이 서비스는 문구를 알지 않는다 (Extension 경계 유지).
   */
  static async apply(input: ServiceJoinInput): Promise<ServiceJoinResult> {
    const { userId, serviceKey, role } = input;

    const existing: { id: string; status: string }[] = await AppDataSource.query(
      `SELECT id, status FROM service_memberships WHERE user_id = $1 AND service_key = $2 LIMIT 1`,
      [userId, serviceKey],
    );

    if (existing.length > 0) {
      const current = existing[0];
      if (!REAPPLIABLE.has(current.status)) {
        return { outcome: 'duplicate', status: current.status as ExistingMembershipStatus };
      }
      // rejected / suspended → pending 재신청. active 직접 전환은 금지다.
      await AppDataSource.query(
        `UPDATE service_memberships
            SET status = 'pending', role = $2, updated_at = NOW()
          WHERE id = $1`,
        [current.id, role],
      );
      await ServiceJoinService.fillMissingProfile(input);
      logger.info('[ServiceJoin] membership reapplied', { serviceKey, role });
      return { outcome: 'reapplied', status: 'pending' };
    }

    await AppDataSource.query(
      `INSERT INTO service_memberships (user_id, service_key, status, role, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, NOW(), NOW())`,
      [userId, serviceKey, role],
    );
    await ServiceJoinService.fillMissingProfile(input);
    logger.info('[ServiceJoin] membership created', { serviceKey, role });
    return { outcome: 'created', status: 'pending' };
  }

  /**
   * users 행의 **비어 있는 칸만** 채운다. 기존 값은 유지한다.
   * businessInfo 는 JSON 이므로 기존 키를 보존한 채 없는 키만 더한다.
   */
  private static async fillMissingProfile(input: ServiceJoinInput): Promise<void> {
    const profile = input.profile;
    if (!profile || Object.keys(profile).length === 0) return;

    try {
      const repo = AppDataSource.getRepository(User);
      const user = await repo.findOne({ where: { id: input.userId } });
      if (!user) return;

      const existingBusiness = (user.businessInfo ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...existingBusiness };
      let changed = false;

      for (const [key, value] of Object.entries(profile)) {
        if (value === undefined || value === null || value === '') continue;
        if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
          merged[key] = value;
          changed = true;
        }
      }

      if (changed) {
        user.businessInfo = merged as typeof user.businessInfo;
        await repo.save(user);
      }
    } catch (error) {
      // 프로필 보강 실패가 가입 신청 자체를 실패시키지 않는다 (best-effort).
      logger.error('[ServiceJoin] profile fill failed (best-effort)', {
        serviceKey: input.serviceKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
