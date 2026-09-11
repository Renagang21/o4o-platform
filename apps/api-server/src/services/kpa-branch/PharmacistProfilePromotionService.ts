/**
 * PharmacistProfilePromotionService — 분회 가입 정보를 약사 canonical profile 로 승격
 * WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1
 *
 * `kpa_pharmacist_profiles` 가 면허번호·직역의 canonical SSOT 다. auth-core(`modules/auth`,
 * `createKpaRecords`)는 kpa-society 가입에서만 이 행을 만들므로, kpa-branch 로 직접 가입한
 * 회원은 여기(Extension 경계)에서 profile 을 만든다. 이 파일이 분회 축에서 profile 을
 * **생성**하는 유일한 지점이다 (신상신고 sync 는 있는 값을 갱신하는 별도 경계).
 *
 * 규칙:
 *   1) 없으면 만든다 (`license_verified=false` — 검증은 별도 행위다).
 *   2) 있으면 보존한다. 이미 값이 있는 컬럼은 덮어쓰지 않고, 비어 있는 컬럼만 채운다.
 *   3) 면허번호가 **다른 사용자의 profile** 에 이미 있으면 자동 overwrite/탈취하지 않는다.
 *      그 경우 면허번호는 비운 채 진행하고 `licenseConflict=true` 로 알린다.
 *   4) `kpa_members` 에는 아무것도 쓰지 않는다.
 *   5) 실패해도 호출자의 본 작업(가입·승인·전입)을 되돌리지 않는다 — best-effort 이며
 *      결과를 응답/로그에 남겨 운영자가 콘솔에서 보완할 수 있게 한다.
 *
 * 호출 지점: BranchJoinController.apply(가입) · BranchServiceMembershipController.approve(승인) ·
 * BranchMemberController.join(분회 전입). 세 곳 모두 멱등이다.
 */
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';

/** DTO(register.dto.ts)·2026 신상신고 양식 `employment.activityType` 과 같은 11종 코드계 */
export const KPA_ACTIVITY_TYPES = new Set([
  'pharmacy_owner', 'pharmacy_employee', 'hospital', 'manufacturer', 'importer',
  'wholesaler', 'other_industry', 'government', 'school', 'other', 'inactive',
]);

export const LICENSE_NUMBER_MAX = 100;

export interface ProfilePromotionResult {
  profileId: string | null;
  /** 이번 호출이 profile 행을 새로 만들었는가 */
  created: boolean;
  /** 이번 호출로 채워진 컬럼 */
  filled: Array<'license_number' | 'activity_type'>;
  /** 요청 면허번호가 다른 사용자의 profile 에 있어 반영하지 않았다 */
  licenseConflict: boolean;
  /** 현재(호출 후) profile 값 */
  licenseNumber: string | null;
  activityType: string | null;
}

export class PharmacistProfilePromotionService {
  static normalizeLicense(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s || s.length > LICENSE_NUMBER_MAX) return null;
    return s;
  }

  static normalizeActivityType(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return KPA_ACTIVITY_TYPES.has(s) ? s : null;
  }

  /**
   * 사용자의 profile 을 보장하고 비어 있는 면허번호·직역을 채운다.
   * 값이 하나도 없어도 profile 행은 만든다 — 콘솔·신상신고가 "profile 없음" 이 아니라
   * "면허번호 미입력" 으로 상태를 보이게 하기 위해서다.
   */
  static async ensureProfile(params: {
    userId: string;
    licenseNumber?: unknown;
    activityType?: unknown;
  }): Promise<ProfilePromotionResult> {
    const { userId } = params;
    const wantLicense = this.normalizeLicense(params.licenseNumber);
    const wantActivity = this.normalizeActivityType(params.activityType);

    return AppDataSource.transaction(async (manager) => {
      const existing: Array<{ id: string; license_number: string | null; activity_type: string | null }> =
        await manager.query(
          `SELECT id, license_number, activity_type
             FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1 FOR UPDATE`,
          [userId],
        );
      const cur = existing[0] ?? null;

      const filled: ProfilePromotionResult['filled'] = [];
      let licenseConflict = false;

      let nextLicense = cur?.license_number ?? null;
      if (!nextLicense && wantLicense) {
        // 다른 사용자의 canonical 면허번호를 자동으로 가져오지 않는다 (규칙 3)
        const taken: Array<{ user_id: string }> = await manager.query(
          `SELECT user_id FROM kpa_pharmacist_profiles
            WHERE license_number = $1 AND user_id <> $2 LIMIT 1`,
          [wantLicense, userId],
        );
        if (taken.length) {
          licenseConflict = true;
        } else {
          nextLicense = wantLicense;
          filled.push('license_number');
        }
      }

      let nextActivity = cur?.activity_type ?? null;
      if (!nextActivity && wantActivity) {
        nextActivity = wantActivity;
        filled.push('activity_type');
      }

      let profileId = cur?.id ?? null;
      let created = false;
      if (!cur) {
        const ins: Array<{ id: string }> = await manager.query(
          `INSERT INTO kpa_pharmacist_profiles (user_id, license_number, license_verified, activity_type)
           VALUES ($1, $2, false, $3)
           ON CONFLICT (user_id) DO NOTHING
           RETURNING id`,
          [userId, nextLicense, nextActivity],
        );
        if (ins[0]) {
          profileId = ins[0].id;
          created = true;
        } else {
          // 동시 생성 경합 — 이미 만들어진 행을 보존한다
          const again: Array<{ id: string }> = await manager.query(
            `SELECT id FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
            [userId],
          );
          profileId = again[0]?.id ?? null;
          filled.length = 0;
        }
      } else if (filled.length) {
        await manager.query(
          `UPDATE kpa_pharmacist_profiles
              SET license_number = $2, activity_type = $3, updated_at = now()
            WHERE id = $1`,
          [cur.id, nextLicense, nextActivity],
        );
      }

      if (licenseConflict) {
        logger.warn('[PharmacistProfilePromotion] license number already held by another profile — not applied', {
          userId,
          profileId,
        });
      }

      return {
        profileId,
        created,
        filled,
        licenseConflict,
        licenseNumber: nextLicense,
        activityType: nextActivity,
      };
    });
  }

  /**
   * 가입 시 core 가 `users.businessInfo.licenseNumber` 에 남긴 값을 profile 로 승격한다.
   * 승인·전입 시점에 호출한다 — 이 WO 이전에 가입해 profile 이 없는 회원의 backfill 경로다.
   * 명시 값(licenseNumber/activityType)이 오면 businessInfo 보다 우선한다.
   */
  static async promoteFromUser(params: {
    userId: string;
    licenseNumber?: unknown;
    activityType?: unknown;
  }): Promise<ProfilePromotionResult | null> {
    try {
      let license = this.normalizeLicense(params.licenseNumber);
      if (!license) {
        const rows: Array<{ license: unknown }> = await AppDataSource.query(
          `SELECT "businessInfo"->>'licenseNumber' AS license FROM users WHERE id = $1 LIMIT 1`,
          [params.userId],
        );
        license = this.normalizeLicense(rows[0]?.license);
      }
      return await this.ensureProfile({
        userId: params.userId,
        licenseNumber: license,
        activityType: params.activityType,
      });
    } catch (error) {
      // 본 작업(승인·전입)은 이미 끝났다 — 승격 실패로 되돌리지 않는다 (규칙 5)
      logger.error('[PharmacistProfilePromotion] promotion failed (best-effort)', {
        userId: params.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
