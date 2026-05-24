# IR-O4O-NETURE-INTRO-PAGE-CONSOLIDATION-DESIGN-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·UI·콘텐츠 변경 없음.**
>
> Neture O4O 소개 17+ 페이지의 통합 설계. **사업자가 0~2 클릭 안에 "내 사업에 적용해 볼 수 있겠다" 판단 + 행동** 으로 이동하는 IA 결정.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-NETURE-BUSINESS-INTRO-FLOW-AUDIT-V1](IR-O4O-NETURE-BUSINESS-INTRO-FLOW-AUDIT-V1.md) (17 페이지 over-fragmentation 확정)
  - WO-O4O-NETURE-BUSINESS-INTRO-CTA-RECONNECT-V1 (commit `b1c2de56f`, P0 CTA reconnect 완료)
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음 (docs + 다른 세션의 `packages/operator-core-ui/src/modules/resources/`, `services/web-k-cosmetics/src/api/resources.ts` 외).
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 권고 — 한 줄 요약

> **Option A 채택 — 4 페이지 IA (`/o4o` + `/o4o/targets/{5 type}` + `/o4o/apply` + `/o4o/site-operator`). 6 페이지 (concept/principle/structure/services/intro/channel-map) 는 메인 흡수 + redirect. 4 channels 페이지 + other-targets 는 targets 흡수. business-inquiry + consultation 은 `/o4o/apply` 통합.**

### 한눈 분류

| 처리 | 페이지 수 | 항목 |
|------|:--:|------|
| **유지** | 4 | `/o4o`, `/o4o/targets/{type}` (5 개 그룹 → 1 line), `/o4o/apply` (신규 통합 페이지), `/o4o/site-operator` |
| **메인 흡수 + redirect** | 6 | `/o4o/intro`, `/o4o/concepts`, `/o4o/principles`, `/o4o/structure`, `/o4o/services`, `/o4o/channel-map` |
| **targets 흡수 + redirect** | 5 | `/o4o/channels/pharmacy`, `/o4o/channels/optical`, `/o4o/channels/medical`, `/o4o/channels/dental`, `/o4o/other-targets` |
| **`/o4o/apply` 통합** | 2 | `/o4o/business-inquiry`, `/o4o/consultation` |
| **합계** | 17 → **4 active + 13 redirect** | |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 방법 | 페이지별 file header 의 명시 역할 + 콘텐츠 grep + form/입력 필드 부재 확인 |
| 평행 세션 | docs 다수 + 신규 untracked (operator-core-ui resources / web-k-cosmetics api) — 본 IR 범위 무관 |

---

## 2. 산출물 1 — 전체 페이지 역할표 (file header 의 명시 역할 기준)

### 2.1 메인

| 페이지 | 명시 역할 (file header) | 실제 콘텐츠 |
|---|---|---|
| `/o4o` (O4OMainPage) | 메인 (9 섹션 포괄) | Hero / 문제 / 개념 / 대상 / 서비스 / 실행구조 / 결과 / 상세진입 / CTA |

### 2.2 개념/구조/서비스 계열 (6 페이지)

| 페이지 | 명시 역할 (file header) | 메인 대응 섹션 |
|---|---|---|
| `/o4o/intro` (O4OIntroPage) | "구조 (How) — 4 구성요소 도식 (공급자/매장/파트너/운영자)" | ConceptSection / ExecutionSection |
| `/o4o/concepts` (O4OConceptsPage) | "철학 (Why this way)" | ConceptSection / OutcomeSection |
| `/o4o/principles` (O4OPrinciplesPage) | "어떤 기준으로 운영되는지" — 운영 원칙 | (메인에 별도 섹션 없음 — 신설 필요) |
| `/o4o/structure` (O4OStructurePage) | "유통 및 실행 구조" | ExecutionSection |
| `/o4o/services` (O4OServicesPage) | "매장에서 사용할 수 있는 서비스" | ServiceSection |
| `/o4o/channel-map` (ChannelMapPage) | **"placeholder + Gemini 생성 예정 도식" — 미완성** | (해당 없음) |

→ **5 페이지는 메인의 같은 섹션 재설명. ChannelMapPage 는 placeholder.**

### 2.3 대상/업종/채널 계열 (10 페이지)

| 페이지 | 명시 역할 (file header) | 대응 |
|---|---|---|
| `/o4o/targets/pharmacy` (PharmacyTargetPage) | "약국을 대상으로 비즈니스하는 사업자 (공급자, 본부, 파트너)" | — |
| `/o4o/targets/clinic` (ClinicTargetPage) | (동일 패턴, 의원) | — |
| `/o4o/targets/salon` (SalonTargetPage) | (동일 패턴, 미용) | — |
| `/o4o/targets/optical` (OpticalTargetPage) | (동일 패턴, 안경) | — |
| `/o4o/targets/dental` (DentalTargetPage) | (동일 패턴, 치과) | — |
| `/o4o/other-targets` (OtherTargetsPage) | "기타 대상 사업자 안내" | targets 와 동일 도메인 |
| `/o4o/channels/pharmacy` | (header 부재 — 채널 설명) | targets/pharmacy 와 짝 |
| `/o4o/channels/optical` | 동일 | targets/optical 와 짝 |
| `/o4o/channels/medical` | 동일 | targets/clinic 와 짝 |
| `/o4o/channels/dental` | 동일 | targets/dental 와 짝 |

→ **channels/* 4 페이지는 targets/* 의 보조** — 5 개 targets 안에 channel 정보 흡수 가능. `salon` 만 channel 없음.

### 2.4 사업 문의/상담 (2 페이지)

| 페이지 | 명시 역할 | 입력 필드 |
|---|---|:---:|
| `/o4o/business-inquiry` (BusinessInquiryPage) | "o4o 플랫폼을 활용한 사업 구축에 관심 있는 사업자를 위한 안내" | **0** (form 없음 — 정보만) |
| `/o4o/consultation` (ConsultationRequestPage) | "o4o 플랫폼에 대해 알아보고 싶은 사업자를 위한 상담 안내" | **0** (form 없음 — 정보만) |

→ **두 페이지 모두 form 없는 안내 페이지** — 1 개로 통합 가능.

### 2.5 기타 (1 페이지)

| 페이지 | 명시 역할 |
|---|---|
| `/o4o/site-operator` (SiteOperatorPage) | "이미 Cafe24, SaaS 등으로 사이트를 운영하고 있는 사업자 대상" |

→ **별 audience** (기존 사이트 운영자) — targets/* 와 다른 진입점. **유지 권장**.

---

## 3. 산출물 2 — 중복 콘텐츠 매핑표

### 3.1 메인 흡수 가능 항목

| 폐기/redirect 대상 | 메인 흡수 위치 | 흡수 방식 |
|---|---|---|
| `/o4o/intro` | ConceptSection (섹션 3) + ExecutionSection (섹션 6) | 메인 의 구조 도식 강화 (intro 의 4 카드 흡수) |
| `/o4o/concepts` | ConceptSection (섹션 3) + OutcomeSection (섹션 7) | 메인 의 개념 설명 강화 |
| `/o4o/principles` | **NEW: PrinciplesSection** (메인에 추가) | 메인 9 → 10 섹션 (또는 OutcomeSection 흡수) |
| `/o4o/structure` | ExecutionSection (섹션 6) | 메인 의 실행 구조 강화 |
| `/o4o/services` | ServiceSection (섹션 5) | 메인 의 서비스 설명 강화 |
| `/o4o/channel-map` | (placeholder, 미완성) | **삭제** (실제 콘텐츠 없음) 또는 future 도식 완성 시 메인 흡수 |

### 3.2 targets/* 흡수 가능 항목

| 폐기/redirect 대상 | targets 흡수 위치 |
|---|---|
| `/o4o/channels/pharmacy` | `/o4o/targets/pharmacy` 에 channel section 추가 |
| `/o4o/channels/optical` | `/o4o/targets/optical` 에 channel section 추가 |
| `/o4o/channels/medical` | `/o4o/targets/clinic` 에 channel section 추가 (의원=medical 매핑) |
| `/o4o/channels/dental` | `/o4o/targets/dental` 에 channel section 추가 |
| `/o4o/other-targets` | `/o4o/targets` index 페이지 또는 메인의 "기타 업종은 상담 요청" 안내 |

### 3.3 apply 통합 항목

| 폐기/redirect 대상 | apply 흡수 |
|---|---|
| `/o4o/business-inquiry` | `/o4o/apply` 의 "사업 문의" 섹션/탭 |
| `/o4o/consultation` | `/o4o/apply` 의 "상담 요청" 섹션/탭 |

→ **두 페이지 모두 form 없는 안내 페이지** 이므로 통합 시 콘텐츠 손실 없음.

---

## 4. 산출물 3 — targets / channels 통합 방안

### 4.1 옵션 비교

| 옵션 | 구조 | 페이지 수 | 장점 | 단점 |
|---|---|:--:|------|------|
| **A. targets/{type} 5 유지 + channels 흡수** | 5 industry 페이지가 channel 정보 포함 | 5 | 업종별 깊이 + URL anchor 가능 | 5 페이지 유지 |
| B. /o4o/targets 단일 + tab/anchor | 1 페이지 + #pharmacy 등 anchor | 1 | 가장 minimum | 업종별 콘텐츠 길이가 다르면 layout 복잡 |
| C. targets/channels 모두 유지 + cross link | 5+4 그대로 | 9 | 변경 없음 | 현재 문제 그대로 |

→ **권장 A** — 업종별 차이가 의미 있으므로 5 페이지 유지. channels/* 만 흡수.

### 4.2 targets/{type} 강화 시 흡수 내용

각 target 페이지에 다음 section 추가:
- 업종 개요 (현재)
- 사업자 유형 안내 (현재)
- **채널 정보 (channels/* 흡수)**
- 적용 사례 요약 (선택 — 별건)
- CTA → `/o4o/apply?industry={type}`

---

## 5. 산출물 4 — business-inquiry / consultation 통합 방안

### 5.1 두 페이지 비교

| 항목 | business-inquiry | consultation |
|---|---|---|
| Hero 메시지 | "플랫폼 기반 사업 문의" | "o4o 상담 요청" |
| 대상 섹션 | "이런 분들이 문의합니다" (제조/유통, 프랜차이즈, 서비스 기획자) | "상담 가능한 내용" (개요, 적용 가능성, 참여 방법) |
| 진행 과정 섹션 | "문의 후 진행 과정" | "상담 진행 방식" |
| 입력 form | **없음** | **없음** |
| 도메인 | 사업 적용 의도 강함 | 일반 상담 의도 |

→ **유사도 매우 높음.** 두 페이지를 `/o4o/apply` 1 페이지로 통합 가능.

### 5.2 권장 /o4o/apply 구조

```text
/o4o/apply

Hero: "O4O 적용 검토"
  부제: "내 사업에 어떻게 적용할 수 있을지 함께 검토합니다"

Section 1: 누가 문의/상담하나요?
  - 제조/유통 사업자
  - 프랜차이즈/본부
  - 서비스 기획자
  - 일반 사업자 (상담 우선)

Section 2: 검토 / 상담 가능 내용
  - 플랫폼 개요
  - 우리 사업 적용 가능성
  - 참여 방법 (공급자/파트너)
  - 사업 모델 구축

Section 3: 진행 과정
  - 문의 접수 → 1차 검토 → 상담 → 적용 방안 제안

Section 4: 문의 / 상담 진입 (실제 form 또는 외부 link)
  - (현재 두 페이지 모두 form 없음 — 별건으로 form 구현 필요)
```

→ **두 페이지의 콘텐츠 + 작은 보강.**

---

## 6. 산출물 5 — site-operator 처리 방안

### 6.1 옵션

| 옵션 | 결정 |
|---|---|
| 유지 | ✅ **권장** — 다른 audience (기존 사이트 운영자) |
| `/partner` 로 흡수 | 비추천 — partner 는 운영 파트너 (다른 도메인) |
| 메인 보조 link 로만 유지 | 가능 — 메인 의 ProblemSection 또는 CTA 옆에 작은 link |

→ **유지** — 메인의 detail entry 에 link 추가 권장.

---

## 7. 산출물 6 — 최종 IA 후보 비교

### 7.1 Option A — 최소 IA (권장)

```text
/o4o                  메인 (9 섹션 + 원칙 섹션 추가 = 10 섹션)
/o4o/targets/pharmacy 약국 (+ 채널 정보)
/o4o/targets/clinic   의원 (+ 채널 정보, medical)
/o4o/targets/salon    미용
/o4o/targets/optical  안경 (+ 채널 정보)
/o4o/targets/dental   치과 (+ 채널 정보)
/o4o/apply            적용 검토 / 문의 / 상담 통합
/o4o/site-operator    기존 사이트 운영자

[redirect / deprecated]
/o4o/intro            → /o4o
/o4o/concepts         → /o4o
/o4o/principles       → /o4o
/o4o/structure        → /o4o
/o4o/services         → /o4o
/o4o/channel-map      → /o4o (또는 삭제 — placeholder)
/o4o/other-targets    → /o4o#targets
/o4o/channels/pharmacy → /o4o/targets/pharmacy
/o4o/channels/optical  → /o4o/targets/optical
/o4o/channels/medical  → /o4o/targets/clinic
/o4o/channels/dental   → /o4o/targets/dental
/o4o/business-inquiry  → /o4o/apply
/o4o/consultation      → /o4o/apply
```

→ **8 active route + 13 redirect.** 17 → 8 (52% 축소).

### 7.2 Option B — Single targets hub

```text
/o4o                  메인
/o4o/targets          단일 페이지 + #pharmacy/#clinic/#salon/#optical/#dental anchor
/o4o/apply            적용 검토
/o4o/site-operator    기존 사이트 운영자

[redirect]
/o4o/targets/{type}   → /o4o/targets#{type}
+ 위 Option A 의 모든 redirect
```

→ **4 active route + 18 redirect.** 17 → 4 (76% 축소). 더 minimum 이나 콘텐츠 길이 / SEO 측면 약함.

### 7.3 Option C — 허브형 (신규 페이지 추가)

```text
/o4o
/o4o/targets
/o4o/resources        (신규 — 사례 자료실)
/o4o/apply
/o4o/site-operator
```

→ **신규 페이지 추가 — 본 IR 의 "페이지 수 안 늘림" 원칙 위반.** 비추천.

### 7.4 권장 — Option A

이유:
- 17 → 8 (52% 축소) — 의미 있는 축소
- 업종별 5 페이지 유지 — SEO + URL 직접 link + 콘텐츠 깊이 보존
- `/o4o/apply` 신설 — 사업자 진입 통합 (현재 분리된 inquiry/consultation 의 자연스러운 발전)
- `/o4o/site-operator` 별 audience 유지

Option B 는 더 minimum 이나 5 target 의 콘텐츠를 합치면 페이지가 너무 길어지고 SEO 도 약함.

---

## 8. 산출물 7 — Redirect 전략 초안

### 8.1 Redirect Matrix

| From | To | HTTP | 사유 |
|---|---|:--:|------|
| `/o4o/intro` | `/o4o` | 301 | 메인 흡수 |
| `/o4o/concepts` | `/o4o` | 301 | 메인 흡수 |
| `/o4o/principles` | `/o4o` (또는 `/o4o#principles` 신설 후) | 301 | 메인 흡수 + 신설 섹션 |
| `/o4o/structure` | `/o4o` | 301 | 메인 흡수 |
| `/o4o/services` | `/o4o` | 301 | 메인 흡수 |
| `/o4o/channel-map` | `/o4o` (또는 삭제) | 301 / 410 | placeholder 폐기 |
| `/o4o/other-targets` | `/o4o` | 301 | targets 흡수 |
| `/o4o/channels/pharmacy` | `/o4o/targets/pharmacy` | 301 | targets 흡수 |
| `/o4o/channels/optical` | `/o4o/targets/optical` | 301 | 동일 |
| `/o4o/channels/medical` | `/o4o/targets/clinic` | 301 | 의원 매핑 |
| `/o4o/channels/dental` | `/o4o/targets/dental` | 301 | 동일 |
| `/o4o/business-inquiry` | `/o4o/apply` | 301 | 통합 |
| `/o4o/consultation` | `/o4o/apply` | 301 | 통합 |

### 8.2 Implementation 옵션

- **React Router `<Navigate to="..." replace />`** — client-side redirect (이미 App.tsx 에 `/platform/principles → /o4o/principles` 같은 패턴 존재)
- **HTTP 301** — Cloud Run / CDN 레벨 (SEO 최적, 그러나 deploy 설정 필요)

→ 권장: React Router `<Navigate />` 로 시작 (배포 즉시 효과), SEO 영향 큰 페이지는 추후 HTTP 301 보강.

### 8.3 SEO 고려

- 기존 외부 link / search index 의 13 페이지 → redirect 로 권한 이전
- `/o4o/apply` 는 신규 페이지 — sitemap / robots 업데이트 필요
- channels/* 의 검색 권한이 targets/* 로 이전됨

---

## 9. 산출물 8 — CTA 구조 초안

### 9.1 페이지별 CTA 매트릭스

| 페이지 | 1차 CTA | 2차 CTA | 보조 |
|---|---|---|---|
| `/o4o` | **내 사업에 적용 검토 → `/o4o/apply`** (현재 P0 작업 완료) | 전체 구조 보기 → `/o4o#concept` (메인 anchor) | 공급자 / 운영 파트너 / 사이트 운영자 |
| `/o4o/targets/{type}` | **내 업종에 적용 검토 → `/o4o/apply?industry={type}`** | 다른 업종 보기 → `/o4o#targets` | 공급자 / 파트너 |
| `/o4o/apply` | (form 또는 외부 link) | back → `/o4o` | — |
| `/o4o/site-operator` | **사이트 적용 검토 → `/o4o/apply?type=site-operator`** | 메인으로 → `/o4o` | — |

### 9.2 공급자 / 파트너 CTA 위치

| 위치 | 처리 |
|------|------|
| 메인 CtaSection 의 2차 (현재) | 유지 |
| 모든 페이지 footer | 보조 link 정도 |

---

## 10. 산출물 9 — 후속 WO 범위 제안

### 10.1 본 IR 의 직접 후속 — Step-by-step 분리

| Step | WO | 범위 |
|:--:|----|------|
| **1** | `WO-O4O-NETURE-APPLY-PAGE-CONSOLIDATION-V1` | `/o4o/apply` 신규 생성 + business-inquiry/consultation 콘텐츠 흡수 + 두 페이지 redirect |
| **2** | `WO-O4O-NETURE-CHANNEL-PAGES-ABSORB-V1` | channels/* 4 페이지의 콘텐츠를 targets/{equivalent} 안의 section 으로 흡수 + 4 페이지 redirect |
| **3** | `WO-O4O-NETURE-CONCEPT-PAGES-DEPRECATE-V1` | concept/principle/structure/services/intro/channel-map 6 페이지 redirect to `/o4o` + 메인 섹션 강화 (필요 시 PrinciplesSection 신설) |
| **4** | `WO-O4O-NETURE-OTHER-TARGETS-ABSORB-V1` | other-targets redirect + 메인 / targets 의 "기타 업종 상담" 안내 보강 |

→ **4 step WO 시리즈.** Step 1 (apply) 이 가장 가치 — 즉시 사업자 통합 진입 회복.

### 10.2 보류 (사용자 결정 후)

- `/o4o/apply` 의 실제 form 구현 — 현재 두 페이지 모두 form 없음. backend endpoint 필요 시 별건
- `/o4o/cases` 또는 사례 페이지 신설 — 통합 후 재검토
- `/o4o/competitiveness` 신설 — 메인 OutcomeSection 으로 충분한지 검증 후
- target 별 콘텐츠 강화 (channels 흡수 후 length 증가 시 layout 조정)

---

## 11. Current Structure vs O4O Philosophy Conflict Check

| 차원 | 현재 (P0 완료 후) | Option A 채택 후 | 충돌 |
|---|:---:|:---:|:---:|
| 사업자 mental model 정합 | △ 17 페이지 | ✅ 8 페이지 | **해소** |
| 메인 CTA 와 사업자 진입 매칭 | ✅ (P0 완료) | ✅ 강화 (`/o4o/apply` 신설) | 없음 |
| 페이지간 정보 중복 | ❌ concept/structure/services 가 메인 재설명 | ✅ 메인 흡수 | **해소** |
| 1~2 분 안에 적용 판단 | ✅ (P0 완료) | ✅ 더 빠름 | 없음 |
| 공급자/파트너 vs 사업자 진입 균형 | ✅ (P0 완료) | ✅ 유지 | 없음 |
| 페이지 분리 정당화 (필수성) | ❌ 7 페이지 흡수 가능 | ✅ 해소 | **해소** |
| URL 안정성 (SEO / 외부 link) | △ 변경 없음 | △ 13 redirect 적용 | 약함 |
| 사례 페이지 신설 욕구 | (보류) | (보류) | — |

→ **충돌 3 건 해소, 약함 1 건 (SEO 영향 — redirect 로 minimize).**

---

## 12. 본 IR 이 결정하지 않는 것

- 실제 코드 변경 (조사 전용)
- redirect 구현 방식 (React Router vs HTTP 301)
- `/o4o/apply` 의 form 구현 (backend endpoint 신설 여부)
- 메인 PrinciplesSection 신설 여부 (콘텐츠 흡수 시 결정)
- `/o4o/channel-map` 의 삭제 vs redirect (placeholder 의 미래 활용 여부)
- 사례 페이지 신설 (별건)
- target 별 콘텐츠 합치기 후 layout 조정
- 다른 service (KPA/GP/K-Cos) 의 동일 패턴 audit (cross-service drift 분리)
- Cloud Run / CDN 레벨 HTTP 301 설정

---

## 13. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| Step-by-step WO 후보 | **4 건** (apply / channels / concepts / other-targets) |
| 신규 페이지 | **1 건** (`/o4o/apply` — 기존 2 페이지 흡수) |
| 페이지 축소 | 17 → 8 (52%) |
| Redirect 적용 | 13 페이지 |
| 사업자 진입 단계 | 0~2 클릭 보장 (P0 완료 + apply 통합 후) |
| 사이클 정리 | "통합 우선" 결정 명문화 — 추가 신규 페이지 신설 차단 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. /o4o 페이지 파일 + file header 의 명시 역할
for f in services/web-neture/src/pages/o4o/*.tsx; do
  echo "=== $(basename $f) ==="
  head -30 "$f" | grep -E "역할|목적|관점|개념|구조" | head -3
done

# 2. business-inquiry / consultation 의 form 부재 확인
for f in BusinessInquiryPage ConsultationRequestPage; do
  echo "=== $f form fields ==="
  grep -E "input.*type=|form|submit|name=" "services/web-neture/src/pages/o4o/$f.tsx" | head -5
done

# 3. ChannelMapPage 의 placeholder 확인
head -20 services/web-neture/src/pages/manual/concepts/ChannelMapPage.tsx

# 4. App.tsx 의 /o4o route 매핑
grep -n 'path="/o4o' services/web-neture/src/App.tsx

# 5. cross-page Link 의존 그래프
grep -rn 'to="/o4o' services/web-neture/src
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — Option A (4 active + 13 redirect) 권장. 4 step WO 시리즈로 분리 진행.*
*Decision Required: (1) Option A vs B vs C 채택, (2) Step 1 (`/o4o/apply` 통합) 진입 여부, (3) `/o4o/apply` 의 form 구현 시점.*
