# CHECK — WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1

- **판정**: PASS_WITH_UNVERIFIED
- **일자**: 2026-08-18
- **커밋**: `5776b2a60` (구현) · `5ac121923` (공유 셸 라벨 파라미터화) · 본 CHECK 후속 커밋
- **대상**: Pharmacy-Hub (`services/web-pharmacy-hub`) — 관리자/운영 2영역 독립 채택

---

## 1. 원인

Operator 공통화 완료 선언 이후에도 Pharmacy-Hub 계정 메뉴에는 `서비스 운영자` 항목 하나만 노출됐다.
`PharmacyHubGlobalHeader` 는 **operator 판정만** 가지고 있었고(`isAdmin` 없음), 서비스 안에 `/admin`
라우트 자체가 없었다. 또한 프론트 역할 표(`config/service.ts`)에 `platform:super_admin` 이 빠져 있어
플랫폼 관리자도 역할 기반 진입이 불가능했다.

부가 결함: 관리자 스코프 화면인 **법정정보·약관 설정**(백엔드 쓰기 권한 = `pharmacy-hub:admin`)이
`/operator/settings/legal` 아래에 있었다 — 화면 위치와 권한 축이 어긋나 있었다.

---

## 2. 공식 5서비스 census (admin / operator 영역)

| 서비스 | 프로필 메뉴 항목 | `/admin` route | `/operator` route | 판정 |
|---|---|---|---|---|
| KPA-Society | `관리자 대시보드` + `운영 대시보드` **독립** (`KpaUserMenu.tsx`) | `/admin/*` → `AdminRoutes` | 있음 | canonical |
| K-Cosmetics | 독립 2항목 (`KCosGlobalHeader.tsx`, legacy ternary 제거 완료) | 있음 | 있음 | canonical |
| GlycoPharm | 독립 2항목 (`GlycoGlobalHeader.tsx`) | 있음 | 있음 | canonical |
| Neture | 독립 2항목 (`NetureUserMenu.tsx`) | `/admin` → `AdminDashboardPage` | 있음 | canonical |
| **Pharmacy-Hub** | **`서비스 운영자` 1항목** | **없음** | 있음 | **결함(본 WO 대상)** |

- 데스크톱 드롭다운과 모바일 드로어는 공통 `@o4o/ui` `GlobalHeader` 계약상 같은 `userMenuItems` 를
  사용한다(`mobileUserMenuItems ?? userMenuItems`, `showMobileUserMenu` 기본 `true`) — 항목 정의 1곳
  수정으로 두 표면이 함께 정렬된다.
- 관측된 잔여 drift 1건(**본 WO 범위 밖, 보고만**): `services/web-kpa-society/src/components/store/StoreUserDropdown.tsx`
  는 `to={isAdmin ? '/admin' : '/operator'}` + 라벨 삼항으로 남아 있어, admin 계정에서 운영 대시보드
  항목이 가려진다. K-Cosmetics 가 이미 제거한 legacy ternary 와 같은 패턴 → **별도 WO 제안**.

---

## 3. admin / operator 최종 계약 (Pharmacy-Hub)

| 항목 | 계약 |
|---|---|
| `관리자 대시보드` | `pharmacy-hub:admin` 또는 `platform:super_admin` → `/admin` |
| `운영 대시보드` | `pharmacy-hub:operator` 이상(admin ⊃ operator) 또는 `platform:super_admin` → `/operator` |
| 두 역할 동시 보유 | **두 항목 모두 표시** — admin 이 operator API 를 쓸 수 있다는 이유로 메뉴를 합치지 않는다 |
| store_owner / supplier | 두 항목 모두 비표시 (백엔드 403 대상 메뉴를 열지 않는다) |
| `/admin` 가드 | `MembershipGate` + `satisfiesRole(roles, admin)` — 미충족 시 안내 화면(404/white screen 아님) |
| 플랫폼 관리자 경계 | `admin.neture.co.kr` = 플랫폼 전역 구조·정책. 서비스 내부 `/admin` = **해당 서비스 구조·정책**(법정정보·약관). 중복 사본 아님 |

**`/admin` 이 실제로 필요한가** — 필요하다. Pharmacy-Hub 에는 이미 admin 스코프 백엔드 업무가
존재한다(`GET/PUT /admin/services/pharmacy-hub/legal-profile`, `policies` 게시·lifecycle = `{service}:admin`).
이 화면이 operator 영역에 얹혀 있어 권한 축이 어긋났을 뿐이다. 화면 없는 링크만 추가하지 않았다 —
`/admin` 은 실데이터 대시보드 + 실제 동작하는 설정 화면 2개로 구성했다.

**셸은 새로 만들지 않았다.** 저장소에 공유 admin *셸* 패키지는 없다(K-Cosmetics·GlycoPharm 은 각자
로컬 `DashboardLayout` 보유). 따라서 공통 `@o4o/operator-ux-core` `OperatorAreaShell` 을 라벨·메뉴·IA
주입만으로 재사용하고, 진짜 공유 자산인 `@o4o/admin-ux-core` `AdminDashboardLayout` 4-Block 을 채택했다.

---

## 4. 관리자 전용 기능 census (접근 불가 0건 기준)

| 백엔드 admin 스코프 업무 | pharmacy-hub 지원 | 화면 |
|---|---|---|
| service legal-profile 조회/수정 | ✅ (`SUPPORTED_LEGAL_SERVICE_KEYS`) | `/admin/settings/legal-terms` |
| service policy 생성/수정/게시/lifecycle | ✅ | `/admin/settings/legal-terms` |
| contact-inquiry / contact-settings | ❌ 백엔드 화이트리스트에서 pharmacy-hub 제외 | 링크 추가 안 함(데드링크 방지) |

→ **화면이 없어 접근할 수 없는 admin 기능 0건.**

---

## 5. 변경 파일 (`5776b2a60`, 14 files)

- `src/config/service.ts` — `PLATFORM_SUPER_ADMIN` 추가, `ROLE_SCOPE_MAPPING` 정렬
- `src/components/PharmacyHubGlobalHeader.tsx` — `isAdmin`/`isOperator` 독립 항목 2개
- `src/components/operator/OperatorHeader.tsx` — `areaHome`/`areaLabel` 파라미터화(사본 대신 재사용)
- `src/config/adminMenuGroups.ts` (신규) — admin 메뉴·capability·Domain IA
- `src/layouts/AdminLayoutWrapper.tsx` (신규) — 가드 + `OperatorAreaShell` 재사용
- `src/pages/admin/PharmacyHubAdminDashboard.tsx` (신규) — `@o4o/admin-ux-core` 4-Block, 실데이터 기반
- `src/lib/serviceLegalClient.ts` (신규, 설정 페이지에서 추출) / `src/pages/admin/ServiceLegalSettingsPage.tsx` (operator→admin 이관)
- `src/App.tsx` — `/admin` route tree 추가, `/operator/settings/legal` 제거
- `src/config/operatorMenuGroups.ts` · `operatorCapabilities.ts` — 빈 그룹 방지(SETTINGS 제거)
- `package.json` · `Dockerfile` · `pnpm-lock.yaml` — `@o4o/admin-ux-core` 의존 추가(**중지 조건 관련 명시 보고**: dependency 변경에 해당하나, WO 가 "기존 canonical 구조 채택은 중간 승인 없이 완료" 로 명시. lockfile diff = importer 3줄, Dockerfile 은 선별 COPY 계약상 2줄 필수)

---

## 6. 로컬 검증

| 항목 | 결과 |
|---|---|
| `pharmacy-hub-web` type-check | PASS |
| `pharmacy-hub-web` build | PASS |
| `@o4o/web-kpa-society` build | PASS |
| `@o4o/web-k-cosmetics` build | PASS |
| `@o4o/web-neture` build | PASS |
| `glycopharm-web` build | PASS |

## 7. CI · 배포

| 실행 | 결과 |
|---|---|
| Deploy Web Services — `5776b2a60` | `detect-changes` success · **`deploy-pharmacy-hub` success** · 나머지 5서비스 skipped(변경 없음) |
| CI Pipeline / CodeQL — `5776b2a60` | **concurrency cancelled** (직후 타 세션 커밋 `23fe9973d` 푸시). 대체 확인 = 후속 head 실행 + 로컬 type-check·5서비스 build PASS |
| Deploy Web Services — `5ac121923` (공유 셸 라벨 파라미터화) | (아래 §9 재검증 참조) |

## 8. 프로덕션 E2E — `https://pharmacyhub.co.kr` (실계정, 실 UI 경로)

데스크톱 1440×900 / 모바일 390×844 각각 실행. 자격증명은 gitignore 된 로컬 문서에서만 읽었고
출력·스크립트·본 문서 어디에도 남기지 않았다.

### 8-1. admin + operator 동시 보유 계정

| 검증 | desktop | mobile |
|---|:---:|:---:|
| 계정 메뉴에 `관리자 대시보드` 노출 | PASS | PASS |
| 계정 메뉴에 `운영 대시보드` **동시** 노출 | PASS | PASS |
| `/admin` — 4-Block 관리자 대시보드 렌더 | PASS | PASS |
| `/admin/settings/legal-terms` — 설정 화면 렌더 | PASS | PASS |
| `/operator` — 기존 운영 대시보드 무변화 | PASS | PASS |
| JS exception / white screen / dead link | 0 | 0 |

- `/admin` 실데이터 표시 확인: `법정정보 필수 항목 0/6`, `게시중 정책 문서 0` — Pharmacy-Hub 법정정보가
  실제로 미설정 상태임을 그대로 반영(가짜 카드 아님, 조회 실패를 0 으로 삼키지 않음).

### 8-2. store_owner 계정 (음성 검증)

| 검증 | desktop | mobile |
|---|:---:|:---:|
| `관리자 대시보드` / `운영 대시보드` 메뉴 **비노출** | PASS | PASS |
| `/admin` 직접 진입 → `관리자 권한이 필요합니다` 안내 + 운영 대시보드 이동 링크 (404·white screen 아님) | PASS | PASS |
| `/admin/settings/legal-terms` 직접 진입 → 동일 안내 | PASS | PASS |

**관측(본 WO 범위 밖, 보고만)**: store_owner 가 `/operator` 를 직접 입력하면 셸은 렌더되고 API 가 403 을
반환해 `Request failed with status code 403` 오류 카드가 표시된다. 메뉴에는 노출되지 않으므로 dead link 는
아니나, `/admin` 처럼 프론트 가드로 안내 화면을 주는 편이 계약상 일관적이다 → **별도 WO 제안**.

## 9. 공유 셸 라벨 파라미터화 + 배포 후 재검증 (`5ac121923`)

E2E 에서 `/admin` 모바일 드로어가 공유 셸 기본값인 `운영자 메뉴` 라벨을 그대로 노출했다.
`DomainIASidebar` / `OperatorAreaShell` 에 **optional `menuLabel`**(default `'운영자 메뉴'`)만
추가하고 Pharmacy-Hub `/admin` 에서 `관리자 메뉴` 를 주입했다 — 기존 소비처 4서비스는 기본값이라
호출부 변경이 없다(Shared Module Change Protocol: 소비처 전수 확인 → 무변화 확인).

| 배포 후 재검증 (mobile 390×844) | 결과 |
|---|---|
| Deploy Web Services `5ac121923` — 6 job 전부 success | PASS |
| PH `/admin` 드로어 라벨 `관리자 메뉴` · `운영자 메뉴` 미노출 | PASS (JS exception 0) |
| PH `/operator` 드로어 라벨 `운영자 메뉴` 유지 | PASS (JS exception 0) |
| KPA-Society `/operator` 드로어 라벨 유지 | PASS (JS exception 0) |
| K-Cosmetics `/operator` 드로어 라벨 유지 | PASS (JS exception 0) |
| Neture `/operator` 드로어 라벨 유지 | PASS (JS exception 0) |
| GlycoPharm `/operator` 드로어 라벨 유지 | PASS (JS exception 0) |

## 10. 잔여 미검증 / 후속

| 항목 | 사유 |
|---|---|
| operator 단독 보유 계정 · admin 단독 보유 계정의 메뉴 1개 표시 | 해당 fixture 부재. 실사용자 role 변경은 본 WO 중지 조건이라 만들지 않았다. 코드 경로상 두 조건은 독립(`isAdmin` / `isOperator`)이며 store_owner 음성 검증으로 조건부 렌더 자체는 실증됨 |
| `platform:super_admin` 의 Pharmacy-Hub `/admin` 실브라우저 진입 | super_admin 계정에 pharmacy-hub membership 이 없어 `MembershipGate` 앞단에서 막힌다. 프론트 역할 표에는 반영 완료(`ROLE_SCOPE_MAPPING`), 백엔드는 `PHARMACY_HUB_SCOPE_CONFIG.platformBypass: true` 로 이미 허용 — **실계정 실증은 미완료** |
| KPA `StoreUserDropdown` legacy ternary drift | §2 기재. 별도 WO 제안 |
| store_owner 의 `/operator` 직접 진입 시 403 오류 카드 | §8-2 기재. 별도 WO 제안 |

## 11. 판정

**PASS_WITH_UNVERIFIED** — WO 완료 기준의 결함(관리자/운영 2영역 독립 노출·`/admin` 실화면·모바일 동일 동작·
4서비스 회귀 0·CI·배포·프로덕션 E2E)은 모두 충족. §10 의 2건(단독 역할 fixture, super_admin 실진입)은
계정 상태 변경 없이는 실증 불가라 미검증으로 남긴다.

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
