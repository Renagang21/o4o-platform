# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/intelligent-cray-o2p4u3` · 코드 기준: `main` `13460cb183`(merge 반영) · 작성: 2026-11-10 (클라우드 작업 세션)
> 다음 실행자: **통합 세션(PR 생성 · 병합) → LOCAL(배포 · 배포 후 확인)**
> 이전 인계 전문(통합 진행표 포함): `git show 9adcadaf97:HANDOFF.md`

## 2026-11-11 · Promote · Delivery 짧은 job 통합 (비용 절감 · branch `claude/peaceful-lamport-sjwtri-promote-cost`)

> 이 절만 이 branch 의 인계다. 아래 계정 삭제 절은 다른 세션의 인계로 그대로 둔다.
> 다음 실행자: **통합 담당** — PR 검토 · 병합(배포 workflow 변경 · AGENTS.md §5). 병합 뒤 다음 실제 Delivery/Promote 1회에서 아래 「병합 후 확인」.

- **바꾼 것:** `deploy-api.yml` · `deploy-admin.yml` · `deploy-web-services.yml` 의 `ci-gate` job 을 detect job 의 step(`ci_gate`)으로 옮겼다. 배포 job 은 `needs.<detect>.outputs.ci_gate == 'passed'` 를 요구한다(게이트 조건식 · `ci-gate.mjs --enforce` · 30분 대기 · 권한 그대로). Web `summary` 는 직접 dispatch 에서만 돈다(`github.workflow_ref` 로 판별 — Delivery · Promote 호출 시 skip).
- **절감(실측 2026-10-27~11-10, Promote 62 · Delivery 183 run):** 1분 청구 job 약 665개/15일 제거 → 월 약 1,300분(약 $7.7, private Linux 요금) · 배포 workflow 사용량의 약 22%.
- **위험 판정:** `deploy-risk.mjs --base origin/main --head <이 branch>` = LEVEL_1 · deploy_required=false(세 파일 모두 control 변경). 병합만으로 서비스 재배포 없음.
- **테스트:** 새 `scripts/ci/__tests__/promote-short-job-consolidation.test.mjs`(실제 조건식을 평가해 freeze · dry_run · 소유자 · 대상 · migrate_only · force_deploy · CI 결과 전 조합에서 배포 여부가 종전과 같음 · 결함 6종 주입 시 모두 실패 확인) · `deploy-workflow-gates.test.mjs` 를 새 구조로 갱신 · CI node:test 목록 추가. `scripts/ci/__tests__/*.test.mjs` 520 pass.
- **병합 후 확인(미검증 — 실제 실행 필요):** ① 다음 Delivery 배포 run 에서 각 deploy 호출이 `Detect …`(CI gate step 포함) → 배포 순서로 돌고 `ci-gate` job 이 없음 ② CI gate step 로그에 `ci-gate.mjs` 통과 ③ web 호출에 `summary` 가 skip ④ detect job 시간이 60초 안(넘으면 2분 청구 — 절감 축소). 문제가 있으면 이 PR 을 되돌리는 revert PR 하나로 원상 복구된다(데이터 · 설정 변경 없음).
- **하지 않은 것:** Promote 실행 · 운영 배포 · GitHub 설정 변경. `Same-SHA guard` · `Classify` · `Report` 는 GCP 인증 · 승격 판정 경계라 합치지 않았다.

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

3. `e5fa077de1` fix(admin): 「해지 회원」 탭 숫자를 목록 해지 배지와 같은 기준으로 센다
   - 사용자 지적(2026-11-10): 목록에 「해지」 2명인데 탭은 0명이었다.
   - 배지는 계정 정지(`users.isActive=false` · `status='suspended'`, 계정 삭제 요청 포함)를 해지로 보이는데, 탭은 서비스 가입 상태만 셌다.
   - 이제 탭도 같은 기준으로 센다. 삭제가 끝나지 않은 회원은 해지 탭에 나오고, 배지는 「삭제 확인 필요」로 보인다.

4. `8353d0e3e8` fix(privacy): 중앙 운영 메뉴 권한 감사 기록은 삭제 전 검토에서 건너뛰지 않는다
   - #1022 CI(run 42775488648) `service-operator-invitation.integration.test.ts` 「keeps unknown audit payload …」 2건 실패를 고쳤다.
   - 원인: 삭제 전 검토가 `action_logs` 를 통째로 건너뛰었다. 그래서 형식이 다른 메뉴 권한 감사 기록이 검토 없이 일반 치환으로 넘어갔다.
   - 수정: `operator.central_menu_grants_changed` · `admin.service_operator_assigned` 행은 전용 경로(`central-menu-audit-evidence`)의 판정대로 계속 검토한다.

## PR 로 묶을 단위

- 한 PR: 위 네 commit(주제: 계정 삭제 완료 · 상태 표시). migration · CI · 인증 · 권한 변경은 없다.
- **#1022 반영 필요:** #1022 의 head 는 통합 세션이 만든 `claude/jolly-carson-4smjue` 이고, 위 1 · 2 와 인계 기록만 cherry-pick 돼 있다.
  3(`e5fa077de1`)과 4(`8353d0e3e8`)를 더 가져가야 한다. #1022 설명의 「탭 숫자는 바꾸지 않았다」도 3 기준으로 고쳐야 한다.

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
- **「해지 회원」 탭은 목록 배지와 같은 기준으로 센다**(3번 · 사용자 지적으로 처음 결정을 바꿨다). 계정이 멈춘 회원도 센다.
  삭제가 끝나지 않은 회원은 그 안에서 「삭제 확인 필요」 배지로 구분한다.

## 검증 결과 (격리 PostgreSQL — 일회용 클러스터, 운영 DB 아님)

4번 commit 후 재실행:
- `service-operator-invitation.integration.test.ts`: 54/54 통과. 같은 파일에서 수정 전에는 2건이 실패했다(CI 와 같은 실패를 재현).
- `account-erasure.integration.test.ts`: 79/81. 실패 2건은 이전부터 있던 employee 테스트다.
- member postgres spec 3개 55/55 · privacy unit 27/27 · api-server `tsc --noEmit` 통과

- `account-erasure.integration.test.ts`: 79/81 통과.
  - 새 테스트 「retained records …」가 통과했다.
  - 실패 2건은 이 작업 전부터 있던 employee 테스트 2건이다.
    - 「temporary suspension retains employment…」
    - 「employee access termination…」
- privacy unit 테스트 27/27 통과(5 skip)
- `central-member-workspace.postgres.spec.ts` 등 3개 파일: 34/34 통과. 새 테스트는 삭제 상태 표시와 해지 탭 숫자다(main `13460cb183` 반영 후 재실행).
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
