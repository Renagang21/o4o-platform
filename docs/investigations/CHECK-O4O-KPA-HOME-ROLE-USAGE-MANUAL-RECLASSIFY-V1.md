# CHECK-O4O-KPA-HOME-ROLE-USAGE-MANUAL-RECLASSIFY-V1

> KPA Home 역할 카드 영역을 **"시작 진입"이 아니라 "역할별 활용 안내(매뉴얼)"** 로 재해석하여 제목·배치를 보정한 결과 고정.

- **작성일**: 2026-06-05
- **대상**: KPA-Society Home (`CommunityHomePage.tsx`) — **KPA 한정**
- **선행**: `WO-O4O-HOME-VALUE-GUIDE-PLACEMENT-STANDARD-V1`(`b11c06d74`) + 적용 `CHECK-...PLACEMENT-STANDARD-V1`(`e43c8ce00`)
- **성격**: 위 placement 표준을 **KPA 에 한해 보정**(재해석)

---

## 1. 최종 판정

**PASS (정적 검증).** KPA Home 의 역할 카드 영역을 매뉴얼(활용 안내) 성격으로 재해석 → 제목 `내 역할로 시작하기` → **`내 역할에 따른 활용 방법`**, 배치 `before-app-entry` → **`after-help`**(이용 가이드 영역으로 하강). `web-kpa-society tsc` exit 0. KPA `CommunityHomePage.tsx` 1파일 + 제목/placement/주석만. 라이브 smoke 배포 후(§5).

---

## 2. 배경 — 재해석

직전 `e43c8ce00`(WO-...PLACEMENT-STANDARD-V1 권장 A)은 이 영역을 **"역할로 시작하는 진입점"** 으로 보고 `before-app-entry`(가이드 위)로 올렸다.

→ **재해석:** 이 영역은 실제 작업 시작 버튼 묶음이 아니라, **사용자 유형(매장 경영자/운영자/커뮤니티 참여자)별로 KPA-Society 를 어떻게 활용하는지 설명하는 매뉴얼** 이다(링크도 `/guide/for/*` = 가이드). 따라서 **상단 진입 영역이 아니라 이용 가이드 영역에 두는 것이 사용자 이해 흐름과 맞다.**

> 결과적으로 이전 `1f68218a5`(after-help)의 위치 판단이 옳았고, 본 건은 **제목까지 함께 보정**(시작하기 → 활용 방법)하여 성격 오해를 제거한다.

---

## 3. 수정 내용

| 항목 | before (`e43c8ce00`) | after (본 건) |
|------|----------------------|---------------|
| 제목 | `내 역할로 시작하기` | **`내 역할에 따른 활용 방법`** |
| `valueGuidePlacement` | `before-app-entry` | **`after-help`** |
| 위치 | 공지/최신글 직후(가이드 위) | 이용 가이드 영역(하단) |

**수정 파일:** `services/web-kpa-society/src/pages/CommunityHomePage.tsx` (제목 1 + placement 1 + 주석).

**불변:** 역할 카드 내용 / 링크(`/guide/for/{store-owner,operator,member}`) / accentColor / 카드 구성, AppEntry·CTA·help·다른 섹션, 문구.

---

## 4. 변경하지 않은 항목 / 범위 가드

- **`StandardHomeTemplate.tsx`** — 미접촉 (`after-help` 는 기존 지원 옵션, 템플릿 변경 불필요)
- **`HeroBannerSection.tsx`** — 미접촉
- **Neture / GlycoPharm / K-Cosmetics** — 미접촉.
  - Neture 역할 카드는 **시작 진입 성격이라 `before-app-entry` 유지**(미변경). → KPA(활용 안내, after-help)와 Neture(진입, before-app-entry)는 **의도적 차이**로 명문화.
- 서비스 바로가기 / Market Trial 링크·문구 — 불변
- placement 표준 WO(`b11c06d74`)의 "기본값 before-app-entry" 는 유효하되, **KPA 의 valueGuide 는 '활용 안내'로 재분류되어 after-help 적용**(본 CHECK 가 KPA 한정 보정 기록).

---

## 5. TypeScript / smoke

```bash
services/web-kpa-society   npx tsc --noEmit   # exit 0
```
- **라이브 smoke: 배포 후** (KPA Home 공개 페이지). 확인:
  - 역할 카드 제목이 **"내 역할에 따른 활용 방법"** 인지
  - 위치가 **"KPA-Society 이용 가이드" 영역(하단)** 으로 내려갔는지(서비스 바로가기/Market Trial 아래)
  - 카드 링크/내용 회귀 없음
  - Neture Home(`/`) 역할 카드는 기존 "내 역할로 시작하기" + 가이드 위(before-app-entry) **회귀 없음**

---

## 6. staged 파일 검증

```text
services/web-kpa-society/src/pages/CommunityHomePage.tsx
docs/investigations/CHECK-O4O-KPA-HOME-ROLE-USAGE-MANUAL-RECLASSIFY-V1.md
```
`StandardHomeTemplate.tsx` / `HeroBannerSection.tsx` / 타 서비스 / 다른 세션 WIP staged 아님 확인.

---

## 7. 후속

- placement 표준 문서(`WO-...PLACEMENT-STANDARD-V1`)에 "역할 카드가 **시작 진입**이면 before-app-entry, **활용 안내**면 after-help" 분기 기준을 반영(문서 보강)하는 것은 별도 소규모 docs 작업 후보.

---

*KPA Home 역할 카드 = 활용 안내로 재분류 → 제목/배치 보정(KPA 1파일). 템플릿/HeroBanner/타 서비스 미접촉. 배포 후 smoke 예정.*
