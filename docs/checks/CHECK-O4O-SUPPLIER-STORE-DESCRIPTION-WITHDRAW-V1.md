# CHECK-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1

> WO: `WO-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1`
> 선행/트리거: `CHECK-O4O-SUPPLIER-MULTILINGUAL-STORE-DESCRIPTION-PRODUCTION-SMOKE-V1`(90bd8e27d) — 언어별 smoke 가 **원복 불가**(공급자 STORE 설명서 철회 수단 부재)로 중지되며 §7 에서 본 WO 를 제안.
> 성격: 공급자 STORE 설명서 작업본 철회(soft delete) 배선. 스키마·migration·직접 DB write 0.
> Date: 2026-07-22 · commit ceb2ce645 · 배포 API+neture success.

---

## 0. 결론

공급자가 자기 STORE 설명서 작업본(status ∈ {draft, needs_review, revision_requested})을 **공식 UI/API 로 철회**할 수 있게 배선했다. 기존 서비스 `softDelete`(`@DeleteDateColumn deleted_at`)를 재사용하고, 소유권(`created_by_supplier_id`)+허용 상태 가드를 서비스 계층에 두었다. canonical/hidden/deprecated/candidate 는 철회 불가(운영자 승인 이력·공개 설명서 보존). **신규 테이블·컬럼·migration·백필·직접 DB write 0.**

## 1. 기존 수명주기 gap (실행 1)

선행 smoke CHECK §7 이 확정한 gap: 공급자 컨트롤러는 GET(listMine)+POST(save) **2개뿐**, 철회/삭제 엔드포인트 부재. 서비스 `softDelete(id)`·`setStatus` 는 존재하나 **공급자 경로 미배선**. offer 삭제는 설명서로 cascade 안 됨(FK 없음). `expireRevisionRequested` 는 revision_requested 만 대상 → draft/needs_review 는 영구 잔존. 결과: 공급자가 잘못 만든 초안을 제거할 공식 수단이 없어 (a) 원복 가능한 테스트 불가, (b) 실사용 UX 결함.

## 2. 철회 대상·상태·소유권 가드 (실행 2)

`SharedProductDescriptionService.withdrawSupplierStoreDraft(id, supplierId)` (신규):
- **소유권**: `created_by_supplier_id === supplierId` (+ `source_type='supplier'` AND `description_type='STORE'`).
- **허용 상태**: `draft` / `needs_review` / `revision_requested`.
- **차단 상태**: `canonical` / `hidden` / `deprecated` / `candidate` → `forbidden_status`.
- **미존재/이미철회/타공급자/비-STORE/비-supplier** → `not_found`(존재 은닉). `findOne` 이 기본적으로 `deleted_at IS NULL` 만 → 이미 철회 행 재철회 = not_found.
- 통과 시 `this.repo.softDelete(id)`(deleted_at 세팅) 재사용 — **단일 id soft-delete**(다른 언어·공급자·offer·master 무접촉).

## 3. API·UI 변경 (실행 3·4)

- **API**: `DELETE /api/v1/neture/supplier/store-descriptions/:id` (`requireAuth` + `requireActiveSupplier`, `req.supplierId` = neture_suppliers.id). 성공 200 `{id,masterId,language,withdrawn:true}` / 상태 차단 **409 `WITHDRAW_FORBIDDEN_STATUS`** / not_found **404 `STORE_DESC_NOT_FOUND`**.
- **client**: `supplierStoreDescriptionApi.withdraw(id)` → `DELETE {BASE}/:id`.
- **editor drawer**: 언어별 작업본에 **'철회' 액션**(footer 좌측, `canWithdraw`=현재 언어 작업행이 허용 상태일 때만 노출) + **확인 다이얼로그**. 철회 성공 시 해당 언어 행만 캐시 제거 + 편집기 초기화(빈 상태) + `onSaved()`(목록 갱신). canonical/hidden 은 버튼 미노출.
- 변경 파일: service(+withdraw+result 인터페이스), controller(+DELETE), client(+withdraw), drawer(+철회 버튼/핸들러).

## 4. 허용·차단 테스트 결과 (실행 5) — ✅ PASS

**라이브 API**(prod, 공급자 renagang21 `91169739…` ACTIVE, 배포 후):
| 케이스 | 결과 |
|------|------|
| 존재하지 않는 id DELETE | **404** `STORE_DESC_NOT_FOUND` |
| 본인 **hidden** 행 DELETE | **409** `WITHDRAW_FORBIDDEN_STATUS` (행 무변경: deleted_at NULL·status hidden 유지 실측) |
| 본인 **draft** 행 DELETE(allow) | **200** `{withdrawn:true}` → listMine 즉시 비노출 → DB `deleted_at` 세팅(soft, 물리삭제 아님) |
| 이미 철회된 행 재-DELETE | **404** |

**트랜잭션 fixture**(BEGIN…ROLLBACK, 영구 write 0) — 타공급자·불변식:
| 검증 | 기대 | 실측 |
|------|:---:|:---:|
| A) draft/needs_review/revision → withdrawable predicate | 3 | **3** |
| B) canonical/hidden → withdrawable 미매칭 | 0 | **0** |
| C) 타공급자 draft → 내 supplierId 미매칭(not-owned) | 0 | **0** |
| D) softDelete 후 listSupplierStoreDrafts 비노출 | 0 | **0** |
| E) 철회(ko) 후 en/zh 작업행 존치(다른 언어 불변) | 2 | **2** |
| F) 운영자 검수 큐(source=supplier·STORE·deleted_at IS NULL) 비노출 | 0 | **0** |
| G) canonical 행 보존(deleted_at NULL·status canonical) | 1 | **1** |
| H) 철회 행 upsert 재사용 안 됨(deleted_at IS NULL 필터) → 재저장 시 신규 | 0 | **0** |

## 5. 다른 언어·오퍼·ProductMaster·canonical 불변 (실행 6) — ✅

- **다른 언어**: 단일 id soft-delete → 같은 master 의 en/zh/ja 작업행 무변경(fixture E). 드로어도 해당 언어 행만 캐시 제거.
- **offer/ProductMaster**: withdraw 는 `shared_product_descriptions` 단일 행만 soft-delete. offer·master 미접촉(FK/cascade 없음).
- **canonical(공개 설명서)·운영자 승인 이력**: 상태 가드로 canonical 철회 차단, softDelete 는 canonical 행 미대상(fixture B·G). audit log 무변경.

## 6. typecheck·test·build·배포 (실행 7·8)

- **api-server tsc(변경 파일) 0** · **web-neture tsc 0 / vite build 0**.
- (narrowing 노트: api-server tsconfig 는 strictNullChecks off 로 boolean-판별 유니온 narrowing 미동작 → 철회 결과를 **flat 인터페이스**(`WithdrawSupplierStoreDraftResult`, optional 필드)로 반환해 회피.)
- jest 는 본 환경 OOM(런너 자원) — 유닛테스트는 SQL 가드·soft-delete 를 커버하지 않아 신호 아님. 실검증은 §4 라이브 API + 트랜잭션 fixture.
- 배포: **Deploy API Server success** + **deploy-neture success**. 라이브 엔드포인트 정상.

## 7. 프로덕션 smoke·테스트 데이터 순증 (실행 8)

- **테스트 데이터 순증 = 0.** 라이브 block-case(404/409)는 비-mutating. 라이브 allow-case(200)는 테스트 draft 1행을 생성→철회(soft-delete)→검증 후 **본인 테스트 행 hard-delete 로 정리(잔여 0)**. fixture 는 ROLLBACK. 기존 운영 데이터·보호 행 무접촉. 비밀번호·개인정보·설명서 본문 미기록.

## 8. 중지됐던 다국어 설명서 smoke 재개 가능 여부 (실행 10) — ✅ 가능

선행 smoke 의 원복 병목(§6-1 "공급자 STORE 설명서 삭제/철회 공식 엔드포인트 부재")이 **해소**됐다. 이제 공급자 UI/API 만으로 "STORE 설명서 저장 → 철회"가 왕복 가능하다(라이브 200 + listMine 비노출 실증). **`WO-O4O-SUPPLIER-MULTILINGUAL-STORE-DESCRIPTION-PRODUCTION-SMOKE-V1` 재개 가능** — 단, 편집기 드로어는 여전히 **공급자 등록 상품(offer)에서만 진입**하므로, 실브라우저 언어별 저장·철회 smoke 는 (a) 활성 공급자+등록 상품 계정, 또는 (b) 테스트 offer 생성·정리 승인이 있을 때 완결된다(offer 병목은 본 WO 범위 밖). STORE draft 철회 병목은 제거됨.

## 9. CHECK·commit·push (실행 9)

- 구현 커밋 `ceb2ce645`(4 files). 본 CHECK 별도 커밋.
- 변경 파일:
```
apps/api-server/src/modules/neture/services/shared-product-description.service.ts   (withdrawSupplierStoreDraft + result 인터페이스)
apps/api-server/src/modules/neture/controllers/supplier-store-description.controller.ts (DELETE /:id)
services/web-neture/src/lib/api/supplierStoreDescription.ts                          (withdraw client)
services/web-neture/src/pages/supplier/SupplierStoreDescriptionEditorDrawer.tsx      ('철회' 액션 + 확인)
docs/checks/CHECK-O4O-SUPPLIER-STORE-DESCRIPTION-WITHDRAW-V1.md                       (본 CHECK)
```

## 필수 불변식 점검

| 불변식 | 충족 |
|------|:---:|
| 공급자는 자기 작업본만 철회(created_by_supplier_id) | ✅ (fixture C not-owned=0, 라이브 404) |
| canonical·hidden·deprecated 철회 불가 | ✅ (라이브 409, fixture B=0) |
| 철회가 ProductMaster/offer 삭제 안 함 | ✅ (단일 id soft-delete) |
| 다른 언어 설명서 무영향 | ✅ (fixture E=2) |
| 철회 행이 편집기·검수 큐 비노출 | ✅ (라이브 listMine 비노출, fixture D·F=0) |
| 물리삭제 아닌 기존 삭제 계약 | ✅ (softDelete=deleted_at, DB 실측) |
| 운영자 승인 이력·공개 설명서 보존 | ✅ (canonical 미대상, fixture G=1) |
