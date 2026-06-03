# IR-O4O-CROSS-SERVICE-CAPABILITY-PARITY-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> **KPA-Society 를 Community Canonical 기준**으로, GlycoPharm / K-Cosmetics 의 capability 가 **"의도된 차이"** 인지 **"공통화 부족"** 인지 7 capability 축 (Community / LMS / Resource / Content / AI / Store Execution / Operator) 전수 audit.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only, 4 병렬 Explore agent 통합)
- **선행 산출물:**
  - [IR-O4O-OPERATOR-ENTITY-UI-CANONICAL-AUDIT-V1](IR-O4O-OPERATOR-ENTITY-UI-CANONICAL-AUDIT-V1.md) (UI 측면)
  - [CHECK-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1](CHECK-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1.md) (Tier 1 wrapper 통합 결과)
- **범위 제외:** Neture (Supplier/B2B 축 — 별건)
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음.
- **수정 행위:** **없음**

---

## 0. 최종 요약 — 큰 그림

### 0.1 한 줄 결론

> **KPA-Society 가 Community 진영의 canonical 으로 가장 풍부하게 구현되어 있고, GP / K-Cos 는 **공통화 미적용**이 압도적 root cause. 일부는 Phase backend defer (의도된 차이), 일부는 frontend mock skeleton 잔재. 7 capability 평균 parity: GP ~65% / K-Cos ~50%.**

### 0.2 7 capability 축별 parity 신호

| 축 | KPA | GP | K-Cos | 주된 drift | 본질 |
|---|:---:|:---:|:---:|---|---|
| **Community** | 100% | ~60% | ~50% | Membership / Appreciation / My Forum 부재 | 공통화 미적용 |
| **LMS** | 100% | **38%** | 69% | GP Phase 5 backend defer (Course create / Assignment / 승인 / AI 모두 부재) | Backend 미구현 + 의도 |
| **Resource** | 89% | 67% | **22%** | K-Cos 가 operator resource 관리 전체 부재 | 공통화 미적용 + Wrapper 부재 |
| **Content** | ~95% | ~65% | ~55% | KPA-only: Content Library API / Hub Publishing / Working Content (KPA 14 pages vs GP/K-Cos 0-2) | 공통화 미적용 |
| **AI** | 100% (full pipeline) | ~70% (per-page AI) | ~60% (blog AI only) | Resource → AI → Store end-to-end 만 KPA 보유 | 공통화 미적용 |
| **Store Execution** | 100% (3-step canonical flow) | ⚠ Partial | ⚠ Minimal | Store Asset Library / 통합 production materials 부재 | 공통화 미적용 |
| **Operator** | 100% | 81% | 56% | Approvals mock skeletons / K-Cos Resources/Blog/Analytics 부재 | Frontend 미구현 + 공통화 미적용 |

### 0.3 합산 parity 달성률

| Service | 평균 parity (7 축) |
|---|:---:|
| **KPA-Society (Canonical)** | **~98%** |
| **GlycoPharm** | **~65%** |
| **K-Cosmetics** | **~50%** |

### 0.4 의도된 차이 vs 공통화 부족 — 분포

각 capability sub-axis 의 분류 (총 약 70 개 항목):

| 분류 | 항목 수 | 본질 |
|:---:|:---:|---|
| **A (이미 commonize / 완전 parity)** | ~15 | Roles, Guides, LMS list, Dashboard, AI Editor 등 |
| **B (Thin wrapper or partial — 정렬 가능)** | ~20 | Store list pattern, Resources operator (KPA→GP), Quiz player, AI Resource |
| **C (의도된 service 차이)** | ~10 | KPA-only Pharmacy/Legal/Audit, GP-only Billing/Settlement, K-Cos StoreCockpit |
| **D (공통화 부족 — drift)** | **~25** | Membership Forum, Appreciation, My Forum, Resource Upload, Hub Content Publishing, AI Store Execution unified flow, K-Cos Operator Resources/Analytics |

→ **D 가 25 항목으로 가장 많음.** "공통화 부족" 이 본 monorepo 의 가장 큰 capability drift 패턴.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 방법 | 4 병렬 Explore agent (Community / LMS+Resource / Content+AI / Store+Operator) |
| 조사 범위 | `services/web-{kpa-society, glycopharm, k-cosmetics}/src/**` + `packages/{operator-ux-core, content-editor, ui, account-ui, shared-space-ui}/**` |

---

## 2. 축별 Capability Matrix

### 2.1 Community Capability (9 sub-axis)

| Sub-axis | KPA | GP | K-Cos | 분류 | Root cause |
|---|:---:|:---:|:---:|:---:|---|
| Forum (목록/작성/상세/검색) | ✓ Full | ✓ Full | ✓ Full | **A** | — |
| Forum Dashboard (Hub/Categories) | ✓ Full (custom) | ✓ Full (template) | ✓ Full (template) | **B** | KPA 가 server-aggregated, GP/K-Cos 는 template adapter — 통합 가능 |
| Forum Management (operator) | ✓ Full (2 탭) | ✓ Full (별건 page 산재) | ✓ Partial | **C** | KPA = unified, GP/K-Cos = 분산 — 통합 후보 |
| Forum Analytics | ✓ Full | ✓ Full | ✓ Full | **A** | — |
| **Membership Forum (가입형)** | ✓ Full | **❌** | **❌** | **D** | KPA-only `ForumMemberManagementPage`. forumMembershipApi 존재 — 공통화 미적용 |
| Like/Reaction | ❌ inactive | ❌ inactive | ❌ inactive | **D** | likeCount 표시만, toggle UI 미구현. Frontend 미구현 |
| **감사/보상 (Thanks/Reward)** | ✓ Partial | **❌** | **❌** | **D** | KPA-only `appreciationApi.getSummary()` + 🎁 column. backend 존재 — Frontend wrapper 미구현 |
| Community activity tracking (MyPage) | ✓ Partial | ✓ Partial | ❌ | **C** | KPA partial 만, GP basic, K-Cos absent |
| **My Forum (MyPage forum history)** | ✓ Partial | **❌** | **❌** | **D** | KPA `MyForumDashboardPage` 만 — 공통화 미적용 |

**Community parity:** KPA 100% / GP ~60% / K-Cos ~50%.

### 2.2 LMS Capability (13 sub-axis)

| Sub-axis | KPA | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|
| 강의 목록 (operator) | ✓ Full (728L) | ✓ Partial (223L, basic) | ✓ Full (689L, KPA mirror) | A/B/A |
| **강의 생성** | ✓ Full | **❌** | **❌** | A/**D**/**D** |
| 강의 운영 (publish/archive/hard-delete) | ✓ Full | ❌ | ✓ Full | A/**D**/A |
| **강의 승인 (pending_review → approve/reject)** | ✓ Full | **❌** | ✓ Full | A/**D**/A |
| 강사 기능 (register/profile/ownership) | ✓ Full | ✓ Partial | ✓ Partial | A/B/B |
| 강의 Dashboard (instructor) | ✓ Full | ✓ Full | ✓ Full | A |
| Lesson Player | ✓ Full (440L) | ✓ Partial (inline) | ✓ Full | A/B/A |
| Quiz | ✓ Full (builder) | ✓ Partial (player only) | ✓ Full | A/B/A |
| **Assignment** | ✓ Full | **❌** | ✓ Full | A/**D**/A |
| Operations (LMS dashboard) | ✓ Full | ✓ Partial | ✓ Full | A/C/A |
| 수강 상태 (MyPage enrollment) | ✓ Full | **❌** | ✓ Partial | A/**D**/B |
| MyPage 연계 (enrollments/certificates/etc.) | ✓ Full (5 pages) | ✓ Partial (hub only) | ✓ Partial (4 pages) | A/C/B |
| **AI 강의 제작** | ✓ Full | **❌** | **❌** | A/**D**/**D** |

**LMS parity:** KPA 100% / **GP 38%** / K-Cos 69%.

**Root cause 분포:**
- GP: 대부분 D — Phase 5 backend defer (course create / assignment / quiz builder / 승인 / AI 강의 모두). 의도된 차이일 수도 있으나 long-term 의도가 미명확.
- K-Cos: course create 만 D — Phase 1-B 의도된 defer.

### 2.3 Resource Capability (9 sub-axis)

| Sub-axis | KPA | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|
| 자료실 (user library) | ✓ Full | ✓ Full | ✓ Full (read-only stub) | A/A/A |
| **자료 등록 (manual/file/external)** | ✓ Full (`ResourceWritePage`) | **❌** (operator-only) | **❌** (read-only) | A/**D**/**D** |
| 자료 검색 + 필터 | ✓ Full | ✓ Full | ✓ Partial | A/A/B |
| 자료 → AI (user-side) | ✓ Partial | ❌ (operator only) | ❌ | B/**D**/**D** |
| 자료 → Content | ✓ Partial | ✓ Partial (operator) | ❌ | B/B/**D** |
| 자료 → Store | ❌ | ❌ | ❌ | D (전체) |
| 자료 재사용 (reusable_policy) | ✓ Partial (필드만) | ✓ Partial | ❌ | B/B/D |
| 자료 권한 (operator/user) | ✓ Full | ✓ Full | **❌** | A/A/**D** |
| **자료 운영 관리 (operator)** | ✓ Full | ✓ Full | **❌** | A/A/**D** |

**Resource parity:** KPA 89% / GP 67% / **K-Cos 22%**.

**Root cause:** **K-Cos 가 operator resource page 전체 부재** — 공통화 미적용 + Wrapper 부재. KPA/GP 가 거의 동일 구조 (선행 IR 의 Tier 1.3 분리 항목).

### 2.4 Content Capability (10 sub-axis)

| Sub-axis | KPA | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|
| **Content Library (user-side)** | ✓ Full (`/contents`) | **❌** | **❌** | **D** |
| Manual Content Creation | ✓ Full | ✓ Partial | ✓ Partial | B |
| AI 생성 (editor) | ✓ Full | ✓ Full | ✓ Full | A |
| Editor (rich text / blocks) | ✓ Full | ✓ Full | ✓ Full | A |
| Preview | ✓ Full | ✓ Partial | ✓ Partial | B |
| Tag | ✓ Full | ✓ Full | ✓ Full | A |
| Content Search | ✓ Full | ✓ Partial | ✓ Partial | B |
| **Guide Content** | ✓ Full (14 pages) | ✓ Partial (2 pages) | ✓ Minimal (1 page) | **C/D** |
| **Operator Content (Hub/Detail/Working)** | ✓ Full | ✓ Partial (wrapper만) | ✓ Partial (wrapper만) | **D** (KPA-only working content flow) |
| **Hub Content Publishing** | ✓ Full (14+ pages) | **❌** | **❌** | **D** (KPA hub-to-store flow not genericized) |

**Content parity:** KPA ~95% / GP ~65% / K-Cos ~55%.

### 2.5 AI Capability (7 sub-axis)

| Sub-axis | KPA | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|
| AI Content (general) | ✓ Full | ✓ Full | ✓ Full | A |
| URL → Content | ✓ Full | ✓ Full | ✓ Full | A |
| AI Editor (in-editor) | ✓ Full | ✓ Full | ✓ Full | A |
| AI Store Use (POP / signage / blog) | ✓ Full | ✓ Partial | ✓ Partial | B |
| AI Lesson (LMS) | ✓ Minimal | ✓ Minimal | ✓ Minimal | A (모두 minimum) |
| AI Resource Library | ✓ Full | ✓ Full | **❌** | A/A/**D** |
| **AI Store Execution (POP/QR/blog 통합)** | ✓ Full (end-to-end) | **❌ unified** | **❌ unified** | **D** |

**AI parity:** 기본 AI 는 3 service 모두 우수 (A 5/7). 가장 큰 drift = **end-to-end Resource → AI → Store pipeline** (KPA only).

### 2.6 Store Execution Capability (7 sub-axis)

| Sub-axis | KPA | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|
| Blog | ✓ Full (Operator + Pharmacy) | ✓ Partial (Pharmacy only) | ✓ Partial (Store only) | B |
| POP | ✓ Full + AI | ✓ Full + AI | ✓ Full + AI | A |
| QR | ✓ Full (scan + print) | ✓ Partial (no print/analytics) | ✓ Partial | B |
| Product Detail | ✓ Full | ✓ Full | ✓ Full | A |
| **Store Asset Library** | ✓ Full | ✓ Full | **❌** | A/A/**D** |
| **Store Execution Flow (Resource → AI → Store end-to-end)** | ✓ Full (3-step canonical) | ⚠ Partial (per-page AI, no unified) | ⚠ Minimal (blog only) | **D** |
| Store Cockpit / Dashboard | ✓ Full | ✓ Full | ✓ Custom | A/A/C |

**Store Execution parity:** KPA ~100% (full pipeline) / GP ~70% (per-page) / K-Cos ~50% (blog-only).

**핵심:** **KPA 만 end-to-end Resource → AI → Store 흐름 완비.** `StoreProductionMaterialsPage` + `SelectContentsForProductionModal` + `StartProductionModal` 3-step canonical. GP/K-Cos 는 isolated per-material AI 만.

### 2.7 Operator Capability (9 sub-axis)

| Sub-axis | KPA | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|
| Members | ✓ Full | ✓ Full | ✓ Full | **A** (UI 변형 있으나 capability 동일) |
| Roles | ✓ Full (commonized) | ✓ Full | ✓ Full | **A** (Tier 1 통합 완료) |
| **Approvals** | ✓ Full | ✓ Partial (Forum mock) | ⚠ Mock | **C/D** |
| Resources | ✓ Full | ✓ Full | **❌** | A/A/**D** |
| **Guides** | ✓ Full (commonized) | ✓ Full | ✓ Full | **A** (본 사이클 통합 완료) |
| LMS | ✓ Full | ✓ Full (basic) | ✓ Full | A |
| Store | ✓ Full (adapter) | ✓ Full (adapter) | ✓ Partial (direct DataTable) | A/A/B |
| Dashboard | ✓ Full (role-split) | ✓ Full (5-block) | ✓ Custom (Cockpit) | A/A/C |
| Analytics | ✓ Full (AnalyticsPage + AiReport + ForumAnalytics) | ✓ Full | ⚠ Partial (AiReport only) | A/A/**D** |

**Operator parity:** KPA 100% / GP 81% / K-Cos 56%.

---

## 3. Top Drift Items — Priority 15

본 IR 의 D-급 + 일부 B-급 항목 중 영향이 큰 것들을 우선순위별로:

### Priority 1 — KPA-only Frontend wrapper 미적용 (즉시 commonize 가능)

| # | Drift | 영향 service | 비고 |
|---|---|---|---|
| 1 | **Resources operator page commonize** — KPA `OperatorResourcesPage` + GP `OperatorResourcesPage` 가 95% 동일, K-Cos 부재 | GP + K-Cos | 선행 IR Tier 2 의 Resources 통합 후속 — GP-only AiContentModal slot 필요 |
| 2 | **Appreciation/Reward UI** — KPA `appreciationApi` 사용 중, backend 존재 | GP + K-Cos | Frontend wire-up 만으로 parity 회복 |
| 3 | **My Forum Dashboard** — KPA-only mypage page | GP + K-Cos | mypage 도메인 — 공통 컴포넌트 추출 가능 |

### Priority 2 — Backend 미구현 / Phase defer (큰 결정 필요)

| # | Drift | 영향 service | 본질 |
|---|---|---|---|
| 4 | **LMS Course create + Quiz builder + Assignment + 승인 + AI 강의** | GP (Phase 5 defer) | 의도된 phase 인지 확인 필요 |
| 5 | **K-Cos LMS Course create** | K-Cos (Phase 1-B defer) | 의도된 — 확인만 |
| 6 | **GP `forum-management/OperatorForumManagementPage` mock skeleton** | GP | 선행 IR 이미 식별 — 별건 결정 필요 |
| 7 | **K-Cos `ApplicationsPage` mock data** | K-Cos | hardcoded mock array — backend 연결 필요 |

### Priority 3 — Capability gap (의도 vs 부족 판단 필요)

| # | Drift | 영향 service | 판단 필요 |
|---|---|---|---|
| 8 | **Membership Forum (closed forum management)** — KPA-only `ForumMemberManagementPage` + forumMembershipApi | GP + K-Cos | "GP/K-Cos 가 closed forum 기능을 가져야 하는가?" |
| 9 | **Resource Upload (user-side)** — KPA `ResourceWritePage` (4 usage types, file upload, external URL) | GP (operator-only) + K-Cos (missing) | "GP/K-Cos 사용자가 자료 업로드해야 하는가?" |
| 10 | **Content Library API (user-side)** — KPA `/contents` page + content API | GP + K-Cos | "GP/K-Cos 가 user-facing content library 가져야 하는가?" |
| 11 | **Hub Content Publishing (KPA 14+ pages)** — pharmacy hub → store production flow | GP + K-Cos | "Hub 흐름이 service-specific 인지 portable 인지" 결정 필요 |
| 12 | **AI Store Execution unified pipeline** — Resource → AI → Material → Execution 3-step | GP (per-page only) + K-Cos (blog only) | "GP/K-Cos 가 통합 production materials 필요한가?" |

### Priority 4 — K-Cos 운영 critical 결여

| # | Drift | 영향 |
|---|---|---|
| 13 | **K-Cos Operator Resources management 부재** | K-Cos 운영자가 회원 자료 관리 불가 |
| 14 | **K-Cos Store Asset Library 부재** | K-Cos 매장이 production material library 없음 |
| 15 | **K-Cos OperatorBlog page 부재** | K-Cos 운영자 측 blog HUB 관리 불가 |

---

## 4. Root Cause 분포 (전체 70 sub-axis 기준)

| Root Cause | 빈도 | 본질 |
|---|:---:|---|
| **공통화 미적용** | ~25 | KPA 가 먼저 구현, 다른 service 에 wrapper 추출 안 됨 (Tier 2/3 후속 WO 시리즈) |
| **Backend 미구현** | ~10 | GP Phase 5 (course/assignment/AI), K-Cos Phase 1-B (course create), mock skeletons |
| **Frontend 미구현** | ~8 | Like/Reaction UI / 일부 mypage 활동 추적 / KPA-only appreciation UI |
| **Wrapper 부재** | ~5 | K-Cos Resources operator / Store Asset / 일부 LMS |
| **의도된 차이** | ~10 | KPA Pharmacy/Audit/Legal, GP Billing/Settlement, K-Cos StoreCockpit, Neture (범위 외) |
| **Legacy 잔재** | ~5 | Neture AllProductsOverview (선행 IR), KPA inline role rendering |
| **잘못된 service 분리** | ~2 | Hub Content Publishing (KPA only — genericize 가능성) |

→ **공통화 미적용이 압도적 (35% 가량).** 본 IR 의 가장 큰 메시지: monorepo 의 capability drift 는 의도된 차이라기보다 **commonization investment gap**.

---

## 5. 핵심 질문 — "같은 축인가 → 같은 Capability 인가 → 왜 다른가?" 매트릭스

### 5.1 Community 축 (3 service 동일 축)

| 질문 | 답 |
|---|---|
| 3 service 모두 Community 축인가? | ✅ YES |
| 같은 capability 여야 하는가? | △ 대부분 YES (Forum/Like/Membership/Appreciation 은 universal). 일부 차이는 의도 (KPA 약사회 = closed membership 의도 가능) |
| 왜 다르게 구현되었는가? | KPA 가 먼저 투자 → 다른 service 에 portable wrapper 추출 안 됨 (공통화 미적용) |

### 5.2 LMS 축

| 질문 | 답 |
|---|---|
| 3 service 모두 LMS 축인가? | △ KPA full / K-Cos full / **GP 는 부분적** (Phase 5 defer 가 의도된 차이일 수도) |
| 같은 capability 여야 하는가? | YES if GP 가 LMS 운영 의도 있음 — Phase 5 의도 확인 필요 |
| 왜 다르게 구현되었는가? | GP backend Phase 5 미구현 + K-Cos Phase 1-B 의도된 defer |

### 5.3 Store Execution 축

| 질문 | 답 |
|---|---|
| 3 service 모두 Store 축인가? | ✅ YES (각 service 마다 매장 운영 필요) |
| 같은 capability 여야 하는가? | YES — POP/QR/Blog/Asset 은 universal 매장 도구 |
| 왜 다르게 구현되었는가? | KPA 가 hub-to-store production flow 를 먼저 완성 → 추상화/portable 화 안 됨 |

→ **세 축 모두 capability 자체는 same axis. 공통화 부족이 dominant cause.**

---

## 6. 본 IR 의 권고 — 4 단계 분리

### Step 1 — Capability Confirmation (정책 결정 필요, IR)

먼저 **"의도된 차이인가" 를 사용자가 확정**해야 할 항목:

- **GP LMS Phase 5 의도 여부** → `IR-O4O-GLYCOPHARM-LMS-PHASE-5-INTENT-DECISION-V1`
- **K-Cos Phase 1-B LMS Course create 의도** → 확인만 (별건 IR 가벼움)
- **GP/K-Cos Membership Forum capability 의도** → `IR-O4O-COMMUNITY-MEMBERSHIP-CAPABILITY-DECISION-V1`
- **GP/K-Cos Resource Upload (user-side) 의도** → `IR-O4O-RESOURCE-UPLOAD-USER-CAPABILITY-DECISION-V1`
- **GP/K-Cos Hub Content Publishing 의도** → `IR-O4O-HUB-CONTENT-PUBLISHING-PORTABILITY-DECISION-V1`

### Step 2 — Tier 2 별건 통합 WO (의도 확정 후)

- **Resources operator page commonize** (선행 IR Tier 2 항목 + 본 IR 의 Priority 1) — KPA + GP 통합 + K-Cos 신설
- **Appreciation UI wire-up** — GP/K-Cos 에 추가 (backend 그대로)
- **My Forum Dashboard 추출** — mypage 공통 컴포넌트
- **LMS Courses commonize** (선행 IR Tier 2 — KPA+K-Cos 95% identical)

### Step 3 — K-Cos 운영 critical 회복

- **K-Cos Operator Resources** — KPA/GP 의 OperatorResourcesPage 와 동일 capability 추가
- **K-Cos OperatorBlog page** — HUB 관리 capability 추가
- **K-Cos Analytics extra (AnalyticsPage / ForumAnalyticsPage)** — KPA/GP 와 parity

### Step 4 — Mock skeleton 처리

- GP `forum-management/OperatorForumManagementPage` — 결정 (실제 wire vs 제거)
- K-Cos `ApplicationsPage` mock — 결정

### Step 5 — 큰 architecture 결정 (장기)

- **Resource → AI → Store unified pipeline** 의 GP/K-Cos 이식 가능성
- **Content Library API + user-facing /contents page** 의 GP/K-Cos 이식
- **Hub Content Publishing flow** 의 generic 추상화

---

## 7. 현재 구조 vs O4O 철학 충돌 체크

| 차원 | 현재 | 정합 |
|---|:---:|:---:|
| 공통 Core (operator-ux-core + @o4o/ui + content-editor 등) | ✅ 인프라 충실 | 충돌 없음 |
| 서비스별 독립 도메인 (Billing/Audit/SupplierQuality 등) | ✅ 적절히 분리 | 충돌 없음 |
| **"같은 축 → 같은 capability" 원칙** | △ 부분 미충족 (D 25 항목) | 본 IR 의 step 2/3 권고로 회복 |
| KPA = Community Canonical | ✅ 그렇다 (가장 풍부) | 충돌 없음 |
| GP / K-Cos 의 GP-only / K-Cos-only 도메인 | ✅ 의도된 부분 (GP Billing, K-Cos StoreCockpit 등) | 충돌 없음 |
| **공통화 미적용 (가장 큰 root cause)** | ❌ 25 항목 잔존 | 본 IR 의 Step 2/3 점진 정렬로 회복 가능 |

→ **본 IR 의 핵심 메시지: "drift 는 의도된 차이가 아니라 공통화 미적용 (commonization investment gap)" 이 dominant.** 점진 commonization 으로 회복 가능.

---

## 8. 본 IR 이 결정하지 않는 것

- 실제 코드 변경 (조사 전용)
- Step 1 의 의도/비의도 최종 결정 — 별건 IR 후속
- Step 2 통합 WO 의 실행 시점 — Tier 2 별건 시리즈
- Step 3 K-Cos critical 회복 시점 — K-Cos Phase 결정 의존
- GP LMS Phase 5 backend 일정 — 별건
- Neture (Supplier/B2B 축) 의 capability — 본 IR 범위 외
- "공통화 부족" 으로 분류된 항목의 단기/장기 우선순위 정렬 — 별건 별 IR

---

## 9. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 새 Tier 2 WO 후보 (Step 2) | 4 건 |
| 새 의도 확정 IR 후보 (Step 1) | 5 건 |
| K-Cos critical 회복 항목 (Step 3) | 3 건 |
| Mock skeleton 결정 항목 (Step 4) | 2 건 |
| 장기 architecture 결정 (Step 5) | 3 건 |
| "공통화 미적용" 식별 항목 | ~25 |
| KPA Community Canonical 공식 인정 | ✅ 본 IR 명문화 |
| 사이클 정리 | 본 IR 로 capability 측면의 monorepo 전체 그림 확정. 점진 정렬은 다단계 WO 시리즈 |

---

## 부록 — 조사 방법 (재현 가능)

```bash
# 1. Community 관련 pages 전수
for SVC in kpa-society glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  find services/web-$SVC/src/pages -path '*forum*' -o -path '*Forum*' -o -path '*community*' -o -path '*Community*'
done

# 2. LMS 관련 pages
for SVC in kpa-society glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  find services/web-$SVC/src/pages -path '*lms*' -o -path '*course*' -o -path '*Course*' -o -path '*lesson*' -o -path '*Lesson*' -o -path '*Quiz*' -o -path '*Assignment*' -o -path '*Instructor*'
done

# 3. Content/AI/Resources pages
for SVC in kpa-society glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  find services/web-$SVC/src/pages -path '*content*' -o -path '*Content*' -o -path '*resource*' -o -path '*Resource*' -o -name '*Ai*' -o -name '*AI*'
done

# 4. Store Execution pages
for SVC in kpa-society glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  find services/web-$SVC/src/pages -path '*pop*' -o -path '*POP*' -o -path '*qr*' -o -path '*QR*' -o -path '*blog*' -o -path '*Blog*' -o -path '*signage*' -o -path '*Signage*' -o -name '*Production*'
done

# 5. Operator pages (전수)
for SVC in kpa-society glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  ls services/web-$SVC/src/pages/operator/*.tsx | wc -l
done

# 6. Appreciation/Reward API usage
grep -rln "appreciationApi\|appreciation" services/web-{kpa-society,glycopharm,k-cosmetics}/src
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only, 4 parallel agent synthesis)*
*Status: 조사 완료 — KPA Canonical 인정 + GP ~65% / K-Cos ~50% parity. 공통화 미적용 25 항목 식별.*
*Decision Required: Step 1 의 5 개 의도 확정 IR + Step 2 의 4 개 통합 WO + Step 3 의 K-Cos 회복 우선순위.*
