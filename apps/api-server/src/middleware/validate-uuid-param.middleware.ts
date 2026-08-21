/**
 * validate-uuid-param.middleware
 *
 * WO-O4O-SIGNAGE-RESOURCE-ID-VALIDATION-AND-INVALID-UUID-NORMALIZATION-V1
 *
 * UUID 형식이 아닌 path parameter 가 그대로 DB 로 내려가면
 * Postgres 가 `invalid input syntax for type uuid` 를 던지고 500 이 된다.
 * (형식 오류는 서버 오류가 아니라 요청 오류다.)
 *
 * 이 미들웨어는 **DB 에 도달하기 전에** 형식을 차단하고
 * 플랫폼 canonical 계약인 `400 + code: 'INVALID_ID'` 로 정규화한다.
 *
 * 적용 원칙
 * - **UUID 계약인 parameter 에만** 적용한다. slug / enum / numeric parameter 에는 쓰지 않는다.
 * - guard 뒤, handler 앞에 둔다 (401 / 400 serviceKey / 403 우선순위 불변).
 * - 전역으로 강제하지 않는다. route 별로 명시 wiring 한다.
 */
import type { NextFunction, Request, Response } from 'express';

/** RFC 4122 형식 (버전 비트는 검사하지 않는다 — 기존 플랫폼 helper 와 동일) */
export const UUID_PARAM_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuidParam = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PARAM_REGEX.test(value);

/**
 * 지정한 path parameter 들이 모두 UUID 형식인지 검사한다.
 *
 * @example
 *   router.get('/media/:id', requireSignageOperatorOrStore, validateUuidParams('id'), ctrl.getMedia);
 */
export function validateUuidParams(...names: string[]) {
  // 이름 있는 함수로 반환한다 — router stack 조사(회귀 테스트)에서 식별 가능해야 한다.
  const validateUuidParams = (req: Request, res: Response, next: NextFunction): void => {
    for (const name of names) {
      const value = req.params?.[name];
      if (!isUuidParam(value)) {
        res.status(400).json({
          success: false,
          error: `Invalid ${name}`,
          code: 'INVALID_ID',
        });
        return;
      }
    }
    next();
  };
  return validateUuidParams;
}
