# CHECK-O4O-KPA-ADMIN-SIDEBAR-LG-STANDARDIZATION-V1

> **WO**: `WO-O4O-KPA-ADMIN-SIDEBAR-LG-STANDARDIZATION-V1`
> **선행**: IR responsive sidebar audit · P0 drawer · operator/admin 공통 lg · GP/KCos admin flex · 누적 smoke PASS
> **목적**: KPA admin `AdminSidebar`/`AdminLayout` 의 반응형 breakpoint 를 O4O 표준 **md(768) → lg(1024)** 로 정렬. <1024 drawer / >=1024 고정 사이드바.
> **작성일**: 2026-06-17
> **상태**: 완료 · KPA build PASS · **browser smoke PASS (배포 후 실측 — §6)**
> **분류**: frontend-only, KPA admin 한정(공통 컴포넌트 아님)

---

## 1. 결론 요약

- KPA admin sidebar 2개 파일(`AdminLayout`/`AdminSidebar`)의 md 기준 5곳을 **lg 로 정렬**. 사이드바 6종 중 마지막 독립 admin 사이드바(#3).
- 메뉴 계층 토큰을 #1(DomainIASidebar) 표준에 **최소 정렬**(group 600, child 13px/pl-14).
- **frontend-only**, route/권한/menu visibility/메뉴명/backend/DB/package 변경 없음.
- 구조 패턴(fixed sidebar + `lg:ml-[260px]` 본문 margin)은 유지 — GP/KCos 의 flex-sibling 전환(#2)과 달리 본 WO 는 **breakpoint 정렬만**(WO 범위). margin 은 lg 에서만 적용되어 겹침 없음.

---

## 2. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/components/admin/AdminLayout.tsx` | 토글 바 `md:hidden`→`lg:hidden`, 본문 `md:ml-[260px]`→`lg:ml-[260px]` |
| `services/web-kpa-society/src/components/admin/AdminSidebar.tsx` | backdrop `md:hidden`→`lg:hidden`, aside `md:translate-x-0`→`lg:translate-x-0`(2곳) + 메뉴 토큰 |

---

## 3. md → lg 변경 지점 요약

| 파일 | 위치 | before | after |
|------|------|--------|-------|
| AdminLayout | 토글 바 | `md:hidden sticky top-16` | `lg:hidden sticky top-16` |
| AdminLayout | 본문 main | `flex-1 md:ml-[260px]` | `flex-1 lg:ml-[260px]` |
| AdminSidebar | drawer backdrop | `md:hidden fixed inset-x-0 …` | `lg:hidden fixed inset-x-0 …` |
| AdminSidebar | aside transform(base) | `… md:translate-x-0` | `… lg:translate-x-0` |
| AdminSidebar | aside transform(closed) | `-translate-x-full md:translate-x-0` | `-translate-x-full lg:translate-x-0` |

- **<1024px**: aside `fixed` off-canvas(`-translate-x-full`), 햄버거 토글 바(`lg:hidden`) 표시, 본문 margin 없음(full-width). backdrop 표시 시 drawer.
- **>=1024px**: aside `lg:translate-x-0`(고정 표시), 본문 `lg:ml-[260px]`(사이드바 폭 260px 만큼 offset → 겹침 없음).

---

## 4. KPA admin layout 구조 요약

```
AdminLayout (min-h-screen flex flex-col)
  ├─ KpaGlobalHeader (sticky top-0 z-50, 64px)
  ├─ 토글 바 (lg:hidden sticky top-16) — 햄버거 "메뉴"
  └─ div.flex.flex-1
       ├─ AdminSidebar (fixed left-0 top-16 w-[260px], <lg drawer / >=lg 고정)
       │    backdrop(lg:hidden) + aside(collapsible groups: Overview / 운영 기능 / 설정)
       └─ main (flex-1 lg:ml-[260px])  ← Outlet
```

- 메뉴: Overview(관리자 홈) / 운영 기능(회원 관리) / 설정(문의 설정·법정정보 설정) — **무변경**.
- 닫힘 트리거: backdrop click(`onMobileClose`), 메뉴 선택(`handleNavigate`→`onMobileClose`). **ESC 미적용** — GP/KCos admin DashboardLayout 과 동일(admin layout 일관성 유지, scope 밖).

---

## 5. 메뉴 계층 토큰 정렬 (최소)

| 레벨 | before | after | 표준(#1) |
|------|--------|-------|----------|
| top-level(single Link) | `px-5 py-3 text-sm font-medium` | 변경 없음 | 14/500 ✓ |
| group(multi button) | `text-sm font-medium`(500) | **`font-semibold`(600)** | 600 ✓ |
| child(Link) | `pl-12 text-sm`(48/14) | **`pl-14 text-[13px]`**(56/13) | pl 52~56 / 13 ✓ |

> KPA admin 메뉴는 소규모(설정만 multi-item) — 토큰 영향 최소. DomainIASidebar 와 시각 일관성 확보.

---

## 6. 검증 결과

| 항목 | 결과 |
|------|------|
| KPA build (`@o4o/web-kpa-society`) | ✅ ✓ built 15.6s (exit 0) |
| route/active/권한/menu visibility | ✅ 무변경 |
| 공통 DomainIASidebar/OperatorAreaShell, GP/KCos DashboardLayout, store/store-hub/supplier | ✅ 미변경 |
| backend/DB/package/lock | ✅ 변경 0 |

### browser smoke (배포 후 — **수행 완료, PASS**)
운영 배포(web deploy success) 후 Playwright 실측 (`kpa-society.co.kr/admin`, sohae2100 admin):

| viewport | #admin-sidebar | main | h-scroll | 판정 |
|---------:|----------------|------|:--------:|:----:|
| 1023 | **fixed, left -260 off-canvas** | left 0, **marginLeft 0px** | false | PASS |
| drawer open(1023) | left 0, backdrop 표시 | — | false | PASS |
| backdrop click | left -260 close, backdrop 제거 | — | — | PASS |
| 1024 | **fixed, translateX(0), left 0, w 260 (표시)** | left **260, marginLeft 260px** (겹침 없음: aside.right 260 ≤ main.left 260) | false | PASS |
| 햄버거(1024) | 숨김 | — | — | PASS |

- md→lg 검증: 1023(<lg) 사이드바 off-canvas + 본문 margin 0 / 1024(>=lg) 사이드바 고정 + 본문 ml-260. 경계 전환 정상.
- console error: 사이드바 무관한 법정문서 미게시 404(policies/legal `published/terms·privacy`)만 — **데이터 상태, 본 변경 무관**. 사이드바 관련 error 0.
- route broken 0, active menu 정상.

> 동일 패턴(fixed+margin, lg)은 GP/KCos admin 누적 smoke 와도 정합.

---

## 7. Known Limitation / 후속

```
- browser smoke 배포 후 수행(코드/build 기준 통과).
- 본 WO 는 breakpoint 정렬만 — fixed+margin 구조 유지(GP/KCos 처럼 flex-sibling 전환은 별도 결정 사항, 본 WO 범위 밖).
  · lg:ml-[260px] 는 lg 에서만 적용되어 겹침 없음(margin 잔재는 <lg 에서 발생 안 함).
- ESC 미적용(admin layout 일관성). operator/store-hub/supplier 와의 ESC 정합은 후속 공통화 시 일괄 판단.
- 남은 표준화: #4 store StoreSidebar 토큰 정렬(이미 lg 기준 → 토큰 중심).
→ 사이드바 6종 중 #1·#2·#3·#5·#6 lg 정렬 완료. #4 만 잔여.
```

---

## 8. commit

```
WO-O4O-KPA-ADMIN-SIDEBAR-LG-STANDARDIZATION-V1 커밋 (이 CHECK 포함). hash 는 git log 참조.
```

---

*frontend-only. KPA admin AdminSidebar/AdminLayout md→lg(5곳) + 메뉴 토큰 최소 정렬. fixed+margin 구조 유지(lg). KPA build PASS. browser smoke 배포 후.*
