# 커뮤니티 후속 작업 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-10
> **갱신일**: 2026-10-11
> **근거**: 사용자 요청 — TODO 제작 → 문서·코드 대조 및 보완 → 실행
> **관련 정본**: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5 · [서비스 발견·진입](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md) §5

현재 사용자 지정 후속 1~4번은 main 통합과 필요한 API·Neture 운영 배포까지 완료했다(§7). 전체 TODO는 공개 항목의 분류·열람 계약과 이력 보존 기간·자동 삭제 결정이 남아 ACTIVE를 유지한다. 아래 단계별 대기 표현은 당시 기록이며 현재 상태는 §7을 따른다.

## 1. 초안

- [x] 공개 항목의 비로그인 열람과 회원 전용 항목의 접근 경계 대조.
- [x] 게시판 개설 신청의 승인·반려 화면: 조회 중 표시, 결과 안내, 재시도, 반려 사유 입력 개선.
- [x] 운영자 후보의 자격 미충족 사유 표시 가능 여부 조사.
- [x] 자기 탈퇴와 변경 이력 보존·삭제 정책의 확정 여부 확인.
- [x] 열린 회귀 테스트 PR #404의 현재 역할 계약 조사와 최신 main 적응·재검증. 필수 CI 성공, main 병합은 대기(§6).
- [x] 문서·코드 조사 결과로 위 TODO의 실행 범위와 선행 조건 보완.
- [x] 실행 가능한 작은 화면 개선 구현·회귀 테스트·desktop/mobile 검증.
- [x] 문서 정합·commit/push·PR·required CI 및 review 확인 — 이번 화면 구현 결과는 §5, 후속 미실행 항목은 §4 참조.

## 2. 완료된 선행 작업

권한 접근 문제와 전체 관리자의 운영자 등록·취소는 사용자가 완료로 확인했다. 이를 추가 실계정 테스트의 미완료 항목으로 다시 열지 않는다. PR #412의 개별 admin/operator 및 커뮤니티 단위 제재는 main 반영과 API/Neture Promote 성공을 확인했다. 앞선 단계 문서의 배포 전 기록은 역사적 기록으로 유지한다.

테스트로 운영 권한을 새로 부여하는 작업은 이 화면 개선에 필요하지 않다. 추후 승인된 실제 지정 테스트를 수행할 경우 약국 경영자 테스트 회원을 사용하고, 이번 테스트에서 부여한 개별 운영자 역할만 해제하여 기존 회원 역할을 확인한다.

## 3. 실행 경계

이 작업은 게시판 개설 신청 심사 화면 개선부터 실행한다. 기존 서버의 권한과 승인·반려 계약을 보존한다. 공개 항목 지정, 자기 탈퇴, 이력 보존 기간처럼 미확정 정책은 조사 결과와 선행 조건을 명시하고 임의로 결정하지 않는다. main 병합·배포는 integration-ready 보고 후 사용자 지시에 따른다.

## 4. 문서·코드 대조 후 보완 TODO

조사 기준 main: `0ee82d8d7f`. `CommunityBoardReview`는 `CommunityWorkspacePage`의 관리 가능 화면에서만 소비된다. 승인·반려는 `PATCH /communities/:key/board-requests/:id`이며 기존 서버가 선택적 `reviewComment`를 저장한다. 서버의 운영자 판정과 상태 전이는 변경하지 않는다.

| 항목 | 현재 근거 | 실행·선행 조건 |
|---|---|---|
| 공개 열람 | 역할 정본 §5 구현 대기. 목록은 공개지만 workspace.allowed와 포럼 읽기는 회원 자격에 의존 | 기존 회원 자료가 공개되지 않도록 공개 항목 분류·저장 계약을 확정한 뒤 별도 구현 |
| 심사 화면 | 최초 rows=[]라 조회 중 빈 목록 안내, 공통 busy만 표시, 성공 안내·조회 재시도·반려 입력 없음 | 이번 실행: 최초 조회/재조회 상태 구분, 성공 안내, 조회 재시도, 행별 처리 표시, 선택적 반려 사유 및 취소 |
| 후보 자격 안내 | 중앙 회원 UI는 membership/service status만 받아 승격 가능 여부 표시. 서버는 추가 메인 자격도 검사 | 정확한 실패 이유를 제공하는 응답 계약 검토가 선행. 클라이언트 추측이나 자격 우회는 하지 않음 |
| 자기 탈퇴·이력 | #412는 관리자 탈퇴와 변경 이력을 구현. 자기 탈퇴·보존 기간/자동 삭제는 별도 정책 | 자기 탈퇴 조건 및 이력 보존 기간 확정 후 별도 구현 |
| 회귀 PR #404 | OPEN, 기존 HEAD CI Gate 성공. #412가 개별 역할과 지정 UI를 변경 | 기존 담당 branch에서 최신 main 대비 중복·오래된 기대값·충돌 확인 후 통합. 이번 작업에서 다른 worktree를 수정하지 않음 |

### 이번 실행 체크리스트

- [x] 최초 조회·재조회 상태와 조회 실패 안내/재시도.
- [x] 승인·반려 성공 안내와 처리된 신청 제거·목록 재조회.
- [x] 선택적 반려 사유 입력·취소·기존 reviewComment 전송.
- [x] 처리 중 중복 요청 차단 및 커뮤니티 전환 후 이전 응답 격리.
- [x] 성공 후 재조회 실패, 취소, 처리 실패, 커뮤니티 전환 회귀 검증.
- [x] Neture build 및 desktop/mobile 브라우저 검증.
- [x] 문서 정합·push·PR·required CI/review 확인 후 통합 준비 — 구현 HEAD의 결과와 최종 문서 HEAD의 확인 경로는 §5 참조.

초기 UI 검증은 격리 fixture를 사용한다. 운영 DB·실계정 역할 변경은 하지 않는다. 역할 정본 §5의 branch/운영 대기 표현은 PR #412의 main 반영·API/Neture Promote 성공 근거로 정정했다. 단계 이력 문서를 소급 재작성하지 않는다.

## 5. 실행 결과

- `CommunityBoardReview.test.tsx`: 11 tests PASS. 최초 조회·형식 오류·조회 재시도, 중복 처리 차단, 선택적 반려 사유·취소와 초점 복원, 처리 실패 후 사유 유지, 승인 성공 후 재조회 실패, 커뮤니티 전환 중 늦은 조회·변경 응답 격리를 확인했다.
- `pnpm run build:packages`, `pnpm --filter @o4o/web-neture build`: PASS. 기존 Browserslist·chunk size 안내가 있었으며 build 실패는 없다.
- Chromium production build + 모의 API: desktop 1440 / mobile 390 PASS. 조회 재시도, 취소·초점, 처리 중 버튼 차단, 승인 성공 후 재조회 오류, 반려 사유 전송, 반려 실패 재시도를 확인했다. 두 화면 모두 pageerror 0, 가로 넘침 없음. 모든 API 요청은 메모리 fixture에서 종료하며 운영 서버에 전달하지 않았다.
- 변경 화면·회귀 테스트 ESLint, 문서 민감정보 검사, `git diff --check`: PASS.

소스·정본·TODO만 변경했다. dependency/lockfile·API·DB·역할 계약은 변경하지 않았다. required CI/review는 PR 최신 HEAD를 기준으로 확인한다. main 통합·운영 배포는 이 작업의 검증 결과와 분리한다.

구현 커밋 `a647982b70779e78db1399d7b2a8529bb17293f8`은 [PR #424](https://github.com/Renagang21/o4o-platform/pull/424)에 push했다. [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38057825750)의 API Jest 3개 묶음·Code Quality·웹/관리자 빌드·필수 CI Gate와 CodeQL/Guard 분석이 통과했다. 확인 시점에 등록된 review와 미해결 review thread는 없었다. 이후 완료 기록만 변경한 문서 HEAD의 checks는 PR에서 확인하며, 소스 변경이나 운영 반영을 뜻하지 않는다.

1차 심사 화면 개선은 [PR #424](https://github.com/Renagang21/o4o-platform/pull/424)로 main에 병합했다(`8d2ead6e92b189a86d1a4fc6b83517bf95ac774f`). 병합 후 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38063581241)의 필수 CI Gate와 CodeQL이 통과했고, [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38064207250)의 Neture 실제 배포와 serving SHA report가 성공했다. commit status `production`은 `DEPLOYED · deploy: neture`다. 공개 운영 HTML·JavaScript HTTP 200 및 개선 문구 반영을 확인했다. 사용자 PC의 Google 세션으로 승인·반려를 실행한 검증을 뜻하지 않는다.

작업공간 `wo/community-review-ux` / `/workspace/o4o-wt/community-review-ux`는 main 포함·clean·잔여 프로세스 없음 확인 후 정리했다. 해당 로컬·원격 branch도 삭제했다. 다른 작업공간은 보존했다. 이전의 main 미병합·KEEP 판정은 위 완료 결과로 갱신한다. 전체 후속 TODO는 아래 미실행 항목이 있어 ACTIVE를 유지한다.

위 1차 실행 당시 공개 항목의 저장/판정 계약, 정확한 후보 자격 응답, 자기 탈퇴·이력 보존 정책 및 #404 통합은 미실행이었다. 자기 탈퇴 정책 확정과 후보 자격 응답·화면 구현은 아래 §6에서 이어서 진행했다. 공개 열람·이력 보존 기간/자동 삭제·main 통합은 별도로 남아 있다.

## 6. 후속 실행 순서 (2026-10-11 사용자 지정)

1. TODO 문서 상태 갱신 — §5의 main 병합·배포·작업공간 정리 근거 반영 완료.
2. 회귀 테스트 PR #404 정리 — 최신 main의 개별 역할 계약과 대조·수정·재검증.
3. 자기 탈퇴·이력 관리 — 기존 관리자 탈퇴와 자기 탈퇴를 구분하고, 사용자가 확정한 자기 탈퇴·기존 이력 보존 정책을 실행. 기간/자동 삭제는 별도 결정.
4. 운영자 후보 자격 안내 — 서버 자격 판정 근거와 응답·화면을 일치시켜 안내.

공개 항목의 비로그인 열람은 이번 후속 실행 순서에 포함하지 않는다. 정책 조사 결과·미실행 범위·각 단계 검증은 아래에 추가하며, 앞선 검증 기록을 소급 변경하지 않는다.

### 2번: PR #404 정리

기존 담당 worktree에서 main `261cddc961`을 merge 방식으로 반영했다. 기존 테스트는 서비스 운영 권한 경계를 유지하며, 개별 admin/operator/member 계약에 맞춰 탭 복귀 후 커뮤니티·회원 목록 재조회와 역할 변경 요청 없음 검증을 보강했다. API 가드 Jest 37건, Neture 화면 Vitest 6건 및 변경 테스트 ESLint가 통과했다. 구현 코드·운영 계정·DB 변경은 없다. 커밋 `eb2f69b4be`를 [PR #404](https://github.com/Renagang21/o4o-platform/pull/404)에 push했고 당시 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38088469168) 필수 CI Gate·전체 검사와 [CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/38088469216)이 성공했다.

2026-10-11 사용자의 main 통합·배포 지시에 따라 main `359dedcc26`과 다시 동기화했다. 최종 HEAD `94a5f0609a`의 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38090347595) 전체 검사·필수 CI Gate 및 CodeQL 성공, 최신 Codex 자동 리뷰의 주요 문제 없음과 미해결 thread 0을 확인한 뒤 main에 병합했다(`c1ce8efca2`). API 가드 37건·화면 6건도 재검증했다. 병합 후 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38090983480) 및 [CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/38090983473)이 통과했다. [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38091582633)는 성공했으며 실제 배포 작업은 모두 건너뛰었다(`production = NO_DEPLOY`). 테스트 전용 변경의 `DEPLOYMENT = NOT_APPLICABLE`을 확인하고 main 포함·clean·잔여 프로세스 없음 확인 후 담당 worktree와 로컬·원격 branch를 정리했다.

### 3번: 자기 탈퇴·이력 정책 확인

역할 정본 §5와 개별 회원 관리 설계 §7은 자기 탈퇴 조건·이력 보존 정책을 후속 결정으로 명시한다. 기존 관리자 탈퇴는 active/suspended → withdrawn + member로 변경하고 actor·변경 전후 상태·사유를 같은 트랜잭션으로 보존한다. 이력은 같은 커뮤니티 admin/서비스 admin만 최근 50건을 열람하며 자동 삭제는 없다.

2026-10-11 사용자가 제안대로 진행하도록 확정했다: 본인의 active 개별 커뮤니티 가입만 자기 탈퇴 대상으로 삼고 마지막 유효 admin은 후임 지정 전 보호한다. 다른 커뮤니티·서비스 가입·공통 계정·게시물과 별도 중앙 운영 권한은 변경하지 않는다. 기존 이력을 보존하며 자동 삭제는 기간 확정 뒤 별도 실행한다. 정지·반려·가입 대기 상태를 자기 탈퇴로 우회하지 않는다. 이 정책은 역할 정본 §5에 반영했다.

`POST /communities/:communitySlug/leave`는 세션 사용자만 대상으로 받아 해당 개별 가입을 withdrawn·member로 변경한다. 가입 변경과 기존 action=withdraw 이력 저장은 같은 트랜잭션으로 실행하며 사유는 고정된 ‘본인 탈퇴’다. 중복 완료 요청은 changed=false로 새 이력을 만들지 않는다. 기존 관리자 이력 조회 권한과 저장 테이블을 유지한다. 화면에서는 탈퇴 범위·게시물/이력 보존을 안내하고 확인·취소·오류·중복 처리 차단을 제공한다. migration·운영 데이터 변경·자동 삭제는 수행하지 않는다. 아직 운영 반영 전인 branch 구현이다.

회원 관리·route Jest 62건과 자기 탈퇴 화면 Vitest 4건 PASS. 본인 대상으로 한정, 일반 회원/Operator 탈퇴, 마지막 Admin 보호와 후임 존재, 정지·반려·신청 상태 거부, 중복 완료 시 이력 1건, 이력 실패 시 rollback을 모의 transaction으로 검증했다. 화면 이탈 후 늦은 응답도 적용하지 않는다. 실제 운영 DB 동시성·Google 실로그인 검증을 뜻하지 않는다.

### 4번: 운영자 후보 자격 안내

기존 중앙 관리용 회원 조회에 `designationEligibility`(eligible·code·message)를 추가했다. 서버가 개별 가입 활성·Demo 제외·메인 계정 자격·커뮤니티 서비스 가입 활성 여부를 기존 판정 근거로 조회하며 상태 변경이나 행 잠금은 하지 않는다. 화면은 이 응답의 미충족 사유를 표시하고 Admin/Operator 승격을 차단한다. 이전 API 응답처럼 자격 정보가 없으면 임의로 추측하지 않고 새로 조회하도록 안내한다. 회원으로 역할을 해제하는 선택은 유지하며, 기존 서버의 마지막 유효 Admin 보호와 Demo 변경 금지는 그대로 적용한다.

조회 안내는 지정 권한의 근거가 아니다. 실제 역할 변경은 기존 트랜잭션에서 최신 자격을 다시 확인한다. 후보 지정 Jest 32건, 중앙 관리 UI Vitest 4건 및 기존 Admin/Operator 업무 분리 2건 PASS. 조회 당시 적격이어도 지정 전에 자격이 바뀌면 거부되는 경우와 응답 누락 시 승격 차단을 확인했다.

### 3·4번 공통 검증·통합 상태

- 공통 packages build, API TypeScript build, Neture production build PASS. 기존 chunk size 안내 외 build 실패 없음.
- 변경 UI/API 타입 파일·회귀 테스트 ESLint, 문서 민감정보 검사 및 `git diff --check` PASS.
- Chromium production build + 격리 모의 API: desktop 1440 / mobile 390 PASS. 탈퇴 확인·취소와 초점 복원, 마지막 Admin 오류·재시도, 처리 중 버튼 차단, 탈퇴 후 접근 재조회·새로고침, 후보 자격 사유·응답 누락, 지정 시점 자격 변경 거부, 역할 지정·해제 왕복을 확인했다. pageerror 0, 페이지 가로 넘침 없음(회원 표는 내부 가로 스크롤).
- 모든 browser API 요청은 메모리 fixture에서 종료한다. 운영 계정·DB·Google 세션을 변경하거나 운영 권한을 추가하지 않았다.
- 소스·정본·TODO를 [PR #431](https://github.com/Renagang21/o4o-platform/pull/431)에서 검토한다. 최신 소스 HEAD의 필수 CI와 review는 PR에서 확인한다. main 통합·운영 배포 전이며 worktree/branch는 KEEP이다. API·Neture 변경이므로 운영 반영 시 두 대상의 배포가 필요하다.

후속 잔여 범위: 공개 항목 분류·저장 계약 및 비로그인 열람, 이력 보존 기간 확정과 자동 삭제, 위 두 PR의 main 통합. 이번에 확정한 정책은 기존 이력 보존이며 자동 삭제를 포함하지 않는다.

### 통합 전 자동 리뷰 보완 (2026-10-11)

PR #431 구현 HEAD `8db329465e`의 Codex 자동 리뷰에서 P2 두 건을 확인해 수정했다. 후보 목록은 Demo 여부·메인 계정·서비스 가입을 한 목록 SQL에서 함께 조회하고 기존 메인 자격의 순수 판정 함수를 재사용한다. 회원 1,000명도 커뮤니티 확인과 목록 조회 두 SQL로 끝나며 행별 추가 쿼리·동시 connection 요청·행 잠금은 없다. 실제 지정 트랜잭션의 자격 재확인은 유지한다.

workspace 응답에 독립 커뮤니티의 `communityStatus`를 추가하고, 화면은 커뮤니티와 본인 개별 가입이 모두 active일 때만 탈퇴를 노출한다. 커뮤니티 상태가 누락된 이전 응답·비활성 커뮤니티는 탈퇴를 노출하지 않는다. 서비스·메인 자격으로 열람이 제한된 경우에도 활성 커뮤니티의 본인 활성 가입 탈퇴 정책은 유지한다.

관련 API Jest 61건과 탈퇴 화면/workspace Vitest 13건, 변경 파일 ESLint PASS. 단건/목록 메인 자격의 동일 정책 12개 사례, 대량 후보의 고정 쿼리 수, 비활성 커뮤니티·응답 누락의 버튼 숨김 및 탈퇴 후 재조회를 검증했다. 전체 최신 CI·자동 리뷰·운영 배포는 아래 후속 완료 기록에서 확인한다.

## 7. 최신 main 통합·운영 배포 완료 기록 (2026-10-11)

PR #431은 main `c1ce8efca2`를 merge 방식으로 동기화한 최종 HEAD `c82440ea3a`에서 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38091035964) 필수 CI Gate·전체 검사 및 [CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/38091035953)이 통과했다. 최신 HEAD의 Codex 자동 리뷰는 주요 문제 없음으로 완료됐고 앞선 P2 두 건의 thread는 해결했다. 최신 main과 충돌 없음·미해결 thread 0·실제 ruleset의 필수 CI 충족을 확인한 뒤 사용자 승인에 따라 [PR #431](https://github.com/Renagang21/o4o-platform/pull/431)을 main에 병합했다(`3b776054931debb43934402ea67a4b04fda3b83b`). 병합 후 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38091706131)의 CI Gate 및 [CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/38091706100)이 성공했다.

최종 동기화 후 focused API Jest 128건·Neture Vitest 21건, 공통 packages/API/Neture build, 변경 파일 ESLint·문서 민감정보 검사·`git diff --check`가 통과했다. Chromium production build + 격리 API fixture의 desktop 1440/mobile 390 검증도 통과했다. 비활성 커뮤니티의 탈퇴 버튼 숨김부터 지정·해제 왕복까지 확인했으며 pageerror 0·페이지 가로 넘침 없음이다. 운영 계정·DB를 변경하는 검증은 수행하지 않았다.

위 §5·§6의 branch 구현·main 대기 기록은 각 단계 당시 상태다. 현재 main 통합·운영 배포 상태는 이 절을 기준으로 확인한다.

[Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38092304228)는 성공했지만 `HELD_LEVEL_3 · api(L3),neture(needs-api)`로 실제 배포를 건너뛰었다. 사용자 승인과 다른 운영 배포 없음, main HEAD가 검증된 위 커밋과 같음을 확인한 뒤 동일 SHA·`services=api,neture`로 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38092399080)를 실행했다. 배포 조건 검사·API CI gate·기존 migration 단계·API 새 revision 검증/트래픽 전환, 이어서 Neture CI gate·새 revision smoke/트래픽 전환, 마지막 serving SHA Report가 모두 성공했다. Report는 두 대상의 serving SHA가 `3b776054931debb43934402ea67a4b04fda3b83b`임을 확인하며 commit status `production`은 `success / DEPLOYED · deploy: api,neture`다. `DEPLOYMENT = MANUAL/GATED → 완료`이며 필수 CI·freeze·대상 SHA 검사를 우회하지 않았다.

운영 smoke 결과:

- API `/health/ready`: HTTP 200·ready.
- 공개 workspace 접근 응답: HTTP 200, 새 `communityStatus` 계약 반영·비로그인 allowed=false 유지.
- 계정 인증 없이 호출한 탈퇴 경로: HTTP 401·`AUTH_REQUIRED`, 인증 단계에서 차단. 탈퇴할 실제 대상·로그인 세션을 사용하지 않았다.
- 커뮤니티 관리·약국 커뮤니티 URL HTML과 웹 asset: HTTP 200. 배포 JavaScript와 관리 페이지 chunk에 새 탈퇴 화면·후보 자격 안내 반영을 확인했다.
- 실계정 가입·운영자 역할 변경 검증은 0건이다. 사용자 PC Google 로그인으로 탈퇴·지정을 실행한 검증을 뜻하지 않으며, 해당 동작은 앞선 격리 fixture와 회귀 테스트로 검증했다.

동일 WO의 완료 기록 단계로 `wo/community-followup-sequence` branch/worktree를 유지해 이 문서를 갱신했다. 이 문서-only 후속 통합의 배포 판정은 `NOT_APPLICABLE`이다. 완료 기록 PR의 최신 CI·리뷰 및 병합 후 확인까지 마치면 main 포함·clean·잔여 프로세스 없음 조건으로 이 작업의 worktree와 로컬·원격 branch를 정리한다. 다른 작업공간은 정리 대상이 아니다.

후속 잔여 범위는 공개 항목 분류·저장 계약 및 비로그인 열람, 이력 보존 기간 확정과 자동 삭제다. 사용자 지정 1~4번의 구현·회귀 테스트·main 병합·필요한 운영 배포는 완료됐다.
