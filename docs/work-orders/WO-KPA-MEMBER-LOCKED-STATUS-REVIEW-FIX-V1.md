# KPA 회원 상태 잠금 기준 일치 — PR #579 리뷰 보완

> **상태:** COMPLETED
> **작성일:** 2026-10-14 · **최종 갱신:** 2026-10-14
> **대상:** 기존 PR #579 / wo/kpa-member-daily-authority
> **종료:** 회귀 검증·commit·push 후 통합 담당 재인계. main 병합·배포 제외.

- [x] 잠금 후 권한 판정과 잠금 전 처리 분기의 불일치 확인.
- [x] active 조회→동시 정지→active 요청의 누락된 reactivate 재현 테스트.
- [x] operator가 이미 읽는 locked service_memberships 상태로 승인/복구·가입일·후속 알림/이력 분기를 일치.
- [x] pending/active/suspended 경합 양방향과 실패 rollback·탈퇴 복구 거부 검증.
- [x] 관련 API 회귀·타입/build·문서 정합·기존 PR push 및 리뷰 재인계.

operator의 기존 FOR UPDATE 읽기와 트랜잭션 경계를 보존한다. 새 DB/schema/권한·서비스 범위나
잠금 순서를 추가하지 않는다. admin의 기존 별도 동작과 전역 회원관리 Core는 이번 결함 수정 범위 밖이다.
공통 계정 활성화·다른 서비스·약사회 분회는 변경하지 않는다. 실제 운영 DB/실계정 쓰기는 실행하지 않는다.
기존 완료 WO/CHECK는 이력으로 보존하고 본 문서/CHECK로 리뷰 보완 증적을 추가한다.

검증 증적은 [CHECK](../checks/CHECK-KPA-MEMBER-LOCKED-STATUS-REVIEW-FIX-V1.md)에 기록한다.
