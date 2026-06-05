# CHECK-O4O-HOME-VALUE-GUIDE-PLACEMENT-STANDARD-V1

> `WO-O4O-HOME-VALUE-GUIDE-PLACEMENT-STANDARD-V1` 권장 A안 코드 적용 결과 고정.

- **작성일**: 2026-06-04
- **WO**: [`WO-O4O-HOME-VALUE-GUIDE-PLACEMENT-STANDARD-V1`](../work-orders/WO-O4O-HOME-VALUE-GUIDE-PLACEMENT-STANDARD-V1.md) (`b11c06d74`)
- **선행 IR**: [`IR-O4O-HOME-STANDARD-TEMPLATE-CROSSSERVICE-AUDIT-V1`](IR-O4O-HOME-STANDARD-TEMPLATE-CROSSSERVICE-AUDIT-V1.md) §5

---

## 1. 최종 판정

**PASS (정적 검증).** KPA Home 의 `valueGuidePlacement` 를 `after-help` → **`before-app-entry`** 로 정렬(권장 A). 역할/시작 카드가 이용 가이드보다 **먼저** 표시 → 4서비스 Home 표준 통일(Neture 와 동일). `web-kpa-society tsc --noEmit` exit 0. placement 1줄 + 주석만 변경. 라이브 smoke 는 배포 후(§6).

---

## 2. 근본 원인 / 수정 요약

- IR §5: KPA(`after-help`) ↔ Neture(`before-app-entry`)가 정반대. 정책 표준(`before-app-entry` = 역할 카드가 가이드보다 먼저)으로 통일.
- 수정: `CommunityHomePage.tsx` `valueGuidePlacement="after-help"` → `"before-app-entry"`. 최근 `1f68218a5`(WO-O4O-KPA-HOME-VALUE-CARDS-AFTER-GUIDE-V1)의 KPA placement 결정을 **표준 승인에 따라 되돌림**. 주석도 표준 WO 근거로 갱신.

---

## 3. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/CommunityHomePage.tsx` | `valueGuidePlacement` `after-help` → `before-app-entry` (+ 주석 갱신) |

> **1줄 placement 변경**. valueGuideSlot 내용/역할 카드/문구/링크/help/다른 섹션 불변.

---

## 4. 변경하지 않은 항목

- valueGuideSlot 내용(3 역할 카드: store-owner/operator/member), 문구, 링크(`/guide/for/*`) — 불변
- help / AppEntry / CTA / notices / Hero 등 다른 섹션 — 불변
- **`StandardHomeTemplate.tsx`** — 미접촉 (기본값이 이미 before-app-entry)
- **`HeroBannerSection.tsx`** — 미접촉
- Neture / GlycoPharm / K-Cosmetics — 미접촉 (Neture 이미 표준, Glyco/KCos 역할 카드 없음)
- Market Trial CTA 아이콘 작업(`dcc4b55a9`) — 섞지 않음
- 다른 세션 WIP — 미접촉

---

## 5. TypeScript 결과

```bash
services/web-kpa-society   npx tsc --noEmit   # exit 0
```

---

## 6. desktop/mobile smoke 결과 — **PASS (배포 후 라이브 검증, 2026-06-05)**

Playwright 무인증 공개 Home 검증:
- **KPA `/`**: 섹션 순서 = Hero → 공지/최신글 → **내 역할로 시작하기**(역할 3카드) → 서비스 바로가기 → Market Trial CTA → **KPA-Society 이용 가이드**. → **역할 카드가 이용 가이드보다 위**로 이동 확인 ✅ (이전 after-help = 가이드 아래 → 정렬 완료).
- 역할 카드 내용/링크(`/guide/for/*`)/순서 회귀 없음, 다른 섹션 회귀 없음.
- **Neture `/`(회귀 확인)**: 내 역할로 시작하기(공급자/MT/파트너)가 "Neture 이용 안내" 위에 유지 → before-app-entry 회귀 없음 ✅ (공통 템플릿 동작 정상).
- console: cross-service 401(benign) 외 critical error 없음.

---

## 7. staged 파일 검증

`git diff --cached --name-only` (2파일):
```text
services/web-kpa-society/src/pages/CommunityHomePage.tsx
docs/investigations/CHECK-O4O-HOME-VALUE-GUIDE-PLACEMENT-STANDARD-V1.md
```
`StandardHomeTemplate.tsx` / `HeroBannerSection.tsx` / 다른 세션 WIP staged 아님 확인.

---

## 8. 남은 후속

```text
- 배포 후 KPA/Neture Home smoke (본 변경 + 이전 CTA 아이콘 dcc4b55a9 함께 확인 가능)
- Home value-guide 표준은 본 WO 로 고정 — 신규 Home 에 역할 카드 추가 시 before-app-entry 기본
```

---

*KPA Home value-guide placement 표준 정렬(1줄). 템플릿/HeroBanner/문구/링크 미접촉. 배포 후 smoke 예정.*
