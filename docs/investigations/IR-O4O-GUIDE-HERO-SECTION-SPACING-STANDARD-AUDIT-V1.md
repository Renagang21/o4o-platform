# IR-O4O-GUIDE-HERO-SECTION-SPACING-STANDARD-AUDIT-V1

> **Type:** Investigation (read-only). 코드/스타일/문구 무변경.
> **Date:** 2026-06-10
> **Scope:** ① `/guide` 섹션명 정리 위치 ② Guide Home 카드 문안 밀도 ③ Hero→본문 간격 표준 조사
> **결론:** 섹션명·카드 문안은 단일 위치 수정. **Hero→본문 간격은 가이드 공통 컴포넌트 레이어 문제**(개별 페이지 아님) → 공통 수정으로 4개 서비스 가이드 동시 해결.

---

## 1. 조사 목적

1. `O4O 기반 사업 운영 예` → `O4O 사업 적용 예시` 수정 위치·영향 범위 확인.
2. Guide Home 사업 적용 예시 카드 문안이 과도하게 긴지 확인하고 축소 방향 정리.
3. Hero와 첫 본문 섹션 간격 문제를 개별 페이지가 아닌 **공통 레이아웃 기준**으로 조사.
4. 공통 spacing 표준 제안 + 후속 WO 범위 분리.

조사 전용 — 코드 수정 없음.

## 2. 조사 범위

- `services/web-neture/src/pages/guide/GuideHomePage.tsx`
- `packages/shared-space-ui/src/guide/*.tsx` (GuideFeaturesPage / GuideFeatureManualPage / GuideUsagePage / GuideIntro*)
- `packages/shared-space-ui/src/guide/styles.ts` (heroStyles / sectionStyles / indexStyles)
- `packages/ui/src/layout/Section.tsx` (PageHero / PageSection — 글로벌 Vertical Rhythm)
- 비교: KPA / GlycoPharm / K-Cosmetics 가이드(동일 공통 컴포넌트 소비)

---

## 3. `/guide` 현재 구조

`GuideHomePage` 은 공통 `GuideFeaturesPage` 에 `homeProps`(hero + **index** + groups)를 넘긴다.
렌더 순서:

```
<div style={heroStyles.heroLg}>            ← 다크 Hero (인라인 스타일 div)
  hero(eyebrow/title/desc/flowBar)
</div>
<PageSection><PageContainer>
  <div style={indexStyles.wrap}>            ← "O4O 기반 사업 운영 예" 카드 섹션 (index)
</PageSection>
<PageSection>… group 섹션들 …</PageSection>  ← O4O 이해/운영자/기능/…
```

- index 블록(WO-…-BUSINESS-OPERATION-EXAMPLES-V1)이 Hero 바로 아래 첫 콘텐츠.

---

## 4. `O4O 기반 사업 운영 예` 문구 위치

- **단일 위치**: `services/web-neture/src/pages/guide/GuideHomePage.tsx:51` — `index.title: 'O4O 기반 사업 운영 예'`.
- 다른 파일·copy(neture.ts)·다른 서비스에 동일 문자열 **없음** (grep 0건).
- → 변경 영향 범위: **이 1줄**. ripple 없음.

## 5. 섹션명 수정 제안

- `GuideHomePage.tsx:51` `index.title` 을 `'O4O 기반 사업 운영 예'` → **`'O4O 사업 적용 예시'`** 로 교체.
- 단일 라인 copy 수정. 라우트·컴포넌트·다른 서비스 무영향.

## 6. 카드 문안 밀도 문제

현재 `index`(GuideHomePage.tsx:50~67):

- `lead`: 1줄 (섹션 설명).
- `cards`: 5개 — 운영 예 4개 + 문의 1개. 각 카드 `summary` 가 **2문장(약 60~80자)** 으로 다소 길다.
- 카드별 전용 상세 페이지가 이미 존재(WO-…-ROUTE-SCAFFOLD-V1: `/guide/business/{pharmacy-coop,tourist-store,foreign-customer-store,warehouse-pharmacy}`).

**축소 방향(후속 WO):**
- Home 카드 `summary` 는 **1문장(핵심 1줄)** 으로 축약.
- 상세 설명은 각 사업자 상세 페이지(placeholder → 실문안)로 이관.
- 문의 카드(`/contact`) 유지.
- `indexStyles.cardSummary` 자체는 길이 제한이 없으므로 copy 길이로만 조정 가능(스타일 무변경).

---

## 7. Hero-본문 간격 현황 (근본 원인)

### 7-1. 두 개의 분리된 spacing 시스템

| 시스템 | 정의 | 방식 |
|--------|------|------|
| **글로벌 Vertical Rhythm** (`@o4o/ui` `Section.tsx`) | `PageHero` = `mb-16`(64px) / `PageSection` = `mb-8 md:mb-12`(32→48px, mobile-first) | Tailwind **bottom-margin** |
| **가이드 인라인 스타일** (`shared-space-ui` `styles.ts`) | `heroLg` = `padding:64px 0 64px` / `hero` = `56px 0 56px` / `sectionStyles.wrapLg` = `paddingTop:32` | 인라인 **padding**, margin 없음 |

### 7-2. 가이드 페이지는 글로벌 rhythm 을 우회한다

- **모든 가이드 컴포넌트가 `PageHero` 를 쓰지 않고 `<div style={heroStyles.hero/heroLg}>` 평범한 div 사용** (확인됨):
  `GuideFeaturesPage.tsx:16`, `GuideFeatureManualPage.tsx:19`, `GuideUsagePage.tsx:16`, `GuideIntroPage.tsx:16`, `GuideIntro{Concept,Kpa,Operation,Structure}Page` (`heroStyles.hero`).
- 이 hero div 는 내부 padding(56/64px)만 있고 **하단 margin(mb-16)이 없다.**
- 뒤따르는 `PageSection` 은 **하단 margin(mb-*)만 적용, top 간격 없음.**
- → **Hero 다크 영역 끝 ~ 첫 콘텐츠 사이 외부 여백이 사실상 0.**

### 7-3. index 블록이 특히 더 붙는 이유

| 첫 콘텐츠 | top 간격 |
|-----------|----------|
| 일반 group/manual 섹션 | `sectionStyles.wrapLg` `paddingTop:32` → **32px** |
| **index 블록** (`indexStyles.wrap`) | top padding **없음**(카드 박스 내부 padding 22px만) → **~0px** |

→ "O4O 기반 사업 운영 예"(index)가 Hero 에 가장 밀착돼 보이는 직접 원인.

### 7-4. 모바일

- `heroLg`(64px)·`sectionStyles`(32px)는 **고정 px, 비반응형**(md: 브레이크포인트 없음).
- 글로벌 표준(`mb-8 md:mb-12`)은 mobile-first 인데 가이드는 그 이점을 못 받음 → 모바일에서 간격이 데스크톱과 동일하게 크거나(hero) 동일하게 작음(index top 0).

---

## 8. 페이지별 간격 비교

| 페이지 | Hero | 첫 섹션 top 여백 | rhythm 표준 적용 |
|--------|------|------------------|:---:|
| `/guide` (Home, index 먼저) | `heroLg` div | **~0px** (index) | ❌ |
| `/guide/features`, `/guide/business/*`, `/guide/for-*`, `/guide/features/*` | `heroLg`/`hero` div | 32px (wrapLg) | ❌ |
| `/guide/intro/*` | `hero` div(56px) | 20~32px | ❌ |
| KPA/GP/KCos `/guide/*` | **동일 공통 컴포넌트** | 동일 | ❌ |
| `@o4o/ui` `PageHero` 쓰는 소비자 페이지(Home/Hub 계열) | `PageHero` mb-16 | mb 기반 정상 | ✅ |

> 즉 **문제는 `/guide` 단일 페이지가 아니라 가이드 공통 컴포넌트 전체** — Neture·KPA·GP·KCos 가이드가 모두 동일하게 글로벌 rhythm 을 우회한다. index 를 쓰는 `/guide`(Home)만 추가로 더 붙는다.

---

## 9. 공통 컴포넌트/레이아웃 현황

- 표준은 **존재**: `@o4o/ui` `Section.tsx` 의 `PageHero`(mb-16) + `PageSection`(mb-8 md:mb-12, `compact|default|relaxed` variant). `WO-O4O-GLOBAL-VERTICAL-RHYTHM-SYSTEM-V1`.
- 그러나 **가이드 컴포넌트는 이 표준을 채택하지 않음** — 자체 인라인 `heroStyles`(styles.ts) 사용.
- 따라서 spacing 토큰은 `packages/shared-space-ui/src/guide/styles.ts` 와 가이드 `*.tsx` 안에 흩어져 있고, `PageHero` 의 mb-16 규칙과 단절돼 있다.

---

## 10. 디자인 표준 제안

목표: **Hero 끝 → 첫 본문 콘텐츠 사이에 일관된 breathing 여백**(mobile-first), 모든 가이드 페이지 공통.

### 10-1. 권장 값 (mobile-first)

| 구간 | 모바일 | 태블릿/데스크톱 |
|------|:---:|:---:|
| Hero → 첫 본문 섹션 | **28~32px** | **44~48px** |
| 섹션 간 | 24~32px | 40~48px (현 wrapLg 12px 하단은 과소 → 조정 검토) |

- 글로벌 rhythm(`mb-8 md:mb-12` = 32→48px)과 정렬하는 것을 1순위 권장.

### 10-2. 적용 방식 (택1, 공통 레이어)

- **A안(권장·최소·일관):** 가이드 hero div 뒤(또는 첫 `PageSection`)에 **공통 top 간격**을 부여.
  - 구현: 각 가이드 컴포넌트의 첫 `PageSection` 에 `spacing`/`className`(pt) 부여, **또는** hero div 에 `marginBottom`(반응형 불가한 인라인 한계 → wrapper class 권장).
  - **index 블록**: `indexStyles.wrap` 앞에 `sectionStyles.wrapLg` 수준의 top 간격을 주거나 index 를 동일 spacing 래퍼로 감싼다(현재 0 → 표준값).
- **B안(정공법·범위 큼):** 가이드 hero 를 `@o4o/ui` `PageHero`(mb-16)로 마이그레이션하고 인라인 `heroStyles` 제거. 4개 서비스 가이드 회귀 검증 필요.

> 1차 권장: **A안** — `shared-space-ui` 가이드 컴포넌트/styles 에서 첫 섹션 top 간격을 mobile-first 로 표준화(특히 index 0px 보정). B안은 추후 글로벌 정합 작업으로 분리.

### 10-3. 공통 vs 페이지별

- **공통 레이어에서 해결**해야 한다(개별 페이지 margin 금지). 가이드 컴포넌트는 4개 서비스 공유이므로 styles.ts/컴포넌트 1곳 수정이 전체에 반영된다.

---

## 11. 수정이 필요한 파일 후보

### 섹션명·카드 문안 (후속 WO 1)
- `services/web-neture/src/pages/guide/GuideHomePage.tsx` (`index.title` 1줄 + card `summary` 축약)

### Hero-본문 간격 표준 (후속 WO 2, 공통 레이어)
- `packages/shared-space-ui/src/guide/styles.ts` (`heroStyles` / `sectionStyles.wrapLg` / `indexStyles.wrap` top 간격)
- `packages/shared-space-ui/src/guide/GuideFeaturesPage.tsx` (index 블록을 표준 spacing 래퍼로)
- (선택) `GuideFeatureManualPage.tsx` / `GuideUsagePage.tsx` 첫 섹션 spacing 정렬
- 회귀 검증: web-neture · web-kpa-society · web-glycopharm · web-k-cosmetics (Shared Module Protocol)

---

## 12. 후속 WO 제안

### WO-1 (copy, 저위험) — `WO-O4O-NETURE-GUIDE-BUSINESS-EXAMPLE-COPY-REFINE-V1`
- 섹션명 `O4O 기반 사업 운영 예` → `O4O 사업 적용 예시`.
- Home 카드 `summary` 1문장으로 축약, 상세는 각 사업자 상세 페이지로 이관.
- `/contact` CTA 유지. `/o4o`(/apply) 미사용. neture-only.

### WO-2 (공통 컴포넌트, Shared Module Protocol) — `WO-O4O-GUIDE-HERO-SECTION-SPACING-STANDARD-V1`
- `shared-space-ui` 가이드 레이어에서 Hero→첫 섹션 간격 표준화(mobile-first, index 0px 보정 포함).
- 4개 서비스 가이드 동시 회귀 검증.
- (선택 분리) PageHero 마이그레이션은 별도 후속.

> 순서: **WO-1(즉시·저위험) → WO-2(공통 spacing)**. WO-2 는 4개 서비스 영향이므로 단독 진행 권장.

---

## 13. 최종 판정

1. **섹션명**: `GuideHomePage.tsx:51` 단일 위치 → `O4O 사업 적용 예시` 로 교체(영향 없음).
2. **카드 문안**: 현재 2문장 → 1문장 축약 + 상세는 이미 생성된 사업자 상세 페이지로 이관.
3. **Hero-본문 간격**: **개별 페이지 문제가 아니라 가이드 공통 컴포넌트가 글로벌 Vertical Rhythm(PageHero mb-16)을 우회**하는 구조적 문제. 특히 index 블록은 top 간격 0 으로 가장 밀착.
4. **해결 위치**: `packages/shared-space-ui/src/guide/{styles.ts, GuideFeaturesPage.tsx, …}` 공통 레이어 — 1곳 수정으로 Neture·KPA·GP·KCos 가이드 전체 정렬.
5. **표준값**: mobile-first 28~32px(모바일)/44~48px(데스크톱), 글로벌 rhythm(`mb-8 md:mb-12`)과 정렬.
6. **순서**: copy 정리(WO-1) → 공통 spacing 표준(WO-2, Shared Module Protocol).

---

*조사: Claude Code · 2026-06-10 · 읽기 전용(코드 근거: styles.ts / Section.tsx / 가이드 컴포넌트) · 코드 무변경*
