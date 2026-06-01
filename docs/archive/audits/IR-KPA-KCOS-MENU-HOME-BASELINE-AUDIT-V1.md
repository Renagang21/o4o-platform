# IR-KPA-KCOS-MENU-HOME-BASELINE-AUDIT-V1

> **작업 분류:** Audit / 기준선 조사
> **작업 원칙:** 코드 수정 없음 — 실제 코드 기준 구조 비교 및 이식 가능성 확정
> **감사일:** 2026-04-17

---

## 1. 전체 요약

**현재 상태 한 줄 요약:**
KPA-Society는 완성도 높은 통합 플랫폼(233개 라우트, 10개 홈 섹션, 동적 API 연동)이고,
K-Cosmetics는 경량화된 알파 버전(70개 라우트, 정적 하드코딩 홈)으로,
두 서비스의 구조와 완성도가 현저히 다르다.

**가장 큰 구조 차이 3가지:**

1. **라우트 규모 차이** — KPA 233개 vs K-Cosmetics 70개 (약 3배). KPA는 다중 역할별 대시보드·Demo 서비스·Admin/Operator 레이아웃 포함.
2. **홈 페이지 완성도** — KPA는 동적 API 연동 10블록 구조, K-Cosmetics는 정적 하드코딩 데이터 기반 슬라이더 + 카드.
3. **기능 범위** — KPA는 커뮤니티/포럼/교육/사이니지/이벤트 모두 구현. K-Cosmetics는 커뮤니티/포럼 부분 구현, 많은 페이지가 `StorePlaceholderPage` 스텁.

---

## 2. 메뉴 구조 비교

### 2.1 상단 내비게이션

| 항목 | KPA-Society | K-Cosmetics |
|------|------------|------------|
| **공개 메뉴** | 홈 / 포럼 / 강의·마케팅 | 홈 / 커뮤니티 / 포럼 / 문의하기 |
| **역할별 조건부 메뉴** | 약국 HUB (pharmacy_owner) / 내 약국 (isStoreOwner) / 운영 대시보드 (operator/admin) | 매장 관리 (isAuthenticated) |
| **사용자 드롭다운** | 마이페이지 / 프로필 / 설정 / 운영·관리 진입점 | 대시보드 / 마이페이지 / 로그아웃 |
| **Super Operator** | 별도 스타일 + 간소화 메뉴 | 없음 |
| **메뉴 항목 수** | 6개 (공개 3 + 역할 3) | 5개 (공개 4 + 역할 1) |

**특징:**
- KPA: 세분화된 역할별 메뉴 분리, 운영/관리 진입점 명확
- K-Cosmetics: 단순 구조, 플레이스홀더 역할 기능 다수

---

### 2.2 Store 사이드바 메뉴

| 항목 | KPA-Society | K-Cosmetics |
|------|------------|------------|
| **메뉴 구조** | 섹션형 (7섹션/15항목) | 플랫 enabledMenus (8개) |
| **섹션 구성** | HOME / 콘텐츠 / 홍보 / 상품·주문 / 매장디스플레이 / 분석 / 설정 | 단순 8항목 나열 |
| **디스플레이 섹션** | 4항목 flat (B2C/채널/사이니지/태블릿) | 없음 |
| **마케팅 분석** | 포함 | 없음 |

**KPA_SOCIETY_STORE_CONFIG 최종 구조:**
```
[무제] 홈 · 약국 정보
[콘텐츠] 자료실 · 블로그
[홍보] QR 관리 · POP 자료
[상품/주문] 상품 관리 · 자체 상품 · 주문 관리
[매장 디스플레이] 매장 진열 상품 · 채널 현황 · 매장 사이니지 · 태블릿 진열
[분석] 마케팅 분석
[설정] 매장 설정 · 레이아웃 빌더
```

**COSMETICS_STORE_CONFIG 현재 구조:**
```
dashboard / products / local-products / channels / orders / billing / content / settings
(플랫 배열, 섹션 없음)
```

---

## 3. 홈 블록 비교

### 3.1 KPA-Society CommunityHomePage (10블록)

| # | 블록명 | 파일 | API | 완성도 | Dead 여부 |
|---|--------|------|-----|--------|----------|
| 1 | HeroBannerSection | components/community/HeroBannerSection | community_ads (hero) | ✅ 완성 | NO |
| 2 | NoticeSection | components/home/NoticeSection | cms_contents (type=notice) | ✅ 완성 | NO |
| 3 | MarketTrialSection | components/home/MarketTrialSection | gateway API (독립 호출) | ✅ 완성 | NO |
| 4 | ActivitySection | components/home/ActivitySection | forumApi + contentApi | ✅ 완성 | NO |
| 5 | EducationSection | components/home/EducationSection | lmsApi (독립 호출) | ✅ 완성 | NO |
| 6 | SignageSection | components/home/SignageSection | signageApi | ✅ 완성 | NO |
| 7 | CommunityServiceSection | components/home/CommunityServiceSection | 정적 | ✅ 완성 | NO |
| 8 | AdSection | components/community/AdSection | community_ads (page) | ✅ 완성 | NO |
| 9 | SponsorBar | components/community/SponsorBar | community_sponsors | ✅ 완성 | NO |
| 10 | FooterLinksSection | components/home/FooterLinksSection | community_quick_links | ✅ 완성 | NO |

---

### 3.2 K-Cosmetics HomePage (슬라이더 + 카드 기반)

| # | 블록명 | 파일 | API | 완성도 | Dead 여부 |
|---|--------|------|-----|--------|----------|
| 1 | HeroSection (슬라이더) | pages/HomePage | 정적 하드코딩 heroSlides[] | ⚠️ 알파 | YES |
| 2 | QuickActionCards | pages/HomePage | 정적 하드코딩 (숫자 하드코딩) | ⚠️ 알파 | YES |
| 3 | NowRunningItems | pages/HomePage | 정적 하드코딩 | ⚠️ 알파 | YES |
| 4 | NoticeList | pages/HomePage | 정적 하드코딩 | ⚠️ 알파 | YES |
| 5 | PartnerList | pages/HomePage | 정적 하드코딩 | ⚠️ 알파 | YES |

> 전체 주석: `"Static Data (운영자 관리 콘텐츠로 대체 예정)"`

---

### 3.3 K-Cosmetics 기존 기능 존재 여부

| 기능 | 존재 여부 | 완성도 | 비고 |
|------|---------|--------|------|
| 커뮤니티 | ✅ | 구현 | CommunityHubPage + ForumHubPage 존재 |
| 포럼 | ✅ | 구현 | ForumHubPage / PostDetailPage / ForumWritePage |
| 강의/LMS | ⚠️ | 부분 | ContentLibraryPage만 있고 실제 LMS 없음 |
| 디지털 사이니지 | ✅ | 구현 | Signage 라우트 + ContentHub |
| 공지/뉴스 | ❌ | 미구현 | HomePage에만 정적 공지 존재 |
| 전체 완성도 | ⚠️ | 알파 v0.8.0 | Hero에 "운영형 알파" 배지 표시 중 |

---

## 4. 이식 대상 목록

### 4.1 이식 가능 (직접 적용 가능)

| 항목 | 출처 | 대상 | 설명 |
|------|------|------|------|
| HomePageBlock 구조 | KPA CommunityHomePage | K-Cosmetics HomePage | 10블록 + API 연동 패턴 |
| NoticeSection | KPA components/home | K-Cosmetics | CMS 기반 공지사항 |
| MarketTrialSection | KPA components/home | K-Cosmetics | Gateway API 독립 호출 |
| SignageSection | KPA components/home | K-Cosmetics | 사이니지 연동 |
| ActivitySection | KPA components/home | K-Cosmetics | 포럼 + 추천 콘텐츠 |
| MenuConfig 섹션형 패턴 | KPA storeMenuConfig.ts | K-Cosmetics | 섹션형 Store 메뉴 구조 |
| Header 역할 기반 메뉴 | KPA Header.tsx | K-Cosmetics | PUBLIC_PATHS + roleMenuItems 패턴 |

---

### 4.2 수정 필요 (서비스별 커스터마이징)

| 항목 | 수정 사항 | 설명 |
|------|---------|------|
| 홈 API 호출 | K-Cosmetics HomePage | homeApi → cosmetics 서비스 API로 변경 |
| 메뉴 라벨 | K-Cosmetics Header | "강의" → "콘텐츠", "약국 HUB" → "마켓플레이스" 등 |
| Store 메뉴 구조 | K-Cosmetics storeMenuConfig | 플랫 → 섹션형 재구성 |
| Quick Links | K-Cosmetics HomePage | 서비스별 바로가기 항목 변경 |

---

### 4.3 제외 대상 (서비스 고유, 이식 불가)

| 항목 | 이유 |
|------|------|
| /demo/* 라우트 | KPA 지부/분회 데모용 전용 |
| /pharmacy/* 라우트 | KPA 약국 경영지원 전용 |
| Admin/Operator 이중 레이아웃 | KPA 지부+플랫폼 구조 전용 |
| 근무약사 업무 (/work) | KPA 약사회 전용 |
| LMS 강의 시스템 | KPA만 완성, K-Cosmetics는 구조 다름 |

---

## 5. Dead Code 후보 목록

### 5.1 KPA-Society

| 항목 | 위치 | 삭제 이유 | 우선순위 |
|------|------|---------|---------|
| /demo/* 전체 라우트 블록 | App.tsx 라인 467-845 | 삭제 대상 주석 존재. 실제 지부/분회 독립화 시 전체 제거 | HIGH |
| DemoLayout 컴포넌트 | components/DemoLayout | Demo 라우트와 함께 제거 대상 | HIGH |
| DemoLayoutRoutes() 함수 | App.tsx | Demo 라우트와 함께 제거 대상 | HIGH |
| /demo/operator/* → /operator 리다이렉트 | App.tsx 라인 498 | 이미 /operator가 정식 라우트 | MEDIUM |
| /intranet/* → /demo/intranet 리다이렉트 | App.tsx 라인 528 | 레거시 호환용 | LOW |
| ServiceCard deprecated badgeType | components/platform/ServiceCard | @deprecated 주석 있음 | LOW |

---

### 5.2 K-Cosmetics

| 항목 | 위치 | 상태 | 우선순위 |
|------|------|------|---------|
| heroSlides[] 정적 데이터 | pages/HomePage.tsx 라인 77-120 | "운영자 관리 콘텐츠로 대체 예정" 주석 | HIGH |
| quickActionCards[] 정적 데이터 | pages/HomePage.tsx 라인 111-152 | 하드코딩 숫자 포함 | HIGH |
| nowRunningItems[] | pages/HomePage.tsx | 정적 | HIGH |
| notices[] | pages/HomePage.tsx | 정적 | HIGH |
| partners[] | pages/HomePage.tsx | 정적 | MEDIUM |
| /store/products → StorePlaceholderPage | App.tsx | 스텁 | MEDIUM |
| /store/orders → StorePlaceholderPage | App.tsx | 스텁 | MEDIUM |
| /store/billing → StorePlaceholderPage | App.tsx | 스텁 | MEDIUM |
| /store/content → StorePlaceholderPage | App.tsx | 스텁 | MEDIUM |
| /store/settings → StorePlaceholderPage | App.tsx | 스텁 | MEDIUM |

---

## 6. 위험 포인트

| # | 위험 | 내용 | 조치 |
|---|------|------|------|
| R1 | K-Cosmetics HomePage 전체 정적 | "알파 v0.8.0" 배지 표시 중 — 운영 상태 부적합 | HOME 동적화 우선 |
| R2 | StorePlaceholderPage 남용 | 5개 Store 라우트 전부 스텁 — 사용자 혼선 | 기능 구현 또는 메뉴 미노출 처리 |
| R3 | KPA /demo/* 블록 혼재 | 실제 서비스와 데모 서비스가 동일 App에 혼재 | 지부 독립화 시 블록 전체 제거 |
| R4 | K-Cosmetics Store Config 플랫 구조 | 섹션형 없이 기능 구분 불명확 | storeMenuConfig 섹션형 전환 |

---

## 7. 다음 단계 제안

### 첫 번째 작업 대상

**WO-KCOS-HOME-DYNAMIC-IMPL-V1 — K-Cosmetics HomePage 동적화**

**이유:**
1. 현재 모든 데이터가 정적 하드코딩 — "운영자 관리 콘텐츠로 대체 예정" 주석이 이미 존재. 즉시 리팩토링 필요.
2. KPA NoticeSection·MarketTrialSection·SignageSection을 직접 이식 가능 — 작업 범위 최소화.
3. HomePage.tsx 단일 파일 수정 — 사이드 이펙트 최소.
4. 사용자 첫 진입점 → 완성도가 가장 즉각적으로 향상됨.

**구체적 작업 단계:**
1. K-Cosmetics용 `homeApi` 생성 (heroAds / pageAds / notices / sponsors / quickLinks)
2. 블록 컴포넌트 분리 (HeroSection / NoticeSection / PartnerSection / MarketTrialSection)
3. 정적 데이터 배열 제거 (heroSlides / notices / partners)
4. KPA 패턴 참조하여 동적 렌더링 전환

---

*조사 기준: 실제 코드 및 파일 구조 (추측 없음)*
*다음 WO: WO-KCOS-HOME-DYNAMIC-IMPL-V1*
