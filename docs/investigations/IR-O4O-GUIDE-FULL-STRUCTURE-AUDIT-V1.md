# IR-O4O-GUIDE-FULL-STRUCTURE-AUDIT-V1

> **유형**: Investigation Report / Audit (조사 전용 — 신규 Guide·콘텐츠·route·IA 변경 없음)
> **일자**: 2026-06-08
> **선행**: [IR-O4O-NETURE-GUIDE-HOME-IA-AUDIT-V1](IR-O4O-NETURE-GUIDE-HOME-IA-AUDIT-V1.md), [IR-O4O-BUSINESS-GUIDE-RECLASSIFICATION-AUDIT-V1](IR-O4O-BUSINESS-GUIDE-RECLASSIFICATION-AUDIT-V1.md)
> **목적**: Business Guide가 아니라 **Guide 전체 체계** 안에서 O4O 이해 / 역할 / 기능 / Business Guide 가 올바른 위치를 차지하는지 감사.

---

## 0. 현재 상태 (실측)

최근 일련의 WO(Home IA 재정렬 → Business Guide 3계층 → own-product → operator-revenue) 반영 후 현황:

| 영역 | 위치 | 현황 |
|------|------|------|
| **Guide Home** | `/guide` (GuideHomePage) | **7 섹션** (O4O 이해 / 서비스 운영자 / 기능 설명 / 사업 안내 / 공급자 / 판매자·매장 / 파트너) |
| **O4O 이해** | 섹션1 | O4O 개요(/guide/o4o-overview) · O4O 전반 둘러보기(/guide/intro) · O4O 플랫폼 소개(/o4o) |
| **역할 Guide** | for-operator / for-seller / supplier / partner | 운영자·판매자(매장)·공급자·파트너 4종 |
| **기능 Guide** | `/guide/features` (8 카드) | supplier-onboarding · product-registration · b2b-content · event-offer · market-trial · partner-program · forum-resources · copilot-dashboard |
| **Business Guide** | `/guide/business` (3계층) | **9 하위 + 허브** |

> **개수 보정**: WO에 "8종"으로 적혔으나 실제 Business Guide 하위 = **9종** (약국 · 공급자 · 자체제품 · 콘텐츠 · 승인상품 · 이벤트오퍼 · 판매자모집 · 유통펀딩 · **운영자 수익 구조**) + 허브.

---

## 1. ★핵심 발견 — 매장측 기능은 "누락"이 아니라 "역할 가이드에 내장"

WO 가설은 "매장 HUB · 내 매장 · 사이니지 · QR · POP · 주문 설명이 약하다" 였으나, 실측 결과 **판매자/매장 역할 가이드(`/guide/for-seller` "내 매장 활용 가이드")가 이를 이미 11개 섹션으로 모두 설명**한다:

| 매장측 항목 | for-seller 섹션(anchor) | 별도 기능 Guide |
|------------|------------------------|:---:|
| 내 매장 정의 | `#what-store` | ❌ |
| 매장 HUB | `#hub` | ❌ |
| 운영자 승인 상품 | `#approved` | ❌(Business엔 있음) |
| 이벤트 오퍼 | `#event` | ✅(/guide/features/event-offer) |
| 매장 활용 자산 | `#assets` | ❌ |
| POP | `#pop` | ❌ |
| QR | `#qr` | ❌ |
| 블로그·콘텐츠 | `#blog` | ❌ |
| 디지털사이니지 | `#signage` | ❌ |
| 주문·배송·정산 | `#settlement` | ❌ |

→ **매장측 기능은 설명 자체가 누락된 것이 아니라, "기능 Guide 시스템(/guide/features)"이 아닌 "역할 가이드(for-seller)" 안에 들어 있다.** 그리고 Guide Home 섹션6(판매자/매장)이 for-seller + 실기능 route(매장HUB/내매장/QR/사이니지/주문)로 이를 노출한다.

따라서 **"신규 기능 Guide를 대량 작성"할 필요는 낮다.** 진짜 문제는 위치·구분·정합성이다(아래).

---

## 2. 조사 질문 답변 (Q1~Q8)

| Q | 질문 | 판정 | 근거 |
|---|------|------|------|
| **Q1** | 처음 방문자가 시작점을 아는가 | 🟢 개선됨 | 7섹션 구조 + O4O 이해가 명확한 입구 (직전 Home IA WO로 해소) |
| **Q2** | 예비 운영자가 Business Guide를 발견하는가 | 🟢 해소됨 | 섹션2(서비스 운영자)에 Business Guide 1급 카드 노출 (직전 WO) |
| **Q3** | 역할 Guide ↔ Business Guide 구분 자연스러운가 | 🟡 대체로 | for-operator → Business Guide 연결 자연스러움. 단 둘 다 "운영 안내" 성격이라 경계 중첩(아래 §4) |
| **Q4** | 기능 Guide ↔ Business Guide 혼동 있는가 | 🔴 있음 | Event Offer·유통펀딩·콘텐츠가 양쪽에 존재(사용법 vs 운영법). 신호 약함 |
| **Q5** | 매장 경영자가 기능 Guide를 먼저 봐야 하는 구조인가 | 🟡 부분 | 매장 경영자 최적 입구 = for-seller(역할). 이미 store-side 전부 설명. 단 /guide/features엔 매장측 단품이 없음 |
| **Q6** | 공급자: 역할 → 기능 경로 자연스러운가 | 🟢 자연 | 섹션5(공급자) → /supplier + supplier-onboarding, /guide/features도 공급자 중심(상품등록·B2B·오퍼·펀딩·Copilot) |
| **Q7** | 설명 부족·없는 핵심 기능은 | 🟡 일부 | 매장측은 for-seller로 커버됨(누락 아님). **진짜 미설명 = 강좌(LMS)·설문·광고** (operator-revenue에 "준비 단계"로만 언급) |
| **Q8** | Home 7섹션 구조 최적인가 | 🟡 대체로 | 적절. 단 섹션3(기능 설명 6카드) ↔ /guide/features(8카드) **불일치**(아래 §4) |

---

## 3. 사용자 유형별 진입 흐름 ★산출물 2

```text
공급자        /guide → ⑤공급자 참여 → /supplier · supplier-onboarding
                       (+ ③기능: 상품등록·B2B·오퍼·펀딩·Copilot)        🟢 자연

운영자/예비   /guide → ②서비스 운영자 → for-operator
                       → Business Guide(/guide/business)
                          → 사업모델 / 운영도구 / 수익구조 3계층          🟢 자연

매장 경영자   /guide → ⑥판매자·매장 → for-seller(내 매장 활용 가이드)
                       → HUB·내매장·승인상품·오퍼·POP·QR·사이니지·주문   🟢 커버됨
                       (단 /guide/features 로 가면 매장측 단품 없음)      🟡

파트너        /guide → ⑦파트너 → /partner · partner-program             🟢 자연
```

---

## 4. 역할 / 기능 / Business Guide 관계도 + 중복·누락·혼동 ★산출물 3·4

```text
                          /guide (Home, 7섹션)
   ┌──────────┬───────────────┬───────────────┬──────────────┐
   │ O4O 이해  │  역할 Guide     │  기능 Guide     │ Business Guide │
   │ (3)      │ (운영자/판매자/  │ (/guide/features│ (9 + 허브,     │
   │          │  공급자/파트너)  │  8 카드)        │  3계층)        │
   └──────────┴───────┬───────┴───────┬───────┴──────┬───────┘
                      │               │              │
          for-seller가 매장측   공급자/운영자 중심   사업모델·운영도구·
          (HUB·QR·POP·사이니지  (상품등록·B2B·오퍼  수익구조 "운영법"
          ·주문) 전부 설명 ◀───┐ ·펀딩·Copilot)      │
                              │               │              │
            [혼동①] Event Offer·유통펀딩·콘텐츠 = 기능 Guide(사용법) + Business(운영법) 양쪽
            [혼동②] 기능 Guide(/guide/features 8) ≠ Home 섹션3(기능 설명 6) 목록 불일치
            [중첩]  for-operator(역할 종합) ↔ Business Guide(사업 안내) 경계
            [누락]  강좌(LMS)·설문·광고 = 어디에도 본문 없음(준비 단계 언급만)
```

### 중복·혼동·누락 정리
- **혼동① (주제 양다리)**: Event Offer / 유통펀딩 / 콘텐츠가 기능 Guide(사용법)와 Business Guide(운영법)에 동시 존재. 구분 의도는 타당하나 **사용자에게 "어느 걸 봐야 하는지" 신호가 없음**. (선행 Home IA 감사 P3와 동일 이슈)
- **혼동② (목록 불일치)**: Home 섹션3 "기능 설명"은 6카드(상품/B2B/오퍼/펀딩/Forum/Copilot)인데 `/guide/features` index는 8카드(+supplier-onboarding, partner-program). 두 기능 목록이 다름 → SSOT 불명확.
- **중첩 (역할 vs 사업)**: for-operator(운영자 역할 종합 안내)와 Business Guide(사업 모델/도구/수익)가 둘 다 "운영자가 하는 일"을 다뤄 경계가 겹침. 현재는 for-operator → Business Guide 링크로 연결되나 역할 분담 한 줄 설명이 약함.
- **누락 (진짜)**: 매장측(HUB/QR/POP/사이니지/주문)은 for-seller가 커버 → 누락 아님. **강좌(LMS)·설문·광고는 어떤 Guide에도 본문 없음** (operator-revenue에서 "준비 단계"로만 언급). 단 이들은 수익화 미구현이므로 지금 작성은 시기상조.

---

## 5. Guide 전체 구조도 ★산출물 1

```text
/guide  (Home — 7 섹션)
├─ ① O4O 이해 ............ o4o-overview · intro · /o4o
├─ ② 서비스 운영자 ........ for-operator → Business Guide ──────────┐
├─ ③ 기능 설명 ........... (6카드) ── /guide/features (8카드) [불일치]│
├─ ④ 사업 안내 ........... 약국·공급자·콘텐츠 네트워크 ──────────────┤
├─ ⑤ 공급자 참여 ......... /supplier · supplier-onboarding         │
├─ ⑥ 판매자·매장 ......... for-seller(HUB·내매장·QR·POP·사이니지·주문)│
└─ ⑦ 파트너 ............. /partner · partner-program               │
                                                                   │
   Business Guide (/guide/business, 3계층) ◀───────────────────────┘
   ├─ 사업 모델: 약국 N/W · 공급자 N/W · 자체 제품
   ├─ 운영 도구: 콘텐츠 · 승인상품 · 이벤트오퍼 · 판매자모집 · 유통펀딩
   └─ 수익 구조: 운영자 수익 구조 (현재 가능/향후 가능 구분)

   역할 Guide(4): for-operator · for-seller · 공급자 · 파트너
   기능 Guide: /guide/intro · /guide/usage · /guide/features(8)
```

---

## 6. 개선 우선순위 ★산출물 5

### P1 — 기능 Guide(사용법) vs Business Guide(운영법) 구분 신호 (저비용·고효과)
- 중복 주제(Event Offer·유통펀딩·콘텐츠) 카드/페이지에 **"기능 사용법" / "사업 운영법" 배지 또는 한 줄 안내** 추가.
- Home 섹션3(기능)·섹션4(사업)에 "이 영역은 무엇을 설명하는가" 머리말 1줄.
- → 혼동①·Q4 해소. (콘텐츠 소폭, route 무변경)

### P2 — 기능 목록 정합화 + 매장측 cross-link
- Home 섹션3(6카드) ↔ `/guide/features`(8카드) **목록 일치**시키거나 한쪽을 SSOT로 명시.
- 기능 Guide에 **"매장에서의 사용법은 판매자/매장 가이드(for-seller) 참조"** cross-link 추가(매장측 단품을 새로 만들지 않고 연결).
- for-operator ↔ Business Guide 경계 한 줄 설명("역할·실무는 운영자 가이드, 사업 모델·수익은 Business Guide").
- → 혼동②·중첩·Q5·Q8 해소.

### P3 — 미설명 기능은 "구현 후 편입" (지금은 보류)
- 강좌(LMS)·설문·광고는 **수익화 미구현** → 신규 Guide 작성 시기상조. operator-revenue의 "준비 단계" 표기 유지.
- 매장측 기능 신규 Guide 작성 **불필요**(for-seller가 이미 커버).

---

## 7. 최종 판정

1. **전체 구조는 직전 WO들로 크게 개선됨** — 시작점(Q1)·Business Guide 발견(Q2)·공급자 경로(Q6)는 양호.
2. **남은 핵심 이슈는 "혼동·정합성"이지 "누락"이 아니다.** 매장측 기능은 for-seller가 이미 충실히 설명하므로 **신규 기능 Guide 대량 작성은 불필요**.
3. 따라서 다음 작업은 WO 예상("기능 Guide 정비")과 **방향은 같되 성격이 다름** — 신규 작성이 아니라 **(P1) 기능/사업 구분 신호 + (P2) 기능 목록 정합화·cross-link** 가 우선.
4. 강좌·설문·광고는 기능 구현이 선행되어야 하므로 Guide 작성은 후순위(P3).

> **결론**: "Business Guide를 더 만들지 / 기능 Guide를 보강할지 / 운영자 Guide를 정비할지" 질문에 대한 답 — **셋 다 신규 작성은 불필요. 다음 작업은 P1(구분 신호) + P2(정합화·cross-link)라는 경량 정비 WO 1건이 적절하다.**
