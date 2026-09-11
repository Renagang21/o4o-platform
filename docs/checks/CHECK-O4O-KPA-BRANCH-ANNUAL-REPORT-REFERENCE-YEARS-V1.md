# CHECK — 신상신고 참조연도(reference_years) 도입 · 회비 Y / 연수교육 Y−1

- **WO**: `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REFERENCE-YEARS-V1`
- **일자**: 2026-09-11
- **판정**: **`REFERENCE_YEARS_CLOSED`**
- **선행**: [IR 약사 프로필 정본·신고연도 의미](../ir/IR-O4O-KPA-BRANCH-PHARMACIST-MASTER-AND-REPORT-YEAR-SEMANTICS-V1.md) · [WO① profile 정본화 CHECK](CHECK-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1.md)
- **commit**: `9c5786345` (구현 10 files) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — API `https://api.neture.co.kr/api/v1` · DB `o4o_platform` · 웹 `https://kpa-society.co.kr/kpa`
- **CI**: Deploy API Server `34550448864` success · Deploy Web Services `34550448910` success (sha `9c5786345`)

> 모든 수치는 2026-09-11 프로덕션 실측값이다. fixture 사용자 2명은 전부 `@o4o-fixture.test` 로 만들고
> 검증 종료 후 전량 원복했다 (§7). raw SQL 은 read-only 검증에만 썼고 데이터 생성은 전부 제품 API 로 했다.
> 원복만 승인 후 단일 트랜잭션 DELETE 로 수행했다.

---

## 0. 결과 요약

| # | WO 범위 | 결과 |
|:--:|---|:---:|
| 1 | `annual_report_templates.reference_years jsonb NOT NULL` migration | ✅ `20270406000000` 배포 적용 · 실제 정수 연도 저장 |
| 2 | 2027 draft `{fee:2027, training:2026}` · 2026 active backfill `{2026,2025}` | ✅ 운영자 API 실측 · 새 row 0 · 2027 draft 유지 |
| 3 | `fee.*` → `reference_years.fee` 원장 resolve | ✅ 2028 신고 → 2028 원장 `C` (2027 원장 A · 소속 B 아님) |
| 4 | `training.*` → `reference_years.training` 원장 resolve | ✅ 2028 신고 → 2027 원장 `8/5` (2028 원장 6/2 아님) |
| 5 | 신고연도 원장 미혼입 | ✅ 2028 교육만 있을 때 `training.*` = null |
| 6 | 제출본 존재 시 reference_years 변경 차단 | ✅ `409 TEMPLATE_IN_USE` · 동일값 200 · 제목 PATCH 200 |
| 7 | 제출 snapshot 보존 | ✅ 회원 조작값(fee A · training 2028/99) 무시 → snapshot `C` · `2027/8/5` |
| 8 | 과거 승인본·2026/2027 양식 불변 | ✅ `0bb1b228-…` values hash · 2027 reference_years 동일 |
| 9 | W7 콘솔 `year` = 업무연도 유지 | ✅ 기본 2026 · `year=2027/2028` 각 연도 원장 |
| 10 | UI 최소 표시 (rule editor 없음) | ✅ 회원 화면 `회비: N년 기준 · 연수교육: N−1년 기준` · 검수 상세 동일 |
| 11 | tenant/cross-service 회귀 0 · fixture 원복 | ✅ baseline 전 항목 SAME · 원복 후 잔여 0 |

---

## 1. fixture

| 축 | 값 |
|---|---|
| 분회 | `hwacheongun` 화천군약사회 · org `7f3f3cae-…5f2525824e7b` (active 회원 0 · 회비 정책 0 · 원장 0 인 상태에서 시작) |
| 운영자 | `w16-op@o4o-fixture.test` `52549788-…` (`POST /admin/users` roles `kpa-branch:operator` → 분회 등록) |
| 회원 | `w16-mem@o4o-fixture.test` `0de8f1c5-…` — `/join` `licenseNumber=W16-49695E` → 승인 → 분회 등록 `feeCategory=B1_pharmacy_employee` |
| 임시 양식 | 2028 v1 `47fdba04-…` (2026 복제 · `referenceYears` 생략 → 제안값 `{2028,2027}` · draft → 제출 구간만 active → archived → 삭제) |
| 회비 정책 | hwacheongun 2027 `A1 10000 / B1 5000` · 2028 `C1 10000 / B1 5000` (`PUT …/operator/fee-policies/:year`) |
| 회비 원장 | 2027 `A1_pharmacy_owner` `db246431-…` · 2028 `C1_hospital` `4c24df5d-…` |
| 교육 원장 | 2028 `required 6 / completed 2` → (⑤ 확인 후) 2027 `required 8 / completed 5` |

**2028 임시 양식을 쓴 이유**: 2026 active 양식은 신고 기간이 `2026-02-28` 로 닫혀 `submit` 이 403 `REPORT_PERIOD_CLOSED` 다.
2027 draft(`21a8b6e5-…`)는 불변 대상이라 활성화하지 않았다. `getCurrentTemplate()` 이 "기간 open 인 active → 없으면 최신 active" 이므로
2028 을 active 로 두는 동안만 회원 화면이 2028 을 가리키고, archived 로 되돌리면 2026 으로 복귀한다(§4 회원 smoke 가 2026 을 보인 이유).

---

## 2. E2E 실측 (양식 → 정책/원장 → prefill → 제출 → 변경 차단 → 콘솔)

| 단계 | 요청 | 결과 |
|---|---|---|
| ①-a | `GET …/operator/annual-report-templates/2026` | 200 `referenceYears {fee 2026, training 2025}` (backfill) |
| ①-b | `GET …/operator/annual-report-templates/2027` | 200 `referenceYears {fee 2027, training 2026}` · status `draft` |
| ②-a | `POST /admin/annual-report-templates {year 2028, sourceYear 2026}` (referenceYears 생략) | 201 `referenceYears {2028, 2027}` (`proposeReferenceYears`) |
| ②-b | 같은 요청 `referenceYears {fee:'x'}` (year 2029) | 400 `INVALID_REFERENCE_YEARS` · 2029 row 미생성 |
| ③ | 2028 양식 active · 회비 원장 2027=A1 / 2028=C1 · `GET …/me/annual-report` | `fee.category = C` (2028 원장) — 2027 원장 A 도 소속 B 도 아님 |
| ⑤ | 교육 원장 2028 만 존재 상태 | `training.creditYear/required/completed = [null,null,null]` — 신고연도 원장 미혼입 |
| ④ | 교육 원장 2027 개설(8) · completed 5 후 재조회 | `training = [2027, 8, 5]` — 2028 원장(6,2) 아님 |
| ⑥-a | 회원 응답 `template.referenceYears` | `{2028, 2027}` |
| ⑧-a | 제출본 0 · `PATCH …/:id {referenceYears {2028, 2026}}` | 200 |
| ⑧-b | 직후 `GET …/me/annual-report` | `training.creditYear = null` (2026 원장 없음 — 변경 즉시 resolve 반영) |
| ⑧-c | `PATCH {referenceYears {2028, 2027}}` 원복 | 200 |
| ⑦-a | `POST …/me/annual-report/submit` (회원이 `fee.category=A`, `training.* = 2028/99/99` 조작 전송) | 200 · report `9bbfba14-…` status `submitted` |
| ⑦-b/c | 검수 상세 `GET …/operator/annual-reports/:id` | snapshot `fee.category C` · `training 2027/8/5` — 조작값 무시 |
| ⑥-b | 검수 상세 `template.referenceYears` | `{2028, 2027}` 노출 |
| ⑦-d | 제출 후 회원 재조회 | `["C", 2027]` snapshot 유지 |
| ⑧-d | 제출본 1 · `PATCH {referenceYears {2028, 2026}}` | **409 `TEMPLATE_IN_USE`** data `{referenceYears {2028, 2027}}` |
| ⑧-e | 동일값 `PATCH {referenceYears {2028, 2027}}` | 200 (no-op 허용) |
| ⑧-f | `PATCH {title}` | 200 (다른 필드는 계속 편집 가능) |
| ⑧-g | **실제 2027 draft** `PATCH {referenceYears {2027, 2025}}` | 409 `TEMPLATE_IN_USE` data `{2027, 2026}` (승인본 `0bb1b228-…` 1건) |
| ⑨-a | `GET …/2027` 재조회 | `{2027, 2026}` 그대로 |
| ⑩-a | `GET …/operator/members` (year 생략) | 기본 year **2026** — active 2028 양식으로 덮이지 않음 |
| ⑩-b | `?year=2027` | edu `8/5` · report `not_submitted` |
| ⑩-c | `?year=2028` | edu `6/2` · report `submitted` |
| 종료 | `PATCH …/:id {status archived}` | 200 |

`w16_e2e.mjs` 24 checks **ALL PASS**.

---

## 3. 충돌·불변식 (DB read-only)

`w16_baseline.mjs` 를 E2E 전(`pre`)·후(`post`) 두 번 실행해 비교 — **전 항목 SAME**.

| 항목 | 값 |
|---|---|
| migration | `typeorm_migrations` 에 `AddAnnualReportTemplateReferenceYears20270406000000` 존재 · 컬럼 `reference_years jsonb NOT NULL` |
| 2026 active | `reference_years {"fee":2026,"training":2025}` · `updated_at` 불변 |
| 2027 draft `21a8b6e5-…` | `reference_years {"fee":2027,"training":2026}` · status `draft` · `updated_at` 불변 · 새 2027 row 0 |
| 승인본 `0bb1b228-…` | `md5(values::text) = db75731dfb6c17c34d32acb1c1426f76` · `fee.category C` · `training.creditYear null`(종전 상태 그대로 — 스냅샷 불변) |
| `kpa_organizations` | 229 |
| `kpa_members` | 7행 · hash `d11771998a22ca20f1bd856054e3375a` (write 0) |
| `kpa_pharmacist_profiles` (fixture 제외) | 6행 · hash `738ccf6436da388a435a579bcc75eb06` |
| `branch_memberships` (fixture 제외) | 3행 동일 |
| `service_memberships` per service | 전 서비스 count 동일 · fixture 2명은 `kpa-branch` 만 |
| `role_assignments` | 71 동일 |
| 타 분회 `branch_fee_policies` / 원장 | 정책 1 · 원장 count 동일 |

**2026 backfill `{2026,2025}` 근거**: 2026 양식의 제출본은 0 건이라 변경 가능 상태였고, 종전 코드는 fee/training 모두 신고연도(2026)
원장을 읽고 있었다. 이는 확정 계약(fee=Y, training=Y−1)에 대한 결함이지 보존할 의미가 아니므로 규칙대로 backfill 했다.
2027 승인본 스냅샷의 `training.creditYear null` 은 종전 결함의 흔적이지만 제출 스냅샷은 불변 대상이라 손대지 않았다.

---

## 4. 브라우저 smoke (Playwright · 프로덕션)

`w16_browser.mjs` — `/kpa/login` → fixture 계정 로그인.

| 화면 | 확인 문자열 | 결과 |
|---|---|---|
| 회원 `/kpa/hwacheongun/mypage/annual-report` (2028 archived 후 → 2026 양식) | `2026년도 신상신고 · 회비: 2026년 기준 · 연수교육: 2025년 기준` | ✅ |
| 운영자 `/kpa/hwacheongun/operator/annual-reports` → 신고년도 `2028` → `검수` | `제출 양식 v1 · 제출일 2026. 9. 11. · 회비 2028년 기준 · 연수교육 2027년 기준` | ✅ |

비고: web-kpa-branch 에는 **운영자용 양식 조회/편집 화면이 없다**(양식은 admin/operator API 로만 다룬다). 따라서 "UI 최소 표시" 는
회원 신상신고 화면 · 검수 상세 · API `referenceYears` 노출로 반영했고 rule editor 는 만들지 않았다(WO 금지 사항).

---

## 5. 코드 검증 (commit `9c5786345`)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/database/migrations/20270406000000-AddAnnualReportTemplateReferenceYears.ts` | ADD COLUMN jsonb NULL → backfill `jsonb_build_object('fee', year, 'training', year-1)` → SET NOT NULL → COMMENT. down = DROP COLUMN |
| `routes/kpa-branch/entities/annual-report-template.entity.ts` | `AnnualReportReferenceYears {fee; training}` · `@Column jsonb reference_years` (신고연도 fallback 없음) |
| `services/kpa-branch/AnnualReportService.ts` | `referenceYear(t, kind)` · `proposeReferenceYears(y)` · `resolveAssociationValues` — `fee.*` → feeYear 원장 · `training.*` → trainingYear 원장 · 없으면 `not_linked`(null) |
| `controllers/kpa-branch/AnnualReportTemplateController.ts` | `toSummary.referenceYears` · `normalizeReferenceYears`(정수 검증 → 400 `INVALID_REFERENCE_YEARS`) · `templateInUse`(제출본 존재 + 값 변경 → 409 `TEMPLATE_IN_USE`, 동일값 통과) |
| `controllers/kpa-branch/MemberAnnualReportController.ts` · `services/kpa-branch/AnnualReportReviewService.ts` | 회원/검수 응답 `template.referenceYears` |
| `services/web-kpa-branch/src/lib/api/annualReport.ts` · `operatorAnnualReport.ts` | 타입 `referenceYears` |
| `pages/annual-report/AnnualReportPage.tsx` · `pages/operator/AnnualReportsReviewPage.tsx` | 기준년도 텍스트 표시만 추가 |

수정하지 않은 것: auth-core(`modules/auth`) · `MembershipApprovalService` · 회원 콘솔 `year` 의미 · 원장 테이블 구조 · 대한약사회 외부 API · 2027 양식 내용.

---

## 6. 검증 항목 대조 (WO 필수 12항목)

| # | 항목 | 근거 |
|:--:|---|---|
| ① | 2027 draft `reference_years` 저장 | §2 ①-b · §3 |
| ② | fee=2027 / training=2026 | §2 ①-b |
| ③ | 2027 신고 → 2027 회비 resolve | §2 ③ (2028 양식으로 동형 검증 — 2027 draft 는 불변) |
| ④ | 2026 교육 resolve | §2 ④ (Y−1 원장) |
| ⑤ | 2027 교육만 있을 때 training 미혼입 | §2 ⑤ |
| ⑥ | 2026 회비 미혼입 | §2 ③ (Y−1 회비 원장 A 미혼입) |
| ⑦ | 제출 snapshot 보존 | §2 ⑦-a~d |
| ⑧ | 제출 후 변경 차단 | §2 ⑧-d~g |
| ⑨ | 과거 snapshot 불변 | §3 승인본 hash · 2027 reference_years |
| ⑩ | W7 console year 불변 | §2 ⑩-a~c |
| ⑪ | tenant/cross-service 회귀 0 | §3 baseline 전 항목 SAME |
| ⑫ | fixture 원복 | §7 |

---

## 7. fixture 원복

`w16_revert_db.mjs` — 대상은 이번에 만든 row id 뿐. 단일 트랜잭션 · 삭제 후 불변 대상 snapshot(org / kpa_members hash / profiles hash /
2026·2027 reference_years / 승인본 hash / 타 분회 정책)이 전과 다르면 ROLLBACK.

| 테이블 | dry-run | 실행 |
|---|:--:|:--:|
| `branch_fee_ledgers` | 2 | 2 |
| `branch_education_credit_ledgers` | 4 | 4 |
| `branch_fee_policies` (hwacheongun 2027·2028) | 4 | 4 |
| `annual_reports` | 1 | 1 |
| `annual_report_templates` (2028 archived `47fdba04-…`) | 1 | 1 |
| `kpa_pharmacist_profiles` | 2 | 2 |
| `branch_memberships` | 2 | 2 |
| `account_activities` | 7 | 7 |
| `action_logs` | 7 | 7 |
| `email_verification_tokens` | 1 | 1 |
| `role_assignments` | 2 | 2 |
| `service_credentials` | 2 | 2 |
| `service_memberships` | 2 | 2 |
| `users` (`@o4o-fixture.test`) | 2 | 2 |

결과(사용자 승인 후 실행): `COMMIT · 불변 대상 동일`(org 229 · kpa_members 7/`d1177199…` · profiles 6/`738ccf64…` · 2026 `{2026,2025}` / 2027 draft `{2027,2026}` · 승인본 `db75731d…` · 타 분회 정책 1) · `w16_residual.mjs` 15 항목 전부 **0**(users/profiles/bm/reports/template(2028)/policies/fee·edu ledgers/activities/action_logs/tokens/roles/credentials/service_memberships/hwacheongun active) · hwacheongun active 회원 0 · 정책 0 · 원장 0 (시작 상태 복귀).
교육 원장이 4행인 이유: `education-credits/open` 이 분회 active 전원(op fixture 포함)에 생성하기 때문 — 둘 다 fixture 소유라 원복 대상.

---

## 8. 범위 밖 발견 (수정하지 않음)

| # | 내용 | 처리 |
|---|---|---|
| 1 | 운영자용 양식 관리 화면 부재 — reference_years 는 API 로만 조회/변경 가능 | 보고만. 필요 시 별도 WO |
| 2 | 2027 승인본 `0bb1b228-…` snapshot 의 `training.creditYear null` (종전 코드가 2027 교육 원장을 읽은 흔적) | 스냅샷 불변 원칙에 따라 유지 |
| 3 | 회원 콘솔 기본 `year` = 달력 연도(2026) — 2027 업무연도 전환 시 운영 절차 필요 | 보고만 (WO 범위 밖 console year 재설계) |

문서 정합: 해당 없음
