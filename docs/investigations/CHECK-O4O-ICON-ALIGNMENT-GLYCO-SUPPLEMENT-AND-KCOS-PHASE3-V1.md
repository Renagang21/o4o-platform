# CHECK-O4O-ICON-ALIGNMENT-GLYCO-SUPPLEMENT-AND-KCOS-PHASE3-V1

> 아이콘 정비 **GlycoPharm Phase 2 보완 + K-Cosmetics Phase 3** 적용 결과 고정.

- **작성일**: 2026-06-04
- **기준 문서**: [`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1`](../baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md) (`9b02c39e7`)
- **선행**: Phase 1 KPA(`bda26764d`+`811067be0`), Phase 2 GlycoPharm(`4a8bb62d3`)
- **성격**: GlycoPharm 잔여 보완 + K-Cosmetics 신규 적용을 **한 묶음**으로 처리(배포 후 일괄 smoke 목적)

---

## 1. 최종 판정

**PASS (정적 검증).** GlycoPharm 잔여 emoji(AI 🤖, CHANNEL_TABS SIGNAGE)와 K-Cosmetics Store Hub/Channels emoji를 모두 lucide line icon으로 통일. Glyco·KCos `tsc --noEmit` exit 0, 대상 4파일 emoji 0건. 공통 패키지·HeroBannerSection·Neture 미접촉. 라이브 smoke는 배포 후 일괄 수행(§6).

---

## 2. 수정 파일 목록

### A. GlycoPharm Phase 2 보완
| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/pages/hub/StoreHubPage.tsx` | aiBlock에 `<Sparkles>` 추가 (🤖 → Sparkles) |
| `services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx` | `CHANNEL_TABS` SIGNAGE `Smartphone → Tv` 정정 + 미사용 `Smartphone` import 제거 |

### B. K-Cosmetics Phase 3
| 파일 | 변경 |
|------|------|
| `services/web-k-cosmetics/src/pages/hub/KCosmeticsHubPage.tsx` | resourceCards 4종 + storeCtaBlock + aiBlock icon emoji → lucide (KCos pink tone) |
| `services/web-k-cosmetics/src/pages/store/StoreChannelsPage.tsx` | 채널 가이드 블록 emoji → lucide + `CHANNEL_TABS` SIGNAGE `Smartphone → Tv` + 미사용 `Smartphone` import 제거 |

> 공통 패키지(`StoreHubTemplate` 등) **미수정**. Phase 1의 `icon: ReactNode` + `aiBlock.icon` 가산 메커니즘 그대로 활용.

---

## 3. 교체한 icon 목록

### A. GlycoPharm
- AI 맞춤 추천 🤖 → `Sparkles` (size 28, blue `#2563EB`)
- `CHANNEL_TABS` SIGNAGE `Smartphone` → `Tv` (메인 탭 ↔ 가이드 블록 SIGNAGE 완전 일치 달성)

### B. K-Cosmetics (Store Hub — pink `#DB2777`, §4 KCos tone)
- 🛒 → `PackageSearch` (B2B 상품 리스트)
- 🖥️ → `MonitorPlay` (디지털 사이니지)
- 📄 → `Files` (콘텐츠/자료)
- 📋 → `BadgePercent` (캠페인·이벤트)
- 💄 → `Store` (내 매장 CTA)
- AI 맞춤 추천 🤖 → `Sparkles`

### B. K-Cosmetics (Store Channels — pink active tone)
- 가이드 블록: 🌐→`Globe` / 📱→`Tablet` / 🖥️→`Monitor` / 📺→`Tv`
- `CHANNEL_TABS` SIGNAGE `Smartphone` → `Tv`

---

## 4. 변경하지 않은 항목

- 카드/탭/메뉴 순서, href, route, 문구(label/sub/desc), 권한, API, 데이터 구조 — 불변
- K-Cosmetics "내 매장" 문구 — 유지
- `CHANNEL_TABS`의 B2C/KIOSK/TABLET(기존 lucide) — 미변경 (SIGNAGE만 정정)
- 공통 패키지 / `HeroBannerSection.tsx` / **Neture** — 미접촉
- emoji fallback(StoreHubTemplate `?? '🏪'`, 기본 `🤖`) — 미제거 (Phase 7)

---

## 5. 검증

```bash
cd services/web-glycopharm && npx tsc --noEmit   # exit 0 PASS
cd services/web-k-cosmetics && npx tsc --noEmit   # exit 0 PASS
# emoji 잔존: 4파일 rg → no match (exit 1)
```

---

## 6. 배포 후 일괄 live smoke (대기)

라이브 smoke 미수행 — 인증 게이트 라우트 + 미배포. 배포 후 한 번에 확인:
```text
- GlycoPharm /store-hub        desktop/mobile
- GlycoPharm /store/channels   desktop/mobile (가이드 ↔ 탭 SIGNAGE 모두 Tv 일치 확인)
- K-Cosmetics 내 매장/Store Hub desktop/mobile (pink 아이콘)
- K-Cosmetics Store Channels   desktop/mobile
공통: AI 박스 Sparkles 렌더 / 카드·탭 클릭·라우팅 회귀 없음 / mobile 아이콘·텍스트 미겹침 / console error 없음
```

---

## 7. staged 파일 검증

`git diff --cached --name-only` (5파일):
```text
services/web-glycopharm/src/pages/hub/StoreHubPage.tsx
services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx
services/web-k-cosmetics/src/pages/hub/KCosmeticsHubPage.tsx
services/web-k-cosmetics/src/pages/store/StoreChannelsPage.tsx
docs/investigations/CHECK-O4O-ICON-ALIGNMENT-GLYCO-SUPPLEMENT-AND-KCOS-PHASE3-V1.md
```
`HeroBannerSection.tsx` / 공통 패키지 / Neture staged 아님 확인.

---

## 8. 알려진 제한 / 후속

- **K-Cosmetics Store Hub의 CTA 버튼 색상**: `StoreHubTemplate`이 accent를 `#2563EB`(blue)로 하드코딩하므로, KCos 허브는 **카드 아이콘(pink) + 내 매장 CTA 버튼(blue)** 이 공존한다. 아이콘은 §4 KCos pink tone을 따랐으나, 버튼 색은 템플릿 소유(공통 패키지 구조 변경 금지로 본 작업 범위 밖). → **후속: `StoreHubTemplate` accent의 service-theming**(서비스별 primary token 주입)을 별도 WO로 검토. 배포 smoke 시 시각적 위화감이 크면 우선순위 상향.
- **Neture (Phase 4)**: Home / 역할 카드 / Market Trial CTA(`FlaskConical`) — 별도 진행.
- **Phase 5~7**: Operator/Admin Quick Actions / LMS lesson type / shared emoji fallback 제거.

---

*GlycoPharm 보완 2파일 + K-Cosmetics Phase 3 2파일. 공통 패키지·HeroBannerSection·Neture 미접촉. 배포 후 일괄 smoke 예정.*
