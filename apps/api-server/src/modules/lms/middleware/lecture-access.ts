/**
 * Lecture Access Guards — WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2
 *
 * LMS runtime 의 유일한 Application Service 는 `O4O 강의 (lecture)` 다.
 * 본 모듈은 LMS 라우터가 쓰는 세 층의 접근 계약을 한 곳에 둔다.
 *
 *   Learner    = service_memberships(service_key='lecture', status='active')  — role 없음
 *   Instructor = active lecture membership + `lecture:instructor`
 *   Operator   = active lecture membership + `lecture:operator` (⊂ `lecture:admin`)
 *   Admin      = active lecture membership + `lecture:admin`
 *
 * 규칙 (WO §6 · §7):
 *   - admin/operator 는 instructor 를 자동 포함하지 않는다 (강의 생성·편집은 강사 계약).
 *   - role 이 있어도 membership 이 없으면 deny (Foundation `createMembershipScopeGuard` 계약).
 *   - `platform:super_admin` break-glass 는 Foundation `LECTURE_SCOPE_CONFIG.platformBypass` 를 따른다.
 *   - KPA / K-Cosmetics / PharmacyHub / legacy `lms:*` role 은 어떤 층에서도 인정하지 않는다.
 *
 * 새 권한 엔진을 만들지 않는다 — `requireLectureScope`(Phase 1) 와
 * `getServiceMembershipStatusFromDb`(Core util) 만 재사용한다.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { getServiceMembershipStatusFromDb } from '../../../utils/service-membership.js';
import { requireLectureScope } from '../../../middleware/lecture-scope.middleware.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

export const LECTURE_ADMIN_ROLE = 'lecture:admin';
export const LECTURE_OPERATOR_ROLE = 'lecture:operator';
export const LECTURE_INSTRUCTOR_ROLE = 'lecture:instructor';
const PLATFORM_SUPER_ADMIN_ROLE = 'platform:super_admin';

type MembershipSnapshot = { serviceKey: string; status: string };

function tokenRoles(req: Request): string[] {
  return ((req as any).user?.roles as string[] | undefined) || [];
}

/** 운영 break-glass. Foundation 계약(platformBypass=true) 과 동일한 단일 예외. */
export function isPlatformSuperAdmin(req: Request): boolean {
  return tokenRoles(req).includes(PLATFORM_SUPER_ADMIN_ROLE);
}

/** role 배열 기준 `lecture:admin` (또는 break-glass) 판정 — 소유자 override 등 controller 내부용. */
export function rolesIncludeLectureAdmin(roles: readonly string[]): boolean {
  return roles.includes(LECTURE_ADMIN_ROLE) || roles.includes(PLATFORM_SUPER_ADMIN_ROLE);
}

/** `lecture:admin` (또는 break-glass) — 소유자 override 등 controller 내부 판정용. */
export function hasLectureAdminRole(req: Request): boolean {
  return rolesIncludeLectureAdmin(tokenRoles(req));
}

/** `lecture:operator` ⊂ `lecture:admin` (또는 break-glass). */
export function hasLectureOperatorRole(req: Request): boolean {
  return tokenRoles(req).includes(LECTURE_OPERATOR_ROLE) || hasLectureAdminRole(req);
}

/** `lecture:instructor` 만. admin/operator 는 강사가 아니다 (WO §6). */
export function hasLectureInstructorRole(req: Request): boolean {
  return tokenRoles(req).includes(LECTURE_INSTRUCTOR_ROLE);
}

/**
 * 요청자의 lecture membership 이 active 인지 판정한다.
 * JWT 스냅샷을 먼저 보고, DataSource 가 살아 있으면 DB 로 확정한다
 * (`createMembershipScopeGuard` 와 동일한 2단계 — 정지 즉시성).
 */
export async function resolveLectureMembershipStatus(
  req: Request,
): Promise<'active' | 'not_found' | 'inactive'> {
  const user = (req as any).user;
  if (!user?.id) return 'not_found';

  const memberships: MembershipSnapshot[] = user.memberships || [];
  const snapshot = memberships.find((m) => m.serviceKey === SERVICE_KEYS.LECTURE);
  if (!snapshot) return 'not_found';
  if (snapshot.status !== 'active') return 'inactive';

  if (AppDataSource.isInitialized) {
    const dbStatus = await getServiceMembershipStatusFromDb(AppDataSource, user.id, SERVICE_KEYS.LECTURE);
    if (dbStatus === 'none') return 'not_found';
    if (dbStatus !== 'active') return 'inactive';
  }
  return 'active';
}

/**
 * Learner 층: active lecture membership 만 요구한다 (role 불요).
 * 수강 신청 · 진행 · 퀴즈/과제 제출 · 내 수강/수료 조회 · 강사 신청에 건다.
 */
export const requireLectureLearner: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user?.id) {
    res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }
  if (isPlatformSuperAdmin(req)) {
    next();
    return;
  }

  try {
    const status = await resolveLectureMembershipStatus(req);
    if (status === 'not_found') {
      res.status(403).json({
        success: false,
        error: `No membership found for service: ${SERVICE_KEYS.LECTURE}`,
        code: 'MEMBERSHIP_NOT_FOUND',
      });
      return;
    }
    if (status === 'inactive') {
      res.status(403).json({
        success: false,
        error: 'Service membership is not active. Active membership required.',
        code: 'MEMBERSHIP_NOT_ACTIVE',
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 요청자가 Lecture 학습자인가 (active lecture membership 또는 break-glass).
 * PR #225 merge-gate(Codex P1 · members visibility):
 *   로그인만으로는 members 강의를 열지 않는다 — 목록·상세 controller 가 이 판정으로 gating 한다.
 */
export async function isActiveLectureLearner(req: Request): Promise<boolean> {
  if (!(req as any).user?.id) return false;
  if (isPlatformSuperAdmin(req)) return true;
  return (await resolveLectureMembershipStatus(req)) === 'active';
}

/**
 * 운영·강사 write 대상 강의 판정 — `course.serviceKey === 'lecture'` 만 Lecture runtime 의 대상이다.
 * approve/reject/unpublish/archive/hard-delete(routes) 와 publish/update/delete/submit-review(controller)
 * 가 같은 규칙을 공유한다. legacy(KPA/PH/null) 강의는 non-disclosure 404. data cutover 는 §21 에서 취소됐다(테스트 데이터 삭제로 대상 소멸) — legacy row 자체가 0건이므로 이 404 는 이제 평상 상태다.
 */
export function isLectureCourse(courseServiceKey: string | null | undefined): boolean {
  return courseServiceKey === SERVICE_KEYS.LECTURE;
}

/** Instructor 층 = active membership + `lecture:instructor` (Foundation guard 재사용). */
export const requireLectureInstructor: RequestHandler = requireLectureScope(LECTURE_INSTRUCTOR_ROLE);

/** Operator 층 = active membership + `lecture:operator` | `lecture:admin`. */
export const requireLectureOperator: RequestHandler = requireLectureScope(LECTURE_OPERATOR_ROLE);

/** Admin 층 = active membership + `lecture:admin`. */
export const requireLectureAdmin: RequestHandler = requireLectureScope(LECTURE_ADMIN_ROLE);
