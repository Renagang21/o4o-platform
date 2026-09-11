# CHECK — 분회 회원 약사 프로필 정본화 (kpa_pharmacist_profiles canonical)

- **WO**: `WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1`
- **일자**: 2026-09-11
- **판정**: **`PROFILE_CANONICAL_CLOSED`**
- **선행**: [IR 약사 프로필 정본·신고연도 의미](../ir/IR-O4O-KPA-BRANCH-PHARMACIST-MASTER-AND-REPORT-YEAR-SEMANTICS-V1.md) · [W13 온보딩 E2E](CHECK-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1.md)
- **commit**: `87081e04d` (구현 23 files) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — API `https://api.neture.co.kr/api/v1` · DB `o4o_platform` · 웹 `https://kpa-society.co.kr/kpa`
- **CI**: Deploy API Server `34547310278` success · Deploy Web Services `34547310370` success · CodeQL `34547310167` success (sha `87081e04d`)

> 모든 수치는 2026-09-11 프로덕션 실측값이다. fixture 사용자 3명은 전부 `@o4o-fixture.test` 로 만들고
> 검증 종료 후 전량 원복했다 (§7). raw SQL 은 read-only 검증에만 썼고 데이터 생성은 전부 제품 API 로 했다.

---

## 0. 결과 요약

| # | WO 범위 | 결과 |
|:--:|---|:---:|
| 1 | join/승인 흐름에서 `businessInfo.licenseNumber` → profile 승격 | ✅ `/join` 201 → 승인 응답 `pharmacistProfile{created:false, licenseNumber 보존}` |
| 2 | profile 없으면 생성 · 있으면 보존 | ✅ 가입 시 생성 → 승인·분회 등록 시 `created:false` 로 보존 |
| 3 | license 충돌 시 overwrite 금지 | ✅ 동일 면허 가입 → `licenseConflict:true` · `license_number NULL` · 중복 0 |
| 4 | W3 sync target = profiles / branch_memberships | ✅ sync 200 · profile `activity_type` · bm `workplace_*` 반영 · `kpa_members` hash 불변 |
| 5 | W7 콘솔 면허번호 표시·검색 source 전환 | ✅ 목록 `licenseNumber`=profile · `?q=면허번호` 1건 · `hasPharmacistProfile:true` |
| 6 | 신상신고 prefill source 전환 | ✅ `personal.licenseNumber` · `employment.activityType` = profile 값 |
| 7 | `kpa_members` write 0 | ✅ kpa-branch 경로 write 0 · fixture 행 0 · 7행 hash 동일 |
| 8 | `branch_memberships` 3컬럼 migration | ✅ `20270405000000` 배포 적용 — `fee_category` `workplace_name` `workplace_address` 존재 |
| 9 | `/join` 화면 | ✅ 프로덕션 렌더링 · 로그인/디렉터리/레이아웃 링크 |
| 10 | 검수 raw code → label | ✅ `beforeLabel "약국 — 근무약사" → afterLabel "약국 — 개설약사"` |
| 11 | sync 불가 시 버튼 disable | ✅ API `ledgerDiff.unavailable` 계약 + 프론트 `disabled` (정적 검증 — §5 비고) |

---

## 1. fixture

| 축 | 값 |
|---|---|
| 분회 | `hwacheongun` 화천군약사회 · org `7f3f3cae-…5f2525824e7b` |
| 운영자 | `w15-op@o4o-fixture.test` `23ed1c0c-…` (`POST /admin/users` roles `kpa-branch:operator` → 분회 등록) |
| 회원 | `w15-mem@o4o-fixture.test` `3934e54b-…` — `/join` 에 `licenseNumber=W15-906AC6` `activityType=pharmacy_employee` |
| 충돌 회원 | `w15-dup@o4o-fixture.test` `cb6374e9-…` — 같은 면허번호로 `/join` |
| 임시 양식 | 2028 v1 `f4446b09-…` (2026 복제 · draft 생성 → 제출~sync 구간만 active → archived → 삭제) |

**2028 임시 양식을 쓴 이유**: 2026 active 양식은 신고 기간이 `2026-02-28` 로 닫혀 `submit` 이 403 `REPORT_PERIOD_CLOSED` 다.
2027 draft(`21a8b6e5-…`)는 불변 대상이라 활성화하지 않았다. active 였던 시간은 수 초이며 `updated_at` 으로 2026·2027 양식 무변경을 확인했다.

---

## 2. E2E 실측 (가입 → profile → 콘솔 → prefill → 검수 → sync)

| 단계 | 요청 | 결과 |
|---|---|---|
| 2-a | `POST /kpa-branch/join` `activityType=not_a_type` | 422 `ACTIVITY_TYPE_INVALID` |
| 2-b | `POST /kpa-branch/join` (면허·직역 포함) | 201 `pendingApproval:true` |
| 3 | `PATCH /admin/service-members/:id/approve` | 200 · `pharmacistProfile{id 22452750-…, created:false, licenseNumber W15-906AC6, activityType pharmacy_employee, licenseConflict:false}` |
| 4 | `POST …/operator/members {email, feeCategory:'B1_pharmacy_employee'}` | 201 · `feeCategory` = 분회 속성 · `pharmacistProfile.created:false` (보존) |
| 5-a~c | `GET …/operator/members` | 목록 row `licenseNumber W15-906AC6` · `hasPharmacistProfile true` · `feeCategory B1_pharmacy_employee` |
| 5-d | `GET …/operator/members?q=W15-906AC6` | 1건 |
| 5-e~f | `GET …/operator/members/:userId` | `licenseNumber` · `hasPharmacistProfile true` · `report.diffUnavailable "해당 연도 신고서가 없습니다."` |
| 6 | `GET …/me/annual-report` (2028) | `values['personal.licenseNumber']=W15-906AC6` · `values['employment.activityType']=pharmacy_employee` · `period.canSubmit true` |
| 7 | `POST …/me/annual-report/submit` (직역 `pharmacy_owner` · 근무처명·주소 신규) | 200 `submitted` · report `2be4c19c-…` |
| 8-0 | `GET …/operator/annual-reports?year=2028&status=submitted` | 1건 |
| 8 | `GET …/operator/annual-reports/:id` `ledgerDiff` | `unavailable:null` · `ledgerSource{license:'profile', workplace:'branch_membership'}` · changes 3 (아래) · skipped `personal.licenseNumber UNCHANGED` |
| 8-f | 승인 전 `POST …/sync` | 409 `REPORT_NOT_APPROVED` |
| 9-a | `POST …/approve` | 200 `approved` |
| 9-b | `POST …/sync` | 200 `applied:true` `syncedToMembership:true` changes 3 |
| 9-c | 재 `POST …/sync` | 200 `alreadySynced:true` (멱등 — 기존 계약) |
| 10 | `GET …/operator/members/:userId?year=2028` | `activityType pharmacy_owner` · `workplaceName "W15 검증약국"` · `workplaceAddress "강원 화천군 검증로 15"` · `licenseNumber` · `feeCategory` 불변 |

**ledgerDiff.changes (8)**

```json
[{"key":"employment.activityType","target":"kpa_members.activity_type","before":"pharmacy_employee","after":"pharmacy_owner","label":"활동유형","beforeLabel":"약국 — 근무약사","afterLabel":"약국 — 개설약사"},
 {"key":"employment.workplaceName","target":"kpa_members.pharmacy_name","before":null,"after":"W15 검증약국","label":"근무처 명칭"},
 {"key":"employment.workplaceRoadAddress","target":"kpa_members.pharmacy_address","before":null,"after":"강원 화천군 검증로 15","label":"근무처 도로명 주소"}]
```

`target` 이 `kpa_members.*` 인 것은 2026 양식(과 그 복제본)의 **legacy 식별자**다. 서버 allowlist 가 같은 식별자를
`kpa_pharmacist_profiles.activity_type` / `branch_memberships.workplace_*` 로 alias 하므로 양식 row 를 바꾸지 않고도 canonical 에 반영된다.

---

## 3. 충돌 · 불변식 (DB read-only)

| 항목 | 실측 |
|---|---|
| 충돌 가입 승인 응답 | `pharmacistProfile{created:false, licenseNumber:null, activityType:'hospital', licenseConflict:true}` |
| `kpa_pharmacist_profiles` fixture 3행 | op `(null,null)` · mem `(W15-906AC6, pharmacy_owner)` · dup `(null, hospital)` |
| `license_number = 'W15-906AC6'` | **1행** (중복 0) |
| `branch_memberships` (mem, org, active) | `fee_category B1_pharmacy_employee` · `workplace_name "W15 검증약국"` · `workplace_address "강원 화천군 검증로 15"` |
| `kpa_members` fixture 행 | **0** |
| `kpa_members` 전체 | 7행 · md5 `d1177199…` — 검증 전·후 동일 |
| 기존 `kpa_pharmacist_profiles` (fixture 제외) | 6행 · md5 `738ccf64…` — 검증 전·후 동일 |
| `annual_report_templates` 2026 active / 2027 draft | `updated_at` 2026-09-10 그대로 (무변경) |

> op 운영자도 분회 등록 시 `promoteFromUser` 로 빈 profile(면허·직역 null)이 생긴다. 콘솔은 이를 `hasPharmacistProfile:true` + 면허번호 `-` 로 표시한다.
> "profile 은 있으나 면허가 없는 회원"과 "profile 자체가 없는 회원(`약사 프로필 없음`)"을 구분하기 위한 의도된 동작이다.

---

## 4. 브라우저 smoke (프로덕션 · Playwright)

| 화면 | 확인 |
|---|---|
| `/kpa/join` | 폼 렌더링 — 이메일·비밀번호·이름·휴대전화·약사 면허번호·직역 구분(11종)·약관 체크·로그인 링크 |
| `/kpa/login` | 하단 "아직 회원이 아니신가요? 가입 신청" → `/kpa/join` |
| 분회 레이아웃 비로그인 헤더 | 로그인 · 가입 신청 링크 |
| `/kpa/hwacheongun/operator/annual-reports?year=2028` | 목록 1건 `승인완료 · 반영됨` → 검수 상세: 면허번호 `W15-906AC6` · 근무처 · 회비구분 `B`(branch_memberships 유래) · "회원정보에 반영 완료" |
| `/kpa/hwacheongun/operator/members` | 면허번호 검색 1건 → 상세: 면허번호 · **근무처 `W15 검증약국`** · 회비구분 `B1_pharmacy_employee` |

---

## 5. 코드 검증

- api-server `tsc --noEmit` 통과 · web-kpa-branch `tsc -p tsconfig.app.json` + `vite build` 통과.
- `services/kpa-branch` · `controllers/kpa-branch` 내 `kpa_members` **UPDATE/INSERT 0** (`grep`). 잔여 write 는 auth-core `createKpaRecords` · `MembershipApprovalService` · kpa(society) 라우트 · migration 뿐 — 사용자 불변식(auth-core 무변경)에 따라 범위 밖.
- 관련 단위 테스트 파일 없음(kpa-branch `__tests__` 부재) — 본 E2E 가 검증 수단.

**비고 — 범위 11 (sync 불가 시 버튼 disable)**: `AnnualReportsReviewPage` 의 `disabled={busy || detail.ledgerDiff.unavailable !== null}` + 사유 span. 프로덕션에는 "승인됐지만 원장이 없는 신고서"가 없어 disabled 상태를 화면으로 재현하지 못했다.
API 쪽은 `unavailableReason()` 3종 문구와 sync 409 `SYNC_TARGET_UNAVAILABLE` 로 계약이 닫혀 있고 프론트는 같은 `ledgerDiff.unavailable` 을 읽는다.

---

## 6. 검증 8항목 대조

| WO 검증 항목 | 결과 |
|---|:---:|
| 신규 분회 가입 회원 면허번호 prefill | ✅ §2-6 |
| 회원콘솔 면허번호 표시·검색 | ✅ §2-5 · §4 |
| 신고 검수 diff | ✅ §2-8 (label 포함) |
| 승인 후 canonical profile sync | ✅ §2-9 · §3 |
| 기존 profiles 보존 | ✅ 6행 hash 동일 |
| `kpa_members` 무변경 | ✅ 7행 hash 동일 · fixture 행 0 |
| 타 서비스 회귀 0 | ✅ `service_credentials`/`profiles` 는 fixture id 로만 접촉 · 2026/2027 양식 무변경 |
| fixture 원복 | ✅ §7 |

---

## 7. fixture 원복

`w15_revert_db.mjs` — 사용자 3명 id + 2028 양식 id 로만 좁힌 DELETE, 단일 트랜잭션, 불변 대상(`kpa_organizations` 229 · `kpa_members` hash · 기존 profiles hash · 2026/2027 양식) 변동 시 ROLLBACK.

| 테이블 | 삭제 |
|---|:---:|
| `annual_reports` | 1 |
| `annual_report_templates` (2028 archived) | 1 |
| `kpa_pharmacist_profiles` | 3 |
| `branch_memberships` | 2 |
| `account_activities` / `action_logs` | 7 / 7 |
| `email_verification_tokens` | 2 |
| `role_assignments` / `service_credentials` / `service_memberships` | 3 / 3 / 3 |
| `users` | 3 |
| `branch_fee_ledgers` / `branch_education_credit_ledgers` | 0 / 0 |

위 표는 dry-run 과 **실행 결과가 전부 일치**한 실측값이다 (2026-09-11 사용자 승인 후 실행 → `COMMIT`).

원복 후 read-only 재확인 (fixture 3명 id + 2028 양식 id + `%@o4o-fixture.test` 기준):

```text
fixture users = 0 · service_memberships = 0 · service_credentials = 0 · role_assignments = 0
kpa_pharmacist_profiles = 0 (user_id 또는 license W15-906AC6) · branch_memberships = 0
annual_reports = 0 · 2028 temp template = 0 (id · year=2028 모두)
account_activities = 0 · action_logs = 0 · email_verification_tokens = 0 · kpa_members(fixture) = 0
```

불변 대상 전·후 동일: `kpa_organizations` 229 · `kpa_members` 7행 hash `d1177199…` · 기존 `kpa_pharmacist_profiles` 6행 hash `738ccf64…` · 2026 active(`837b4436-…`)/2027 draft(`21a8b6e5-…`) 양식 `updated_at` 무변경.

---

## 8. 범위 밖 발견 (수정하지 않음)

1. 회원관리 콘솔 상세의 "검수 화면 →" · "회비 관리 →" · "연수교육 →" 링크 href 가 `/hwacheongun/operator/…` 로 basename `/kpa` 가 빠져 있다 (`MembersConsolePage` 기존 코드). 별도 WO 후보.
2. 회원 `GET /me/annual-report` 응답의 `report` 에는 `syncedToMembership` 이 없다 (운영자 응답에만 있음). 회원에게 반영 여부를 보여줄지는 정책 판단.
3. 후속 WO ② `reference_years`(Y/Y/Y−1) · ③ 신규 분회 생성 API 는 결정 메모대로 별도.

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§8-1)
