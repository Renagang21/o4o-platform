# IR-O4O-SUPPLIER-CONTENT-PRODUCER-LEGACY-AUDIT-V1

> **조사 요청서 (Investigation Result)**
>
> 코드 수정 없음 / UI 수정 없음 / 라우트 삭제 없음 / 메뉴 삭제 없음 / API 삭제 없음 / DB 변경 없음 / 문서 baseline 수정 없음
>
> 본 IR 은 O4O Platform 전반에서 **"공급자 직접 콘텐츠 제작·등록"** 흐름의 잔존을 전수 조사하여, 후속 cleanup / 전환 작업의 우선순위 자료를 확보한다.

- **작성일:** 2026-05-23
- **분류:** Investigation Result (Read Only)
- **기준 문서:**
  - [`O4O-BUSINESS-PHILOSOPHY-V1 §3.1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md)
  - [`O4O-3-ROLE-FLOW-BASELINE-V1 §1.1, §3, §6.1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md)
  - [`PLATFORM-CONTENT-POLICY-V1 §3, §6.3, §10.5`](../baseline/PLATFORM-CONTENT-POLICY-V1.md)
  - [`IR-NETURE-STRUCTURE-FREEZE-V1 §2`](../IR-NETURE-STRUCTURE-FREEZE-V1.md)
  - [`IR-O4O-HUBPRODUCER-POLICY-ALIGNMENT-AUDIT-V1`](IR-O4O-HUBPRODUCER-POLICY-ALIGNMENT-AUDIT-V1.md)
- **상태:** Read-Only IR / 후속 WO 입력 자산 준비 완료

---

## 1. 조사 목적

다음을 명확히 한다.

- 공급자가 O4O 내부에서 콘텐츠를 직접 제작/등록하는 흐름이 **어디까지 살아있는지**
- 각 잔존이 **Active / Legacy but reachable / Dead code / Intentional Legacy** 중 어느 분류인지
- 후속 cleanup / 전환의 **우선순위**

---

## 2. Canonical 기준

```text
공급자 (Supplier)
  → O4O 내부 콘텐츠 제작 / 정비 / 등록 주체 아님

공급자 담당자
  → 제품·브랜드·마케팅 원천 자료를 외부/오프라인 방식으로 운영자에게 전달

운영사업자 (Operator)
  → 수신 자료를 O4O 내부에 등록·정리·AI 가공·큐레이션 → 매장 실행 자산 제작

매장 (Store)
  → 제공받은 실행 자산을 현장에서 활용
```

`HubProducer='supplier'` 는 [`PLATFORM-CONTENT-POLICY-V1 §3.1, §6.3`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) 에서 **legacy / 명문화된 예외** 로 분류 완료 (2026-05-23).

---

## 3. Frontend 라우트 / 메뉴 조사

### 3.1 서비스별 상태

| 서비스 | 공급자 메뉴 노출 | `/supplier/*` 라우트 | Signage Content Hub | 위험도 |
|--------|:--------------:|:-------------------:|:-------------------:|:-----:|
| **web-neture** | ✅ Active | ✅ `SupplierSpaceLayout` (8 메뉴 그룹) | ✅ `/supplier/signage/content` 명시 라우트 | **HIGH** |
| **web-kpa-society** | ⚠️ 제한적 | ✅ `/supplier/event-offers` (Neture 진입 redirect) | ⚠️ HubSignageLibraryPage `'supplier'` 탭 필터 잔존 | **MEDIUM** |
| **web-glycopharm** | ❌ 차단 | ❌ `RoleNotAvailablePage` 게이트 | ❌ | **LOW** |
| **web-k-cosmetics** | ❌ 차단 | ❌ `RoleNotAvailablePage` 게이트 | ❌ | **LOW** |

### 3.2 web-neture 상세 (HIGH)

| 위치 | 패턴 | 종류 | 현재 상태 |
|------|------|------|----------|
| `App.tsx:696-731` | `/supplier/*` 라우트 블록 | Route | **Active** (`SupplierRoute` 가드만) |
| `App.tsx:723` | `<Route path="/supplier/signage/content" element={<SignageContentHubPage />} />` | Route | **Active** — 공급자가 Signage Hub 콘텐츠 직접 탐색 |
| `components/layouts/SupplierSpaceLayout.tsx:45-89` | `SUPPLIER_SIDEBAR_GROUPS` (8 메뉴 그룹) | Menu | **Exposed** — Content 섹션에 "Library" 포함 (line 79) |
| `pages/supplier/StoreSignagePage.tsx` | `/supplier/signage/manage` | Component | **Active** — 사이니지 플레이리스트 CRUD |
| `pages/seller/SignageContentHubPage.tsx` | Hub 콘텐츠 탐색·복사 | Component | **Reachable** via `/supplier/signage/content` |
| `lib/role-constants.ts` | `SUPPLIER_ACCESS_ROLES` | Config | **Active** — 공급자 권한 검증만 |

**핵심:** SupplierRoute RoleGuard 로만 보호 → `'supplier'` 역할 보유자 직접 접근 가능. 메뉴에서 Library/B2B Content/Event Offer 모두 노출.

### 3.3 web-kpa-society 상세 (MEDIUM)

| 위치 | 패턴 | 종류 | 현재 상태 |
|------|------|------|----------|
| `App.tsx:91, 676` | `<Route path="/supplier/event-offers" element={<Layout><SupplierEventOfferPage /></Layout>} />` | Route | **Active** — Event Offer 제안 페이지 (Neture 연동) |
| `pages/supplier/SupplierEventOfferPage.tsx:44-48` | KPA/K-Cosmetics 로 제안 | Component | **Reachable** — Neture 단독 실행, KPA 는 entry redirect 만 (`WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1` 기존) |
| `pages/pharmacy/HubSignageLibraryPage.tsx:46, 52-56` | `type HubProducer = 'operator' \| 'supplier' \| 'community'` 필터 | Type/UI | **Legacy filter** — Signage 필터에 'supplier' 탭 잔존 |
| `api/hubContent.ts` | HubProducer 타입 export | API Type | **Legacy** — API 응답에 producer 필드 포함 |

**핵심:** Event Offer 경로는 Neture 단독 실행으로 정렬되어 있으나, **HubSignageLibraryPage 의 'supplier' 필터 옵션** 이 [PLATFORM-CONTENT-POLICY-V1 §6.3 Legacy 표시] 와 정합되지 않음 — UI 측 잔존.

### 3.4 정렬된 서비스 (LOW)

`web-glycopharm` / `web-k-cosmetics` 모두 `<Route path="supplier/*" element={<RoleNotAvailablePage role="supplier" />} />` 로 명시적 차단. 정책 일관됨.

---

## 4. Backend API 조사

### 4.1 활성 엔드포인트 매트릭스

| HTTP | Path | 구현 | 강제 필드 | Operator Gate | HUB 노출 조건 | 상태 |
|------|------|------|----------|:-------------:|---------------|------|
| POST | `/api/v1/kpa/supplier/content-submissions` | `supplier-content.controller.ts:75-101` | `authorRole='supplier'` + `status='pending'` + `visibilityScope='service'` | ✅ 승인 후 published | `published` + `visibilityScope∈('platform','service')` + `authorRole='supplier'` | **Active** |
| GET | `/api/v1/kpa/supplier/content-submissions` | `supplier-content.controller.ts:33-51` | 본인 소유만 | — | — | **Active** |
| GET | `/api/v1/kpa/supplier/content-submissions/:id` | `supplier-content.controller.ts:54-72` | 본인 소유만 | — | — | **Active** |
| POST | `/api/v1/kpa/supplier/signage/campaign-requests` | `supplier-campaign-request.controller.ts:80-230` | `sourceType='youtube'\|'vimeo'`, `status='pending'` | ✅ 승인 후 forced_content 생성 | targetServices 별 `signage_forced_content` | **Active** |
| GET | `/api/v1/kpa/supplier/signage/campaign-requests` | `supplier-campaign-request.controller.ts:234-269` | 본인 소유만 | — | — | **Active** |
| GET | `/api/v1/kpa/supplier/signage/campaign-requests/my-media` | `supplier-campaign-request.controller.ts:51-76` | 본인 미디어만 | — | — | **Active** |
| GET | `/api/v1/kpa/supplier/signage/reports` | `supplier-signage-report.controller.ts:102-219` | 본인 미디어만 | — | 재생 로그 조회 (이미 노출) | **Active** |

### 4.2 제거된 엔드포인트 (참고)

- `neture_supplier_contents` 테이블 및 관련 API 는 **WO-O4O-SUPPLIER-CONTENT-REMOVAL-V1** 로 완전 제거됨 (마이그레이션 `20260303000000`).
- 즉 Neture 도메인의 supplier content 경로는 backend 측에서 이미 사라짐.

### 4.3 Operator Approval / Processing 흐름

```text
공급자 작성
  ↓ POST /supplier/content-submissions (강제: authorRole='supplier', status='pending', visibilityScope='service')
cms_contents (pending)
  ↓ kpa_approval_requests (entity_type='hub_content_submission')
Operator POST /operator/approvals/:id/approve
  ↓ ContentApprovalService.approve() — cms_contents.status='published'
HUB 노출
  ↓ HubContentQueryService — WHERE status='published' AND visibilityScope IN ('platform','service') AND authorRole='supplier'
```

**핵심 발견:**

- ✅ Operator approval gate 강제 (pending → published 만 Operator 권한)
- ❌ **Operator 본문 편집 API 미존재** — 승인/반려만 가능, PATCH/PUT 엔드포인트 없음
- ❌ **AI 가공 단계 강제 안 됨** — approve() 호출 시 상태만 전환, AI processing 불포함
- ✅ `visibilityScope='service'` 강제 — 플랫폼 전체 노출 차단, service-scoped 만 허용

### 4.4 백엔드 위험 판정

**MEDIUM 위험** — Gate 는 있으나 가공 부재.

- Operator 가 "승인만" 하면 공급자가 작성한 본문 그대로 HUB 노출
- [`O4O-3-ROLE-FLOW-BASELINE-V1 §3`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) 의 "Operator 가공 + 검수 필수" 와 부분 충돌 (검수만 강제, 가공 부재)
- 단, [`PLATFORM-CONTENT-POLICY-V1 §6.3`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) 의 Legacy 명문화로 의도된 예외로 처리됨

---

## 5. 타입 / 정책 조사

### 5.1 타입 / Enum 잔존

| 위치 | 타입 / Enum | Stable 표시 | 사용처 | 판정 |
|------|------------|:----------:|:------:|------|
| `packages/types/src/hub-content.ts:17` | `HubProducer = 'operator' \| 'supplier' \| 'community' \| 'store'` | ✅ [Stable](../baseline/CONTENT-STABLE-DECLARATION-V1.md) §4-A | 12개 import 경로 | **의도된 Legacy 명문화** |
| `packages/types/src/content.ts:21` | `ContentSourceType = 'operator' \| 'supplier' \| 'pharmacist'` | 미표시 | 프론트 라벨 | **Non-HUB 도메인 (무관)** |
| `packages/types/src/signage.ts:24` | `ContentSource = 'hq' \| 'supplier' \| 'community' \| 'store'` | 미표시 | 라벨용 | **Non-HUB 도메인 (무관)** |

### 5.2 정책 / Baseline 문서 잔존 (current state)

| 문서 | 위치 | Legacy 명문화 여부 | 판정 |
|------|------|:-----------------:|------|
| `PLATFORM-CONTENT-POLICY-V1` §3.1 | HubProducer enum 정의 + Canonical 정렬 노트 | ✅ 명문화 (2026-05-23) | **정렬 완료** |
| `PLATFORM-CONTENT-POLICY-V1` §3.2 | 매핑표에 "Legacy (명문화된 예외)" | ✅ 명문화 | **정렬 완료** |
| `PLATFORM-CONTENT-POLICY-V1` §6.3 | "공급자" 탭 = 비-Canonical 영역 | ✅ 명문화 | **정렬 완료** |
| `PLATFORM-CONTENT-POLICY-V1` §10.5 | producer='supplier' 단계적 전환 향후 계획 | ✅ 명문화 | **정렬 완료** |
| `O4O-3-ROLE-FLOW-BASELINE-V1` §6.1 | "공급자 → HUB 직접 배포" 금지 흐름 + 판정 주석 | ✅ "legacy / 명문화된 예외" | **정렬 완료** |
| `O4O-3-ROLE-FLOW-BASELINE-V1` §6.3 | Drift 가드 = "HubProducer='supplier' Canonical 아님" | ✅ "명문화 완료 (2026-05-23)" | **정렬 완료** |
| `IR-NETURE-STRUCTURE-FREEZE-V1` §2 | "공급자는 매장 실행 자산 생산자가 아니다" | ✅ Canonical 정렬 주석 | **정렬 완료** |

### 5.3 정렬 일관성 확인

| 문서 간 | 정렬 상태 |
|---------|----------|
| PHILOSOPHY-V1 §3.1 ↔ 3-ROLE-FLOW §6.1 | ✅ 일치 |
| 3-ROLE-FLOW §6.1 ↔ PLATFORM-CONTENT-POLICY §6.3 | ✅ 일치 — "legacy / 명문화된 예외" |
| PLATFORM-CONTENT-POLICY §3.1 ↔ CONTENT-STABLE-DECLARATION §4-A | ✅ 일치 — Stable 보호 |
| IR-NETURE-STRUCTURE-FREEZE §2 ↔ 3-ROLE-FLOW §1.1 | ✅ 일치 |

**판정:** 정책·타입 측은 **LOW 위험 — 의도된 Legacy 명문화 완료**. Drift 없음.

---

## 6. 문서 잔재 조사

### 6.1 Baseline 문서 — 현재 정책 기본 표현 (Drift 아님)

| 문서 | 위치 | 표현 | 판정 |
|------|------|------|------|
| `PHILOSOPHY-V1` §3.1 L97 | "공급자는 O4O 내부에서 모든 실행 자산을 직접 제작하는 주체로 보지 않는다" | **Canonical 정책 기본** |
| `3-ROLE-FLOW-V1` §4.1 L279 | "공급자는 원천 자료를 O4O 내부에서 직접 Producer 로 등록하지 않는다" | **Canonical 정책 기본** |
| `IR-NETURE-STRUCTURE-FREEZE-V1` §2 | "공급자는 매장 실행 자산 생산자가 아니다" + Canonical 정렬 주석 | **Canonical 정책 기본** |

### 6.2 시점 기록 (Drift 판정 대상 아님)

- `IR-O4O-HUBPRODUCER-POLICY-ALIGNMENT-AUDIT-V1` — 정렬 완료 결과 IR
- 과거 audit/IR 의 시점 기록 — read-only 성격, 정합성 영향 없음

---

## 7. 실제 영향도 분류

### 7.1 영향도 매트릭스

| 등급 | 잔존 항목 | 영향 |
|------|----------|------|
| **HIGH** | web-neture `/supplier/signage/content` 라우트 + SupplierSpaceLayout 8 메뉴 그룹 | 공급자가 직접 Signage Hub 콘텐츠 탐색 및 자기 매장 플레이리스트에 추가 가능. UI 측 Canonical 위반 명백. |
| **HIGH** | web-neture SupplierSpaceLayout Content > Library 메뉴 | 공급자가 콘텐츠 작성 페이지 진입 가능 (B2B 콘텐츠 등록 추정) |
| **MEDIUM** | Backend `POST /api/v1/kpa/supplier/content-submissions` | 공급자 직접 작성 → Operator 검수만 (가공 부재) → HUB 노출. visibilityScope='service' 강제로 영향 범위 제한됨. Legacy 명문화 완료. |
| **MEDIUM** | Backend `POST /api/v1/kpa/supplier/signage/campaign-requests` | 공급자가 사이니지 캠페인 직접 요청 (youtube/vimeo url). Operator 승인 후 forced_content 생성. 가공 단계 부재. |
| **MEDIUM** | web-kpa-society `HubSignageLibraryPage` 'supplier' 탭 필터 | UI 필터에서 'supplier' producer 옵션 노출 — 정책 (Legacy) 과 정합되지 않음 |
| **LOW** | `HubProducer` enum (`packages/types/src/hub-content.ts:17`) | Stable 보호 대상, 의도된 잔존. 12개 import 경로. |
| **LOW** | PLATFORM-CONTENT-POLICY-V1 §3, §6.3 supplier producer 정책 | 이미 Legacy 명문화 완료 (2026-05-23) |
| **LOW** | web-glycopharm / web-k-cosmetics `/supplier/*` RoleNotAvailablePage | 정책상 차단됨, 정렬 완료 |

### 7.2 가장 위험한 잔존 경로 (HIGH 후보)

```text
web-neture / 공급자 로그인
  ↓ SupplierSpaceLayout (Sidebar 메뉴 노출)
  ↓ "Content" > "Library" 클릭 또는 "/supplier/signage/content" 직접 접근
  ↓ 콘텐츠 작성 또는 Signage Hub 탐색
  ↓ POST /api/v1/kpa/supplier/content-submissions (cross-service backend)
  ↓ Operator 승인 (가공 없음)
  ↓ HUB 노출 (visibilityScope='service' 제한)
```

이 경로는:
- **Frontend (web-neture)**: HIGH — UI 진입점 다수 활성
- **Backend (KPA API)**: MEDIUM — Gate 있으나 가공 부재
- **정책**: LOW — 이미 Legacy 명문화

---

## 8. 삭제 / 비활성화 / 전환 후보 목록

본 IR 은 **read-only** — 본 §8 는 후속 cleanup WO 의 입력 자산.

### 8.1 즉시 삭제 후보 (Drift 직접 — UI 측)

| 항목 | 위치 | 권장 조치 |
|------|------|----------|
| web-neture `/supplier/signage/content` 라우트 | `services/web-neture/src/App.tsx:723` | **비활성화 또는 operator-only 로 제한** |
| web-neture SupplierSpaceLayout Content > Library 메뉴 | `components/layouts/SupplierSpaceLayout.tsx:79` | **메뉴에서 제거 또는 read-only 로 전환** |
| web-kpa-society HubSignageLibraryPage 'supplier' 탭 필터 | `pages/pharmacy/HubSignageLibraryPage.tsx:46, 52-56` | **'supplier' 옵션 비활성화 또는 제거** |

### 8.2 점진 전환 후보 (Backend — Legacy 명문화 후 단계적 제거)

| 항목 | 권장 조치 |
|------|----------|
| `POST /api/v1/kpa/supplier/content-submissions` | **Operator Source Ingestion 으로 전환** — Operator 등록 흐름으로 데이터 진입점 이전, 공급자 직접 작성 폐지 |
| `POST /api/v1/kpa/supplier/signage/campaign-requests` | **동일** — Operator 가공 단계 추가 또는 Operator 등록 경로 신설 |

### 8.3 Legacy 유지 (의도적 — Stable 보호)

| 항목 | 사유 |
|------|------|
| `HubProducer` enum `'supplier'` | Stable 보호 대상, 12 import 경로, 단계적 전환 후보 (§10.5 PLATFORM-CONTENT-POLICY-V1) |
| `cms_contents.authorRole='supplier'` 가능성 | 데이터 무결성 유지 — 기존 데이터 보존 |

### 8.4 정렬 완료 (조치 불필요)

| 항목 | 상태 |
|------|------|
| web-glycopharm `/supplier/*` RoleNotAvailablePage | 정책 차단 |
| web-k-cosmetics `/supplier/*` RoleNotAvailablePage | 정책 차단 |
| PLATFORM-CONTENT-POLICY §3, §6.3 Legacy 명문화 | 2026-05-23 정렬 완료 |
| 3-ROLE-FLOW §6.1 Drift 가드 | 2026-05-23 명문화 완료 |
| `neture_supplier_contents` 테이블 + API | WO-O4O-SUPPLIER-CONTENT-REMOVAL-V1 으로 이미 제거 |

---

## 9. 후속 WO 권장 순서

### 9.1 Phase 1 — UI Drift 제거 (즉시)

**`WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1`** — 범위:

- web-neture `/supplier/signage/content` 라우트 비활성화 또는 operator-only 제한
- web-neture SupplierSpaceLayout Content > Library 메뉴 제거/read-only
- web-kpa-society HubSignageLibraryPage 'supplier' 탭 필터 제거

**효과:** 가장 위험한 진입점 (HIGH) 차단. 코드 변경 규모 작음 (라우트·메뉴 정의 수정).

### 9.2 Phase 2 — 백엔드 점진 전환 (사용자 결정 후)

**`IR-O4O-SUPPLIER-CONTENT-OPERATOR-INGESTION-DESIGN-V1`** — Operator Source Ingestion 흐름 설계:

- 공급자 직접 작성 API 폐지 일정 결정
- Operator 등록 화면 설계 (이미 [`Workspace A 화면 설계 IR`](IR-O4O-OPERATOR-WORKSPACE-A-ASSET-INGESTION-DESIGN-V1.md) 후보로 등재)
- 기존 데이터 마이그레이션 전략

**`WO-O4O-SUPPLIER-CONTENT-PRODUCER-BACKEND-DEPRECATION-V1`** — 백엔드 API deprecation:

- `POST /api/v1/kpa/supplier/content-submissions` deprecation 표시
- `POST /api/v1/kpa/supplier/signage/campaign-requests` deprecation 표시
- 일정 후 실제 제거

### 9.3 Phase 3 — 타입 전환 (장기)

**`WO-O4O-HUBPRODUCER-SUPPLIER-ENUM-DEPRECATION-V1`** (가칭):

- HubProducer enum 에서 `'supplier'` 옵션 단계적 제거 또는 명시적 deprecated 표시
- Stable 변경 (별도 WO 승인 필요)
- 후속 영향: 12개 import 경로 모두 검토

### 9.4 권장 진행 순서

```text
Phase 1 (UI cleanup)  — 즉시 진행 가능, 작은 작업 규모
   ↓
사용자 검토 + Workspace A 화면 설계 IR
   ↓
Phase 2 (Backend deprecation) — Workspace A 화면 설계 후
   ↓
Phase 3 (Enum cleanup) — 장기 일정
```

---

## 10. Current Structure vs O4O Philosophy Conflict Check

| 차원 | Canonical | 현재 상태 | 충돌 |
|------|----------|----------|:----:|
| 공급자 = 원천 자료 보유자 (PHILOSOPHY §3.1) | "O4O 내부 직접 Producer 아님" | web-neture UI 측 진입점 다수 활성 + KPA backend API 활성 | **부분 충돌 (HIGH on FE / MEDIUM on BE)** |
| Operator = 자료 등록·AI 가공·큐레이션 (PHILOSOPHY §3.2) | "Operator 가공 + 검수 필수" | Operator 검수만 강제, 가공 API 미존재 | **부분 충돌 (MEDIUM)** |
| 3-ROLE-FLOW §3 Canonical Data Flow | "공급자 → 오프라인 전달 → Operator 등록 → HUB" | 공급자가 직접 API 호출로 cms_contents 작성 | **부분 충돌 (MEDIUM)** |
| 3-ROLE-FLOW §6.1 금지 흐름 | "공급자 → HUB 직접 배포 (Operator 가공 없음)" Drift | KPA backend 경로 명문화된 예외로 처리됨 (§6.3 PLATFORM-CONTENT-POLICY) | **명문화된 예외 — 충돌 해소** |
| PLATFORM-CONTENT-POLICY-V1 §6.3 | "공급자 탭 Legacy / 명문화된 예외" | KPA HubSignageLibraryPage 'supplier' 필터 옵션이 일반 탭처럼 노출 | **부분 충돌 (UI 측 정합 부족)** |
| CONTENT-STABLE-DECLARATION §4-A | HubProducer Stable 보호 | 12 import 경로 그대로 존재 | **충돌 없음 (의도된 Legacy)** |
| 정렬된 서비스 (Glyco / K-Cos) | `/supplier/*` 차단 | RoleNotAvailablePage 강제 | **충돌 없음** |

**종합 판정:** 
- **정책·문서 측: 정렬 완료 (LOW)** — Legacy 명문화 일관됨
- **타입 측: 정렬 완료 (LOW)** — Stable 보호 의도적
- **백엔드 측: 부분 충돌 (MEDIUM)** — Gate 는 있으나 가공 부재. 명문화된 예외로 처리됨
- **프론트엔드 측: 부분 충돌 (HIGH)** — UI 진입점 다수 활성, Canonical 명문화와 정합되지 않음

---

## 11. 검증 항목

| 검증 | 결과 |
|------|------|
| Frontend 4개 서비스 전수 조사 | ✅ §3 |
| Backend API 전수 조사 | ✅ §4 |
| 타입 / 정책 / Stable 조사 | ✅ §5 |
| 문서 잔재 vs 시점 기록 분리 | ✅ §6 |
| HIGH / MEDIUM / LOW 영향도 분류 | ✅ §7 |
| 삭제 / 비활성화 / 전환 후보 목록 | ✅ §8 |
| 후속 WO 권장 순서 (Phase 1/2/3) | ✅ §9 |
| Canonical vs Current 충돌 검증 | ✅ §10 |

---

**작성:** Claude Code (조사)
**상태:** Read-Only IR / 후속 cleanup·deprecation WO 입력 자산 준비 완료
