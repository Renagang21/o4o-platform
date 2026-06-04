# IR-O4O-OPERATOR-MOBILE-NAV-LAYOUT-AUDIT-V1

> **조사 전용 (read-only).** 코드/CSS 수정 없음. O4O 4개 서비스 operator 화면의 모바일 폭 사이드바/메뉴 렌더링을 조사하고 공통 수정 방향을 제시한다.

- **작성일**: 2026-06-04
- **작업 유형**: Investigation (IR)
- **계기**: `glycopharm.co.kr/operator` 모바일에서 데스크톱용 좌측 사이드바가 **상단 가로 스크롤 탭**으로 노출 + 본문 밀림 + 후순위 메뉴 잘림 (사용자 관측)
- **조사 범위**: `web-kpa-society`, `web-glycopharm`, `web-k-cosmetics`, `web-neture` operator 화면 + operator shell/sidebar 공통 패키지

---

## 1. 전체 판정

신고된 증상은 **버그가 아니라 공통 컴포넌트의 의도된(그러나 확장성이 낮은) 모바일 디자인**이다. 그리고 **4개 서비스 전부 동일 공통 컴포넌트를 사용**하므로 — GlycoPharm만의 문제가 아니라 O4O operator 영역 전체의 공통 문제이고, **한 곳을 고치면 4서비스가 동시에 해결**된다.

| 항목 | 결과 |
|------|------|
| 근본 원인 | `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` 의 **모바일 분기**(`md:hidden`)가 가로 스크롤 탭 바로 렌더 |
| 공통/서비스별 | **공통 컴포넌트 문제** — 4서비스 + Neture Admin 모두 동일 경로 사용 |
| 햄버거/drawer | **없음** (operator 영역엔 모바일 drawer 미구현) |
| 수정 위치 | 공통 패키지 `DomainIASidebar`(+필요 시 `OperatorAreaShell`) 단일 지점 |

---

## 2. 렌더링 경로 (4서비스 공통)

```text
각 서비스 OperatorLayoutWrapper
  → OperatorAreaShell (@o4o/operator-ux-core)        [packages/operator-ux-core/src/layout/OperatorAreaShell.tsx]
      → DomainIASidebar (@o4o/operator-ux-core)      [packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx]
      → <main><Outlet/></main>
```

**공통 사용 확인 (import `OperatorAreaShell`):**
- `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx:14,34`
- `services/web-glycopharm/src/components/layouts/OperatorLayoutWrapper.tsx:16,34`
- `services/web-k-cosmetics/src/components/layouts/OperatorLayoutWrapper.tsx:16,34`
- `services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx:13,27`
- `services/web-neture/src/components/layouts/AdminLayoutWrapper.tsx` (Admin 영역도 동일 sidebar 사용)

> wrapper 주석에 `GlycoOperatorSidebar`/`KpaOperatorSidebar` 등 legacy 명칭이 남아 있으나, 실제 import·렌더는 모두 공통 `OperatorAreaShell` + `DomainIASidebar` 이다.

---

## 3. 근본 원인 (코드 인용)

`DomainIASidebar` 는 데스크톱/모바일 **두 가지 마크업**을 동시에 두고 Tailwind breakpoint 로 토글한다.

### 3.1 데스크톱 — 세로 사이드바 (`hidden md:block`)
[DomainIASidebar.tsx:166-167](../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx#L166-L167)
```tsx
<aside className="w-60 flex-shrink-0 hidden md:block">
  <nav className="bg-white rounded-xl border ... sticky top-20"> ... 도메인 헤딩 + 그룹 collapsible ... </nav>
</aside>
```

### 3.2 모바일 — **가로 스크롤 탭 바** (`md:hidden`) ← 증상의 원인
[DomainIASidebar.tsx:328-351](../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx#L328-L351)
```tsx
<div className="md:hidden w-full mb-4">
  <nav className="flex gap-1 overflow-x-auto bg-white rounded-xl border p-1">
    {flatGroupsForMobile.map((group) => (
      <Link to={group.items[0].path} className="... whitespace-nowrap ...">
        <Icon size={14} /> {group.label}
      </Link>
    ))}
  </nav>
</div>
```

- `flex ... overflow-x-auto ... whitespace-nowrap` → 메뉴가 많으면 **한 줄 가로 스크롤**. = 신고된 "상단 가로 탭 + 가로 스크롤".
- `mb-4` + shell 의 `py-6` → 본문 시작 위치가 아래로 밀림.
- `OperatorAreaShell` 의 외곽은 `flex gap-6` 무분기지만, sidebar 가 모바일에서 `aside`(`hidden`)+`div`(`w-full`)로 분리되어 본문 위에 쌓인다.

---

## 4. 부가 발견 — 모바일 탭의 기능적 한계

모바일 탭은 그룹당 **첫 항목만** 링크한다:
[DomainIASidebar.tsx:334](../../packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx#L334)
```tsx
const firstPath = group.items[0].path;   // 그룹 내 2번째 이후 항목은 모바일에서 접근 불가
```

- 데스크톱은 그룹 collapsible 로 **모든 하위 항목** 노출, 모바일은 **그룹 대표 1개만** 노출 → 다항목 그룹의 하위 메뉴가 모바일에서 **도달 불가**.
- 도메인 헤딩(커뮤니티 운영 / 매장 HUB 운영 / 운영 공통)도 모바일에서 생략 → 구조 파악 어려움.
- operator 는 그룹이 많은 서비스일수록(예: signage/forum/content/lms/resources/users/approvals/analytics/system…) 탭이 길어져 확장성이 없다.

---

## 5. 모바일 / 본문 밀림 / 가로 스크롤 — 항목별 결론

| 확인 항목 | 결과 |
|-----------|------|
| 모바일에서 운영자 메뉴가 상단 가로 탭? | **예** — `md:hidden` 분기가 가로 스크롤 탭 |
| 햄버거 drawer 존재? | **아니오** — operator 영역 미구현 |
| 좌측 사이드바 숨김? | 예 (`hidden md:block`) — 대신 가로 탭으로 대체 |
| 본문 밀림? | 예 — 모바일 탭이 `w-full mb-4` 로 본문 위 점유 |
| 가로 스크롤? | 예 — `overflow-x-auto whitespace-nowrap` |
| 공통 vs 서비스별? | **공통 컴포넌트** (`DomainIASidebar`) |
| 공통 수정 가능? | **예 — 단일 지점 수정으로 4서비스 동시 해결** |

---

## 6. 참고 — 이미 존재하는 drawer 패턴 (재사용 후보)

같은 코드베이스의 **매장 허브** 레이아웃은 이미 모바일 drawer 를 구현해 두었다 — operator 수정 시 패턴 재사용 가능:
- `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx`
  - mobile-only sticky 토글 바(햄버거 + "허브 메뉴")
  - `aside`: mobile fixed drawer(slide-in transform + backdrop) / desktop static
  - 메뉴 클릭 시 drawer 자동 닫힘

즉 O4O 안에 **검증된 모바일 drawer 레퍼런스가 이미 있다.** operator 도 동일 패턴으로 통일하면 일관성↑.

---

## 7. 권장 수정 방향 (의사결정용 — 본 IR 범위 밖, 후속 WO)

| 방향 | 내용 | 적합성 |
|------|------|--------|
| **A. 햄버거 drawer (권장)** | 모바일 가로 탭 제거 → "메뉴" 토글 버튼 + slide-in drawer 안에 **데스크톱과 동일한 세로 구조(도메인 헤딩 + 그룹 collapsible + 하위 항목 전체)** 재노출. PharmacyHubLayout 패턴 재사용. | ★ operator 처럼 메뉴 많고 하위 항목 있는 경우 최적. 하위 항목 도달 가능. 확장성 O |
| B. compact dropdown | 가로 탭 대신 단일 "메뉴 ▾" 드롭다운으로 전체 트리 노출 | △ drawer 대비 공간 제약 |
| C. bottom nav | 주요 4~5개만 하단 고정 nav | △ operator 메뉴 수가 많아 대표 선정 어려움, 나머지 접근성 문제 |

**권장: A (drawer).** 이유 — (1) 하위 항목 도달 불가 문제 동시 해결, (2) 데스크톱 IA(도메인 헤딩/그룹 구조) 모바일에서도 유지, (3) 코드베이스에 검증된 패턴 존재, (4) 공통 컴포넌트 단일 수정으로 4서비스 일괄 적용.

**수정 위치(후속 WO 시):** `DomainIASidebar`(모바일 분기 교체) + 필요 시 `OperatorAreaShell`(모바일 토글 바 슬롯). 서비스 wrapper 변경 불필요(공통).

---

## 8. 이번 작업에서 제외한 항목

- 코드/CSS 수정, drawer 구현 — **전부 본 IR 범위 밖** (후속 WO)
- 아이콘 정비 파일(StoreHub/Channels 등) — 미접촉
- `packages/shared-space-ui/src/HeroBannerSection.tsx` — 미접촉
- 데스크톱 사이드바 동작 — 변경 대상 아님(정상)

---

## 9. 후속 작업 제안

1. **(우선) WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1** — `DomainIASidebar` 모바일 분기를 가로 탭 → 햄버거 drawer 로 교체(방향 A). 공통 컴포넌트 단일 수정 → KPA/Glyco/KCos/Neture(+Admin) 일괄 적용. 4서비스 모바일 smoke.
2. 그 다음 **Neture Phase 4 아이콘 정비** 재개.

> 우선순위 판단: 아이콘은 KPA/Glyco/KCos 까지 정비됐으나, 모바일 operator 레이아웃이 깨져 보이면 전체 UI 품질이 낮아 보인다. Neture 아이콘(Phase 4)보다 operator 모바일 레이아웃을 먼저 잡는 것이 품질상 유리.

---

*조사 방식: read-only grep/glob/read. 코드 변경 없음. 근본 원인 = 공통 `DomainIASidebar` 모바일 가로 탭 분기. 단일 수정으로 4서비스 해결 가능.*
