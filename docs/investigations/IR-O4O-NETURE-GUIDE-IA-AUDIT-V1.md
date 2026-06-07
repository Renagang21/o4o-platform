# IR-O4O-NETURE-GUIDE-IA-AUDIT-V1

> Investigation Request — 현재 Neture Guide(/guide)의 IA·카드·페이지·콘텐츠 범위 조사
> 작성일: 2026-06-07
> 성격: **조사 전용** (코드 수정·페이지 작성·삭제 판단 없음)

---

## 0. 요약 (TL;DR)

- 현재 Guide는 **기능 중심 + 공급자 중심**으로 잘 구성되어 있다. 공급자/파트너 동선은 충실하다.
- **사업자 관점 진입 구조는 절반만 존재**한다. 4개 주체 중 **공급자·파트너는 전용 가이드 있음**, **운영자(협동조합/세미프랜차이즈/전문네트워크 운영자)·판매자(매장)는 전용 가이드 없음**.
- "O4O 소개"는 `/guide` 내부가 아니라 **별도 `/o4o` 섹션**에 풍부하게 존재한다 (8페이지, 업종별 5종 포함). Guide에서는 9번째 카드로 외부 링크만 한다.
- **협동조합/세미프랜차이즈 개념**은 `/o4o/apply`에 "검토 가능 대상"으로 1줄 언급될 뿐, 운영자용 가이드/설명 페이지는 **신규 작성 필요**.
- `/guide` (GuideHomePage)와 `/guide/features` (GuideFeaturesPage)가 **기능 목록을 중복** 제공한다 (정리 후보).
- 결론: **폐기 불필요.** 기존 자산을 **사업자 관점 4-Lane(공급자/운영자/판매자/파트너)** 진입 구조로 재배치하면, 신규 작성은 운영자·판매자 2개 Lane에 집중된다.

---

## 1. 현재 Guide 구조 조사

### 1-1. 구현 방식 (조사 전제)

Neture Guide의 각 페이지(`services/web-neture/src/pages/guide/*.tsx`)는 **얇은 wrapper**이며,
실제 콘텐츠(hero / 카드 / 섹션 / 스텝)는 공통 패키지 **`@o4o/shared-space-ui`** 의 props 객체
(`packages/shared-space-ui/src/guide/copy/neture.ts`)에 정의된다.

- 본문은 `GuideEditableSection`(pageKey/sectionKey 기반)으로 감싸져 있어 **운영자가 DB에서 덮어쓸 수 있다.**
  → 본 감사는 **코드 기본값(default)** 기준이다. 운영자 override가 있으면 실제 렌더가 다를 수 있음(§9 주의).
- 따라서 **IA의 SSOT은 코드**이며, 라이브 렌더는 최근 smoke(`/guide/features/market-trial` PASS)에서 정합 확인됨.

### 1-2. 라우트·계층 트리 (`services/web-neture/src/App.tsx` L638–711)

```
/guide                              GuideHomePage          이용 안내 통합 허브 (9개 카드)
├─ /guide/intro                     GuideIntroPage         Neture 개요 (4 카드 → 하위 4페이지)
│  ├─ /guide/intro/structure        ...StructurePage       O4O 기본 구조
│  ├─ /guide/intro/neture           ...NeturePage          Neture 의 위치
│  ├─ /guide/intro/operation        ...OperationPage       운영 구조
│  └─ /guide/intro/concept          ...ConceptPage         핵심 개념
├─ /guide/usage                     GuideUsagePage         서비스 활용 방법 (5 스텝 흐름)
├─ /guide/features                  GuideFeaturesPage      기능별 이용 방법 (8 카드)
│  ├─ /guide/features/supplier-onboarding    공급자 가입 안내
│  ├─ /guide/features/product-registration   상품 등록 & 유통
│  ├─ /guide/features/b2b-content             B2B 콘텐츠
│  ├─ /guide/features/event-offer             Event Offer 제안하기
│  ├─ /guide/features/market-trial            유통참여형 펀딩 (8 섹션 + anchor 8)
│  ├─ /guide/features/partner-program         파트너로 협력하기
│  ├─ /guide/features/forum-resources         Forum & 자료실
│  └─ /guide/features/copilot-dashboard       공급자 Copilot Dashboard

(인접 — Guide 외부지만 Guide가 링크하는 소개/진입 영역)
/o4o                                O4OMainPage            O4O 플랫폼 소개 (개념·구조·원칙)
├─ /o4o/site-operator               SiteOperatorPage       사이트 운영자 대상
├─ /o4o/targets/pharmacy|clinic|salon|optical|dental       업종별 5종
└─ /o4o/apply                       O4OApplyPage           적용 검토 신청 (협동조합 언급 지점)

/supplier  /partner  /market-trial   → 랜딩·실기능 (Guide 카드의 1차 목적지)
```

### 1-3. URL 매핑 표

| URL | 컴포넌트 | 형식 | pageKey |
|-----|----------|------|---------|
| `/guide` | GuideHomePage | 카드 허브 | `guide/home` |
| `/guide/intro` | GuideIntroPage | 4-카드 개요 | `guide/intro` |
| `/guide/intro/structure` | GuideIntroStructurePage | 섹션형 | `guide/intro/structure` |
| `/guide/intro/neture` | GuideIntroNeturePage | 섹션형 | `guide/intro/neture` |
| `/guide/intro/operation` | GuideIntroOperationPage | 섹션형 | `guide/intro/operation` |
| `/guide/intro/concept` | GuideIntroConceptPage | 섹션형 | `guide/intro/concept` |
| `/guide/usage` | GuideUsagePage | 5-스텝 흐름 | `guide/usage` |
| `/guide/features` | GuideFeaturesPage | 8-카드 색인 | `guide/features` |
| `/guide/features/supplier-onboarding` | GuideFeatureSupplierOnboardingPage | 매뉴얼(4스텝) | `guide/features/supplier-onboarding` |
| `/guide/features/product-registration` | GuideFeatureProductRegistrationPage | 매뉴얼(5스텝) | `guide/features/product-registration` |
| `/guide/features/b2b-content` | GuideFeatureB2BContentPage | 매뉴얼(3스텝) | `guide/features/b2b-content` |
| `/guide/features/event-offer` | GuideFeatureEventOfferPage | 매뉴얼(4스텝) | `guide/features/event-offer` |
| `/guide/features/market-trial` | GuideFeatureMarketTrialPage | 매뉴얼(8섹션+anchor) | `guide/features/market-trial` |
| `/guide/features/partner-program` | GuideFeaturePartnerProgramPage | 매뉴얼(4스텝) | `guide/features/partner-program` |
| `/guide/features/forum-resources` | GuideFeatureForumResourcesPage | 매뉴얼(4스텝) | `guide/features/forum-resources` |
| `/guide/features/copilot-dashboard` | GuideFeatureCopilotDashboardPage | 매뉴얼(3스텝) | `guide/features/copilot-dashboard` |

---

## 2. 페이지별 내용 조사

| 페이지 | 목적 | 대상 | 핵심 내용 | 상태 |
|--------|------|------|----------|------|
| `/guide` 허브 | 통합 진입 | 전체 | 9개 카드: 둘러보기/공급자/파트너/유통펀딩/상품/Event/Forum/Copilot/O4O소개 | 유지 (재배치 대상) |
| intro 개요 | 구조 이해 | 전체 | O4O 기본구조·Neture 위치·운영구조·핵심개념 진입 | 유지 |
| intro/structure | 3자 구조 | 운영자 中심 | 공급자/운영자/매장 역할·관계·기능 | 유지 (운영자 Lane 핵심 자산) |
| intro/neture | 플랫폼 위치 | 공급자/파트너 | "등록 플랫폼 아님 = 공급자 실행 플랫폼" | 유지 |
| intro/operation | 운영 사이클 | 운영자 | 운영자 승인 역할·매장 실행·커뮤니티 확산 | 유지 (운영자 Lane 핵심) |
| intro/concept | 철학 | 공급자/운영자 | 소규모 사업자 연대·느슨한 연합·정보기반·기존유통 비교 | 유지 (운영자/철학 자산) |
| usage | 시작 흐름 | 공급자/파트너 | 가입→상품→콘텐츠→Event/Trial→매장실행 5스텝 | 유지 |
| features 색인 | 기능 목록 | 전체 | 8개 기능 카드 색인 | **중복** (/guide 와 겹침) |
| supplier-onboarding | 공급자 가입 | 공급자 | 가입경로·신청·검토·활성화 | 유지 (공급자 Lane) |
| product-registration | 상품 등록 | 공급자 | 바코드·기본정보·가격등급·유통범위·승인 | 유지 (공급자 Lane) |
| b2b-content | B2B 콘텐츠 | 공급자 | 매장담당자용 콘텐츠 작성 | 유지 (공급자 Lane) |
| event-offer | 이벤트 제안 | 공급자 | 다중 서비스 동시 제안·승인 | 유지 (공급자 Lane) |
| market-trial | 유통참여형 펀딩 | 공급자/매장/운영자 | 8섹션: 정의·매장랜딩·공급자·참여자·정산·절차·운영자·FAQ | 유지 (가장 충실) |
| partner-program | 파트너 협력 | 파트너 | 가입·계약·콘텐츠/레퍼럴·커미션 | 유지 (파트너 Lane) |
| forum-resources | 커뮤니티 | 전체 | 포럼·자료실·공지 | 유지 |
| copilot-dashboard | KPI 대시보드 | 공급자 | KPI·운영요약·추천액션 | 유지 (공급자 Lane) |

**중복 발견:** `/guide`(GuideHomePage, 9카드)와 `/guide/features`(GuideFeaturesPage, 8카드)가
기능 목록을 거의 중복 제공. `/guide`는 supplier/partner/o4o 진입 + 기능, `/guide/features`는 순수 기능 색인.
→ 사업자 관점 재배치 시 **`/guide` = 주체 진입 / `/guide/features` = 기능 색인**으로 역할 분리 권장.

---

## 3. 사업자 관점 분류 가능성 조사

현재 콘텐츠를 4개 주체 Lane으로 재분류했을 때의 커버리지:

### 3-1. 공급자 — ✅ 충분 (재배치만)
| 항목 | 기존 자산 |
|------|----------|
| 제품 공급 | product-registration, b2b-content |
| 판매자 모집 | (간접) event-offer / market-trial 의 매장 확보 |
| 이벤트 오퍼 | event-offer |
| 유통참여형 펀딩 | market-trial (8섹션) |
| 콘텐츠 제공 | b2b-content, forum-resources(자료등록) |
| 가입·시작·KPI | supplier-onboarding, copilot-dashboard, usage |

### 3-2. 운영자 — ⚠️ 부분 (조각만, 전용 Lane 없음)
| 항목 | 기존 자산 |
|------|----------|
| 운영자 역할 일반 | intro/operation, intro/structure 의 일부 섹션 (소개 페이지 내부에 분산) |
| 협동조합 | ❌ 없음 (`/o4o/apply`에 "검토 대상"으로 1줄만) |
| 협동조합 준비 그룹 | ❌ 없음 |
| 세미 프랜차이즈 운영자 | ❌ 없음 (`/o4o/site-operator`의 "본부"가 인접 개념) |
| 전문 네트워크 운영자 | ❌ 없음 |
> 운영자는 현재 "**승인 주체**"로만 설명됨(operation/structure 내부 섹션). PHILOSOPHY §3.2의
> "서비스 운영 사업자(자료 수신·구성·AI 활용·매장 실행 자산 제작·큐레이션·매장 지원·수익 모델)"
> 능동적 정의에 대응하는 **운영자 전용 가이드는 부재**. → §7 신규 1순위.

### 3-3. 판매자(매장) — ⚠️ 부분 (Guide 내 전용 없음)
| 항목 | 기존 자산 |
|------|----------|
| 내 매장 | ❌ Guide 내 없음 (실기능은 store 영역, 안내는 부재) |
| 매장 HUB | ❌ Guide 내 없음 |
| 이벤트 오퍼 참여 | (공급자 관점만 있음, 매장 참여 관점 부재) |
| 운영자 승인 상품 | ❌ 없음 |
| 매장 활용 자료(POP/QR/블로그/사이니지) | `/o4o/targets/*`에 업종별로 산재 (매장 모집 카피, 가이드 아님) |
> 매장 측 정보는 `/o4o/targets/*` 5개 업종 페이지에 있으나, **공급자/본부/파트너에게 "매장을 대상으로 사업하라"**고
> 권하는 **영업 카피**이지 **매장 경영자용 사용 가이드가 아님**. → §7 신규 2순위.

### 3-4. 파트너 — ✅ 충분
| 항목 | 기존 자산 |
|------|----------|
| 파트너 협력 | partner-program (가입·계약·콘텐츠/레퍼럴·커미션), `/partner` 랜딩 |

**분류 결론:** 4개 Lane 중 **공급자·파트너는 재배치만으로 완성**, **운영자·판매자는 신규 작성 집중 영역**.

---

## 4. O4O 소개 영역 조사

O4O 철학·개요·구조·3자 관계 설명은 **두 곳에 존재**한다.

### 4-1. `/guide` 내부 (intro 4종)
- structure(기본 구조), neture(위치), operation(운영 구조), concept(핵심 개념)
- 3자(공급자·운영자·매장) 관계, 소규모 사업자 연대, 정보기반 판매, 기존유통 비교 포함
- **유지 가능** — 철학 SSOT(O4O-BUSINESS-PHILOSOPHY-V1)와 방향 일치. 보강 여지: 운영자 능동 역할.

### 4-2. `/o4o` 별도 섹션 (8페이지)
- `/o4o` 메인: "오프라인 매장을 위한 온라인 실행 플랫폼", 4대 운영 원칙(매장 실행 중심/역할 분리/콘텐츠-실행 연결/AI는 보조)
- 업종별 5종(약국·의료·미용·안경·치과): "채널 주도권은 매장에", "운영자는 지원자", 무재고 모델
- `/o4o/apply`: 적용 검토 신청 — **협동조합/협회/전문가 단체**를 검토 대상으로 명시
- `/o4o/site-operator`: 기존 사이트 운영 사업자(공급자/본부/마케팅 파트너) 대상

> **관찰:** O4O 철학 콘텐츠는 풍부하나 **`/guide`와 `/o4o`로 이원화**되어 있고,
> `/guide`에서는 9번째 카드로 `/o4o` 외부 링크만 한다. 사업자 관점 재배치 시
> "O4O 개요 = 모든 주체의 공통 입구"로 **두 자산의 관계를 명시적으로 연결**할 필요.
> (통합/이동이 아니라 **진입 동선 정리** — 본 IR은 판단만, 실행은 후속 WO.)

---

## 5. 서비스별 가이드 조사 (존재 여부 매트릭스)

| 서비스/기능 | Guide 페이지 | 설명 수준 | 비고 |
|------------|:-----------:|----------|------|
| 이벤트 오퍼 | ✅ event-offer | 충실(4스텝) | 공급자 관점 |
| 판매자 모집 | △ 간접 | event-offer/market-trial 내부 | 전용 페이지 없음 |
| 유통참여형 펀딩 | ✅ market-trial | 최충실(8섹션+FAQ) | 다주체 |
| 서비스 한정 판매 | △ | product-registration "유통범위 선택"에 1스텝 | 전용 없음 |
| 전체 판매 | △ | product-registration "전체공개" | 전용 없음 |
| 운영자 승인 상품 | ❌ | 없음 | 매장 관점 부재 |
| 매장 HUB | ❌ | 없음 | 신규 필요 |
| 내 매장 | ❌ | 없음 | 신규 필요 |

> "서비스 한정 / 전체 판매"는 **상품 등록의 유통범위 옵션**(전체공개/서비스지정/매장지정)으로 존재하나
> **독립 개념 설명 페이지는 없음**. 사업자 관점에서 "유통 범위를 어떻게 정하나"는 별도 설명 후보.

---

## 6. 콘텐츠 운영(POP/QR/블로그/영상/사이니지/매장 활용 자료) 조사

| 항목 | Guide 내 설명 | 비고 |
|------|--------------|------|
| 콘텐츠(B2B) | ✅ b2b-content | 공급자→매장담당자 콘텐츠 |
| 콘텐츠(B2C) | △ | usage "콘텐츠 운영" 스텝에 B2C 언급, 전용 없음 |
| 자료실 | ✅ forum-resources | 공급자 자료 등록·활용 |
| POP | ❌ Guide 없음 | `/o4o/targets/*`에 "POP" 언급(매장 노출 채널), 가이드 아님 |
| QR | △ | `/o4o/targets/*` "QR은 연결 통로" 철학 언급. 별도 `SellerQRGuidePage` 존재(/guide 트리 밖) |
| 블로그 | ❌ | Store Menu Canonical Tree(6항목)엔 있으나 Guide 미반영 |
| 영상 | ❌ | 없음 |
| 디지털 사이니지 | △ | `/o4o/targets/*` 채널로 언급, 사용 가이드 아님 |
| 매장 활용 자료(통합) | ❌ | 매장 측 "활용 자료" 가이드 부재 |

> **관찰:** POP/QR/블로그/사이니지/고객안내문 6항목은 **Store Menu Canonical Tree V1**의 매장 축과 직결되나,
> 현재 Neture Guide에는 **매장 활용 콘텐츠 가이드가 사실상 없음**. 이는 §3-3(판매자 Lane 부재)와 동일 공백.
> 참고: `SellerQRGuidePage`(`src/pages/SellerQRGuidePage.tsx`)는 `/guide` 트리 밖 별도 페이지 — 재배치 시 흡수 후보.

---

## 7. 신규 Guide 필요 영역 도출

| # | 신규 후보 | 필요도 | 근거 | 기존 활용 가능 자산 |
|---|----------|:-----:|------|-------------------|
| 1 | **O4O 개요(공통 입구)** "O4O는 매장 판매 환경을 만드는 서비스" | 보강 | `/o4o` + intro 자산은 풍부, **진입 동선만 미정리** | `/o4o` 메인, intro 4종 → 연결 |
| 2 | **운영자 가이드** (협동조합/세미프랜차이즈/전문네트워크 운영자) | **신규(1순위)** | §3-2 — 능동 운영자 정의에 대응하는 페이지 부재 | intro/operation·structure, `/o4o/apply` 협동조합 언급 |
| 3 | **판매자(매장) 가이드** (내 매장·매장HUB·승인상품·활용자료) | **신규(2순위)** | §3-3, §6 — 매장 경영자용 가이드 전무 | `/o4o/targets/*`(영업카피→가이드로 전환), SellerQRGuidePage |
| 4 | **공급자 가이드(Lane 묶음)** | 재배치 | §3-1 — 자산 충분, 묶기만 | supplier-onboarding·product·b2b·event·market-trial·copilot |
| 5 | **파트너 가이드(Lane 묶음)** | 재배치 | §3-4 — 충분 | partner-program, `/partner` |
| 6 | **O4O 대상 제품의 특징** | 신규(소) | "다품종 소량·정보 필요 제품" 카피는 `/o4o`에 산재, 명시 페이지 없음 | `/o4o` 메인 "왜 필요한가" |
| 7 | **이벤트 오퍼 이해(개념)** | 보강 | event-offer는 "제안 방법"(How), 개념(What/Why)은 약함 | event-offer, EVENT-OFFER-* 베이스라인 docs |
| 8 | **유통질서와 이벤트 오퍼** | 신규(소) | market-trial operator 섹션에 "유통질서/표시광고" 단서만 | market-trial #operator |

---

## 8. 재구성 제안 (Guide 개편 IA 초안)

> 제안일 뿐, 본 IR은 실행하지 않는다. 후속 WO 입력.

### 8-1. 유지할 페이지 (그대로)
intro 4종, usage, market-trial, supplier-onboarding, product-registration, b2b-content,
event-offer, partner-program, forum-resources, copilot-dashboard — **전부 유지**.

### 8-2. 이동·정리할 페이지
- `/guide`(허브)와 `/guide/features`(색인) **역할 분리**: 허브=주체 진입, features=기능 색인.
- `/o4o` 8페이지: 이동 아님 — **Guide에서의 진입 동선만 명시적으로 연결**(O4O 개요 = 공통 입구).
- `SellerQRGuidePage`: 판매자 Lane(신규)으로 흡수 검토.

### 8-3. 신규 작성 필요 (집중 영역)
- **운영자 가이드 Lane** (협동조합 / 준비 그룹 / 세미프랜차이즈 / 전문네트워크) — 1순위
- **판매자(매장) 가이드 Lane** (내 매장 / 매장 HUB / 승인 상품 / 활용 자료 POP·QR·블로그·사이니지) — 2순위

### 8-4. 신규 카드 제안 (`/guide` 허브의 사업자 관점 4-Lane)

```
[ O4O 개요 ]  "O4O는 매장 판매 환경을 만드는 서비스입니다"  → 공통 입구
─────────────────────────────────────────────────────────
당신은 누구인가요?  (4-Lane 진입)

① 공급자        제품·콘텐츠를 매장에 유통하고 싶다
                 → onboarding · 상품등록 · B2B · Event · 유통펀딩 · Copilot   [재배치]
② 운영자        매장 네트워크를 구성·운영하고 싶다 (협동조합/세미프랜차이즈/전문네트워크)
                 → 운영자 역할 · 자료 구성 · 큐레이션 · 매장 지원 · 운영 수익   [신규]
③ 판매자(매장)  내 매장에서 상품·콘텐츠를 활용하고 싶다
                 → 내 매장 · 매장 HUB · 승인 상품 · POP/QR/블로그/사이니지     [신규]
④ 파트너        제휴·마케팅·레퍼럴로 협력하고 싶다
                 → 파트너 가입 · 계약 · 콘텐츠/레퍼럴 · 커미션                  [재배치]
─────────────────────────────────────────────────────────
[ 기능별 이용 방법 ]  → /guide/features  (기능 색인, 보조 진입)
```

### 8-5. 재분류 가능 영역 (요약)
- **재배치만으로 완성**: 공급자 Lane(6페이지), 파트너 Lane(1페이지), O4O 개요(intro+/o4o 연결)
- **신규 집중**: 운영자 Lane, 판매자 Lane (= 기존 공백 그대로)

---

## 9. 주의·한계

1. 본 감사는 **코드 기본값 기준**. `GuideEditableSection` 운영자 override가 DB에 있으면 라이브 본문이 다를 수 있음
   → 개편 전 prod `guide_contents` override 존재 여부 별도 확인 권장(read-only).
2. `/o4o/targets/*`는 **매장을 향한 가이드가 아니라 매장을 대상으로 사업하는 주체(공급자/본부/파트너)용 영업 카피**다.
   판매자 Lane 신규 시 톤·관점 전환 필요(영업 → 사용 안내).
3. 본 IR은 **구조·콘텐츠 조사와 재구성 가능성 분석만** 수행. 코드 수정·페이지 작성·기존 콘텐츠 삭제 판단은 **하지 않음**.

---

## 산출물

- 본 문서: `docs/investigations/IR-O4O-NETURE-GUIDE-IA-AUDIT-V1.md`

## 후속 (제안)
- `WO-O4O-NETURE-GUIDE-BUSINESS-ACTOR-IA-V1` — `/guide` 허브를 4-Lane(공급자/운영자/판매자/파트너) 진입으로 재배치 +
  운영자·판매자 Lane 신규 작성. (입력: 본 IR §7·§8)

---

*상태: 조사 완료 — 기능 중심 → 사업자 중심 재배치 가능. 신규 작성은 운영자·판매자 2개 Lane에 집중.*
