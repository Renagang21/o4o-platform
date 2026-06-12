# CHECK-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1

> **작업명:** WO-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1
> **유형:** forum 사용자-facing list page 공통화 — 작고 안전한 중복 제거(primitives 추출)
> **결과: PASS — `formatDate` 4서비스 중복(byte-identical) → 공통 `formatForumDate` 단일화. pagination 은 시각 변경 동반이라 별도 후속으로 분리(판정 기록).**
> 선행: `IR-O4O-FORUM-USER-PAGE-COMMONIZATION-PLAN-V1`(§17 후속 2) · `WO-O4O-FORUM-USER-REQUEST-FORM-COMMONIZATION-V1` — 2026-06-12

---

## 1. 목적

forum list page 의 작은 중복(pagination/formatDate/상태)을 위험 없이 제거. 데이터 shape 정규화·list template 추출은 범위 밖(후속).

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `053088308`(시작) · origin 동기화(0/0) · staged 없음 |

다른 세션 WIP(미접촉): `apps/api-server/src/bootstrap/register-routes.ts` M, `connection.ts` M, CHECK-...-ORDER-VIEW-LOOP M, untracked 다수. path-specific 으로 대상만 커밋.

## 3. 조사 — 중복 항목별 판정

| 항목 | 4서비스 현황 | 판정 |
|------|--------------|------|
| **`formatDate`** | KPA(ForumListPage:33) / GP(ForumPage:52) / KCos(:53) / Neture(:54) — **byte-identical**(7일↑ 절대날짜, 이하 상대시간) | ✅ **추출**(zero 시각 변경) |
| **pagination** | 4서비스 자체 JSX. GP/KCos/Neture = `«`(first) `‹`(prev) [번호×5] `›`(next) `»`(last), Tailwind/서비스 테마색. `buildPageNumbers` 알고리즘은 기존 `HubPagination` 과 동일 | ⚠️ **후속 분리**(§5) |
| loading/empty/error 상태 | 서비스별 상이(KPA BaseTable / GP·KCos Tailwind skeleton / Neture inline). 구조·스타일 편차 | ⚠️ 추출 가치 낮음·후속(§5) |

## 4. 적용한 변경 — formatDate 공통화

- 신규 공통 유틸: `packages/shared-space-ui/src/formatForumDate.ts` (`formatForumDate(dateString)`), index.ts export.
  - shared-space-ui 는 `exports → ./src/index.ts`(소스 직접) 라 빌드 불요. 4서비스 모두 이미 `@o4o/shared-space-ui` 의존(HubPage).
  - 동작은 기존 `formatDate` 와 **완전 동일**(7일↑ `toLocaleDateString('ko-KR')`, N일/시간/분 전, 방금 전).
- 4서비스 list page: local `function formatDate` 제거 + `import { formatForumDate as formatDate } from '@o4o/shared-space-ui'` (alias 로 호출부 무변경).
  - KPA `pages/forum/ForumListPage.tsx` · GP/KCos/Neture `pages/forum/ForumPage.tsx`.
- **시각/동작 변경 0** (동일 로직, 호출부 동일). 순수 중복 제거.

## 5. pagination — 후속 분리 사유(판정)

기존 `HubPagination`(@o4o/shared-space-ui, Content/Resources/LMS/Signage HUB 공유)이 있으나 forum list 의 **1:1 drop-in 이 아니다**:
1. **first/last(`«` `»`) 버튼 부재** — HubPagination 은 `‹` prev + 번호 + `›` next 만. forum list 는 first/last 포함 → 단순 repoint 시 **기능(UX) 축소**.
2. **스타일 상이** — HubPagination 은 inline-style 고정 파랑(#2563EB). forum list 는 Tailwind + 서비스 테마색 → repoint 시 **시각 변경**(GP primary/KCos pink/Neture emerald 손실).
- 두 변경 모두 **browser 검증이 필요한 시각/UX 변경**이라 "작고 안전" 범위 밖. → **후속 WO** 로 분리:
  - `WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1`(후보) — HubPagination 에 opt-in `showFirstLast`(+선택적 accent) 추가(기존 HUB 소비처 기본값 무변경) 후 forum list 4서비스 repoint + browser smoke.
- loading/empty/error 상태도 서비스별 구조·스타일 편차로 추출 가치 낮음 → list template(후속 §17-3 of plan IR) 과 함께 다룸.

## 6. 검증

- **TypeScript:** shared-space-ui · web-kpa-society · web-glycopharm · web-k-cosmetics · web-neture **각각 0 errors** ✅.
- **정적:** 4서비스 local `formatDate` 정의 0(전부 제거) · `formatForumDate as formatDate` import 4서비스 확인 · 호출부 `formatDate(...)` 무변경 · 동작 동일.
- **browser smoke:** 미수행 — dev 서버 미기동 + 인증/서비스 guard. 순수 동일-로직 유틸 치환이라 tsc + 정적으로 충분.
- **무변경:** backend/API/DB/migration/route/menu ✅ · 데이터 shape ✅ · list template ✅ · pagination/states ✅(미변경) · Forum Hub/Detail/Write/Request ✅.

## 7. 완료 판정

**PASS.** formatDate 4서비스 byte-identical 중복을 공통 `formatForumDate` 로 단일화(시각/동작 무변경, 순 중복 제거). pagination 은 HubPagination 비-drop-in(first/last·테마 시각 변경)으로 후속 WO 분리, loading/empty/error 는 list template 과 함께 후속. typecheck(5) 통과.

## 8. 후속 후보

1. `WO-O4O-FORUM-LIST-PAGINATION-UNIFY-V1` — HubPagination opt-in 확장 후 forum list repoint(+smoke).
2. `IR/WO-O4O-FORUM-LIST-DATA-SHAPE-NORMALIZATION-V1` — `ForumPost` vs `DisplayPost` 정렬(plan IR §17-2).
3. `WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1` — list template(상태 포함) 공통화.

---

*Date: 2026-06-12 · WO-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1 · formatForumDate 공통화 PASS. pagination/states 는 시각 변경 동반으로 후속 분리.*
