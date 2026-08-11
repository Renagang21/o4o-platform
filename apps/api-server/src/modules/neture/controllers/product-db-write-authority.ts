/**
 * WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1
 *
 * 공통 Product DB(ProductMaster · ProductIdentifier · shared_product_descriptions ·
 * canonical 승격)의 **write 권한** 경계.
 *
 * 배경: o4o-product-db admin API 는 read/write 구분 없이 `ADMIN_ROLES`(9개 — 4개 서비스의
 * admin/operator 포함)를 허용해 왔다. 공통 Product DB 는 서비스별로 분리되지 않은 단일
 * 원본이므로, 서비스 운영자가 다른 서비스 제품의 원본을 수정할 수 있는 상태였다.
 *
 * 계약:
 *   READ  — 기존 `ADMIN_ROLES` 유지. 서비스 운영자는 계속 조회·검색·상세·활용한다.
 *   WRITE — O4O 전체 관리자만. 새 역할 체계를 만들지 않고 기존 역할 어휘를 재사용한다.
 *
 * `PRODUCT_DB_WRITE_ROLES` 는 신설 역할이 아니라, 이미 공통 Product DB write 권한을 갖고
 * 있던 경로들의 역할 집합이다:
 *   - `platform:super_admin` — 기존 플랫폼 관리자 계약 (`requireAdmin`, 각 scope guard 의 platformBypass)
 *   - `neture:admin`         — `neture.routes.ts` `/admin/masters/:id`, `/admin/masters/resolve`
 *                              (`requireNetureScope('neture:admin')`)
 *   - `neture:operator`      — `operator-product-cleanup.controller.ts` merge-masters / fix-category / fix-brand
 *                              (`requireNetureScope('neture:operator')`)
 *
 * 범위 밖(기존 계약 유지):
 *   - 공급자 자기 제품 경로 (`/api/v1/neture/supplier/*`) — 별도 계약이므로 섞지 않는다.
 *   - 서비스별 후보(candidate) 큐레이션 — `injectServiceScope` 로 서비스 격리돼 있다.
 *     단 후보를 공통 master 로 승격하는 지점은 이 계약을 따른다.
 *   - 매장 영역(StoreLocalProduct 등) — 이번 WO 범위 밖.
 */

import { requireRole } from '../../../common/middleware/auth.middleware.js';

/** 공통 Product DB write 를 수행할 수 있는 역할 (O4O 전체 관리자) */
export const PRODUCT_DB_WRITE_ROLES = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
];

/**
 * 공통 Product DB write 가드.
 *
 * router-level 인증 + `requireRole(ADMIN_ROLES)`(read floor) 뒤에 **write route 에만**
 * 추가로 건다. read route 의 허용 범위는 바꾸지 않는다.
 */
export const requireProductDbWrite = requireRole(PRODUCT_DB_WRITE_ROLES);
