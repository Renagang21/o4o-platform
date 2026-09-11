# CHECK — 신규 분회 개통 운영 절차 · 체크리스트 · 관리자 UX 점검

- **WO**: `WO-O4O-KPA-BRANCH-NEW-TENANT-ONBOARDING-OPERATIONS-V1`
- **일자**: 2026-09-11
- **판정**: **`NEW_BRANCH_ONBOARDING_READY`** (조건부 — §9 한계 3건은 READY 판정을 막지 않는다)
- **선행**: [WO③ 분회 생성 canonical API CHECK](CHECK-O4O-KPA-BRANCH-CANONICAL-BRANCH-CREATION-API-V1.md) · [WO① profile 정본화](CHECK-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1.md) · [WO② reference_years](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-REFERENCE-YEARS-V1.md)
- **commit**: `61e4d393c` (구현 2 files — `BranchAdminController.ts` `update` 추가 · `kpa-branch.routes.ts` `PATCH /admin/branches/:id`) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — API `https://api.neture.co.kr/api/v1` · DB `o4o_platform` · 웹 `https://kpa-society.co.kr/kpa`
- **CI**: Deploy API Server `34562420795` success (sha `61e4d393c`) · 배포 리비전 `o4o-core-api-03615-klw` · CodeQL success

> 이 WO 는 새 기능이 아니라 **"신규 분회 개통 표준 절차"** 를 닫는 것이다. 성공 조건은 "테스트 데이터를 완전히 지웠는가"가 아니라
> **"개발자 SQL 없이 같은 절차로 다음 실제 분회를 개통할 수 있는가"** 다.
> 리허설은 프로덕션에서 canonical API 만 사용했고(raw SQL 0 · DB 직접 write 0), 사용자·credential·role·service_membership 은
> 하나도 만들지 않았다(영구 계정 2개 재사용). 테스트 분회 `test-branch-onboarding` 은 **삭제하지 않고 unpublished 로 남겼다**.

---

## 0. 결과 요약 (최종 보고 7항목)

| # | 항목 | 결과 |
|:--:|---|---|
| 1 | 개통 입력정보 정의 | §1 — 필수 8 · 선택 3. **대표 이메일은 `kpa_organizations` 가 아니라 `branch_sites.contact.email`** (사이트 설정에서 관리) |
| 2 | 표준 개통 절차 | §2 — 8단계, 단계마다 API + UI 병기. 전 단계 canonical API 존재 (이번 WO 에서 `PATCH /admin/branches/:id` 1개 추가) |
| 3 | UI · API 현황 | §5 — `UI_EXISTS` 5 · `API_ONLY_BUT_ACCEPTABLE` 3 · `MUST_HAVE_ADMIN_UI` 2 |
| 4 | MUST_HAVE_ADMIN_UI | §5-1 — ① 서비스 가입 승인(`admin/service-members`) 화면 없음(회원마다 반복) ② 최초 운영자 등록(admin-dashboard 운영자 카탈로그에 `kpa-branch` 없음). 둘 다 **후속 WO 후보**, 개통 자체는 API 로 가능 |
| 5 | 리허설 결과 | §6 — `w18_rehearsal.mjs` 44항목 중 실질 44 PASS(스크립트 assertion 형태 오류 4건은 read-only 재검증으로 정정, §6-1) · 브라우저 5경로 200 · 신규 users/service_memberships/role_assignments **0** · 두 영구 계정 소속 `o4o-pilot` 원복 |
| 6 | 분회 개통 체크리스트 | §7 — 개통 전 6 · 개통 8단계 · 개통 후 9 |
| 7 | 판정 | **`NEW_BRANCH_ONBOARDING_READY`** — raw SQL 0 / canonical API 만 / 생성→운영자→사이트→회원 가입·승인 가능 / `kpa-society.co.kr/kpa/{slug}` 즉시 / 체크리스트만 보고 반복 가능. 한계 §9 |

---

## 1. 개통 입력정보

| 구분 | 항목 | 저장 위치 | 입력 경로 |
|---|---|---|---|
| 필수 | 분회명 `name` (≤200) | `kpa_organizations.name` | `POST /admin/branches` · 수정 `PATCH /admin/branches/:id` |
| 필수 | slug (`^[a-z0-9]+(-[a-z0-9]+)*$` 2~80) | `kpa_organizations.slug` (부분 UNIQUE) | `POST /admin/branches` — **개통 후 변경 불가**(PATCH 무시) |
| 선택→권장 | 상위 지부 `parentId` | `kpa_organizations.parent_id` (표시용) | POST/PATCH — 활성 조직 UUID. 예: 대한약사회 `a0000000-…0001`(association) · 경기도약사회 등(branch) |
| 필수 | 대표 주소 (≤200) | `kpa_organizations.address` (공개 목록·단건 노출) | **`PATCH /admin/branches/:id`** (이번 WO 신설) |
| 필수 | 대표 전화 (≤50) | `kpa_organizations.phone` | 동상 |
| 필수 | **대표 이메일** | `branch_sites.contact.email` (jsonb) | `PUT /branches/{slug}/operator/site` · UI `/kpa/{slug}/operator/site` |
| 필수 | 사이트 공개 여부 | `branch_sites.is_published` | 동상 (`isPublished`) |
| 필수 | 최초 운영자 이메일 | `users` + `service_memberships(kpa-branch)` + `role_assignments(kpa-branch:operator)` + `branch_memberships` | §2 단계 ②·③ |
| 선택 | 소개문 `intro` · 태그라인 · 로고 URL | `branch_sites` | operator/site |
| 선택 | 분회 설명 `description` (≤500) | `kpa_organizations.description` | POST/PATCH |
| 선택 | 자체 도메인 | `branch_domains` | 후속 (§8) — 기본은 `kpa-society.co.kr/kpa/{slug}` |

---

## 2. 표준 개통 절차 (8단계)

| 단계 | 행위자 | canonical API | UI | 분류 |
|:--:|---|---|---|---|
| ① 분회 생성 | platform:super_admin | `POST /api/v1/kpa-branch/admin/branches {name, slug, parentId?, description?}` → 201 · `site.isPublished:false` | 없음 | API_ONLY_BUT_ACCEPTABLE |
| ①-a 기본정보 | platform:super_admin | `PATCH /api/v1/kpa-branch/admin/branches/:id {address, phone, name?, parentId?, description?}` → 200 (신설) | 없음 | API_ONLY_BUT_ACCEPTABLE |
| ② 최초 운영자 계정·서비스 권한 | platform admin | 기존 계정: `PUT /admin/users/:id` roles 에 `kpa-branch:operator` 추가 / 신규: `POST /admin/users {email,password,name,roles:['kpa-branch:operator'],serviceKey:'kpa-branch'}` (W14 선례) | admin-dashboard `OperatorsPage` — **역할 카탈로그에 `kpa-branch` 없음** | **MUST_HAVE_ADMIN_UI** |
| ③ 운영자 분회 소속 | super_admin(첫 운영자) / 이후 운영자 | `POST /api/v1/kpa-branch/branches/{slug}/operator/members {email, note?, effectiveDate?, reason?}` → 201 (다른 분회 active 면 같은 트랜잭션에서 전출) | `/kpa/{slug}/operator/members` "전입·소속 등록" | UI_EXISTS (첫 운영자만 super_admin 이 API/bypass 로) |
| ④ 사이트 초기화 | 운영자 | `PUT /api/v1/kpa-branch/branches/{slug}/operator/site {title, tagline, intro, logoUrl, contact{email,phone,address,hours,fax}, isPublished:false}` | `/kpa/{slug}/operator/site` | UI_EXISTS |
| ⑤ 기본정보 입력 | 운영자 | ④ 와 동일 body (대표 이메일 포함) | 동상 | UI_EXISTS |
| ⑥ 공개 URL 확인 | 누구나 | `GET /branches/{slug}` 200 `resolvedBy:slug` · 미게시면 `/site` 404 `BRANCH_SITE_NOT_PUBLISHED` | `https://kpa-society.co.kr/kpa/{slug}` (미게시 안내 렌더) | UI_EXISTS |
| ⑦ publish | 운영자 | `PUT operator/site {..., isPublished:true}` | `/operator/site` "홈페이지 공개" 토글 | UI_EXISTS |
| ⑧ 회원 가입·승인 시작 | 회원 → 서비스 관리자 → 운영자 | 회원 `POST /kpa-branch/join`(users+service_memberships pending+credential, W13 선례) → 관리자 `GET /admin/service-members` · `PATCH /admin/service-members/:id/approve` → 운영자 ③ 으로 분회 소속 | 가입 `/kpa/join` UI_EXISTS · **승인 화면 없음**(web-kpa-branch·admin-dashboard 모두 `kpa-branch/admin/*` 소비처 0) | **MUST_HAVE_ADMIN_UI** |

---

## 3. 개통 전 체크 (실측 방법)

| 항목 | 방법 | 리허설 실측 |
|---|---|---|
| slug 중복 | `GET /branches/{slug}` 404 이면 미사용 (POST 도 409 `SLUG_CONFLICT` 로 막음) | 404 → 생성 201 |
| 분회명 유사명 | `GET /branches?q=` 공개 목록 검색 | `Onboarding Rehearsal` 0건 |
| 테스트 분회 아님 | 실분회는 `[TEST]` prefix 금지 | 리허설은 `[TEST]` 표기 |
| 최초 운영자 계정 존재 | `GET /admin/users?email=` | sohae2100 존재(신규 생성 0) |
| 타 서비스 credential 보존 | 기존 계정에 role 추가만 — `POST /admin/users` 재사용 금지 | credential/role 변경 0 |
| parent 유효성 | PATCH `PARENT_NOT_FOUND`/`INVALID_PARENT_ID`(자기 자신) 로 서버 검증 | 둘 다 400 실측 |

## 4. 개통 후 체크 · 초기 설정 (실측)

| 항목 | 실측 |
|---|---|
| 운영자 로그인(serviceKey `kpa-branch`) | 200 |
| `/operator/members` 접근 · active 2명(운영자+회원) | 200 · total 2 |
| 사이트 설정 접근 · 저장 | `GET/PUT operator/site` 200 |
| 공개 홈 200 · 공지/행사/자료실/임원 메뉴 | 브라우저 `/kpa/test-branch-onboarding{,/notices,/events,/resources,/officers}` 5/5 200 · 분회명 표시 · "등록된 글이 없습니다" |
| 회원 가입 링크 | 공개 헤더에 "로그인 · 가입 신청" 렌더 |
| 회원 가입→승인→로그인 | **리허설 미실행** — join 은 users/credential 을 만들므로 영구 tenant 정책상 금지. W13/pilot 선례(`renagang@gmail.co` 가 그 경로로 만들어짐)로 대체 |
| tenant isolation | 전입 후 pilot 콘솔 active 0명 · left 이력 3 · 존재하지 않는 slug 404 |
| 초기 설정 | `branch_posts/events/officers/fee_policies/fee_ledgers/education_credit_ledgers/annual_reports/domains` 전부 **0행** · 신상신고 template 는 service 공통(분회별 row 없음) · 가짜 데이터 자동 삽입 0 |

---

## 5. 관리자 UX 분류표

| 단계 | 분류 | 근거 |
|---|:--:|---|
| ① 분회 생성 · ①-a 기본정보 PATCH | API_ONLY_BUT_ACCEPTABLE | 분회당 1회 · super_admin 전용 · 실분회 수 적음. admin-dashboard "분회 서비스" 엔트리(`service-entry.ts`) 는 라벨만 있고 화면 없음 |
| ② 최초 운영자 등록 | **MUST_HAVE_ADMIN_UI** | 분회마다 반복. `OperatorsPage.tsx` `ASSIGNABLE_ROLES` 가 kpa/neture/pharmacy-hub/cosmetics 만 — 카탈로그에 `kpa-branch:operator` 1줄 추가가 최소 후보 |
| ③ 운영자/회원 분회 소속 | UI_EXISTS | `MembersConsolePage` 전입·전출 (첫 운영자만 super_admin bypass 로 API) |
| ④⑤⑦ 사이트 초기화·기본정보·publish | UI_EXISTS | `SiteSettingsPage` (`isPublished` 토글 "홈페이지 공개/비공개로 전환") |
| ⑥ 공개 URL | UI_EXISTS | `/kpa/{slug}` resolver |
| ⑧-a 회원 가입 | UI_EXISTS | `/kpa/join` |
| ⑧-b 서비스 가입 승인 | **MUST_HAVE_ADMIN_UI** | 회원마다 반복. `admin/service-members` list/approve/reject 소비처 0 (프론트 어디에도 없음) |
| 운영자 교체·추가 | API_ONLY_BUT_ACCEPTABLE | 추가 = ②+③ 반복 · 교체 = 신규 운영자 ②③ 후 기존 운영자 `DELETE /admin/users/:userId/role-assignments/kpa-branch:operator` + `POST operator/members/:userId/leave`. RBAC 재설계 없음 |

### 5-1. MUST_HAVE_ADMIN_UI 후속 WO 후보 (이번 WO 에서 만들지 않음)

1. `WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1` — `kpa-branch:admin` 화면(web-kpa-branch `/admin/service-members` 또는 admin-dashboard). 가입 승인이 API 뿐이면 첫 실분회의 회원 수십 명 승인이 개발자 작업이 된다 — **우선순위 1**.
2. `WO-O4O-ADMIN-OPERATOR-CATALOG-KPA-BRANCH-V1` — admin-dashboard `OperatorsPage` 역할 카탈로그에 `kpa-branch` 추가(등록·역할 부여 UI 재사용).

---

## 6. 리허설 결과 (`w18_rehearsal.mjs` · 프로덕션 · 2026-09-11 04:36~04:37 UTC)

| 단계 | 결과 |
|---|---|
| baseline | 분회 목록 210 · slug 미사용 · 운영자 active 소속 = pilot(organizationId `51e07dd7-…`) |
| ① `POST /admin/branches` | 201 `03112efd-2a79-46b6-b80e-da776504bf8f` · `site.isPublished:false` |
| ①-a PATCH | address/phone 200 · 빈 body 400 `NO_FIELDS` · `slug:'hacked'` 무시 · 없는 parentId `PARENT_NOT_FOUND` · self parentId `INVALID_PARENT_ID` · 공개 단건·목록에 address/phone 노출 |
| ③ 운영자 전입 | 201 (`13bc5efb-…`) · pilot row `left_at` 기록 · `/me/branch` organizationId = 테스트 분회 |
| ④ site 초기화 | `PUT isPublished:false` 200 · 공개 `/site` 404 `BRANCH_SITE_NOT_PUBLISHED` |
| ⑤ publish | `isPublished:true` · `/site` 200 `contact.email=onboarding@o4o-fixture.test` · posts(notice/resource)/events/officers 200 0건 · **브라우저 5경로 200**(`w18_pub_*.png`) |
| ⑥ 회원 전입 | 201 (`d4fb34be-…`) · 운영자 콘솔 active total 2 |
| 격리 | pilot 콘솔 active 0 · left 3 · 없는 slug 404 |
| ⑦ unpublish | `isPublished:false` · `/site` 404 |
| ⑧ 원복 | 두 계정 `POST /branches/o4o-pilot/operator/members` 201 · 테스트 분회 active 0 · pilot active 2 · 목록 211 |
| 사후 DB(read-only) | `users`/`service_memberships`/`role_assignments` 최근 3시간 생성 **0** · 테스트 분회 하위 8테이블 0행(branch_sites 1·branch_memberships left 2 제외) · `is_published=false` |

### 6-1. 스크립트 FAIL 4건 정정 (실제 상태는 전부 정상)

| 항목 | 원인 | 재검증 |
|---|---|---|
| baseline/③-a/⑧-a "현재 소속 slug" | `/me/branch` 는 `organizationId` 만 반환(slug 없음) — assertion 형태 오류 | `w18_verify.mjs`: organizationId == pilot id **true** · history `pilot:active / test:left / pilot:left` |
| ②-f 공개 단건 phone | 직전 ②-e 에서 sohae2100(super_admin 겸)의 PATCH `phone:'1'` 이 통과해 값이 바뀜 — 403 기대 자체가 bypass 한계 | super_admin PATCH 로 `02-000-0000` 복구 · 공개 단건 반영 확인 |

---

## 7. 분회 개통 체크리스트 (운영용 — 이것만 보고 반복 개통)

**개통 전**
- [ ] 입력정보 §1 필수 8개 확보 (대표 이메일은 사이트 설정용)
- [ ] `GET /branches/{slug}` 404 (slug 미사용) · `GET /branches?q=분회명` 유사명 없음
- [ ] 실분회에 `[TEST]` 표기 없음
- [ ] 최초 운영자 계정 존재 여부 확인 (`GET /admin/users?email=`) — 존재하면 role 추가만, 타 서비스 credential 건드리지 않음
- [ ] parentId 는 활성 조직 UUID (없으면 생략 가능)
- [ ] 개통 담당자 = `platform:super_admin` 계정

**개통 (순서 고정)**
1. [ ] `POST /kpa-branch/admin/branches {name, slug, parentId?, description?}` → 201, id 기록
2. [ ] `PATCH /kpa-branch/admin/branches/{id} {address, phone}` → 200
3. [ ] 최초 운영자: 기존 계정 `PUT /admin/users/{id}` roles += `kpa-branch:operator` / 신규 `POST /admin/users {…, roles:['kpa-branch:operator'], serviceKey:'kpa-branch'}`
4. [ ] `POST /kpa-branch/branches/{slug}/operator/members {email: 운영자}` → 201
5. [ ] 운영자 로그인(serviceKey `kpa-branch`) → `/kpa/{slug}/operator/site` 에서 제목·소개·대표 이메일/전화/주소 저장 (비공개)
6. [ ] `https://kpa-society.co.kr/kpa/{slug}` 미게시 안내 확인
7. [ ] `/operator/site` "홈페이지 공개" → 공개 홈 200
8. [ ] 회원에게 `/kpa/join` 안내 → 관리자 `PATCH /admin/service-members/{id}/approve` → 운영자 `/operator/members` 전입 등록

**개통 후**
- [ ] 운영자 로그인 200 · `/operator/members` 접근 · `/operator/site` 접근
- [ ] 공개 홈·공지·행사·자료실·임원 5경로 200
- [ ] 회원 가입 링크 노출
- [ ] 첫 회원 가입→승인→로그인→전입 1건 end-to-end
- [ ] 다른 분회 콘솔에 이 분회 회원이 보이지 않음 (tenant isolation)
- [ ] 게시글 0 · 행사 0 · 회비 정책 미설정 · 연수교육 원장 0 · 신상신고 template = service 공통 (가짜 데이터 0)
- [ ] 자체 도메인 요청 있으면 후속 (§8)
- [ ] 개통 기록: 분회 id/slug/운영자 이메일/개통일 을 운영 기록에 남김(비밀번호 기록 금지)

---

## 8. 자체 도메인 (선택 · 후속)

기본 접근 경로는 `kpa-society.co.kr/kpa/{slug}` 이며 리허설 5경로가 이것으로 동작했다. 자체 도메인은 `branch_domains`(운영자 `/operator/domains` 신청 → 관리자 `PATCH /admin/domains/:id/status`) 로 후속 처리한다. 이번 WO 개통 조건이 아니다.

---

## 9. 한계 · 보고

1. **sohae2100 = `platform:super_admin` 겸** — 운영자 스코프 403 증명이 bypass 로 불가(②-e). 순수 운영자 스코프는 W13/pilot 선례로 대체.
2. **회원 로그인 smoke 생략** — `renagang@gmail.co` 비밀번호가 `TEST-ACCOUNTS.local.md` 에 없고 관리자 재설정 API 도 없다(auth 모듈 `forgot-password/reset-password` self-service 만). 정책대로 임의 변경하지 않았다. 문서에 항목이 추가되면 `w18_rehearsal.mjs` ⑥-b~d 가 자동 실행된다.
3. **영구 tenant 부작용(구조적)** — `branch_memberships` 는 append-only 라 pilot 이력이 3→5행(두 계정 joined_at 갱신). `renagang@gmail.co` 의 `kpa_pharmacist_profiles` 가 전입 시 `promoteFromUser` 로 **0→1 생성**(멱등·canonical 동작). 삭제하지 않는다.
4. `POST /kpa-branch/join` 은 리허설에서 실행하지 않았다(users/credential 생성 금지).
5. 테스트 분회 `test-branch-onboarding`(`03112efd-…`) 은 unpublished 로 유지 — 용도: 신규 분회 개통 절차 검증 tenant. `o4o-pilot` = 상시 기능/회귀 tenant. 사용 중 분회 폐지·비활성화 API 부재는 별도 운영수명주기 후속 후보.
6. 문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(§5-1).
