# CHECK — admin 운영자 역할 카탈로그에 kpa-branch:operator 추가

- **WO**: `WO-O4O-ADMIN-OPERATOR-CATALOG-KPA-BRANCH-V1`
- **일자**: 2026-09-11
- **판정**: **`OPERATOR_CATALOG_KPA_BRANCH_READY`** — 필수 11항목 전부 실측 PASS(§6). 한계 3건(§9)은 READY 를 막지 않는다
- **선행**: [분회 서비스 가입 승인 UI](CHECK-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1.md) · [WO④ 신규 분회 개통 운영 절차](CHECK-O4O-KPA-BRANCH-NEW-TENANT-ONBOARDING-OPERATIONS-V1.md)
- **commit**: `557154809` (카탈로그 3파일) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — 관리자 `https://admin.neture.co.kr` · 분회 웹 `https://kpa-society.co.kr/kpa/o4o-pilot` · API `https://api.neture.co.kr/api/v1` · DB `o4o_platform`(read-only 스냅샷)
- **CI**: Deploy Admin Dashboard `34568009144`(557154809) success · 번들 `assets/index-CF-ZN1b1.js` 에 `kpa-branch:operator` / `약사회 분회` / `분회 운영자` 확인 · **CI Pipeline failure = 선행 커밋부터 동일한 api-server Jest 3건**(본 WO 무관, 범위 밖)

> 이 WO 는 RBAC·Identity·분회 소속 모델을 바꾸지 않는다. 이미 존재하던 `kpa-branch:operator` role(시드 `is_assignable=true`)을
> admin `OperatorsPage` 의 **assignable 카탈로그에 등재**해 개발자 API 호출 없이 부여·해제할 수 있게 한 것뿐이다.
> 서버(`apps/api-server/**`) 변경 0 · guard 변경 0 · credential 생성/변경 0 · branch_membership 자동 생성 0.

---

## 1. 조사 결과

| 항목 | 결과 |
|---|---|
| assignable role SSOT | `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` 로컬 `ASSIGNABLE_ROLES`(서비스별 admin/operator) — 다른 곳에 SSOT 없음. `REGISTRABLE_SERVICE_KEYS`·`CATALOG_ROLE_VALUES` 가 여기서 파생 |
| 서비스 표시명/그룹 SSOT | `src/lib/rbac-catalog.ts` `SERVICE_KEYS` / `SERVICES`(label·badge) · `ROLES`(suffix 라벨 — operator = 'Operator') · `parseRole`(모르는 prefix → `getServiceMeta` 가 대문자 key 'KPA-BRANCH' 로 fallback) |
| 부여 API | `POST /admin/users { email, roles:[role], role: suffix, serviceKey: canonical, isEmailVerified, isActive, password? }` — `resolveOperatorTargetServiceKey` 가 role prefix 에서 canonical key 파생(`MULTI_SERVICE_NOT_ALLOWED` / `SERVICE_KEY_MISMATCH`). 기존 사용자 경로 = `roleAssignmentService.assignRole` + `ensureServiceMemberships`(기존 membership status·role 불변) + credential 있으면 `KEEP_EXISTING_CREDENTIAL` / 없으면 password 필수(`SERVICE_PASSWORD_REQUIRED`) |
| 해제 API | `DELETE /admin/users/:userId/role-assignments/:role` — role_assignments `is_active=false`(soft) |
| security-core `resolveCanonicalServiceKey` | `ServiceKey` union 에 `'kpa-branch'` 이미 포함, self-map → 매핑 항목 추가 불필요 |
| DB `roles` 테이블 | `kpa-branch:admin` / `operator` / `member` 3건 시드(`20270305000000-SeedKpaBranchServiceAndRoles`) · 전부 `is_assignable=true, is_active=true` |
| DB `role_assignments`(kpa-branch, 작업 전) | member 2 · operator 1(`sohae2100`) · **admin 0** |
| `kpa-branch:admin` 사용처(서버 5곳) | `isBranchServiceAdmin`(분회 경계 bypass) · 도메인 승인 `/admin/domains` · 신상신고 양식 `/admin/annual-report-templates` · 서비스 가입 승인 `/admin/service-members` · adminGuards — **전부 `platformBypass:true` 로 platform:super_admin 통과**. 분회 생성(`BranchAdminController`)은 `requireRole('platform:super_admin')` 만 |
| 최초 운영자 onboarding 경로(작업 전) | 분회 생성 API → 운영자 부여는 **admin UI 에 없음**(API 직접 호출 또는 이전 WO 의 수동 경로) → 분회 운영자 화면 전입 |
| 분회 소속 축 | `requireBranchScope`: `kpa-branch:admin`/`platform:super_admin` 통과, 그 외 active `branch_memberships.organization_id === req.branch.id` 아니면 403 `BRANCH_SCOPE_MISMATCH`. **운영자 role 만으로는 어느 분회에도 접근 불가** |
| 카탈로그를 단언하는 spec | `operators-service-password.test.ts`(keys 존재 검사 — 추가 시 안 깨짐) · `admin-authorization-registry-...`(floor 테스트용 고정 목록 — 무관) · raw-source 소비처 `check-literal-consumers` 결과 살아있는 소비처 0 |

## 2. 추가한 role

| 서비스 그룹 | 역할 | 값 | 설명(모달) |
|---|---|---|---|
| **약사회 분회** (`kpa-branch`) | **분회 운영자** | `kpa-branch:operator` | 약사회 분회 운영자 (대상 분회 소속은 분회 운영자 화면에서 별도 지정) |

role key 변경 없음. 목록 행의 역할 라벨은 공통 `ROLES.operator` = 'Operator' (다른 서비스와 동일 — 행 액션 "권한 해제 (Operator)").

## 3. `kpa-branch:admin` 판정 — **assignable 목록에 추가하지 않음**

근거: (a) 프로덕션 부여 0건 (b) admin 축 API 5곳 전부 platform:super_admin 이 통과 (c) 분회 생성은 super_admin 전용이라 admin 이 있어도 못 함 (d) 유일한 고유 효과 = 모든 분회 경계 bypass — 현재 운영 정책에 그런 "전 분회 운영자" 역할 요구 없음. 향후 필요가 확정되면 카탈로그 1줄 추가로 충분하며, 이미 가진 계정이 있으면 편집 화면의 "이 화면에서 변경하지 않는 권한 (유지됨)" 읽기 전용 보존으로 유지된다. `kpa-branch:member` 는 가입 승인 축의 결과이지 운영자 등록 대상이 아니므로 역시 제외. spec 으로 고정(`kpa-branch 는 operator 한 역할만 제공한다`).

## 4. UI 변경 (admin-dashboard 3파일, +33줄)

| 파일 | 변경 |
|---|---|
| `src/lib/rbac-catalog.ts` | `SERVICE_KEYS` 에 `'kpa-branch'` · `SERVICES['kpa-branch'] = { label:'약사회 분회', badgeClass: sky }` — 목록 서비스 배지·facet 필터·모달 그룹 제목이 'KPA-BRANCH' fallback 대신 '약사회 분회' 로 표시 |
| `src/pages/operators/OperatorsPage.tsx` | `ASSIGNABLE_ROLES['kpa-branch'] = [operator]` + admin 제외 사유 주석. handleSubmit/handleRevokeRole/모달 구조 **무변경** |
| `src/tests/operators-service-password.test.ts` | spec 1건 추가(operator 만 · admin/member 없음 · 분회 API `/kpa-branch/branches/` 미호출) |

새 전용 페이지 0 · route/menu/permissions 변경 0 · `packages/**` 변경 0. tsc 0 / eslint 0 / vitest 313/313.

## 5. 부여/해제 계약 (실측)

| 단계 | 요청 | 결과 |
|---|---|---|
| 부여(기존 사용자) | `POST /admin/users {"email":"renagang21@…","roles":["kpa-branch:operator"],"role":"operator","serviceKey":"kpa-branch","isEmailVerified":true,"isActive":true}` — **password 필드 없음** | 200 `credentialPolicy=KEEP_EXISTING_CREDENTIAL` |
| DB 후 | `role_assignments` `kpa-branch:operator` active 신규(06:06:06) · `service_memberships(kpa-branch)` **불변**(active · role member · updated 05:33:10 그대로) · `service_credentials(kpa-branch)` **불변**(05:22:16) · `branch_memberships` **0건** | credential 생성/변경 0 · 소속 자동 생성 0 |
| 해제 | `DELETE /admin/users/:userId/role-assignments/kpa-branch:operator` (행 kebab → "권한 해제 (Operator)" → confirm) | 200 · `is_active=false` · 목록에서 행 제거 |

## 6. Production E2E — 필수 11항목

fixture = 영구 계정 `renagang21@gmail.com`(kpa-branch active member + credential 보유, branch_membership 없음, platform 권한 없음). 새 계정/credential 생성 0. 스크립트 `scratchpad/w20_e2e.mjs`(grant/access1/branchweb/join/revoke/leave/regress).

| # | 항목 | 방법 | 결과 |
|---|---|---|---|
| 1 | OperatorsPage 에 kpa-branch 서비스/역할 표시 | 브라우저(super_admin) 등록 모달 | **PASS** — 대상 서비스 5번째 "약사회 분회 / kpa-branch", 역할 = "분회 운영자 / kpa-branch:operator" 1개 |
| 2 | 기존 사용자 검색 | 모달 "기존 사용자에게 권한 추가" + 이메일 입력 → 부여 후 목록 검색창 | **PASS** — 부여 후 목록에 `renagang21 · 약사회 분회 · Operator` 행 |
| 3 | operator 부여 | 브라우저 submit "권한 추가" | **PASS** — §5 |
| 4 | DB role_assignment 확인 | read-only SELECT | **PASS** — §5 |
| 5 | 해당 계정 kpa-branch operator 화면 접근 | API 로그인(serviceKey kpa-branch) roles + 분회 웹 로그인 | **PASS** — roles 에 `kpa-branch:operator`; 분회 홈에 운영자 메뉴 3그룹(운영·회원/콘텐츠/분회 설정) 노출 |
| 6 | branch_membership 없을 때 tenant 접근 자동 허용 안 됨 | `GET /branches/o4o-pilot/operator/site` + 브라우저 `/operator/site` | **PASS** — 403 `BRANCH_SCOPE_MISMATCH` · 화면 "해당 분회에 대한 권한이 없습니다." 입력 폼 0 · `/me/branch` = null |
| 7 | 분회 소속 후 정상 접근 | `sohae2100` 으로 `POST /branches/o4o-pilot/operator/members {email}` 201 → 재조회 | **PASS** — operator/site 200 · 브라우저 사이트 정보 화면 입력 8개 렌더 |
| 8 | 역할 해제 시 operator 접근 차단 | 브라우저 해제 → API/브라우저 | **PASS** — roles 에서 제거 · operator/site 403(scope guard) · 분회 홈 운영자 메뉴 0 |
| 9 | 타 서비스 role/credential 불변 | before/after 스냅샷 diff(sm·cred·role·bm·profile) | **PASS** — diff = `bm … left`(§7 원복 이력) + `role kpa-branch:operator false` 2줄뿐. k-cosmetics/kpa-society/neture/pharmacy-hub/platform 의 membership·credential·role 전부 동일 |
| 10 | 기존 OperatorsPage 다른 서비스 역할 회귀 | 브라우저 목록·편집 모달 | **PASS** — 15행(KPA 3 / Neture 5 / K-Cosmetics 2 / Pharmacy-Hub 4 / 약사회 분회 1 = sohae2100 기존 행) · 편집 모달 그룹 5개(KPA·NETURE·PHARMACY-HUB·K-COSMETICS·약사회 분회) |
| 11 | desktop/mobile smoke | 1400×900 · 390×844 | **PASS** — 모바일 목록 로드 · 등록 모달에 kpa-branch 표시 |

## 7. 상태 원복

- 역할: 화면 해제로 `kpa-branch:operator` inactive (E2E 항목 8 자체가 원복)
- 소속: `POST /branches/o4o-pilot/operator/members/:userId/leave`(sohae2100) 200 → `branch_memberships` status `left`(append-only 이력 1건 증가, 영구 tenant 정책 허용 범위)
- renagang21 최종 = 작업 전과 동일한 접근 상태(kpa-branch member · credential · 타 서비스 불변). DB 직접 변경 0.

## 8. onboarding 7단계 연결 (admin UI + branch UI 만)

| # | 단계 | 화면 | 상태 |
|---|---|---|---|
| ① | 분회 생성 | admin — `POST /kpa-branch/admin/branches`(WO③ CHECK) | 기존 |
| ② | 기본 정보 | admin — PATCH(WO③) | 기존 |
| ③ | 기존 사용자 검색 | admin `OperatorsPage` → Add Operator → 기존 사용자에게 권한 추가 → 이메일 | **본 WO** |
| ④ | operator 부여 | 같은 모달 → 약사회 분회 → 분회 운영자 → 권한 추가 | **본 WO** |
| ⑤ | 분회 소속 지정 | 분회 웹 운영자 콘솔 회원관리(전입) — 또는 super_admin 이 API | 기존(WO④) |
| ⑥ | 사이트 설정 | 분회 웹 `/operator/site` | 기존 |
| ⑦ | publish | 같은 화면 `isPublished` | 기존 |

⑤ 의 주의: 신규 분회의 **첫 운영자**는 자기 분회에 아직 소속이 없어 자기 콘솔에 못 들어간다(항목 6 이 바로 그 상태). 첫 전입은 platform:super_admin(분회 경계 bypass)이 해당 분회 운영자 콘솔 또는 API 로 수행한다 — WO④ 리허설과 동일.

## 9. 한계 · 범위 밖 발견

1. **분회 웹 white-screen(범위 밖, 별도 WO 후보)**: 운영자 role 이 없는 kpa-branch 회원이 `/{slug}/operator/site` 를 직접 열면 `requireKpaBranchScope` 403 본문이 `{"error":{"code":"FORBIDDEN","message":…}}`(객체) 인데 `services/web-kpa-branch/src/lib/errors.ts describeApiError` 가 `res.data.error` 를 문자열로 가정해 React #31 로 빈 화면이 된다. 분회 경계 403(`{error:string, code}`)은 정상 표시. **보안 영향 없음**(서버 403). 항목 8 의 브라우저 보조 확인은 이 때문에 "메뉴 숨김 + API 403" 로 판정.
2. "기존 사용자 검색"은 모달에서 이메일 직접 입력(기존 계약) — 이름 검색/자동완성은 없다. WO 는 최소 수정을 요구하므로 추가하지 않았다.
3. 목록 행 역할 라벨은 공통 suffix 라벨('Operator')이라 "분회 운영자" 표기는 등록 모달에만 있다. rbac-catalog `ROLES` 는 서비스별 라벨을 갖지 않는 구조(변경 시 전 서비스 영향) — 손대지 않음.
4. RowActionMenu 드롭다운 stacking · api-server Jest 3건 — WO 명시 범위 밖, 미접촉.

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§9-1).
