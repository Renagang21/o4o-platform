# WO-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1

> O4O 아이콘 정비 **Phase 4 — Neture 전용**. Home / 역할 카드 / Market Trial CTA / 공급자·파트너·운영자 진입 영역의 emoji·불일치 아이콘을 `lucide-react` line icon으로 정비한다.
> **본 문서는 작업 요청서이며, 코드 착수는 별도 지시 후 진행한다.**

- **작성일**: 2026-06-04
- **상태**: WO 작성 완료 / **코드 착수 대기**
- **Phase**: 4 (기준 문서 §8 rollout 中 Neture)
- **기준 문서**: [`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1`](../baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md) (`9b02c39e7`)
- **선행 IR**: [`IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1`](../investigations/IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1.md) (`cd0ef7285`)

---

## 0. 진행 이력 (참고)

```text
IR / 기준문서          cd0ef7285 / 9b02c39e7
Phase 1 KPA            bda26764d (+ AI 보정 811067be0)
Phase 2 GlycoPharm     4a8bb62d3
Glyco 보완 + KCos P3   d224168d0
Operator Mobile Drawer IR 49c825d06 / WO 108c0a41e / code 39cc8c94a / smoke bf69ba09d
→ Phase 4 Neture       (본 WO, 코드 대기)
```

---

## 1. 작업 목적

Neture는 KPA/GlycoPharm/K-Cosmetics와 달리 **매장 실행 허브 중심이 아니라 공급자·파트너·Market Trial·운영 생태계 중심 서비스**다. 따라서 아이콘 정비 시 `내 매장`·`Store Blog`·매장 실행 자산 흐름을 추가하지 않고, Neture canonical 역할/기능에 맞춰 emoji → lucide line icon으로 정리한다.

본 단계는 **WO 문서 작성 전용**이며 코드 수정 없음.

---

## 2. 현재 상태 (조사 결과 — 실측)

`rg` 확인(2026-06-04) 기준 사용자-facing emoji 위치:

| 영역 | 파일:라인 | 현재 emoji |
|------|----------|-----------|
| Home Market Trial CTA | `services/web-neture/src/pages/CommunityPage.tsx:209` | `<span>🧪</span>` |
| Supplier 랜딩 카테고리 | `services/web-neture/src/pages/SupplierLandingPage.tsx:71-74` | `💊` `🩺` `🧴` `🏠` |
| Partner 랜딩 활동 예시 | `services/web-neture/src/pages/PartnerLandingPage.tsx:75-78` | `{emoji:'⭐'/'📢'/'📱'/'🖼️', icon: Star/Share2/QrCode/ImageIcon}` (emoji 렌더, lucide **미사용**) |
| 회원가입 역할 선택 | `services/web-neture/src/components/RegisterModal.tsx` | 역할 emoji (`🏪`/`🏭`/`🤝` 계열) |
| Operator 도메인 라벨 | `services/web-neture/src/config/operatorMenuGroups.ts:240-244` | `NETURE_DOMAIN_LABELS` emoji `📦` `💳` `💬` `⚙️` |

**Home 진입점 주의:** Neture Home 은 `CommunityPage.tsx` 이다. (`HomePage.tsx`/`homeStaticData.ts` 는 **K-Cosmetics** 파일 — Neture 아님. 후보 목록에서 제외/재확인.) Home AppEntry/역할 카드는 이미 lucide(`Layers`/`TrendingUp`/`Users`) + custom SVG(`ForumIcon` 등) 사용 중이며, emoji 는 CTA `🧪` 1곳.

> **operatorMenuGroups 도메인 라벨 emoji 특이사항 (중요):** `NETURE_DOMAIN_LABELS` 의 emoji 는 공통 `DomainIASidebar` 가 `<span aria-hidden>{domain.emoji}</span>` 로 **그대로 렌더**한다(Operator Mobile Drawer smoke 에서 `📦/💳/💬/⚙️` 헤딩으로 확인됨). 이를 lucide 로 바꾸려면 **공통 `DomainIASidebar` 의 도메인 헤딩 렌더 구조 변경**이 필요 → §7 가드(`DomainIASidebar`/`operatorDomainIA`/`STANDARD_GROUPS` 미변경)에 저촉. → **§5.5 결정 참조 (이번 Phase 4 에서는 미변경 권장, 별도 후속 WO).**

---

## 3. 작업 성격 / 제외 (문서 단계)

본 문서 작성 단계에서는 코드/아이콘/문구/라우트/공통 패키지 수정, CHECK 작성 모두 **하지 않는다.** 코드 작업은 WO 확인 후 별도 지시.

---

## 4. 조사 대상 (코드 착수 시)

```text
services/web-neture/src/pages/CommunityPage.tsx          (Home — Market Trial CTA)
services/web-neture/src/pages/SupplierLandingPage.tsx     (공급자 카테고리)
services/web-neture/src/pages/PartnerLandingPage.tsx      (파트너 활동 예시)
services/web-neture/src/components/RegisterModal.tsx      (역할 선택)
services/web-neture/src/config/operatorMenuGroups.ts      (도메인 라벨 — §5.5 가드 주의)
```

착수 시 재확인:
```bash
rg "🧪|🏪|🏭|🤝|⭐|💊|🩺|🧴|🏠|📦|📢|📱|🖼|emoji:" services/web-neture/src/pages services/web-neture/src/components services/web-neture/src/config
```

---

## 5. 코드 작업 범위 (Neture 전용)

### 5.1 Neture Home (`CommunityPage.tsx`)
- Market Trial CTA `🧪` → **`FlaskConical`** (size 28 전후, Neture blue/indigo tone)
- 역할 카드/서비스 바로가기: 이미 lucide/SVG → **무리한 변경 금지**. emoji 발견 시에만 lucide 치환.
- `HomeAppIcons` custom SVG 중앙화 영역 — 변경하지 않음.

### 5.2 Supplier Landing (`SupplierLandingPage.tsx:71-74`)
- 카테고리 emoji(`💊🩺🧴🏠`) — 사용자-facing 주요 UI icon 으로 부적합.
- 정비 방향: 카테고리 표현은 **중립 lucide**(예: `Pill`/`Stethoscope` 대신 의미 과적합 회피 — `Package`/`Boxes` 계열 또는 라벨 중심)로 정리하거나, icon 비중을 낮춘다. 공급자 역할 자체 아이콘은 `Factory` 또는 `PackagePlus`.
- 상품/자료 카드: `PackageSearch` / `FileInput` / `Files`.

### 5.3 Partner Landing (`PartnerLandingPage.tsx:75-78`)
- `{emoji, icon}` 동시 정의 → **emoji 렌더 제거하고 이미 정의된 lucide(`Star`/`Share2`/`QrCode`/`ImageIcon`) 를 실제 렌더**로 전환 (또는 의미에 맞게 조정).
- 파트너 역할 아이콘: `Handshake`. 협력/추천/평가: `Handshake`/`Star`/`ClipboardCheck` 등 의미 매핑.
- **미사용 lucide import 정리** (emoji 제거 후 사용/미사용 재정렬).

### 5.4 Register Modal 역할 선택 (`RegisterModal.tsx`)
- 역할 emoji → lucide: 공급자 `Factory`/`PackagePlus`, 파트너 `Handshake`, 운영/관리 성격 `ShieldCheck`.
- **Neture 에 "내 매장" 개념 추가 금지** (§7).

### 5.5 Operator 도메인 라벨 (`operatorMenuGroups.ts:240-244`) — **결정 필요**
- `NETURE_DOMAIN_LABELS` emoji(`📦💳💬⚙️`)는 공통 `DomainIASidebar` 가 직접 렌더 → lucide 化 시 **공통 sidebar 구조 변경 필요(§7 가드 저촉)**.
- **권장 결정: 이번 Phase 4 에서는 미변경.** 도메인 헤딩 emoji 의 lucide 전환은 **별도 후속 WO**(공통 `DomainIASidebar` 도메인 헤딩 아이콘화 — KPA/Glyco/KCos 도메인 라벨 emoji 와 함께 일괄)로 분리. CHECK 에 후속 항목으로 기록.

---

## 6. Neture 아이콘 표준 매핑

| 의미 | lucide |
|------|--------|
| **Market Trial** | **`FlaskConical` (결정)** |
| 공급자 | `Factory` 또는 `PackagePlus` |
| 파트너 | `Handshake` |
| 운영자 | `ShieldCheck` |
| 커뮤니티 | `MessagesSquare` |
| 자료 / 원천 자료 | `FileInput` 또는 `Files` |
| 상품 / 공급 상품 | `PackageSearch` 또는 `PackagePlus` |
| 서비스 바로가기 | `Layers` 또는 `ExternalLink` |
| 성장 / 성과 | `TrendingUp` |
| 사용자 / 참여자 | `Users` |
| 공지 / 콘텐츠 | `FileText` 또는 `Newspaper` |
| 문의 / 협력 | `MessageSquare` 또는 `Handshake` |

**Market Trial = `FlaskConical` 확정** — 시장 검증·실험 성격이라 `Rocket`(출시·런칭)보다 의미상 안정적. 단일 화면 혼용 금지.

---

## 7. Neture 도메인 가드

추가 금지: `내 매장` / `Store Blog` / 매장 실행 기능 / 내 매장 상품 / POP·QR·매장 사이니지 제작 흐름 / 약국 전용 표현 / K-Cosmetics 내 매장 표현.

유지 성격: 공급자 / 파트너 / Market Trial / 운영자 수신 자료 등록 / 오프라인 수신 원천 자료 등록 / Operator Source Ingestion / B2B 운영 생태계.

공통 구조 미변경: `DomainIASidebar` / `operatorDomainIA` / `STANDARD_GROUPS` (Operator Mobile Drawer 에서 검증됨).

---

## 8. 제외 범위

```text
- KPA-Society / GlycoPharm / K-Cosmetics 수정 금지
- operator mobile drawer 파일(DomainIASidebar/OperatorAreaShell) 수정 금지
- packages/operator-ux-core 수정 금지
- packages/shared-space-ui/src/HeroBannerSection.tsx — 미접촉 유지
- 공통 패키지 구조 변경 / shared-space-ui/HomeAppIcons 대규모 변경 금지
- 라우트 / 권한 / API / 데이터 구조 변경 금지
- 문구 대규모 수정 금지
```

---

## 9. 구현 원칙

```text
1. 사용자-facing 주요 UI emoji 제거 → lucide line icon
2. Neture blue/indigo tone 유지
3. 중앙화 custom SVG(HomeAppIcons) 무리하게 제거하지 않음
4. 동일 기능은 기준 문서 표준 매핑 준수
5. Neture 에 매장 허브/내 매장 문맥 추가 금지
6. 카드 순서/링크/라우트/권한/API 불변
7. 문구는 최소 범위 외 변경 금지
8. emoji 제거 후 미사용 import 정리
```

---

## 10. 검증 기준 (코드 단계)

```bash
cd services/web-neture && npx tsc --noEmit    # 또는 repo 표준 명령
rg "🧪|🏪|🏭|🤝|⭐|💊|🩺|🧴|🏠|📦|📢|📱|🖼" services/web-neture/src/pages services/web-neture/src/components services/web-neture/src/config
```
화면 smoke (배포/local): Neture Home · Supplier Landing · Partner Landing · Register Modal 역할 선택 (desktop/mobile).
확인: emoji 제거 / lucide 정상 렌더 / Market Trial=FlaskConical / 공급자·파트너·운영자 의미 명확 / 내 매장 문맥 미추가 / 모바일 아이콘·텍스트 미겹침 / 라우트·클릭·권한 회귀 없음 / console error 없음.

---

## 11. CHECK 문서 기준

작업 완료 후:
```text
docs/investigations/CHECK-O4O-NETURE-HOME-ROLE-MARKET-TRIAL-ICON-ALIGNMENT-V1.md
```
포함: 1 최종 판정 / 2 기준 문서 / 3 수정 파일 / 4 교체 icon / 5 변경하지 않은 항목 / 6 **Neture 도메인 가드 준수** / 7 TS 결과 / 8 desktop·mobile smoke / 9 staged 검증 / 10 후속(특히 §5.5 도메인 라벨 emoji 별도 WO).

---

## 12. Git 기준

```text
- path-specific staging만 사용 (git add . / git commit -am 금지)
- commit 직전: git status --short / git diff --cached --name-only / git diff --name-only
- HeroBannerSection.tsx staged 시 즉시 중단·보고
- 작업 끝나면 즉시 path-specific 커밋
```
WO 문서 커밋 메시지: `docs: add Neture Phase 4 icon alignment WO`
코드 커밋 메시지: `feat(neture): align home role and market trial icons with global standard`

---

## 13. 완료 기준

**문서 단계:** WO 작성 / Neture 범위·도메인 가드·`FlaskConical` 기준·제외 범위 명시 / 코드 수정 없음 / staged 1개 / commit·push.

**코드 단계:** Home·Supplier·Partner·Register emoji 정비 / 도메인 가드 준수 / TS PASS / desktop·mobile smoke PASS / CHECK 작성 / 의도한 파일만 commit·push.

---

## 14. 후속 작업 (Phase 4 이후)

```text
- (분리) 공통 DomainIASidebar 도메인 헤딩 emoji → lucide (4서비스 도메인 라벨 일괄)
- Operator/Admin Quick Actions emoji 정비
- LMS lesson type icon mapping 공통화
- shared-space-ui emoji fallback 제거 (Phase 7)
- StoreHubTemplate service accent/theming 분리 (KCos pink/blue 혼재 해소)
```

---

*Phase 4 — Neture 전용. 매장 허브형 작업과 분리. 도메인 라벨 emoji 는 공통 sidebar 가드로 별도 후속. 본 문서는 요청서이며 코드 변경을 포함하지 않는다.*
