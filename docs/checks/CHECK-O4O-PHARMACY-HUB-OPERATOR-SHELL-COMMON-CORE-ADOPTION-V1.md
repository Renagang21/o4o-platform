# CHECK-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1

> WO: `WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1`
> 작업일: 2026-08-13
> worktree: `C:\tmp\o4o-agent-e-operator-common` · 브랜치: `work/operator-commonization-v1` (기준 `origin/main` = `0a2d88100`)

---

## 0. 결과 요약

| # | 완료 기준 | 결과 |
|:-:|---|:---:|
| 1 | `/operator` 가 공통 `OperatorAreaShell`(@o4o/operator-ux-core) + `DomainIASidebar` 로 렌더 | PASS |
| 2 | Pharmacy-Hub 전용 `OperatorLayoutWrapper` + 서비스별 menu/header/config 추가 | PASS |
| 3 | 실재 메뉴 `가입 신청 관리` 만 노출 (dead link 0) | PASS |
| 4 | `/operator` · `/operator/memberships` · `/operator/memberships/:membershipId` nested route 정리 · URL 무변경 | PASS |
| 5 | `MembershipGate` · backend `pharmacy-hub:operator` 경계 · 승인/반려 업무 규칙 보존 | PASS |
| 6 | typecheck / build | PASS |
| 7 | 브라우저 smoke (운영자 계정 실 로그인 · 프로덕션 API) | PASS |
| 8 | GlycoPharm 포함 공통 패키지 회귀 | PASS |

**종합: PASS** (승인·반려 **실행** 버튼 클릭은 미수행 — §5 참조)

API 변경 0 · DB/migration 0 · KPA/K-Cosmetics/Neture/GlycoPharm 소스 변경 0 · 공통 패키지 변경 0.

---

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-pharmacy-hub/src/layouts/OperatorLayoutWrapper.tsx` | 신규 — `MembershipGate` + 공통 `OperatorAreaShell` |
| `services/web-pharmacy-hub/src/components/operator/OperatorHeader.tsx` | 신규 — Shell 의 header slot (KPA `KpaGlobalHeader` / KCos `KCosGlobalHeader` 대응) |
| `services/web-pharmacy-hub/src/config/operatorMenuGroups.ts` | 신규 — `UNIFIED_MENU` + `PHARMACY_HUB_OPERATOR_DOMAIN_IA` |
| `services/web-pharmacy-hub/src/config/operatorCapabilities.ts` | 신규 — `ENABLED_CAPABILITIES = [MEMBERSHIP_APPROVAL]` |
| `services/web-pharmacy-hub/src/App.tsx` | `/operator` 3개 라우트를 부모+nested 로 재배치 (URL·화면 컴포넌트 무변경) |
| `services/web-pharmacy-hub/package.json` | `@o4o/operator-ux-core` · `@o4o/types` workspace dep 추가 |
| `services/web-pharmacy-hub/tailwind.config.js` | content 에 `packages/operator-ux-core/src` 추가 |
| `pnpm-lock.yaml` | 위 workspace dep 반영 (외부 패키지 추가 0) |

**공통 패키지(`packages/**`) 및 타 서비스 파일 변경 0건.**

### 1-1. 채택한 공통 구조 (KPA / K-Cosmetics / GlycoPharm 와 동일 계약)

```text
OperatorLayoutWrapper
  └ MembershipGate                      (Pharmacy-Hub 기존 가드 — 유지)
      └ OperatorAreaShell               (@o4o/operator-ux-core)
          ├ header  = <OperatorHeader/> (서비스 slot)
          ├ sidebar = DomainIASidebar   (공통)
          └ main    = <Outlet/>         (nested route)
```

메뉴는 `UNIFIED_MENU` → `filterMenuByRole(@o4o/ui)` → Shell 주입. 서비스 전용 Sidebar/Layout 사본 없음.

### 1-2. domainIAConfig 를 주입한 이유

공통 default IA(KPA 계열)는 `approvals` 그룹을 **매장 HUB 운영** 도메인에 묶는다.
Pharmacy-Hub 의 `approvals` 는 매장 HUB 업무가 아니라 **서비스 가입 승인**이므로,
Neture 와 동일한 방식으로 서비스별 `domainIAConfig`(`가입·회원 운영` / `운영 공통`)를 주입했다.
공통 default 는 건드리지 않았다 — 기존 3개 서비스 노출 결과 무변화.

### 1-3. tailwind content 추가 (실측으로 발견)

`operator-ux-core` 는 source-mode 소비라 tailwind content 에 없으면 `lg:flex-row` 등
반응형 클래스가 생성되지 않는다. 최초 빌드에서 **사이드바가 좌측 컬럼으로 서지 않고
상단 가로 바로 렌더**되는 것을 브라우저 smoke 로 확인해 K-Cosmetics 와 동일 항목을 추가했다.

---

## 2. URL 보존

| URL | 이전 | 이후 |
|---|---|---|
| `/operator` | `MembershipGate > RoleEntryPage` | `OperatorLayoutWrapper > index: RoleEntryPage` |
| `/operator/memberships` | `MembershipGate > MembershipsPage` | 동일 wrapper 하위 `memberships` |
| `/operator/memberships/:membershipId` | `MembershipGate > MembershipDetailPage` | 동일 wrapper 하위 `memberships/:membershipId` |

주소·화면 컴포넌트·페이지 내부 로직 모두 무변경. redirect 신설 0.

---

## 3. 검증 — typecheck / build

| 명령 | 결과 |
|---|---|
| `pnpm --filter pharmacy-hub-web type-check` | PASS (`tsc -b` 오류 0) |
| `pnpm --filter pharmacy-hub-web build` | PASS (`✓ built in 22.68s` → tailwind 수정 후 재빌드도 PASS) |
| `pnpm --filter glycopharm-web type-check` | PASS (공통 패키지 회귀 확인) |

> 최초 typecheck 시 나온 `Cannot find module '@o4o/ui' …` 류 오류는 신규 worktree 에
> dist-mode 패키지가 빌드되지 않은 환경 사유였다. `@o4o/{types,auth-utils,auth-client,ui,account-ui,content-editor}`
> (glycopharm 은 추가로 `@o4o/utils`,`@o4o/lms-client`) 빌드 후 양쪽 모두 오류 0.

---

## 4. 브라우저 smoke (실 브라우저 · 프로덕션 API)

로컬 `vite preview` (port 5173 — API CORS allowlist 포함 포트) + `https://api.neture.co.kr` 실 API.
계정: `sohae2100@gmail.com` (`pharmacy-hub:operator`, membership active).

| # | 확인 | 결과 |
|:-:|---|:---:|
| 1 | 미인증 `/operator` → "로그인이 필요합니다" 안내 (셸 미노출) | PASS |
| 2 | 로그인 후 `/operator` → 헤더(Pharmacy-Hub · 서비스 운영자 · 사용자명 · 로그아웃) + 좌측 사이드바 렌더 | PASS |
| 3 | 사이드바 = `👥 가입·회원 운영` > `가입 신청 관리` 1개 (dead link 0) | PASS |
| 4 | `/operator` index = 기존 `RoleEntryPage` 그대로 (`이 역할 진입 권한이 확인되었습니다.`) | PASS |
| 5 | `/operator/memberships` 목록 셸 안에서 렌더 · 실 데이터 로드 · 탭(승인 대기/완료/반려/전체)·검색 동작 | PASS |
| 6 | `/operator/memberships/:membershipId` 상세 진입 · URL 유지 · 상세 필드 정상 | PASS |
| 7 | 활성 메뉴 하이라이트 · `목록으로` · `운영자 홈` 링크 정상 | PASS |
| 8 | `/store-owner` 매장 셸 회귀 없음 (tailwind content 추가는 additive) | PASS |

---

## 5. 승인·반려 기능에 대한 판정

- 승인/반려 **코드 경로는 무변경**이다 (`MembershipDetailPage` · 백엔드 라우트 모두 미수정).
- smoke 시점 프로덕션 `승인 대기` 큐가 **0건**이라, 실제 승인/반려 버튼 클릭 검증은 하지 않았다.
  운영 데이터를 만들어 승인·반려를 실행하는 것은 본 WO 범위(셸 편입) 밖이며 되돌릴 수 없는 write 다.
- 처리 완료 건 상세에서 `이미 처리된 신청입니다.` 안내가 기존과 동일하게 노출되는 것까지 확인했다.

---

## 6. 하지 않은 것 (WO 제외 범위 준수)

회원관리 화면 공통화 / `OperatorMembersConsolePage` 적용 / 신규 운영자 메뉴 추가 /
API·DB 변경 / KPA·K-Cosmetics·Neture 코드 수정 / GlycoPharm 기능 적용 — **전부 미수행**.

---

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
