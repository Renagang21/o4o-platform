/**
 * 공통 Product DB(ProductMaster · ProductIdentifier · shared_product_descriptions ·
 * canonical 승격)의 **권한** 경계.
 *
 * 이력:
 *   WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1
 *     — read 는 `ADMIN_ROLES`(7개: 4개 서비스의 admin/operator 포함) 유지, write 만
 *       `platform:super_admin` + `neture:admin` + `neture:operator` 로 좁혔다.
 *   WO-O4O-ADMIN-PARTNEROPS-REGISTRY-PRODUCTDB-AUTH-AND-LINT-GATE-FINAL-CLOSURE-V1 §6 (현재)
 *     — read 까지 `platform:super_admin` 단독으로 정렬했다.
 *
 * 현재 계약:
 *   공통 Product DB 정본의 **조회 · 수정 · 승격 · 삭제 · 복원 · 정비 전부 `platform:super_admin`**.
 *   공통 Product DB 는 서비스별로 분리되지 않은 단일 원본이므로, 특정 서비스의 admin/operator 가
 *   다른 서비스 제품의 정본을 조회하거나 변경할 수 있어서는 안 된다.
 *
 * 구현:
 *   `/api/v1/admin/o4o-product-db/*` 의 13개 컨트롤러가 각자 선언하던 7-role 배열을 모두 제거하고,
 *   router floor 로 저장소 정본 미들웨어 `requireAdmin`(platform:super_admin 단독)을 사용한다.
 *   **역할 목록을 이 파일에서 다시 선언하지 않는다** — 권한 어휘의 정본은 `requireAdmin` 하나다.
 *
 * 서비스 운영자 경로는 이 계약의 범위가 아니며 그대로 유지된다:
 *   - `/api/v1/operator/product-candidates/*`      — 서비스 후보 큐레이션 (OPERATOR_ROLES + service scope)
 *   - `/api/v1/operator/store-product-requests/*`  — 매장 상품 등록 요청
 *   - `/api/v1/neture/supplier/*`                  — 공급자 자기 제품 · 설명서 초안 제출
 *   서비스 운영자는 자기 서비스 API 와 service scope 안에서 제안 · 등록 요청 · 초안 작성을 계속한다.
 *   공통 정본을 직접 변경하는 경로만 금지된다.
 */

import { requireAdmin } from '../../../common/middleware/auth/authorization.middleware.js';

/**
 * 공통 Product DB write 가드.
 *
 * router floor(`requireAdmin`)와 동일한 정본 가드다. write route 에 계속 명시적으로 붙여
 * "이 route 는 공통 정본을 변경한다" 는 의도를 코드에 남긴다(다층 방어 · 가독성).
 * floor 가 완화되더라도 write 는 platform:super_admin 을 유지한다.
 */
export const requireProductDbWrite = requireAdmin;
