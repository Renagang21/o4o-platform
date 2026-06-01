# IR-O4O-KPA-VALUE-GUIDE-ROLE-UTILIZATION-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> O4O / KPA-Society 사용자 가치 전달 체계 구축을 위한 1차 조사. **"기능 → 어떻게 쓰는가"** 대신 **"내 역할 → 무엇을 얻는가 → 어떻게 활용하는가"** 관점으로 현재 구현·Guide·메인 UX 를 audit. 사용자가 "KPA = 평범한 커뮤니티" 로 오해하는 구조적 원인 확정과 추천 Value Guide 구조 제안.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only, 4 병렬 Explore agent 통합 합성)
- **참조 SSOT (Priority Chain):**
  - [O4O-BUSINESS-PHILOSOPHY-V1](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) — 사업 철학 SSOT (§3 참여 주체 / §4 Canonical Flow / §5 HUB 철학 / §6 AI 역할 / §8 핵심 명제)
  - [O4O-3-ROLE-FLOW-BASELINE-V1](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) — 3자 Canonical Flow SSOT (§2 책임 매트릭스 / §3 데이터 흐름 / §5 AI 개입 / §6 Drift)
  - [O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) — 5 Workspace UX (A 자료 등록 / B AI 작업 / C 큐레이션 / D 매장 지원 / E 운영 수익)
  - [O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1](../baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) — HUB 콘텐츠 게시 표준
- **검증 환경:** local repo, origin/main 와 0 commits 차이
- **사전 동기화:** `git pull origin main` (Already up to date). 평행 세션 staged 작업은 영향 없음.
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 결론 — 한 줄 요약 + 핵심 그림

### 0.1 한 줄 결론

> **O4O 의 핵심 가치 명제 6 개 중 "AI 활용 (C)" 한 가지만 의미 있게 전달되고, 운영자가 매장을 지원하는 생태계 (D) 와 공통 인프라 + 서비스 독립 (E) 은 사실상 0% 노출. 결과로 KPA 사용자는 첫 화면에서 "약사 커뮤니티 + 부속 약국 도구" 로 인식하며, Philosophy 의 정의 ("정보를 실행 경쟁력으로 전환하는 플랫폼") 와 UI 사이에 구조적 격차가 존재.**

### 0.2 핵심 그림 — 한 페이지 요약

| 영역 | 현재 상태 | Philosophy 정합 |
|---|---|:---:|
| **로그인 직후 첫 화면** | `CommunityHomePage` Hero = "약사 커뮤니티와 약국 경영 서비스를 한 곳에서" / 5 카드 중 포럼 첫 번째 | ❌ |
| **메인 네비게이션** | "커뮤니티" 단일 진입 (가치명 0, 기능명 4-5개) | ❌ |
| **공급자 역할 가시화** | 메뉴/카피 0% | ❌ |
| **운영자 역할 가시화** | "약국 운영 허브" 라벨만, "운영자가 나를 지원" 메시지 부재 | ❌ |
| **HUB 철학** | "약국 운영 허브" 라벨 존재, "실행 지원 공간" 메시지 부재 | △ 20% |
| **AI 역할** | `/guide/features/content`, `/guide/features/signage` 에서 명시 | ✅ 70% |
| **3자 협력 흐름** | Philosophy/Guide 에는 명시, 메인 UI 에는 거의 부재 | ❌ 10% |
| **현재 Guide 구조** | 14 page, 기능 중심 8 카테고리 (포럼·강의·콘텐츠·자료실·설문·매장·사이니지·QR) | △ 30% |
| **About 페이지** | 역할별 가치를 분리 담당 (이상적), 단 진입이 후순위 | ⚪ 보조적 |

### 0.3 역할별 활용 가능성 종합 점수

| 역할 | 점수 | 핵심 진단 |
|---|:---:|---|
| **매장 경영자** (store_owner) | **70/100** | 기본 운영 도구 (QR / POP / 블로그 / 사이니지 / 상품 마스터) 완성. **단 "이 자료가 운영자 추천인가 공급자 원본인가" 구분 부재, 매장별 맞춤 자료 0** |
| **서비스 운영자** (kpa:operator) | **35/100** ⚠️ | Workspace A (자료등록), B (AI작업), D (매장지원), E (수익모델) **4 영역 미구현**. 현재 운영자 ≈ "포럼·LMS·사이니지 관리자" 수준 |
| **커뮤니티 참여자** (forum_member / pharmacist) | **65/100** | 포럼·LMS·설문은 완성. **현장 노하우 환류 경로 부재 + 감사/포인트 미작동 + 사용자 콘텐츠 생산 강사만** |

### 0.4 결정 필요 영역 (즉시 / 별건)

| # | 영역 | 분류 |
|---|---|:---:|
| 1 | 메인 메뉴 + Hero 의 "가치명" 도입 (커뮤니티 라벨 + 카피 재설계) | **즉시** |
| 2 | 역할별 Value Guide 신설 (`/guide/for/{store-owner, operator, member}`) | **별건 WO** |
| 3 | 운영자 Workspace A·B·D·E 의 구현 vs 보류 정책 결정 | **별건 IR** (큰 결정) |
| 4 | 커뮤니티 → HUB 환류 경로 (포럼 게시물 → 매장 자산) 신설 여부 | **별건 IR** |
| 5 | 4 service Hero 메시지 통일성 점검 (Neture 가 더 잘 노출 — KPA 와 격차) | **별건 IR** |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 (0 commits 차이) |
| 조사 방법 | 4 병렬 Explore agent — (1) Philosophy SSOT + 로그인 직후 화면 / (2) 3 역할별 활용 매트릭스 / (3) 현재 Guide 구조 / (4) 가치 전달 격차 |
| 조사 범위 | `services/web-kpa-society/src/**` + `docs/baseline/O4O-*` + `packages/shared-space-ui/src/guide/copy/kpa.ts` (Guide 정적 카피) + 4 service 비교 (Neture/GP/K-Cos) |

---

## 2. 산출물 1 — O4O 철학 SSOT 핵심 명제 직접 인용

본 조사의 기준선. 사용자에게 전달되어야 할 핵심 명제들.

### 2.1 O4O 정체성 정의

**[O4O-BUSINESS-PHILOSOPHY-V1.md:30-55](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md)**

```
O4O 는: Online for Offline

오프라인 공간을 가진 사업자가 더 경쟁력 있게 사업을 운영하도록 지원하는 플랫폼 철학.

핵심 목표:
- 좋은 제품 확보
- 좋은 정보 확보
- 매장 실행 역량 강화
- 고객 서비스 강화
- 운영 효율 강화
- AI 활용 경쟁력 확보
```

### 2.2 최우선 원칙 (§8)

**[O4O-BUSINESS-PHILOSOPHY-V1.md:353-363](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md)**

```
O4O는:

정보를 제공하는 플랫폼이 아니다.

정보를
실행 경쟁력으로
전환하는 플랫폼이다.
```

→ **본 IR 의 모든 평가 기준선.** 현재 KPA UI 가 "정보 수신 플랫폼" 수준에 머무는지, "실행 전환 플랫폼" 으로 인식되는지가 핵심 질문.

### 2.3 3 자 역할 정의 (§3)

| 역할 | 정의 (Philosophy §3) | KPA 매핑 |
|---|---|---|
| **공급자 (Supplier)** | 제품과 원천 자료를 가진 사업 주체. 제품·브랜드·상품 정보·마케팅 원본 제공. **O4O 내부 Producer 직접 진입 금지** (오프라인 → Operator 등록) | 제약사 / 약품 제조사 |
| **운영사업자 (Operator)** | O4O 위에서 실제 사업을 운영하는 사업 주체. "공급자 자료 + 커뮤니티 데이터 + AI + 운영 경험 + 현장 이해" 를 활용하여 **매장 실행 자산 생산·구성·운영** | KPA 약사회 운영진 |
| **매장 (Store)** | 오프라인 실행 주체. 콘텐츠 생산이 아니라 **실행**이 핵심 | 약국 (store_owner) |
| **커뮤니티 (Community)** | 집단 경험과 현장 데이터를 만드는 공간. 경험·질문·강의·자료·포럼. **Operator 가 큐레이션 후 활용 가능** | 일반 약사·직원 (forum_member) |

### 2.4 Canonical Flow (§4)

```
공급자 → 운영사업자 → AI 활용·보완·큐레이션·구성 → 매장 HUB → 매장 실행 → 고객 경험 개선
                                                            ↑
                                                   커뮤니티 데이터 환류
```

### 2.5 HUB 철학 (§5)

```
매장 HUB 는 자료 저장소가 아니다.

매장 HUB 는: 매장 실행 지원 공간 이다.
```

### 2.6 AI 역할 (§6)

```
AI 는 판단과 실행을 보조한다.
AI 책임: 정리 / 구성 / 요약 / 추천 / 초안 생성 / 패턴 분석.

AI 는:
- 공급자 역할 대체 X
- 운영사업자 역할 대체 X
- 매장 역할 대체 X

AI 는 경쟁력 증폭 도구다.
```

### 2.7 사용자에게 전달되어야 할 핵심 명제 6 (본 IR 기준선)

| # | 명제 | 출처 |
|---|---|---|
| **A** | 소규모 사업자가 경쟁력을 갖추는 플랫폼 ("직원이 많지 않아도" 가능) | §1, §2 |
| **B** | 공급자 / 운영사업자 / 매장 3자 협력 구조 (HUB 철학) | §3, §4, §5 |
| **C** | AI 를 통한 콘텐츠 / 자료 제작 활용 (경쟁력 증폭) | §6 |
| **D** | 운영자가 매장을 지원하는 생태계 | §3.2 |
| **E** | 공통 인프라 + 서비스별 독립 (KPA/Neture/GP/K-Cos) | §1, §9 |
| **F** | 단순 정보 커뮤니티가 아닌 실행 자산 플랫폼 | §5, §8 |

---

## 3. 산출물 2 — 로그인 직후 사용자가 보는 화면 구조

### 3.1 PostLoginRedirect 정책

**[services/web-kpa-society/src/App.tsx:304-368](../../services/web-kpa-society/src/App.tsx#L304-L368) + [services/web-kpa-society/src/config/dashboard.ts:35-70](../../services/web-kpa-society/src/config/dashboard.ts#L35-L70)**

```ts
KPA_DASHBOARD_MAP = {
  'platform:super_admin': '/admin',
  'kpa:admin':            '/admin',
  'kpa:operator':         '/operator',
};
```

- 운영 역할 (admin / operator) → 자동 dashboard 진입
- **일반 사용자 (강사 / store_owner / forum_member) → 자동 이동 없음, 메인 (CommunityHomePage) 유지**

### 3.2 일반 사용자가 보는 첫 화면 = CommunityHomePage

**[services/web-kpa-society/src/App.tsx:550](../../services/web-kpa-society/src/App.tsx#L550) — Route path="/"**

**Hero ([CommunityHomePage.tsx:207-281](../../services/web-kpa-society/src/pages/CommunityHomePage.tsx#L207-L281)):**

```ts
title: '약사 커뮤니티와 약국 경영 서비스',
subtitle: '약사 커뮤니티와 약국 경영 서비스를 한 곳에서',
```

**5 AppEntry 카드 (순서 그대로):**

```ts
1. 포럼      — "동료 약사와 질문·토론으로 전문성을 높이세요"
2. 강의      — "보수교육·세미나를 온라인으로 수강하세요"
3. 콘텐츠    — "플랫폼 콘텐츠를 검색하고 활용하세요"
4. 디지털 사이니지 — "약국 디지털 미디어를 관리하세요"
5. 자료실    — "자료를 저장하고 AI 작업에 활용하세요"
```

### 3.3 GlobalHeader 메뉴 ([navigation.ts:18-43](../../services/web-kpa-society/src/config/navigation.ts#L18-L43))

```ts
KPA_BASE_NAV = [
  { label: '커뮤니티', href: '/' },   // 항상 노출
];

KPA_CONTEXTUAL_NAV = [
  { label: '내 약국',       href: '/store',     visibleWhen: 'storeOwner' },
  { label: '약국 운영 허브', href: '/store-hub', visibleWhen: 'storeOwner' },
  { label: 'About',         href: '/about' },
];
```

→ 항상 노출 = **"커뮤니티"** 1 개. "내 약국" / "약국 운영 허브" 는 `storeOwner` 역할 가진 사용자에게만 노출. 즉 일반 약사/직원은 "커뮤니티" 1 메뉴만 인식.

### 3.4 ForumServicePage Hero ([services/ForumServicePage.tsx:13-15](../../services/web-kpa-society/src/pages/services/ForumServicePage.tsx#L13-L15))

```ts
title="약사 포럼"
subtitle="약사를 위한 전용 커뮤니티"
```

→ **"포럼 = 커뮤니티" 라는 명시적 정의**. Philosophy 의 "커뮤니티 = 경험·질문·강의·자료·포럼" 정의가 사용자 UI 에서는 "포럼" 단일로 축소됨.

### 3.5 사용자 인지 경로 (코드 인용 기반 reconstruction)

```
로그인
  ↓
PostLoginRedirect → (일반 사용자는 이동 없음)
  ↓
첫 화면: CommunityHomePage
  ↓
GlobalHeader: "커뮤니티" 한 단어 + (운영자/매장 메뉴는 역할 기반 숨김)
  ↓
Hero: "약사 커뮤니티와 약국 경영 서비스"
  ↓
5 카드: 포럼 → 강의 → 콘텐츠 → 사이니지 → 자료실 (포럼 첫 카드)
  ↓
사용자 인식: "KPA = 포럼 중심의 약사 커뮤니티 + 부속 도구"
  ↓
O4O 핵심 (3자 협력 / HUB 실행 지원 / 운영자 매장 지원) — 미인지
```

---

## 4. 산출물 3 — 6 가치 명제별 전달도 평가

| # | 가치 명제 | 전달도 | 근거 |
|:---:|---|:---:|---|
| **A** | 소규모 사업자 경쟁력 | **30% 부분** | Philosophy §1-2 / Guide intro 에 명시. 메인 Hero / 메뉴 0% — "직원이 많지 않아도" 메시지 부재 |
| **B** | 3자 협력 구조 (HUB) | **40% 부분** | Guide intro/structure 에 명시. 메인 메뉴/카피에 "공급자"·"운영자" 0%. About 에서 4단계 흐름은 표시되나 "공급자 → 운영자 → 매장" 삼각형은 미시각화 |
| **C** | AI 활용 | **70% 전달** | `/guide/features/content` "AI 로 만들기" + `/guide/features/signage` "AI 활용 기준" 명시. 단 메인 메뉴에 "AI" 라벨 0 — 미인지 사용자 가능 |
| **D** | 운영자가 매장 지원하는 생태계 | **0% 미전달** | 메뉴/대시보드/카피에 "운영자가 나를 지원" 메시지 0. "약국 운영 허브" 라벨만, "그곳에서 운영자가 무엇을 지원하는가" 불명시 |
| **E** | 공통 인프라 + 서비스별 독립 | **5% 미전달 (개발자만)** | Frozen Core 패키지로 코드 레벨 적용. 사용자 메뉴/Hero 에 "공통 플랫폼 위 다양한 서비스" 메시지 0 |
| **F** | 실행 자산 플랫폼 (vs 정보 커뮤니티) | **45% 부분** | About / Guide usage 7단계 에 명시. 메인 메뉴 첫 진입 = "커뮤니티" → 정보 인상 우세 |

### 4.1 메뉴 단어 기능명 / 가치명 분류

| 메뉴 이름 | 분류 | 사용자 인상 |
|---|---|---|
| 커뮤니티 | 기능명 | 정보 / 지식 공유 공간 |
| 포럼 | 기능명 | 자유 토론 게시판 (일반 커뮤니티) |
| 강의 / LMS | 기능명 | 온라인 교육 |
| 콘텐츠 | 기능명 | 자료 보관소 |
| 자료실 | 기능명 | 다운로드 센터 |
| 내 약국 | 가치명 (약함) | 개인 운영 영역 |
| 약국 운영 허브 | 가치명 (약함) | 운영 지원 공간 — *누가 지원?* 불명시 |
| 약국경영 (대시보드 카드) | 기능명 | 경영 도구 모음 |

→ **현 KPA 의 메인 메뉴는 모두 기능명 또는 약한 가치명.** 가치명 (예: "매장 운영 자산 허브", "약사 협력 네트워크") 0 개.

### 4.2 비교 — Neture 의 메뉴 (참고)

**[services/web-neture/src/config/navigation.ts](../../services/web-neture/src/config/navigation.ts)**

```
NETURE_PUBLIC_NAV: ['Home', '유통 참여형 펀딩', 'Supplier', 'Partner', '이용 가이드']
```

→ **"Supplier" / "Partner" / "유통 참여형 펀딩"** 같이 역할명 + 가치명이 메뉴 차원에서 노출됨. 4 service 중 가장 가치 메시지가 강한 케이스. KPA 와 격차 큼.

---

## 5. 산출물 4 — 역할별 활용 매트릭스

### 5.1 매장 경영자 (kpa:store_owner) — 70/100

| 항목 | 구현 | 코드 위치 | 가시성 |
|---|:---:|---|---|
| 매장 정보 / 외형 / 템플릿 | ✅ | `pharmacy/PharmacyInfoPage.tsx`, `PharmacyStorePage.tsx` | `/store/info`, `/store/settings` |
| QR 발급·관리 | ✅ | `pharmacy/StoreQRPage.tsx` | `/store/marketing/qr` |
| POP 제작 (+ AI 보조) | ✅ | `pharmacy/StorePopPage.tsx`, `ProductPopBuilderPage.tsx` | `/store/marketing/pop` |
| 매장 사이니지 / TV | ✅ | `pharmacy/StoreSignagePage.tsx` | `/store/marketing/signage/*` |
| 매장 블로그 | ✅ | `pharmacy/PharmacyBlogPage.tsx` | `/store/content/blog` (URL 직접) |
| HUB 콘텐츠 수신 (운영자→매장) | ✅ | `/store-hub/content` | **별도 진입** (사이드바 미연결) |
| HUB 블로그 수신 | ✅ | `pharmacy/HubBlogLibraryPage.tsx` | `/store-hub/blog` (별도) |
| 매장 자료함 (Library) | ✅ | `pharmacy/StoreLibraryContents/ResourcesPage.tsx` | `/store/library/*` |
| 매장 제작 자료 | ✅ | `pharmacy/StoreProductionMaterialsPage.tsx` | `/store/library/production-materials` |
| 마케팅 분석 | ✅ | `pharmacy/MarketingAnalyticsPage.tsx` | `/store/analytics/marketing` |
| B2B / B2C 상품 / 주문 | ✅ | `pharmacy/PharmacyB2BPage.tsx`, `PharmacySellPage.tsx`, `StoreOrderWorktablePage.tsx` | `/store/commerce/*` |
| Event Offer 참여 | ✅ | `event-offer/EventOfferDetailPage.tsx` | `/store-hub/event-offers` |
| 일반 AI 콘텐츠 도구 | ⚠️ | POP 만 AI 보조, 일반 도구 X | (제한적) |
| 직원 교육 자료 | ❌ | LMS 라우트는 있으나 매장 통합 X | 미구현 |
| 운영자 1:1 지원 / 맞춤 자료 | ❌ | 0 | 미구현 |

**진단:** 기본 운영 자산 제작 도구는 충분. **단 (1) HUB 수신 라우트가 메인 사이드바에 연결 안 되고 별도 진입, (2) 자료가 "운영자 추천" 인지 "공급자 원본" 인지 구분 부재, (3) 매장별 맞춤 자료 0.** "직원이 많지 않아도 매장 경쟁력" 의 가치 메시지가 UI 상 명시 안 됨.

### 5.2 서비스 운영자 (kpa:operator) — 35/100 ⚠️ Critical

| Workspace | 정의 | 구현 | 핵심 누락 |
|:---:|---|:---:|---|
| **A — 자료 등록** | 공급자 자료 → O4O 등록 | ❌ | Source Ingestion System 보류 (OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD §11) |
| **B — AI 작업** | 원천 자료 → AI 가공 → 실행 자산 | ⚠️ | AI 리포트만 (`OperatorAiReportPage`). 초안/생성/요약/이미지 도구 0 |
| **C — 큐레이션 / HUB 게시** | 매장별 맞춤 배포 | ⚠️ | 콘텐츠 작성 + 전체 배포만. 매장별 추천 / 개인화 UI 0 |
| **D — 매장 지원** | 1:1 메시징 / 맞춤 데이터 | ❌ | 매장 목록 조회만. 메시징 0 |
| **E — 운영 수익 모델** | 패키지 / 구독 | ❌ | 0 |

**현재 운영자의 실제 역할 (코드 기준):**
- 포럼 / LMS / 사이니지 / 설문 / 가이드 콘텐츠 관리
- 기본 콘텐츠 (RichTextEditor) 작성 + 전체 매장 배포
- 회원 / 약국 신청 / 상품 신청 승인
- 협업 문의 (Collaboration Inbox)

→ **"포럼·LMS·사이니지 관리자" 수준.** Philosophy §3.2 의 "공급자 자료 + AI + 운영 경험을 활용하여 매장 실행 자산을 생산·구성·운영" 의 핵심 사이클 (A→B→C) 이 **미구현**. 5-Block 대시보드는 멋있지만 그 안의 콘텐츠 흐름은 skeleton.

### 5.3 커뮤니티 참여자 (forum_member / pharmacist) — 65/100

| 항목 | 구현 | 코드 위치 |
|---|:---:|---|
| 포럼 글쓰기 / 댓글 / 좋아요 | ✅ | `forum/ForumWritePage.tsx`, `ForumDetailPage.tsx` |
| LMS 수강 / 이수증 / 자격증 | ✅ | `lms/Lms*Page.tsx`, `mypage/MyCertificatesPage.tsx`, `MyQualificationsPage.tsx` |
| 자료 / 콘텐츠 조회 | ✅ | `resources/ResourcesHubPage.tsx`, `/content` |
| 설문 참여 | ✅ | `participation/ParticipationRespondPage.tsx`, `survey/SurveyDetailPage.tsx` |
| 강사 대시보드 (lms:instructor) | ✅ | `instructor/InstructorDashboardPage.tsx` |
| 사용자 AI 콘텐츠 생성 | ❌ | 미구현 |
| 사용자 콘텐츠 생산 (강사 외) | ❌ | 강사만 가능 |
| 감사 / 포인트 시스템 | ❌ | `MyCreditsPage.tsx` (조회만, 획득 로직 X) |
| 정보 → 매장 실행 연결 UI | ❌ | "이 자료를 우리 매장에 적용" 같은 UI 0 |

**진단:** 정보 공유 커뮤니티로는 기능 충실. **단 (1) 게시물·답변의 가치를 표현할 보상 / 감사 시스템 미작동, (2) 포럼 → HUB → 매장 환류 경로 부재, (3) 사용자 콘텐츠 생산이 강사만 가능.** Philosophy §3.4 "커뮤니티 = 집단 경험과 현장 데이터 만드는 공간" 의 후반부 (현장 데이터화 + 환류) 가 코드상 단방향만.

---

## 6. 산출물 5 — 역할 간 연결 흐름 현황 (Canonical Flow 검증)

Philosophy §4 의 Canonical Flow 가 코드에 어떻게 반영되어 있는가:

```
공급자 → 운영자 → AI 가공 → HUB → 매장 실행 → 고객 경험
                                            ↑
                                   커뮤니티 데이터 환류
```

| 흐름 | 구현 |
|---|:---:|
| 공급자 → 운영자 (자료 등록) | ❌ 미구현 (Source Ingestion 보류) |
| 운영자 → AI 가공 | ❌ 미구현 (B Workspace 0) |
| 운영자 → HUB → 매장 (콘텐츠) | ⚠️ 부분 (단순 콘텐츠만, 매장별 맞춤 X) |
| 운영자 → HUB → 매장 (블로그) | ✅ 구현 (`HubBlogLibraryPage`) |
| 매장 → 매장 블로그 → 외부 노출 | ✅ 구현 (`/store/:slug/blog`) |
| 매장 블로그 → 커뮤니티 환류 | ❌ 미구현 |
| 커뮤니티 (포럼) → 운영자 큐레이션 → HUB | ❌ 미구현 |
| 매장 → 고객 경험 (B2C 판매 / Event Offer) | ✅ 구현 |

→ **Canonical Flow 8 단계 중 4 단계만 구현, 4 단계 미구현.** 특히 "공급자 → 운영자 → AI 가공" 의 상류 절반과 "커뮤니티 → 운영자 → 매장" 의 환류 경로 둘 다 미구현. Philosophy 의 가장 차별적인 명제가 실제로 작동 안 함.

---

## 7. 산출물 6 — 현재 Guide 구조 분석

### 7.1 Guide 라우트 14 개

| 카테고리 | 라우트 | 분류 |
|---|---|:---:|
| **Intro (4)** | `/guide/intro`, `/intro/structure`, `/intro/kpa`, `/intro/operation`, `/intro/concept` | 가치 |
| **Usage (1)** | `/guide/usage` (매장 운영 7단계) | 역할별 (매장경영자) |
| **Features (8)** | `/guide/features/{forum, lms, content, resources, signage, qr, store, survey}` | **기능 중심 100%** |

### 7.2 Hero 메시지 비교

| Page | Hero |
|---|---|
| `/guide/features` | "**기능별 이용 방법** — 필요한 기능을 선택해 바로 이동합니다" |
| `/guide/usage` | "**서비스 활용 방법** — 약국 매장 운영의 실제 흐름" |

→ features = **기능 사용법 (How-To)**, usage = **활용 흐름 (What-You-Do)**. 사용자가 자기 역할을 알아서 판단해야 함 — 명시적 역할 분기 없음.

### 7.3 Guide 콘텐츠 정합

- 정적 hardcoded: `packages/shared-space-ui/src/guide/copy/kpa.ts` (1322 lines)
- 동적 편집: `GuideEditableSection` + `guide_contents` DB 테이블 (운영자 `/operator/guide-contents` 에서 실시간 편집)
- pageKey / sectionKey 카탈로그 정합 ([O4O-GUIDE-PAGE-KEY-CATALOG-V1.md](../architecture/O4O-GUIDE-PAGE-KEY-CATALOG-V1.md)): ✅

### 7.4 현재 Guide vs 추천 역할별 Value Guide

| 측면 | 현재 | 추천 (역할별) |
|---|---|---|
| 분류 기준 | 기능 8 카테고리 | 역할 3-4 카테고리 |
| Hero 문구 | "필요한 **기능을 선택**" | "당신의 **역할에서 활용하는 방법**" |
| 카드 구조 | 1 기능 1 카드 | 1 역할 — 3-5 활용 묶음 |
| 사용자 심리 | "어떤 기능이 있을까?" (탐색) | "내 역할에서 무엇을 얻을까?" (가치) |
| 진입점 | `/guide/features/{forum, lms, ...}` | `/guide/for/{store-owner, operator, member}` (제안) |
| 예시 설명 | "포럼은 질문·답변 채널입니다" | "**매장 경영자는** 운영 노하우를, **약사는** 전문 지식을, **강사는** 수강생 피드백을 나눕니다" |

### 7.5 다른 service Guide 부재

| Service | Guide 구현 |
|---|:---:|
| **KPA** | ✅ 14 page (production) |
| Neture | ❌ 0 (shared-space-ui 컴포넌트만 존재, neture.ts props 미작성 — IR-O4O-NETURE-GUIDE-STRUCTURE-AUDIT-V1 대기) |
| GlycoPharm | ❌ 0 |
| K-Cosmetics | ❌ 0 |

→ 본 IR 권고가 KPA 에서 적용된 후, 다른 3 service 로 확장 가능.

---

## 8. 산출물 7 — "평범한 커뮤니티" 오인 구조적 원인 Top 5

### 원인 1. 메뉴 단일 진입 "커뮤니티" + 포럼 우선 노출

- GlobalHeader 항상 노출 = `{ label: '커뮤니티', href: '/' }` 1 개
- CommunityHomePage 5 카드 중 첫 카드 = "포럼"
- ForumServicePage 부제 = "약사를 위한 전용 커뮤니티"
- → **"커뮤니티 ≈ 포럼"** 의 의미 축소가 코드 카피로 강화됨

**Philosophy 격차:** §3.4 "커뮤니티 = 경험·질문·강의·자료·**포럼**" (다수 중 하나) → UI 에서는 포럼이 커뮤니티의 전부로 표현됨.

### 원인 2. 운영자 / 공급자 역할이 메인 메뉴에서 완전히 숨겨짐

- 일반 사용자 메뉴: "커뮤니티" 만
- store_owner 만 "내 약국" / "약국 운영 허브" 추가 노출
- "공급자" 단어는 메뉴 / Hero / 카피에 **0 회**
- "운영자" 단어는 "약국 운영 허브" 라벨에만 존재, "운영자가 무엇을 지원" 메시지 부재
- → 사용자는 "이 플랫폼에 누가 나를 지원하는 사람들이 있는가" 를 인지 못함

**Philosophy 격차:** §3.1-3.3 의 3자 정의가 사용자 UI 에 전혀 반영 안 됨.

### 원인 3. 대시보드의 "커뮤니티" 와 "약국경영" 이 분리됨

- UserDashboardPage 의 2 섹션:
  - Section 1 "커뮤니티 바로가기" (포럼·공지·교육)
  - Section 2 "약국경영" 카드
- 두 섹션이 **시각적으로 분리** → "정보 (커뮤니티) ↔ 실행 (약국)" 의 연결이 unclear

**Philosophy 격차:** §8 "정보를 실행 경쟁력으로 전환" — UI 가 정보와 실행을 분리 표현.

### 원인 4. 메뉴 / 카피의 모든 단어가 기능명

- 포럼 / 강의 / 자료실 / 콘텐츠 (기능명)
- "내 약국" / "약국경영" (기능명에 가까운 가치명)
- 가치명 (예: "매장 운영 자산 허브", "약사 협력 네트워크") 0 개

**Philosophy 격차:** §2 "소규모 사업자 경쟁력" / §5 "매장 실행 지원" / §8 "실행 경쟁력 전환" 등 가치명 전무.

### 원인 5. 가치 메시지가 "Guide / About" 에 갇혀 있음

- 메인 Hero / 메뉴: 가치 메시지 부재
- About / Guide intro: O4O 정의·3자 구조·실행 자산 등 모두 명시
- **사용자는 Guide / About 진입 전에 포럼 카드부터 만남** → 첫 인상이 "커뮤니티"

**Philosophy 격차:** Philosophy 문서는 매우 명확하나, **메인 UX 가 그 명확성을 0% 반영**.

---

## 9. 산출물 8 — 추천 Value Guide 구조 제안

본 IR 은 **즉시 코드 변경을 권고하지 않음.** 단, 다음 구조를 후속 WO 의 출발점으로 제안:

### 9.1 역할별 진입 분기

```
/guide
  ├─ /guide/for/store-owner   (매장 경영자 — 실행 자산 / 매장 운영)
  ├─ /guide/for/operator      (서비스 운영자 — 자료 가공 / 매장 지원)
  ├─ /guide/for/member        (커뮤니티 참여자 — 정보 / 학습 / 자격)
  └─ /guide/about             (전체 — O4O 가 무엇인가)
```

### 9.2 각 진입의 콘텐츠 구성 (제안)

**`/guide/for/store-owner`:**

```
당신은 매장 경영자입니다 — 직원이 많지 않아도 매장 경쟁력을 높이는 방법

1. 운영자 자료 받기 (HUB 콘텐츠 / 블로그 import)
2. 매장 자산 직접 만들기 (POP / QR / 사이니지 — AI 보조)
3. 매장 블로그로 고객과 소통
4. 상품 마스터 / B2B 주문 / Event Offer 참여
5. 마케팅 분석으로 의사결정
```

**`/guide/for/operator`:**

```
당신은 서비스 운영자입니다 — 생태계를 운영하고 매장을 지원하는 역할

1. 공급자 자료 수신·등록 (Workspace A)
2. AI 로 가공·구성·요약 (Workspace B)
3. HUB 큐레이션 + 매장별 추천 (Workspace C)
4. 매장 1:1 지원 + 운영 분석 (Workspace D)
5. 운영 수익 모델 (Workspace E)
```

**`/guide/for/member`:**

```
당신은 커뮤니티 참여자입니다 — 정보가 실제 현장 활용으로 연결되는 구조

1. 포럼에서 경험·질문 공유 → 운영자가 큐레이션해 매장 자산화
2. LMS 강의로 전문성 강화 → 이수증·자격증 발급
3. 자료·콘텐츠 활용 → "내 매장에 어떻게 적용하나" 가이드
4. 감사 / 포인트 시스템으로 기여 인정
```

### 9.3 메인 Hero 변경 제안 (참고용 — 별건 WO)

```
[현재] "약사 커뮤니티와 약국 경영 서비스를 한 곳에서"
[제안] "약국이 더 잘 운영되는 곳 — 공급자가 만든 자료를 운영자가 AI 로 가공해 매장에 전달합니다."
```

또는 Neture 패턴 참고:

```
[Neture 현재] "Home / 유통 참여형 펀딩 / Supplier / Partner / 이용 가이드"  ← 역할명 + 가치명 노출
[KPA 제안] "약국 운영 허브 / 약사 네트워크 / 강의 / 이용 가이드"  ← 가치명 우선
```

### 9.4 메인 메뉴 가치명 도입 제안

| 현재 | 제안 |
|---|---|
| "커뮤니티" | "약사 네트워크" 또는 "약사 커뮤니티" 유지 |
| (없음 — store_owner 만) "내 약국" | "내 약국" (모든 사용자에게 노출 — 역할별 분기) |
| (없음 — store_owner 만) "약국 운영 허브" | "약국 운영 허브" + 부제 "운영자가 만든 자료가 도착하는 곳" |
| (없음) | **"O4O 가 무엇인가"** (About / Value Guide 진입) |

→ 본 제안은 즉시 WO 가 아니며, 별건 IR (`IR-O4O-KPA-MAIN-NAV-VALUE-MESSAGE-DESIGN-V1`) 후 결정.

---

## 10. 산출물 9 — 현재 구조 vs O4O 철학 충돌 체크

| 차원 | 평가 | 충돌 |
|---|---|:---:|
| O4O = Online for Offline (오프라인 실행 강화) | △ 약함 — Hero/메뉴 미반영 | 약 |
| 3 자 협력 구조 (공급자/운영자/매장) | ❌ 메인 UI 0% 노출 | **강함** |
| HUB = 매장 실행 지원 공간 | △ 라벨만 존재, 메시지 부재 | 약 |
| AI = 경쟁력 증폭 도구 | ✅ Guide 명시 | 없음 |
| 운영자 = 가공·큐레이션·지원 책임 | ❌ Workspace A·B·D·E 미구현 | **강함 (구현 격차)** |
| 커뮤니티 = 현장 데이터 환류 | ❌ 환류 경로 미구현 | **강함** |
| 매장 = 실행 주체 (콘텐츠 소비자가 아닌) | △ 기능은 있으나 메뉴 가시성 약함 | 약 |
| "정보 플랫폼이 아닌 실행 전환 플랫폼" | ❌ 메인 UX 가 정보 중심 | **강함** |
| 공통 인프라 + 서비스별 독립 | ⚪ 코드 레벨 정합, 사용자 UI 미노출 | 없음 (개발자 측면) |

→ **충돌 강함 4 항목 (3 자 구조 / 운영자 책임 / 커뮤니티 환류 / 실행 전환).** 모두 본 IR 의 후속 IR / WO 시리즈에서 다룰 영역.

---

## 11. 산출물 10 — 후속 WO / IR 제안

### Tier 1 — 메시지 / UX 정합 (사용자 가시 영역, 즉시 가치 高)

| 후속 | 우선순위 | 비고 |
|---|:---:|---|
| `IR-O4O-KPA-MAIN-NAV-VALUE-MESSAGE-DESIGN-V1` | 中 | 메인 Hero / 메뉴 가치명 도입 설계 (코드 변경 전 결정) |
| `WO-O4O-KPA-GUIDE-FOR-ROLE-V1` | 中 | `/guide/for/{store-owner, operator, member}` 신설 |
| `IR-O4O-KPA-DASHBOARD-VALUE-CONNECTION-V1` | 低 | UserDashboardPage 의 "커뮤니티 ↔ 약국경영" 분리 → 연결 설계 |

### Tier 2 — Workspace 구현 정책 결정 (큰 결정)

| 후속 | 우선순위 | 비고 |
|---|:---:|---|
| `IR-O4O-OPERATOR-WORKSPACE-A-PRIORITY-DECISION-V1` | 高 | Source Ingestion vs RichTextEditor 전환의 후속 - 자료 등록 UI 어디로 갈지 결정 |
| `IR-O4O-OPERATOR-WORKSPACE-B-AI-TOOLS-SCOPE-V1` | 高 | Operator AI 가공 도구 (초안/요약/이미지) 구현 범위 결정 |
| `IR-O4O-OPERATOR-WORKSPACE-C-PER-STORE-CURATION-V1` | 中 | 매장별 큐레이션 UI 설계 |
| `IR-O4O-OPERATOR-WORKSPACE-D-STORE-SUPPORT-V1` | 中 | 매장 1:1 메시징 / 맞춤 데이터 설계 |
| `IR-O4O-OPERATOR-WORKSPACE-E-REVENUE-MODEL-V1` | 低 | 운영 수익 모델 (패키지·구독) 설계 |

### Tier 3 — 커뮤니티 환류 / 인센티브

| 후속 | 우선순위 | 비고 |
|---|:---:|---|
| `IR-O4O-COMMUNITY-HUB-FEEDBACK-LOOP-V1` | 中 | 포럼 게시물 → 운영자 큐레이션 → HUB 자산화 경로 설계 |
| `IR-O4O-COMMUNITY-GRATITUDE-POINT-SYSTEM-V1` | 低 | 감사 / 포인트 시스템 활성화 (현재 크레딧 schema 만 존재) |
| `IR-O4O-COMMUNITY-USER-CONTENT-PRODUCTION-V1` | 低 | 일반 사용자 콘텐츠 생산 (현재 강사만 가능) 정책 결정 |

### Tier 4 — 4 service 확장

| 후속 | 우선순위 | 비고 |
|---|:---:|---|
| `IR-O4O-NETURE-GUIDE-STRUCTURE-AUDIT-V1` | 中 | (이미 존재) Neture Guide 구현 검토 |
| `IR-O4O-GP-KCOS-GUIDE-STRUCTURE-AUDIT-V1` | 低 | GlycoPharm / K-Cosmetics Guide 구현 필요성 |
| `IR-O4O-4SERVICE-HERO-MESSAGE-CONSISTENCY-V1` | 低 | 4 service Hero 메시지 통일성 (KPA 가 현재 가장 약함) |

---

## 12. 본 IR 이 결정하지 않는 것

- 실제 코드 / UI / 카피 변경 — 본 IR 은 조사 전용
- 메인 Hero / 메뉴 의 실제 새 카피 (별건 디자인 IR)
- Operator Workspace A·B·D·E 의 실제 구현 시점·범위 (별건 정책 IR)
- Community → HUB 환류 경로의 구체적 UX (별건 IR)
- 4 service 의 Guide 구현 우선순위 (별건 IR)
- 감사 / 포인트 시스템의 활성화 시점 (별건 IR)
- `kpaConfig.terminology` 의 라벨 변경 (별건 카피 작업)
- `service-catalog.ts` 의 서비스 등록 정책 변경
- 본 IR 이 제시한 추천 Value Guide 구조의 최종 채택 — 사용자 결정 사안

---

## 13. Drift 방지 원칙 (요약)

본 IR 의 권고를 향후 drift 없이 유지하려면:

```
원칙:
1. 메인 메뉴 / Hero / 첫 화면은 "기능명" 보다 "가치명·역할명" 을 우선 노출.
   "포럼" 단독 사용 시 "약사 커뮤니티" 의미로 축소되지 않도록 컨텍스트 명시.

2. 가치 명제 6 (소규모 사업자 / 3자 협력 / AI / 운영자 지원 / 공통+독립 /
   실행 자산) 중 최소 2-3 개는 메인 첫 화면에서 명시.

3. 새 화면 / 카피 작성 시 Philosophy SSOT (§3, §4, §5, §6, §8) 직접 참조.
   "정보 제공" 인상보다 "실행 전환" 인상이 우세하도록.

4. 새 Operator 화면 추가 시 5 Workspace (A-E) 중 어디에 속하는지 명시.
   현재 미구현 영역은 "곧 출시" 등 표시로 사용자 기대치 관리.

5. 새 Guide 페이지 추가 시 "기능 사용법" + "역할별 활용 가치" 동시 제공.
   기존 /guide/features 와 /guide/usage 의 분리를 따른 후, 향후 /guide/for/*
   로 통합 흐름 진입.

6. Community → HUB → Store 환류 경로는 의도된 단방향이 아님을 인지.
   포럼 게시물 / 자료 등의 환류 경로 신설 시 운영자 큐레이션 의도 반영.

7. 4 service 의 Hero 메시지는 통일된 톤 가능. 단 각 service 의 사업 성격
   (KPA 약사회 / Neture 공급자 / GP 약품 / K-Cos 화장품) 차이 보존.
```

---

## 14. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 즉시 WO 후보 | 0 (본 IR 직접 후속) |
| Tier 1 별건 IR/WO 후보 | 3 (Main Nav Value Message / Guide for Role / Dashboard Value Connection) |
| Tier 2 별건 IR 후보 | 5 (Operator Workspace A-E 각각) |
| Tier 3 별건 IR 후보 | 3 (Community 환류 / 인센티브 / 사용자 콘텐츠 생산) |
| Tier 4 별건 IR 후보 | 3 (Neture/GP/K-Cos Guide 확장 / 4 service Hero consistency) |
| Philosophy 정합 명문화 | ✅ 6 가치 명제 (A-F) 의 현재 전달도 매트릭스 |
| 사용자 오인 원인 명문화 | ✅ Top 5 구조적 원인 + 코드 근거 |
| 사이클 정리 | 본 IR 로 "O4O 가치 전달 체계" 의 큰 그림 확정. 후속 IR / WO 시리즈는 점진 진행 |

---

## 부록 — 조사 방법 (재현 가능)

```bash
# 1. Philosophy SSOT 핵심 인용
grep -nE "^#|^>" docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md
grep -nE "^#|^>" docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md

# 2. KPA 로그인 후 라우트 / 메인 페이지
grep -nE "PostLoginRedirect|CommunityHomePage|Route path=\"/\"" \
  services/web-kpa-society/src/App.tsx

# 3. GlobalHeader / Navigation 메뉴
cat services/web-kpa-society/src/config/navigation.ts

# 4. Hero / AppEntry 카드 카피
grep -nE "title:|subtitle:|description:" \
  services/web-kpa-society/src/pages/CommunityHomePage.tsx | head -30

# 5. ForumServicePage / PharmacyServicePage 의 "커뮤니티" 단어
grep -n "커뮤니티\|forum" services/web-kpa-society/src/pages/services/*.tsx

# 6. Operator Workspace A-E 구현 현황
find services/web-kpa-society/src/pages/operator -name '*.tsx' | sort
grep -rln "Workspace\|ai-report\|hub-content\|store-support" \
  services/web-kpa-society/src/pages/operator

# 7. Guide 라우트 14 개
grep -nE "/guide/" services/web-kpa-society/src/App.tsx

# 8. Guide 정적 카피 (kpa.ts 1322 lines)
wc -l packages/shared-space-ui/src/guide/copy/kpa.ts

# 9. 가치명 / 기능명 분포 — 메뉴 단어
grep -rnoE "label:\s*'[^']+'" \
  services/web-kpa-society/src/config/navigation.ts

# 10. 4 service Hero 메시지 비교
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  grep -nE "title:|subtitle:|heroTitle:|heroDesc:" \
    services/web-$SVC/src/config/navigation.ts \
    services/web-$SVC/src/pages/*HomePage*.tsx 2>/dev/null | head -5
done
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only, 4 parallel Explore agent synthesis)*
*Status: 조사 완료 — 가치 명제 6 의 전달도 매트릭스 + 역할별 활용 점수 (매장경영자 70 / 운영자 35 / 커뮤니티 65) + 오인 원인 Top 5 + 추천 Value Guide 구조 + 후속 IR/WO 14 건.*
*Decision Required: Tier 1 (Main Nav Value Message / Guide for Role) 진입 시점 + Tier 2 (Operator Workspace A-E) 구현 정책 결정.*
