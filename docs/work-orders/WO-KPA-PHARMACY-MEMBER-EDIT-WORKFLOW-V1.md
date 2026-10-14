# 약국 사업자 회원 수정 — 입력·검증·순차 저장 정비

> **상태:** COMPLETED
> **작성일:** 2026-10-14 · **최종 갱신:** 2026-10-14
> **기준:** origin/main `0d55cb43483860caf9596718cb38f16482ac7174`
> **종료 범위:** 구현·검증·commit·push. main 병합·배포는 이번 작업 제외.

## 최초 TODO

- [x] 약국 사업자 회원 수정의 실제 화면·API·소비처 조사.
- [x] 변경값·검증·부분 성공·권한 보존 조건으로 TODO 보완.
- [x] 입력 초기화와 변경값/요청값 계산을 KPA 전용 모델로 분리.
- [x] 단계별 저장 결과와 재시도를 관리하고 입력·오류를 보존.
- [x] 중복 저장·저장 중 닫기·대상 전환 후 늦은 응답 방어.
- [x] 회귀 테스트·타입·빌드·브라우저 검증 및 CHECK 기록.
- [x] 전체 TODO 정합·commit·push.

## 조사 후 보완

실제 소비처는 `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx`의
`KpaEditModalSlot` 한 곳이다. 기존 `packages/operator-core-ui` 안의 KPA 전용 모달을
내부 정비하며 다른 서비스에 공통화하거나 `CommonEditUserModal`과 통합하지 않는다.
약사회 분회는 소비처가 아니며 수정하지 않는다. 공개 props·export·API·DB 계약은 유지한다.
현재 wrapper의 ID는 users.id이며 서버는 users/km/sm ID를 해석한다. 과거 주석의 km ID 전용 설명은 정정한다.
파일 경로 literal 검사에서는 과거 문서 5건만 발견됐고 활성 raw-source 테스트는 없다.

| 항목 | 발견 | 보완 작업·보존 조건 |
|---|---|---|
| F1/C1 | 16개 필드 비교와 payload 조립이 save handler에 중복 | 초기값·빈 값 해제 가능 필드·빈 값 보존 필드·주소 묶음을 구분한 순수 모델. legacy 읽기 fallback/canonical 쓰기 유지 |
| C1 | 미지정 회원 유형은 화면에서 pharmacist로 보이나 비교 기준은 빈 값 | 화면 초기값과 비교 기준 일치. 수정하지 않은 유형을 자동 저장하지 않음 |
| A1 | info 성공/status 실패 시 원본 props와 재비교하여 info 재전송 | 성공한 payload만 기준값에 반영, 남은 status만 재시도. 변경 초안 유지와 부분 성공 안내 |
| A1 | 저장 중 배경·X 닫기가 가능하고 동기 중복 방어 없음 | 저장 ref로 중복 차단, 모든 닫기 경로 잠금. 대상별 editor 수명으로 이전 응답 격리 |
| T1 | 입력 검증과 서버 실패가 한 catch에 혼재 | 변경 payload의 기존 API 길이/활동 유형 검증을 전송 전에 수행. 서버 오류 문구·warnings 보존 |
| A1 | 저장 후 목록 갱신 오류도 저장 실패로 오인 가능 | 저장 결과와 후속 callback 실패를 구분. 성공한 요청 재전송 없이 목록 갱신 재시도 |

이름·닉네임·면허·약국명·담당자명의 기존 빈 값 해제, 사업자번호 raw 전송,
연락처/대표자/세금 이메일/주소의 빈 값 보존, info→status 순서,
store_owner 부여 보류 경고, super_admin/탈퇴 보호 및 회원 유형 변경 권한을 유지한다.
상태별 허용 권한의 서버 집행을 변경하지 않는다. 일반 업무는 operator, 민감한 탈퇴/삭제는 admin 정책을 유지한다.
실계정 검증은 사용자가 담당한다. 모의 API와 가상 회원으로만 검증한다.

## 다음으로 미루는 범위

API/DB 트랜잭션 변경, 전체 계정 완전 제거, 공통 회원관리 재설계, 서비스 간 공통화,
약국 협력사업·행사 및 약사회 분회. 응답이 유실된 쓰기의 실제 성공 여부는 프런트만으로 보장할 수 없어 별도 API 멱등성 검토 대상이다.

## 조사 중 확인한 별도 API 권한 정합 항목

`MemberManagementPage`의 `canManageLifecycle`에는 kpa:operator가 포함되지만,
`member.controller.ts`의 PATCH status는 operator에게 active/rejected만 허용한다.
따라서 전용 회원 화면의 정지 액션은 노출돼도 기존 API가 403으로 거절한다.
또한 회원 유형 select의 canChangeMembershipType에도 canManageLifecycle를 전달하지만
서버 info는 유형 변경을 admin으로 제한한다. 공통 회원 상세와 전용 API의 권한/업무 차이를
후속 회원관리 API 차수에서 함께 조사한다. 이번 내부 정비로 이 문제가 해소됐다고 판정하지 않는다.

## 완료 근거

[CHECK](../checks/CHECK-KPA-PHARMACY-MEMBER-EDIT-WORKFLOW-V1.md)에 소비처·검증·남은 권한 정합과 push까지만인 전달 범위를 기록했다.
전체 운영자 TODO는 ACTIVE로 유지한다.
