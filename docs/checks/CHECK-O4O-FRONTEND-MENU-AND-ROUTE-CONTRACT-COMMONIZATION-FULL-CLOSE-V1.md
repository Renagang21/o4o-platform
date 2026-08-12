# CHECK — O4O Frontend 메뉴·라우팅 계약 공통화 전수 종료

- **WO**: `WO-O4O-FRONTEND-MENU-AND-ROUTE-CONTRACT-COMMONIZATION-FULL-CLOSE-V1`
- **일자**: 2026-08-12
- **대상**: `kpa-society` / `neture` / `k-cosmetics` / `glycopharm` / `pharmacyhub`
- **기준 커밋**: `6ad94a498` (직전 `d866faa08`)
- **원칙**: 메뉴 내용이 아니라 **메뉴를 정의·필터링·표시·라우팅하는 구조**만 공통화

---

## 1. 전수 조사 결과 — 이미 공통화된 축

| 축 | 공통 자산 | 5개 서비스 소비 상태 |
|---|---|---|
| 운영자 사이드바 메뉴 정의 | `@o4o/ui` `OperatorGroupKey` / `UnifiedMenuItem` | KPA·Neture·KCos·Glyco 4개 소비 (PH 없음) |
| 운영자 메뉴 권한 필터 | `@o4o/ui` `filterMenuByRole` | 4개 소비 |
| 운영자 셸·사이드바 접기·Domain IA | `@o4o/operator-ux-core` `OperatorAreaShell` | 4개 소비 |
| 헤더 렌더링·현재 경로 판정·모바일 drawer | `@o4o/ui` `GlobalHeader` (`isActive`) | 4개 소비 |
| 매장 대시보드 레이아웃·메뉴 | `@o4o/store-ui-core` `StoreDashboardLayout` | KPA·KCos·Glyco·PH 소비 (Neture 매장 없음) |

→ 이번 WO 이전에 이미 대부분 Core 로 승격돼 있었다. **중복이 남아 있던 곳은 아래 2곳뿐**이다.

## 2. 대응표 판정 요약

| 판정 | 건수 | 내용 |
|---|---:|---|
| 공통 Core 승격 | 1 | `filterContextualNav` — 4개 서비스 중복 구현 → `@o4o/ui` 단일 구현 |
| 서비스별 Extension 유지 | 4 | 각 서비스 `config/navigation.ts` 의 메뉴 항목·`visibleWhen` 조건 키·역할 판정식 |
| 의도된 차이 | 4 | ① KPA 는 operator/admin 전체 노출 정책 미적용 ② Neture operator 셸 `filterMenuByRole(UNIFIED_MENU, false)` (admin 항목은 별도 `AdminLayoutWrapper`) ③ GlycoPharm `pharmacyRelated`(pharmacist role/membership) ④ Neture legacy 미접두사 role(`supplier`/`partner`) |
| 메뉴와 라우트 불일치 | **0** | 아래 §3 |
| dead menu / dead export | 3 | `OPERATOR_MENU_ITEMS` (KPA·GlycoPharm·K-Cosmetics) — runtime consumer 0 |

## 3. 메뉴 ↔ 라우트 존재 대응 검사

App.tsx 및 하위 라우터(`KPA OperatorRoutes`/`AdminRoutes`)를 중첩 경로까지 전개해 실제 route 표를 만들고,
메뉴 정의의 `path`/`href` 를 파라미터(`:id`)·splat(`*`) 인식 매칭으로 대조했다.

| 서비스 | route 수 | 운영자 메뉴 항목 | 헤더·유저메뉴·모바일 링크 | 라우트 없음 |
|---|---:|---:|---:|---:|
| kpa-society | 300 | 60 (adminOnly 2) | 15 | 0 |
| neture | 289 | 69 (adminOnly 20) | 12 | 0 |
| k-cosmetics | 181 | 30 (adminOnly 0) | 12 | 0 |
| glycopharm | 236 | 68 (adminOnly 3) | 12 | 0 |
| pharmacyhub | 36 | — (운영자 메뉴 설정 없음) | — | 0 |

- **메뉴 → 라우트 불일치 0건.** 임의 삭제한 메뉴·라우트 없음.
- 메뉴가 없는 정상 라우트(상세·편집·콜백 등)는 소비 의도가 확인되는 화면이므로 **그대로 유지**했다.

## 4. 변경 내용

### 4-1. Core 승격 — `packages/ui/src/layout/filterContextualNav.ts`

```
filterContextualNav<TCondition>(items, conditions, { showAll? }): GlobalHeaderNavItem[]
```

기존 4개 구현과 **결과 계약 동일**: `showAll` → 조건 무시 전체 노출 / 그 외 `conditions[visibleWhen] === true` 만 노출
(미정의 조건 키는 false — 기존 `return false` 기본값과 동일) / `{ label, href }` 정규화 / 입력 순서 보존.

| 서비스 | 이전 | 이후 |
|---|---|---|
| KPA | 로컬 filter + `KpaNavVisibility` | `filterContextualNav(KPA_CONTEXTUAL_NAV, { storeOwner })` — `showAll` 미주입 |
| Neture | 로컬 filter + `NetureNavVisibility` | `{ supplier, partner }`, `{ showAll: isAdmin \|\| isOperator }` |
| K-Cosmetics | 로컬 filter + `KCosNavVisibility` | `{ storeManager }`, `{ showAll: isAdmin \|\| isOperator }` |
| GlycoPharm | 로컬 filter + `GlycoNavVisibility` | `{ storeOwner, pharmacyRelated }`, `{ showAll: isAdmin \|\| isOperator }` |

### 4-2. dead export 제거

`OPERATOR_MENU_ITEMS` (KPA 52L / GlycoPharm 60L 는 `UNIFIED_MENU` 사본, K-Cosmetics 는 alias 1L) 제거.
정본은 `UNIFIED_MENU` + `filterMenuByRole`. Neture 는 이미 제거 완료 상태였다.

### 4-3. 중복 감소량

| 구분 | 수치 |
|---|---|
| 커밋 전체 | 13 files, **+96 / −260** |
| Core 신규 | `filterContextualNav.ts` 46L (1곳) |
| 제거된 서비스별 중복 filter 구현 | 4곳 (navigation.ts 합계 −116L) |
| 제거된 dead 메뉴 사본 | 3곳 (operatorMenuGroups.ts 합계 −121L) |

### 4-4. 남긴 Extension

메뉴 항목·라벨·URL·아이콘·`visibleWhen` 조건 키·역할 판정식(`isPharmacistRole`, Neture legacy role, `isStoreOwnerDual`)
은 전부 서비스별 유지. Pharmacy-Hub 는 메뉴 설정 파일 없이 `StoreOwnerShell` + `StoreDashboardLayout` 만
소비하는 제한된 구조를 그대로 보존했다.

## 5. 검증

| 항목 | 결과 |
|---|---|
| 5개 서비스 typecheck (`tsc --noEmit`) | PASS |
| 5개 서비스 build | PASS |
| 테스트 | 대상 5개 서비스·`@o4o/ui` 에 test script 없음 — 실행 대상 없음 |
| 배포 | (§6) |
| 프로덕션 브라우저 smoke | (§6) |

## 6. 배포 및 프로덕션 smoke

### 6-1. 배포

| 항목 | 값 |
|---|---|
| commit | `6ad94a498` |
| workflow | `Deploy Web Services (Cloud Run)` run `31558072789` |
| 결과 | 5개 서비스 job 전부 success (kpa-society / neture / k-cosmetics / glycopharm / pharmacy-hub) |

### 6-2. 역할별 브라우저 smoke (프로덕션, Playwright)

계정은 `docs/local/TEST-ACCOUNTS.local.md` 를 참조했다. 자격증명 값은 본 문서에 기록하지 않는다.

| 서비스 | 역할 | 확인 내용 | 결과 |
|---|---|---|---|
| KPA-Society | 비로그인 | contextual 항목 0개 + `Contact` 노출 (기존 계약 동일) | PASS |
| KPA-Society | 약국 경영자 | `내 약국 /store` · `약국 운영 허브 /store-hub` 2개 노출, 로그인 후 `/store` 진입 | PASS |
| KPA-Society | 약국 경영자 | 중첩 경로 `/store/library/contents` 새로고침 시 `내 약국` 활성 판정 정상 | PASS |
| KPA-Society | 약국 경영자 | 모바일(390×844) 메뉴에서 동일 contextual 항목 + 사용자 메뉴 노출 | PASS |
| K-Cosmetics | 운영자/관리자 | `showAll` 정책대로 `매장 운영 허브 /store-hub` · `내 매장 /store` 2개 노출 (store_owner 역할 없이도) | PASS |
| GlycoPharm | 운영자/관리자 | `showAll` 정책대로 `매장 운영 허브 /store-hub` · `내 약국 /store` 2개 노출 | PASS |
| Neture | 공급자 | `공급자 대시보드 /supplier/dashboard` 만 노출, partner 항목 미노출 (조건 필터 정상) | PASS |
| Pharmacy-Hub | 매장(store_owner) | 로그인 후 역할별 진입점 3종 정상 (본 WO 변경 대상 아님 — 회귀 없음) | PASS |

메뉴 항목의 라벨·경로·순서·노출 조건이 변경 전과 동일함을 확인했다. 메뉴 클릭 이동 URL·화면, 직접 URL 접근 결과도 동일하다.

### 6-3. smoke 중 관측된 기존 동작 (본 WO 회귀 아님)

- KPA `/store-hub` 에서 `내 약국(/store)` 과 `약국 운영 허브(/store-hub)` 가 **동시에 활성** 표시된다.
  `GlobalHeader` 내부 `isActive()` 의 prefix 판정(`/store-hub`.startsWith(`/store`)) 때문이며,
  본 WO 는 `isActive()` 를 수정하지 않았다. 변경 전과 동일한 동작이므로 별도 문제 큐로 유지한다.
- Neture 공급자 계정 `sohae21@naver.com` 은 현재 Neture 서비스 이용 권한이 없어 401 이다.
  공급자 smoke 는 `테스트 공급자` 계정으로 수행했다. 계정 상태 문제이며 메뉴·라우팅과 무관하다.

## 7. 범위 밖 — 별도 문제 큐 유지

| 항목 | 상태 |
|---|---|
| GlycoPharm `StoreLayout` 오류 표시(`setError(object)`) | 기존 결함, 이번 범위 밖 |
| `logoutAll` 로컬 토큰 계약 | 기존 결함, 이번 범위 밖 |
| 모바일 하단 메뉴 추가 공통화 | 사용자 지시로 확대 금지 — 의도된 차이로 유지 |

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
