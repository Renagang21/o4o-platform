/**
 * LMS Enrollment Owner Guard — WO-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1
 *
 * `lms-scope-guard.ts` 가 "이 resource 가 요청 service scope 에 속하는가"를 판정한다면,
 * 본 모듈은 그 다음 단계인 "이 enrollment 가 요청자 본인의 것인가"를 판정한다.
 *
 * canonical authorization 순서 (WO §3):
 *   1. enrollment 존재 확인
 *   2. enrollment → course service scope 확인
 *   3. 현재 사용자와 enrollment.userId 소유권 확인
 *   4. 허용된 elevated role 은 별도 endpoint(/instructor/*) 정책으로 처리
 *   5. mutation
 *
 * 원칙:
 *   - service scope 와 ownership 은 별개다. 같은 서비스라고 ownership 을 생략하지 않는다.
 *   - ownership 확인 전에 mutation 을 실행하지 않는다.
 *   - 타 사용자 enrollment 의 존재를 드러내지 않는다 → 기존 non-disclosure 계약대로 404.
 *   - user-facing endpoint 에 elevated bypass 를 새로 만들지 않는다. 관리 동작은
 *     기존 `/lms/instructor/enrollments/:id/{approve,reject}` 계약을 사용한다.
 */

import type { Request, Response } from 'express';
import type { Enrollment } from '@o4o/lms-core';
import { EnrollmentService } from '../services/EnrollmentService.js';
import { guardLoadedCourseScope, resolveScopeOrRespond } from './lms-scope-guard.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';

const ENROLLMENT_NOT_FOUND = 'Enrollment not found';

/**
 * 기존 LMS 관리 정책과 동일한 역할 집합이다 (InstructorController / requireInstructor).
 * 새 권한 정책을 만들지 않는다.
 */
export const LMS_ELEVATED_MANAGER_ROLES = ['lms:instructor', 'kpa:admin'] as const;

function respondUnauthorized(res: Response): void {
  res.status(401).json({ success: false, error: 'User not authenticated', code: 'UNAUTHORIZED' });
}

function respondNotFound(res: Response): void {
  res.status(404).json({ success: false, error: ENROLLMENT_NOT_FOUND, code: 'NOT_FOUND' });
}

/**
 * 기존 관리 정책(requireInstructor)과 동일한 판정.
 * enrollment 목록처럼 "본인 것만" 으로 좁힐지 결정할 때만 사용한다.
 */
export async function isLmsElevatedManager(req: Request): Promise<boolean> {
  const userId = (req as any).user?.id;
  if (!userId) return false;

  // requireInstructor 와 동일하게 토큰 roles 의 kpa:admin 을 먼저 인정한다.
  const tokenRoles: string[] = (req as any).user?.roles || [];
  if (tokenRoles.includes('kpa:admin')) return true;

  return roleAssignmentService.hasAnyRole(userId, [...LMS_ELEVATED_MANAGER_ROLES]);
}

/**
 * enrollment 를 로드하고 scope → ownership 순으로 판정한다.
 *
 * @returns 본인 enrollment. `null` 이면 이미 응답(401/400/404)이 전송된 상태다.
 */
export async function resolveOwnedEnrollmentOrRespond(
  req: Request,
  res: Response,
  id: string | undefined,
): Promise<Enrollment | null> {
  const userId = (req as any).user?.id;
  if (!userId) {
    respondUnauthorized(res);
    return null;
  }

  // 알 수 없는 serviceKey 는 조회 이전에 400 (기존 계약 유지)
  const scope = resolveScopeOrRespond(req, res);
  if (!scope.ok) return null;

  if (!id) {
    respondNotFound(res);
    return null;
  }

  const enrollment = await EnrollmentService.getInstance().getEnrollment(id);
  if (!enrollment) {
    respondNotFound(res);
    return null;
  }

  // 1) service boundary 가 항상 먼저다.
  if (!guardLoadedCourseScope(req, res, (enrollment as any).course?.serviceKey, ENROLLMENT_NOT_FOUND)) {
    return null;
  }

  // 2) 같은 서비스 안이라도 타인 enrollment 는 존재를 드러내지 않고 차단한다.
  if (enrollment.userId !== userId) {
    respondNotFound(res);
    return null;
  }

  return enrollment;
}
