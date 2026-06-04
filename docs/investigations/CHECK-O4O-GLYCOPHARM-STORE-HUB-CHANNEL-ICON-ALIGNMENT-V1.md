# CHECK-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1

> Phase 2 적용 결과 고정. `WO-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1` 검증 기록.

- **작성일**: 2026-06-04
- **WO**: [`WO-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1`](../work-orders/WO-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1.md) (Phase 2)
- **기준 문서**: [`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1`](../baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md) (`9b02c39e7`)
- **선례**: KPA Phase 1 [`CHECK-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1`](CHECK-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1.md) (`bda26764d` + AI보정 `811067be0`)
- **착수 Gate**: KPA Phase 1 `/store-hub` desktop/mobile smoke PASS 확인 후 착수 (사용자 확인 완료)

---

## 1. 최종 판정

**PASS (정적 검증).** GlycoPharm의 Store Hub + Store Channels 가이드 블록 emoji를 모두 제거하고 lucide line icon으로 통일했다. TypeScript 통과, 대상 2파일 emoji 0건. **공통 패키지 미수정**(Phase 1에서 확장된 `StoreHubTemplate.icon: ReactNode` 그대로 활용). 라이브 smoke는 배포 후 확인 예정(§7).

---

## 2. 기준 문서

`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1` §5 매핑 + KPA Phase 1 선례 동일. SIGNAGE는 WO 결정(가이드=`Tv`)을 따름.

---

## 3. 수정 파일 목록

| 영역 | 파일 | 변경 |
|------|------|------|
| **A. Store Hub** | `services/web-glycopharm/src/pages/hub/StoreHubPage.tsx` | resourceCards 4종 + storeCtaBlock icon emoji → lucide element (size 22/28, blue `#2563EB`) |
| **B. Store Channels** | `services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx` | "채널 선택 가이드" 블록 emoji → lucide (size 20, active/inactive 색상 className), `Tv` import 추가 |

> 공통 패키지(`StoreHubTemplate` 등) **미수정**. Phase 1의 `icon: ReactNode` 확장으로 lucide element 전달만으로 동작.

---

## 4. 교체한 icon 목록

### A. Store Hub
- 🛒 → `PackageSearch` (B2B 상품 카탈로그)
- 🖥️ → `MonitorPlay` (디지털 사이니지)
- 📄 → `Files` (콘텐츠/자료)
- 🛍️ → `BadgePercent` (이벤트/특가)
- 🏥 → `Store` (내 약국 CTA) — KPA와 동일, 서비스 간 "내 매장/약국 이동" CTA 일관

### B. Store Channels 가이드 블록 (size 20, active=text-blue-700 / inactive=text-slate-500)
- 🌐 → `Globe` (B2C 온라인 판매)
- 📱 → `Tablet` (TABLET 매장 태블릿)
- 🖥️ → `Monitor` (KIOSK 키오스크)
- 📺 → `Tv` (SIGNAGE 사이니지) — WO 결정값

> 가이드 블록은 같은 페이지 `CHANNEL_TABS`(Globe/Monitor/Tablet)와 채널 타입별 아이콘 일치. SIGNAGE만 탭(`Smartphone`)과 다른 `Tv`를 사용 — 아래 §9 참조.

---

## 5. 변경하지 않은 항목

- **`CHANNEL_TABS`(메인 탭)** — 이미 lucide(Globe/Monitor/Tablet/Smartphone) 사용, **미변경**
- **공통 패키지** (`StoreHubTemplate`, `HomeAppIcons` 등) — 미수정
- **`packages/shared-space-ui/src/HeroBannerSection.tsx`** — 미접촉
- **GlycoPharm AI 맞춤 추천 아이콘(🤖)** — WO Phase 2 범위 밖, 미변경 (§9 후속 후보)
- 카드/탭 순서, href, route, 문구(label/sub/desc), 권한, API, 데이터 구조 — 불변
- emoji fallback(`?? '🏪'`, AI `🤖`) — 미제거 (Phase 7)
- K-Cosmetics / Neture — 미접촉

---

## 6. TypeScript 결과

```bash
cd services/web-glycopharm && npx tsc --noEmit
# exit 0 (PASS)
```

---

## 7. desktop/mobile smoke 결과

- **정적 검증 PASS**: 대상 2파일 emoji literal 0건 (`rg` exit 1 = no match).
- **라이브 브라우저 smoke: 미수행 (배포 후로 이연).**
  - 사유: `/store-hub`·`/store/channels`는 인증 게이트 라우트이며 변경 미배포 상태(기존 테스트 계정 smoke blocker).
  - **배포 후 확인 권장**: ① Store Hub 카드 4종 + 내 약국 CTA lucide 렌더 ② Channels 가이드 블록 4채널 lucide 렌더 ③ 가이드 블록 ↔ 메인 탭 아이콘 통일감 ④ active 색상 강조 유지 ⑤ 탭/카드 클릭·라우팅 회귀 없음 ⑥ mobile(390px) grid-cols-2 아이콘·텍스트 미겹침.

---

## 8. staged 파일 검증 결과

`git diff --cached --name-only`:
```text
services/web-glycopharm/src/pages/hub/StoreHubPage.tsx
services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx
docs/investigations/CHECK-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1.md
```
`HeroBannerSection.tsx` / 공통 패키지 / 타 서비스 staged 아님 확인.

---

## 9. 남은 후속 작업

- **(후속 WO 제안) `CHANNEL_TABS`의 SIGNAGE=`Smartphone` 정정** — 사이니지=화면/TV 의미와 어긋남. 본 WO 범위 밖으로 미변경. 별도 WO에서 `Tv` 또는 `MonitorPlay`로 정정 검토. (정정 시 가이드 블록 `Tv`와도 완전 일치 가능)
- **(선택) GlycoPharm AI 맞춤 추천 아이콘 → `Sparkles`** — KPA Phase 1 후속(`811067be0`)에서 `aiBlock.icon` 가산 메커니즘이 이미 존재하므로 1줄로 적용 가능. 본 Phase 2 범위(Store Hub 카드/CTA + Channels 가이드)에는 미포함. 일관성 차원에서 별도 보정 권장.
- **Phase 3**: K-Cosmetics 내 매장 / Store Hub / Channels (동일 패턴, 정체성 아이콘 `💄` 등은 §4 tone).

---

*Phase 2 적용 — GlycoPharm 2파일. 공통 패키지·HeroBannerSection·CHANNEL_TABS 미접촉.*
