# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/intelligent-cray-o2p4u3` · 코드 기준: `main` `9adcadaf97` · 작성: 2026-11-10 (클라우드 작업 세션)
> 다음 실행자: **통합 세션(PR 생성 · 병합) → LOCAL(배포 · 배포 후 확인)**
> 이전 인계 전문(통합 진행표 포함): `git show 9adcadaf97:HANDOFF.md`

## 한 일 — 계정 삭제가 끝나도록 (2026-11-10 사용자 지시)

이전 PR Renagang21/o4o-platform#1014 는 병합됐다(2026-11-10 06:16Z 조회). 같은 branch 이름을 최신 `origin/main` 에서 다시 시작했다. 이 branch 의 PR 은 **미생성**이다(PR 은 통합 세션이 만든다 — AGENTS.md §4-1(e)).

1. `4146d52f48` fix(privacy): 보존 기록 사본 때문에 「삭제 미완료 — 확인 필요」에서 멈추지 않게 한다
   - 새 `apps/api-server/src/services/privacy/account-retained-records.ts`.
   - 행은 남기고 이 회원 식별값만 `erased:<hash>` 로 바꾸는 표: `action_logs` · `account_activities` · `neture_contact_messages` · `neture_suppliers`.
   - 사본을 지우는 표: `canonical_demo_repair_snapshots` · `operator_invitations`.
   - `account-erasure.service.ts`: 삭제 전 검토는 위 표를 건너뛴다. 단, 공급자 소유 연결 `neture_suppliers.user_id` 는 계속 검토한다. finish 는 정리 후 모든 표를 다시 검토하며, 덜 정리됐으면 전체를 되돌린다.
2. `d1af718950` fix(admin): 삭제가 끝나지 않은 회원을 「해지」가 아니라 「삭제 확인 필요」로 보인다
   - 회원 목록 · 상세 API 에 `erasureState` · `erasureErrorCode` 를 더했다.
   - 목록 배지와 회원 패널에 「삭제 확인 필요」 · 「삭제 재시도 필요」 · 「삭제 중」과 사유를 보인다.

## PR 로 묶을 단위

- 한 PR: 위 두 commit(주제: 계정 삭제 완료 · 상태 표시). migration · CI · 인증 · 권한 변경은 없다.

## 결정 사항 (§9)

- **공급자(`neture_suppliers`)는 지우지 않는다** — 사용자 결정 「거래기록은 유지」.
  - 본인 소유 공급자는 기존 detach 경로가 처리한다(개인 필드 비움 · INACTIVE).
  - 다른 공급자 행에 들어 있는 이 회원 이메일 등은 치환한다.
  - 소유 연결(`user_id`)은 바꾸지 않는다. 소유 · 처분 문제이므로 기존처럼 검토 대기로 둔다(기존 테스트 「legacy supplier pointer」 유지).
- **보존 기록은 삭제가 아니라 비가역 치환으로 처리한다.** 근거는 개인정보 보존 정책 §6 · §13(처리 · 접속 기록 1년)과 §3(문의).
  - 키는 기존 system log 최소화와 같은 `hash(userId)` 다.
  - 이 회원이 처리한 `action_logs` 는 `user_id` 를 비우고 `meta.actorKey` 를 남긴다. 같은 사람의 처리였다는 것만 알 수 있고, 누구인지는 알 수 없다.
- **운영자 초대(`operator_invitations`)는 삭제한다.** 근거는 두 가지다.
  - 정책 §2.1 상 이메일 · 토큰은 파기 대상이다.
  - 「수락됨」 행은 DB 제약상 수락자를 비울 수 없다.
  - 지정 · 해제 이력은 `action_logs` 에 치환된 채 남는다.
- **데모 복구 스냅숏은 보존 근거가 없는 사본이므로 삭제한다.**
- **탭 숫자는 바꾸지 않았다.** 「해지 회원」 탭은 서비스 해지 기준 그대로다. 삭제 중인 회원은 상태 배지로만 구분한다.

## 검증 결과 (격리 PostgreSQL — 일회용 클러스터, 운영 DB 아님)

- `account-erasure.integration.test.ts`: 79/81 통과.
  - 새 테스트 「retained records …」가 통과했다.
  - 실패 2건은 이 작업 전부터 있던 employee 테스트 2건이다.
    - 「temporary suspension retains employment…」
    - 「employee access termination…」
- privacy unit 테스트 27/27 통과(5 skip)
- `central-member-workspace.postgres.spec.ts`: 16/16 통과. 새 테스트는 삭제 상태 표시다.
- `member-registration.postgres.spec.ts`: 26/26 통과
- `member-profile-recovery.postgres.spec.ts`: 13/13 통과. fixture 에 `account_erasure_operations` 를 추가했다.
- route · review 테스트 33/33 통과
- admin-dashboard `src/pages/operators`: 148/148 통과. 새 테스트는 `member-workspace-erasure.test.ts` 다.
- `tsc --noEmit`(api-server · admin-dashboard) 통과 · `check-unsafe-routes` 0건 · `check-forbidden-tables` 통과

## 확인하지 못한 것 (배포 후)

- **운영에서 실제로 삭제가 끝나는지.** 지난번 검토 대기로 남은 회원에 대해 Admin 「계정 삭제」를 다시 눌러, 같은 작업이 이어서 완료되는지 확인한다.
  - 운영 데이터에서 위 6개 표 밖의 사본이 나오면 계속 검토 대기로 남는다. 그때는 「삭제 처리 내역」의 `review_codes` 를 알려 주면 된다.
- 회원 목록 배지 · 패널 문구의 PC · 모바일 화면.
- 소요 시간: 정리 후 검토가 한 번 더 돌아 수 초 늘 수 있다.

## 겹칠 수 있는 열린 PR

- 조회하지 못했다. 통합 세션이 PR 생성 시 확인한다(`pr-overlap` Action #1015 도 댓글로 알린다).

## 문서 정합

해당 없음.
