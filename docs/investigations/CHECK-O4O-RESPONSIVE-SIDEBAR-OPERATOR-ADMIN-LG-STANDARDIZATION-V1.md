# CHECK-O4O-RESPONSIVE-SIDEBAR-OPERATOR-ADMIN-LG-STANDARDIZATION-V1

> **WO**: `WO-O4O-RESPONSIVE-SIDEBAR-OPERATOR-ADMIN-LG-STANDARDIZATION-V1`
> **선행**: `IR-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-AUDIT-V1` · `WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1`
> **목적**: operator/admin 공통 사이드바(`DomainIASidebar`+`OperatorAreaShell`)의 반응형 기준을 **md(768) → lg(1024)** 로 정렬. <1024 drawer / >=1024 고정 사이드바. 메뉴 계층 토큰 최소 정리.
> **작성일**: 2026-06-17
> **상태**: 코드 완료 · 4개 앱 build PASS · browser smoke 배포 후 대기
> **분류**: **공통 컴포넌트 변경 (Shared Module Change Protocol 적용)**

---

## 1. 결론 요약

- 공통 사이드바 2개 파일만 변경 → **5개 소비 surface 전부 일괄 적용** (KPA operator / GP operator / KCos operator / Neture operator / Neture admin).
- breakpoint **md→lg**: tablet(768~1023) 구간도 이제 drawer (IR 확정 표준 = Desktop ≥1024).
- ESC close **추가**(기존 X버튼+backdrop만 있었음). 메뉴 계층 토큰(group weight 600, child 13px·pl-14) 정리.
- **frontend-only**. route/권한/menu visibility/메뉴명/backend/DB/package 변경 없음. store/store-hub/supplier/GP·KCos DashboardLayout **미변경**.

---

## 2. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` | breakpoint md→lg(4곳) + ESC close + 메뉴 계층 토큰 |
| `packages/operator-ux-core/src/layout/OperatorAreaShell.tsx` | flex `md:flex-row md:gap-6` → `lg:flex-row lg:gap-6` |

> 두 파일은 **소스로 소비**(operator-ux-core 에 build 스크립트 없음) → 별도 패키지 빌드 불필요, 소비 앱이 직접 컴파일.

### 소비처(영향 범위) — 전부 OperatorAreaShell 경유
```
KpaOperatorLayoutWrapper       (KPA /operator)
GlycoPharm OperatorLayoutWrapper (GP /operator)
KCos OperatorLayoutWrapper      (KCos /operator)
Neture OperatorLayoutWrapper    (Neture /operator)
Neture AdminLayoutWrapper       (Neture /admin)
```
`DomainIASidebar` 직접 import = `OperatorAreaShell` 뿐(grep 확인) → standalone 소비처 없음.

---

## 3. md → lg 변경 지점 요약

| 위치 | before | after |
|------|--------|-------|
| desktop sidebar `<aside>` | `hidden md:block` | `hidden lg:block` |
| 햄버거 토글 바 | `md:hidden mb-4` | `lg:hidden mb-4` |
| drawer backdrop | `md:hidden fixed inset-0 ...` | `lg:hidden fixed inset-0 ...` |
| drawer `<aside>` | `md:hidden fixed left-0 ...` | `lg:hidden fixed left-0 ...` |
| shell flex 방향 | `flex-col md:flex-row md:gap-6` | `flex-col lg:flex-row lg:gap-6` |

- 동작: **<1024px** = 사이드바 숨김 + 햄버거 → drawer(slide-in `-translate-x-full`↔`translate-x-0`) + overlay. **>=1024px** = 좌측 고정 사이드바(`sticky top-20`) + 본문 `flex-1 min-w-0`(겹침/가로스크롤 없음).
- shell flex 를 함께 lg 로 옮긴 이유: md 로 두면 768~1023 에서 row 로 펼쳐지며 토글 바가 본문 옆에 배치되는 모순 발생 → 사이드바와 동일 lg 로 정합.

### close 트리거 (표준 3종)
```
overlay click  : 기존 ✓
메뉴(Link) 선택 : 기존 ✓ (renderNav onNavigate=closeMobile)
ESC            : 본 WO 추가 ✓ (useEffect keydown, open 시에만 리스너)
+ drawer 내 X 버튼 : 기존 ✓
```

---

## 4. 적용한 메뉴 계층 토큰 요약

| 레벨 | 항목 | before | after | 표준 |
|------|------|--------|-------|------|
| top-level(single-item Link) | font/weight/height | `text-sm`(14) `font-medium`(500) `py-3`(~44) | 변경 없음 | 14 / 500 / 42~44 ✓ |
| group(multi-item button) | weight | `font-medium`(500) | **`font-semibold`(600)** | 600 ✓ (chevron right ✓) |
| child(Link) | font / padding | `text-sm`(14) `pl-11`(44) `py-2` | **`text-[13px]` `pl-14`(56)** | 13 / pl 52~56 / 34~36 ✓ |
| child active | 상태 | `text-blue-600 bg-blue-50 font-medium`(500) | 변경 없음 | primary+light bg+500 ✓ |

> child `pl-14`(56px) 는 desktop/drawer 공유(단일 renderNav). domain heading `text-[11px] uppercase`(기존) 유지.

---

## 5. 서비스별 검증 결과 (build)

| 앱 | 결과 |
|----|------|
| `@o4o/web-kpa-society` | ✅ ✓ built 17.0s (exit 0) |
| `glycopharm-web` | ✅ ✓ built 21.7s (exit 0) |
| `@o4o/web-k-cosmetics` | ✅ ✓ built 12.5s (exit 0) |
| `@o4o/web-neture` | ✅ ✓ built 12.6s (exit 0) |

- 공통 컴포넌트 변경이 4개 앱(5개 surface)에서 컴파일 정상 → 회귀 표면(타입/빌드) 0.
- route/active 판단/권한/menu visibility 로직 미변경(클래스·breakpoint·토큰만).

### browser smoke 체크리스트 (배포 후 — 미배포)
```
viewport 375 / 768 / 1023 / 1024 / wide 에서:
- KPA /operator , GP /operator , KCos /operator , Neture /admin(+/operator)
- <1024: 햄버거 표시 · 사이드바 숨김 · drawer open
- drawer close: overlay click / ESC / 메뉴선택 / X 버튼
- >=1024: 사이드바 고정 표시 · 본문 미가림
- active 메뉴 표시 · child 글자(13px)/들여쓰기(pl-14) · horizontal scroll 0 · console error 0 · route broken 0
- 1023↔1024 경계 전환 정상
```

---

## 6. Shared Module Change Protocol 기록

- **변경 모듈**: operator/admin 공통 sidebar(`DomainIASidebar`) + layout shell(`OperatorAreaShell`).
- **소비처 전수 식별**: grep 결과 코드 소비처 = 5개 wrapper(전부 OperatorAreaShell 경유) + barrel index. standalone 소비처 없음.
- **회귀 검증**: 4개 앱(KPA/GP/KCos/Neture) build PASS. 노출 결과(route/visibility) 불변 — 스타일·breakpoint·토큰만 변경.
- **임시 예외 없음**: 서비스별 분기 추가 없이 공통 컴포넌트 단일 변경.

---

## 7. Known Limitation / 후속 WO

```
- browser/visual smoke 배포 후 필요 (1023↔1024 경계, drawer 동작, child 토큰).
- 본 WO 범위 밖(후속 별도 WO):
  · GP/KCos admin DashboardLayout (별도 컴포넌트, md→lg 미적용 + lg:ml-64 본문 margin 제거)
  · KPA admin AdminSidebar (별도 컴포넌트, md 기준)
  · store / store-hub / supplier (P0 에서 store-hub·supplier 만 lg drawer 적용 완료, store 는 lg 기준이나 별도 StoreSidebar)
  → 사이드바 6종 중 본 WO 는 #1(DomainIASidebar) 만 lg 표준화. 나머지(#2 DashboardLayout, #3 KPA AdminSidebar)는 후속.
```

---

## 8. commit

```
WO-O4O-RESPONSIVE-SIDEBAR-OPERATOR-ADMIN-LG-STANDARDIZATION-V1 커밋 (이 CHECK 포함). hash 는 git log 참조.
```

---

*frontend-only. 공통 sidebar md→lg + ESC + 계층 토큰(group 600 / child 13px·pl-14). 5개 surface 일괄. 4개 앱 build PASS. browser smoke 배포 후.*
