# CHECK-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1

> `WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1` 적용 결과 고정.

- **작성일**: 2026-06-04
- **WO**: [`WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1`](../work-orders/WO-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1.md) (방향 A: hamburger drawer)
- **선행 IR**: [`IR-O4O-OPERATOR-MOBILE-NAV-LAYOUT-AUDIT-V1`](IR-O4O-OPERATOR-MOBILE-NAV-LAYOUT-AUDIT-V1.md) (`49c825d06`)

---

## 1. 최종 판정

**PASS (정적 검증).** 공통 `DomainIASidebar`의 모바일 가로 스크롤 탭을 햄버거 drawer로 교체. 데스크톱 세로 nav를 `renderNav()` 헬퍼로 추출해 **데스크톱 `<aside>`와 모바일 drawer가 동일 트리를 재사용** → "모바일에서 하위 항목 도달 불가" 결함 구조적 해소. operator-ux-core + KPA + Neture `tsc --noEmit` exit 0. 라이브 smoke는 배포 후(§6).

---

## 2. 근본 원인 / 수정 요약

- **원인**: `DomainIASidebar`의 `md:hidden` 분기가 `flex overflow-x-auto whitespace-nowrap` 가로 탭으로 렌더 + `group.items[0].path`만 링크.
- **수정**:
  1. 데스크톱 nav 트리(top-pinned + 도메인 헤딩 + 그룹 collapsible + 하위 항목 전체)를 **`renderNav(onNavigate?)` 내부 헬퍼로 추출**.
  2. 데스크톱 `<aside hidden md:block>` → `<nav>{renderNav()}</nav>` (마크업·동작 동일).
  3. 모바일 가로 탭 제거 → **햄버거 토글 바**(`md:hidden`) + **slide-in drawer**(`fixed ... translate-x` + backdrop + close 버튼) 내부에 `{renderNav(closeMobile)}` (동일 트리).
  4. 항목 클릭 시 `onNavigate=closeMobile`로 drawer 자동 닫힘. backdrop/close 버튼으로도 닫힘.
  5. `OperatorAreaShell`: 컨테이너 `flex gap-6` → `flex flex-col md:flex-row md:gap-6` (모바일은 토글 바가 본문 위에 쌓이고, 데스크톱은 기존 row+gap 동일).

---

## 3. 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` | `renderNav()` 추출, 모바일 가로 탭 → 햄버거 drawer, `Menu`/`X` import, `mobileOpen` state, `flatGroupsForMobile` 제거 |
| `packages/operator-ux-core/src/layout/OperatorAreaShell.tsx` | 컨테이너 flex `flex-col md:flex-row md:gap-6` (모바일 stacking) |

> 서비스 wrapper(KPA/Glyco/KCos/Neture) **미수정** — 공통 컴포넌트만으로 4서비스 + Neture Admin 일괄 적용.

---

## 4. 변경하지 않은 항목

- **데스크톱 sidebar** — 마크업/동작 동일(동일 트리 재사용, `onClick={undefined}`는 무동작). 시각·동작 무변화.
- domain IA 메타데이터(`operatorDomainIA`) / `STANDARD_GROUPS` — 미변경
- 메뉴 순서 / 라우트 / 권한 / capability 필터 / API — 불변
- collapsible 로직(`openGroups`/`toggleGroup`), active 판정(`isItemActive`/`isGroupActive`), `resolvedTopGroups`/`resolvedDomains` — 그대로 공유
- Store Hub/Channels 아이콘 파일, `HeroBannerSection.tsx` — 미접촉

---

## 5. TypeScript 결과

```bash
packages/operator-ux-core  npx tsc --noEmit   # exit 0
services/web-kpa-society    npx tsc --noEmit   # exit 0 (consumer 회귀 없음)
services/web-neture         npx tsc --noEmit   # exit 0 (consumer 회귀 없음, Admin 포함 경로)
```

---

## 6. desktop/mobile smoke 결과

- **정적/타입 검증 PASS.**
- **라이브 브라우저 smoke: 미수행 (배포 후로 이연).** operator 라우트는 인증 게이트 + 미배포. 기존 테스트 계정 smoke blocker.
- **배포 후 확인 권장 (4서비스 + Neture Admin, 모두 공통 컴포넌트 → 일괄):**
  ```text
  desktop(md+): 좌측 세로 sidebar 동일 유지(회귀 없음)
  mobile(390px):
    - 가로 스크롤 탭 제거 확인
    - "운영자 메뉴" 햄버거 → drawer slide-in
    - drawer 내 도메인 헤딩 + 그룹 collapsible + 하위 항목 전체 접근 가능
    - active 상태 정상 / 메뉴 클릭 시 drawer 자동 닫힘 + 라우팅
    - backdrop·X 버튼으로 닫힘
    - 본문 밀림/가로 스크롤 없음
  대상: KPA /operator · GlycoPharm /operator · K-Cosmetics /operator · Neture /operator · Neture /admin
  ```

---

## 7. staged 파일 검증

`git diff --cached --name-only` (3파일):
```text
packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx
packages/operator-ux-core/src/layout/OperatorAreaShell.tsx
docs/investigations/CHECK-O4O-OPERATOR-MOBILE-NAV-DRAWER-V1.md
```
`HeroBannerSection.tsx` / 서비스 wrapper / 아이콘 파일 staged 아님 확인.

---

## 8. 남은 후속

- **Neture Phase 4 아이콘 정비** (Home / 역할 카드 / Market Trial CTA `FlaskConical`).
- 아이콘 Phase 5~7 (Operator/Admin Quick Actions / LMS lesson type / shared emoji fallback 제거).

---

*공통 `DomainIASidebar` 단일 수정으로 4서비스 + Neture Admin 모바일 operator nav 일괄 개선. 데스크톱 무변화. 배포 후 일괄 smoke 예정.*
