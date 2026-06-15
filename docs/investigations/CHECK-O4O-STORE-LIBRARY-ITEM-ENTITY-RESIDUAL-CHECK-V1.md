# CHECK-O4O-STORE-LIBRARY-ITEM-ENTITY-RESIDUAL-CHECK-V1

> **작업명:** WO-O4O-STORE-LIBRARY-ITEM-ENTITY-RESIDUAL-CHECK-V1
> **유형:** 코드 점검 (read-only) — `StoreLibraryItem` 잔존 엔티티가 stale 인지 확인. 코드/DB **무변경**.
> **결론(요약): 판정 B (stale 아님 — 마운트된 컨트롤러가 사용 중) + ⚠️ latent/live 버그 발견.** `StoreLibraryItem`(`@Entity('store_library_items')`)은 `createStoreLibraryController`(GlycoPharm/Cosmetics `/pharmacy/library` CRUD)가 `getRepository(StoreLibraryItem)` 로 사용하며, 이 컨트롤러는 GP/KCos 라이브 페이지가 호출한다. 그러나 물리 테이블 `store_library_items` 는 `store_execution_assets` 로 **hard rename**(migration `20260421010000`, back-compat view 없음) 되어 **존재하지 않는다** → 해당 컨트롤러는 부재 테이블을 조회. **A(완전 stale·즉시 삭제) 아님** — 삭제 시 컨트롤러 import 깨짐. **즉시 코드 변경 없이** 별도 repoint WO 로 분리.
> 선행: `WO-O4O-STORE-PRODUCTION-MATERIAL-BOUNDARY-DOCUMENTATION-V1`(§2.4 잔존 flag) — 2026-06-15

---

## 1. 사전 git 상태

`main` · origin 동기화(0/0) · staged 없음. 동시 세션 WIP(NetureSupplier.entity 등) 미접촉.

## 2. 사용처 전수 조사 (`StoreLibraryItem`)

| 위치 | 사용 형태 | 비고 |
|------|----------|------|
| `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts:21,23` | `@Entity({ name: 'store_library_items' })` 정의 | 엔티티 |
| `apps/api-server/src/database/connection.ts:224,1015` | import + entities 배열 등록 | 등록됨 |
| `apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts:29,46` | import + **`getRepository(StoreLibraryItem)`** (find/save/QB) | **실사용** |
| `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts:12` | **주석만**(코드 아님) | 무관 |
| `apps/api-server/src/modules/store/store-library.service.ts` | ❌ 미사용 — 이미 **`StoreExecutionAsset`** 로 이전됨(`:11,34,37`) | 정상 |

> 즉 `StoreLibraryItem` 은 **`createStoreLibraryController` 한 곳에서 실사용** + connection 등록. → **완전 stale 아님(A 배제).**

## 3. 마운트 / 소비 (live 여부)

- **마운트:** `createStoreLibraryController` → GlycoPharm `glycopharm.routes.ts:400`, Cosmetics `cosmetics.routes.ts:164` (`router.use('/', ...)`). **KPA 미마운트**(KPA `storeLibrary.ts:13` 주석 "KPA 백엔드 미등록").
- **엔드포인트:** `GET/POST/PUT/DELETE /pharmacy/library` (자료실 CRUD).
- **프론트 소비(라이브):** GP/KCos 페이지가 `getStoreLibraryItems()`(`@/api/storeLibrary`) 호출:
  - GP `pages/store-management/StoreLibraryResourcesPage.tsx:14`, `components/store/StoreLibrarySelectorModal.tsx:15`, `pages/store-management/StoreTabletDisplaysPage.tsx:19`
  - KCos `pages/store/StoreLibraryResourcesPage.tsx:14`
- KPA 는 클라이언트도 `storeExecutionAssets.ts`("renamed from storeLibrary.ts")로 이전 완료 → `/pharmacy/library` 미사용.

## 4. 물리 테이블 상태 (⚠️ 핵심)

- migration `20260421010000-RenameStoreLibraryToExecutionAssets`: `ALTER TABLE store_library_items RENAME TO store_execution_assets` — **hard rename, back-compat view/alias 없음**(파일 전문 확인). rename 이후 `store_library_items` 재생성 migration **없음**.
- 따라서 운영 DB 에 **`store_library_items` 테이블 부재**(read-only DB 재확인 권장 — 후속).
- `createStoreLibraryController` 는 `getRepository(StoreLibraryItem)` → `store_library_items` 조회 → **부재 테이블 접근**.

> **결과(정적 근거):** GP/KCos `/pharmacy/library` 는 rename 이후 **broken(런타임 relation 부재)** 또는 페이지 catch 로 degraded(빈 목록). GP 클라이언트(`getStoreLibraryItems`)는 try/catch 없이 throw → 페이지 측 처리 의존. **운영 실제 거동(500 vs 빈 목록)은 후속 WO 에서 DB/런타임 확인 권장.**

## 5. 판정

```
판정: B (일부 사용 중 — 마운트 컨트롤러가 StoreLibraryItem 실사용) + latent/live 버그

- 완전 stale(A): 아니오 — createStoreLibraryController 가 실사용, 삭제 시 import 깨짐(typecheck 실패)
- 일부 사용(B): 예 — GP/KCos /pharmacy/library 컨트롤러 + 라이브 페이지 소비
- 추가 발견: 컨트롤러가 rename 으로 부재한 store_library_items 를 타겟 → broken/degraded
- 즉시 처리: 코드 변경 없음(본 WO 는 read-only 점검, B안 = 문서화 + 별도 WO)
```

## 6. 권장 처리 — 별도 WO (코드 영향)

`WO-O4O-STORE-LIBRARY-CONTROLLER-REPOINT-TO-EXECUTION-ASSETS-V1`(신규 제안):
1. `createStoreLibraryController` 의 `getRepository(StoreLibraryItem)` → **`getRepository(StoreExecutionAsset)`** repoint. **컬럼 호환 확인됨**: `StoreLibraryItem` 컬럼(org/title/description/file_url/file_name/file_size/mime_type/category/asset_type/url/html_content/source_type/is_active/created_at/updated_at)은 `StoreExecutionAsset` 의 부분집합(StoreExecutionAsset 가 `usage_type` 추가된 superset, 동일 물리 테이블). → repoint = 사실상 import 교체, 저위험.
2. repoint 후 `StoreLibraryItem` 엔티티 제거 + `connection.ts` 등록 제거 + `store-pop.controller.ts` 주석 갱신.
3. 배포 후 GP/KCos `/pharmacy/library`(StoreLibraryResourcesPage/SelectorModal/TabletDisplays) 정상 동작 확인(현재 broken 가능 → 복구).
- **본 WO 에서 즉시 수정하지 않은 이유:** GP/KCos **라이브 엔드포인트 거동 변경**(복구이지만 변경)이며, B안 지침(문서화+별도 WO) + 운영 거동 확인 동반이 안전. browser smoke 불가 환경.

## 7. 검증 (본 점검)

- **코드/DB/migration 변경 0** (read-only 점검). 본 WO 산출물 = CHECK 문서 1건.
- `StoreLibraryItem` 사용처: 엔티티 정의 + connection 등록 + `createStoreLibraryController` 실사용 + store-pop 주석. (service 는 이미 StoreExecutionAsset 이전.)
- rename migration hard-rename·back-compat 부재 확인.
- 컬럼 호환(StoreLibraryItem ⊂ StoreExecutionAsset) 확인 → repoint 안전성 근거.

## 8. 후속

1. **(권장, 코드)** `WO-O4O-STORE-LIBRARY-CONTROLLER-REPOINT-TO-EXECUTION-ASSETS-V1` — 컨트롤러 repoint → StoreExecutionAsset, StoreLibraryItem 제거. DB/런타임 확인 동반.
2. (선택) `WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1` — ProductionMaterials 조회 공통화 + GP/KCos QR/direct 소스 완성.

---

*Date: 2026-06-15 · read-only 코드 점검 · 코드/DB 무변경 · 판정 B(StoreLibraryItem = createStoreLibraryController 실사용, 완전 stale 아님) + latent/live 버그(rename 으로 부재한 store_library_items 타겟). repoint 별도 WO 권장.*
