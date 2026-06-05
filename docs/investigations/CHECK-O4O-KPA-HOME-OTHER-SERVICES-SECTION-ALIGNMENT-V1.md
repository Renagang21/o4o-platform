# CHECK-O4O-KPA-HOME-OTHER-SERVICES-SECTION-ALIGNMENT-V1

> KPA Home 하단 섹션 순서 보정 결과 고정: "다른 서비스 보기" → **"다른 서비스 소개"**(제목) + **Home 맨 아래**(배치).

- **작성일**: 2026-06-05
- **대상**: KPA-Society Home (`CommunityHomePage.tsx`) — **KPA 한정** + 공통 `O4OHelpSection` 가산적 prop
- **선행**: `CHECK-O4O-KPA-HOME-ROLE-USAGE-MANUAL-RECLASSIFY-V1`(역할 카드 = 활용 안내, after-help)

---

## 1. 최종 판정

**PASS (정적 검증).** KPA Home 하단 흐름을 `이용 가이드 → 내 역할에 따른 활용 방법 → 다른 서비스 소개(맨 아래)` 로 정렬. "다른 서비스" 블록을 Help 슬롯에서 분리해 역할 카드 아래로 이동, 제목을 "다른 서비스 소개"로 변경. `web-kpa-society` / `web-neture` tsc exit 0. 공통 `O4OHelpSection` 변경은 가산적(default true)이라 타 서비스 무영향. 라이브 smoke 배포 후(§5).

---

## 2. 문제 / 수정

**문제:** `after-help` 배치에서 `O4OHelpSection`(이용 가이드 + 다른 서비스)이 한 블록이라, 렌더 순서가 `이용가이드 → 다른서비스 → 역할활용` 이 되어 이용 가이드 흐름과 활용 안내 사이를 "다른 서비스 보기"가 끊었다.

**수정 (템플릿 미수정, 공통 컴포넌트 가산 + KPA 페이지):**
- **`O4OHelpSection`**: `showUsage?` / `showServices?` (기본 `true`) 가산 → usage/services 블록을 **분리 렌더** 가능. divider 는 둘 다 보일 때만.
- **`types.ts`**: `O4OHelpSectionProps` 에 두 prop 추가.
- **KPA `CommunityHomePage`**:
  - `help` 프롭에 `showServices: false` → Help 슬롯은 **이용 가이드만**.
  - `valueGuideSlot` 을 fragment 로 = `[내 역할에 따른 활용 방법 AppEntrySection]` + `[<O4OHelpSection showUsage={false} servicesTitle="다른 서비스 소개" currentServiceKey="kpa-society" />]` → 역할 카드 **아래**에 다른 서비스 소개.
  - placement `after-help` 유지.

**결과 — KPA Home 하단 순서:**
```text
서비스 바로가기 → Market Trial CTA
→ KPA-Society 이용 가이드        (O4OHelpSection usage-only)
→ 내 역할에 따른 활용 방법        (valueGuide AppEntrySection)
→ 다른 서비스 소개               (O4OHelpSection services-only, 맨 아래)
```

---

## 3. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/shared-space-ui/src/types.ts` | `O4OHelpSectionProps` + `showUsage?`/`showServices?` (가산) |
| `packages/shared-space-ui/src/O4OHelpSection.tsx` | `showUsage`/`showServices` 조건 렌더 (기본 true) |
| `services/web-kpa-society/src/pages/CommunityHomePage.tsx` | help `showServices:false` + valueGuideSlot 에 services-only O4OHelpSection("다른 서비스 소개") |

---

## 4. 변경하지 않은 항목 / 범위 가드

- 다른 서비스 카드 내용/링크/순서/필터(`currentServiceKey` 자기 제외) — **불변** (제목 "보기"→"소개" 만)
- 역할 카드/이용 가이드/서비스 바로가기/Market Trial CTA 카드·링크·문구 — 불변
- **`StandardHomeTemplate.tsx`** — 미접촉 (after-help 기존 옵션 + valueGuideSlot fragment 활용)
- **`HeroBannerSection.tsx`** — 미접촉
- **GlycoPharm / K-Cosmetics / Neture** — 미접촉. `O4OHelpSection` 변경은 **가산적(default true)** → `help` 만 넘기는 3서비스는 usage+services 둘 다 렌더(기존 동작 동일). `web-neture` tsc 회귀 없음 확인.

---

## 5. TypeScript / smoke

```bash
services/web-kpa-society   npx tsc --noEmit   # exit 0
services/web-neture        npx tsc --noEmit   # exit 0 (공통 O4OHelpSection 가산 prop 회귀 없음)
```
- **라이브 smoke: 배포 후** (KPA Home 공개 페이지). 확인:
  - 하단 순서 = 이용 가이드 → 내 역할에 따른 활용 방법 → **다른 서비스 소개(맨 아래)**
  - "다른 서비스 보기" 표현이 "다른 서비스 소개"로 바뀌었는지
  - 다른 서비스 카드 링크/내용 회귀 없음
  - GlycoPharm/K-Cosmetics/Neture Home 의 "다른 서비스 보기" 블록 회귀 없음(기본 both-blocks)

---

## 6. staged 파일 검증

```text
packages/shared-space-ui/src/types.ts
packages/shared-space-ui/src/O4OHelpSection.tsx
services/web-kpa-society/src/pages/CommunityHomePage.tsx
docs/investigations/CHECK-O4O-KPA-HOME-OTHER-SERVICES-SECTION-ALIGNMENT-V1.md
```
`StandardHomeTemplate.tsx` / `HeroBannerSection.tsx` / 타 서비스 / 다른 세션 WIP staged 아님 확인.

---

*KPA Home "다른 서비스 보기" → "다른 서비스 소개" + 맨 아래 배치. O4OHelpSection 가산 prop(default true, 타 서비스 무영향) + KPA 페이지. 템플릿/HeroBanner 미접촉. 배포 후 smoke 예정.*
