# CHECK — WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1

- **작성일**: 2026-08-24
- **기준 커밋**: `21ed6d88d` (origin/main) 시점 재조사 — 과거 `58업무 × 5서비스 = 290셀` census 수치는 폐기하고 전부 재산출
- **대상(adoption)**: KPA-Society · K-Cosmetics · Neture · PharmacyHub
- **GlycoPharm**: adoption 대상 아님 — 공통 모듈 회귀 검증 대상으로만 취급

---

## 1. Census (최신 main 재산출)

### 1-1. 운영자 메뉴 · 라우트

| 서비스 | operator 메뉴 경로 | admin 메뉴 경로 | dead menu (경로 없는 메뉴) | 기능 은폐 (메뉴 없는 실기능 라우트) |
|---|---:|---:|---:|---|
| KPA-Society | 38 | 0 | **0** | 0 (잔여 7건 전부 `<Navigate>` legacy redirect) |
| K-Cosmetics | 32 | 5 | **0** | 0 (`users` redirect · `operator` 부모경로 artifact · `signage/content`=StoreCockpit 진입) |
| Neture | 25 | 26 | **0** | 0 (본 WO 에서 3건 해소 — 아래 FIX-7) |
| PharmacyHub | 12 | 0 | **0** | 0 |
| GlycoPharm(회귀 전용) | 34 | 2 | **0** | 12 — OUT_OF_SCOPE |

### 1-2. Capability 판정

**모집단 산출 방법** — 4 공식 서비스의 운영자 메뉴 항목(주석 제외)을 전부 추출하고, 같은 업무를
다른 경로로 부르는 항목은 alias 로 합쳐 **capability union = 72개** 를 얻었다.
모집단 = 72 capability × 4 서비스 = **288 셀**. 보유 셀 = KPA 38 + KCos 32 + Neture 44 + PH 11 = **125**.

| 판정 | 건수 | 근거 |
|---|---:|---|
| ADOPTED_COMMON | 102 | 메뉴 경로 → 라우트 → 실제 컴포넌트 파일을 따라가 `@o4o/operator-core-ui` · `@o4o/operator-ux-core` · `@o4o/ui` · `@o4o/shared-space-ui` 소비를 확인한 셀 (KPA 35 / KCos 28 / Neture 28 / PH 11) |
| ADOPTED_SERVICE_SPECIFIC | 23 | 서비스 전용 구현 (KPA 3 / KCos 4 / Neture 16 / PH 0) — Neture 는 공급·유통 고유 업무가 다수라 비중이 높다 |
| REQUIRED_BUT_MISSING | **0** | 조사 시점 6건 → 본 WO 에서 전부 구현 (FIX-1~FIX-7) |
| INTENTIONALLY_DIFFERENT | 8 | 공지/뉴스(Neture=homepage-cms 대체, PH=forum pinned) 2 · 감사 로그(KCos·Neture·PH) 3 · 역할 관리(KCos·Neture=플랫폼 축) 2 · 콘텐츠 허브(KCos=`sub_type` 분리 콘솔) 1 |
| NOT_APPLICABLE | 155 | 서비스 사업 범위 밖 (PH 매장/상품/공급자/사이니지 축, KCos·Neture 약사 자격 심사, Neture 매장 HUB 실행 자산 등) |
| DEAD_OR_UNUSED | 0 | KPA `/operator/legal` 1건 → 본 WO 에서 은퇴(FIX-6) |
| UNJUDGED | **0** | |

### 1-3. UI 구현 판정

| 판정 | 건수 |
|---|---:|
| FULLY_COMMON | 102 |
| CORE_ONLY (Core 는 있으나 소비 없음) | **0** |
| VIEW_DUPLICATED (정당하지 않은 중복) | **0** |
| SERVICE_SPECIFIC | 23 |
| NOT_IMPLEMENTED | 163 |
| OUT_OF_SCOPE | GlycoPharm 전체 (adoption 축 제외 · 회귀 검증만) |

> `CORE_ONLY = 0` 은 "Core 존재"가 아니라 **route + menu + 실제 View 소비**까지 따라가 확인한 결과다.
> 교차 서비스 중복 후보 3계열(RoleManagementPage 4서비스 / UserDetailPage 4서비스 / AiReportPage 3서비스)은
> 전부 13~86줄 thin wrapper 로 본체가 `@o4o/ui` 에 있다 → VIEW_DUPLICATED 아님.

---

## 2. 수정 내역 (FIX-1 ~ FIX-8)

| # | 대상 | 판정 | 조치 |
|---|---|---|---|
| FIX-1 | `apps/api-server/.../operator/analytics.routes.ts` | cross-service scope 결함 | `requireOperatorOrAdmin` 허용 목록에 `cosmetics:admin` · `cosmetics:operator` 추가 — K-Cosmetics 운영자가 공통 운영 분석 API 에서 403 이던 문제 |
| FIX-2 | `services/web-k-cosmetics/.../operator/AnalyticsPage.tsx` (신규) | REQUIRED_BUT_MISSING | 공통 `OperatorAnalyticsPage`(`@o4o/operator-core-ui`) thin wrapper + 라우트 + 메뉴('운영 분석') |
| FIX-3 | `services/web-k-cosmetics/.../operator/CommunityManagementPage.tsx` (신규) | REQUIRED_BUT_MISSING | 공통 `CommunityHomeConsole` 소비 — backend·client 는 이미 있었고 소비처만 0 이었다. 라우트 + 메뉴('Home 편집') |
| FIX-4 | `services/web-kpa-society/src/config/operatorMenuGroups.ts` | 기능 은폐 | 실기능 `/operator/collaboration-requests` 에 '협업 문의 관리' 메뉴 진입점 추가 |
| FIX-5 | `services/web-pharmacy-hub` 자료실 (§4 재판정) | REQUIRED_BUT_MISSING | ① `pharmacyHubResources.ts` 의 `type` 을 계약에 없는 `'resource'` → 공통 CMS `'knowledge'` 로 정정(조회 항상 0건·등록 400 이던 원인) ② 운영자 콘솔 `ResourcesPage.tsx` 신규 — 목록/검색/상태필터 + RichTextEditor 등록·수정 + 상태 전이. 전이표는 서버 `CMS_ALLOWED_TRANSITIONS` 와 동일하게 제한 ③ 라우트 + 메뉴('자료실 관리'). **cms-core(동결)·schema·migration 무변경** |
| FIX-6 | `services/web-kpa-society/.../operator/LegalManagementPage.tsx` | DEAD_OR_UNUSED | legacy `/operator/legal` 은퇴 → `/admin/settings/legal` redirect. 메뉴는 이미 제거돼 있었고 프로덕션에서 canonical·legacy 양쪽 published 문서 0건 확인. backend(`/kpa/operator/legal/documents`) · `kpa_legal_documents` 는 무변경 |
| FIX-7 | `services/web-neture/src/config/operatorMenuGroups.ts` | 기능 은폐 3건 | `상품 승인`(/operator/product-approvals) · `서비스별 상품 승인`(/operator/product-service-approvals) · `판매자 모집 상품`(/operator/recruiting-products) 메뉴 진입점 추가. 라우트·guard 무변경 |
| FIX-8 | `services/web-pharmacy-hub/src/config/operatorCapabilities.ts` | 기능 은폐 (배포 후 실브라우저 검증에서 발견) | FIX-5 로 메뉴 항목을 추가했으나 PH `ENABLED_CAPABILITIES` 에 `CONTENT_MANAGEMENT` 가 없어 `DomainIASidebar` 가 `resources` 그룹 자체를 숨기고 있었다(항목이 있어도 노출 0). capability 추가로 해소. PH `UNIFIED_MENU` 에 `content`·`lms` 항목은 없어 빈 그룹 헤딩은 생기지 않는다 |

부수 정정: PharmacyHub `AnalyticsPage.tsx` 의 `ACTION_LABELS` 키가 짧은 키(`member_approve`)로 돼 있어
`action_logs` 의 실제 키(`pharmacy-hub.operator.member_approve`)와 매칭되지 않던 drift 를 교정.

---

## 3. INTENTIONALLY_DIFFERENT / NOT_APPLICABLE 근거

### 3-1. PharmacyHub §4 9개 잔여 후보 재판정

| 후보 | 판정 | 근거 |
|---|---|---|
| 공지/뉴스 | INTENTIONALLY_DIFFERENT | PH 공지는 forum pinned post 가 canonical. 별도 CMS 콘솔을 만들면 같은 성격 게시가 2경로로 갈린다 |
| Home 편집 | NOT_APPLICABLE | PH 홈은 공통 `CommunityServiceHome` 계약 — 서비스별 편집 축이 없다 |
| 콘텐츠 허브 | NOT_APPLICABLE | 매장 HUB 실행 자산 축 자체가 PH 범위 밖 |
| 설문 | NOT_APPLICABLE | 설문 V1 범위 외 (Store Menu Canonical Tree V1 과 동일 기준) |
| **자료실** | **REQUIRED_BUT_MISSING → 구현(FIX-5)** | 회원 자료실 소비 화면이 이미 있고 backend 는 공통 CMS. 운영자 write 경로만 없었다 |
| LMS 운영자 | NOT_APPLICABLE | PH 는 강의 운영 주체가 아니다 |
| 안내 문구 | NOT_APPLICABLE | guide-contents 소비 화면 없음 — UI 만 만드는 것은 금지 조건 |
| AI 리포트 | ADOPTED_COMMON | 공통 `AiReportPage`(@o4o/ui) 소비 중 |
| 감사 로그 | NOT_APPLICABLE | 아래 3-2 참조 |

### 3-2. 공통화하지 않은 항목 (중지 조건 해당)

- **감사 로그(KCos·Neture·PH)** — 운영자 감사 로그 backend 는 `/kpa/operator/audit-logs`(`kpa:admin`) **KPA 전용**이다.
  타 서비스에 붙이려면 신규 backend 계약이 필요하다 → "backend contract 없는데 UI 만 만들지 않는다" 에 해당.
  **별도 WO 제안**: 공통 `action_logs` 운영자 조회 계약 정의.
- **K-Cosmetics 역할 관리(`/admin/roles`)** — 메뉴 부재는 결함이 아니라 `WO-O4O-KCOS-ADMIN-SCOPE-CLEANUP-V1`
  의 명시 결정("System '역할 관리' → O4O 전체 관리자")이다. Neture 도 `역할 관리 (플랫폼)` adminOnly 로 동일 축.
- **K-Cosmetics 가입 신청(ApplicationsPage)** — backend 가 array-only + client filter 구조라 STANDARD-LIST 전면 채택 비대상(기존 WO 명시).
- **Neture 문의** — 공급자/파트너 문의 의미가 KPA 회원 문의와 달라 `SERVICE_SPECIFIC` 유지.
- **LMS `requireLmsOperator` 가 `kpa:*` 를 포함하지 않음** — 권한 모델 자체 변경이 필요 → 중지 조건.
- **KPA 고유 화면**(공급자 콘텐츠 승인 · 이벤트 오퍼 · 동영상 · 다국어 상품 콘텐츠 · 태블릿 Screen Set · 자격 심사 · 협업 문의 · 감사 로그)
  — 타 공식 서비스에 **중복 구현이 존재하지 않는다**. 단일 구현이므로 공통화 대상이 아니다(SERVICE_SPECIFIC).

---

## 4. 검증

### 4-1. 정적 검증

| 항목 | 결과 |
|---|---|
| `pharmacy-hub-web` type-check (`tsc -b`) | PASS |
| `web-k-cosmetics` `tsc --noEmit` | PASS |
| `web-kpa-society` `tsc --noEmit` | PASS |
| `web-neture` `tsc --noEmit` | PASS |
| dead menu link (5서비스) | 0 |
| 기능 은폐 (공식 4서비스) | 0 |

### 4-2. 프로덕션 E2E

> 배포 후 실브라우저 검증 결과는 본 문서 §5 에 추가 기록한다.

---

## 5. 배포 후 프로덕션 실브라우저 검증

- 방식: headless Chromium(Playwright) 실로그인 → 서비스별 운영자 메뉴 **전 경로 직접 방문**(deep link) + hard load.
  sidebar DOM 열거는 다항목 그룹이 기본 접힘이라 과소보고되므로 **config 기준 전 경로 열거**로 수행.
- 계정: 실 운영자 계정(`sohae2100@gmail.com`) — 4 공식 서비스.
- 판정: white screen(main 텍스트 40자 미만) / placeholder(준비 중·Coming Soon) / 예기치 않은 4xx·5xx / JS exception / 리다이렉트 이탈.

### 5-1. 경로 방문 결과

| 서비스 | 커밋 | desktop 1440×900 | mobile 390×844 | 비고 |
|---|---|---|---|---|
| KPA-Society | `ee177e6b6` | 38 / 38 clean | 29 / 29 clean | FIX-4 '협업 문의 관리' 메뉴 노출·정상 |
| K-Cosmetics | `ee177e6b6` | 32 / 32 clean | 18 / 18 clean | FIX-2 `/operator/analytics` · FIX-3 `/operator/community` 실렌더 확인 (FIX-1 로 403 해소) |
| Neture | `ee177e6b6` | 22 / 25 | 13 / 14 | 아래 5-2 |
| PharmacyHub | `34b4ac983` | **11 / 11 clean** | **11 / 11 clean** | FIX-8 배포 후 재검증. sidebar 에 `자료실 관리 → /operator/resources` 노출 확인 |

### 5-2. Neture 잔여 flag 2건 (전부 이번 WO 수정 범위 밖 — 은폐하지 않고 기록)

1. `/operator/actions` — 자동 판정에서 WHITE 로 표시됐으나 **오탐**이다. 대기시간 10초로 재측정 시
   "Action Queue / 총 작업 2건 / 긴급 1건" 이 정상 렌더되고 실패 요청 0건. 초기 로딩이 3.2초 임계를 넘겼을 뿐이다.
2. `/operator/ai-card-report` · `/operator/ai-operations` — `/api/ai/card-report` · `/api/ai/operations` 가 **403**.
   원인은 backend guard 가 `requireAdmin`(= `platform:super_admin` 단독, `WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1`)인데
   메뉴의 `adminOnly` 는 `isAdminOrAbove(serviceKey)`(= `neture:admin` 도 true)로 해석되기 때문이다.
   **본 WO 이전부터 존재**했고 `WO-O4O-NETURE-OPERATOR-PRODUCTION-DEFECT-CLOSURE-V1` 이 "guard 는 유지하고 admin 메뉴로만 노출"로 기록한 상태다.
   해소하려면 권한 모델 변경 또는 공통 `UnifiedMenuItem` 계약에 `platformAdminOnly` 플래그 신설이 필요 → **§6 중지 조건**(권한 모델 자체 변경 / 공통 계약 변경).
   **별도 WO 제안**: AI 리포트 guard ↔ 메뉴 가시성 계약 정합.

### 5-3. 쓰기 검증 (안전 fixture + 원복)

| 항목 | 결과 |
|---|---|
| PH 자료실 신규 adoption lifecycle | **PASS** — 등록(draft) → 수정(제목 변경 반영) → `검토 요청`(pending) → `게시`(published) → `보관`(archived) 전 구간 성공. API 4xx/5xx 0건, JS exception 0건 |
| 원복 | fixture 를 terminal 상태 `archived` 로 종료. 회원 자료실 `/resources` 에서 노출되지 않음을 실브라우저로 확인 (공통 CMS 전이표상 archived 는 종점이며 콘솔에 하드 삭제 경로를 만들지 않았다) |
| cross-service data leak | **0** — PH fixture 가 KPA `/operator/resources`·`/operator/content`, KCos `/operator/resources`·`/operator/content-management` 어디에도 나타나지 않음 |
| serviceKey write fan-out | **0** — 위와 동일 근거 |
| 회원 상태 변경 → 원복 / role grant → revoke / 승인·반려 1건 | **미실행 (기록)** — 프로덕션에 안전 fixture 가 없다. PH·KPA 모두 승인 대기 큐 **0건**이고, PH 회원 콘솔은 조회 전용(행 단위 write 없음), `/operator/roles` 는 backend 가 platform admin 전용이라 운영자 세션에 write 버튼이 없다. 실행하려면 신규 프로덕션 사용자·RBAC row 를 만들어야 하므로 수행하지 않았다 |

### 5-4. 필수 결과

| 항목 | 결과 |
|---|---|
| dead link | 0 |
| white screen | 0 (Neture 오탐 1건 재확인 후 정상) |
| JS exception | 0 |
| 예기치 않은 404/500 | 0 |
| 403 | 2 경로 — 기존 결함, 5-2 기록 |
| cross-service data leak | 0 |
| serviceKey write fan-out | 0 |
| placeholder | 0 |

---

## 6. 종료 Gate

| Gate | 결과 |
|---|---|
| UNJUDGED | 0 |
| REQUIRED_BUT_MISSING | 0 |
| 정당하지 않은 VIEW_DUPLICATED | 0 |
| 정당하지 않은 UX_DRIFT | 0 |
| dead menu / route | 0 |
| cross-service scope 결함 | 0 (FIX-1 로 해소) |
| production adoption gap | 0 (§5) |
| **판정** | `OPERATOR_COMMONIZATION = CLOSED` · `PRODUCTION_ADOPTION = PASS` · `MUST_FIX_BEFORE_CLOSE = 0` |

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(① 공통 감사 로그 조회 계약 ② Neture AI 리포트 guard ↔ 메뉴 가시성 계약 정합)
