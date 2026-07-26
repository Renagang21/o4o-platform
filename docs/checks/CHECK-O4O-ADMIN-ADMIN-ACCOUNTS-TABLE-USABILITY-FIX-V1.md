# CHECK-O4O-ADMIN-ADMIN-ACCOUNTS-TABLE-USABILITY-FIX-V1

> WO: `WO-O4O-ADMIN-ADMIN-ACCOUNTS-TABLE-USABILITY-FIX-V1`
> 성격: `/settings/admin-accounts` 목록 usability 결함 복구(체크박스·역할 과밀·행 액션·메뉴 잘림).
> **신규 backend·DB·migration·hard delete 0.** Date: 2026-07-25 · commit `f5d1be433`(1파일) · Deploy Admin success · smoke PASS

## 0. 결론 — ✅ PASS

체크박스 selection 복구 + 역할 배지 축약(+N) + 행 액션 정리(수정/비밀번호/활성토글). 공통 컴포넌트 무수정
(중지 회피, admin local 만). 자기/마지막 super_admin 보호 backend enforce 유지.

## 1. 메뉴 잘림 원인 — 실제로는 공통 RowActionMenu 가 이미 방지

- `RowActionMenu`(packages/ui)는 이미 **viewport-aware `fixed z-[9999]`**: openMenu 가 `spaceBelow < estHeight`면
  트리거 위로 flip(`rect.top - estHeight - 4`) + left 를 viewport 로 clamp(좌측 사이드바 안 가림). → 테이블
  overflow·경계에 잘리지 않음. **공통 미수정**(중지 조건 "공통 RowActionMenu 수정이 타 화면 영향" 회피).
- 실측: 마지막 행 kebab → 메뉴 y=736, bottom=866 < viewport 900 → **잘림 0**.

## 2. selection 미연결 원인 — `_select` 컬럼 누락 (핵심 결함)

- `BaseTable`은 `selectable` 이어도 **header select-all 체크박스만 자동 렌더**(col.key==='_select'일 때). **row
  체크박스는 소비처가 `_select` 컬럼 `render` 로 제공**해야 함(effectiveColumns 자동 주입 없음). 직전 WO 전환 시
  columns 에 `_select` 를 넣지 않아 체크박스 0 → 선택·일괄 불가.
- **수정**: `_select` 시스템 컬럼(system:true, 좌측) 추가 — row 체크박스 render(`selectedKeys.has(id)` +
  toggleRow) + header select-all(BaseTable 자동). → 단일/전체 선택·일괄 작업 연결.

## 3. 수정한 행 액션 (`_actions` system:'last', 우측 고정)

- **수정 (역할 관리)** → `/users/:id/edit`(RBAC Role Assignment 계정 편집) navigate — 역할 변경은 기존 화면 연결.
- **비밀번호 재설정** → 기존 모달(PATCH …/password).
- **활성화/비활성화** → 기존 status API(본인·마지막 super_admin backend 차단).
- 계정 생성·이메일 수정 등 보류 CRUD 는 미포함(직전 WO 설계 보고 유지).

## 4. 역할 표시 방식

- 대표 **2개** 배지 + 나머지 `+N` 축약(과밀 해소). 셀·`+N` 에 `title=전체 역할`(hover 로 전 역할 확인).
  실측: 첫 행(sohae2100) title 에 10개 role 전체. 필터·정렬은 원본 `roles` 배열 기준 유지(축약은 표시만 →
  필터·정렬 계약 무손상, 중지 조건 회피).

## 5. 보호 가드 확인

- 자기 계정 비활성(SELF_LOCK)·마지막 super_admin 비활성(LAST_SUPER_ADMIN)·super_admin 대상 변경 제한
  (SUPER_ADMIN_ONLY) — **backend enforce 유지**(프론트 무변경). 일괄 비활성도 각 건 backend 개별 차단.
- hard delete 없음. 역할 변경은 RBAC 화면 위임.

## 6. 검증

### 정적
- 공통 RowActionMenu/BaseTable **무수정**(admin local 1파일만) · 신규 backend/DB 0 · hard delete 0 ·
  typecheck(admin-dashboard) 0 · build 0.

### 브라우저 smoke (admin.neture.co.kr, sohae2100, viewport 1440×900, client-side nav)
- **header 체크박스 1 · row 체크박스 2 복구** · 전체선택→2 선택 · **선택 후 '적용' 활성 / 선택 0건 시 비활성** ·
  역할 **+N 축약** + title 전체 10 role · **마지막 행 메뉴 viewport 내(잘림 0)** · 메뉴 수정·비밀번호·토글 ·
  console/pageerror 0.

## 7. KPA 외 / 공통

- 변경 = admin-dashboard `AdminAccountsSettings.tsx` 1파일. 공통 `@o4o/ui`(BaseTable/RowActionMenu) 무수정 →
  타 화면·서비스 무영향.

## 8. 커밋

- 코드 `f5d1be433`(AdminAccountsSettings.tsx) · 본 CHECK.
