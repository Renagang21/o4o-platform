# CHECK-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-REVISION-REQUEST-AND-AUTO-DELETE-V1

> 운영자 검수 시 `반려 → hidden`을 **수정 요청(revision_requested) → 30일 후 자동 삭제**로 정리.

## 1. 최종 정책

```
운영자 수정 요청(사유 필수)
→ status=revision_requested, review_note=사유, revision_requested_at=now, revision_due_at=now+30일
→ 공급자 수정 후 다시 검수 요청(→needs_review) 가능
→ 기한(30일) 내 재요청 없으면 자동 hard delete
→ 중간 알림 없음 · archived 보관 없음
```

- 화면/업무 용어: `반려` → **수정 요청**. `hidden`은 "관리자 숨김/노출 중단" 전용으로 남김(공급자 수정 요청 기본 상태 아님).
- canonical 충돌 정책은 본 WO 범위 외(후속 `...-CANONICAL-CONFLICT-POLICY-V1`).

## 2. 추가 status

`SharedProductDescriptionStatus` union(varchar, enum 아님)에 **`revision_requested`** 추가. 기존 상태 의미 불변.
`draft`=작성중 / `needs_review`=검수대기 / `canonical`=승인 / `hidden`=관리자숨김 / `revision_requested`=수정요청.

## 3. 추가 컬럼 (migration `20270121000000`, additive nullable, backfill 없음)

| 컬럼 | 타입 | 의미 |
|------|------|------|
| `review_note` | text null | 운영자 수정 요청 사유(공급자 노출) |
| `revision_requested_at` | timestamp null | 수정 요청 시각 |
| `revision_due_at` | timestamp null | 재검수 마감(기본 requested_at + 30일). 경과 시 자동 삭제 대상 |

- partial index `idx_shared_product_descriptions_revision_due` (`status='revision_requested' AND revision_due_at IS NOT NULL`) — 만료 스캔용.
- source_type/source_ref_id/created_by/created_by_supplier_id/curated_by 무변경 → AUTO-CREDIT 무영향. canonical partial-unique 무영향.

## 4. 운영자 수정 요청 처리

- `POST /api/v1/admin/o4o-product-db/supplier-store-descriptions/:id/request-revision` (ADMIN_ROLES). body `{ reason }` — **사유 없으면 400** (`REASON_REQUIRED`).
- 서비스 `requestRevision(id, reason, actor, 30)`: supplier/STORE row 로만 한정(그 외 throw). status=revision_requested, review_note, revision_requested_at=now, revision_due_at=now+30일.
- 큐 UI: `반려/보류` 버튼 → **수정 요청**(사유 textarea 모달, 필수). `수정 요청`(revision_requested) 필터 추가. 상세 모달에 수정 요청 사유/기한 배너.
- 기존 `POST /:id/reject`(=setStatus hidden)는 "관리자 숨김"으로 유지(문구만 정리, 기본 버튼 아님).

## 5. 공급자 수정/재요청 처리

- `GET /neture/supplier/store-descriptions` 가 revision_requested 행 + `reviewNote`/`revisionDueAt` 반환.
- 공급자 화면: 상태 `수정 요청` 배지, 편집 드로어에 운영자 사유·기한 배너 + `다시 검수 요청` 버튼.
- 재요청: 기존 `upsertSupplierStoreDraft` 가 statuses IN (draft, needs_review, **revision_requested**) 행을 재사용. 공급자가 저장(submit 여부 무관)하면 **revision 필드(review_note/revision_requested_at/revision_due_at) null 초기화** → 만료 자동삭제 대상에서 제외. submit=true 시 status=needs_review·submitted_at=now.

## 6. 자동 삭제 job (dry-run/apply)

- 서비스 `expireRevisionRequested({apply})` — set-based.
- 엔드포인트: `GET /:base/expiry/dry-run`(대상 count+sampleIds), `POST /:base/expiry/apply`(hard delete). ADMIN_ROLES. 큐 UI 상단 "만료 정리" 패널(대상 확인 → 삭제 실행).
- **삭제 조건(엄격, DELETE WHERE 동일)**: `description_type='STORE' AND source_type='supplier' AND status='revision_requested' AND created_by_supplier_id IS NOT NULL AND revision_due_at IS NOT NULL AND revision_due_at < NOW() AND deleted_at IS NULL`.
- 스케줄러 연결은 본 WO 범위 외(엔드포인트/서비스만; cron 등록은 후속).

## 7. 삭제 guard 검증

삭제 제외 확인 대상: canonical / needs_review / draft / revision_requested+due 미래 / source_type≠supplier / description_type≠STORE / created_by_supplier_id null. (§ smoke 결과 참조)

## 8. AUTO-CREDIT fallback 유지

`resolveSupplierCredit` 무접촉. source_ref_id 의미/값 무변경. created_by_supplier_id backfill 없음.

## 9. 미변경 확인

canonical 승격 로직 · QR · product landing · tablet · SUPPLIER_STORE 무변경. 기존 hidden 일괄 변환/대량 삭제/backfill 없음.

## 10. migration 적용 결과

- migration `20270121000000` main 배포 → CI/CD 자동 적용. 컬럼 존재 확인: 운영자 `request-revision` 호출이 `review_note`/`revision_requested_at`/`revision_due_at` 를 500 없이 세팅(§13-4) → 3 컬럼 실재.

## 11. typecheck / build 결과

- api-server `tsconfig.build.json` typecheck **0 error**.
- services/web-neture `tsc --noEmit` **0 error**.
- apps/admin-dashboard `tsc --noEmit` **0 error**.

## 12. 배포 결과

- main push `ad090d03c` → CI/CD 3 타깃 전부 **success** (API/Admin/Web, 2026-07-13).
- 신규 엔드포인트 라이브(401 게이트): `POST /:id/request-revision`, `GET /expiry/dry-run`, `POST /expiry/apply`.

## 13. 실브라우저 smoke 결과 (prod, 2026-07-13)

전 과정 **PASS**. 공급자(ACTIVE, renagang21@gmail.com=(주)네뚜레 공급자 테스트) → 운영자(sohae2100@gmail.com=Neture admin).

1. 운영자 큐 UI = `수정 요청` 필터 탭 + `만료 정리`(대상 확인 dry-run) 패널 + 행 액션 `수정 요청`(반려 대체) 노출. ✅
2. 수정 요청 모달 = 사유 없이 "수정 요청 보내기" **비활성**(필수 검증). ✅
3. 사유 입력 후 수정 요청 → toast "수정 요청되었습니다(30일 기한)", 검수 대기 목록에서 제거. ✅
4. detail 필드: `status=revision_requested`, `review_note`=사유, `revision_requested_at`=시각, `revision_due_at`=**정확히 +30일**, `submitted_at` 보존. ✅ (migration 컬럼 실재 확인)
5. 자동삭제 dry-run guard: 이 행은 due **미래** → dry-run `count=0`(제외). ✅
6. 공급자 페이지 = 해당 상품 `수정 요청` 배지. 편집 드로어 = 배너(운영자 사유 + 기한 2026.08.12까지 + 자동삭제 안내) + `다시 검수 요청` 버튼. ✅
7. 본문 수정 후 `다시 검수 요청` → 동일 행 **upsert**(count=1, 중복 없음): `status=needs_review`, `submitted_at` 갱신, `review_note`/`revision_requested_at`/`revision_due_at` **전부 null 초기화**, 본문 갱신. ✅
8. 만료 apply 무-대상 안전 실행: `mode=apply, count=0, deleted=0`(대상 없음 → 무삭제, 에러 없음). ✅

**자동 삭제 job 검증 요약 (positive apply 미수행):**
1. dry-run 조건 검증 — revision_requested + past-due 대상 count/sampleIds 반환(무대상 시 0). ✅
2. DELETE WHERE = dry-run SELECT WHERE **동일 조건**(코드상 5중 guard 문자열 동일). ✅
3. `revision_due_at` 미래 행 → dry-run 대상 **0** 확인(실검증). ✅
4. 제외 guard(코드): canonical / needs_review / draft / created_by_supplier_id null / non-STORE / non-supplier 은 WHERE 에서 제외. ✅
5. apply 는 **무대상 실행(deleted:0)** 으로 유지. positive 삭제는 미수행. ✅
6. **자동 삭제 positive apply 는 의도적으로 수행하지 않음.** 사유: 운영 DB 에서 검증 목적의 `revision_due_at` backdate UPDATE 를 추가 발생시키지 않기 위함. dry-run 조건 + DELETE guard 동일성 + 무대상 apply + 코드 검증으로 대체. (핵심 = 삭제 성공 확인보다 **guard 오작동 방지 확인**)

## 14. 테스트 데이터 정리 결과 (`[SMOKE]`)

| 항목 | id / 값 | 처리 |
|------|---------|------|
| 상품명 | `[SMOKE] 수정요청 검증 상품` | — |
| barcode | `8809178390904` | — |
| offer id | `dad26482-f492-4e85-859b-fcd683a9322d` | **삭제**(bulk delete, deleted:1) |
| master id | `c7a93862-d4a4-4d86-bf1a-f8352d36e082` | 잔존(orphan `[SMOKE]` master, UI 삭제 경로 없음·무승인 불가) |
| SPD id | `4c9e8dc0-98e0-4afd-9101-db207d410a95` | **hidden**(reject 처리, 매장/큐 미노출) |

status 전이: needs_review → revision_requested(due 2026-08-12) → needs_review(재요청, revision 필드 초기화) → hidden(정리).

## 15. 변경 파일 목록

백엔드(api-server):
- `entities/SharedProductDescription.entity.ts` — status `revision_requested` + review_note/revision_requested_at/revision_due_at
- `database/migrations/20270121000000-AddRevisionRequestToSharedProductDescriptions.ts` — 신규
- `services/shared-product-description.service.ts` — requestRevision/expireRevisionRequested + upsert revision 재사용·초기화 + 조회 필드
- `controllers/operator-supplier-store-description-review.controller.ts` — request-revision + expiry dry-run/apply

프론트:
- admin-dashboard `api/supplier-store-description-review.api.ts` · `pages/o4o-product-db/SupplierStoreDescriptionReviewPage.tsx`
- web-neture `lib/api/supplierStoreDescription.ts` · `pages/supplier/SupplierStoreDescriptionsPage.tsx` · `pages/supplier/SupplierStoreDescriptionEditorDrawer.tsx`

## 16. commit SHA

- 구현: `ad090d03c` (feat) — 10 files.
- 배포/smoke 결과 기록: (본 CHECK 갱신 커밋 SHA.)

## 17. push 결과

- `ad090d03c` origin/main push 완료. CHECK 갱신 커밋 push (본 커밋).

## 완료 판정

**WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-REVISION-REQUEST-AND-AUTO-DELETE-V1 — CLOSED / PASS**
(구현·migration·정적검증(3앱 0)·배포·실브라우저 smoke 통과. 수정 요청(사유 필수)→revision_requested(+30일)→공급자 수정→다시 검수 요청(needs_review·revision 필드 초기화)→자동삭제 dry-run guard/무대상 apply 확인. positive apply 는 정책상 미수행. hidden 은 관리자 숨김 전용으로 유지.)

## 후속 WO

- `WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-CONFLICT-POLICY-V1` — 기존 STORE canonical 존재 시 승인 차단/교체 정책·기존 canonical 처리·운영자 확인 UI. (본 WO 범위 외)
- 자동 삭제 스케줄러 등록(cron) — 본 WO는 job/엔드포인트만; 스케줄 연결은 별도.
