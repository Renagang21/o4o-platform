# IR-O4O-NETURE-BUSINESS-INTRO-FLOW-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·UI·콘텐츠 변경 없음.**
>
> Neture O4O 소개 영역 전체의 진입 구조와 설명 순서를 점검. **사업자가 1~2분 안에 "내 사업과 관련이 있다"고 느낄 수 있는가** 가 핵심 기준.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행:** 사용자 요청 — "추가 WO 만들기 전 전체 소개 흐름 점검"
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음 (docs 외).
- **수정 행위:** 없음

---

## 0. 최종 결론 — 한 줄 요약

> **사용자 IR template 의 가정 경로 (`/o4o/competitiveness`, `/o4o/business`, `/o4o/cases`, `/o4o/apply`) 는 실제 구현에 없음. 현재 구현은 16+ 페이지로 오히려 더 분산되어 있으며, 메인 CTA 가 사업자용 진입 (`business-inquiry` / `consultation`) 과 연결되어 있지 않음. 통합 우선 권고.**

### 핵심 발견 3 가지

| # | 발견 | 영향 |
|---|------|------|
| 1 | **사용자 mental model ≠ 실제 구현** — `/o4o/business`, `/o4o/cases`, `/o4o/apply`, `/o4o/competitiveness` 4 경로 모두 부재. 실제는 `/o4o/concepts`, `/o4o/principles`, `/o4o/structure`, `/o4o/services`, `/o4o/channel-map`, `/o4o/intro`, 5 `targets/{type}`, 4 `channels/{type}`, `business-inquiry`, `consultation`, `site-operator`, `other-targets` = **17 페이지** | 사용자가 인지하는 IA 와 실제 IA 가 다름 — drift |
| 2 | **메인 CTA orphan** — `O4OMainPage` 의 CTA = `/supplier` + `/partner` + `/o4o/intro`. **`/o4o/business-inquiry` 와 `/o4o/consultation` 으로 link 없음** | 사업자 진입 경로가 메인 페이지에 부재 |
| 3 | **`O4OMainPage` 자체가 9 섹션 포괄** — Hero / 문제 / 개념 / 대상 / 서비스 / 실행구조 / 결과 / 상세진입 / CTA. 별도 페이지 (`/o4o/concepts`, `/o4o/structure`, `/o4o/services`) 는 같은 주제를 다시 다룸 | 정보 중복 — 단계 추가의 정당화 약함 |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 범위 | `services/web-neture/src/pages/o4o/**` + `App.tsx` route 매핑 + `NetureGlobalHeader.tsx` 진입 + cross-page Link grep |
| 조사 방법 | route 정적 분석 + 페이지 콘텐츠 read + Link 의존 그래프 추적 |

---

## 2. 산출물 1 — 현재 설계된 전체 페이지 흐름 (실제 구현)

### 2.1 `/o4o/*` 실제 route 17 개 (App.tsx L674~695)

| Route | Page | 역할 (추정) | 길이 (sections) |
|---|---|---|:---:|
| `/o4o` | O4OMainPage | 메인 (9 섹션 포괄) | 9 |
| `/o4o/intro` | O4OIntroPage | 구조 도식 (공급자/매장/파트너/운영자) | 4 |
| `/o4o/concepts` | O4OConceptsPage | 철학 페이지 | 미파악 |
| `/o4o/principles` | O4OPrinciplesPage | 원칙 | 미파악 |
| `/o4o/structure` | O4OStructurePage | 흐름 | 미파악 |
| `/o4o/services` | O4OServicesPage | 제공 서비스 | 미파악 |
| `/o4o/channel-map` | ChannelMapPage | 채널 지도 | 미파악 |
| `/o4o/site-operator` | SiteOperatorPage | 사이트 운영자 안내 | 미파악 |
| `/o4o/targets/pharmacy` | PharmacyTargetPage | 약국 대상 | — |
| `/o4o/targets/clinic` | ClinicTargetPage | 의원 대상 | — |
| `/o4o/targets/salon` | SalonTargetPage | 미용 대상 | — |
| `/o4o/targets/optical` | OpticalTargetPage | 안경 대상 | — |
| `/o4o/targets/dental` | DentalTargetPage | 치과 대상 | — |
| `/o4o/other-targets` | OtherTargetsPage | 기타 업종 | — |
| `/o4o/channels/pharmacy` | PharmacyChannelExplanationPage | 약국 채널 설명 | — |
| `/o4o/channels/optical` | OpticalChannelExplanationPage | 안경 채널 설명 | — |
| `/o4o/channels/medical` | MedicalChannelExplanationPage | 의료 채널 설명 | — |
| `/o4o/channels/dental` | DentalChannelExplanationPage | 치과 채널 설명 | — |
| `/o4o/business-inquiry` | BusinessInquiryPage | 사업 문의 | 4 |
| `/o4o/consultation` | ConsultationRequestPage | 상담 요청 | 4 |

→ **합계: 20 route, 17~18 unique page concept.**

### 2.2 사용자 IR template 의 가정 vs 실제

| 사용자 가정 경로 | 실제 구현 | 비고 |
|---|---|---|
| `/o4o` | ✅ O4OMainPage | 일치 |
| `/o4o/competitiveness` | ❌ 부재 | 가정 |
| `/o4o/business` | ❌ 부재 (대신 `/o4o/targets/*` 5 개) | 매핑 다름 |
| `/o4o/business/cooperative` | ❌ 부재 | 가정 |
| `/o4o/business/store-group` | ❌ 부재 | 가정 |
| `/o4o/cases` | ❌ 부재 | 가정 |
| `/o4o/cases/{slug}` | ❌ 부재 | 가정 |
| `/o4o/apply` | ❌ 부재 (대신 `/o4o/business-inquiry`, `/o4o/consultation` 2 개) | 매핑 다름 |

→ **사용자 mental model (8 page IA) vs 실제 (17+ pages)** — 큰 drift.

### 2.3 Cross-Page Link 그래프 (실제 흐름)

```text
/o4o (O4OMainPage)
 ├─ DetailEntrySection → /o4o/intro
 └─ CTA → /supplier · /partner · /o4o/intro
         (❌ /o4o/business-inquiry 미연결)
         (❌ /o4o/consultation 미연결)

/o4o/intro (O4OIntroPage)
 └─ CTA → /o4o/concepts  + back → /o4o

/o4o/concepts (O4OConceptsPage)
 └─ CTA → /o4o/principles + back → /o4o

/o4o/structure (O4OStructurePage)
 └─ CTA → /o4o/services + back → /o4o

/o4o/targets/{type} (5 pages)
 └─ → /o4o/channels/{type} (4 only, no /channels/salon)
 └─ back → /o4o

/o4o/channels/{type} (4 pages)
 └─ CTA → /o4o (back to main)

/o4o/business-inquiry → back → /o4o
/o4o/consultation → back → /o4o
/o4o/site-operator → back → /o4o
/o4o/other-targets → back → /o4o
```

→ **메인 페이지에서 사업자 진입 (business-inquiry/consultation) 으로 직접 link 없음.** 사업자가 어떻게 도달하는지 불분명.

---

## 3. 산출물 2 — 사업자 관점에서 복잡한 지점

### 3.1 진입 경로 분석

사업자가 `/o4o` 도달 후 "내 사업 적용 검토" 까지의 가능 경로:

#### Path A — Detail entry first
```
/o4o → "전체 구조 보기" CTA → /o4o/intro → /o4o/concepts → /o4o/principles → ... → ???
                                                                            (apply 경로 미정)
```
→ **4+ 클릭, business-inquiry 도달 불가능 (link 없음).**

#### Path B — Target by industry
```
/o4o → 대상 섹션 → /o4o/targets/pharmacy → /o4o/channels/pharmacy → /o4o (다시 메인)
```
→ **3 클릭 후 다시 메인.** business-inquiry 미연결.

#### Path C — Direct via URL (사업자가 알면)
```
직접 /o4o/business-inquiry 또는 /o4o/consultation
```
→ **URL 을 미리 알아야 가능.** 메인 진입 시 발견 불가.

### 3.2 사업자 mental model 과 충돌

| 사업자가 기대하는 흐름 | 실제 가능 경로 |
|---|---|
| 1. 왜 필요한가 (problem) | ✅ `/o4o` 의 ProblemSection (섹션 2) |
| 2. 무엇이 좋은가 (value) | ✅ `/o4o` 의 ConceptSection / OutcomeSection (섹션 3, 7) — but 또 `/o4o/concepts` 페이지 별도 존재 |
| 3. 누가 쓰는가 (target) | ✅ `/o4o` 의 TargetSection (섹션 4) + `/o4o/targets/{type}` 5 페이지 — **중복** |
| 4. 어떻게 쓰는가 (how) | ✅ `/o4o` 의 ServiceSection / ExecutionSection (섹션 5, 6) + `/o4o/services`, `/o4o/structure` 페이지 별도 — **중복** |
| 5. 내 사업에 적용하려면? | ❌ **`/o4o` CTA 에 미노출** — Path C URL 직타이프만 가능 |

→ **5 단계 모두 `/o4o` 메인 안에 이미 있으나 (1~4), 적용 (5) 만 빠짐.** 별도 페이지 (`concepts`, `principles`, `structure`, `services`, `targets/*`) 는 메인의 same 섹션을 길게 다루는 보조 자료.

### 3.3 복잡함의 핵심

1. **메인이 이미 완결되어 있는데도 별도 페이지가 추가됨** — `/o4o/concepts`, `/o4o/structure`, `/o4o/services` 는 메인의 같은 섹션 재설명. 사업자 입장에서 "왜 또 봐야 하나?" 의문
2. **진입 (사업 문의) 페이지가 메인 CTA 에 없음** — Path C URL 직타 만 가능 → 발견성 0
3. **세부 페이지간 횡적 link 부재** — `/o4o/concepts` → `/o4o/principles` 한 방향만 (다른 페이지로 못 감)
4. **`/o4o/intro` 가 사실상 메인과 정보 중복** — 메인이 이미 도식적 구조 다룸

---

## 4. 산출물 3 — 필수 / 선택 / 후순위 분류

### 4.1 필수 (메인 흐름)

| 페이지 | 사유 |
|---|------|
| `/o4o` (O4OMainPage) | 메인 진입 (9 섹션 포괄, 이미 충분) |
| `/o4o/business-inquiry` 또는 `/o4o/consultation` 중 **하나** | 적용 / 문의 진입 (1 개로 통합) |

→ **필수 = 2 페이지.**

### 4.2 선택 (보조 자료, 사례·심화 desire 시)

| 페이지 | 사유 |
|---|------|
| `/o4o/targets/{type}` (5) | 업종별 상세 — 메인의 TargetSection 에서 진입 시 깊이 있는 설명. 단, 통합 페이지 1 개로 축소 가능 |
| `/o4o/channels/{type}` (4) | 채널 상세 — targets 와 결합 가능 |
| `/o4o/intro` (구조 도식) | 메인의 ConceptSection / ExecutionSection 과 정보 중복 — 폐기 또는 메인 흡수 가능 |

→ **선택 = 5 (industry 통합) + 1 (intro)** 또는 더 축소.

### 4.3 후순위 (현재 trace 어려움 / 중복)

| 페이지 | 사유 |
|---|------|
| `/o4o/concepts` | 메인의 ConceptSection 과 중복 — 흡수 권고 |
| `/o4o/principles` | concepts → principles 흐름 외 진입 없음. 메인 OutcomeSection 흡수 가능 |
| `/o4o/structure` | 메인의 ExecutionSection 과 중복 |
| `/o4o/services` | 메인의 ServiceSection 과 중복 |
| `/o4o/channel-map` | 채널 지도 — 메인 / targets 와 정보 분산 |
| `/o4o/site-operator` | 사이트 운영자 — target 아닌 별도 trace |
| `/o4o/other-targets` | 기타 업종 — targets 와 분리될 필요 약함 |
| `/o4o/business-inquiry` vs `/o4o/consultation` | 거의 동일 의도 (사업자 문의) — 1 개로 통합 권고 |

→ **후순위 (통합/폐기 후보) = 8 페이지.**

---

## 5. 산출물 4 — 클릭 단계 수 조사

### 5.1 현재 상태 (사업자가 "내 사업 적용" 판단까지)

| 시나리오 | 클릭 수 | 결과 |
|---|:---:|---|
| `/o4o` → 적용 문의 | **불가능** | CTA 에 link 없음 |
| `/o4o` → 업종 적합 판단 | 2 | `/o4o/targets/pharmacy` 도달 (적합성 OK) |
| `/o4o` → 업종 + 채널 + 적용 | **불가능 직선** | targets/* → channels/* → (back to /o4o) → ??? (apply 진입 없음) |
| `/o4o` URL 직타 → 문의 | 0 클릭 (URL 알아야) | `/o4o/business-inquiry` |

### 5.2 이상적 상태 (사용자 기준: 1~2 분 안에 적용 판단)

| 시나리오 | 권고 클릭 수 |
|---|:---:|
| 메인 안에서 모든 핵심 정보 + 적용 CTA 확인 | **0~1 클릭** |
| 업종별 상세 desire 시 | +1 클릭 (`/o4o/targets/{type}`) |
| 실제 문의 진입 | +1 클릭 (`/o4o/business-inquiry`) |

→ **목표 = 메인 1 페이지 + 1~2 클릭 분기 = 2~3 페이지로 완결.**

### 5.3 차이

현재 6+ 클릭 가능 (`intro → concepts → principles → structure → services`) vs 이상 0~3 클릭. **약 50~60% 단축 가능.**

---

## 6. 산출물 5 — 페이지 역할 재정의

| 페이지 | 현 역할 | 권고 역할 | 첫 진입 가능? | 통합 가능? |
|---|---|---|:---:|:---:|
| `/o4o` (O4OMainPage) | 메인 (9 섹션) | **메인 + 적용 CTA 강화** | ✅ | ❌ |
| `/o4o/intro` | 구조 도식 | **메인 흡수** (`ExecutionSection` 으로) | △ | ✅ (폐기) |
| `/o4o/concepts` | 철학 | **메인 흡수** (`ConceptSection` 으로) | △ | ✅ (폐기) |
| `/o4o/principles` | 원칙 | **메인 흡수** (`OutcomeSection` 으로) | △ | ✅ (폐기) |
| `/o4o/structure` | 흐름 | **메인 흡수** | △ | ✅ (폐기) |
| `/o4o/services` | 서비스 | **메인 흡수** (`ServiceSection` 으로) | △ | ✅ (폐기) |
| `/o4o/channel-map` | 채널 지도 | **메인 흡수 또는 targets 결합** | △ | ✅ |
| `/o4o/site-operator` | 사이트 운영자 | targets/* 와 별도 도메인 — 유지 또는 partner 흡수 | △ | △ |
| `/o4o/other-targets` | 기타 업종 | **targets 흡수** | △ | ✅ |
| `/o4o/targets/{type}` (5) | 업종별 상세 | **유지** — but 통합 페이지 1 개 + tab 또는 anchor 로 축소 검토 | ✅ | △ |
| `/o4o/channels/{type}` (4) | 채널 설명 | **targets/* 와 통합** | △ | ✅ |
| `/o4o/business-inquiry` | 사업 문의 | **`/o4o/apply` 통합 + 메인 CTA 강화** | ✅ | ✅ |
| `/o4o/consultation` | 상담 요청 | **business-inquiry 와 통합** | ✅ | ✅ |

### 6.1 통합 시뮬레이션

- **17 → 4 페이지로 축소 가능:**
  - `/o4o` (메인, 모든 설명 흡수 + 적용 CTA)
  - `/o4o/targets` (업종 통합 페이지) — 또는 `/o4o/targets/{type}` 5 유지
  - `/o4o/apply` (business-inquiry + consultation 통합)
  - `/o4o/site-operator` (별도 도메인 유지 시)

---

## 7. 산출물 6 — CTA 구조 조사

### 7.1 현재 CTA 분산 상태

| 페이지 | 1차 CTA | 2차 CTA | 적용 진입 CTA |
|---|---|---|---|
| `/o4o` | `/supplier` | `/partner` | ❌ **없음** (`/o4o/intro` 만) |
| `/o4o/concepts` | `/o4o/principles` | back → `/o4o` | ❌ |
| `/o4o/structure` | `/o4o/services` | back → `/o4o` | ❌ |
| `/o4o/targets/{type}` | `/o4o/channels/{type}` | back → `/o4o` | ❌ |
| `/o4o/channels/{type}` | back → `/o4o` | — | ❌ |
| `/o4o/business-inquiry` | (inquiry form) | back → `/o4o` | (자기 자신) |
| `/o4o/consultation` | (request form) | back → `/o4o` | (자기 자신) |

→ **`/o4o/business-inquiry` 또는 `/o4o/consultation` 으로의 1차 CTA 가 0 페이지.**

### 7.2 권장 CTA 구조

| 위치 | 1차 CTA | 2차 CTA |
|---|---|---|
| **모든 페이지 footer** | **"내 사업에 적용 검토" → `/o4o/apply`** (통합 페이지) | "공급자/파트너 참여" → `/supplier` / `/partner` |
| `/o4o` 메인 (CtaSection) | **"내 사업에 적용 검토 → /o4o/apply"** 추가 (현재 없음) | `/supplier` + `/partner` 유지 |
| `/o4o/targets/{type}` | "내 업종에 적용 검토 → `/o4o/apply?industry={type}`" | "다른 업종 보기" |

→ **모든 페이지에서 1차 CTA = 적용 진입.** 사업자가 어디서 출발하든 1 클릭으로 문의 도달 가능.

---

## 8. 산출물 7 — 권장 최종 IA 초안

### 8.1 권고 A — 최소 IA (4 페이지)

```text
/o4o
- Hero (왜 필요한가)
- 문제 / 가치 / 대상 / 서비스 / 실행 / 결과 (현재 메인의 9 섹션 유지)
- 대표 사례 요약 (3~4 개, 카드)
- 적용 CTA → /o4o/apply

/o4o/targets        (또는 /o4o/targets/{type} 5 페이지 유지)
- 업종별 상세 + 채널 정보 (현재의 channels/* 흡수)
- 적용 CTA → /o4o/apply?industry={type}

/o4o/apply          (business-inquiry + consultation 통합)
- 문의 / 상담 통합 form
- 공급자/파트너 분기

(선택) /o4o/site-operator
- 사이트 운영자 전용 (별 도메인이라면 유지)
```

→ **4 페이지 (target 별 5 유지 시 8 페이지).** 현재 17 → 4~8 로 약 50~75% 축소.

### 8.2 권고 B — 보존형 IA (현재 페이지 다수 유지하되 흐름 정리)

```text
/o4o                            (메인 — CTA 에 /o4o/apply 추가)
/o4o/targets/{type}             (현재 5 페이지 유지)
/o4o/channels/{type}            (현재 4 페이지 — targets/* 와 cross link)
/o4o/apply                      (business-inquiry + consultation 통합)
/o4o/site-operator              (현재 유지)

[deprecate / merge to /o4o]
/o4o/intro
/o4o/concepts
/o4o/principles
/o4o/structure
/o4o/services
/o4o/channel-map
/o4o/other-targets
```

→ **5 active + 7 deprecated.** 점진적 통합.

### 8.3 권고 — A 채택

A 가 사용자 기준 ("1~2 분 안에 적용 판단") 에 더 부합. B 는 redirect 만 추가하여 SEO 영향 최소화하는 보수 옵션.

---

## 9. 산출물 8 — Drift 본질 분석

### 9.1 사용자 mental model vs 실제 구현

| 측면 | 사용자 가정 | 실제 |
|---|---|---|
| 페이지 수 | 8 (`/o4o/{competitiveness, business[+2 subtype], cases[+slug], apply}`) | 17+ |
| 핵심 진입 명명 | `/o4o/apply` | `/o4o/business-inquiry` + `/o4o/consultation` (2 개로 분리) |
| 사업자 유형 페이지 | `/o4o/business/{cooperative,store-group}` (2) | `/o4o/targets/{5 industries}` (5) — 사업 유형 vs 업종 |
| 사례 페이지 | `/o4o/cases` + `/cases/{slug}` | 부재 — `/o4o/targets/{type}` 안에 일부 사례 포함 |
| 경쟁력 페이지 | `/o4o/competitiveness` | 부재 — `/o4o` 메인의 OutcomeSection 흡수 |

→ **사용자 mental model 이 실제보다 명료. 실제 구현은 더 산만.**

### 9.2 Root cause

1. **Iterative WO 추가** — 페이지마다 별도 WO 로 생성 (`O4O-CONCEPTS-PAGE-V1`, `O4O-STRUCTURE-PAGE-V1`, `O4O-INTRO-STRUCTURE-PAGE-V1` 등). 각 WO 가 독립 페이지를 만들며 통합 검토 부재
2. **메인이 이미 9 섹션 포괄** — 후행 페이지가 메인의 같은 섹션 재설명
3. **메인 CTA 가 보강 안 됨** — `/o4o/business-inquiry`, `/o4o/consultation` 생성 시 메인 CTA 갱신 누락
4. **사업자 vs 공급자/파트너 진입 경로 혼동** — 메인 CTA 가 `/supplier`, `/partner` 만 강조 → 사업자 (매장 / 적용 검토) 진입 부재

---

## 10. 산출물 9 — 후속 WO 수정 방향

### 10.1 즉시 필요 (P0)

**`WO-O4O-NETURE-BUSINESS-INTRO-CTA-RECONNECT-V1`** (제안):
- `/o4o` 메인 CtaSection 에 **"내 사업에 적용 검토" CTA 추가** → `/o4o/business-inquiry` (또는 통합 `/o4o/apply`)
- 단일 파일 수정 (O4OMainPage.tsx)
- 모든 페이지 footer 에 "적용 검토" CTA 추가 (3~4 파일)
- 회귀 위험: 낮음

### 10.2 통합 WO 시리즈 (P1)

**`IR-O4O-NETURE-INTRO-PAGE-CONSOLIDATION-DESIGN-V1`** (선행):
- 17 페이지 → 4~5 페이지로 축소 계획
- 각 페이지의 내용을 메인으로 흡수하는 mapping 결정
- redirect 전략 (deprecated 페이지 → `/o4o` 또는 통합 페이지)

**`WO-O4O-NETURE-INTRO-CONSOLIDATION-V1`** (실행):
- /o4o/intro, /o4o/concepts, /o4o/principles, /o4o/structure, /o4o/services 통합/폐기
- /o4o/business-inquiry + /o4o/consultation → /o4o/apply 통합

### 10.3 보류 (사용자 결정 후)

- `/o4o/cases` 페이지 신설 여부 — 사례를 별도 페이지로 둘지, 메인의 카드로 둘지
- `/o4o/competitiveness` 페이지 신설 여부 — 메인 OutcomeSection 으로 충분한지

---

## 11. Current Structure vs O4O Philosophy Conflict Check

| 차원 | 현재 | 충돌 |
|---|:---:|:---:|
| 사업자 mental model 정합 | △ — 17 페이지가 사용자가 인지하는 IA 와 다름 | **약함** |
| 메인 CTA 와 사업자 진입 매칭 | ❌ — `/o4o` CTA 에 사업자 적용 CTA 없음 | **있음** |
| 페이지간 정보 중복 | ❌ — concepts/structure/services 가 메인 섹션 재설명 | **있음** |
| 1~2 분 안에 적용 판단 가능성 | ❌ — 적용 진입 (`business-inquiry`) 발견 불가 | **있음 (P0)** |
| 공급자/파트너 vs 사업자 진입 균형 | ❌ — 공급자/파트너만 메인 CTA 강조 | **있음** |
| 페이지 분리 정당화 (필수성) | △ — 7 페이지가 메인 흡수 가능 | **있음** |
| `/supplier`, `/partner` 별도 도메인 | ✅ 적절 분리 | 없음 |
| `/o4o/targets/{type}` 업종별 상세 | ✅ 의도된 도메인 분기 | 없음 |

→ **충돌 5 건.** 본 IR 의 권고 (메인 CTA 강화 + 페이지 통합) 가 해소 경로.

---

## 12. 본 IR 이 결정하지 않는 것

- 실제 페이지 통합/폐기 작업 (조사 전용)
- "사례" 페이지 신설 여부 — 별건 결정
- 메인 / 통합 페이지 의 정확한 콘텐츠 — 별건 콘텐츠 설계 IR
- `/o4o/site-operator` 의 partner 흡수 여부
- redirect 전략 (deprecated → 어디로)
- 권고 A vs B 의 최종 채택
- target 별 5 페이지 유지 vs 1 통합 페이지 + tab — 별건 IR

---

## 13. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 즉시 WO 후보 | **1 건** (`WO-O4O-NETURE-BUSINESS-INTRO-CTA-RECONNECT-V1` — 메인 CTA 적용 진입 추가) |
| 별건 IR 후보 | **2 건** (consolidation design, 콘텐츠 매핑) |
| 별건 WO 후보 | **1 건** (consolidation 실행) |
| 사용자 mental model 과 실제 구현 drift 명문화 | ✅ 8 vs 17 페이지 |
| "메인 CTA orphan" 문제 식별 | ✅ business-inquiry / consultation 발견 불가 |
| 사이클 정리 | 본 IR 로 "더 추가하지 말고 통합부터" 결정 정당화 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. 실제 /o4o 페이지 파일 목록
find services/web-neture/src/pages/o4o -name '*.tsx' | sort

# 2. /o4o route 등록
grep -n 'path="/o4o' services/web-neture/src/App.tsx

# 3. 페이지간 Link 의존 그래프
grep -rn 'to="/o4o' services/web-neture/src

# 4. 사용자 가정 경로 부재 확인
for p in /o4o/competitiveness /o4o/business /o4o/cases /o4o/apply; do
  echo "=== $p ==="
  grep -rn "to=\"$p\"" services/web-neture/src | head -3
done

# 5. 메인 CTA 콘텐츠
grep -n "Link to=" services/web-neture/src/pages/o4o/O4OMainPage.tsx
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — 17+ 페이지 over-fragmentation 확정 + 메인 CTA orphan 확정. 즉시 WO 1 + 별건 IR 2 + 별건 WO 1 후보.*
*Decision Required: (P0) 메인 CTA 보강 WO 진입 여부, (P1) 통합 IR 진입 여부, (Sel) 권고 A vs B 채택.*
