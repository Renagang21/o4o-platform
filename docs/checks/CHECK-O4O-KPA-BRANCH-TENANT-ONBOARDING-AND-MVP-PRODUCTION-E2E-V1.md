# CHECK — 신규 분회 온보딩 · MVP 프로덕션 E2E (W13)

- **WO**: `WO-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1`
- **일자**: 2026-09-10
- **판정**: **`KPA_BRANCH_MVP_READY`**
- **선행**: [W11-A 임원 명부](CHECK-O4O-KPA-BRANCH-OFFICER-ROSTER-V1.md) · [W11-B 회의 기록](CHECK-O4O-KPA-BRANCH-MEETING-POSTS-ADOPTION-V1.md) · [W12 IA·nav](CHECK-O4O-KPA-BRANCH-IA-AND-NAVIGATION-FINALIZATION-V1.md)
- **commit**: `5c1be0a8e` (양식 연도 개설 admin API) · `893707e11` (대상 연도 판정) · `3a4a5c29b` (회비 개별 부과) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — API `https://api.neture.co.kr/api/v1` · DB `o4o_platform` · 공개 `https://kpa-society.co.kr/kpa/{slug}`

> **본 CHECK 의 모든 수치는 2026-09-10 프로덕션 실측값이다.** 추정으로 채운 칸은 없다.
> 검증 분회는 실제 회원·데이터가 0 인 **화천군(`hwacheongun`)** 과 **횡성군(`hoengseonggun`)** 이며,
> fixture 사용자 4명은 전부 `@o4o-fixture.test` 로 만들고 검증 종료 후 전량 원복했다 (§8).

---

## 0. 결과 요약

| # | WO 항목 | 결과 |
|:--:|---|:---:|
| 1 | §1 조사 — 공용 URL·최초 운영자·양식·회비 write 경로 | ✅ MUST_AUTOMATE **3건** 확정 (§7) |
| 2 | §2 최초 운영자 지정 (canonical `POST /admin/users` + 분회 배정) | ✅ 201 · 재실행 200 멱등 · 중복 row 0 |
| 3 | §3 회원 등록·가입 (`AuthRegisterController` → 승인 → 분회 배정) | ✅ 201 → `pending` → 승인 200 → `active` |
| 4 | §4 canonical 209 분회 훼손 없음 | ✅ `/branches` 209 · `kpa_organizations` 228행 불변 |
| 5 | §5 초기화 → 기본정보 → publish → 공개 접근 | ✅ publish 전 404 `BRANCH_SITE_NOT_PUBLISHED` → publish 후 200 |
| 6 | §6 operator 연속 E2E 10단계 (동일 세션) | ✅ 전 단계 통과 (§4) |
| 7 | §7 member 연속 E2E 7단계 (동일 세션) | ✅ 전 단계 통과 · 신상신고 submit **200** (§5) |
| 8 | §8 tenant isolation A/B 교차 | ✅ 15개 시도 전부 차단 (§6) |
| 9 | §9 수동 운영절차 census 4분류 | ✅ MUST_AUTOMATE 3건 **전부 해소** (§7) |
| 10 | §10 fixture 원복 | ✅ 잔여 **0** · 209 분회·타 서비스 축 불변 (§8) |
| 11 | §11 판정 | ✅ **`KPA_BRANCH_MVP_READY`** |

---

## 1. 검증 대상 · fixture

| 축 | 값 |
|---|---|
| 분회 A | `hwacheongun` 화천군약사회 · org `7f3f3cae-…5f2525824e7b` |
| 분회 B | `hoengseonggun` 횡성군약사회 · org `4c89bd08-…9c189f8af40d` |
| 운영자 A / B | `w13-op-a@…` `dd647d03-…` / `w13-op-b@…` `c0f2e6b8-…` |
| 회원 A / B | `w13-mem-a@…` `6a2a104c-…` / `w13-mem-b@…` `d2ed2ee1-…` |

비밀번호는 런타임 난수로 생성해 scratchpad 밖에 남기지 않았고, 검증 종료와 함께 삭제했다.
분회 A·B 선정 기준은 **검증 착수 시점에 site·post·event·officer·member 가 전부 0** 이라는 실측이다
(209 분회 전수 조회 결과 게시된 사이트 0건, 데이터가 있는 분회 0건).

### §5 공개 사이트 — publish 전/후

| 시점 | 요청 | 결과 |
|---|---|---|
| publish 전 | `GET /kpa-branch/branches/{slug}/site` (비로그인) | **404 `BRANCH_SITE_NOT_PUBLISHED`** — 두 분회 모두 |
| 기본정보 저장·게시 | `PUT operator/site` (`isPublished: true`) | 200 · 제목·연락처 반영 |
| publish 후 | 같은 공개 GET | **200** · `slug`·`branchName`·`title` 정상 |
| 브라우저(미게시 분회) | `https://kpa-society.co.kr/kpa/namgu` | 셸(로그인·홈·공지·행사·자료실·임원소개)은 뜨고 본문은 “아직 공개되지 않은 분회 홈페이지입니다.” |
| 브라우저(게시 분회) | `/kpa/hwacheongun` 홈·공지·행사·자료실·임원소개 | 5개 화면 정상 렌더 (스크린샷 확보) |

---

## 2. §2 최초 운영자 지정 — 금지 4개를 지킨 경로

```text
POST /api/v1/admin/users            { serviceKey: 'kpa-branch', role: 'kpa-branch:operator' }
  → 201 { cred: 'CREATED', mem: 'CREATED' }
  → 재실행 200 { existing: true, cred: 'KEEP_EXISTING_CREDENTIAL', mem: 'KEEP_EXISTING_STATUS' }
POST /api/v1/kpa-branch/admin/branches/{slug}/members   → 201 branch_memberships.status='active'
```

| WO §2 금지 | 지켜진 근거 |
|---|---|
| password hash 직접 복사 정식 기능화 | 하지 않음 — 운영자 자격은 `service_credentials` 를 **신규 생성**하는 canonical 경로로만 만들었다 |
| 다른 서비스 비밀번호 변경 | 없음 — `serviceKey='kpa-branch'` 행만 생겼고 타 서비스 행은 손대지 않았다 |
| 분회별 credential namespace 신설 | 없음 — namespace 는 **서비스 축(`kpa-branch`) 하나**, 분회 축은 `branch_memberships` 가 담당한다 |
| 재실행 시 중복 row | 없음 — 재실행이 `KEEP_EXISTING_*` 로 끝나고 row 는 늘지 않았다 |

로그인 후 `GET /kpa-branch/me/access` = `roles:["kpa-branch:operator"]`, `entryPoints.operator=true`,
`currentBranch.organizationId` 가 배정 분회와 일치한다.

---

## 3. §3 회원 등록·가입 — 운영자가 비밀번호를 정하지 않는다

```text
POST /api/v1/auth/register (serviceKey='kpa-branch', 본인이 비밀번호 설정)
  → 201 { status: 'pending', pendingApproval: true }
PATCH /kpa-branch/admin/service-members/{id}  { status: 'active' }   → 200
POST  /kpa-branch/branches/{slug}/operator/members  { userId }        → 201
로그인 → roles:["kpa-branch:member"] · entryPoints.member=true
```

- **운영자가 임의 비밀번호를 설정하는 구조는 만들지 않았다.** 비밀번호는 등록 요청자가 정한다.
- 승인 콘솔은 admin 축이다 — 운영자 토큰으로 `GET /kpa-branch/admin/service-members` 는 **403 FORBIDDEN (`Required scope: kpa-branch:admin`)**.
- 약관 미동의로 보낸 첫 시도는 400 `Terms of service must be accepted` 로 거부됐다 (기존 계약이 그대로 작동).

---

## 4. §6 operator 연속 E2E (동일 세션 · 분회 A)

| 단계 | 요청 | 결과 |
|:--:|---|---|
| 1 사이트 정보 | `GET`/`PUT operator/site` | 200 · `isPublished` 전환 반영 |
| 2 회원 관리 | `operator/members` · `/{id}` · `/{id}/history` | 200 / 200 / 200 |
| 3 전출 → 전입 | `POST /{id}/leave` → `POST operator/members` | 200 `status:'left'` → 201 새 membership `cb544632-…` |
| 4 회비 정책·부과 | `PUT operator/fee-policies/2026` → `assess` | 200 / 200 (`created:0`, 전원 `NO_FEE_CATEGORY` — §7 MUST_AUTOMATE #3 으로 확정) |
| 5 연수교육 | `POST operator/education/open` → `PATCH` | 200 `created:2` / 200 이수학점 반영 |
| 6 공지·자료·회의록 | `POST operator/posts` ×3 | 201 ×3 (`notice` / `resource` / `meeting`) · 목록 200 |
| 7 행사 | `POST operator/events` | 201 `1395732e-…` |
| 8 임원 | `POST operator/officers` | 201 `029f54d0-…` (회장) |
| 9 신상신고 검수 | `operator/annual-reports` 목록·상세 | 200 · draft 상태에서 approve 409 `REPORT_NOT_REVIEWABLE` · sync 409 `REPORT_NOT_APPROVED` (**상태 기계가 정상 작동**) |
| 10 행사 참가자 | `GET operator/events/{id}/rsvps` | 200 · 회원 A 응답 1건 확인 |

9번은 §5 에서 2027 양식을 열어 회원이 실제로 **submit → 운영자 approve 200** 까지 이어 검증했다.
`approve` 이후 `sync` 는 404 `MEMBER_LEDGER_NOT_FOUND` 로 남는다 — 분회 서비스 가입 회원에게는
KPA 본회 회원 원장(`kpa_members`) 행이 없고, **분회 신고서가 KPA 회원자격을 만들어내면 안 된다**는
축 경계 계약의 의도된 결과다 (그래서 회비구분은 §7 #3 의 분회 축 경로로 해결했다).

---

## 5. §7 member 연속 E2E (동일 세션 · 회원 A)

| 단계 | 결과 |
|---|---|
| 로그인 → `me/access` | 200 `roles:["kpa-branch:member"]` |
| 내 정보 `me/branch` | 200 · 소속 분회 = A |
| 신상신고 draft | 200 `26464a78-…` |
| 신상신고 **submit** | **200 `status:'submitted'`** (2026 양식으로는 403 `REPORT_PERIOD_CLOSED` → §7 MUST_AUTOMATE #1·#2 해소 후 2027 양식에서 성공) |
| 내 회비 `me/fees` | 200 · §7 개별 부과 후 1건(`paid`) |
| 연수교육 `me/education` | 200 · 필수 8학점 / 이수 반영 |
| 행사 RSVP | 200 · 운영자 rsvps 목록에 반영 |
| 회의록 `me/posts` | 200 · `category:'meeting'` 포함 |

> **WO §7 단서 준수**: 2026 양식은 접수기간(`~2026-02-28`)이 끝나 submit 이 403 이었다.
> **우회 로직을 만들지 않고**, 기존 계약이 요구하는 대로 **2027 양식을 정규 admin 경로로 개설**해
> 신고기간 안에서 제출했다. 422 `VALIDATION_FAILED` 는 필드 정의(`pattern` / `min`·`max`)를 조회해
> **계약이 요구하는 형태 그대로** 값을 채워 해소했다 (검증 완화 아님).

---

## 6. §8 tenant isolation — A/B 교차 15건 전부 차단

| 시도 | 결과 |
|---|---|
| 운영자 A → 분회 B `members` / `site` PUT / `posts` POST / `officers` POST | **403 `BRANCH_SCOPE_MISMATCH`** ×4 |
| 운영자 B → 분회 A 의 event / report / post **id 직접 지정** | **404** `EVENT_NOT_FOUND` / `REPORT_NOT_FOUND` / `BRANCH_POST_NOT_FOUND` ×3 |
| 회원 A → 분회 B `me/posts` · `me/officers` · `me/fees` · 신고서 draft | **403 `BRANCH_SCOPE_MISMATCH`** ×4 |
| 회원 B → 분회 A `me/posts` · 행사 RSVP | **403 `BRANCH_SCOPE_MISMATCH`** ×2 |
| 운영자 B → **분회 A 회원에게 회비 부과** | **404 `MEMBER_NOT_IN_BRANCH`** (신규 경로도 분회 축을 통과 못 한다) |
| 혼선 확인 | 분회 B 의 posts / events / officers = **0건** (A 의 데이터가 새지 않는다) |
| URL slug ↔ organizationId | 두 분회 모두 일치 |

---

## 7. §9 수동 운영절차 census

### MUST_AUTOMATE — 3건, 전부 이번 WO 에서 해소

| # | 막힘 | 왜 개발자 raw SQL 없이는 막히나 | 해소 | commit |
|:--:|---|---|---|---|
| 1 | 신상신고 양식 **연도 개설** | `annual_report_templates` 의 유일한 write 경로가 migration 이었다 — 새 연도를 여는 데 배포가 필요했다 | `POST` / `PATCH /kpa-branch/admin/annual-report-templates` (admin 전용 · 중복 409 `TEMPLATE_ALREADY_EXISTS` · operator 시도 403) | `5c1be0a8e` |
| 2 | 대상 연도가 **코드 상수** | `TARGET_YEAR ?? 2026` 이라 양식을 열어도 회원 화면이 옛 연도를 봤다 | `AnnualReportService.getCurrentTemplate()` — 활성 양식에서 판정 | `893707e11` |
| 3 | 회비구분 **write 경로 부재** | 일괄 부과는 회비구분을 `kpa_members.fee_category` 에서만 읽는데, 분회 서비스로 직접 가입한 회원에게는 그 행이 없고 신상신고 sync 도 그 행을 만들지 않는다(축 경계). 양식에서도 `fee.category` 는 `ownership:'association'` 이라 회원이 못 쓴다 → **신규 분회 전원이 영구히 `NO_FEE_CATEGORY`** | `POST /branches/{slug}/operator/fee-ledgers` — 운영자가 구분을 정해 개별 부과(금액은 정책에서 파생) | `3a4a5c29b` |

**#3 해소 후 실측**: 정책 PUT 200 → 개별 부과 **201** (`0b596d6f-…`, `B1_employed` 150,000) →
재실행 **409 `LEDGER_EXISTS`** → 정책 없는 구분 **409 `POLICY_INVALID`** → 타 분회 운영자 **404 `MEMBER_NOT_IN_BRANCH`** →
납부 PATCH 200 → `assess` 재실행이 `ALREADY_ASSESSED` 로 건너뜀(납부 기록 보존) →
회원 상세 `status:"paid"`, `feeCategory:"B1_employed"`, `outstanding:0`.

### ADMIN_OPERATION_OK — 사람이 콘솔에서 하면 되는 일

- 최초 운영자 계정 발급 (`POST /admin/users`)
- 분회 서비스 가입 승인 (`PATCH /kpa-branch/admin/service-members/{id}`)
- 사용자 지정 도메인 승인
- 신상신고 양식 연도 개설·접수기간 조정 (MUST_AUTOMATE #1 해소로 **admin API 가 생겨** 이 분류로 내려왔다)

### ONE_TIME_INFRA — 최초 1회 인프라

- 209개 canonical 분회 seed
- 신상신고 양식 최초 migration (`2026`)

### OPTIONAL — MVP_READY 를 막지 않아 이번 WO 에서 고치지 않음

1. `GET /kpa-branch/me/access` 의 `entryPoints` 역할 계층이 비대칭이다 — operator 로그인 시 `member:false`.
   화면은 `satisfiesRole` 로 상위 역할을 통과시키므로 실사용 영향이 없다.
2. 제출 완료본에서 `values['fee.category']=null` 인데 `associationLinkStatus='resolved'` 다.
   **제출 스냅샷은 그대로 반환한다**(제출 후 협회 값 재주입 금지)는 계약의 결과이며, 링크 상태는 현재값 기준이다.
   두 값의 시점이 다르다는 사실이 화면에 드러나지 않는 것이 유일한 아쉬움이다.

---

## 8. §10 fixture 원복

프로덕션 DB 에서 FK·컬럼을 전수 스캔해 **이번에 만든 row 만** 자식→부모 순서로 한 트랜잭션에서 삭제했다.
`kpa_organizations` 총계가 삭제 전후로 다르면 `ROLLBACK` 하는 안전장치를 걸었다.

| 테이블 | 삭제 | 테이블 | 삭제 |
|---|--:|---|--:|
| `branch_event_rsvps` | 1 | `branch_sites` | 2 |
| `branch_events` | 1 | `branch_memberships` | 5 |
| `branch_officers` | 1 | `account_activities` | 33 |
| `branch_posts` | 3 | `action_logs` | 33 |
| `branch_fee_ledgers` | 1 | `email_verification_tokens` | 2 |
| `branch_fee_policies` | 3 | `role_assignments` | 4 |
| `branch_education_credit_ledgers` | 2 | `service_credentials` | 4 |
| `annual_reports` | 2 | `service_memberships` | 4 |
| `annual_report_templates` (2027 1건) | 1 | `users` | 4 |

**원복 후 재검증**: 위 테이블 × `user_id`·`organization_id` 축 **잔여 0** ·
`@o4o-fixture.test` 사용자 **0** · `kpa_organizations` **228행 불변** ·
`annual_report_templates` 잔여는 migration seed 인 **2026 1건**뿐 · `branch_sites` 전체 **0행**.

WO §10 준수:

- 만든 row id 만 삭제했다. `branch_posts` 는 운영자 API DELETE 가 200 을 주고도 soft delete 라 DB 에 남아 있었고, 여기서 hard delete 했다.
- **실제 전출입 history 를 테스트 흔적으로 남기지 않았다** — 전출·전입 검증은 fixture 회원에게만 했고 그 `branch_memberships` 5행을 전부 지웠다.
- 실제 약사·운영자 계정의 `users.status`·타 서비스 `service_memberships`·`role_assignments`·`service_credentials` 는 손대지 않았다 (삭제 조건이 fixture 4명의 `user_id` 로만 좁혀져 있다).
- 209개 canonical 분회는 불변이다.

---

## 9. §11 판정

**`KPA_BRANCH_MVP_READY`**

근거: 신규 분회 1곳이 ①공용 URL(`/kpa/{slug}`) ②최초 운영자 ③회원 가입·승인 ④공개 사이트 게시
⑤운영자 10개 핵심 업무 ⑥회원 7개 핵심 업무 ⑦분회 간 격리를 **프로덕션에서 개발자 raw SQL 없이** 전부 수행했다.
막고 있던 MUST_AUTOMATE 3건은 전부 정규 API 로 해소해 배포했고, 남은 OPTIONAL 2건은 MVP 사용을 막지 않는다.

---

## 10. 남은 관찰 (별도 WO 후보 · 이번 범위 아님)

1. `entryPoints` 역할 계층 비대칭 (§7 OPTIONAL 1) — 응답 계약 변경이므로 소비처 조사 후 별도 WO.
2. 제출본 스냅샷 vs `associationLinkStatus` 시점 비대칭 (§7 OPTIONAL 2) — 화면 표기 문제로 다루는 편이 안전하다.
3. `branch_posts` DELETE 가 soft delete 라는 사실이 API 응답(200)에 드러나지 않는다. 운영상 문제는 없으나 목록·복구 UX 가 없다.
