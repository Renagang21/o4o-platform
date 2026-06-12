# CHECK-O4O-FORUM-LIST-PAGINATION-UNIFY-V1

> **작업명:** WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1
> **유형:** forum list page pagination 공통화 — 기존 `HubPagination` opt-in 확장 + 4서비스 repoint
> **결과: PASS — HubPagination 에 backward-compatible opt-in(showFirstLast/accentColor/align/bordered) 추가, 4서비스 forum list inline pagination 제거·repoint. 기존 5개 HUB 소비처 무회귀.**
> 선행: `WO-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1`(formatForumDate) · `IR-O4O-FORUM-USER-PAGE-COMMONIZATION-PLAN-V1` — 2026-06-12

---

## 1. 목적

4서비스 forum list page 의 중복 pagination JSX 를 기존 공통 `HubPagination` 으로 통일. 데이터 shape 정규화·list template·검색/필터·route 변경은 범위 밖.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `5cbc402ce`(시작) · origin 동기화(0/0) · staged 없음 |

다른 세션 WIP(미접촉): api-server `register-routes.ts`/`connection.ts` M, CHECK 문서 다수 M. path-specific 으로 대상만 커밋.

## 3. HubPagination 확장 (backward-compatible)

`packages/shared-space-ui/src/HubPagination.tsx` 에 **opt-in props 추가**(기본값 = 기존 동작):

| prop | 기본값 | 동작 |
|------|:---:|------|
| `showFirstLast?: boolean` | `false` | `«`(처음)/`»`(마지막) 버튼 추가 표시 |
| `accentColor?: string` | `undefined`(→#2563EB) | 현재 페이지 강조색(CSS color, 예 `var(--color-primary)`) |
| `align?: 'between'\|'center'` | `'between'` | 정렬(HUB 푸터=between / forum=center) |
| `bordered?: boolean` | `true` | 상단 구분선 표시 |

- 내부 `PgButton` 에 `accentColor`/`ariaLabel` 전달. active 시 accentColor 있으면 그 색, 없으면 기존 `st.btnActive`(#2563EB).
- `buildPageNumbers`(5개 window) 로직 무변경.
- **기존 5개 HUB 소비처**(ContentHub/LmsHub/ResourcesHub/SignageHub/SignageManager)는 신규 props 미전달 → showFirstLast=false·accentColor=blue·align=between·bordered=true = **이전과 100% 동일**(grep 으로 미전달 확인).

## 4. 4서비스 forum list repoint

각 list page 의 inline pagination JSX(`«` `‹` 번호 `›` `»` + goToPage) 제거 후 공통 컴포넌트 사용:
```tsx
<HubPagination
  currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage}
  showFirstLast showPageInfo={false} align="center" bordered={false}
  accentColor={<서비스 강조색>}
/>
```
- 로컬 `pageNumbers` useMemo 제거(HubPagination 내부 계산), 미사용 `useMemo` import 정리(KCos/Neture).
- `goToPage`/page state/query param 로직 **무변경**.

| 서비스 | 파일 | accentColor | 기존 강조색 |
|--------|------|-------------|-------------|
| KPA | `pages/forum/ForumListPage.tsx` | `var(--color-primary)` | `bg-primary`(#2563eb 블루) |
| GlycoPharm | `pages/forum/ForumPage.tsx` | `var(--color-primary)` | `bg-primary-600`(#16a34a 그린) |
| K-Cosmetics | `pages/forum/ForumPage.tsx` | `var(--color-primary)` | `bg-primary`(#db2777 핑크) |
| Neture | `pages/forum/ForumPage.tsx` | `PRIMARY`(#2563EB) | inline `#2563EB` 블루 |

- KPA/GP/KCos 는 `var(--color-primary)` 로 **서비스 CSS 변수 그대로 바인딩**(기존 active 색 보존). Neture 는 기존 inline 상수(#2563EB) 그대로.
- first/last(`«` `»`) 기능 **4서비스 유지**(showFirstLast). 5-page window 유지.

## 5. 잔여 시각 델타(기록)

- 버튼 크기: forum 기존 36px(h-9) → HubPagination 32px. **약간 작아짐**(HUB pagination 표준과 동일 — forum HUB 페이지가 이미 HubPagination 사용하므로 list↔hub 일관성 ↑).
- 레이아웃: `align='center'`+`bordered=false`+`showPageInfo=false` 로 **기존 centered·borderless·페이지정보 없음 유지**.
- 강조색: accentColor 로 서비스별 보존(§4).
- → 핵심 동작/색/정렬 보존, 버튼 크기만 32px 표준화.

## 6. 검증

- **TypeScript:** shared-space-ui · web-kpa-society · web-glycopharm · web-k-cosmetics · web-neture **각각 0 errors** ✅.
- **정적:**
  - 4서비스 inline pagination(`&laquo`/`pageNumbers.map`/`s.pageBtn`) 잔재 **0** 확인.
  - 4서비스 `HubPagination` + `showFirstLast` 사용 확인.
  - 기존 5개 HUB 소비처 신규 props 미전달(default 동작 유지) 확인.
  - Neture orphan `pageBtn`/`pageBtnActive`/`pageBtnDisabled` 스타일 props 정리.
- **browser smoke:** **미수행** — dev 서버 미기동 + 인증/서비스 guard(프로덕션). §5 잔여 시각 델타(버튼 32px)는 browser 확인 권장 → 배포 후 또는 후속 smoke. 동작/색/정렬은 정적+typecheck 로 보존 확인.
- **무변경:** backend/API/DB/migration/route/menu ✅ · list data shape ✅ · 검색/필터/page state/query param ✅ · Forum Hub/Detail/Write/Request ✅.

## 7. 완료 판정

**PASS.** HubPagination 을 backward-compatible opt-in(showFirstLast/accentColor/align/bordered)으로 확장하고 4서비스 forum list pagination 을 repoint. first/last·5-page window·서비스 강조색·centered/borderless 레이아웃 보존, 버튼 크기만 32px 표준화. 기존 5개 HUB 소비처 무회귀(default 동작). typecheck(5) 통과. 잔여 시각 델타(버튼 크기)는 browser smoke 권장.

## 8. 후속

- (선택) browser smoke 1서비스 — 버튼 크기/정렬 렌더 확인(배포 후).
- `IR/WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1` — `ForumPost` vs `DisplayPost` 정렬(다음 primitive/template 선행).
- `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1` — list template(상태 포함) 공통화.

---

*Date: 2026-06-12 · WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1 · HubPagination opt-in 확장 + 4서비스 repoint PASS. 기존 HUB 무회귀. 버튼 크기 델타는 후속 smoke 권장.*
