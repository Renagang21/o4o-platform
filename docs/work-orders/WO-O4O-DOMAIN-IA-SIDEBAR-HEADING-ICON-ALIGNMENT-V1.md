# WO-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-ALIGNMENT-V1

> 운영자/관리자 사이드바(`DomainIASidebar`)의 **도메인 헤딩 emoji** 를 O4O 글로벌 아이콘 표준에 맞춰 **lucide-react** 로 정렬한다.
> 방향: **IR Option A 확정** — config 데이터 무변경, 렌더 지점에서 `domain key → lucide` 매핑, 미매핑 시 기존 emoji fallback.

- **작성일**: 2026-06-05
- **작업 유형**: UI 아이콘 정렬 (operator/admin sidebar 축)
- **선행 IR**: [`IR-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-AUDIT-V1`](../investigations/IR-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-AUDIT-V1.md) (commit `825fccbd1`)
- **착수**: 본 WO 확인 후 **별도 지시로 코드 착수** (이 문서는 WO 문서만 작성)

---

## 1. 목적

operator/admin 사이드바 도메인 헤딩에 남아 있는 emoji(💬 🏪 ⚙️ 📦 💳) 를 lucide line icon 으로 정렬해, Home/Store Hub/Channels/Quick·Structure·Admin Actions 에 이어 **운영자/관리자 영역의 마지막 큰 emoji 축**을 정리한다.

O4O 글로벌 아이콘 표준: 사용자-facing primary icon 은 lucide line icon 우선, emoji 는 primary UI icon 으로 사용하지 않는다.

---

## 2. 방향 (IR Option A 확정)

```text
- config 데이터는 변경하지 않는다.
  · packages/operator-ux-core/src/sidebar/operatorDomainIA.ts 의 DOMAIN_LABELS emoji 값 유지
  · services/web-neture/src/config/operatorMenuGroups.ts 의 NETURE_DOMAIN_LABELS emoji 값 유지
- DomainIASidebar.tsx 렌더 지점에서 domain key → lucide icon 매핑을 적용한다.
- 매핑이 없으면 기존 domain.emoji fallback 을 유지한다 (무중단·하위호환).
```

근거: IR §5 — emoji 는 순수 string, config 는 React 미import 순수 `.ts` 모듈이라 ReactNode 직접 보유 불가. 렌더 시점 key→component 해석이 가장 안전하고 변경면이 작다.

---

## 3. 수정 범위

### 대상 (수정 허용)

```text
packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx   ← 원칙적으로 1파일
```

- 렌더 지점([DomainIASidebar.tsx:249-252](../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx)) 의 `<span aria-hidden>{domain.emoji}</span>` 1곳.
- 파일 상단에 `domain key → LucideIcon` 매핑 상수 추가.

### 비대상 (수정 금지 — 불필요)

```text
packages/operator-ux-core/src/sidebar/operatorDomainIA.ts
services/web-neture/src/config/operatorMenuGroups.ts
서비스 wrapper 5종 (KPA/Glyco/KCos operator + Neture operator/admin)
```

위 파일들은 필요해지지 않으면 수정하지 않는다. 필요해지면 중간 보고한다.

---

## 4. 아이콘 매핑 (확정)

| domain key | 라벨 | 기존 emoji | lucide |
|-----------|------|:---:|--------|
| `community` | 커뮤니티 운영 | 💬 | `MessagesSquare` |
| `community_content` | 커뮤니티·콘텐츠 운영 | 💬 | `MessagesSquare` |
| `store_hub` | 매장 HUB 운영 | 🏪 | `Store` |
| `common` | 운영 공통 | ⚙️ | `Settings` |
| `supply_distribution` | 공급·유통 운영 | 📦 | `Package` |
| `commerce_settlement` | 커머스·정산 운영 | 💳 | `CreditCard` |

- 매핑에 없는 domain key 는 기존 `domain.emoji` 를 그대로 렌더(fallback).

---

## 5. 구현 기준

### 5.1 렌더 패턴

도메인 헤딩은 매우 작은 텍스트(`text-[11px]` uppercase, `text-gray-500`). lucide 는 동일 시각 비중을 위해 작게 + currentColor.

```tsx
// 권장 패턴 (예시)
const DOMAIN_ICON_MAP: Record<string, LucideIcon> = {
  community: MessagesSquare,
  community_content: MessagesSquare,
  store_hub: Store,
  common: Settings,
  supply_distribution: Package,
  commerce_settlement: CreditCard,
};

// 렌더 지점 (line 250 교체)
const DomainIcon = DOMAIN_ICON_MAP[domain.key];
...
{DomainIcon
  ? <DomainIcon size={13} aria-hidden className="text-gray-500" />
  : <span aria-hidden>{domain.emoji}</span>}
```

- size 는 헤딩 비중에 맞춰 `12~13` 권장. 실제 값은 시각 정렬에 맞춰 미세 조정.
- `aria-hidden` 유지(기존 emoji 도 `aria-hidden` 장식 요소였음).
- 색상은 헤딩 라벨과 동일 `text-gray-500`(currentColor 상속) 유지.

### 5.2 변경 금지 항목

```text
- DomainIASidebar 의 drawer 열림/닫힘 동작 로직
- desktop sidebar / mobile drawer 공유 renderNav() 의 구조 (도메인 헤딩 아이콘만 보정)
- 메뉴 순서 / 라우트 / 권한(capability·adminOnly) / group collapsible / active 상태
- 도메인 라벨 문구 / domain key / group→domain 매핑
- Neture Admin IA 구조 (operator IA 재사용 유지)
- HeroBannerSection.tsx
- StandardHomeTemplate.tsx
- store-ui-core WIP: StoreSidebar.tsx / storeMenuConfig.ts / menuCapabilityMap.ts
- backend / API / DB
```

---

## 6. 검증

### 6.1 TypeScript

```text
- operator-ux-core (DomainIASidebar 소속 패키지) tsc --noEmit
- 소비 4서비스 tsc --noEmit:
  · @o4o/web-kpa-society
  · glycopharm-web
  · @o4o/web-k-cosmetics
  · @o4o/web-neture
```

> 패키지 script 이름이 없으면 `pnpm --filter <pkg> exec tsc --noEmit` 로 수행. 정확한 패키지명은 코드 착수 시 확인.

### 6.2 브라우저 smoke (가능 시)

```text
- KPA / GlycoPharm / K-Cosmetics operator: desktop sidebar + mobile drawer 도메인 헤딩 아이콘
- Neture operator: desktop + mobile drawer
- Neture /admin: mobile drawer 도메인 헤딩 아이콘
확인:
1. 도메인 헤딩이 lucide line icon 으로 표시(💬🏪⚙️📦💳 → MessagesSquare/Store/Settings/Package/CreditCard)
2. drawer 열림/닫힘 정상
3. 하위 메뉴 접근(클릭/라우팅) 정상
4. desktop sidebar 회귀 없음 (헤딩 정렬·간격·active 상태 유지)
5. console critical error 없음
```

브라우저 smoke 가 어려우면 tsc + 코드 기준 확인으로 대체하고 CONDITIONAL PASS 로 판정.

### 6.3 코드 기준 확인

```text
1. DomainIASidebar.tsx 에 domain key → lucide 매핑 추가됨
2. 렌더 지점이 lucide 우선 + emoji fallback 구조로 교체됨
3. config(operatorDomainIA.ts / operatorMenuGroups.ts) emoji 값 무변경
4. wrapper 5종 무변경
5. drawer/active/권한/순서 로직 무변경
6. backend/API/DB 무변경
```

---

## 7. 안전 규칙 (Git)

```text
git pull --ff-only
git status --short
path-specific git add 만 사용 (git add . 금지, git commit -am 금지)
git diff --cached --name-only 로 staged 확인
예상 밖 파일이 있으면 commit 중단
다른 세션 WIP(StoreSidebar/storeMenuConfig/menuCapabilityMap, untracked PNG) staging 금지
```

> 참고: 최근 동일 워크트리에서 동시 세션 충돌 이력 있음. 착수 전 `git pull --ff-only` + staged 검증 필수.

---

## 8. 커밋 메시지 예시

```text
fix(operator): align domain-IA sidebar heading icons to lucide
```

또는

```text
fix(icons): replace operator sidebar domain heading emoji with lucide
```

---

## 9. 완료 보고 형식

```text
WO-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-ALIGNMENT-V1 완료

1. 수정 요약
2. 수정 파일 (원칙 DomainIASidebar.tsx 1개)
3. 아이콘 매핑 결과 (6 key → lucide, emoji fallback)
4. 변경하지 않은 것 (config / wrapper / drawer 로직 / 순서·권한·active / Hero·store-ui-core WIP / backend)
5. 검증 결과 (operator-ux-core + 4서비스 tsc, 코드 기준)
6. 브라우저 smoke 여부
7. 커밋 해시
8. push 여부
9. 남은 이슈 / 후속 권장
```

---

## 10. 완료 기준

```text
- 도메인 헤딩 emoji 5종 → lucide 정렬 (6 domain key 매핑)
- config 데이터 / wrapper 무변경 (Option A)
- emoji fallback 유지 (미매핑 key 안전)
- drawer 동작 / desktop sidebar 회귀 없음
- 메뉴 순서·라우트·권한·active 무변경
- operator-ux-core + 4서비스 tsc PASS
- (가능 시) 5 wrapper desktop/drawer smoke PASS
- 의도한 파일만 staged/commit
- push 완료
```

---

## 11. 후속 후보 (이 WO 이후)

```text
1. LMS lesson type icon mapping 공통화
2. shared-space-ui 비-Home emoji fallback 제거 (AppreciationPanel/StoreHubTemplate/ForumHubTemplate/ResourcesHubTemplate)
3. 서비스별 empty state emoji 제거
```

운영자/관리자 영역 emoji 정리가 끝나면 위 후순위 cleanup 으로 이동.

---

*본 WO 문서는 작업 기록으로 commit 한다. 코드 착수는 별도 지시로 진행.*
