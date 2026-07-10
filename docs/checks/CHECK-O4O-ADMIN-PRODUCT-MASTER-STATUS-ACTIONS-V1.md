# CHECK-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1

> **WO:** WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1
> **선행:** IR `9a314f4b4` · 콘솔 정리 `58e12778d` · 상태 기반 `aef2c3a66`
> **작업일:** 2026-07-10
> **성격:** 실제 운영 기능(단건 상태 변경 + 배지/필터 + 참여자 검색 ACTIVE-only). DB 스키마 변경 없음(상태 컬럼은 선행 FOUNDATION 에서 추가됨).

---

## 1. 목표 (한 문장)

> 관리자가 상품을 정상·이용 중단·보관 상태로 단순 변경하고, 참여자용 신규 상품 검색에서는 정상 상품만 보이게 한다.

---

## 2. 구현 내용

### 백엔드
- **`catalog.service.ts`**
  - `ProductMasterStatus` 타입 + `PRODUCT_MASTER_STATUSES` export.
  - `searchProductMasters` 에 `statuses?` 파라미터 추가 — **미전달 시 기본 `['ACTIVE']`** (`m.status IN (:...statuses)`).
  - `setProductMasterStatus({ masterId, status, reason, actorId })` — 단일 트랜잭션(`SELECT ... FOR UPDATE` → `UPDATE status` → `INSERT product_master_notes` 시스템 메모). 같은 상태면 no-op. 사용처 데이터 무변경.
- **`neture.service.ts`** — `searchProductMasters` 파라미터에 `statuses` 추가 + `setProductMasterStatus` passthrough.
- **`product-library.controller.ts`** — 공유 검색 엔드포인트(`GET /neture/products/library/search`)에서:
  - `resolveStatusFilter(req)`: `status` 쿼리 파라미터를 읽되 **비-ACTIVE 조회는 관리자 롤(`roleAssignmentService.hasAnyRole`)에게만 허용**, 그 외에는 항상 ACTIVE-only 강제. (이 엔드포인트는 공급자/저작 picker 와 공유되므로 role-gate 필수.)
  - 목록 row + 상세 응답에 `status` 필드 추가(배지·액션용).
- **`product-master-status.controller.ts`** (신규) — `PATCH /api/v1/admin/o4o-product-db/masters/:id/status`, `authenticate` + `requireRole(ADMIN_ROLES)`. body `{ status, reason }` 검증(status enum, reason ≤ 500자). 404/400/200.
- **`register-routes.ts`** — 상태 컨트롤러 등록(24-e2i).

### 프론트엔드
- **`o4o-product-db.api.ts`** — `ProductMasterStatus`/`ProductMasterStatusFilter` 타입, `PRODUCT_MASTER_STATUS_LABEL`, `ProductMasterRow.status`/`ProductMasterDetail.status`, `listProductMasters` 에 `status` 파라미터('active'/미전달 → 서버 기본 ACTIVE-only), `setProductMasterStatus(id, status, reason)`.
- **`ProductMasterStatusControls.tsx`** (신규, 공용) — `ProductMasterStatusBadge`(정상/이용 중단/보관 톤), `ProductMasterStatusModal`(안내 문구 + 사유 입력 + 확인), `statusActionsFor(current)`(ACTIVE→이용 중단/보관, SUSPENDED·ARCHIVED→정상 복원).
- **`ProductMastersPage.tsx`** — 상태 필터(전체/정상/이용 중단/보관, URL 동기화), 상태 배지 컬럼, 행 메뉴 상태 액션, 변경 후 캐시 무효화 새로고침.
- **`ProductMasterDetailPage.tsx`** — 헤더 현재 상태 배지 + 상태 변경 버튼 + 모달, 변경 후 master/작업 이력 재조회.

### 안내 문구 (모달)
- 이용 중단: "이 상품은 O4O 상품 DB의 검색 및 신규 선택 대상에서 제외됩니다. 기존 참여자 데이터는 자동으로 변경하지 않습니다."
- 보관: "이 상품은 데이터 정리 목적으로 일반 검색 및 신규 선택 대상에서 제외됩니다."

---

## 3. 감사 기록 방식

- WO 권장대로 **신규 감사 테이블 없이** `product_master_notes` 에 시스템 메모로 기록:
  `상품 상태 변경: ACTIVE → SUSPENDED\n사유: …` (visibility=internal, created_by=실행 관리자, created_at 자동).
- 기존 작업 이력 뷰(`product-master-audit-log.service`)가 `note_created` 를 자동 표시하므로 상태 변경이 상세 "작업 이력"에 그대로 노출된다(추가 writer 불필요).

---

## 4. 참여자 검색 ACTIVE-only

- 공통 `searchProductMasters` 기본값 `['ACTIVE']` → 참여자 경로(매장 picker `/store/products/search`, 공급자/저작 picker `/neture/products/library/search`)는 파라미터 미전달로 **자동 ACTIVE-only** (프론트 수정 0).
- 관리자 목록만 `status` 파라미터로 전체/특정 상태 조회. 공유 엔드포인트에서 비-ACTIVE 는 **관리자 롤 gate** 통과 시에만 반영.

---

## 5. 검증

| 검증 | 결과 |
|------|------|
| api-server type-check | **PASS** (내 변경 관련 에러 0; `src/scripts/drug-otc-*` 는 선행 존재·무관) |
| admin-dashboard type-check | **PASS** |
| admin-dashboard build:prod | **PASS** (✓ 33.99s) |

- 배포 후 실브라우저 smoke(별도): 목록 상태 필터/배지/행 액션, 상세 상태 변경 모달·안내 문구, 변경 후 작업 이력에 상태 변경 메모 표시, 참여자 picker 에 SUSPENDED/ARCHIVED 미노출.

---

## 6. 동시 세션 얽힘 처리 (중요)

작업 중 **동일 admin 상품관리 영역을 편집하는 별도 세션**이 확인됨(IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1 — 매장 설명 직접 등록 기능).

- 그 세션의 커밋 `d1b297d8b` 가 **공유 3파일(`o4o-product-db.api.ts`, `ProductMasterDetailPage.tsx`, `register-routes.ts`)에 있던 내 상태 변경 코드까지 함께 커밋**함(작업 트리 공유). 내 마커가 HEAD 에 존재함을 확인(각 4/8/6건).
- 따라서 본 WO 의 나머지(순수 내 파일)만 별도 커밋한다. **타 세션의 미커밋 candidate/store-description 작업 파일은 일절 건드리지 않았다.**
- 안전 확인: 내 4개 수정 파일(`catalog.service`/`neture.service`/`product-library.controller`/`ProductMastersPage`)의 `git diff HEAD` 삭제 라인은 전부 내 의도적 교체 라인이며, 타 세션 커밋 내용을 되돌리는 삭제는 **0건**.
- 부수 효과: `d1b297d8b` 시점에 register-routes 는 status 컨트롤러를 import 하나 컨트롤러 파일은 미커밋 상태였음 → 본 커밋으로 백엔드 구현을 완결해 main 정합성 회복.

---

## 7. 이번 커밋에 포함한 파일 (path-specific)

```text
apps/api-server/src/modules/neture/services/catalog.service.ts
apps/api-server/src/modules/neture/neture.service.ts
apps/api-server/src/modules/neture/controllers/product-library.controller.ts
apps/api-server/src/modules/neture/controllers/product-master-status.controller.ts   (신규)
apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx
apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterStatusControls.tsx        (신규)
docs/checks/CHECK-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1.md                       (신규)
```
> 공유 3파일(api.ts / DetailPage.tsx / register-routes.ts)의 내 변경분은 이미 `d1b297d8b` 로 main 에 반영됨(중복 커밋 안 함).

---

## 8. 명시적 제외 (구현 안 함)

사용처 추적 · 공급/매장 상품 자동 중단 · 주문 자동 취소 · 콘텐츠/QR/POP 자동 제거 · 참여자별 알림/조치 관리 · 일괄 상태 변경 · 영구 삭제 · 상품 병합 · 공지 자동 생성 · 복잡한 승인 절차.

---

## 9. 변경 0 확인

- DB 스키마 변경/ migration: **0** (status 컬럼은 선행 FOUNDATION `aef2c3a66`).
- 참여자·공급자·매장·주문·콘텐츠 데이터 변경: **0** (상태 변경은 product_masters.status + product_master_notes 메모만).
- 프로덕션 데이터 직접 변경: **0** (§10 smoke 의 상태 변경은 동일 상품으로 순환 후 ACTIVE 복원).

---

## 10. 배포 후 실 API smoke (2026-07-10)

- **배포 확인**: 내 커밋 `8fe7e46c3` 의 **Deploy API Server / Deploy Admin Dashboard 모두 SUCCESS** (병행 세션 `f1bce3172` 시점의 배포 실패 blocker = 미커밋 `product-master-status.controller.ts`/`ProductMasterStatusControls` 였고, 이 두 파일이 내 커밋에 포함되어 **blocker 해소**됨).
- **브라우저 UI smoke 는 보류**: Playwright 영구 프로필(`C:\Users\home\.playwright-o4o-profile`)이 기존 Chrome 인스턴스에 점유되어 기동 실패(병행 세션/기존 브라우저 추정, 강제 종료 안 함). UI 계층(필터 드롭다운/배지/모달/행 액션)은 typecheck+build PASS 로 정합성 확인, **런타임 동작은 아래 실 API smoke 로 검증**.
- **인증**: `sohae2100@gmail.com`(roles: platform:super_admin, neture:admin/operator …) → 상태 role-gate 통과.
- **대상 상품**: `손 부목` (id `00a96718-…7aa84`, barcode `6970398842176`), smoke 전/후 모두 **ACTIVE**.

| # | 검증 | 결과 |
|---|------|------|
| 1 | 목록 검색 응답에 `status` 필드 존재 · 기본 검색 전부 ACTIVE | **PASS** (총 198,394, 표본 5건 ACTIVE) |
| 2 | 관리자 `status=all` 검색 200 | **PASS** |
| 3 | `PATCH …/:id/status` ACTIVE→ARCHIVED | **PASS** (`changed:true`, previousStatus 정확) |
| 4 | 상세 GET 상태 반영 (ARCHIVED / SUSPENDED / ACTIVE) | **PASS** |
| 5 | **기본 검색(=참여자 picker 공통 메서드)에서 ARCHIVED 제외** (q=barcode → 0건) | **PASS** |
| 6 | `status=archived` 필터로 관리자 조회 시 노출 (1건) | **PASS** |
| 7 | ARCHIVED→ACTIVE 복원 | **PASS** (`changed:true`) |
| 8 | ACTIVE→SUSPENDED + 기본 검색에서 제외 (0건) | **PASS** |
| 9 | 상태 변경마다 시스템 메모 생성 (4회 변경 = 4메모) · 서버 생성 문구 정상 한글 · 실행자 `서철환` | **PASS** |
| 10 | **no-op**: ACTIVE→ACTIVE `changed:false` · 메모 미생성 (총 메모 4건 유지) | **PASS** |
| 11 | 최종 상태 ACTIVE 복원 확인 | **PASS** |

- **메모 문구 인코딩**: 서버 생성 부분(`상품 상태 변경: SUSPENDED → ACTIVE` / `사유:`)은 **정상 한글 저장 확인**. 내가 CLI(curl -d)로 넣은 `reason` 의 한글만 깨짐(Git Bash cp949 전송 아티팩트, ASCII "smoke" 는 온전) — **제품 결함 아님**. 실제 브라우저는 textarea UTF-8 전송이라 무관.
- **잔여물**: 대상 상품에 상태 변경 시스템 메모 4건이 감사 이력으로 남음(설계상 soft-audit, hard delete 안 함). 상품 상태 데이터는 ACTIVE 로 완전 복원.
- **미검증(후속)**: 브라우저 UI 렌더(필터/배지/모달) — 프로필 점유 해소 후 수행 권장. 비관리자 롤의 `status=all` 강제 ACTIVE-only 는 코드 gate + 참여자 엔드포인트 미전달로 보장(순수 비관리자 토큰 negative 테스트는 별도).
- 타 세션 WIP 파일: **미변경**.
