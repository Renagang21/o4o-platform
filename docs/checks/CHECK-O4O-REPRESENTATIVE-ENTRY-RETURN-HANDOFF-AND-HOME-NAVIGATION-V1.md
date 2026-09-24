# CHECK-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1

> **WO**: WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1
> **선행**: IR-O4O-SERVICE-ENTRY-DOMAIN-AND-HOME-PLACEMENT-AUDIT-V1 (세션 보고 · `CROSS_ORIGIN_RETURN_TO_NETURE_SESSION = STRUCTURAL_BLOCKER`)
> **실행일**: 2026-09-24 · **기준 `origin/main`**: `73d9d2089` (clean) → 구현 `83bfc058d`
> **보안 원칙**: 토큰 원문 · 계정값 · 개인정보 미기록

---

## 0. 한 줄 판정

```text
REPRESENTATIVE_ENTRY_RETURN_NAVIGATION = READY_FOR_CONTROLLED_DEPLOY
```

코드·자동 테스트는 완료했다. 배포 게이트(`DEPLOY_ENABLED=false`, Lecture 사고 대응)가 닫혀 있어 프로덕션 배포와 실브라우저 왕복 smoke 는 수행하지 않았다(§9). 이 판정은 production PASS 가 아니다.

## 1. 시작 상태

| 항목 | 값 |
|---|---|
| branch | `main` |
| `git status --short` | clean |
| HEAD / origin/main | `73d9d2089` / `73d9d2089` |
| 동일 WO 선행 구현 | 없음 (`handoff.controller.ts` 에 대표 진입 분기 0 · CHECK 0) |
| 배포 게이트 | `DEPLOY_ENABLED=false` (2026-09-24T08:06:34Z 갱신 — Password B-1 배포 창 종료 후) |

## 2. 최신 코드 재확인 (§4)

| 항목 | 확인 결과 |
|---|---|
| 발급 `POST /auth/handoff` | `requireAuth`(DB `users.status` 판정 · restricted 는 allowlist 밖이라 403) → target 검증 → **target `service_memberships.status='active'` 필수** → 1회용 토큰 INSERT |
| 교환 `POST /auth/handoff/exchange` | 조건부 `UPDATE … consumed_at IS NULL AND expires_at > now() RETURNING` (60s · 단일 사용) → user `isActive` → roles/memberships 최신 조회 → **target active 재검증** → `generateTokens(…, user.refreshTokenFamily)` 로 family 승계 |
| source 판정 | Origin hostname 정확 일치 (study.neture.co.kr ≠ neture) |
| target 고정 | service 토큰은 교환 origin 제한 없음 · workspace(store) 토큰만 origin 고정 |
| refresh | `3a182eb92` 이후 refresh 는 family 유지(회전만) · 다른 family → `TOKEN_FAMILY_MISMATCH` → null · null → `TOKEN_FAMILY_REVOKED` |
| logout / logout-all | 둘 다 `users.refreshTokenFamily = null` (사용자 전체) |
| 수신 화면 | 7개 앱 `/handoff` 모두 `useLayoutEffect(clearStoredTokens)` stale guard 보유 (neture·kpa-society·k-cosmetics·pharmacy-hub·kpa-branch·lecture·store) |
| **발견 — logout 후 세션 부활** | logout 뒤에도 남은 access token(최대 15분)으로 handoff 발급 → 교환 시 `refreshTokenFamily ?? null` 이 null 이면 **새 family 를 발급·기록** → 종료된 세션이 되살아남. 본 WO §10-1 「logout 후 handoff 로 세션 부활 불가」 위반 상태 |

## 3. 변경된 인증 계약 / 변경되지 않은 계약

### 3-1. 변경 (승인 범위: WO §11 마지막 문단)

| 대상 | 발급 | 교환 |
|---|---|---|
| `targetServiceKey === REPRESENTATIVE_ENTRY_SERVICE_KEY` (`'neture'`) | membership 조회 **0** · 활성 계정(requireAuth) + 살아 있는 세션 · `returnPath` 는 `'/'` 만(그 외 400) · targetUrl = `https://neture.co.kr/handoff?token=…&returnTo=%2F` | 수신 origin = `neture.co.kr` / `www.neture.co.kr` 정확 일치만(그 외 401 `HANDOFF_TOKEN_INVALID`, 비프로덕션 localhost 허용) · `resolveAccountAccess(user.status) === 'normal'` 아니면 403 `ACCOUNT_NOT_ACTIVE` · membership·role **읽기만** |
| **모든 대상 공통** (보안 강화) | `refreshTokenFamily` null → 401 `HANDOFF_SESSION_REVOKED` · 토큰 INSERT 0 | 같은 조건 → 401 · 새 family 발급 0 |

"아무 서비스 active membership 1개 이상" 은 자격으로 쓰지 않는다. 자격은 **활성 O4O 계정 + 살아 있는 세션** 뿐이다.

### 3-2. 불변

- 일반 서비스 target: active membership 발급·교환 이중 검증, 미가입/pending/rejected/suspended → 403, withdrawn → 403 `HANDOFF_TARGET_WITHDRAWN`
- workspace(store) handoff 계약 · 토큰 TTL 60s · 단일 사용 · 형식 검증
- family 승계 · refresh 회전 · MISMATCH/REVOKED · logout/logout-all 의미 (전역 종료)
- `auth.routes.ts`(Core Freeze 목록) 무변경 · DB schema/migration 0 · 운영 데이터 write 0 · cookie domain / CORS 무변경

## 4. 적용 앱 · 표면 전수표

공통 구현: `@o4o/auth-react` `useO4OHomeReturn` / `O4OHomeButton` (additive export). 모든 표면이 `POST /auth/handoff {targetServiceKey:'neture', returnPath:'/'}` → 현재 탭 이동. 비로그인이면 발급 없이 `https://neture.co.kr/` 로 이동.

| 표면 | 주소 | 데스크톱 | 모바일 | 로그아웃 표기 |
|---|---|---|---|---|
| KPA Society | kpa-society.co.kr | `KpaGlobalHeader` utilitySlot | 하단 '내정보' 프로필 시트(`MobileBottomNav`) 최상단 | 헤더 드롭다운 · 프로필 시트 → **O4O 로그아웃** |
| K-Cosmetics | k-cosmetics.site | `KCosGlobalHeader` utilitySlot | 햄버거 drawer `mobileUserMenuItems` 최상단 | 헤더 · drawer · `DashboardLayout` 사이드바 → O4O 로그아웃 |
| PharmacyHub | pharmacyhub.co.kr | `PharmacyHubGlobalHeader` utilitySlot · 운영자/관리자 `OperatorHeader` | 햄버거 drawer 최상단 · `OperatorHeader`(반응형 동일 버튼) | 헤더 · drawer · `OperatorHeader` → O4O 로그아웃 |
| O4O 강의 | study.neture.co.kr | `SiteShell` 헤더 nav + footer(기존 "Neture" 링크 대체) | 같은 nav(720px 이하 wrap) | O4O 로그아웃 |
| KPA 분회 | kpa-society.co.kr/kpa | `BranchLayout` 우상단(로그인 시) | 같은 영역(반응형 숨김 없음) | O4O 로그아웃 |
| 통합 매장 업무공간 | store.neture.co.kr | `RootShell` 헤더 nav + footer(기존 "Neture" 링크 대체) | 같은 nav | O4O 로그아웃 |
| Admin | admin.neture.co.kr | `AdminHeader` 우측 | 같은 영역 | 드롭다운 "로그아웃" → O4O 로그아웃 · "모든 기기에서 로그아웃" 은 실제 계약(사용자 전체 폐기)과 일치해 유지 |
| Neture 내부 | neture.co.kr/* | 기존 same-origin "O4O 홈으로" · 로고 `/` 유지 | 기존 | 기존 "O4O 로그아웃" |
| `/hospital` · `/cafe24` | neture.co.kr 하위 | **무변경** (WO §7-1 — 별도 인증·serviceKey 신설 금지, 판단 보류) | — | — |

표시 원칙: 명칭 `O4O 홈` 통일 · 새 탭 0 · 서비스 로고의 서비스 홈 의미 불변 · 공통 `GlobalHeader`(`@o4o/ui`) 무변경(기존 `utilitySlot`·`mobileUserMenuItems` 슬롯만 사용).

클릭·복구 상태: 모듈 단위 상태 1개(데스크톱·모바일 동시 클릭도 발급 1회) · 실패 시 busy 해제 + `role="alert"` 한국어 안내 + 재클릭 재시도 · `pageshow(persisted)` 에서 세대 증가 + busy/오류 해제 → 복원 이전 늦은 응답은 이동·오류 모두 무시 · 드롭다운이 닫혀 버튼이 사라져도 진행 중 이동은 유지 · 발급 주소가 `https://neture.co.kr/handoff` 가 아니면 이동 거부.

## 5. API 오류 계약

| 상황 | 응답 | 화면 |
|---|---|---|
| 비로그인 | 401 `AUTH_REQUIRED` | 발급 전 비로그인 판정이면 요청 없이 대표 홈 이동 |
| 세션 종료(logout · family null) | 401 `HANDOFF_SESSION_REVOKED` | 로그인된 척 없이 대표 홈으로 이동(로그아웃 상태 홈) |
| 차단 계정(inactive·suspended·rejected·deleted) | 발급 403 `ACCOUNT_NOT_ACTIVE`(requireAuth) · 교환 403 `ACCOUNT_NOT_ACTIVE` | "이용할 수 없는 계정 상태…" |
| 승인 대기(pending) | 발급 403 `ACCOUNT_ACCESS_RESTRICTED` · 교환 403 `ACCOUNT_NOT_ACTIVE` | "가입 승인 상태를 확인한 뒤…" |
| returnPath ≠ '/' | 400 `VALIDATION_ERROR` | 일반 실패 안내 |
| 만료 · 재사용 · 형식 오류 · 다른 origin 교환 | 401 `HANDOFF_TOKEN_INVALID` | Neture 수신 화면 기존 문구 |
| 네트워크 · 5xx | — | "O4O 홈으로 이동하지 못했습니다. 잠시 후 다시 시도해 주세요." (미가입으로 오인시키지 않음) |

## 6. Token TTL · single-use · target binding 근거

- TTL 60s: `handoff-token.service.ts` `TOKEN_TTL = 60` (무변경)
- single-use: 조건부 UPDATE RETURNING 원자 소비 — spec C「이미 소비됐거나 만료된 토큰 → 401」 SQL 조건 고정
- target binding: 토큰 행 `target_service_key='neture'` 기록(spec B) + 교환 origin 대표 진입 host 고정(spec C 4 origin 거부) + 프런트는 발급 주소 origin/path 재검증(vitest 5 케이스)

## 7. refresh family 왕복 · 다중 탭 검증표

| # | 시나리오 | 근거 | 결과 |
|---|---|---|---|
| A→B | Neture 로그인(F1) → 서비스 A handoff | exchange 가 `user.refreshTokenFamily` 승계 (spec C · unified-store spec D) | A = F1 |
| C | A 새로고침 · refresh | `refreshTokenFamilyContract.test.ts` B·C (family 유지 회전 · F1 공유 두 RT 교대 refresh 200) · 선행 CHECK §6-2~6-4 프로덕션 실측(8/8 200) | F1 유지 |
| D | A → Neture return handoff | 신규 경로 — neture membership 없이 발급(spec B) · 교환 시 F1 승계(spec C) | Neture = F1 |
| E | Neture 새로고침 | 수신 화면 stale guard(`HandoffPage.staleTokenGuard.test.tsx` 2/2) + refresh family 유지 | F1 유지 |
| F | Neture → 서비스 B | 기존 경로 불변(spec C 회귀) | B = F1 |
| G | A 기존 탭 · B · Neture 탭 교대 refresh | 같은 F1 의 RT 들은 교대 refresh 모두 허용(contract C) | 오종료 없음 **(자동 테스트 근거 · 실브라우저 NOT_VERIFIED)** |
| H | 한 탭 O4O 로그아웃 → 전 origin | logout → family null → 모든 RT `TOKEN_FAMILY_REVOKED`(contract E·F) · **남은 access token 으로 handoff 부활 401**(신규 spec B·C) | 전역 종료 · 부활 0 |

한계(불변 · 구조 변경 필요 영역, 본 WO 에서 변경하지 않음): 사용자당 단일 family 슬롯이므로 **handoff 가 아닌 직접 로그인**을 다른 origin/기기에서 하면 새 family 가 생기고, 이전 family 탭의 다음 refresh 가 `TOKEN_FAMILY_MISMATCH` → null 로 전체 세션을 종료한다(선행 CHECK §6-5 · §7-4 와 동일한 기존 계약). 이번 WO 의 복귀 흐름(Neture 출발 handoff 왕복)은 한 family 안에서만 움직이므로 이 경로를 새로 만들지 않는다. per-device/복수 family 모델은 WO §6-3 중지 대상이라 구현하지 않았다.

## 8. 자동 테스트 (로컬 · 실제 결과)

| 명령 | 결과 |
|---|---|
| `npx jest src/__tests__/representative-entry-return-handoff.spec.ts` (api-server) | **30/30** (신규) |
| `npx jest` handoff 관련 기존 4 suite (unified-store-workspace-handoff · -foundation · lecture-service-foundation · legacy-partner-runtime-retirement) | 91/91 |
| `npx jest src/services/auth src/modules/auth` | 85/85 |
| `npx vitest run --config packages/auth-react/vitest.config.mjs` | **82/82** (신규 `useO4OHomeReturn.test.tsx` 18) |
| `npx vitest run --config services/web-neture/vitest.config.*` | 158/158 |
| `npx vitest run --config packages/shared-space-ui/vitest.config.mjs community-home-nav-convergence` (헤더 raw-text 소비처) | 29/29 |
| `pnpm run type-check:frontend` (admin · 9 web 포함) | OK |
| `apps/api-server` `tsc --noEmit` | 0 error (최초 1건은 로컬 `@o4o/mail-core` dist stale — 재빌드 후 0 · 코드 무관) |
| eslint 변경 파일 | error 0 · warning 2 (AdminHeader 기존 unused `error`) |
| `check-literal-consumers --source packages/auth-react/src/index.ts` | additive export — 기존 소비처 영향 0 |
| `check-staged-scope` | 19/19 범위 내 |
| CI Pipeline (`83bfc058d`) | success (§10) |

## 9. 배포 · 실브라우저

- 배포 게이트 `DEPLOY_ENABLED=false` 유지 — **임의로 열지 않았다** (WO §12).
- push 후 Deploy API Server `35973983386` · Deploy Web Services `35973983312` · Deploy Admin `35973983439` 은 `deploy-hold-notice` 로 보류(deploy job skipped).
- 실브라우저 smoke(§10-3 표 전체 · 데스크톱/모바일 390px · 여러 탭 · O4O 로그아웃 전역 종료) = **NOT_VERIFIED** — 사유: 미배포(현재 프로덕션 API 는 target=neture 에 neture membership 을 요구하는 구 계약).
- 배포 순서 권장: **API 먼저 → Web/Admin**. Web 이 먼저 나가면 O4O 홈 클릭이 구 API 의 403 `HANDOFF_TARGET_NO_MEMBERSHIP` 을 받아 "이동하지 못했습니다" 안내만 표시된다(권한 오부여 없음 · 세션 영향 없음).
- 즉시 rollback 기준(배포 창에서 적용): Neture→서비스 handoff 실패 증가 · 미가입 서비스 접근 허용 · membership/role 오부여 · redirect/로그인 loop · refresh 후 예기치 않은 전체 종료 · logout 후 세션 부활 · 토큰 노출. rollback = 직전 revision 트래픽 복귀(API·Web 각각).

## 10. CI

- CI Pipeline `35973983438` **success** (08:13→08:21Z) · CodeQL `35973983342` **success**.

## 11. 범위 밖 발견 (보고만 · 무변경)

1. `@o4o/account-ui` `AccountSecuritySettings` 의 PharmacyHub 설정 화면 문구는 "현재 기기 로그아웃"을 전제하지만 서버 logout 은 사용자 전체 family 를 폐기한다 — 5 서비스 공용 컴포넌트라 별도 WO 권장.
2. KPA `PendingApprovalPage` 의 "로그아웃" 버튼(승인 대기 안내 화면) · 각 앱 My 설정 화면 로그아웃은 계정 메뉴·모바일 메뉴·사이드바 범위 밖이라 표기 무변경.
3. K-Cosmetics `RoleNotAvailablePage` · `SupplierInfoPage` 의 "Neture로 이동"(새 탭) 은 공급자 안내 목적이라 O4O 홈과 목적이 달라 무변경.
4. 저장 중 이탈 경고: 공용 태블릿 빌더 `beforeunload` 외 보호 없음 · `useBlocker` 0 — O4O 홈은 전체 이동이라 기존 `beforeunload` 는 그대로 동작한다. 신규 unsaved-change 시스템은 만들지 않았다.
5. 직접 로그인(비 handoff) 시 단일 family 슬롯으로 인한 타 origin 세션 종료 — §7 한계. 필요 시 별도 세션 모델 WO.

## 12. rollback

수행하지 않음 (미배포).

## 13. Git

- 구현 커밋 `83bfc058d` (19 files · path-specific stage · `git commit -- <pathspec>`) → push (`34c8f8f29..83bfc058d`, 사이의 `34c8f8f29` 는 타 세션 docs 커밋 — 무접촉).
- CHECK: 본 문서 별도 docs 커밋.

## 14. 문서 정합

`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§11-1 AccountSecuritySettings 로그아웃 문구)`
