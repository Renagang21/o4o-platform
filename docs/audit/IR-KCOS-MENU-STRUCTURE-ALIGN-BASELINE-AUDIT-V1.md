# IR-KCOS-MENU-STRUCTURE-ALIGN-BASELINE-AUDIT-V1

> **작업 분류:** Audit / 기준선 조사
> **작업 원칙:** 코드 수정 없음 — 실제 코드 기준 조사
> **선행 IR:** IR-KCOS-HOME-DYNAMIC-PHASE1-COMPLETION-V1
> **감사일:** 2026-04-17

---

## 1. 전체 요약

**조사 목적:**
K-Cosmetics 메뉴를 운영 기준으로 확정하기 위해 현재 상단 내비게이션 구조,
전체 라우트 목록, placeholder 페이지, KPA 비교를 전수 조사한다.

**핵심 결론:**

| 항목 | 현황 |
|------|------|
| 현재 공개 상단 메뉴 | 4개 (홈/커뮤니티/포럼/문의하기) |
| 메뉴 미등록 구현 페이지 | **4개** — `/hub`, `/library/content`, `/services/tourists`, `/b2b/supply` |
| Store Dashboard placeholder | **5개** — products/orders/billing/content/settings |
| 제거 필요 메뉴 | `문의하기` (footer 이동 권장) |
| 추가 필요 메뉴 | `허브`, `콘텐츠` |
| 정책 결정 필요 | `관광객 허브`, `B2B 공급` 상단 노출 여부 |

---

## 2. 현재 메뉴 구조 전수

### 2.1 Header 상단 내비게이션 (공개)

**소스:** `services/web-k-cosmetics/src/components/layouts/Header.tsx`

| 순서 | 메뉴명 | 경로 | 조건 | 페이지 구현 |
|------|--------|------|------|-----------|
| 1 | 홈 | `/` | 항상 | ✅ HomePage |
| 2 | 커뮤니티 | `/community` | 항상 | ✅ CommunityHubPage |
| 3 | 포럼 | `/forum` | 항상 | ✅ ForumHubPage |
| 4 | 문의하기 | `/contact` | 항상 | ✅ ContactPage |
| 5 | 매장 관리 | `/store` | isAuthenticated | ✅ StoreCockpitPage |

**드롭다운 (로그인 시):**
- 대시보드 → 역할 기반 자동 라우팅
- 마이페이지 → `/mypage`
- 로그아웃

### 2.2 메뉴 미등록 실구현 페이지

**현재 상단 메뉴에 없지만 페이지가 실제로 구현되어 있는 것들:**

| 경로 | 컴포넌트 | 내용 | 비고 |
|------|---------|------|------|
| `/hub` | KCosmeticsHubPage | Market Layer 탐색 허브 (CMS 슬롯, B2B, 콘텐츠) | **핵심 미노출** |
| `/library/content` | ContentLibraryPage | 콘텐츠 라이브러리 (공지/가이드/지식/프로모션/뉴스) | **KPA 강의/마케팅 대응** |
| `/services/tourists` | TouristHubPage | 관광객 허브 | Home quickAction 진입점만 있음 |
| `/b2b/supply` | SupplyPage | B2B 공급 카탈로그 | Home quickAction 진입점만 있음 |
| `/platform/stores` | StoresPage | 운영 도구 진입 | Home 진입만 있음 |

**특히 중요한 미노출 페이지:**

- **`/hub` (KCosmeticsHubPage):**
  - `hub-exploration-core` 기반 Market Layer 종합 탐색 페이지
  - CMS 슬롯 연동, B2B 프리뷰, 콘텐츠, 광고 등 포함
  - KPA의 약국 HUB에 해당하는 K-Cosmetics 핵심 탐색 허브
  - 상단 메뉴에 없어서 홈 이외에는 진입 경로가 없음

- **`/library/content` (ContentLibraryPage):**
  - K-Cosmetics 콘텐츠 라이브러리 (`serviceKey=k-cosmetics`)
  - 타입 필터: 전체/공지/가이드/지식/프로모션/뉴스
  - KPA 강의/마케팅 메뉴의 직접 대응 항목
  - 상단 메뉴에 없어서 접근 불가 상태

---

## 3. 전체 라우트 목록

### 3.1 Public Routes (MainLayout)

| 경로 | 페이지 | 인증 | 상태 |
|------|--------|------|------|
| `/` | HomePage | 없음 | ✅ 구현 |
| `/hub` | KCosmeticsHubPage | 없음 | ✅ 구현 (메뉴 미등록) |
| `/community` | CommunityHubPage | 없음 | ✅ 구현 |
| `/library/content` | ContentLibraryPage | 없음 | ✅ 구현 (메뉴 미등록) |
| `/forum` | ForumHubPage | 없음 | ✅ 구현 |
| `/forum/posts` | ForumPage | 없음 | ✅ 구현 |
| `/forum/post/:postId` | PostDetailPage | 없음 | ✅ 구현 |
| `/forum/write` | ForumWritePage | ProtectedRoute | ✅ 구현 |
| `/forum/my-dashboard` | MyForumDashboardPage | ProtectedRoute | ✅ 구현 |
| `/forum/request-category` | ForumRequestCategoryPage | ProtectedRoute | ✅ 구현 |
| `/services/tourists` | TouristHubPage | 없음 | ✅ 구현 (메뉴 미등록) |
| `/b2b/supply` | SupplyPage | 없음 | ✅ 구현 (메뉴 미등록) |
| `/platform/stores` | StoresPage | 없음 | ✅ 구현 (메뉴 미등록) |
| `/platform/stores/products` | ProductsPage | 없음 | ✅ 구현 |
| `/contact` | ContactPage | 없음 | ✅ 구현 |
| `/partners` | PartnerInfoPage | 없음 | ✅ 구현 |
| `/partners/apply` | PartnerApplyPage | 없음 | ✅ 구현 |
| `/mypage` | MyPageHub | ProtectedRoute | ✅ 구현 |
| `/mypage/profile` | MyProfilePage | ProtectedRoute | ✅ 구현 |
| `/mypage/settings` | MySettingsPage | ProtectedRoute | ✅ 구현 |
| `/supplier/*` | RoleNotAvailablePage | 없음 | ⚠️ legacy |
| `/seller/*` | RoleNotAvailablePage | 없음 | ⚠️ legacy |

### 3.2 Store Dashboard (StoreDashboardLayout)

| 경로 | 페이지 | 역할 | 상태 |
|------|--------|------|------|
| `/store` | StoreCockpitPage | operator/admin | ✅ 구현 |
| `/store/local-products` | StoreLocalProductsPage | operator/admin | ✅ 구현 |
| `/store/tablet-displays` | StoreTabletDisplaysPage | operator/admin | ✅ 구현 |
| `/store/channels` | StoreChannelsPage | operator/admin | ✅ 구현 |
| `/store/signage` | StoreSignagePage | operator/admin | ✅ 구현 |
| `/store/interest-requests` | InterestRequestsPage | operator/admin | ✅ 구현 |
| `/store/market-trial` | MarketTrialNetureRedirect | operator/admin | ↗️ Neture 리다이렉트 |
| `/store/products` | StorePlaceholderPage | operator/admin | ⛔ Placeholder |
| `/store/orders` | StorePlaceholderPage | operator/admin | ⛔ Placeholder |
| `/store/billing` | StorePlaceholderPage | operator/admin | ⛔ Placeholder |
| `/store/content` | StorePlaceholderPage | operator/admin | ⛔ Placeholder |
| `/store/settings` | StorePlaceholderPage | operator/admin | ⛔ Placeholder |

### 3.3 Operator / Admin / Partner Dashboard (생략)

운영자/관리자/파트너 대시보드 라우트는 모두 실구현 상태. 메뉴 정렬 대상 아님.

---

## 4. Placeholder / Dead Code 목록

### 4.1 Store Dashboard Placeholder 5개

| 경로 | 메뉴명 | 이유 | 처리 |
|------|--------|------|------|
| `/store/products` | 상품 관리 | StorePlaceholderPage | 메뉴에서 숨김 또는 비활성화 권장 |
| `/store/orders` | 주문 관리 | StorePlaceholderPage | 동일 |
| `/store/billing` | 정산/인보이스 | StorePlaceholderPage | 동일 |
| `/store/content` | 콘텐츠 관리 | StorePlaceholderPage | 동일 |
| `/store/settings` | 설정 | StorePlaceholderPage | 동일 |

**현재 문제:** Store Dashboard 사이드바 메뉴에 이 항목들이 표시되어 클릭 시 "준비 중" 화면을 보게 됨.
메뉴 정렬 WO에서 이 항목들의 노출 여부도 함께 결정해야 함.

### 4.2 Legacy Role 라우트

| 경로 | 상태 |
|------|------|
| `/supplier/*` | RoleNotAvailablePage — legacy role 대응용, 실질 기능 없음 |
| `/seller/*` | RoleNotAvailablePage — 동일 |

이 라우트는 구조적으로 유지할 필요가 있으나, 상단 메뉴 대상 아님.

### 4.3 중복 진입점

| 기능 | 중복 경로 |
|------|---------|
| 운영 도구 진입 | Home quickAction "Products" → `/platform/stores/products` / Header "매장 관리" → `/store` |
| Market Trial | Home quickAction `trial` → Neture / Hero `trial` 슬라이드 → Neture |

중복 자체는 문제 아님. 단, 경로와 레이블이 명확해야 함.

---

## 5. KPA 비교 분석

### 5.1 KPA → K-Cosmetics 메뉴 대응표

| KPA 메뉴 | KPA 경로 | K-Cosmetics 대응 | K-Cosmetics 경로 | 메뉴 등록 |
|---------|---------|----------------|----------------|---------|
| 홈 | `/` | 홈 | `/` | ✅ |
| 약국 HUB | `/hub` | 허브 | `/hub` | ❌ 미등록 |
| 강의/마케팅 | `/lms` | 콘텐츠 | `/library/content` | ❌ 미등록 |
| 포럼 | `/forum` | 포럼 | `/forum` | ✅ |
| — | — | 커뮤니티 | `/community` | ✅ (K-Cosmetics 고유) |
| — | — | 관광객 허브 | `/services/tourists` | ❌ 미등록 |
| — | — | B2B 공급 | `/b2b/supply` | ❌ 미등록 |

### 5.2 KPA 용어 → K-Cosmetics 용어 변환

| KPA 용어 | K-Cosmetics 용어 | 이유 |
|---------|----------------|------|
| 강의/마케팅 | 콘텐츠 | LMS가 아닌 CMS 기반 콘텐츠 라이브러리 |
| 약국 HUB | 허브 | K-Cosmetics Market Layer |
| 내 약국 | 매장 관리 | 이미 적용됨 |
| 약사회 전용 메뉴 | 없음 | K-Cosmetics에 해당 없음 |

### 5.3 K-Cosmetics 고유 메뉴 (KPA에 없음)

| 메뉴 | 경로 | 의미 | 상단 메뉴 필요성 |
|------|------|------|--------------|
| 커뮤니티 | `/community` | 브랜드·매장 커뮤니티 허브 | ✅ 이미 등록됨 |
| 관광객 허브 | `/services/tourists` | Tourist Hub 탐색 | ⚠️ 정책 결정 필요 |
| B2B 공급 | `/b2b/supply` | B2B 공급 카탈로그 | ⚠️ 정책 결정 필요 |

---

## 6. 역할별 메뉴 분기 현황

### 6.1 현재 Header 분기 방식

```
비로그인: 홈 / 커뮤니티 / 포럼 / 문의하기 + [로그인] [회원가입]
로그인:   홈 / 커뮤니티 / 포럼 / 문의하기 / 매장 관리 + [드롭다운]
드롭다운: 대시보드(역할별 라우팅) / 마이페이지 / 로그아웃
```

### 6.2 역할별 대시보드 자동 라우팅

| 역할 | 대시보드 경로 |
|------|------------|
| platform:super_admin / k-cosmetics:admin | `/admin` |
| k-cosmetics:operator | `/operator` |
| k-cosmetics:partner | `/partner` |
| k-cosmetics:supplier / seller | `/` (홈, Neture 관리) |
| 일반 사용자 | `/` |

### 6.3 Store Dashboard 접근 조건

```
역할: k-cosmetics:operator, k-cosmetics:admin, platform:super_admin
경로: /store/*
```

매장 관리 메뉴는 isAuthenticated로 표시하지만, 실제 접근은 역할 Guard가 처리.
일반 로그인 사용자(partner 등)가 접근하면 해당 레이아웃에서 차단.

---

## 7. 권장 최종 메뉴 구조

### 7.1 상단 공개 메뉴 (확정 권장)

| 순서 | 메뉴명 | 경로 | 변경 여부 |
|------|--------|------|---------|
| 1 | 홈 | `/` | 유지 |
| 2 | **허브** | `/hub` | **신규 추가** |
| 3 | **콘텐츠** | `/library/content` | **신규 추가** |
| 4 | 커뮤니티 | `/community` | 유지 |
| 5 | 포럼 | `/forum` | 유지 |

**제거 권장:**
- `문의하기 (/contact)` → Footer로 이동 (상단 메뉴에서 제거)

### 7.2 정책 결정 필요 항목

| 항목 | 옵션 A | 옵션 B |
|------|--------|--------|
| 관광객 허브 (`/services/tourists`) | 상단 메뉴 추가 | Hub 내 진입점 유지 (메뉴 미등록) |
| B2B 공급 (`/b2b/supply`) | 상단 메뉴 추가 | Store Dashboard 진입점 유지 |

**현재 기준 권장:** 두 항목 모두 `/hub` 탐색 허브 내부 진입점으로 유지.
상단 메뉴는 5개 이하로 제한하는 것이 UX 정합성에 유리.

### 7.3 조건부 메뉴 (변경 없음)

| 조건 | 메뉴 | 경로 |
|------|------|------|
| 로그인 (operator/admin) | 매장 관리 | `/store` |

---

## 8. Store Dashboard 메뉴 정리 방향

### 현재 표시 중인 Placeholder 항목 처리

| 경로 | 현재 상태 | 권장 처리 |
|------|---------|---------|
| `/store/products` | StorePlaceholderPage | 메뉴에서 비활성화 (disabled) 또는 숨김 |
| `/store/orders` | StorePlaceholderPage | 동일 |
| `/store/billing` | StorePlaceholderPage | 동일 |
| `/store/content` | StorePlaceholderPage | 동일 |
| `/store/settings` | StorePlaceholderPage | 동일 |

**구현된 Store 메뉴 (유지):**
- 대시보드, 자체 상품 관리, 태블릿 진열, 채널 관리, 사이니지, 관심표현 요청, Market Trial

---

## 9. 구현 범위 제안

### WO-KCOS-MENU-STRUCTURE-ALIGN-V1 권장 범위

**Header 변경:**
1. `허브` 메뉴 추가 → `/hub`
2. `콘텐츠` 메뉴 추가 → `/library/content`
3. `문의하기` 메뉴 → Footer 전용으로 이동 (Header에서 제거)

**Store Dashboard 변경:**
4. Placeholder 5개 항목 → 메뉴에서 숨김 처리 (페이지/라우트 유지, 사이드바 메뉴만 비표시)

**변경하지 않는 것:**
- 라우트 구조 (App.tsx)
- 페이지 컴포넌트
- 드롭다운 구조
- 역할별 대시보드 라우팅
- Footer 구조 (항목 추가는 자유)

---

## 10. Dead Code / 임시 코드 정리 포인트

| 항목 | 위치 | 처리 |
|------|------|------|
| Header `문의하기` 메뉴 | Header.tsx | WO에서 제거 |
| Store 사이드바 placeholder 5개 | COSMETICS_STORE_CONFIG 또는 StoreDashboardLayout | WO에서 비활성화 |
| `/supplier/*`, `/seller/*` RoleNotAvailablePage | App.tsx | 유지 (legacy 대응) |

---

## 11. 다음 작업 대상

**WO-KCOS-MENU-STRUCTURE-ALIGN-V1 — K-Cosmetics 메뉴 구조 정렬**

**구현 범위:**
1. Header에 `허브`, `콘텐츠` 메뉴 추가
2. Header에서 `문의하기` 제거 (Footer 유지)
3. Store Dashboard 사이드바에서 Placeholder 5개 비활성화

**정책 결정 대기 항목:**
- 관광객 허브, B2B 공급의 상단 메뉴 등록 여부 → 이번 WO에서 결정 후 반영 가능

---

*조사 기준: 실제 코드 (추측 없음)*
*참조 파일: Header.tsx, App.tsx, KCosmeticsHubPage.tsx, ContentLibraryPage.tsx, StoreDashboardLayout*
*다음 WO: WO-KCOS-MENU-STRUCTURE-ALIGN-V1*
