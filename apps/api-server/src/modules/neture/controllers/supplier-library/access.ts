import type { Request } from 'express';
import type { DataSource } from 'typeorm';
import {
  createRequireActiveSupplier,
  createRequireLinkedSupplier,
} from '../../middleware/neture-identity.middleware.js';
export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};
export type SupplierRequest = AuthenticatedRequest & {
  supplierId: string;
};
/**
 * 자료함 경로의 공급자 guard — 표준 공급자 guard(neture-identity.middleware)를 그대로 쓴다.
 *
 * 예전에는 `getSupplierByUserId` 로 자체 판정해 ① 공급자 조직이 여럿인 사용자가 조직을 지정할 수 없었고(항상 403)
 * ② 쓰기 경로에서 Neture 회원 상태(requireNetureMainMembership)를 확인하지 않았으며
 * ③ DB 오류를 '공급자 아님(403 NO_SUPPLIER)'으로 바꿨다. 응답 계약(401 · 403 NO_SUPPLIER ·
 * 403 SUPPLIER_NOT_ACTIVE)은 표준 guard 와 같고, 조직 지정 409 · 조회 실패 503 이 더해진다.
 */
export function createSupplierLibraryAccess(dataSource: DataSource) {
  return {
    requireActiveSupplier: createRequireActiveSupplier(dataSource),
    requireLinkedSupplier: createRequireLinkedSupplier(dataSource),
  };
}
