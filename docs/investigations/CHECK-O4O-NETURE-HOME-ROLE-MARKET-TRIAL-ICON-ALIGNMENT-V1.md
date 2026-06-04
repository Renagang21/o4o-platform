# CHECK-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1

> `WO-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1` (Phase 4 — Neture) 적용 결과 고정.

- **작성일**: 2026-06-04
- **WO**: [`WO-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1`](../work-orders/WO-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1.md)
- **기준 문서**: [`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1`](../baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md) (`9b02c39e7`)

---

## 1. 최종 판정

**PASS (정적 검증).** Neture Home(Market Trial CTA) / Supplier 랜딩 / Partner 랜딩 / Register 역할 선택의 emoji를 lucide line icon으로 정비. `web-neture tsc --noEmit` exit 0, 대상 4파일 emoji 0건. 공통 패키지·`NETURE_DOMAIN_LABELS`·`HeroBannerSection`·타 서비스 미접촉. 라이브 smoke는 배포 후(§8).

---

## 2. 기준 문서

`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1` §5/§6. Market Trial = `FlaskConical` (WO 결정).

---

## 3. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/CommunityPage.tsx` | Market Trial CTA `🧪` → `<FlaskConical size=28 text-primary>` |
| `services/web-neture/src/pages/SupplierLandingPage.tsx` | 카테고리 emoji `💊🩺🧴🏠` → 중립 `Package`(blue) |
| `services/web-neture/src/pages/PartnerLandingPage.tsx` | 활동 예시 `emoji` 렌더 제거 → 기존 lucide(`Star/Share2/QrCode/ImageIcon`) 실제 렌더 |
| `services/web-neture/src/components/RegisterModal.tsx` | 역할 선택 emoji → `Store`(매장 경영자) / `Factory`(공급자) / `Handshake`(파트너) |

---

## 4. 교체한 icon 목록

- **CommunityPage**: 🧪 → `FlaskConical` (size 28, `text-primary`)
- **SupplierLandingPage** (4 카테고리, size 28 `text-blue-600`): 💊🩺🧴🏠 → `Package` (중립 — 의미 과적합 회피, 라벨 중심. WO §5.2)
- **PartnerLandingPage** (활동 예시, size 28 `text-emerald-600`): ⭐→`Star` / 📢→`Share2` / 📱→`QrCode` / 🖼️→`ImageIcon` (이미 정의돼 있던 lucide를 실제 렌더로 전환, emoji 필드 제거)
- **RegisterModal** (역할 선택, size 28, 선택=`text-green-600`/기본=`text-gray-500`): 🏪→`Store` / 🏭→`Factory` / 🤝→`Handshake`

---

## 5. 변경하지 않은 항목

- **`operatorMenuGroups.ts` `NETURE_DOMAIN_LABELS` emoji(`📦💳💬⚙️`)** — **미변경** (공통 `DomainIASidebar`가 직접 렌더 → lucide化는 공통 구조 변경 필요. §8 후속 WO로 분리. 사용자 승인)
- 공통 패키지(`DomainIASidebar`/`OperatorAreaShell`/`operator-ux-core`/`shared-space-ui`) — 미수정
- `HeroBannerSection.tsx` — 미접촉
- KPA / GlycoPharm / K-Cosmetics — 미접촉
- Home AppEntry/역할 카드(이미 lucide/SVG), `HomeAppIcons` custom SVG — 미변경
- 카드 순서 / 링크 / 라우트 / 권한 / API / 문구 — 불변

---

## 6. Neture 도메인 가드 준수

- `내 매장` / `Store Blog` / 매장 실행 기능 / POP·QR·매장 사이니지 제작 흐름 / 약국 표현 — **추가 없음** ✅
- 아이콘 의미만 정비, Neture canonical 역할(공급자/파트너/Market Trial/운영) 문맥 유지 ✅
- RegisterModal `store_owner`(매장 경영자)는 **기존 회원가입 역할**이며 신규 매장 허브 개념 추가 아님 — 아이콘만 `Store`로 교체 ✅

---

## 7. TypeScript 결과

```bash
cd services/web-neture && npx tsc --noEmit   # exit 0 (PASS)
```

---

## 8. desktop/mobile smoke 결과 — **PASS (배포 후 라이브 검증 완료, 2026-06-04)**

Playwright 라이브 검증(공개 페이지, 무인증). 전 항목 PASS.

| 영역 | 결과 |
|------|------|
| Home Market Trial CTA (`/`) | ✅ `🧪` 제거 → lucide `FlaskConical` 렌더 (a11y `img`, emoji span 제거 확인) |
| Supplier 카테고리 (`/supplier`) | ✅ `💊🩺🧴🏠` 제거 → `Package`(blue) 4종 렌더. 흐름/혜택 기존 lucide 정상 |
| Partner 활동 예시 (`/partner`) | ✅ `⭐📢📱🖼️` 제거 → `Star`/`Share2`/`QrCode`/`ImageIcon`(emerald) 렌더 |
| Register 역할 선택 (`/register` 2단계) | ✅ `🏪🏭🤝` 제거 → `Store`/`Factory`/`Handshake` 렌더 (desktop + **mobile 390px 겹침 없음**) |

- 정적 검증: 대상 4파일 emoji literal 0건 (rg exit 1, 주석 포함).
- **Neture 도메인 가드**: 내 매장/Store Blog/매장 실행 문맥 **신규 추가 없음** 확인. 공급자/파트너/Market Trial framing 유지.
- console: `/api/v1/auth/me` 401(인증 상태 폴링, benign — Phase 4 무관) 외 critical error 없음. 라우트/CTA 네비게이션 정상.
- 스크린샷: `neture-supplier-landing.png` / `neture-partner-landing.png` / `neture-register-role-icons.png` / `neture-register-role-mobile.png` (작업 트리 untracked).

> 참고(범위 밖): Neture `/admin` 대시보드 Quick Actions 가 lucide 아이콘명을 **텍스트**(`users`/`shield`/`store`/`dollar-sign`/`percent`/`key`)로 노출 — 별도 결함, **Operator/Admin Quick Actions 후속**(§10)에 해당. 본 Phase 4 범위 아님.

---

## 9. staged 파일 검증

`git diff --cached --name-only` (5파일):
```text
services/web-neture/src/pages/CommunityPage.tsx
services/web-neture/src/pages/SupplierLandingPage.tsx
services/web-neture/src/pages/PartnerLandingPage.tsx
services/web-neture/src/components/RegisterModal.tsx
docs/investigations/CHECK-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1.md
```
`HeroBannerSection.tsx` / 공통 패키지 / `operatorMenuGroups.ts` / 타 서비스 staged 아님 확인.

---

## 10. 남은 후속 작업

```text
- (분리 후속 WO) 공통 DomainIASidebar 도메인 헤딩 emoji → lucide (4서비스 NETURE/KPA/Glyco/KCos 도메인 라벨 일괄)
- Operator/Admin Quick Actions emoji 정비
- LMS lesson type icon mapping 공통화
- shared-space-ui emoji fallback 제거 (Phase 7)
- StoreHubTemplate service accent/theming 분리 (KCos pink/blue 혼재 해소)
```

---

*Phase 4 — Neture 4파일. 공통 패키지·도메인 라벨 emoji·HeroBannerSection·타 서비스 미접촉. Market Trial=FlaskConical. 배포 후 smoke 예정.*
