# IR-O4O-ADMIN-FRONTEND-IA-WORKFLOW-USABILITY-BASELINE-V1

> **성격**: 조사 전용 IR — 코드·UI·API·DB·권한·migration·배포 **변경 0건**
> **목적**: `admin.neture.co.kr` 관리자 프런트엔드의 IA·업무동선 기준선 확보 (정비 WO 분할용)
> **일자**: 2026-08-01

---

## 1. 조사 기준

| 항목 | 값 |
|---|---|
| repo | `git@github.com:Renagang21/o4o-platform.git` |
| branch | `main` |
| 시작 HEAD | `5578a723df5f44616efbc2dbb468c4560bd1596c` |
| `HEAD...origin/main` | `0 0` (동기화됨) |
| 조사 대상 앱 | **`apps/admin-dashboard`** |
| 배포 확인 | `.github/workflows/deploy-admin.yml:49` → `app_origin=https://admin.neture.co.kr` (트리거 경로 `apps/admin-dashboard/**`) |
| 조사 방법 | 코드 전수(rg/정적 매핑 스크립트) + 프로덕션 read-only 브라우저 확인 |
| 브라우저 확인 | ✅ platform super_admin(`renariver21`) 로그인, **읽기·이동만** |
| 코드 변경 | **0** |
| 운영 데이터 변경 | **0** |
| 배포 | **없음** |

작업 트리에 병렬 세션의 OTC/HFF 산출물이 있었으나 본 IR 산출물 경로와 분리되어 미접촉.
조사 전용이므로 전체 build·`pnpm install` 미실행.

**중지 조건 해당 없음** — 관리자 앱은 단일(`apps/admin-dashboard`)이고 배포 대상이 워크플로로 확정된다.
메뉴는 정적 트리가 유일 소스이며(동적 메뉴 API는 stub), RBAC F9 대상은 §7 에서 `HOLD` 로만 기록했다.

---

## 2. 현재 구조 요약 (실측)

| 지표 | 값 |
|---|---:|
| 메뉴 그룹/구분자 | 11 |
| 메뉴 노드 총계 | 52 |
| **메뉴 항목(path 보유)** | **41** |
| route 정의 파일 | 13 |
| **route 선언 총계** | **223** (중복 path 0) |
| **메뉴에서 도달 불가한 route(top-level)** | **137** (상세·파라미터 포함 시 192) |
| 메뉴 항목 중 route 미연결 | **0** |
| 메뉴 가시성 게이트 보유 항목 | **2 / 41** |
| redirect 전용 route | 9 (o4o-product-db 8 · yaksa 1) |
| test/debug route | **17 (프로덕션 무조건 mount)** |

메뉴 소스는 `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` 단일이며,
브라우저 렌더 결과가 정적 트리와 **정확히 일치**함을 확인했다(동적 메뉴 없음).

---

## 3. 현재 IA 전체 트리

```text
admin.neture.co.kr
├─ Overview                          → /admin                                  [모의화면]
├─ Core
│  ├─ RBAC Role Assignments          → /users                                  [권한 조건: super_admin]
│  ├─ Service Operators              → /operators                              [정상]
│  ├─ Membership                     → /admin/membership/dashboard             [정상]
│  ├─ Members                        → /admin/membership/members               [정상]
│  ├─ Verifications                  → /admin/membership/verifications         [정상]
│  └─ Platform Settings              → /settings                               [정상]
├─ O4O 상품 DB
│  ├─ 현황                            → /admin/o4o-product-db/overview          [정상]
│  ├─ 공공데이터 후보                  → /admin/o4o-product-db/candidates         [정상]
│  ├─ 상품 등록 요청                   → /admin/o4o-product-db/store-requests     [정상]
│  ├─ 기본 상품                        → /admin/o4o-product-db/masters           [정상]
│  └─ 데이터 정비                      → /admin/o4o-product-db/maintenance       [정상]
├─ Content
│  ├─ Overview / Assets / Collections / Policies / Analytics                   [정상]
├─ CMS
│  ├─ Contents / Slots / Channels / Channel Ops / Post Types / Fields / Views / Pages  [정상]
├─ AppStore
│  └─ Browse Apps                    → /apps/store                             [정상]
├─ Forum
│  ├─ Dashboard / Boards / Categories                                          [정상]
├─ ── Services ──────────────────────────────────────── (구분자)
├─ Yaksa (KPA)
│  ├─ Service Dashboard              → /admin/yaksa-hub                        [정상]
│  ├─ 공급 자산 조회                   → /operator/kpa/snapshots                  [정상]
│  └─ Force Asset 관리                → /operator/kpa/force-assets               [정상]
├─ Digital Signage
│  ├─ Operations / Displays / Media Sources / Schedules                        [정상]
├─ ── Insights ──────────────────────────────────────── (구분자)
├─ Ops Metrics                       → /admin/ops/metrics                      [정상]
├─ Content Manager                   → /admin/service-content-manager          [정상]
└─ Reports
   ├─ Overview / Submissions / Templates                                       [정상]
```

> **주의(조사 중 자체 정정)**: 초기 정적 매핑에서 `O4O 상품 DB` 5개 항목이 "route 없음" 으로 잡혔으나,
> 해당 라우트가 `/admin/o4o-product-db` **부모 아래 상대경로 중첩**(`overview`, `masters` …)이라
> 정상 해석되는 **오탐**이었다. 최종 집계에서 제외했다.

---

## 4. 메뉴·라우트·화면·API 매트릭스 (요약)

메뉴 41개는 **전부 라우트에 연결**되어 있고 브라우저에서 렌더된다. 아래는 그룹 단위 요약이다.

| 메뉴 그룹 | 항목수 | 라우트 파일 | 권한/가드 | 진입 | 판정 |
|---|---:|---|---|:--:|---|
| Overview | 1 | `dashboard.routes` | 없음 | ✅ | **FIX** (§5-1) |
| Core | 6 | `users/platform.routes` | `core-users` 만 super_admin | ✅ | KEEP |
| O4O 상품 DB | 5 | `o4o-product-db.routes` | 없음 | ✅ | KEEP |
| Content | 5 | `content.routes` | 없음 | ✅ | KEEP |
| CMS | 8 | `content.routes` | 없음 | ✅ | KEEP / MERGE 검토(§5-4) |
| AppStore | 1 | `appearance.routes` | 없음 | ✅ | CONNECT(§5-3) |
| Forum | 3 | `apps.routes` | `forum:read` | ✅ | KEEP |
| Yaksa (KPA) | 3 | `yaksa.routes` | 없음 | ✅ | CONNECT(§5-3) |
| Digital Signage | 4 | `platform.routes` | 없음 | ✅ | KEEP |
| Ops Metrics / Content Manager | 2 | `platform.routes` | 없음 | ✅ | KEEP |
| Reports | 3 | `yaksa.routes` | 없음 | ✅ | KEEP |

### 메뉴가 없는 라우트 (top-level 137건) — 파일별 분포

| 파일 | 건수 | 대표 경로 |
|---|---:|---|
| `platform.routes` | 17 | `/admin/services`, `/operator/approvals`, `/admin/store-network`, `/admin/physical-stores`, `/admin/platform/hub`, `/monitoring`, `/operator/points`, `/kpa/content-workspace` |
| `test.routes` | 17 | `/admin/test/*`, `/ui-showcase`, `/gutenberg` |
| `yaksa.routes` | 15 | `/admin/yaksa/members`, `/admin/yaksa/accounting/*`, `/admin/yaksa/fees`, `/admin/yaksa/officers` |
| `content.routes` | 14 | `/posts`, `/categories`, `/acf/groups`, `/cpt-engine/presets/*` |
| `o4o-product-db.routes` | 14 | 8건은 legacy redirect, `image-quality`, `supplier-store-descriptions` 등 |
| `lms-marketing.routes` | 12 | `/store/qr`, `/store/pop`, `/store/tablet/settings`, `/admin/marketing/*` |
| `public.routes` | 12 | `/login`, `/__debug__/*`, `/auth-inspector` (일부는 정상적으로 메뉴 대상 아님) |
| `dashboard.routes` | 10 | `/dashboard`, `/home`, `/dashboard/seller/*`, `/dashboard/supplier/*` |
| `appearance.routes` | 9 | `/appearance/*`, `/tools`, `/reusable-blocks`, `/admin/appstore/installed` |
| `apps.routes` | 7 | `/pharmacy-ai-insight`, `/cgm-pharmacist/*`, `/yaksa/communities` |
| `users.routes` | 7 | `/admin/role-applications`, `/admin/enrollments`, `/active-users` |
| `commerce.routes` | 3 | **`/admin/orders`, `/admin/dropshipping/settlements`, `/admin/dropshipping/order-relays`** |

---

## 5. 문제 목록

| ID | 영역 | 현재 상태 | 문제 | 운영 영향 | 근거 | 판정 | 우선순위 |
|---|---|---|---|---|---|---|---|
| **A-1** | 대시보드 | `/admin` = `AdminDashboard.tsx` | **관리자 첫 화면이 모의(mock) 템플릿**. 카드·빠른작업 링크 **17/17 전부 존재하지 않는 라우트**(`/products` `/orders` `/vendors` `/activity-log` `/reports` `/analytics` `/reviews` `/calendar` `/system/monitoring` `/ecommerce/*` `/posts/new` `/comments` `/content/posts` `/content/pages` …). 수치도 하드코딩(`₩12,345,000`, `WordPress 5.8`, `김고객님이 … 댓글`) | 운영자가 매일 처음 보는 화면이 **업무 시작점 역할을 전혀 못 함**. 클릭 시 빈 화면 | 브라우저 실측 + route 대조 0건 | **FIX** | **P1** |
| **A-2** | 대시보드 | `/home` = `AdminHome.tsx` | 동일 계열 모의 화면(`WordPress 6.4.2`, `24 글 8 페이지 156 댓글`). 메뉴에 없음 | 중복 모의 화면 | 코드+브라우저 | REMOVE_CANDIDATE | P2 |
| **B-1** | 주문·정산 | `/admin/orders`, `/admin/dropshipping/settlements`, `/admin/dropshipping/order-relays` | **주문·정산 업무 전체가 메뉴에 없음**. 직접 URL 로만 진입 | 주문/정산이 관리자 IA 에 존재하지 않음 | `commerce.routes` 3건 전부 menu-less | **CONNECT** | **P1** |
| **B-2** | 승인 업무 | `/operator/approvals` | 승인 대기 업무 진입점이 메뉴에 없음 | "승인 대상이 어디 있는지" 알 수 없음 | `platform.routes` | **CONNECT** | **P1** |
| **B-3** | 서비스·매장 | `/admin/services`, `/admin/store-network`, `/admin/physical-stores`, `/admin/platform/hub` | 서비스·매장 관리 진입점 부재 | 매장/조직 업무 동선 단절 | `platform.routes` | CONNECT | P1 |
| **B-4** | 매장 활용 자료 | `/store/qr`, `/store/pop`, `/store/tablet/settings`, `/store-content` | QR·POP·태블릿 자료 업무가 메뉴에 없음 | 매장 실행자산 업무 진입 불가 | `lms-marketing.routes` | CONNECT | P1 |
| **B-5** | KPA 상세업무 | `/admin/yaksa/members`, `/admin/yaksa/accounting/*`, `/fees`, `/officers`, `/education` | Yaksa 메뉴는 3개(Dashboard·스냅샷·Force Asset)뿐이고 실제 회원·회계·회비 업무 15건이 menu-less | KPA 운영 업무 대부분이 숨어 있음 | `yaksa.routes` | CONNECT | P1 |
| **C-1** | 권한 | `menuPermissions` 2건뿐 | **41개 중 39개가 메뉴 게이트 없음**("설정 없음 = 허용"). 실제 통제는 라우트 가드/백엔드에만 존재 | 역할별로 보이면 안 되는 메뉴가 모두 보임 → 클릭 후 거부되는 경험 | `config/rolePermissions.ts:15-70` | **HOLD**(정책) | P2 |
| **C-2** | 권한 | RBAC UPDATE 2건 | F9 Freeze 대상 | — | 선행 감사 | **HOLD** | HOLD |
| **D-1** | 개발 잔재 | `test.routes.tsx` 17건 | `App.tsx:203` 에서 **환경 분기 없이 무조건 mount** → 프로덕션에 `/admin/test/*`, `/ui-showcase`, `/gutenberg` 노출 | 운영 환경에 디버그 화면 상주 | `App.tsx:65,203` (NODE_ENV 분기 0건) | REVIEW | P2 |
| **D-2** | legacy | `o4o-product-db` redirect 8건 | `review`, `drug-description-drafts`, `description-dashboard/-review-queue/-status` → `../masters` | 과거 통합 잔재(의도된 호환) | `o4o-product-db.routes:61-67` | KEEP(문서화) | P3 |
| **E-1** | 명명 일관성 | 메뉴 언어 혼재 | `Core / Content / CMS / AppStore / Reports`(영문) vs `O4O 상품 DB / 현황 / 공공데이터 후보`(국문) 혼재. `RBAC Role Assignments` 등 내부 용어 노출 | 운영자 이해도 저하 | 메뉴 트리 | RENAME | P2 |
| **E-2** | 그룹 분류 | Content vs CMS 분리 | `Content`(Assets/Collections/Policies/Analytics)와 `CMS`(Contents/Slots/Pages/Post Types…)의 경계가 운영자 관점에서 불명확 | 콘텐츠 업무 시 두 그룹 왕복 | 메뉴 트리 | MERGE 검토 | P2 |
| **F-1** | 화면 상태 | menu-less 라우트 다수가 빈 화면 | 표본 18건 중 `/admin/dropshipping/settlements` `/admin/store-network` `/admin/physical-stores` `/admin/dashboard/operations` `/posts` 가 not-found 성 표시, 다수가 본문 거의 비어 있고 콘솔 오류 1~3건 | 진입해도 업무 불가 | 브라우저 표본 실측 | REVIEW | P2 |

---

## 6. 업무 흐름 지도

| 업무 영역 | 시작 메뉴 | 상태 |
|---|---|---|
| 상품 데이터베이스 | O4O 상품 DB → 현황/후보/등록요청/기본상품/정비 | **동선 확보** — 이번 조사에서 유일하게 목록→상세→처리 흐름이 메뉴로 완결되는 영역 |
| 회원·조직 | Core → Membership/Members/Verifications | 부분 확보. 조직·매장(`/admin/store-network`, `/admin/physical-stores`)은 menu-less |
| 공급자 관리 | **없음** | 관리자 메뉴에 공급자 전용 진입점 미확인 |
| 공급 상품 관리 | **없음** | Neture 공급 Offer 관리 화면이 admin 메뉴에 미확인 |
| 주문·거래·정산 | **없음** | `/admin/orders`, `/admin/dropshipping/settlements` 존재하나 menu-less (B-1) |
| 콘텐츠 | Content + CMS (2그룹 분산) | 진입 가능하나 경계 불명확 (E-2) |
| 매장 활용 자료(QR·POP·태블릿) | **없음** | 라우트만 존재 (B-4) |
| 커뮤니티·포럼 | Forum → Dashboard/Boards/Categories | 확보. 단 글쓰기(`/forum/posts/new`) 진입 링크는 메뉴에 없음 |
| 승인·검토 | **없음** | `/operator/approvals` menu-less (B-2) |
| 서비스 관리 | **없음** | `/admin/services` menu-less (B-3) |
| 디지털 사이니지 | Digital Signage → 4항목 | 확보 |
| 설정·권한 | Core → Platform Settings / RBAC | 확보 |
| 로그·통계 | Ops Metrics / Reports | 확보 |

---

## 7. 권장 IA 초안 (기능 변경 없음 — 위치·명칭·연결만)

| 현재 위치 | 현재 메뉴 | 권장 위치 | 권장 메뉴 | 조치 | 이유 |
|---|---|---|---|---|---|
| (없음) | `/admin/orders` 외 2 | 신규 그룹 **거래** | 주문 / 정산 / 주문 릴레이 | CONNECT | 주문·정산 업무가 IA 에 없음 (B-1) |
| (없음) | `/operator/approvals` | **Overview 하단 또는 Core** | 승인 대기 | CONNECT | 매일 확인 업무 (B-2) |
| (없음) | `/admin/services`, `/admin/store-network`, `/admin/physical-stores` | 신규 그룹 **서비스·매장** | 서비스 / 매장 네트워크 / 물리 매장 | CONNECT | B-3 |
| (없음) | `/store/qr`, `/store/pop`, `/store/tablet/settings` | 신규 그룹 **매장 자료** | QR / POP / 태블릿 | CONNECT | B-4 |
| (없음) | `/admin/yaksa/members` 외 14 | 기존 **Yaksa (KPA)** 하위 | 회원 / 회계 / 회비 / 임원 | CONNECT | B-5 — 기존 그룹에 편입만 |
| Overview | `/admin` 모의 대시보드 | Overview | 실제 지표 + pending 진입 | FIX | A-1 |
| Core | `RBAC Role Assignments` | Core | `역할 관리` | RENAME | 내부 용어 (E-1) |
| Content + CMS | 2그룹 | 1그룹 검토 | 콘텐츠 | MERGE 검토 | E-2 |
| (라우트) | `test.routes` 17건 | — | — | HIDE(환경 분기) | D-1 |

> 권장안은 **기존 화면을 그대로 두고 진입점만 연결**하는 것을 원칙으로 했다. 새 기능 제안 없음.

---

## 8. 후속 WO 후보 (확정 아님)

```text
후보 WO: ADMIN-DASHBOARD-ENTRYPOINT-FIX
목표: /admin 모의 대시보드를 실제 업무 시작점으로 교정 (죽은 링크 17건 제거/연결)
대상: pages/AdminDashboard.tsx, (검토) AdminHome.tsx
예상 변경 범위: 프런트 1~2 파일
선행 조건: 표시할 실제 지표 API 확정
위험: 낮음 (읽기 화면)
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-MENU-CONNECT-ORPHAN-ROUTES
목표: menu-less 업무 라우트(주문·정산·승인·서비스·매장·매장자료·KPA 상세)를 메뉴에 연결
대상: admin-menu.static.tsx (+ 필요 시 rolePermissions)
예상 변경 범위: 메뉴 정의 1파일
선행 조건: 각 화면의 실제 동작 여부 개별 확인(F-1)
위험: 중 — 동작하지 않는 화면을 노출하면 오히려 혼란
독립 실행 가능: 부분 (F-1 검증 후)
```

```text
후보 WO: ADMIN-ORPHAN-ROUTE-TRIAGE
목표: menu-less 137건을 활성/legacy/미완성/삭제후보로 분류
대상: 조사 전용 (코드 변경 없음)
예상 변경 범위: 문서
선행 조건: 없음
위험: 없음
독립 실행 가능: 예  ← ADMIN-MENU-CONNECT 의 선행
```

```text
후보 WO: ADMIN-TEST-ROUTE-ENV-GATE
목표: test.routes 17건을 프로덕션 빌드에서 제외
대상: App.tsx, test.routes.tsx
예상 변경 범위: 조건부 mount 1곳
선행 조건: 운영 중 사용 여부 확인
위험: 낮음
독립 실행 가능: 예
```

```text
후보 WO: ADMIN-MENU-NAMING-AND-GROUPING
목표: 메뉴 언어 혼재·내부 용어·Content/CMS 경계 정비
대상: admin-menu.static.tsx
예상 조건: 위 CONNECT WO 이후 (구조 확정 후 명칭 정비)
위험: 낮음
독립 실행 가능: 예 (단 순서상 후행 권장)
```

```text
후보 WO: ADMIN-MENU-VISIBILITY-POLICY  [HOLD]
목표: 39/41 무게이트 메뉴의 역할별 가시성 정책 수립
선행 조건: 역할 정책 결정 — RBAC F9 Freeze 와 분리 확인 필요
위험: 높음 (권한 축소는 업무 차단 위험)
독립 실행 가능: 아니오
```

---

## 9. 미검증 사항

- **쓰기 동작 전면 미검증** — 생성·수정·삭제·승인·상태변경을 일절 실행하지 않았다. 각 화면의 Action 성공 여부, 저장 후 이동, 성공/실패 알림은 **코드 기준 추정**이며 실측이 아니다.
- **menu-less 137건 중 18건만 브라우저 표본 확인**. 나머지 119건의 실제 동작·빈 화면 여부는 미확인 → 후속 `ADMIN-ORPHAN-ROUTE-TRIAGE` 필요.
- **역할별 메뉴 차이 미확인** — platform super_admin 1개 계정으로만 확인했다. 서비스 운영자·비권한 계정에서의 메뉴 노출 차이는 확인하지 않았다.
- **화면별 API 소비 매핑은 대표 경로 한정**. 223개 라우트 전체의 API 계약 추적은 범위를 넘어 수행하지 않았다.
- **삭제 후보 확정 불가** — `REMOVE_CANDIDATE`/`REVIEW` 항목은 실사용 근거가 부족해 단정하지 않았다.

---

## 10. 검증 체크

| # | 항목 | 결과 |
|---|---|:--:|
| 1 | 관리자 메뉴 전체가 매트릭스에 포함 | ✅ 41/41 |
| 2 | 메뉴 없는 라우트 별도 조사 | ✅ 137 top-level |
| 3 | 주요 화면 API 연결 확인 | ⚠ 대표 경로 한정 |
| 4 | 메뉴 노출 ↔ 실제 권한 구분 | ✅ C-1 |
| 5 | 코드 추정 ↔ 브라우저 실측 구분 | ✅ §9 |
| 6 | 수정 제안의 사실 근거 | ✅ 파일·라인·실측 |
| 7 | 불필요한 신규 기능 제안 없음 | ✅ |
| 8 | 현재 기능 크게 바꾸지 않는 정비안 | ✅ 진입점 연결 중심 |
| 9 | RBAC F9 항목 HOLD 유지 | ✅ C-2 |
| 10 | 코드·운영 데이터 변경 0 | ✅ |

---

*조사 전용 · 코드 0 변경 · 운영 데이터 0 변경 · 배포 없음*
