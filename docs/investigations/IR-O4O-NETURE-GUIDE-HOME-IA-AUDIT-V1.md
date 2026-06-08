# IR-O4O-NETURE-GUIDE-HOME-IA-AUDIT-V1

> **유형**: Investigation Report (조사 전용 — 코드/콘텐츠/구조/route 수정 없음)
> **일자**: 2026-06-08
> **대상**: Neture `/guide` 허브 (GuideHomePage) 및 하위 Guide IA
> **목적**: Guide 확장 이후, 허브가 처음 진입한 사용자를 올바른 곳으로 안내하는지 감사

---

## 0. 조사 범위 (실제 소스)

| 영역 | 파일 |
|------|------|
| 허브 카드 정의 | `services/web-neture/src/pages/guide/GuideHomePage.tsx` (12 cards, inline) |
| 라우트 | `services/web-neture/src/App.tsx` L684–721 (27 routes) |
| 페이지 copy/props | `packages/shared-space-ui/src/guide/copy/neture.ts` (3583 lines) |
| 렌더 컴포넌트 | `GuideFeaturesPage` / `GuideFeatureManualPage` (shared-space-ui) |

---

## 1. 현재 구조 다이어그램

### 1-1. `/guide` 허브 = **12개 평면 카드 (그룹 없음)**

```text
/guide  (GuideHomePage)
 ├─ Hero: "Neture 이용 안내"
 ├─ flowBar: [O4O개요·Neture개요·공급자·파트너·운영자·판매자·유통펀딩·상품·Event·Forum·Copilot·O4O소개]
 └─ 카드 12장 (step 01~12, 1열 평면 나열, 시각적 분류 없음)
     01 O4O 개요            → /guide/o4o-overview
     02 Neture 둘러보기      → /guide/intro
     03 공급자 이용 안내      → /supplier            (+ features/supplier-onboarding, /contact)
     04 파트너 이용 안내      → /partner             (+ features/partner-program, /contact)
     05 운영자 이용 안내      → /guide/for-operator   (+ /o4o/apply)
     06 판매자 / 매장 가이드  → /guide/for-seller     (+ /store/my-products)
     07 유통참여형 펀딩       → /guide/features/market-trial      (+ /market-trial)
     08 상품 등록 & 유통      → /guide/features/product-registration
     09 Event Offer         → /guide/features/event-offer
     10 Forum & 자료실       → /guide/features/forum-resources
     11 공급자 Copilot       → /guide/features/copilot-dashboard
     12 O4O 플랫폼 소개       → /o4o
 └─ bottomNav: prev=홈(/)  ·  home="서비스 활용 방법 →"(/guide/usage)
```

### 1-2. 숨어 있는 두 개의 하위 체계

```text
[기능 설명 체계]  — 허브 카드로 직접 노출 안 됨 (개별 sub-page만 deep-link)
  /guide/intro     Neture 개요 (구조/위치/운영/개념 4섹션)   ← 카드 02
  /guide/usage     서비스 활용 방법 (가입→상품→콘텐츠→Event/Trial→매장 5단계)  ← bottomNav로만
  /guide/features  기능별 이용 방법 (8 카드 index)            ← 허브에 index 카드 없음
     └ supplier-onboarding / product-registration / b2b-content /
       event-offer / market-trial / partner-program /
       forum-resources / copilot-dashboard

[Business Guide 체계]  — 허브에서 직접 도달 불가 (운영자 가이드 안에만 링크)
  /guide/business  Business Guide Hub
     └ pharmacy-network / supplier-network / content-network /
       event-offer / approved-product / seller-recruitment / market-trial  (7종)
   ▲ 진입 경로: /guide → 카드 05(운영자) → for-operator 페이지 index 15번째 카드
                "Business Guide (사업 운영 안내) →" → /guide/business
```

---

## 2. 사용자별 진입 흐름 평가

| 사용자 | 허브에서 첫 클릭 대상 | 명확성 | 비고 |
|--------|----------------------|:------:|------|
| **공급자** | 카드 03 공급자 이용 안내 | 🟢 명확 | 카드명이 직접적. 단 →/supplier(앱)와 →features/supplier-onboarding(설명)이 한 카드에 혼재 |
| **운영자** | 카드 05 운영자 이용 안내 | 🟡 보통 | 카드는 찾으나, 핵심인 Business Guide가 이 페이지 **맨 아래 index 카드**에 묻혀 있음 |
| **판매자(매장)** | 카드 06 판매자/매장 가이드 | 🟡 보통 | 카드는 있으나 "운영자 승인 상품·판매자 모집" 같은 매장 관련 안내가 Business Guide 쪽에 분산 |
| **파트너** | 카드 04 파트너 이용 안내 | 🟢 명확 | 카드명 직접적 |
| **사업 운영 검토자**<br>(협동조합·도매상·전문가그룹·관광 네트워크·예비 운영 희망자) | **없음** | 🔴 **불명확** | Business Guide가 허브에 노출되지 않아 **발견 자체가 어려움**. "운영자"라고 자기 정체화하지 않으면 카드 05를 누를 이유가 없고, 눌러도 페이지 하단까지 스크롤해야 발견 |

> 가장 전략적으로 중요한 잠재 고객(예비 운영 사업자)이 가장 길을 찾기 어려운 구조.

---

## 3. 카드 분류 평가 — 4개 범주가 한 평면에 혼재

현재 12카드를 의도된 범주로 역매핑하면:

| 범주 | 해당 카드 | 상태 |
|------|----------|------|
| **① O4O 이해 / 개요** | 01 O4O개요, 02 Neture둘러보기, 12 O4O플랫폼소개 | 🔴 흩어짐 (맨 위 2개 + 맨 아래 1개) |
| **② 역할별 안내** | 03 공급자, 04 파트너, 05 운영자, 06 판매자 | 🟡 연속이나 그룹 표시 없음 |
| **③ 기능 설명** | 07 유통펀딩, 08 상품등록, 09 EventOffer, 10 Forum, 11 Copilot | 🟡 연속이나 그룹 표시 없음 |
| **④ 사업 운영 안내 (Business Guide)** | — | 🔴 **허브에 카드 없음** |

→ 사용자는 "지금 보는 카드가 역할 설명인지, 기능 설명인지, 사업 안내인지" 구분할 단서가 없음. 그룹 헤더·구획이 전혀 없는 1열 12카드.

---

## 4. Business Guide 위치 평가

- **발견 가능성**: 🔴 낮음. 허브 → 운영자 가이드(카드 05) → 페이지 index 15번째 카드를 거쳐야 도달. 2단계 깊이 + 스크롤.
- **독립성**: 🟢 체계 자체는 잘 독립됨. `/guide/business`는 "기능 사용법이 아니라 **사업 운영 방법**"임을 명확히 선언하고, 7종을 "네트워크 운영 2 + 운영 구조 5"로 잘 분류함.
- **역할 Guide와의 관계**: 🟡 운영자 가이드의 *연장선*으로만 배치됨 → 실제로는 모든 예비 운영자/검토자의 입구여야 하는데 운영자 하위로 종속됨.
- **기능 Guide와의 관계**: 🔴 **주제 중복**. EventOffer·유통펀딩·승인상품·판매자모집·콘텐츠가 기능 체계와 Business 체계 양쪽에 존재 (§6 참조).

---

## 5. 기능 설명 체계 (intro / usage / features) 조사

| 경로 | 성격 | 내용 |
|------|------|------|
| `/guide/intro` | 개념 | Neture 구조·위치·운영·핵심개념 (4섹션) |
| `/guide/usage` | 순차 흐름 | 가입→상품등록→콘텐츠→Event/Trial→매장실행 (5단계 온보딩) |
| `/guide/features` | 기능 레퍼런스 | 8개 기능 카드 index |

평가: **개념→흐름→기능**의 3단 구성 자체는 합리적. 단,
- 허브가 이 3개를 한 묶음(세트)으로 보여주지 않음. intro만 카드 02로 노출, usage는 bottomNav로만, features index는 허브 카드 없음.
- 기능별 노출 충실도:

| 기능 | 허브/기능체계 노출 | 비고 |
|------|:---:|------|
| 이벤트 오퍼 | 🟢 | 카드 09 + features/event-offer |
| 유통참여형 펀딩 | 🟢 | 카드 07 + features/market-trial |
| 운영자 승인 상품 | 🔴 | 기능 체계에 없음, Business Guide·for-seller에만 |
| 판매자 모집 | 🔴 | 기능 체계에 없음, Business Guide에만 |
| 콘텐츠 운영 | 🟡 | features의 'B2B 콘텐츠'만, content-network는 Business |
| 디지털 사이니지 | 🔴 | **Guide 전체에 설명 없음** |
| 강좌(LMS) | 🔴 | **Guide 전체에 설명 없음** |
| 설문조사 | 🔴 | **Guide 전체에 설명 없음** |

---

## 6. 중복 및 혼재 조사

### 6-1. 역할 Guide vs 기능 Guide
- 카드 03 공급자(→`/supplier` 앱) 와 features/supplier-onboarding(→설명)이 **같은 카드에 혼재** — "안내를 읽기"와 "앱으로 가기"가 한 카드에서 분기.
- 상품 등록: 카드 08(기능) + usage step 02 + features 02 → 3곳.

### 6-2. 기능 Guide vs Business Guide (가장 큰 혼재)
같은 주제가 **목적만 다르게** 두 체계에 동시 존재:

| 주제 | 기능 체계 (사용법) | Business 체계 (운영법) |
|------|------|------|
| Event Offer | /guide/features/event-offer | /guide/business/event-offer |
| 유통참여형 펀딩 | /guide/features/market-trial | /guide/business/market-trial |
| 콘텐츠 | /guide/features/b2b-content | /guide/business/content-network |
| 승인 상품 | (없음) | /guide/business/approved-product |
| 판매자 모집 | (없음) | /guide/business/seller-recruitment |

→ 구분 의도("기능 사용법 ≠ 사업 운영법")는 **실재하고 타당**하나, 허브에 그 구분이 **신호화되어 있지 않아** 사용자가 둘 중 무엇을 눌러야 할지 알 수 없음.

### 6-3. 개요 중복
- 카드 01 "O4O 개요"(/guide/o4o-overview) 와 카드 12 "O4O 플랫폼 소개"(/o4o) — 두 개의 'O4O 소개' 입구. 하나는 Guide 페이지, 하나는 마케팅 /o4o 페이지. 차이가 카드명만으로 불분명.

---

## 7. Guide 진입 구조 (실제 흐름)

```text
[이상적 흐름]                      [현재 실제 흐름 — 사업 검토자]
Guide                              Guide
 ↓ O4O 개요                         ↓ ??? (Business Guide 카드 없음)
 ↓ 내 역할/관심 선택                 ↓ 추측으로 "운영자 이용 안내" 클릭
 ↓ 역할 안내 or 사업 운영 안내        ↓ for-operator 페이지 진입
 ↓ 기능 사용법                       ↓ 14개 index 카드 스크롤
                                    ↓ 15번째 "Business Guide →" 발견
                                    ↓ 비로소 /guide/business
```

→ 입구(O4O 개요)는 명확하나, **두 번째 분기(나는 무엇을 보러 왔는가)** 에서 길잡이가 끊김. 특히 Business Guide 경로는 우회적.

---

## 8. 문제점 목록 (우선순위순)

| # | 문제 | 심각도 |
|---|------|:------:|
| P1 | **Business Guide가 허브에 미노출** — 예비 운영자/검토자 발견 불가 | 🔴 높음 |
| P2 | **12카드 평면 나열, 범주 구획 없음** — 역할/기능/개요 구분 불가 | 🔴 높음 |
| P3 | 기능 체계 ↔ Business 체계 **주제 중복**, 구분 신호 없음 | 🟡 중간 |
| P4 | 개요 3종(01/02/12) 흩어짐 + O4O개요 vs O4O소개 중복 | 🟡 중간 |
| P5 | usage/features index가 허브에서 직접 도달 어려움 | 🟢 낮음 |
| P6 | 사이니지·강좌·설문조사 기능 안내 부재 | 🟢 낮음(범위 외) |

---

## 9. 개선안

### 개선안 A — 최소 수정 (권장 우선)
**범위**: `GuideHomePage.tsx`의 카드 **재배열 + 그룹 헤더**만. route·콘텐츠·카드 신규 0.
- 12카드를 4개 그룹으로 시각 구획:
  1. **O4O 이해** (01 O4O개요, 02 Neture둘러보기, 12 O4O소개)
  2. **역할별 시작** (03 공급자, 04 파트너, 05 운영자, 06 판매자)
  3. **기능 사용법** (08 상품, 09 Event, 07 유통펀딩, 10 Forum, 11 Copilot)
  4. **사업 운영 안내(Business Guide)** ← `/guide/business` 카드 **1장 신규 노출** (기존 페이지 링크, 콘텐츠 변경 없음)
- 효과: P1·P2 즉시 해소, P4 부분 해소.
- ⚠ 구현 전 확인 필요: 공통 `GuideFeaturesPage` 컴포넌트가 group 헤더/구획 렌더를 지원하는지. 미지원 시 shared 컴포넌트에 그룹 표시 capability 소폭 추가 필요(별도 WO).

### 개선안 B — 중간 정비
A + 기능/Business 중복 신호화:
- 기능 카드에 "기능 사용법", Business 카드에 "사업 운영 방법" 배지/한 줄 안내 추가.
- 역할 카드의 "안내 읽기" vs "앱으로 이동"을 1차/2차 액션으로 분리(카드 내 primary/secondary).
- usage/features index를 "전체 기능 보기" 진입점으로 그룹 4 또는 별도 라인에 명시.

### 개선안 C — 대규모 IA 재구성
- 허브를 **2단 게이트**로 전환: 1차 "무엇을 하러 오셨나요?"(이해 / 참여(역할) / 사업 운영 / 기능 찾기) → 2차 세부.
- Business Guide를 운영자 종속에서 분리해 **독립 1급 입구**로 승격.
- 사이니지·강좌·설문 등 미설명 기능을 기능 체계에 편입.
- 개요 중복(o4o-overview vs /o4o) 정리.

---

## 10. 최종 판정

### Q1. 현재 Guide 허브는 충분히 명확한가?
**부분적으로 아니오.** 입구(O4O 개요)는 명확하나, ① Business Guide 미노출 ② 12카드 무구획 평면 배열 때문에 "두 번째 분기"에서 길잡이가 끊긴다.

### Q2. 어떤 사용자가 가장 혼란을 느끼는가?
**사업 운영 검토자(예비 운영 사업자 — 협동조합/도매상/전문가 그룹/관광 네트워크 등).** 자신을 "운영자"로 정체화하지 않으면 Business Guide에 도달할 단서가 허브에 없다. 2차로 **판매자(매장)** — 승인상품·판매자모집 안내가 기능/Business로 분산.

### Q3. 역할 / 기능 / Business Guide를 어떻게 구분하는 것이 자연스러운가?
허브를 **4개 명시 그룹**으로:
**① O4O 이해 → ② 역할별 시작 → ③ 기능 사용법 → ④ 사업 운영 안내(Business)**.
핵심은 **Business Guide를 운영자 하위가 아닌 허브 1급 그룹으로 승격**하고, ③기능(사용법)과 ④사업(운영법)의 목적 차이를 카드에 신호화하는 것.

### Q4. 다음 Guide 정비 작업의 우선순위는?
1. **(최우선) 개선안 A** — 허브에 Business Guide 카드 노출 + 12카드 4그룹 구획. (콘텐츠/route 무변경)
2. 개선안 B — 기능/Business 목적 배지, 역할 카드 액션 분리.
3. (후속) 개선안 C 및 미설명 기능(사이니지·강좌·설문) 편입.

> 결론: **지금 필요한 것은 새 Guide 추가가 아니라, 이미 존재하는 Business Guide·기능 체계를 허브에서 "보이게" 하고 "구분되게" 하는 재배치.** 카드 신규 0, route 변경 0으로 P1·P2를 해소하는 개선안 A가 가장 비용 대비 효과가 크다.
