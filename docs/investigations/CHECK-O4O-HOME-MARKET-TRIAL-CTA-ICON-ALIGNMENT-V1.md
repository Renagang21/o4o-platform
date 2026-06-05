# CHECK-O4O-HOME-MARKET-TRIAL-CTA-ICON-ALIGNMENT-V1

> Home Market Trial CTA 아이콘 정렬 적용 결과 고정. (IR §12 1순위 — 저위험 소규모)

- **작성일**: 2026-06-04
- **선행 IR**: [`IR-O4O-HOME-STANDARD-TEMPLATE-CROSSSERVICE-AUDIT-V1`](IR-O4O-HOME-STANDARD-TEMPLATE-CROSSSERVICE-AUDIT-V1.md) (`a04d73ba4`)
- **기준**: [`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1`](../baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md) — Market Trial = `FlaskConical` (Neture Phase 4 기준)

---

## 1. 최종 판정

**PASS (정적 검증).** KPA / K-Cosmetics Home 의 Market Trial CTA 아이콘 `🧪`(emoji) → lucide **`FlaskConical`** 로 정렬. Neture(이미 FlaskConical)와 cross-service 일치. KPA / KCos `tsc --noEmit` exit 0, 대상 2파일 emoji 제거. 라이브 smoke 는 배포 후(§6, 공개 페이지).

---

## 2. 근본 원인 / 수정 요약

- IR §7: Neture Phase 4 가 Home Market Trial CTA 를 Neture 만 `FlaskConical` 로 바꿨고, KPA(Phase 1)·KCos(Phase 3)는 Store Hub·Channels 범위였어서 Home CTA `🧪` 가 잔존.
- 수정: 두 Home 컴포넌트의 CTA `icon: <span>🧪</span>` → `<FlaskConical size={28} className="text-primary" />` (Neture 패턴 동일). `text-primary` 는 서비스별 `--color-primary` 토큰(KPA blue / KCos pink)으로 자연 정합.

---

## 3. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/CommunityHomePage.tsx` | lucide `FlaskConical` import + CTA icon 🧪 → FlaskConical |
| `services/web-k-cosmetics/src/pages/HomePage.tsx` | 동일 |

---

## 4. 변경하지 않은 항목

- Neture(`CommunityPage.tsx`) — 이미 FlaskConical, 미변경
- GlycoPharm — Market Trial CTA 대상 아님(사이니지 CTA), 미접촉
- Home 구조 / 문구 / CTA 링크(`https://neture.co.kr`) / accentColor / 섹션 순서 — 불변
- **`valueGuidePlacement` 정합성(IR §5)** — 미착수 (정책 결정 후 별도 WO)
- `StandardHomeTemplate.tsx` / `HeroBannerSection.tsx` — **미접촉**
- 다른 세션 WIP(store-asset 등) — 미접촉

---

## 5. TypeScript 결과

```bash
services/web-kpa-society   npx tsc --noEmit   # exit 0
services/web-k-cosmetics   npx tsc --noEmit   # exit 0
```

---

## 6. desktop/mobile smoke 결과 — **PASS (배포 후 라이브 검증, 2026-06-05)**

Playwright 무인증 공개 Home 검증:

| 대상 | 결과 |
|------|------|
| KPA `/` | ✅ Market Trial CTA `🧪` 제거 → **FlaskConical**(blue, KPA primary) 렌더 |
| K-Cosmetics `/` | ✅ Market Trial CTA `🧪` 제거 → **FlaskConical**(pink, KCos primary) 렌더 |
| Neture `/` (회귀 확인) | ✅ 기존 FlaskConical 유지 |

- 링크(`https://neture.co.kr`)/문구/섹션 회귀 없음. console: `api.neture.co.kr/auth/me` 401(cross-service 인증 폴링, benign) 외 critical error 없음.
- 스크린샷: `home-kpa-market-trial-cta.png` / `home-kcos-market-trial-cta.png` (작업 트리 untracked).

---

## 7. staged 파일 검증

`git diff --cached --name-only` (3파일):
```text
services/web-kpa-society/src/pages/CommunityHomePage.tsx
services/web-k-cosmetics/src/pages/HomePage.tsx
docs/investigations/CHECK-O4O-HOME-MARKET-TRIAL-CTA-ICON-ALIGNMENT-V1.md
```
`StandardHomeTemplate.tsx` / `HeroBannerSection.tsx` / 다른 세션 WIP staged 아님 확인.

---

## 8. 남은 후속

```text
- valueGuidePlacement cross-service 표준 결정 (KPA after-help vs Neture before-app-entry) — 정책 결정 후 소규모 WO (IR §5/§12-2)
- shared-space-ui 비-Home emoji fallback 제거 — Phase 7 (별도 트랙)
```

---

*Home Market Trial CTA 아이콘만 정렬(2파일). 구조/문구/링크/템플릿/HeroBanner 미접촉. 배포 후 smoke 예정.*
