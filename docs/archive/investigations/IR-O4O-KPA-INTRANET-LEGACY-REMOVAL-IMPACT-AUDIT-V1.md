# IR-O4O-KPA-INTRANET-LEGACY-REMOVAL-IMPACT-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**: KPA-Society `pages/intranet/**` + `pages/feedback/**` 의 **legacy removal 가능성 및 영향 범위**
**범위**: KPA-Society 만. GlycoPharm / K-Cosmetics / Neture 는 후속 IR.

**선행 IR**:
- `IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1` — intranet/feedback 5 페이지가 mock data placeholder 임을 식별

**사용자 정책 전제**:
> "약사회 조직 서비스의 잔재이며 실제 서비스가 아니다"

---

## 0. 결론 요약

> **결론: 13/14 페이지는 REMOVE-SAFE (제거해도 ripple impact 없음). 1 페이지(`EventOfferManagePage`) 만 실제 서비스이며 폴더 이동 필요.**

### 핵심 발견

1. **`/intranet/*` 라우트가 App.tsx 에 0건 등록**. IntranetSidebar 메뉴 10개는 모두 dead route (존재하지 않는 경로 참조). 사용자가 정상 navigation 으로 접근 불가능.
2. **`IntranetLayout` / `IntranetSidebar` / `IntranetAuthGuard` 3 컴포넌트 모두 dead code** — 어디서도 import 되지 않음 (index.ts barrel export 만 존재).
3. **`EventOfferManagePage` 가 유일한 실제 서비스** — `pages/intranet/event-offer/` 에 위치하나 실제 routing 은 `OperatorRoutes.tsx` 에서 `/operator/event-offers` 로 등록됨. 폴더 위치만 잘못된 상태.
4. **모든 intranet/feedback 페이지는 외부 import 0건** — 제거 시 다른 영역에 ripple 없음.
5. **DashboardPage 만 실제 backend 호출 1건 보유** (`cmsApi.getSlots('intranet-hero')`) — 그러나 라우트 미등록으로 접근 불가능.

### Removal 분류

| 카테고리 | 카운트 | 비고 |
|---|:---:|---|
| **REMOVE-SAFE** (외부 의존성 0건, 라우트 미등록) | **13** | 모든 intranet pages + 모든 feedback pages |
| **KEEP-REAL-SERVICE (단, 이동 필요)** | **1** | `EventOfferManagePage` — `pages/intranet/event-offer/` → `pages/operator/event-offer/` 권장 |
| **REMOVE-WITH-DEPENDENCY-CLEANUP** | 0 | 없음 (모든 의존성이 intranet 내부에 contained) |

### 부수 cleanup (intranet 전체 제거 시)

- `components/intranet/` 8 컴포넌트 dead code → 제거 가능
- `types/mainpage.ts`, `types/feedback.ts` → intranet/feedback 전용 → 제거 가능
- `IntranetSidebar.tsx` 의 10개 메뉴 항목 → 제거 가능 (단, 어차피 sidebar 자체가 unused)

---

## 1. Intranet 페이지 인벤토리 (11 파일)

| 파일 | 라우트 등록 | 메뉴 노출 | 백엔드 연결 | Mock data | 외부 import | 분류 |
|---|:---:|:---:|---|:---:|:---:|---|
| `DashboardPage.tsx` | ❌ | ❌ (실제 라우트 없음) | ⚠️ CMS hero slot 1건 | ✅ 나머지 모두 | 0 | **REMOVE-SAFE** |
| `NoticeListPage.tsx` | ❌ | ⚠️ sidebar(dead) | ❌ | ✅ 5건 hardcoded | 0 | **REMOVE-SAFE** |
| `NoticeDetailPage.tsx` | ❌ | ❌ (NoticeList 내부 링크만) | ❌ | ✅ | 0 | **REMOVE-SAFE** |
| `NoticeWritePage.tsx` | ❌ | ❌ (어디서도 링크 없음) | ❌ `toast.info('UI 데모')` | ✅ form-only | 0 | **REMOVE-SAFE** |
| `SchedulePage.tsx` | ❌ | ⚠️ sidebar(dead) | ❌ | ✅ 6건 hardcoded | 0 | **REMOVE-SAFE** |
| `MeetingListPage.tsx` | ❌ | ⚠️ sidebar(dead) | ❌ | ✅ 5건 hardcoded | 0 | **REMOVE-SAFE** |
| `MeetingDetailPage.tsx` | ❌ | ❌ (MeetingList 내부 링크만) | ❌ | ✅ | 0 | **REMOVE-SAFE** |
| `DocumentListPage.tsx` | ❌ | ⚠️ sidebar(dead) | ❌ | ✅ 5건 hardcoded | 0 | **REMOVE-SAFE** |
| `SettingsPage.tsx` | ❌ | ⚠️ sidebar(dead, 권한 게이트) | ❌ form submit 핸들러 없음 | ✅ | 0 | **REMOVE-SAFE** |
| `OperatorDashboardPage.tsx` | ❌ | ⚠️ sidebar(dead, 권한 게이트) | ❌ (API 시도하나 endpoint 없음) | ✅ | 0 | **REMOVE-SAFE** |
| `event-offer/EventOfferManagePage.tsx` | ✅ `/operator/event-offers` (OperatorRoutes L132) | ❌ (operator sidebar) | ✅ eventOfferAdminApi 전체 CRUD | ❌ | **1** (`OperatorRoutes.tsx`) | **KEEP-REAL-SERVICE (이동 필요)** |

### 주요 검증 결과

- **App.tsx 의 `/intranet` 라우트 패턴**: **0건** (직접 grep 으로 확인)
- **EventOfferManagePage** 는 `pages/intranet/event-offer/` 에 위치하지만 [routes/OperatorRoutes.tsx:28](services/web-kpa-society/src/routes/OperatorRoutes.tsx#L28) 에서 import 되어 `/operator/event-offers` 라우트로 노출 — **유일한 실제 서비스**.

---

## 2. Feedback 페이지 인벤토리 (3 파일)

| 파일 | 라우트 등록 | 메뉴 노출 | 백엔드 연결 | Mock data | 외부 import | 분류 |
|---|:---:|:---:|---|:---:|:---:|---|
| `FeedbackListPage.tsx` | ❌ | ⚠️ sidebar(dead, "개발용" 라벨) | ❌ | ✅ `SAMPLE_POSTS` 상수 | 0 | **REMOVE-SAFE** |
| `FeedbackDetailPage.tsx` | ❌ | ❌ (List 내부 링크만) | ❌ `// await api.post(...)` 주석 | ✅ | 0 | **REMOVE-SAFE** |
| `FeedbackNewPage.tsx` | ❌ | ❌ (List 내부 링크만) | ❌ `setTimeout(...500ms)` simulate | ✅ form-only | 0 | **REMOVE-SAFE** |

Feedback 영역은 **백엔드/라우트/메뉴 모두 미연결**. IntranetSidebar 의 "테스트 피드백" 메뉴는 dead route. 명시적으로 "개발용" 으로 라벨링됨.

---

## 3. 공유 인프라 (components/intranet/)

| 컴포넌트 | 직접 import 처 | 상태 |
|---|---|---|
| `IntranetHeader.tsx` | intranet/ 10개 페이지 내부 only | intranet 페이지 제거 시 dead |
| `IntranetLayout.tsx` | **0건** (index.ts barrel export 외 사용처 없음) | **이미 dead code** |
| `IntranetSidebar.tsx` | IntranetLayout 만 (IntranetLayout 자체가 dead) | **이미 dead code (간접)** |
| `IntranetAuthGuard.tsx` | **0건** | **이미 dead code** |
| `sections/HeroSection`, `NewsSection`, `PartnerLinksSection`, `PromoCardsSection` | DashboardPage 만 | DashboardPage 제거 시 dead |
| `types/mainpage.ts` | DashboardPage + intranet sections | intranet 제거 시 dead |
| `types/feedback.ts` | feedback/ 3개 페이지 only | feedback 제거 시 dead |

### 핵심 사실

> **`IntranetLayout` / `IntranetSidebar` / `IntranetAuthGuard` 는 이미 dead code.** App.tsx 어디에서도 import 되지 않음 — barrel export 만 존재. 즉 "intranet 의 layout 자체가 한 번도 wiring 되지 않았다".

이는 intranet 영역이 **개발 단계에서 중단된 feature** 라는 강한 신호.

---

## 4. 라우트 & 메뉴 등록 현황

### 4-1. App.tsx 의 `/intranet/*` 라우트

**결과: 0건.**

grep 으로 App.tsx 의 `intranet` 키워드 검색 시 매칭 1건만 발견:
- L83 의 주석 `WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1 ... use /intranet/signage/content for community` — 사용 안내 주석에 불과, 실제 라우트 아님 (이마저도 OperatorRoutes.tsx 내부 comment).

### 4-2. IntranetSidebar 메뉴 (`components/intranet/IntranetSidebar.tsx`)

10개 메뉴 항목, **전부 dead route**:

```typescript
const menuItems: MenuItem[] = [
  { path: '',                label: '홈',              icon: '🏠' },
  { path: 'notice',          label: '공지',            icon: '📢' },
  { path: 'schedule',        label: '일정',            icon: '📅' },
  { path: 'documents',       label: '문서',            icon: '📁' },
  { path: 'signage/content', label: '안내 영상 · 자료', icon: '📹' },
  { path: 'meetings',        label: '회의',            icon: '📋' },
  { path: 'event-offers',    label: '이벤트',          icon: '🛒', roles: [...] },
  { path: 'operator',        label: '운영자 대시보드', icon: '📊', roles: [...] },
  { path: 'feedback',        label: '테스트 피드백',   icon: '💬' }, // (개발용)
  { path: 'settings',        label: '조직 설정',       icon: '⚙️', roles: [...] },
];
```

하지만 **IntranetSidebar 자체가 어디서도 import 되지 않으므로** 이 메뉴는 사용자에게 노출되지 않음. 모든 dead route 는 실질적으로 보이지 않음.

### 4-3. OperatorRoutes 의 EventOfferManagePage 사용

[`services/web-kpa-society/src/routes/OperatorRoutes.tsx:28`](services/web-kpa-society/src/routes/OperatorRoutes.tsx#L28):
```typescript
import { EventOfferManagePage } from '../pages/intranet/event-offer';
```

L132:
```typescript
<Route path="event-offers" element={<EventOfferManagePage />} />
```

→ `/operator/event-offers` 로 정상 노출. **실제 서비스**.

---

## 5. 백엔드 API 존재 여부

| 도메인 | 백엔드 라우트 | 상태 |
|---|---|---|
| intranet/notices | `/api/v1/kpa/notices` 존재하나 일반 공지 (CMS) | intranet 전용 아님 — intranet/NoticeListPage 는 사용 안 함 |
| intranet/meetings | 없음 | ❌ |
| intranet/documents | 없음 | ❌ |
| intranet/schedule | 없음 | ❌ |
| intranet/feedback | 없음 | ❌ |
| intranet/settings | 없음 | ❌ |
| intranet-hero (CMS slot) | `/api/v1/cms/slots` 존재 | DashboardPage 에서만 사용 |
| event-offers (operator) | `eventOfferAdminApi` 전체 CRUD | ✅ EventOfferManagePage 정상 사용 |

→ DashboardPage 의 CMS slot 외 모든 intranet/feedback 페이지는 **백엔드 연결 0건**.

---

## 6. 제거 위험도 / Blast Radius

### 6-1. 13 페이지 일괄 제거 시 영향

| 항목 | 영향도 | 비고 |
|---|:---:|---|
| App.tsx 라우트 break | **low** | 어차피 라우트 미등록 — break 할 라우트 자체가 없음 |
| 메뉴 break | **low** | IntranetSidebar 가 unused — 메뉴 영향 시 노출되지 않음 |
| 외부 import break | **low** | 외부에서 import 하는 곳 0건 |
| Shared component 영향 | **low** | components/intranet/ 도 dead 또는 intranet-only |
| build break | **low** | TypeScript 빌드 영향 없음 |
| 실제 사용자 영향 | **low** | 라우트 미등록으로 접근 불가능 — 사용자가 인지조차 못 함 |

### 6-2. EventOfferManagePage 단독 처리

- **현재 위치**: `pages/intranet/event-offer/`
- **권장 위치**: `pages/operator/event-offer/` (operator 컨텍스트로 명확화)
- **이동 시 영향**: OperatorRoutes.tsx L28 import 경로 1줄 수정만 필요
- **이동 risk**: low

---

## 7. 정책 정합성 분석

| 기준 | 결과 |
|---|---|
| 현재 O4O 철학과 정합성 | ❌ — "약사회 조직 내부 도구" 컨셉, 현재 KPA-Society 는 약사 커뮤니티 서비스로 pivot |
| forum/content/resources 와 역할 중복 | ✅ — 공지/일정/문서는 forum + content + resources 로 모두 대체 가능 |
| 커뮤니티 서비스와 충돌 | ⚠️ — `/intranet/feedback` 은 사용자 피드백 채널이나 실제 운영 안 됨, 별도 채널(설문/문의 등) 사용 |
| 유지 가치 | **low** (DashboardPage 의 hero slot 외) |
| 제거 권장 | ✅ **yes** |

---

## 8. 제거 우선순위 / 단계

### Phase 1 — 메뉴 라우트 dead reference 제거 (사용자 영향 0)

대상: IntranetSidebar.tsx (어차피 unused 이나 명시적 cleanup)

→ 매우 low risk. 하지만 IntranetSidebar 자체를 제거하는 것이 더 간단.

### Phase 2 — EventOfferManagePage 이동

`pages/intranet/event-offer/` → `pages/operator/event-offer/`

OperatorRoutes.tsx L28 import path 갱신.

→ **intranet/ 폴더 전체 제거의 prerequisite**.

### Phase 3 — intranet/ 전체 제거

대상:
- `pages/intranet/` 폴더 전체 (event-offer/ 제외, Phase 2 후)
- `pages/feedback/` 폴더 전체
- `components/intranet/` 폴더 전체 (IntranetHeader/Layout/Sidebar/AuthGuard + sections/)
- `types/mainpage.ts`
- `types/feedback.ts`

→ low risk (외부 의존성 0건 확인됨).

### Phase 4 — 백엔드 dead route cleanup (선택)

- `apps/api-server/src/routes/**` 에서 intranet-hero 관련 CMS slot 외에는 영향 없음
- `intranet-hero` CMS slot 자체는 다른 페이지에서 재사용 가능 — 즉시 제거하지 않아도 무방

→ scope 외, optional.

---

## 9. REMOVE-SAFE 판정 근거 종합

다음 조건이 동시에 만족되어 **13/14 페이지는 즉시 제거 가능**:

✅ App.tsx 의 `/intranet/*` 라우트 등록 **0건** → 사용자가 접근 불가능
✅ IntranetSidebar 자체가 unused → 메뉴 노출도 안 됨
✅ 외부 페이지/서비스에서 import **0건** → ripple 없음
✅ 백엔드 API 의존성 1건만 (CMS hero slot, 일반 기능) → 의존성 정리 부담 거의 없음
✅ TypeScript build clean (단순 파일 삭제 + 미사용 import 정리)
✅ 사용자 정책: "약사회 조직 서비스 잔재, 실제 서비스 아님"

**Conditionals**: EventOfferManagePage 만 폴더 이동 후 진행.

---

## 10. 위험 신호 / 추가 결정 사항

| # | 항목 | 비고 |
|---|---|---|
| 1 | **`EventOfferManagePage` 폴더 위치 misleading** | `pages/intranet/event-offer/` 에 있으나 실제는 operator 서비스. 폴더 이동 결정 필요 |
| 2 | **`DashboardPage` 의 CMS hero slot 사용 여부** | `intranet-hero` slot 이 다른 어떤 곳에서 reuse 되고 있다면 backend slot 자체는 보존. 단 DashboardPage 페이지 자체는 제거 가능 |
| 3 | **메뉴 명칭 "테스트 피드백 (개발용)"** | 명시적으로 개발 임시였음을 시사 — 제거 정책 명확성에 보탬 |
| 4 | **약사회(KPA) 도메인 다른 곳에 organization 컨셉 잔존 여부** | `useOrganization` hook 이 IntranetHeader 에서 사용됨 — 다른 곳에서도 사용 시 hook 자체는 보존 (intranet 외부에서 사용 가능성 확인 필요, 본 IR scope 외) |
| 5 | **`pages/admin/KpaAdminDashboardPage` 와 `KpaOperatorDashboardPage`** | 별도 admin/operator 대시보드 이미 존재 — intranet/OperatorDashboardPage 와 역할 명확히 분리 |

---

## 11. 본 IR 범위 외 (후속)

- `useOrganization` hook 의 intranet 외부 사용 여부 audit (Phase 3 진행 전 확인 권장)
- backend CMS `intranet-hero` slot 의 모든 consumer 확인 (slot 보존 여부 결정)
- GlycoPharm / K-Cosmetics / Neture 에 동일 패턴 (intranet residue) 존재 여부 audit
- 후속 WO 작성 (`WO-O4O-KPA-INTRANET-LEGACY-CLEANUP-V1` 등) — 본 IR 단계 외

---

## 12. 참조

### 인벤토리 (intranet)
- `services/web-kpa-society/src/pages/intranet/DashboardPage.tsx`
- `services/web-kpa-society/src/pages/intranet/NoticeListPage.tsx`
- `services/web-kpa-society/src/pages/intranet/NoticeDetailPage.tsx`
- `services/web-kpa-society/src/pages/intranet/NoticeWritePage.tsx`
- `services/web-kpa-society/src/pages/intranet/SchedulePage.tsx`
- `services/web-kpa-society/src/pages/intranet/MeetingListPage.tsx`
- `services/web-kpa-society/src/pages/intranet/MeetingDetailPage.tsx`
- `services/web-kpa-society/src/pages/intranet/DocumentListPage.tsx`
- `services/web-kpa-society/src/pages/intranet/SettingsPage.tsx`
- `services/web-kpa-society/src/pages/intranet/OperatorDashboardPage.tsx`
- `services/web-kpa-society/src/pages/intranet/event-offer/EventOfferManagePage.tsx` ⭐ KEEP

### 인벤토리 (feedback)
- `services/web-kpa-society/src/pages/feedback/FeedbackListPage.tsx`
- `services/web-kpa-society/src/pages/feedback/FeedbackDetailPage.tsx`
- `services/web-kpa-society/src/pages/feedback/FeedbackNewPage.tsx`

### 인벤토리 (components/intranet)
- `services/web-kpa-society/src/components/intranet/IntranetHeader.tsx`
- `services/web-kpa-society/src/components/intranet/IntranetLayout.tsx` (dead)
- `services/web-kpa-society/src/components/intranet/IntranetSidebar.tsx` (dead, contains 10 dead-route 메뉴)
- `services/web-kpa-society/src/components/intranet/IntranetAuthGuard.tsx` (dead)
- `services/web-kpa-society/src/components/intranet/sections/*`

### 라우터 / 라우트
- `services/web-kpa-society/src/App.tsx` (`/intranet` 라우트 0건 확인)
- `services/web-kpa-society/src/routes/OperatorRoutes.tsx` L28, L132 (EventOfferManagePage 사용)

### 연관 IR
- `IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1` (intranet/feedback mock data 식별)

---

*조사 전용 — 코드/DB 수정 없음. 본 IR 단계에서 후속 WO 작성 금지 (사용자 지시).*
