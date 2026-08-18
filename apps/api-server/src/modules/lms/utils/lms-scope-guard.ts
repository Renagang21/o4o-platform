/**
 * LMS Scope Guard — WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
 *
 * `lms-service-scope.ts` 가 "이 요청의 service scope 는 무엇인가"를 정의한다면,
 * 본 모듈은 "이 resource(course / lesson / quiz / assignment / enrollment / certificate)
 * 가 그 scope 에 속하는가"를 판정한다.
 *
 * 판정 순서 (WO §3):
 *   service route/context → canonical serviceKey → 대상 course.serviceKey 확인
 *   → (그 다음에야) 기존 enrollment/permission 정책
 *
 * 원칙:
 *   - service boundary 와 enrollment 권한은 별개다. enrollment 가 있어도 타 서비스
 *     course 에는 접근할 수 없다.
 *   - 모든 lesson / quiz / assignment 는 course 로 역추적해 판정한다. LMS 전용
 *     service-key 매핑을 새로 만들지 않는다.
 *   - scope 밖 resource 는 non-disclosure 계약에 따라 404 로 응답한다 (403 아님).
 *   - Raw SQL 은 parameter binding 만 사용한다 (CLAUDE.md §7 Guard Rule 2).
 */

import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import {
  resolveLmsServiceScope,
  isCourseInServiceScope,
  InvalidLmsServiceKeyError,
  INVALID_SERVICE_KEY_CODE,
} from './lms-service-scope.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

/**
 * 응답 envelope 은 BaseController 와 동일하다. 다만 BaseController 의 helper 는
 * protected(하위 controller 전용)이므로 util 계층에서는 같은 형태로 직접 응답한다.
 */
function respondNotFound(res: Response, message: string): void {
  res.status(404).json({ success: false, error: message, code: 'NOT_FOUND' });
}

function respondBadRequest(res: Response, message: string, code: string): void {
  res.status(400).json({ success: false, error: message, code });
}

/** scope 해석 결과. `ok:false` 면 이미 400 응답이 전송된 상태다. */
export type ScopeResolution = { ok: true; scope?: string } | { ok: false };

/**
 * 요청의 service scope 를 해석한다. 알 수 없는 serviceKey 면 400 을 보내고 `ok:false`.
 */
export function resolveScopeOrRespond(req: Request, res: Response): ScopeResolution {
  try {
    return { ok: true, scope: resolveLmsServiceScope(req) };
  } catch (e) {
    if (e instanceof InvalidLmsServiceKeyError) {
      respondBadRequest(res, '알 수 없는 serviceKey 입니다', INVALID_SERVICE_KEY_CODE);
      return { ok: false };
    }
    throw e;
  }
}

async function selectServiceKey(sql: string, id: string): Promise<{ found: boolean; serviceKey: string | null }> {
  const rows: Array<{ service_key: string | null }> = await AppDataSource.query(sql, [id]);
  if (!rows || rows.length === 0) return { found: false, serviceKey: null };
  return { found: true, serviceKey: rows[0].service_key ?? null };
}

const COURSE_SQL = 'SELECT service_key FROM lms_courses WHERE id = $1 LIMIT 1';

const LESSON_SQL = `
  SELECT c.service_key
    FROM lms_lessons l
    JOIN lms_courses c ON c.id = l."courseId"
   WHERE l.id = $1
   LIMIT 1`;

const QUIZ_SQL = `
  SELECT c.service_key
    FROM lms_quizzes q
    LEFT JOIN lms_lessons l ON l.id = q."lessonId"
    JOIN lms_courses c ON c.id = COALESCE(l."courseId", q."courseId")
   WHERE q.id = $1
   LIMIT 1`;

const ASSIGNMENT_SQL = `
  SELECT c.service_key
    FROM lms_assignments a
    JOIN lms_lessons l ON l.id = a."lessonId"
    JOIN lms_courses c ON c.id = l."courseId"
   WHERE a.id = $1
   LIMIT 1`;

async function guardBySql(
  req: Request,
  res: Response,
  sql: string,
  id: string | undefined,
  notFoundMessage: string,
): Promise<boolean> {
  const resolved = resolveScopeOrRespond(req, res);
  if (!resolved.ok) return false;
  if (!resolved.scope) return true; // 무경계(legacy/admin) 요청 — 추가 쿼리 0
  if (!id) {
    respondNotFound(res, notFoundMessage);
    return false;
  }

  const { found, serviceKey } = await selectServiceKey(sql, id);
  if (!found || !isCourseInServiceScope(serviceKey, resolved.scope)) {
    respondNotFound(res, notFoundMessage);
    return false;
  }
  return true;
}

/** course 가 요청 scope 에 속하는지 확인한다. `false` = 이미 응답 전송됨. */
export function guardCourseScope(req: Request, res: Response, courseId: string | undefined): Promise<boolean> {
  return guardBySql(req, res, COURSE_SQL, courseId, 'Course not found');
}

/** lesson → course 역추적 후 scope 판정. */
export function guardLessonScope(req: Request, res: Response, lessonId: string | undefined): Promise<boolean> {
  return guardBySql(req, res, LESSON_SQL, lessonId, 'Lesson not found');
}

/** quiz → lesson/course 역추적 후 scope 판정. */
export function guardQuizScope(req: Request, res: Response, quizId: string | undefined): Promise<boolean> {
  return guardBySql(req, res, QUIZ_SQL, quizId, 'Quiz not found');
}

/** assignment → lesson → course 역추적 후 scope 판정. */
export function guardAssignmentScope(req: Request, res: Response, assignmentId: string | undefined): Promise<boolean> {
  return guardBySql(req, res, ASSIGNMENT_SQL, assignmentId, 'Assignment not found');
}

/**
 * 이미 로드된 relation(enrollment.course / certificate.course)의 serviceKey 로 판정한다.
 * 추가 쿼리 없이 단건 응답 직전에 사용한다.
 */
export function guardLoadedCourseScope(
  req: Request,
  res: Response,
  courseServiceKey: string | null | undefined,
  notFoundMessage: string,
): boolean {
  const resolved = resolveScopeOrRespond(req, res);
  if (!resolved.ok) return false;
  if (!resolved.scope) return true;
  if (!isCourseInServiceScope(courseServiceKey, resolved.scope)) {
    respondNotFound(res, notFoundMessage);
    return false;
  }
  return true;
}

/**
 * 목록 쿼리에 course service scope 조건을 SQL 로 적용한다.
 * legacy `service_key IS NULL` 은 KPA scope 에만 포함시킨다 (isCourseInServiceScope 와 동일 규칙).
 *
 * ⚠️ client-side filtering 금지 — 반드시 이 헬퍼로 SQL 단계에서 건다.
 */
export function applyCourseScopeToQuery(
  query: { andWhere: (condition: string, params?: Record<string, unknown>) => unknown },
  alias: string,
  scope: string | undefined,
): void {
  if (!scope) return;
  if (scope === SERVICE_KEYS.KPA_SOCIETY) {
    query.andWhere(`(${alias}.serviceKey = :lmsScopeKey OR ${alias}.serviceKey IS NULL)`, { lmsScopeKey: scope });
  } else {
    query.andWhere(`${alias}.serviceKey = :lmsScopeKey`, { lmsScopeKey: scope });
  }
}
