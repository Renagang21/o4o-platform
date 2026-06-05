# IR-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-AUDIT-V1

> **조사 전용 (read-only).** 코드/CSS 수정 없음. 운영자/관리자 사이드바(`DomainIASidebar`)의 **도메인 헤딩 emoji**를 lucide-react 로 정비하기 위한 사전 조사. 구조·영향·매핑·최소 수정안을 제시한다.

- **작성일**: 2026-06-05
- **작업 유형**: Investigation (IR) — 아이콘 표준화 후속 트랙
- **조사 방식**: read-only 코드 조사 + 핵심 라인 직접 확인
- **선행 트랙**: Home CTA / ServiceBanner / Market Trial emoji → lucide 정렬 완료 (이번은 operator/admin sidebar 축)

---

## 1. 전체 판정

**구조적으로 안전하게 정비 가능.** 도메인 헤딩 emoji 는 **2개 데이터 소스 + 1개 렌더 지점**으로 완전히 중앙화되어 있고, 데스크탑 sidebar 와 모바일 drawer 가 **단일 `renderNav()` 경로**를 공유한다. emoji 는 순수 `string` 필드라, **config 데이터 타입을 바꾸지 않고** 렌더 지점에서 `도메인 key → lucide 컴포넌트` 맵으로 치환하는 것이 가장 안전하다 (fallback 으로 기존 emoji 유지 가능 → 무중단·하위호환).

| 핵심 발견 | 판정 |
|-----------|------|
| 도메인 헤딩 emoji 중앙화 (2 소스) | ✅ `operatorDomainIA.ts` + Neture `operatorMenuGroups.ts` |
| 렌더 단일 지점 | ✅ `DomainIASidebar.tsx:250` `<span aria-hidden>{domain.emoji}</span>` |
| desktop ↔ mobile drawer 동일 경로 | ✅ 단일 `renderNav()` — drawer 회귀 위험 낮음 |
| config 의 ReactNode 보유 가능? | ❌ 순수 `.ts` 데이터 모듈 (React 미import) → key→component 해석 필요 |
| 최소 수정 가능 | ✅ 렌더 지점 1곳 + 아이콘 맵 1개 추가로 5개 wrapper 동시 적용 |

---

## 2. DomainIASidebar 렌더 구조

**파일**: `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx`

**도메인 타입 (line 43-48):**
```ts
interface ResolvedDomain {
  key: string;
  label: string;
  emoji: string;      // ← 순수 string
  groups: ResolvedGroup[];
}
```

**헤딩 렌더 (line 249-252):**
```tsx
<div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
  <span aria-hidden>{domain.emoji}</span>
  <span>{domain.label}</span>
</div>
```
- emoji 는 `aria-hidden` 장식 요소 → 스크린리더 무시 (접근성상 lucide 교체 시에도 `aria-hidden` 유지 권장).
- 헤딩은 매우 작은 텍스트(`text-[11px]` uppercase). lucide 교체 시 `size={12~13}` + `text-gray-500`(currentColor) 권장.

**desktop ↔ mobile 단일 경로:** 헤딩 마크업은 `renderNav()`(line ~166-329) 내부에 1회 정의되며, desktop `<aside class="hidden md:block">`(line ~336)과 mobile drawer `<aside class="md:hidden">`(line ~384)가 **동일 `renderNav()` 를 호출**한다. → 렌더 지점 1곳만 바꾸면 양쪽 동시 반영, 분기 회귀 없음.

**Config 주입 (line 59-61):**
```ts
/** 미주입 시 DEFAULT_OPERATOR_DOMAIN_IA (KPA 계열) 사용 — 기존 3 서비스 무변화. */
domainIAConfig?: OperatorDomainIAConfig;
```
emoji 는 resolve 단계에서 `domainIAConfig.labels[domainKey].emoji` 로 `ResolvedDomain.emoji` 에 복사된다.

---

## 3. 도메인 헤딩 emoji 전수 인벤토리 (핵심 산출물)

### 소스 A — KPA 계열 (KPA-Society / GlycoPharm / K-Cosmetics 공통)
`packages/operator-ux-core/src/sidebar/operatorDomainIA.ts:25-29`
```ts
export const DOMAIN_LABELS: Record<OperatorDomainKey, { label: string; emoji: string }> = {
  community: { label: '커뮤니티 운영', emoji: '💬' },
  store_hub: { label: '매장 HUB 운영', emoji: '🏪' },
  common:    { label: '운영 공통',     emoji: '⚙️' },
};
```

### 소스 B — Neture (Operator + Admin 공통 4 도메인)
`services/web-neture/src/config/operatorMenuGroups.ts:240-245`
```ts
export const NETURE_DOMAIN_LABELS: Record<NetureOperatorDomainKey, { label: string; emoji: string }> = {
  supply_distribution: { label: '공급·유통 운영',     emoji: '📦' },
  commerce_settlement: { label: '커머스·정산 운영',   emoji: '💳' },
  community_content:   { label: '커뮤니티·콘텐츠 운영', emoji: '💬' },
  common:              { label: '운영 공통',          emoji: '⚙️' },
};
```

### 통합 인벤토리

| 서비스 | domain key | 라벨 | emoji |
|--------|-----------|------|:-----:|
| KPA / Glyco / KCos | `community` | 커뮤니티 운영 | 💬 |
| KPA / Glyco / KCos | `store_hub` | 매장 HUB 운영 | 🏪 |
| KPA / Glyco / KCos | `common` | 운영 공통 | ⚙️ |
| Neture (Op+Admin) | `supply_distribution` | 공급·유통 운영 | 📦 |
| Neture (Op+Admin) | `commerce_settlement` | 커머스·정산 운영 | 💳 |
| Neture (Op+Admin) | `community_content` | 커뮤니티·콘텐츠 운영 | 💬 |
| Neture (Op+Admin) | `common` | 운영 공통 | ⚙️ |

**고유 emoji 5종**: 💬(community/content) · 🏪(store_hub) · ⚙️(common) · 📦(supply) · 💳(commerce).

---

## 4. 서비스별 적용 경로 (Regression Surface)

`DomainIASidebar` 는 `OperatorAreaShell` 체인을 통해 5개 wrapper 에서 사용된다. 도메인 헤딩 변경은 아래 전부에 동시 반영된다.

| 서비스 | wrapper | domainIAConfig |
|--------|---------|----------------|
| KPA-Society | `services/web-kpa-society/.../KpaOperatorLayoutWrapper.tsx` | 미주입 → DEFAULT(KPA 계열) |
| GlycoPharm | `services/web-glycopharm/.../layouts/OperatorLayoutWrapper.tsx` | 미주입 → DEFAULT |
| K-Cosmetics | `services/web-k-cosmetics/.../layouts/OperatorLayoutWrapper.tsx` | 미주입 → DEFAULT |
| Neture Operator | `services/web-neture/.../layouts/OperatorLayoutWrapper.tsx` | `NETURE_OPERATOR_DOMAIN_IA` |
| **Neture Admin** | `services/web-neture/.../layouts/AdminLayoutWrapper.tsx` | `NETURE_OPERATOR_DOMAIN_IA` (operator 와 동일 IA) |

- **Neture Admin 은 operator 와 동일 IA 구조** 를 재사용한다 (별도 admin domain 정의 없음). admin 미사용 그룹(stores/forum/signage)은 항목 없음으로 헤딩 skip → 빈 헤딩 미표시.
- **Drawer 안정성**: 모바일 drawer 는 `WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1` 로 안정화되어 desktop 과 동일 `renderNav()` 사용. 헤딩 마크업만 바뀌므로 drawer 동작 로직 회귀 위험 낮음.

---

## 5. emoji → lucide 전환을 위한 구조 분석

- `emoji` 는 `labels: Record<string, { label: string; emoji: string }>` 의 **순수 string** 필드.
- config 파일은 **순수 데이터 `.ts` 모듈** (`operatorDomainIA.ts` 는 `OperatorGroupKey` 타입만 import, React/lucide 미import). → **ReactNode 직접 보유 불가**.
- 따라서 아이콘은 **렌더 시점에 key→component 로 해석**해야 한다 (config 에 JSX 를 넣지 않음).

### 전환 옵션

**Option A (권장) — 렌더 지점 key→lucide 맵, config 데이터 무변경**
- `DomainIASidebar.tsx` 에 `domain key → LucideIcon` 맵 추가 (예: `community`/`community_content`→`MessagesSquare`, `store_hub`→`Store`, `common`→`Settings`, `supply_distribution`→`Package`, `commerce_settlement`→`CreditCard`).
- line 250 을 `const Icon = DOMAIN_ICON_MAP[domain.key]; return Icon ? <Icon size={12} aria-hidden className="text-gray-500" /> : <span aria-hidden>{domain.emoji}</span>` 패턴으로 교체.
- **장점**: config 데이터 타입·2개 소스 파일 **무변경**, emoji 는 fallback 으로 잔존(미매핑 key 안전), 5 wrapper 동시 적용. 하위호환·무중단.
- **단점**: 아이콘 매핑이 컴포넌트에 위치(데이터-주도 아님). 단, domain key 집합이 작고 고정이라 실용적.

**Option B — config 에 `iconKey: string` 추가 + 공통 아이콘 레지스트리**
- `labels` 항목에 `iconKey` 추가, 별도 `iconKey→component` 레지스트리에서 해석.
- **장점**: 서비스별 per-domain 오버라이드 명시 가능, 데이터-주도.
- **단점**: 2개 소스 + 타입(`OperatorDomainIAConfig.labels`) 변경 필요(옵셔널이면 하위호환). Option A 대비 변경면 큼.

→ **권장: Option A**. domain key 가 6종으로 고정·안정적이고, config 무변경으로 회귀면이 가장 작다. emoji 필드는 fallback 으로 남겨 점진적.

### 제안 lucide 매핑 (WO 에서 최종 확정)

| domain key | 라벨 | emoji | 제안 lucide | 대안 |
|-----------|------|:---:|------------|------|
| `community` | 커뮤니티 운영 | 💬 | `MessagesSquare` | `Users` |
| `store_hub` | 매장 HUB 운영 | 🏪 | `Store` | `PackageSearch` |
| `common` | 운영 공통 | ⚙️ | `Settings` | `SlidersHorizontal` |
| `supply_distribution` | 공급·유통 운영 | 📦 | `Package` | `Truck` |
| `commerce_settlement` | 커머스·정산 운영 | 💳 | `CreditCard` | `ReceiptText` |
| `community_content` | 커뮤니티·콘텐츠 운영 | 💬 | `MessagesSquare` | `FileText` |

- `community` 와 `community_content` 가 동일 💬 → 동일 lucide(`MessagesSquare`) 로 일관 처리 가능.
- 헤딩이 작아 `size={12~13}` + `text-gray-500`(currentColor) 권장, `aria-hidden` 유지.

---

## 6. 후속 WO 제안

```text
WO-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-ALIGNMENT-V1
```

- **범위**: `DomainIASidebar.tsx` 1파일 렌더 지점 교체 + lucide 아이콘 맵 추가 (Option A).
- **수정 최소화**: config 2개 소스(`operatorDomainIA.ts` / Neture `operatorMenuGroups.ts`) 데이터는 무변경(emoji fallback 잔존). 필요 시 주석만 보강.
- **검증**:
  - `tsc --noEmit`: `@o4o/web-kpa-society` / `glycopharm-web` / `@o4o/web-k-cosmetics` / `@o4o/web-neture` 4개.
  - 브라우저 smoke: 5 wrapper(KPA/Glyco/KCos operator + Neture operator/admin) 에서 desktop sidebar + mobile drawer 헤딩 아이콘 렌더 확인, drawer open/close 동작 회귀 확인.
- **주의**: `HeroBannerSection.tsx` 미접촉 · `StoreSidebar.tsx`/`storeMenuConfig.ts` 등 store-ui-core WIP 파일 staging 금지 · path-specific staging.

---

## 7. 변경하지 않아야 할 것 (정비 시)

```text
- 도메인 라벨 문구 / domain key / group→domain 매핑
- DomainIASidebar 의 nav 항목 렌더 / capability·adminOnly 필터
- 모바일 drawer open/close 동작 로직 (WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1 안정화)
- Neture Admin IA 구조 (operator IA 재사용 유지)
- HeroBannerSection / StandardHomeTemplate
- backend / API / DB
```

---

## 부록. 핵심 파일 인덱스
- 렌더: `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` (type L43-48, 헤딩 L249-252, config param L59-61)
- 소스 A: `packages/operator-ux-core/src/sidebar/operatorDomainIA.ts` (`DOMAIN_LABELS` L25-29)
- 소스 B: `services/web-neture/src/config/operatorMenuGroups.ts` (`NETURE_DOMAIN_LABELS` L240-245)
- wrapper 5종: §4 표 참조

*코드/CSS 변경 없음. 본 IR 은 조사 기록으로 commit 한다.*
