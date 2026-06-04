# CHECK-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1

> Phase 1 적용 결과 고정. `WO-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1` 검증 기록.

- **작성일**: 2026-06-04
- **WO**: WO-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1 (O4O 아이콘 정비 Phase 1)
- **기준 문서**: [`docs/baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md`](../baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md) (commit `9b02c39e7`)
- **선행 IR**: [`IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1`](IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1.md) (commit `cd0ef7285`)

---

## 1. 최종 판정

**PASS (정적 검증).** KPA-Society 약국 운영 허브의 emoji 아이콘을 모두 제거하고 `lucide-react` line icon으로 통일했다. TypeScript 검증 통과, 두 대상 파일 emoji 0건. 라이브 브라우저 smoke는 배포 후 수행 예정(아래 §7).

---

## 2. 기준 문서

`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1` §5 기능별 표준 매핑 우선안을 그대로 적용:

| 기능 | 적용 아이콘 (lucide) |
|------|----------------------|
| 홈 | `Home` |
| 상품 카탈로그 | `PackageSearch` |
| 디지털 사이니지 | `MonitorPlay` |
| 이벤트/특가 | `BadgePercent` |
| 콘텐츠/자료 | `Files` |
| 블로그 | `Newspaper` |
| POP | `Megaphone` |
| QR-code | `QrCode` |
| 내 매장(약국)으로 이동 | `Store` |

---

## 3. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/StoreHubPage.tsx` | resourceCards 4종 + storeCtaBlock icon → lucide element (size·KPA blue) |
| `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx` | 사이드바 8개 메뉴 emoji escape → lucide component, active 색상 분기 |
| `packages/shared-space-ui/src/StoreHubTemplate.tsx` | `StoreHubResourceCard.icon` / `storeCtaBlock.icon` 타입 `string → React.ReactNode` 최소 확장 (렌더 로직·emoji fallback 불변) |

> 공통 템플릿 타입 확장은 **string→ReactNode 위드닝**으로, emoji 문자열을 쓰는 GlycoPharm/K-Cosmetics에 구조적으로 무해(문자열도 ReactNode). 렌더는 `{card.icon}` 그대로, `?? '🏪'` fallback 유지(Phase 7에서 제거 예정).

---

## 4. 교체한 icon 목록

**StoreHubPage.tsx (본문 카드)** — size 22 / CTA 28, color `#2563EB`(KPA primary):
- 🛒 → `PackageSearch` (상품 카탈로그)
- 🖥️ → `MonitorPlay` (디지털 사이니지)
- 📄 → `Files` (콘텐츠/자료)
- 🛍️ → `BadgePercent` (이벤트/특가)
- 🏪 → `Store` (내 매장으로 이동 CTA)

**PharmacyHubLayout.tsx (사이드바)** — size 18, active=primary / inactive=neutral600:
- 🏠 → `Home` (홈)
- 🛒 → `PackageSearch` (상품 카탈로그)
- 🖥️ → `MonitorPlay` (디지털 사이니지)
- 🛍️ → `BadgePercent` (이벤트/특가)
- 📄 → `Files` (콘텐츠/자료)
- 📝 → `Newspaper` (블로그)
- 📢 → `Megaphone` (POP)
- 📱 → `QrCode` (QR-code)

---

## 5. 변경하지 않은 항목

- 메뉴 순서 / 카드 순서 / 라우트 / 링크 (`href`, `path`) — 불변
- 권한 분기 / API 호출 / 데이터 구조 — 불변
- 문구(label/description/desc) — 불변
- `StoreHubTemplate` 렌더 로직, AI placeholder(`🤖`), emoji fallback `?? '🏪'` — 불변 (후속 Phase 대상)
- `packages/shared-space-ui/src/HeroBannerSection.tsx` — **미접촉**
- 약국 운영 허브 외 다른 pages/pharmacy 화면(키오스크/태블릿 템플릿, B2B, 매장정보, PharmacyStorePage 등) — **Phase 1 범위 밖, 미접촉** (emoji 잔존은 의도된 범위 제한)

---

## 6. TypeScript 결과

```bash
cd services/web-kpa-society && npx tsc --noEmit
# exit 0 (PASS)
```

공통 `StoreHubTemplate` 타입 확장이 KPA 소스 타입 해석(`@o4o/shared-space-ui` → `./src/index.ts`)에 정상 전파됨을 확인.

---

## 7. desktop/mobile smoke 결과

- **정적 검증 PASS**: 두 대상 파일 emoji literal 0건 + unicode-escape icon 0건 (rg 확인, exit 1 = no match).
- **라이브 브라우저 smoke: 미수행 (배포 후로 이연).**
  - 사유: `/store-hub` 는 `store_owner` 인증 게이트 라우트이며, 본 변경은 아직 미배포 상태. 로컬 dev 렌더는 테스트 계정 로그인 게이트(기존 smoke blocker — `IR-O4O-PLAYWRIGHT-MCP-AND-TEST-ACCOUNT-SMOKE-BLOCKER-AUDIT-V1`)에 막힘.
  - **배포 후 확인 권장 항목**: ① 사이드바 8메뉴 lucide 렌더 ② 본문 카드 4종 + CTA lucide 렌더 ③ active 메뉴 primary 강조 유지 ④ hover/click·라우팅 회귀 없음 ⑤ mobile drawer에서 아이콘·텍스트 미겹침.

---

## 8. staged 파일 검증 결과

커밋 전 `git diff --cached --name-only` 로 의도한 파일만 staged 확인:
```text
services/web-kpa-society/src/pages/pharmacy/StoreHubPage.tsx
services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx
packages/shared-space-ui/src/StoreHubTemplate.tsx
docs/investigations/CHECK-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1.md
```
`HeroBannerSection.tsx` staged 아님 확인.

---

## 9. 남은 후속 작업

| Phase | 대상 |
|:-----:|------|
| 2 | GlycoPharm 내 약국 / Store Hub / Channels |
| 3 | K-Cosmetics 내 매장 / Store Hub / Channels |
| 4 | Neture Home / 역할 카드 / Market Trial CTA |
| 5 | Operator/Admin Quick Actions |
| 6 | LMS lesson type icon mapping |
| 7 | shared-space-ui emoji fallback(`?? '🏪'`, AI `🤖`) 제거 |

**추가 발견(범위 밖, 기록만):** `pages/pharmacy/` 의 키오스크/태블릿 템플릿·B2B·매장정보 화면에도 emoji 다수 잔존. 약국 운영 허브와 별개 표면이므로 별도 후속 WO에서 처리.

---

---

## 10. 후속 보정 — AI 맞춤 추천 아이콘 (2026-06-04)

KPA `/store-hub` desktop smoke 결과 사이드바·카드 아이콘은 정상 확인. 단 **AI 맞춤 추천 박스의 로봇 emoji(🤖)** 만 lucide 흐름과 따로 떠 보여 후속 보정.

- **원인**: 🤖는 KPA `StoreHubPage`가 아니라 공통 `StoreHubTemplate`의 `DefaultAiPlaceholder`에 하드코딩(`aiBlock`은 icon 미전달 → 기본값 렌더).
- **방식**: 공통 템플릿 `aiBlock`에 **선택적 `icon?: React.ReactNode` 가산**, `DefaultAiPlaceholder`는 `aiBlock?.icon ?? <span>🤖</span>` 로 렌더. KPA만 `<Sparkles size={28} color="#2563EB" />` 전달.
- **결정 근거(기준 문서 §5)**: AI 추천=`Sparkles`, 자동화/봇 실행=`Bot`. 본 영역은 "데이터 분석 기반 추천(준비 중)"이라 `Bot`(캐릭터·챗봇 오해)보다 `Sparkles`가 적합.
- **타 서비스 영향 0**: GlycoPharm/K-Cosmetics는 `icon` 미전달 → 기존 🤖 유지(Phase 7 제거 대상). 가산적 optional 필드라 회귀 불가.
- **불변**: 준비 중 배지·문구·박스 스타일·아이콘 배경 blue tint·기능 동작.
- **수정 파일**: `packages/shared-space-ui/src/StoreHubTemplate.tsx`(aiBlock.icon 추가 + 렌더 분기), `services/web-kpa-society/src/pages/pharmacy/StoreHubPage.tsx`(Sparkles 전달).
- **검증**: `tsc --noEmit` exit 0 (PASS).

---

*Phase 1 적용 — 코드 변경은 KPA 약국 운영 허브 2파일 + 공통 템플릿(icon 타입 위드닝 + aiBlock.icon 가산)으로 제한.*
