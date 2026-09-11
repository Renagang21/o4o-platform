# CHECK — 분회 생성 canonical admin API · `POST/DELETE /kpa-branch/admin/branches`

- **WO**: `WO-O4O-KPA-BRANCH-CANONICAL-BRANCH-CREATION-API-V1`
- **일자**: 2026-09-11
- **판정**: **`BRANCH_CREATION_API_CLOSED`**
- **선행**: [IR 약사 프로필 정본·신고연도 의미](../ir/IR-O4O-KPA-BRANCH-PHARMACIST-MASTER-AND-REPORT-YEAR-SEMANTICS-V1.md) · [WO① profile 정본화 CHECK](CHECK-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1.md) · [WO② reference_years CHECK](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-REFERENCE-YEARS-V1.md)
- **commit**: `e21046870` (구현 2 files — `BranchAdminController.ts` 신규 · `kpa-branch.routes.ts` 라우트 2개) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — API `https://api.neture.co.kr/api/v1` · DB `o4o_platform` · 웹 `https://kpa-society.co.kr/kpa`
- **CI**: Deploy API Server `34555610144` success (sha `e21046870`) · 배포 리비전 `o4o-core-api-03611-45s`

> 모든 수치는 2026-09-11 프로덕션 실측값이다. **이번 WO 부터 영구 검증 tenant 정책**을 적용했다 —
> 사용자·membership·credential·role 은 하나도 만들지 않았고(기존 계정 3개만 로그인), 업무 데이터는
> `[TEST] O4O Branch API Pilot`(slug `test-branch-api-pilot`) 분회 row 하나뿐이며 **생성·삭제 모두 이번 WO 의 API 로만** 했다.
> raw SQL 은 read-only 검증에만 썼고 DB 직접 DELETE 는 0건이다.

---

## 0. 결과 요약

| # | WO 범위 | 결과 |
|:--:|---|:---:|
| 1 | 신규 분회 생성 canonical API (raw SQL 없이) | ✅ `POST /api/v1/kpa-branch/admin/branches` 201 · DB row `type=group · is_active · storefront_config {}` |
| 2 | `type='group'` 서버 고정 · body 의 `id/type/organizationId/isActive` 무시 | ✅ body `type:'branch', isActive:false, id:1111…, organizationId:pilot` → 응답 `group/true/새 uuid/parent null` |
| 3 | `platform:super_admin` 만 허용 | ✅ anonymous 401 `AUTH_REQUIRED` · 비-super_admin 로그인 403 `ROLE_REQUIRED` (POST·DELETE 모두) · 차단 후 row 0 |
| 4 | slug unique 충돌 409 | ✅ 기존 `o4o-pilot` 409 `SLUG_CONFLICT(details.id=pilot)` · 동일 slug 재POST 409 · row 1건 유지 |
| 5 | 입력 검증 | ✅ 잘못된 slug 400 `INVALID_SLUG` · name 누락 400 `INVALID_NAME` · 없는 parentId 400 `PARENT_NOT_FOUND` |
| 6 | 생성만으로 site 미게시 · 운영자/회원 자동 생성 없음 | ✅ 하위 10 테이블 0행 · `/site` 404 `BRANCH_SITE_NOT_PUBLISHED` · service_memberships 증가 0 · organizations 미러 0 |
| 7 | `/kpa/{slug}` resolver 정상 | ✅ `GET /branches/test-branch-api-pilot` 200 `resolvedBy:slug` · 공개 목록 `[TEST]` 노출 · 브라우저 `/kpa/test-branch-api-pilot` 렌더(미게시 안내) |
| 8 | 삭제 canonical API 판정·구현 | ✅ 필요 판정(§5) → `DELETE /admin/branches/:id` · 하위 0행일 때만 200 · 하위 있으면 409 `BRANCH_IN_USE` · type≠group 404 |
| 9 | 기존 209 canonical 분회 identity 불변 | ✅ 229행 hash `1eed9f05…` 검증 전·중(테스트 row 제외)·후 동일 · group 210(209+pilot) |
| 10 | `o4o-pilot` 불변 | ✅ row·하위 10 테이블 카운트 동일 · pilot DELETE 시도 409 (비파괴 증명) |
| 11 | 테스트 분회 정리 | ✅ API DELETE 200 → resolver 404 · 잔여 0 · 전체 229 hash 복귀 |

---

## 1. 조사 결과 (read-only)

| 순서 | 항목 | 실측 |
|:--:|---|---|
| 1 | 분회 생성 경로 census | 런타임 `kpa_organizations` INSERT 경로 **0건** (kpa-society `createKpaRecords` 는 kpa_members/profile 축). 파일럿 `o4o-pilot` 은 2026-09-10 raw SQL 로 생성 — 구조 부채 |
| 2 | 컬럼/제약 | PK · `slug` 부분 UNIQUE(`WHERE slug IS NOT NULL`) · `is_active default true` · `storefront_config jsonb NOT NULL default '{}'`(entity 미정의, default 로 채워짐). FK(ON DELETE RESTRICT) 5개: branch_memberships/branch_sites/branch_domains/branch_posts/annual_reports · FK 없이 organization_id 만: branch_officers/branch_events/branch_fee_policies/branch_fee_ledgers/branch_education_credit_ledgers |
| 3 | 기존 admin 분회 라우트 | 없음 — admin 절은 annual-report-templates · domains · service-members 뿐 |
| 4 | 삭제 canonical API | 없음 |
| 5 | o4o-pilot 현황 | `51e07dd7-…` group · parent null · active · site 1(published) · bm 3 · posts 3 · reports 1 · officers 2 · events 1 · fee_policies 1 · fee_ledgers 1 · edu 2. 전체 229 = association 1 + branch 18 + group 210 |

## 2. 설계 (구현 = `apps/api-server/src/controllers/kpa-branch/BranchAdminController.ts`)

| 항목 | 결정 | 이유 |
|---|---|---|
| 경로 | `POST /api/v1/kpa-branch/admin/branches` · `DELETE /api/v1/kpa-branch/admin/branches/:id` | WO 초안은 `POST /api/v1/admin/kpa-branches` 였으나 CLAUDE.md §11 Route 표준(`/api/v1/{service}/admin/*`)과 형제 admin 라우트(`/kpa-branch/admin/domains` 등)에 정합시켰다 |
| 가드 | `requireAuth` + `requireRole('platform:super_admin')` (`common/middleware/auth/authorization.middleware.ts`, role_assignments SSOT) | 기존 `adminGuards`(`requireKpaBranchScope('kpa-branch:admin')`, platformBypass) 는 `kpa-branch:admin` 도 통과시켜 "super_admin 만" 을 만족하지 못한다 |
| 입력 | `name` 1~200 trim 필수 · `slug` `^[a-z0-9]+(-[a-z0-9]+)*$` 2~80 · `parentId` optional UUID(활성 kpa_organizations 존재 확인, 표시용) · `description` ≤500 optional | 컬럼 길이 그대로. parent 는 권한 계산에 쓰지 않는다(entity 주석 원칙 유지) |
| 서버 고정 | `type='group'` · `is_active=true` · id 서버 생성 | body 의 `id/type/organizationId/isActive` 무시 |
| 충돌 | 사전 조회 + INSERT `23505` catch → 409 `SLUG_CONFLICT` `details:{id,name,type,isActive}` | 경합 시에도 500 으로 새지 않게 |
| 부수효과 없음 | branch_sites · branch_memberships · service_memberships · credential · role · organizations 미러 생성 없음 | 온보딩은 기존 canonical 경로(§6) |
| 응답 | 201 `{id,slug,name,type,parentId,description,isActive,createdAt,site:{isPublished:false}}` | 미게시임을 명시 |
| 삭제 | type='group' 만 · 하위 10 테이블 전부 0행일 때만 `DELETE` · 아니면 409 `BRANCH_IN_USE` `details.inUse{table:n}` · cascade 없음 · UUID 형식 검사 | Boundary Guard(UUID 단독 조회 금지 → `id AND type` 복합) |

`organizations`(플랫폼 조직) 미러는 만들지 않는다 — `20260411100000-BackfillKpaOrgsToOrganizations` 이후에도 organizations 는 26행뿐이고 기존 209 분회·pilot 전부 미러 없이 동작한다. 신규 API 가 미러를 만들면 오히려 기존 분회와 비대칭이 된다(범위 밖 §8).

## 3. 계정 (신규 생성 0)

| 역할 | 계정 | 용도 |
|---|---|---|
| `platform:super_admin` | `renariver21@gmail.com` (kpa-branch 소속·credential 없음) | 생성·삭제 호출 |
| 비-super_admin (로그인 가능) | `renagang21@gmail.com` (`kpa-society` credential · `kpa:store_owner` 등, platform 역할 없음) | 403 음성 테스트 |
| anonymous | — | 401 |

`sohae2100@gmail.com` 은 `platform:super_admin` 을 겸해 음성 테스트에 부적합. `kpa-branch:admin` 단독 계정은 없어 정책상 만들지 않았다 — `kpa-branch:admin` 차단은 가드가 `requireKpaBranchScope` 가 아니라 `requireRole('platform:super_admin')` 이라는 정적 근거로 대체한다.

## 4. E2E 실측 (`w17_e2e.mjs` 34/34 PASS · 프로덕션)

| # | 항목 | 요청 | 결과 |
|:--:|---|---|---|
| 0 | baseline | org hash · test slug | 229 `1eed9f05a93cdb64df54da31c176f89f` · slug 미사용 |
| ⑤ | 권한 차단 | anonymous POST / 비-super_admin POST | 401 `AUTH_REQUIRED` / 403 `ROLE_REQUIRED` · row 0 |
| ④ | 입력 검증 | `slug:'Bad_Slug!'` / name 누락 / parentId `0000…` / slug `o4o-pilot` | 400 `INVALID_SLUG` / 400 `INVALID_NAME` / 400 `PARENT_NOT_FOUND` / 409 `SLUG_CONFLICT`(details.id = pilot) |
| ① | 생성 | body 에 `type:'branch', isActive:false, id, organizationId` 포함 | 201 `22b91472-…` · `group/true/parent null` · site.isPublished=false · DB row storefront_config `{}` · 하위 10 테이블 0 · organizations 0 · service_memberships 증가 0 |
| ② | resolver | `GET /branches/test-branch-api-pilot` · `GET /branches?q=` · `https://kpa-society.co.kr/kpa/test-branch-api-pilot` | 200 `resolvedBy:slug` · 목록 `[TEST] …` 노출 · HTTP 200 |
| ③ | 미게시 | `GET /branches/test-branch-api-pilot/site` | 404 `BRANCH_SITE_NOT_PUBLISHED` |
| ④ | 중복 | 동일 slug 재POST | 409 `SLUG_CONFLICT`(details.id = 생성 id) · row 1 |
| ⑥ | identity | 229행 hash(테스트 row 제외) · group 수 | `1eed9f05…` 동일 · 210 |
| ⑦ | 삭제 경로 | pilot DELETE / 비-super_admin DELETE / association DELETE / 테스트 분회 DELETE / 재DELETE | 409 `BRANCH_IN_USE`(bm 3 · sites 1 · posts 3 · reports 1 · officers 2 · events 1 · policies 1 · ledgers 1 · edu 2) / 403 / 404 `BRANCH_NOT_FOUND` / 200 `deleted:true` → resolver 404 · DB 0 / 404 |
| ⑧ | 불변 | pilot snapshot · 최종 hash | row·하위 카운트 동일 · 229 `1eed9f05…` 복귀 |

### 4-1. 브라우저 smoke (`w17_browser.mjs`, Playwright · 2회차 생성 `0de86223-…` → 즉시 API 삭제)

| 경로 | 결과 |
|---|---|
| `/kpa/test-branch-api-pilot` | 분회 레이아웃(홈/공지/행사/자료실/임원소개 · 로그인/가입 신청) 렌더 · "아직 공개되지 않은 분회 홈페이지입니다" 안내 — 404 분회 아님 |
| `/kpa/test-branch-api-pilot/notices` | 동일 안내 + "등록된 글이 없습니다" |
| 삭제 후 | `GET /branches/test-branch-api-pilot` 404 |

## 5. 삭제 canonical API 판정

- **필요**: 생성 API 가 생기면 오타 slug·잘못된 parent 로 만든 분회를 되돌릴 canonical 경로가 없으면 다시 raw SQL 로 돌아간다. 분회 하나가 209개와 같은 registry 행이므로 "만들었지만 아직 아무것도 연결되지 않은 행" 의 정리는 운영 계약이다.
- **최소 계약**: hard delete 이지만 **하위 데이터가 전부 0행일 때만**. 회원·게시물·신고서·원장 등이 하나라도 있으면 409 로 막고 cascade 하지 않는다(FK RESTRICT 5개 + FK 없는 5개를 코드에서 동일 취급). 사용 중인 분회의 폐지(is_active=false 등)는 이 WO 범위가 아니다.
- **테스트 편의용 임의 삭제가 아님**: pilot DELETE 가 409 로 막히는 것을 실측했다(§4 ⑦).

## 6. 정정 온보딩 레시피 (IR §262 요청)

`CHECK-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1` 이 적은 `POST /kpa-branch/admin/branches/{slug}/members` 는 존재하지 않는다. 현행 canonical 순서:

```text
1. POST /api/v1/kpa-branch/admin/branches                         (platform:super_admin)  분회 row 생성  ← 이번 WO
2. POST /api/v1/admin/users  roles:['kpa-branch:operator']         (platform:super_admin)  운영자 계정 (기존 canonical)
3. POST /api/v1/kpa-branch/branches/{slug}/operator/members        (super_admin bypass 또는 운영자)  분회 소속 등록
4. POST /api/v1/kpa-branch/join → PATCH /admin/service-members/:id/approve   회원 가입·승인
5. PUT  /api/v1/kpa-branch/branches/{slug}/operator/site           홈페이지 편집 → 게시
```

## 7. 정리 · 잔여

| 대상 | 방법 | 결과 |
|---|---|---|
| `[TEST] O4O Branch API Pilot` 1회차 `22b91472-…` | `DELETE /admin/branches/:id` | 200 · 잔여 0 |
| 2회차 `0de86223-…` (브라우저 smoke) | 동일 API | 200 · resolver 404 |
| DB 직접 DELETE | — | **0건** |
| 신규 users/service_memberships/credential/role | — | **0건** (30분 내 kpa-branch service_memberships 증가 0) |
| 최종 | `kpa_organizations` 229 · hash `1eed9f05…` · test rows 0 · pilot `o4o-pilot` active · updated_at 불변 | ✅ |

## 8. 범위 밖 · 보고

1. `organizations` 미러 부재 — kpa_organizations 229 vs organizations 26. 기존 분회 전부 미러 없이 동작하므로 이번 API 도 만들지 않았다. 미러가 필요해지면 별도 WO.
2. `kpa_organizations.storefront_config` 컬럼이 entity 에 없다(DB default 로만 채워짐). 동작에는 영향 없음.
3. 공개 분회 목록(`GET /branches`) 은 `[TEST]` prefix 분회도 노출한다 — 정책상 테스트 분회는 검증 직후 삭제하므로 필터를 추가하지 않았다.
4. 사용 중인 분회의 폐지/비활성 전환 API 는 없다(이번 삭제 계약은 빈 분회 정리 전용).
5. `docs/checks/CHECK-…-TENANT-ONBOARDING-…` 의 잘못된 온보딩 경로는 기록물이라 수정하지 않고 §6 에 정정본을 둔다.

파일럿에서 확인된 구조 부채 3건(① 약사 프로필 정본 ② 참조연도 ③ 분회 생성 raw SQL) 은 이 WO 로 모두 해소됐다.

문서 정합: 발견 1건(범위 밖 5 · 기록물) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
