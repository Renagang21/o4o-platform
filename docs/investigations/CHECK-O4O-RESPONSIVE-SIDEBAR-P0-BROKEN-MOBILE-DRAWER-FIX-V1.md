# CHECK-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1

> **WO**: `WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1`
> **선행 IR**: `IR-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-AUDIT-V1`
> **목적**: 모바일/태블릿에서 실제로 깨지는 왼쪽 사이드바 영역(store-hub GP·KCos / Neture supplier)을 우선 정상화. 전체 표준화는 후속 WO.
> **작성일**: 2026-06-17
> **상태**: 코드 완료 · 3개 서비스 build PASS · browser smoke 배포 후 대기

---

## 1. 결론 요약

- P0 대상 3개 layout 에 **<1024px(lg) drawer** 패턴 적용 (hamburger + overlay + 자동 close + ESC). desktop(>=lg)은 기존 동작 유지.
- **frontend-only**, route/권한/메뉴명/backend/DB/package 변경 없음.
- breakpoint 는 IR 확정 표준대로 **lg(1024)** 로 적용 → 후속 표준화 WO 에서 재수정 불필요.

---

## 2. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/components/layouts/GlycoPharmHubLayout.tsx` | store-hub sidebar → lg drawer |
| `services/web-k-cosmetics/src/components/layouts/KCosmeticsHubLayout.tsx` | store-hub sidebar → lg drawer |
| `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | supplier 사이드바 → lg drawer (nav 헬퍼 추출, group-level 수평탭 대체) |

---

## 3. 적용한 drawer 패턴 요약

참고: KPA `PharmacyHubLayout` + `DomainIASidebar`/`OperatorAreaShell` 패턴.

### 공통 동작
```
- mobileOpen state + closeMobile()
- <lg: hamburger 버튼('lg:hidden') → setMobileOpen(true)
- backdrop: 'lg:hidden fixed inset-x-0 top-16 bottom-0 bg-black/40 z-30', click → close
- drawer aside: 'fixed left-0 top-16 bottom-0 z-40 w-72 max-w-[85%] transition-transform
                 translate-x-0 / -translate-x-full'
- 메뉴(Link) 선택 시 onClick=closeMobile → 자동 닫힘 (그룹 토글은 닫지 않음)
- ESC keydown → close (useEffect, open 시에만 리스너 등록)
- aria-label / aria-expanded / aria-controls 부여
```

### 영역별 차이
| 영역 | desktop(>=lg) | <lg | 비고 |
|------|---------------|-----|------|
| GP/KCos store-hub | `lg:sticky lg:top-20 lg:w-52` (기존 sticky 유지) | drawer w-72 | 동일 aside 가 mobile=fixed drawer / desktop=sticky 로 전환 (lg:* 오버라이드) |
| Neture supplier | `hidden lg:block w-60` 사이드바(sticky top-20) | 별도 drawer aside | nav 를 `renderNav(onNavigate?)` 헬퍼로 추출 → desktop/ drawer 재사용. **기존 group-level 수평탭(중첩 메뉴 도달 불가) 제거** → drawer 는 중첩 항목 포함 전체 메뉴 노출(접근성 개선) |

> GP/KCos: `-translate-x-full` 기본 + `lg:translate-x-0`(미디어쿼리 우선) 으로 desktop 항상 표시. 본문 `flex-1 min-w-0` — 고정 margin 없음 → 모바일 본문 가림/가로스크롤 없음.

---

## 4. 검증 결과

| 항목 | 결과 |
|------|------|
| GP typecheck (`tsc -p tsconfig.app.json`) | ✅ PASS (에러 0) |
| KCos build | ✅ ✓ built 33.7s (exit 0) |
| Neture build | ✅ ✓ built 11.8s (exit 0) |
| route/권한/메뉴명 변경 | ✅ 없음 (구조만) |
| backend/DB/package/lock 변경 | ✅ 없음 |
| 미사용 import | ✅ 없음 (`Menu` 추가, `useEffect` 추가 사용) |

### 코드 레벨 반응형 보장 근거
- `<lg` = drawer 기본 숨김(`-translate-x-full`), hamburger 로 open, overlay/ESC/메뉴선택 close.
- `>=lg` = 사이드바 항상 표시(`lg:translate-x-0` / `lg:block`), 기존 sticky.
- 본문 `flex-1 min-w-0` — 모바일에서 사이드바가 fixed(out-of-flow)이므로 본문 압박/가로스크롤 없음.

### browser smoke 체크리스트 (배포 후 — 미배포라 보류)
```
375px / 768px / 1024px 경계:
- GP /store-hub , /store-hub/content : <1024 hamburger→drawer open, 메뉴선택 close, >=1024 사이드바 고정
- KCos /store-hub , /store-hub/content : 동일
- Neture /supplier , /supplier/products(또는 /onboarding) : drawer 에 중첩 메뉴(제품 목록/등록/대량등록 등) 노출·도달
- overlay click / ESC / 메뉴선택 시 drawer close
- console error 0 / horizontal scroll 0 / route broken 0 / 본문 가림 0
```

---

## 5. 이번 WO 범위 밖 (후속 표준화 WO)

```
- breakpoint lg 전면 통일 (DomainIASidebar/OperatorAreaShell md→lg 등 공통 컴포넌트)
- 메뉴 계층 토큰(top/group/child font·weight·padding) 통일
- GP/KCos admin DashboardLayout lg:ml-64 본문 margin 제거 + 복제본 공통화
- KPA PharmacyHubLayout(md) 의 lg 정렬
→ WO-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARDIZATION-V1
```

본 P0 는 "깨진 화면 정상화"에 한정 — 과도한 공통 리팩터링은 하지 않음(WO 원칙 §9).

---

## 6. commit

```
WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1 커밋 (이 CHECK 포함). hash 는 git log 참조.
```

---

*frontend-only. lg(1024) drawer 적용. 3개 서비스 build PASS. browser smoke 는 배포 후.*
