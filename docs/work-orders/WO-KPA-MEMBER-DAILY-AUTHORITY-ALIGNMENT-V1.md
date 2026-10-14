# KPA 약국 사업자 회원 일상 업무 권한 정합

> **상태:** COMPLETED
> **작성일:** 2026-10-14 · **최종 갱신:** 2026-10-14
> **사용자 승인:** operator 정지 차단·회원 유형 변경 UI/API 불일치 해소. 종료는 push까지.
> **기준:** 최신 origin/main `0d55cb43483860caf9596718cb38f16482ac7174`
> **선행 의존:** 미병합 회원 수정 정비 `d62b87bca2`를 새 독립 clone/branch에 fast-forward 포함. 기존 branch 보존.

## TODO → 조사 후 보완

- [x] 실제 route/단건·일괄 adapter/편집 모달·API·기존 테스트 조사.
- [x] 입구 → ID 해석 → 잠금 후 상태 재확인의 세 차단 지점 확인.
- [x] operator의 active→suspended, suspended→active 및 기존 가입 승인·반려 허용.
- [x] 탈퇴·pending 되돌림·탈퇴 복구의 admin 제한, 동시 활성화 후 반려 차단 보존.
- [x] users/km/sm ID와 km 없는 회원의 상태 보존·복구 경로 검증.
- [x] 약사/약대생 및 기존 alias 회원 유형 변경을 operator에게 허용. 운영 tier 주입은 거부.
- [x] 모달의 상태 선택지를 실제 권한에 맞추고 같은 규칙으로 직접 저장도 방어.
- [x] 기존 원자성/서비스 범위/공통 계정 불변·Demo 보호 회귀, 타입·빌드·fixture 검증.
- [x] 새 CHECK와 ACTIVE TODO/회원관리 정본 정합·commit/push.

일상 정지는 active/suspended, 복구는 pending/rejected/suspended/active에서 active로,
가입 반려는 pending/rejected에서만 허용한다. 같은 상태 재요청은 기존 허용 범위에서 멱등 처리한다.
operator에게 pending 되돌림·withdrawn 전환·withdrawn 출발 변경은 허용하지 않는다.
잠금 후 canonical service_memberships 상태로 같은 권한을 재확인한다.
회원 유형은 pharmacist/student 및 기존 alias 4종만 허용하며 서비스 admin/operator 지정과 구분한다.

## 범위·보존

대상 `/api/v1/kpa/members/:id/{info,status}` 및 KPA Society `/operator/members` 소비처.
기존 KPA 전용 shared-package 모달 1개 소비처의 props는 optional 추가로 호환 유지.
단건/일괄 정지·복구가 같은 status API를 사용한다. info→status 부분 성공 재시도 정비는 유지.
트랜잭션/승인 delegate/서비스 scope/공통 계정 상태/기존 역할 지정 절차를 확장하지 않는다.
약사회 분회·다른 서비스 API·운영 DB 쓰기·migration·main 병합·배포는 제외한다.

## 완료 근거

[CHECK](../checks/CHECK-KPA-MEMBER-DAILY-AUTHORITY-ALIGNMENT-V1.md)에 API 143건·UI 82건·타입·빌드·browser 검증과 선행 커밋 포함 범위를 기록했다. main 병합·배포는 이번 종료 범위가 아니다.
