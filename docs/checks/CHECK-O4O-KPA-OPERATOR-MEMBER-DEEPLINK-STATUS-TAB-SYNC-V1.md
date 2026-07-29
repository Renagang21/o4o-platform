# CHECK-O4O-KPA-OPERATOR-MEMBER-DEEPLINK-STATUS-TAB-SYNC-V1

> WO: `WO-O4O-KPA-OPERATOR-MEMBER-DEEPLINK-STATUS-TAB-SYNC-V1`
> 성격: KPA 회원 관리 화면이 Action Queue 상태 딥링크를 읽어 해당 탭 자동 선택.
> **공용 컴포넌트 무수정 · API 계약/상태정책/DB 불변.** Date: 2026-07-29 · commit `84847be54` · Deploy Web+API success · smoke PASS

## 0. 결론 — ✅ PASS

공용 `OperatorMembersConsolePage` 는 이미 `syncUrl` opt-in(URL key=`members_tab`, 기본 false)을 지원. KPA wrapper 가
이를 전달하지 않고 AQ URL 이 `?status=suspended`(콘솔이 읽지 않는 레거시 query)였던 것이 원인.
→ **wrapper `syncUrl` 활성화** + **AQ URL 을 canonical query(`members_tab=status-suspended`)로 정렬** 2건으로 해결. 공용 콘솔 무수정.

## 1. 수정

- `MemberManagementPage.tsx`: `<OperatorMembersConsolePage>` 에 **`syncUrl`** prop 추가(그 외 prop 불변).
- `apps/api-server/src/routes/kpa/action-definitions.ts`: '정지 회원 복구 대기' AQ `actionUrl`
  `/operator/members?status=suspended` → **`/operator/members?members_tab=status-suspended`**. 레거시 `?status=` 호환 미추가(canonical 전환).

## 2. 공용 콘솔 계약(검증 결과, 무수정)

- `syncUrl=false` 기본(line 234). true 시 `uk(key)=`members_${key}`` → URL key `members_tab`.
- `activeTab` 초기값 = `searchParams.get('members_tab') || 'all'`. `status-suspended` 등 statusTab key 와 매칭 시
  API query `status=<tab.status>` 로 변환(line 293-298). `pending` → `status=pending`.
- KPA statusTabs: `status-active`(승인완료)·`status-rejected`(반려)·`status-suspended`(정지)·`status-withdrawn`(탈퇴) + built-in `pending`(가입 신청)·`all`.

## 3. 실브라우저 smoke (kpa-society.co.kr, 운영자)

| # | 검증 | 결과 |
|---|---|---|
| 1 | `?members_tab=status-suspended` 직접 진입 | URL 정상 ✓ |
| 2 | 정지 탭 자동 선택 | `GET /kpa/members?status=suspended` 발생으로 입증 ✓ |
| 3 | API 요청에 `status=suspended` | **true** ✓ |
| 4 | 정지 회원만 표시(status 필터) | 서버 필터 적용 ✓ |
| 5 | 탭 변경(승인완료) 시 URL 갱신 | `members_tab=status-active` + API `status=active` ✓ |
| 6 | 새로고침 후 탭 유지 | URL 유지 + API `status=active` 재요청 ✓ |
| 7 | AQ 카드 클릭 동일 결과 | AQ URL = 딥링크와 동일 canonical(`members_tab=status-suspended`, 배포됨) → 동작 동일 ✓ |
| 8 | 다른 회원 탭 회귀 없음 | status-active(#5)·pending(`status=pending`) 정상, 회귀 없음 ✓ |

- pending 딥링크 `?members_tab=pending` → `GET /kpa/members?status=pending` 확인.

## 4. 배포·typecheck

- web-kpa-society `tsc --noEmit` **0**. api-server 변경(action-definitions)=문자열 리터럴, 타입 무영향.
- 커밋 `84847be54` → Deploy Web Services **success** · Deploy API Server **success**.

## 5. 범위 밖(무접촉)

- 공용 `OperatorMembersConsolePage` 무수정. GP/Cosmetics/Neture 회원 화면 무접촉(GP/Cos 는 `/operator/users` 별도 route).
- 회원 API·상태 정책·DB migration·AQ 집계 SQL 무변경.

## 6. 커밋 SHA

- 코드 `84847be54`(MemberManagementPage + kpa/action-definitions, 2파일 +8/-1) · 본 CHECK.
