# WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1 — CHECK

> **상태**: 3단계 구현 완료 · 프로덕션 배포 검증 대기
> **작성일**: 2026-09-09
> **대상**: `admin.neture.co.kr` (`apps/admin-dashboard`) + `platform-hub` 백엔드 1건
> **조사 정본**: [`IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1`](../investigations/IR-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-CENSUS-V1.md)
> **커밋**: `481ecb0c3` (1단계 IR) · `61f772d0c` (3단계 구현)

---

## 1. 확정된 사업 판단 (사용자, 2026-09-09)

| # | 항목 | 결정 |
|:-:|---|---|
| 1 | 관리자 사이트 권한 경계 | **플랫폼 관리자 전용으로 좁힌다.** 단 `role_assignments` 실제 보유자 확인 전에는 역할명 일괄 교체 금지 |
| 2 | Forum | **전량 서비스 operator 로 이전.** 관리자 메뉴·화면 제거, 공용 Forum core 는 유지 |
| 3 | CMS V2 ↔ CPT Engine | **CMS V2 유지 + 미구현 4항목 제거.** 백엔드 `/api/v1/cpt/*`·entity·table 은 별도 판정 |
| 4 | 매장 네트워크 / 오프라인 매장 | **둘 다 관리자 최상위에서 제거.** backend·`physical_stores`·`checkout_orders` 는 삭제 금지 |

보충 지시(동일 메시지): "이전"은 신규 operator 화면을 만드는 의미가 아니다. 기존 서비스 operator 에
대응 기능이 있으면 그것을 정본으로 두고 **admin 의 중복 진입점만 제거**한다.

---

## 2. 권한 경계 — 무엇을 했고 무엇을 남겼는가

### 2-1. 잠금 위험 실증 (결정 1의 선행 조건)

프로덕션 DB `o4o_api` 자격정보가 `.env` 와 불일치해 `role_assignments` 직접 조회는 불가했다
(§6 미완 항목). 대신 **자격정보 없이** Cloud Run 요청 로그로 실증했다.

30일간 `referer: admin.neture.co.kr` 요청 중 **백엔드가 `platform:super_admin` 만 허용하는
endpoint 의 응답**:

| endpoint | 백엔드 가드 | 결과 |
|---|---|---|
| `/api/v1/admin/ops/metrics` | `authenticate` + `requireAdmin` | **200** |
| `/api/v1/admin/store-network/{summary,top-stores,insights}` | `requireAuth` + `requireAdmin` | **200** |
| `/api/v1/admin/apps{,/market,/disabled,/service-groups}` | `requireAdmin` | **200** |
| `/api/v1/admin/platform-accounts` | platform 경계 | **200** |
| `/api/v1/admin/platform-accounts/:id/password` | platform 경계 | **200 · 204** (쓰기 성공) |

- `requireAdmin` 은 `WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1` 이후 **`platform:super_admin` 전용**이다
  (legacy `admin`·`super_admin` 거부).
- 따라서 **현재 관리자 사이트를 운영하는 계정은 `platform:super_admin` 을 보유한다** — 실증됨.
- 같은 기간 admin origin 의 **403 은 0건**이다. 4xx 는 401(토큰 만료 refresh) 과 404(백엔드 부재)뿐.
- 로그인 발생 원격 IP 는 **2개**(`124.194.156.36`, `112.153.205.95`) — 사실상 단일 운영자의 2개 네트워크.

### 2-2. 이번에 좁힌 것

**백엔드가 이미 `platform:super_admin` 만 허용하는 화면**의 프런트 3계층(메뉴 게이트 · route 가드)을
백엔드와 일치시켰다. 제외되는 사용자는 **이전에도 API 403 을 받던 사용자**이므로 기능 손실이 0 이다.

| 대상 | 이전 | 이후 |
|---|---|---|
| `/operators` route | `['admin','super_admin','platform:super_admin']` | `[...PLATFORM_ADMIN_ROLES]` |
| `/operator/points`, `/operator/points/budget` | `['admin','super_admin']` | `['platform:super_admin']` |
| `/admin/platform/hub` | `['admin']` | `['platform:super_admin']` |
| `/admin/ops/metrics` | `['admin']` | `['platform:super_admin']` |
| `/apps/store`, `/admin/appstore/installed` | `['admin']` | `['platform:super_admin']` |
| `menuPermissions` | 항목 2개(실게이트 1) | **6개** (+`core-operators`·`core-points`·`platform-hub`·`ops-metrics`·`appstore-browse`) |

### 2-3. 의도적으로 남긴 것 — `App.tsx` 진입 floor

`App.tsx:172` 의 `<AdminProtectedRoute requiredRoles={['admin']}>` 는 **바꾸지 않았다.**

`adminRouteAccess.ts` 의 `matchesRequiredRole` 이 요구 집합에 `admin` 이 있으면 **모든 서비스 접두
`:admin`/`:operator` 역할**을 통과시키므로, 이 floor 를 좁히는 것이 "플랫폼 관리자 전용"의 마지막 조각이다.

**지금 좁히면 실제 잠금 사고가 난다.** `docs/local/TEST-ACCOUNTS.local.md` §3 (2026-08-09 DB 실측):

| 계정 | 보유 role | floor 축소 시 |
|---|---|---|
| `sohae2100@gmail.com` (주 운영자) | `kpa:admin` `kpa:operator` `kpa:store_owner` `glycopharm:admin/operator` `cosmetics:admin/operator` `neture:admin` `neture:operator` `pharmacy-hub:operator` — **`platform:super_admin` 없음** | **admin.neture.co.kr 전면 차단** |
| `renariver21@gmail.com` | `platform:super_admin` (§4-3 검증 계정) | 정상 |

같은 문서 §4-1 은 프로덕션의 `platform:super_admin` 보유 계정이 **2개**라고 기록한다.
즉 floor 를 좁히면 **주 운영자 계정이 관리자 사이트에서 잠긴다.**
사용자 지시("`role_assignments` 실제 보유자를 확인하여 잠기지 않도록 한다")대로 **보류가 정답이다** → §6 #1.

> §2-2 로 **플랫폼 관리자 전용 화면은 이미 플랫폼 관리자만 볼 수 있다.**
> 서비스 운영자가 floor 를 통과해도 쓸 수 없는 메뉴가 더 이상 보이지 않는다.

### 2-4. 역할별 사이드바 (이 변경의 실제 효과)

`menuPermissions` 게이트 6건 때문에 **보이는 항목이 역할에 따라 달라진다.**

| 계정 유형 | 보이는 최상위·leaf | 비고 |
|---|---:|---|
| `platform:super_admin` (`renariver21`) | **22** | 전체 |
| 서비스 접두 역할만 (`sohae2100`) | **16** | `RBAC Role Assignments` · `Service Operators` · `포인트 운영` · `플랫폼 HUB` · `운영 상태` · `Browse Apps` **6건 숨김** |

숨겨진 6건은 백엔드가 `platform:super_admin` 만 허용하므로 **이전에도 403 이었다** —
기능 손실 0, 데드 진입점 6 제거다. 다만 주 운영자 계정의 사이드바가 눈에 띄게 줄어드므로 기록해 둔다.

> 프로덕션 사이드바 22항목 전수 검증에는 `renariver21@gmail.com` 이 필요하다(§5).

---

## 3. 변경 내역

### 3-1. MUST_FIX 6건

| # | 결함 | 처리 |
|:-:|---|---|
| 1 | 플랫폼 HUB 의 KPA 카드가 **한 번도 동작한 적 없음** — `FROM kpa_member`/`kpa_application`(단수), 실제는 `kpa_members`/`kpa_applications`. 첫 쿼리 throw → catch → 영구 `error:'unavailable'`. **HTTP 200 이라 기존 "2xx 확인" 검증을 통과** | 테이블명 교정 + 검증 함정을 주석으로 명문화 |
| 2 | `/operators` 프런트/백엔드 가드 불일치 (진입 후 전 API 403) | 백엔드 경계로 정렬 + alignment 테스트에 `core-operators` 등재 |
| 3 | CMS 4개 메뉴 백엔드 부재 (프로덕션 404) | 메뉴·라우트 13·화면 5디렉터리·registry 10·`lib/cms.ts` dead 메서드 제거 |
| 4 | Forum Dashboard 데드링크 2건 (`/forum/users`·`/forum/moderation`) | Forum 관리자 화면 전체 제거로 해소 |
| 5 | 무인증 공개 진단 라우트 4건 프로덕션 등록 (§8 규칙 2·3 위반) | 비프로덕션 한정 게이트 — **프로덕션 번들에서 경로 문자열 0건 실측** |
| 6 | Ops Metrics 응답 다수가 하드코딩 0 | CMS 그룹 `운영 상태` 로 재배치 + 근거 주석. 응답 shape 은 소비 계약 유지를 위해 불변 |

### 3-2. 메뉴 재편 (35 → 22 clickable)

```text
Overview                     /admin
플랫폼 HUB                    /admin/platform/hub
Core                         RBAC Role Assignments · Service Operators · 포인트 운영 · Platform Settings
O4O 상품 DB                   현황 · 공공데이터 후보 · 상품 등록 요청 · 기본 상품 ·
                             설명서 검수(신규 노출) · 이미지 상태(신규 노출) · 데이터 정비
Content                      Overview · Assets · 정책 안내 · Analytics
CMS                          Contents · Slots · 운영 상태
AppStore                     Browse Apps
사이니지 콘텐츠 조회           /admin/digital-signage/content
```

제거: `Forum`(3) · `Yaksa (KPA)`(4) · `CMS` 4항목 · `Content > Collections` ·
`매장 네트워크` · `오프라인 매장` · `Content Manager` · `Insights`/`Services` 구분선 2

### 3-3. 라우트·코드 제거 (파일 103 삭제)

| 대상 | 규모 | 근거 |
|---|---|---|
| CMS V2 (cpts/fields/views/pages/designer) | 라우트 13 · 화면 5디렉터리 · registry 10 · `lib/cms.ts` ~350줄 | 백엔드 부재 · **프로덕션 404 실측** |
| `/admin/cpt-acf/*` | 라우트 1(하위 16) · 스텁 9 | 전부 14줄 "Temporarily disabled" |
| `/monitoring/*` | 라우트 3 · 995줄 | `/api/v1/monitoring/*` 미마운트 · **404 실측** |
| `/acf/*`, `/acf/groups` | 라우트 2 · 379줄 | `/admin/custom-field-groups` 백엔드 **0 refs** |
| `/analytics/*` | 라우트 1 · 21줄 | "개발 중" 플레이스홀더 |
| Forum 관리자 | 라우트 6 · `pages/forum` | 서비스 operator 가 정본 |
| `/operator/approvals` | 라우트 1 · 509줄 | KPA operator 콘솔과 **동일 경로·동일 백엔드** |
| 매장 네트워크·오프라인 매장 | 라우트 2 · 1,063줄 | Cosmetics 단일 서비스 집계 |
| Content Manager | 라우트 1 · 748줄+types | API 호출 0건 목업 |
| `/content/collections` | 라우트 1 · 111줄 | 기능 미구현 명시 |
| signage `RemovedRouteRedirect` | 화면 9 | 이전 완료 안내 잔재 |
| CMS V2 debug 화면 | 라우트 3 · 화면 3 | 404 백엔드 대상 디버그 |

### 3-4. 보존 (삭제하지 않음 — 사용자 보충 지시)

- `checkout_orders` — 공급자→매장 **B2B 주문 정본** (CLAUDE.md Priority Chain 3-A)
- `physical_stores` · `physical_store_links` + 백엔드 `/api/v1/admin/{store-network,physical-stores}`
- `/api/v1/cpt/*` (41 endpoint) · `/cpt-engine/*` 프런트 · CPT entity·table
- `cms_cpts` · `cms_fields` · `cms_views` · `cms_pages` 테이블 및 `modules/cms/entities`
- `@o4o/forum-core` 패키지(admin-ui 포함) · 백엔드 `/api/v1/forum`·`/api/v1/kpa/forum`
- `ViewComponentRegistry` 의 forum view 4건 (manifest 동적 라우팅용, 사이드바와 별개)
- KPA 화면 3건 — `/operator/hub-contents` · `/operator/kpa/snapshots` · `/operator/kpa/force-assets`
  **메뉴만 제거, 라우트·화면 보존.** KPA operator 콘솔에 대응 화면이 없고 이번 WO 는 신규 화면을
  만들지 않는다. `Force Asset 관리` 는 `kpa:admin` 보유자가 실제로 사용 가능한 기능이다 → 별도 WO 이관 판정.

---

## 4. 검증 결과

| 게이트 | 결과 |
|---|---|
| `tsc --noEmit` (admin-dashboard) | **exit 0** |
| `eslint` (변경 파일 전체) | **0 error** / 7 warning (전부 기존 · 신규 0) |
| `vitest run src/tests/` (admin-dashboard) | **218 pass / 12 files** |
| `vite build` (admin-dashboard) | **성공** (36.8s) |
| `jest` — admin 소스 단언 api-server spec 10종 | **378 pass** |
| 프로덕션 번들 진단 라우트 문자열 | `__debug__/auth-bootstrap` **0** · `auth-inspector` **0** |
| 프로덕션 번들 test 라우트 문자열 | `admin/test/seed-presets` · `ui-showcase` · `admin/test/auth-debug` · `test/menu-debug` **각 0** |

실행한 api-server spec: `channels-stack-retirement` · `cms-servicekey-alias-ssot-closure` ·
`auth-runtime-and-legacy-package-final-closure` · `legacy-followup-auth-notification-catalog-final-closure` ·
`app-management-runtime-residue-retirement` · `b2b-supplier-to-store-order-canonical-contract` ·
`ecommerce-core-and-commerce-residue-retirement` · `legacy-wordpress-block-editor-retirement` ·
`final-code-only-retirement-closure` · `main-site-residual-orphan-axis-retirement`

> `channels-stack-retirement.spec.ts` 는 `admin-menu.static.tsx` 와 `content.routes.tsx` 를
> raw source 로 단언한다(둘 다 이번에 재작성) — 통과 확인됨.

### 갱신한 테스트

- `admin-menu-route-backend-alignment.test.ts` — `PLATFORM_SCOPED_SCREENS` 에 `core-operators` 추가
  (메뉴 게이트 · route 선언 · 백엔드 상수 3계층 동시 고정). 14 → **16 tests**.
- `admin-menu-batch2.test.ts` — 제거된 KPA 항목 단언을 **역방향 회귀 가드**로 전환
  (`/operator/hub-contents`·`/operator/approvals` 부재 · `yaksa` 그룹 부재 · `/operator/kpa/*` 0건).
  배치 2의 유효 계약(`포인트 운영`)은 유지. **11 tests pass**.

---

## 5. 프로덕션 배포 검증

### 5-0. 배포 경로 — CI 취소로 두 커밋으로 갈렸다

| 워크플로 | commit | 결과 |
|---|---|---|
| Deploy Admin Dashboard | `61f772d0c` | ✅ **success** — revision `o4o-admin-dashboard-01230-x9t` (2026-09-09 12:16 UTC) |
| Deploy API Server | `61f772d0c` | ⚠️ **cancelled** — 22초 뒤 다른 세션 커밋 `c4cb8b230` 이 런을 대체 |
| Deploy API Server | `c4cb8b230` | 진행 → 이 런이 `platform-hub` 수정을 배포한다 (내 커밋이 조상) |
| CI Pipeline / CodeQL | `61f772d0c` | cancelled → `c4cb8b230` 에서 재실행 |

> 프런트(메뉴·라우트) 변경은 `61f772d0c` 런으로 이미 라이브다.
> 백엔드(`platform-hub` 테이블명) 변경은 `c4cb8b230` 의 API 배포에 포함된다.

### 5-1. 프런트엔드 브라우저 smoke — **PASS** (2026-09-09, `renariver21@gmail.com`)

Playwright 실계정 로그인 후 사이드바 클릭 기반(딥링크 hard-nav 금지 관례 준수).

| 항목 | 결과 |
|---|---|
| 로그인 랜딩 | `/home` |
| 사이드바 링크 | **22** (+ 그룹 헤더 5 · 로고 1) — 설계값과 일치 |
| 제거 확인 (href) | `/forum` · `/operator/hub-contents` · `/operator/approvals` · `/operator/kpa/*` · `/admin/cms/{cpts,fields,views,pages}` · `/admin/store-network` · `/admin/physical-stores` · `/admin/service-content-manager` · `/content/collections` — **12/12 부재** |
| 제거 확인 (label) | `매장 네트워크` · `Content Manager` · `Ops Metrics` — **3/3 부재** |
| 이름 정렬 확인 | `운영 상태` · `사이니지 콘텐츠 조회` · `정책 안내` · `설명서 검수` · `이미지 상태` — **5/5 존재** |
| 진단 라우트 | `/__debug__/auth-bootstrap` · `/debug/auth` · `/auth-inspector` · `/admin/test/seed-presets` → **전부 `/admin` 리다이렉트** |
| 제거 라우트 직접 접근 | `/admin/cms/cpts` · `/admin/store-network` · `/admin/service-content-manager` · `/forum` · `/monitoring` → **전부 `/admin` 리다이렉트** |
| 콘솔 오류 | **0** |
| API 4xx/5xx | **0** |

실측된 사이드바 22항목:

```text
Overview /admin · 플랫폼 HUB /admin/platform/hub
Core           RBAC Role Assignments /users · Service Operators /operators ·
               포인트 운영 /operator/points · Platform Settings /settings
O4O 상품 DB     현황 · 공공데이터 후보 · 상품 등록 요청 · 기본 상품 ·
               설명서 검수 · 이미지 상태 · 데이터 정비   (7 = 화면 내 탭과 1:1)
Content        Overview · Assets · 정책 안내 · Analytics
CMS            Contents · Slots · 운영 상태
AppStore       Browse Apps
사이니지 콘텐츠 조회 /admin/digital-signage/content
```

### 5-2. 플랫폼 HUB KPA 카드 — BEFORE 실측 (MUST_FIX #1)

API 배포 **전** 프로덕션 `GET /api/v1/platform/hub/summary` (200):

```text
BEFORE  globalRisk = partial
BEFORE  kpa     → error=unavailable  riskLevel=unknown  members=None  applications=None
BEFORE  neture  → error=None         riskLevel=healthy
```

진단(§3-1 #1)과 정확히 일치한다 — **HTTP 200 인데 KPA 카드만 영구 `unavailable`** 이었고,
그 때문에 `globalRisk` 가 항상 `partial` 로 고정됐다.

⚠ **판정 기준**: status code 가 아니라 **카드별 `error` 필드**다. AFTER 에서
`kpa.error == null` + `members`/`applications`/`forum` 수치 존재 + `globalRisk != 'partial'` 을 확인한다.

### 5-3. 1차 AFTER — 절반만 고쳐졌다 (원인 추가 규명)

`c4cb8b230` Deploy API Server 성공(2026-09-09 12:24 UTC · revision `o4o-core-api-03570-rqk`) 후 재측정:

```text
AFTER-1  globalRisk = partial
AFTER-1  kpa     → error=unavailable  risk=unknown      ← 여전히 실패
AFTER-1  neture  → error=None  risk=healthy  suppliers={total:3,active:2}
```

**status code 만으로는 알 수 없었다.** Cloud Run 로그(`[Platform Hub] KPA summary failed`)가 원인을 특정했다:

| 시각(UTC) | 로그 | 해석 |
|---|---|---|
| 12:19 · 12:20 (배포 전) | `relation "kpa_member" does not exist` | 최초 진단(§3-1 #1)이 정확했음을 실증 |
| 12:24 (배포 후) | `relation "kpa_applications" does not exist` | 테이블명 교정으로 **첫 쿼리는 통과**. 그러나 두 번째 테이블이 프로덕션에 없다 |

즉 결함은 **2중**이었다. 두 번째는 이름 문제가 아니라 **스키마 현실** 문제다:

- `kpa_applications` 는 `WO-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1` 에서
  **entity·테이블이 의도적으로 은퇴**했다 (판정: 0행 · 소비처 0 —
  `apps/api-server/src/routes/kpa/entities/index.ts:7` 에 명시).
- `platform-hub.controller.ts` 가 그 은퇴한 축을 계속 조회하던 **유일한 잔존 호출부**였다.
- canonical 승인 대기 축은 이미 `kpa_members.status='pending'` 이며
  (`WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1` 이 그렇게 재정합, `operator-summary.controller.ts` 도 동일),
  `getKpaSummary` 는 그 값을 **이미 `pendingMembers` 로 조회하고 있었다** → 해당 쿼리는 중복이자 파괴 요인.

**2차 수정**: `kpa_applications` 쿼리와 `applications` 응답 키 제거, risk 를 가입 대기 회원 단일 기준으로 정렬.
action queue 의 중복 항목(같은 `actionKey: 'kpa.process.pending_approvals'`)도 제거.
프런트 `PlatformHubPage` 의 `신청 N건` 라벨은 **항상 0** 을 보여 실제 대기 건수를 오해하게 만들므로
`커뮤니티 글 N건` 으로 교체했다(표시 축을 실제 데이터에 맞춤).

> **재발 방지 교훈**: 이 화면 계열은 서비스별 수집 실패를 카드 단위로 흡수해 **항상 HTTP 200** 이다.
> 검증은 status code 가 아니라 ① 카드별 `error` 필드 ② `[Platform Hub] * failed` 로그 로 한다.

### 5-4. 2차 AFTER 검증 — 대기 (§6 #11)

2차 수정 배포 후 동일 요청으로 `kpa.error == null` · `members`/`forum` 수치 · `globalRisk != 'partial'` 확인.

---

## 6. 미완 · 후속 판정 대상

| # | 항목 | 사유 |
|:-:|---|---|
| 1 | **`App.tsx` 진입 floor 축소** | **주 운영자 계정(`sohae2100`)이 `platform:super_admin` 을 갖지 않아** 지금 좁히면 관리자 사이트에서 잠긴다(§2-3). 선행 조건: ① `role_assignments` 실 보유자 전수 확인 ② legacy 역할 보유자 정리 방침. 프로덕션 DB `o4o_api` 자격정보가 `apps/api-server/.env` 와 불일치(터널 성공, password authentication failed) → **자격정보 = CLAUDE.md 중지 조건** |
| 2 | KPA 화면 3건 이관 | 대응 operator 화면 부재. 신규 화면 생성은 이번 WO 범위 밖 |
| 3 | `/api/v1/cpt/*` · CPT entity·table 판정 | 외부 소비처 전수조사 선행 |
| 4 | `cms_*` 테이블·entity 삭제 판정 | 데이터 존재 여부 확인 선행(DB 접근 필요) |
| 5 | `physical_stores` 소유 주체 | 데이터 관계 조사 선행 |
| 6 | `/home` · `/dashboard` 대시보드 3중 통합 | 화면 내용 비교 선행 |
| 7 | `/partnerops/*` 진입점 판단 | 30일 호출 8건이 **전부 404** 였다(백엔드 부재) → IR §4 의 "실사용" 판정을 **정정**한다 |
| 8 | `/preview/:slug` (`ViewPreview`) | `/cms/public/*` 백엔드가 없어 동작 여부 미확인 |
| 9 | "운영 및 보안" 그룹 신설 | 대응 백엔드가 없다(`/api/v1/monitoring/*` 미마운트). 신설 시 별도 WO |
| 10 | 관리자 정보구조 baseline 문서 신설 | 현행 기준 문서가 저장소에 없다(§7) |

> **#7 정정**: IR §4 는 `/api/v1/partnerops/*` 8건을 "메뉴 없음 · 실사용"으로 기록했으나,
> 이후 status code 확인 결과 **8건 전부 404** 였다. `/partnerops/*` 는 실사용이 아니라
> 백엔드 부재 상태이며, 진입점 복구가 아니라 은퇴 판정 대상이다.

---

## 7. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 1건 / 별도 WO 제안 1건
```

1. **링크 수정 1건** — `admin-menu.static.tsx:9` 가 참조한 `docs/architecture/admin-goal-state-definition.md`
   는 존재하지 않는 문서였다. 해당 파일을 이번에 재작성하면서 **깨진 참조를 제거하고**
   조사 정본(IR) 경로로 교체했다(§16-3 2 기계적 교정).
2. **별도 WO 제안 1건** — 현행 관리자 정보구조 **기준 문서(baseline)가 저장소에 없다.**
   관련 문서는 전부 `docs/archive/**`(IA 감사 3건) 또는 `docs/checks/**`(부분 정비 기록)이다.
   §16-4 에 따라 신규 baseline 문서 생성은 인라인 금지 → 별도 WO 로 제안한다(§6 #10).

---

## 8. Git

| 항목 | 값 |
|---|---|
| 1단계 IR | `481ecb0c3` |
| 3단계 구현 | `61f772d0c` (파일 120: 수정 17 · 삭제 103) |
| 브랜치 | `main` 직접 (CLAUDE.md §1) |
| stage 방식 | path-specific · `check-staged-scope.mjs` 로 120건 범위 확인 |
