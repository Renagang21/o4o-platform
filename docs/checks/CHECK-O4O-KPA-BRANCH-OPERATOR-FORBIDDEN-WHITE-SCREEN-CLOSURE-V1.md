# CHECK — kpa-branch 운영자 권한 없음/해제 시 `/operator/*` white-screen 마감

- **WO**: `WO-O4O-KPA-BRANCH-OPERATOR-FORBIDDEN-WHITE-SCREEN-CLOSURE-V1`
- **일자**: 2026-09-11
- **판정**: **`OPERATOR_FORBIDDEN_WHITE_SCREEN_CLOSED`** — 5 상태 × 9 경로 × (deep-link + reload) = 90 케이스 전부 PASS, React #31 / uncaught 0 (§5)
- **선행**: [admin 운영자 카탈로그 kpa-branch:operator](CHECK-O4O-ADMIN-OPERATOR-CATALOG-KPA-BRANCH-V1.md) §9-1 에서 발견한 결함
- **commit**: `589c00769` (`services/web-kpa-branch/src/lib/errors.ts` 1파일) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 — 분회 웹 `https://kpa-society.co.kr/kpa/o4o-pilot` · 관리자 `https://admin.neture.co.kr` · API `https://api.neture.co.kr/api/v1` · DB `o4o_platform`(read-only)
- **CI**: Deploy Web Services `34571922220`(589c00769) success — `deploy-kpa-branch` success, 나머지 web skipped(detect-changes). 배포 번들에 새 안내 문자열 확인 후 smoke 수행

> 서버(`apps/api-server/**`, `packages/security-core/**`) 변경 0 · guard·403 semantics 변경 0 · 화면별 예외 처리 0.
> 수정은 kpa-branch 프론트 공통 error 정규화 함수 한 곳(`describeApiError`)이다.

---

## 1. 원인 확정

| 항목 | 실측 |
|---|---|
| 객체형 403 발신처 | `packages/security-core/src/service-scope-guard.ts` — 운영자 role 없음(해제 후·일반 회원) → `{ error: { code:'FORBIDDEN', message:'Required scope: kpa-branch:operator' } }`. `apps/api-server/src/common/middleware/global-error.middleware.ts` 도 같은 객체형 |
| 문자열형 403 발신처 | `apps/api-server/src/middleware/kpa-branch-scope.middleware.ts` `requireBranchScope` — role 은 있으나 분회 소속 없음 → `{ success:false, error:'해당 분회에 대한 권한이 없습니다.', code:'BRANCH_SCOPE_MISMATCH' }`. `membership-guard`(MEMBERSHIP_NOT_FOUND/NOT_ACTIVE)·401(AUTH_REQUIRED)도 문자열형 |
| 프론트 결함 | `services/web-kpa-branch/src/lib/errors.ts` `describeApiError` 가 `res.data.error` 를 `string` 으로 가정하고 `?? 기본문구` 로 반환 → 객체가 그대로 `setError(...)` → `<p>{error}</p>` 에서 React #31(Objects are not valid as a React child) → 루트 언마운트 = white-screen |
| 호출부 census | `describeApiError` 소비 14파일(`pages/operator/*` 9 + `annual-report/*` 4 + `BranchOfficersPage`) 전부 이 함수 단일 경유(`describe` alias 포함). 직접 `data.error` 를 렌더하는 곳은 `lib/api/join.ts`(이미 `typeof === 'string'` 가드), `pages/auth/ResetPasswordPage.tsx`(fetch, auth API 문자열형), `LoginPage`(authClient 결과 string) — 운영자 403 경로 아님 |
| 경로 guard | `App.tsx` 의 `/operator/*` 9 route 는 프론트 route guard 없이 서버 403 에 의존(기존 설계). 본 WO 는 그 설계를 유지하고 오류 표시만 고친다 |

## 2. 수정 (최소)

`services/web-kpa-branch/src/lib/errors.ts`

- `errorText(data)` 추가 — `error` 가 문자열 / `{code,message}` 객체 / 그 외 어느 shape 든 사용자 안내 문자열로 내림(없으면 null)
- `describeApiError` 반환은 항상 `string`
  - 401 → `로그인이 필요합니다.` (불변)
  - 403 **문자열형** → 서버 문구 그대로(`BRANCH_SCOPE_MISMATCH` 등 기존 계약 유지)
  - 403 **객체형** → `이 분회에 대한 권한이 없습니다.` (scope guard 내부 문구 "Required scope: …" 는 노출하지 않음)
  - 404 / 기타 → 정규화된 문구 또는 기존 기본 문구
- 호출부 14파일 무변경 · tsc 통과

## 3. 검증 절차 (영구 계정, fixture 신규 생성 0)

`renagang21@gmail.com`(kpa-branch 영구 회원) 에 admin UI 로 operator 재부여 → 상태별 브라우저 smoke → 제품 API 로 원복. 스크립트 `w20_e2e.mjs`(grant/join/revoke/leave 재사용) + `w21_smoke.mjs`(Playwright, 세션 scratchpad).

| 순서 | 조작 | 결과 |
|---|---|---|
| ① | admin `OperatorsPage` 기존 사용자 → `kpa-branch:operator` 부여 | 200 `KEEP_EXISTING_CREDENTIAL`, 기존 inactive row 재활성 |
| ② | smoke `op-nobranch`(role 있음·소속 없음 → 문자열형 403) | §5 |
| ③ | sohae2100 으로 o4o-pilot 전입 API(201) → smoke `active` | §5 |
| ④ | admin 화면에서 권한 해제(DELETE role-assignments 200) → smoke `revoked`(소속 있음·role 없음 → 객체형 403) | §5 |
| ⑤ | leave API(200) → smoke `member`(role 없음·소속 없음 → 객체형 403) | §5 |
| ⑥ | 비로그인 smoke `anon` | §5 |

## 4. 403 response shape 별 UI 결과 (WO 가 명시한 최종 확인)

| 서버 403 shape | 발생 상태 | API 실측(9경로 전부) | UI 결과 |
|---|---|---|---|
| `error:string` (`BRANCH_SCOPE_MISMATCH`) | operator role 있음 · 분회 소속 없음 | `403 error:string(BRANCH_SCOPE_MISMATCH)` | `해당 분회에 대한 권한이 없습니다.` 표시 · white-screen 0 · object render 0 |
| `error:{code,message}` (`FORBIDDEN`) | role 해제됨(소속 유지) / 일반 회원 | `403 error:{FORBIDDEN}` | `이 분회에 대한 권한이 없습니다.` 표시 · white-screen 0 · object render 0 · **React #31 0** |
| (참고) `error:string` (`AUTH_REQUIRED`) 401 | 비로그인 | `401 error:string(AUTH_REQUIRED)` | `로그인이 필요합니다.` 표시 (기존 계약 유지, 강제 리다이렉트 없음) |

## 5. 브라우저 smoke 결과 — 90/90 PASS

경로: `site · posts · domains · annual-reports · fees · education · members · events · officers` (WO 8경로 + domains). 각 경로 deep-link 진입 + 새로고침. 판정 = `#root` 비어있지 않음 ∧ `[object Object]` 없음 ∧ 상태별 기대 문구(`main` 텍스트) ∧ 콘솔 React #31·pageerror 없음.

| 상태 | 계정 | 18 케이스 | 콘솔 #31 / pageerror | API |
|---|---|---|---|---|
| `op-nobranch` | renagang21 (operator, 소속 없음) | PASS | 0 | 9경로 403 string |
| `active` | renagang21 (operator, o4o-pilot 소속) | PASS — 9경로 전부 200·폼/목록 렌더·안내 문구 없음 | 0 | 9경로 200 |
| `revoked` | renagang21 (해제 후, 소속 유지) | PASS | 0 | 9경로 403 object |
| `member` | renagang21 (해제·전출 후) | PASS | 0 | 9경로 403 object |
| `anon` | 비로그인 | PASS | 0 | 9경로 401 |

콘솔에 남는 것은 브라우저 네트워크 로그 `Failed to load resource: 403/401` 뿐(uncaught 아님). 스크린샷 `w21_{state}_site.png` 5장(세션 scratchpad).

`revoked` 상태의 `/operator/site` 는 선행 CHECK §9-1 에서 white-screen(React #31) 이었던 그 케이스이며, 본 배포 후 안내 문구로 정상 표시됨.

## 6. tenant boundary · 회귀

- 서버 guard 순서(`requireKpaBranchScope` → `requireBranchScope`)·403 코드·본문 모두 무변경 — API shape 실측이 선행 CHECK 와 동일
- `active` 상태 9경로 200 = 정상 운영자 회귀 PASS · `op-nobranch` 문자열형 문구 = 기존 BRANCH_SCOPE_MISMATCH 노출 계약 유지
- 타 tenant 접근은 본 WO 범위 밖(선행 W20 §6 항목 6 에서 확인된 `requireBranchScope` 계약 그대로)

## 7. 원복 · DB 최종 상태 (read-only 확인, 직접 변경 0)

| 대상 | 상태 |
|---|---|
| `role_assignments` renagang21 `kpa-branch:operator` | **같은 row** 재활성 → 해제 → `is_active=false` (신규 row 0) |
| `role_assignments` `kpa-branch:member` | active 불변 |
| `branch_memberships` o4o-pilot | `left` 이력 2건(선행 WO 1 + 본 WO 1, append-only) — 현재 소속 없음 |
| `service_credentials` (kpa-branch·kpa-society·neture·k-cosmetics·pharmacy-hub) | `updated_at` 전부 본 WO 이전 — 생성/변경 0 |

## 8. 범위 밖 / 한계

1. `/operator/*` 프론트 route guard 부재(비운영자도 페이지 골격은 렌더되고 데이터 호출만 403) — 기존 설계. 보안은 서버 guard 가 담당하므로 결함 아님, 필요 시 UX WO
2. 비로그인 `/operator/*` 는 `로그인이 필요합니다.` 안내만 하고 로그인 페이지로 보내지 않음 — 기존 계약, 본 WO 무변경
3. `ResetPasswordPage` 의 `body?.error ?? …` 는 auth API 문자열형이라 현재 문제 없음. 같은 정규화가 필요해지면 `errorText` 재사용 가능(범위 밖, 미수정)

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
