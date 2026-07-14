# CHECK-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-AUDIT-LOG-V1

WO: `WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-AUDIT-LOG-V1`
상태: **CLOSED / PASS** (2026-07-14)
commit: `bfb959794` (feat) · `<이 CHECK 커밋>` (docs)

---

## 1. 최종 정책

- 감사 로그는 **canonical 교체 시에만** 남긴다 (`event_type='canonical_replaced'`).
- 일반 승인(기존 canonical 없음) / 수정 요청 / 만료 삭제 / hidden / draft / needs_review 는 **로그 대상 아님**.
- 로그는 **교체 트랜잭션(기존 canonical→hidden + 대상→canonical)과 같은 트랜잭션** 안에서 insert.
- **교체 정책 자체는 변경하지 않음** (replaceExisting===true 엄격 boolean, demote='hidden' 그대로).

## 2. 테이블 / migration

- 신규 테이블 `shared_product_description_audit_logs` (additive).
- migration `20270207000000-CreateSharedProductDescriptionAuditLogs.ts` — prod 부팅 시 **1 executed** (2026-07-14 06:02:17Z, startup.service.ts 경로). 기존 테이블/데이터 무변경.
- 컬럼: id, event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, performed_by, performed_at, metadata(jsonb), created_at. (prod information_schema 확인 완료)

## 3. FK / index 정책 (prod 확인)

- FK(감사 로그가 삭제/정리 job 을 막지 않도록 약하게):
  - `fk_spd_audit_master` → product_masters(id) **ON DELETE CASCADE** (`c`)
  - `fk_spd_audit_previous` / `fk_spd_audit_new` → shared_product_descriptions(id) **ON DELETE SET NULL** (`n`)
  - `fk_spd_audit_performed_by` → users(id) **ON DELETE SET NULL** (`n`)
- index: `idx_spd_audit_master_type_lang_at (master_id, description_type, language, performed_at DESC)`, `idx_spd_audit_previous`, `idx_spd_audit_new`, pkey.

## 4. audit event_type

- V1 = `canonical_replaced` 만 사용.

## 5. 기록 필드 (실측)

```
event_type=canonical_replaced, description_type=STORE, master_id, language=ko,
previous_description_id=기존 canonical(A), new_description_id=새 canonical(B),
previous_status=canonical, new_status=canonical, performed_by=운영자 user id,
metadata={ replaceExisting:true, previousDemotedTo:'hidden',
           source:'operator_supplier_store_description_review',
           previousSourceType:'supplier', newSupplierId:<공급자 SSOT> }
```

## 6. 트랜잭션 보장 방식

- `setCanonical(id, actor, {demotedStatus:'hidden', audit})` 단일 트랜잭션:
  1. 강등 **전** 기존 canonical id 캡처(raw SELECT, partial-unique 상 ≤1건),
  2. 기존 canonical → demotedStatus('hidden') UPDATE,
  3. 대상 → canonical save,
  4. audit insert.
- 감사 insert 조건(**중복/no-op 방지**): `audit` 있음 + `demotedStatus==='hidden'` + 강등된 기존 canonical 실제 존재 + `previousId !== targetId`.

## 7. 조회 API / UI 표시

- 운영자 상세 API(`GET /:id`)에 `auditLogs`(최근 5건, 수행자 이름 join) embed.
- 별도 엔드포인트 `GET /:id/audit-logs`(최근 20건) 추가.
- admin 검수 상세 모달에 **"교체 이력"** 섹션(교체 일시 · 수행자 · 기존/새 설명서 id · 기존 처리: hidden).

## 8. 실브라우저 / 실API smoke (prod, 2026-07-14) — 전 과정 PASS

`[SMOKE]` 데이터: master `33cc8fe7-ee6f-4c75-99b6-23a0fc195976`(기존 재사용) · throwaway offer `fb872d91-4e04-4e66-a9d2-493b30754c25`(공급자 renagang21=`91169739`) · SPD#1 A `d8ffeb30-8826-46a5-84e6-562743ce72ab` · SPD#2 B `dbab0d06-acc3-46de-82d5-7194b064df10` · audit `9b672347-0fed-47b4-8b66-78d8984bdc7e`.

- 픽스처(offer)만 raw SQL, **교체 자체는 실제 API 경로**(공급자 저작 API + 운영자 승인/교체 API)로 검증.

| # | 시나리오 | 기대 | 결과 |
|---|---------|------|------|
| 8.1 | 일반 승인(기존 canonical 없음, A→canonical) | audit 0 | **audit=0 PASS** |
| 8.2 | 교체(replaceExisting=true) A→hidden·B→canonical | audit 1 + 필드 정확 | **audit=1, 필드 전부 일치, A hidden·B canonical PASS** |
| 8.3 | 교체 실패 4종(`{}` / `"true"` / `1` / `false`) | 전부 409·audit 없음 | **4×HTTP 409, audit 여전히 0 PASS** |
| 8.4 | 중복/no-op(B 이미 canonical, 재승인 ×2) | audit 그대로 1 | **HTTP 200×2, audit=1 유지 PASS** |
| 8.5 | 운영자 상세 UI "교체 이력" | 렌더 | **"서철환가 기존 승인본을 숨기고… 교체" · 기존 d8ffeb30 → 새 dbab0d06 · 기존 처리: hidden PASS** (스크린샷) |
| 6.4 | detail embed + `/audit-logs` 엔드포인트 | 1건·수행자 join | **auditLogs 1건, performedByEmail=sohae2100 PASS** |

## 9. QR / product landing / tablet 미변경

- setCanonical 외 소비처(랜딩/`/p/{key}` QR/태블릿/매장 라이브뷰/다국어그룹) 코드·계약 무변경.

## 10. AUTO-CREDIT / source_ref_id 미변경

- resolveSupplierCredit(per-row source_ref_id) / source_ref_id 의미 무변경. audit 는 부가 기록만.

## 11. typecheck / build

- api-server `tsconfig.build.json` **0 error** · admin-dashboard `tsc --noEmit` **0 error**.

## 12. 배포

- main push `bfb959794` → **API Server / Admin Dashboard 배포 success** (2026-07-14). migration 1 executed(prod 로그 확인).

## 13. 테스트 데이터 정리 결과 (`[SMOKE]`)

| 항목 | id | 처리 |
|------|----|------|
| SPD#1 A | `d8ffeb30-8826-46a5-84e6-562743ce72ab` | **hidden**(교체 강등) |
| SPD#2 B | `dbab0d06-acc3-46de-82d5-7194b064df10` | **hidden**(정리 reject) |
| throwaway offer | `fb872d91-4e04-4e66-a9d2-493b30754c25` | **삭제**(DELETE 1) |
| audit log | `9b672347-0fed-47b4-8b66-78d8984bdc7e` | **유지**(WO §9 — 감사 로그는 삭제 불필요. 두 SPD hidden 처리로 FK refs 유효) |
| master(orphan) | `33cc8fe7-ee6f-4c75-99b6-23a0fc195976` | **잔존**(기존 `[SMOKE]` orphan 재사용, canonical STORE 0건, 무해) |

- 기존 운영 데이터 무수정. 교체 후 master 에 canonical STORE 0건(테스트 SPD 모두 hidden).

## 14. 변경 파일 목록

- `apps/api-server/src/modules/neture/entities/SharedProductDescriptionAuditLog.entity.ts` (신규)
- `apps/api-server/src/modules/neture/entities/index.ts` (export)
- `apps/api-server/src/database/entities.ts` (등록)
- `apps/api-server/src/database/migrations/20270207000000-CreateSharedProductDescriptionAuditLogs.ts` (신규)
- `apps/api-server/src/modules/neture/services/shared-product-description.service.ts` (setCanonical audit + 조회 + detail embed)
- `apps/api-server/src/modules/neture/controllers/operator-supplier-store-description-review.controller.ts` (audit opts + `/audit-logs` 엔드포인트)
- `apps/admin-dashboard/src/api/supplier-store-description-review.api.ts` (타입 + fetch)
- `apps/admin-dashboard/src/pages/o4o-product-db/SupplierStoreDescriptionReviewPage.tsx` (교체 이력 섹션)

## 15. commit / push

- `bfb959794` (feat, 8 files) · origin/main push 완료.
- 본 CHECK 갱신 커밋.

## 16. 후속 WO 후보 (미착수)

- `WO-O4O-STORE-IMPORTED-DESCRIPTION-REIMPORT-REPLACE-V1` — 매장 명시적 재-가져오기/교체.
- `WO-O4O-SPD-AUDIT-LOG-LIST-FILTER-V1` — 운영자 감사 로그 목록/필터(상품·운영자·기간·event_type).
