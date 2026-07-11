# CHECK-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-DRYRUN-V1

> WO: `WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-DRYRUN-V1`
> 근거 IR: `docs/investigations/IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1`
> 작성일: 2026-07-11 · 상태: **구현 완료 (dry-run 전용) · apply 미구현**

---

## 1. IR 조사 결과 요약

공공데이터 후보 정비의 첫 위험 요소가 IR에서 확인됐다.

- `candidate_status` 가 등록 완료 계열(`approved_new_master` / `matched`) 인데 `matched_product_master_id` 가 NULL 인 **고아 후보 53,428건** 존재.
- 원인: 드럭 승격이 ProductMaster 230,841건을 생성 → 이후 `drug_unspecified` 정리에서 **53,428 master 삭제** → `matched_product_master_id` 가 `ON DELETE SET NULL` 이라 후보 링크만 끊기고 `candidate_status` 는 등록 완료로 잔존.
- 교차검증: 현재 DRUG master 177,413 = 230,841 − 53,428 (정확 일치).
- 위험: 정비 기능이 "master 링크 없음 = 미등록"으로 대상을 잡으면 이 53,428건을 **재승격해 삭제한 상품을 되살린다.**

→ 등록 기능보다 **이 고아 후보를 등록 대상에서 분리하는 정합화**를 먼저 한다.

---

## 2. 고아 후보 정의 (대상)

```sql
candidate_status IN ('approved_new_master', 'matched')
AND matched_product_master_id IS NULL
AND deleted_at IS NULL
```

## 3. archived 전환 제안 이유

`rejected` 가 아니라 **`archived`**.

- 이 후보들은 잘못된 공공데이터라 반려된 게 아니라, 한때 정상 승격됐다가 대응 master 가 **정책적으로 삭제된 잔재**다.
- 의미: "이미 처리됐으나 대응 master 가 제거되어 일반 등록/검토 대상에서 **제외 보관**한다."
- `archived` 는 이미 후보 UI 의 확립된 종결 상태다(`bulk-action` 의 `archive` → `archived`, grouped-status 매핑상 "제외" 버킷). 등록 전/등록 완료 뷰에서 자연히 빠진다. **부작용 없음.**

---

## 4. dry-run 실측 결과 (엔드포인트 쿼리 = 프로덕션 SELECT, DB write 0)

검증 채널: Cloud SQL Auth Proxy v2 (read-only). 엔드포인트가 실행하는 쿼리와 **동일 SQL** 로 재현.

| 항목 | 값 |
|---|---|
| **targetCount** | **53,428** |
| byStatus | `approved_new_master` 53,209 / `matched` 219 |
| bySourceLabel | `mfds-drug-master-standard-code_2025-10-31` 53,428 (단일) |
| nonDrugCount (드럭 외) | **0** |
| proposedChange | `approved_new_master / matched` → `archived` |
| applyEligible | **true** (드럭 트랙 단일 & 대상 존재) |
| applyEnabled | **false** (V1 apply 미구현) |
| warnings | (없음) |

→ IR §6 수치와 정확 일치. 대상은 전부 드럭 트랙 단일이며, HFF/의약외품/의료기기/e약은요/pending 은 대상에 포함되지 않는다(정의상·실측상).

샘플(마스킹): 경희한약오공 / 대효갈근 / 대효가자 등 한약제제 계열, 식별자 13자리, before=`approved_new_master`, after=`archived`.

---

## 5. 구현 범위 (V1)

### Backend (read-only)
- 신규: `apps/api-server/src/modules/neture/controllers/product-db-maintenance.controller.ts`
  - `POST /api/v1/admin/o4o-product-db/maintenance/jobs/orphan-registered-candidates/dry-run`
  - Guard: `authenticate` + `requireRole(ADMIN_ROLES)` (product-master-create 컨트롤러와 동일 롤셋).
  - TypeORM QueryBuilder, **파라미터 바인딩만** (string interpolation 없음). **DB write 0.**
  - 안전 검사: nonDrugCount(드럭 외 대상) / targetCount 0 → warnings. `applyEligible` 계산. `applyEnabled:false` 고정.
- 등록: `apps/api-server/src/bootstrap/register-routes.ts` (24-e2g-3 블록, 기존 admin o4o-product-db 등록 패턴 동일).

### Frontend
- `apps/admin-dashboard/src/api/o4o-product-db.api.ts` — `dryRunOrphanRegisteredCandidates()` + 타입 추가.
- `apps/admin-dashboard/src/pages/o4o-product-db/ProductDbMaintenancePage.tsx` — "준비중" 스텁 → "등록 완료 고아 후보 정합화" 카드로 교체.
  - Dry-run 버튼, 대상 수 / 상태별·source_label별 분포 / 샘플(최대 10) / 예상 변경 / 경고 표시.
  - **Apply 버튼은 disabled** ("정책 승인 후 실행 가능").
  - 성공/실패 `react-hot-toast` + 인라인 에러 표시.

---

## 6. 검증 결과

| 항목 | 결과 |
|---|---|
| dry-run DB write | **0** (SELECT/COUNT/GROUP BY 만) |
| 대상 count = IR 53,428 | ✅ 일치 |
| 대상에 pending 포함 | ❌ 없음 (정의상 제외) |
| 대상에 HFF/의약외품/의료기기/e약은요 포함 | ❌ 없음 (nonDrugCount 0) |
| 대상 source_label = 드럭 트랙 | ✅ 단일 (`mfds-drug-master-standard-code_2025-10-31`) |
| 샘플 before/after 표시 | ✅ |
| apply 버튼 disabled | ✅ (`applyEnabled:false`, UI disabled) |
| admin-dashboard typecheck | ✅ 0 errors |
| api-server typecheck (변경 파일) | ✅ 신규 controller/register-routes 에러 0. (기존 20 errors 는 무관한 `src/scripts/drug-otc-*` 일회성 스크립트 — 본 WO 미변경) |
| browser smoke | ✅ **PASS** (아래 §7) |

---

## 7. browser smoke — PASS (2026-07-11, 배포 후 프로덕션)

- 배포: commit `8cd009f0d` — Deploy API Server (Cloud Run) / Deploy Admin Dashboard (Cloud Run) **둘 다 success**.
- 환경: admin.neture.co.kr (프로덕션), Playwright chromium headless, admin 계정(SSOT env 주입, 자격증명 비노출).
- 절차: 로그인 → `/admin` 랜딩 → **client-side 네비게이션**으로 O4O 상품 DB → 데이터 정비 진입
  (deep-link `page.goto` 는 role 하이드레이션 전 guard 가 `/login` 으로 튕기므로 hard-nav 대신 클릭 이동).

| smoke 항목 | 결과 |
|---|---|
| "등록 완료 고아 후보 정합화" 카드 표시 | ✅ |
| Dry-run 실행 → API `POST .../dry-run` | ✅ HTTP **200**, `success:true` |
| toast 성공("Dry-run 완료") | ✅ |
| targetCount | ✅ **53,428** (화면 표시 + 응답) |
| byStatus | ✅ approved_new_master **53,209** / matched **219** |
| bySourceLabel | ✅ `mfds-drug-master-standard-code_2025-10-31` **단일** |
| pending/HFF/의약외품/의료기기/e약은요 포함 | ❌ 없음 (응답 분포 = 드럭 단일) |
| proposedChange | ✅ `approved_new_master / matched → archived` |
| applyEligible / applyEnabled | ✅ `true` / `false` |
| Apply 버튼 | ✅ 표시되나 **disabled** + "정책 승인 후 실행 가능" 문구 |
| console error / pageerror / network 4xx-5xx | ✅ 0 / 0 / 0 |
| DB write | ✅ 0 (dry-run read-only 엔드포인트) |

→ **browser smoke PASS.** 화면·권한·API 연결·표시값·apply 비활성까지 실환경 확인 완료.

---

## 8. 안전/금지 준수

- ProductMaster/ProductIdentifier 생성·삭제 **0**. ProductCandidate 변경 **0**(dry-run).
- pending / rejected / archived / 타 트랙 후보 변경 **0**.
- drug pending 74,681 승격 **미포함**(별도 트랙, 후속).
- migration **0**. 대량 write 구조와 결합 **없음**.
- apply 는 정책 승인(고아 53,428 을 archived 로 볼지 최종 확정) 후 후속 WO.

---

## 9. 다음 단계 (본 CHECK 범위 외)

1. 고아 53,428 archived 전환 apply 정책 승인 → apply 엔드포인트(청크 UPDATE + dry-run 재검증 count 일치 + confirmation) 구현.
2. 드럭 pending 74,681 코호트 분석(취소/무효/drug_unspecified/신규) — 왜 pending 인지.
3. 그 다음에야 드럭 한정 bulk dry-run 승격 검토.

---

*Status: dry-run 구현 완료 · DB write 0 · migration 0 · apply 미실행 · typecheck PASS · **browser smoke PASS**.*
