# CHECK-O4O-STORE-LIBRARY-CONTROLLER-REPOINT-TO-EXECUTION-ASSETS-V1

> **작업명:** WO-O4O-STORE-LIBRARY-CONTROLLER-REPOINT-TO-EXECUTION-ASSETS-V1
> **유형:** 코드 복구 — `/pharmacy/library` 컨트롤러를 부재 테이블(`store_library_items`) → 현행 `store_execution_assets` 로 repoint. DB/migration/route/UI **무변경**.
> **결과: PASS — `createStoreLibraryController` repository 를 `StoreLibraryItem` → `StoreExecutionAsset` repoint. 레거시 `StoreLibraryItem` 엔티티 제거 + connection 등록 제거. GP/KCos `/pharmacy/library`(rename 이후 부재 테이블 조회 → broken/degraded) 정합 복구. api-server typecheck 0 errors.**
> 선행: `WO-O4O-STORE-LIBRARY-ITEM-ENTITY-RESIDUAL-CHECK-V1`(판정 B + latent 버그) — 2026-06-15

---

## 1. 배경 / 문제

선행 점검 결과: `createStoreLibraryController`(GP/KCos `/pharmacy/library` CRUD, 라이브 페이지 소비)가 `getRepository(StoreLibraryItem)`(`@Entity('store_library_items')`)를 사용. 그러나 `store_library_items` 는 `store_execution_assets` 로 **hard rename**(migration `20260421010000`, back-compat 없음) → 부재 테이블 조회 = broken/degraded. 본 WO 가 복구.

## 2. 사전 git 상태

`main` · origin 동기화(0/0) · staged 없음. 동시 세션 WIP 미접촉(path-specific).

## 3. repoint 안전성 근거 (선행 확정)

`StoreLibraryItem` 컬럼 ⊂ `StoreExecutionAsset` (동일 물리 테이블 rename, StoreExecutionAsset 가 `usage_type` 추가된 superset). 컨트롤러가 사용하는 모든 property(id/organizationId/title/description/fileUrl/fileName/fileSize/mimeType/category/assetType/url/htmlContent/sourceType/isActive/createdAt) 가 `StoreExecutionAsset` 에 **동일 TS property 명**으로 존재(`store-execution-asset.entity.ts:26-72` 확인). → repoint = import/타입 교체, 컬럼 매핑 무변동.

## 4. 변경 (4 파일)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts` | import `StoreLibraryItem` → `StoreExecutionAsset`(`store-execution-asset.entity.js`). `getRepository(StoreLibraryItem)` → `getRepository(StoreExecutionAsset)`. 핸들러 로직·라우트·응답 무변경 |
| `apps/api-server/src/database/connection.ts` | `StoreLibraryItem` import 제거 + entities 배열 등록 제거(주석 대체). `StoreExecutionAsset` 는 기존 등록 유지 |
| `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts` | 헤더 주석 `StoreLibraryItem` 표현 → `store execution asset`(주석만) |
| `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts` | **삭제**(git rm) — 잔존 참조 0, index export 없음 |

- **엔드포인트/HTTP 계약 무변경:** `GET/POST/PUT/DELETE /pharmacy/library`, 요청/응답 형태, 검증(asset_type), QR 참조 보호(DELETE 409) 모두 그대로. 조회 대상 테이블만 부재 → 현행으로 교정.
- **마운트 무변경:** GlycoPharm `glycopharm.routes.ts:400`, Cosmetics `cosmetics.routes.ts:164` 그대로. KPA 는 미마운트(영향 없음).

## 5. 검증

- **api-server `tsc --noEmit` 0 errors** ✅ (StoreLibrary/connection/execution 관련 오류 0).
- **정적:**
  - `StoreLibraryItem` 엔티티 클래스 src 참조 **0**(엔티티 파일 삭제, connection 등록·import 제거, 컨트롤러 repoint). `platform/entities/index.ts` export 없음.
  - 컨트롤러 핸들러 로직 diff 없음(repository 타입만 교체).
  - service 레이어(`store-library.service.ts`)는 이미 `StoreExecutionAsset` 사용 — 본 변경으로 컨트롤러도 정합.
- **무변경:** `store_execution_assets` 스키마/엔티티 · DB · migration · route · 자료실 UI · ProductionMaterials 조회 · 프론트 클라이언트(`storeLibrary.ts`).
- **browser/DB smoke:** 미수행 — dev 서버·인증 guard. **배포 후 권장:** ① GP/KCos `/pharmacy/library` GET/POST 정상(StoreLibraryResourcesPage/SelectorModal/TabletDisplays 자료 표시) ② (read-only) `store_execution_assets` 존재·`store_library_items` 부재 DB 확인(gcloud).

## 6. 완료 판정

**PASS.** `/pharmacy/library` 컨트롤러를 현행 `store_execution_assets`(StoreExecutionAsset)로 repoint, 레거시 `StoreLibraryItem` 제거. rename 이후 부재 테이블을 가리키던 GP/KCos 자료실 경로를 정합 복구. 컬럼 호환·typecheck 0·HTTP 계약/DB/migration/UI 무변경.

## 7. 후속

1. **(배포 후)** GP/KCos `/pharmacy/library` 동작 smoke(자료 목록/생성/수정/삭제) — 복구 확인.
2. (선택) `WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1` — ProductionMaterials 조회 공통화 + GP/KCos QR/direct 소스 완성.
3. (선택) 함수/클라이언트 명칭 `*StoreLibraryItem*`(getStoreLibraryItems 등) → execution-asset 어휘 정렬(저위험 네이밍, 별도).

---

*Date: 2026-06-15 · 코드 복구 PASS · /pharmacy/library 컨트롤러 StoreLibraryItem→StoreExecutionAsset repoint + 레거시 엔티티 제거. 부재 테이블(store_library_items) 조회 → 현행 store_execution_assets 정합. typecheck 0. DB/migration/route/UI 무변경. 배포 후 smoke 권장.*
