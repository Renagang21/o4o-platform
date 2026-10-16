# 운영자 코드 단계별 정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: 사용자 요청 — 운영자 코드 복잡성 조사 → 전체 TODO → TODO 보완 → 단계별 작업

## 목적과 경계

전체를 한 번에 재작성하지 않는다. 1차에서 책임을 분리하고, 그 결과를 다시 조사해 2차를 확정한다.
각 차수 안에서도 검증 가능한 작은 작업 단위로 나눈다. 앞선 완료 단위는 통합 WO에 따라 main/배포됐으며 초기 종료 범위는 commit/push였으나 사용자 후속 요청으로 PR 정상 병합·필요한 배포까지 진행한다.
표시 정비 PR #544와 삭제 보완 PR #555는 main/CI 및 운영 배포 확인 완료다. 배포 보류 해소 근거는 아래 실행 상태와 삭제 CHECK를 따른다. 실계정 지정·재로그인·접근 검증은 사용자가 담당한다.

- 전체 관리자(`admin.neture.co.kr`)와 개별 서비스 운영자(`admin`, `operator`)를 구분한다.
- 일상 회원관리와 admin의 민감한 처리를 분리한 현재 권한 정책을 유지한다.
- 전체 계정 완전 제거는 별도 Core 작업이다.
- 약사회 분회는 제외한다. KPA-Society 약국 사업자 작업과 혼동하지 않는다.
- 공통 API·props·exports·역할·상태 전이·서비스별 원장을 유지한다.
- 요청 순서·중복 저장·부분 성공 방어를 복잡도 감소 목적으로 제거하지 않는다.
- 서비스 간 공통화와 기존 공통 모듈 후속 정비는 전체 정비 단계에서만 진행한다. 개별 서비스 내부 함수·책임 분리는 허용한다. KPA 회원 수정과 공통 회원 수정은 구조 차이를 유지한다.

근거 정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md),
[공통 회원관리 기준](../platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md).

## 조사 기준과 TODO 보완

최초 조사 기준 main은 `9400a625e`, 이번 1차 착수 기준 main은 `f66ed5f5f`다.
최초 조사 후보 183파일 중 36파일이 500줄 초과, 55파일의 84함수가 분기 복잡도 15 초과였다.
이는 ESLint cyclomatic complexity의 참고 측정이며, 저장소 CI 기준이나 Sonar cognitive complexity와 같지 않다.
파일 길이만으로 재작성 대상을 정하지 않는다.

매 작업 시작 시 최신 origin/main에서 파일·실제 소비처·기존 테스트·원문 검사 소비처를 다시 조사한다.
회원관리 보완·펀딩 단계 연결·소규모 업무 보완 및 1차/Neture 2차 일부는 [통합 WO](WO-O4O-OPERATOR-REFINEMENT-INTEGRATION-V1.md)에서 main/배포 완료를 확인한다.
이번 이후의 신규 미병합 branch는 자동 합치지 않고 해당 영역 착수 시 main 반영 여부와 파일 차이를 대조한다.

| 보완 항목 | 적용 방법 |
|---|---|
| 의존 관계 | 공통 회원 화면 → 입력·행동 분리 → 다른 공통 화면 → 서비스 화면 → API |
| 작업 크기 | 차수별 전체 작업을 한 commit에 넣지 않고 검증 가능한 단위로 push |
| 완료 기준 | 동작·권한·API 호환 유지 + 회귀 검증 + 실제 소비처 확인 + CHECK 기록 |
| 효과 확인 | 분리된 책임, 주요 함수 크기·분기, 상태 소유권을 전후 비교 |
| 재검토 | 파일 이동 후 남은 얽힘을 다시 조사하여 다음 작업 범위 갱신 |
| 중지 조건 | 새 권한·정책·DB 변경, 기능 제거, 서비스 원장 통합이 필요하면 별도 작업으로 분리 |

## 전체 TODO

아래의 차수는 권장 순서다. 차수 전체가 이번에 완료된다는 뜻이 아니다.

### 1차 — 공통 회원관리 책임 분리

- [x] 최신 main과 실제 공통 회원 콘솔 소비처 재조사.
- [x] 목록·통계 조회 및 읽기 상태를 내부 hook으로 분리.
- [x] 조회 이후 URL 초기 복원·검색/정렬·페이지·선택과 쓰기 수명 대조/보완 ([통합 WO](WO-O4O-SERVICE-MEMBERS-WORKFLOW-V1.md)). URL opt-in·기존 서버 정렬/현재 페이지 역할 필터 계약 유지.
- [x] 단건/일괄·실패 건 재시도·저장 후 조회 결과 분리와 동기 잠금 정비 ([CHECK](../checks/CHECK-O4O-SERVICE-MEMBERS-WORKFLOW-V1.md)). 수정/탈퇴 slot의 기존 서비스 차이·권한 유지.
- [ ] 상세 Drawer 표시·행동을 분리하고 서비스 확장 slot 유지.
- [ ] 공통 회원 수정의 변경값 계산과 입력 검증을 순수 함수로 분리.
- [x] 약국 사업자 회원 수정의 변경값 모델·단계별 저장 결과·실패 재시도 정비 ([WO](WO-KPA-PHARMACY-MEMBER-EDIT-WORKFLOW-V1.md)). 이번 종료는 commit/push, main·배포 제외.
- [ ] 공통 회원 상세의 조회·표시·행동 분리 검토.
- [ ] 차수 종료 재조사: 남은 복잡성과 2차 선행 조건 확정.

최초 작업은 조회 분리까지였으며 2026-10-15 후속으로 공통 회원 운영 수명·실패 복구를 정비했다. 상세 표시·수정 모델의 추가 구조 분리와 API 정비는 위 미완료 항목으로 유지한다.

### 2차 — 공통 화면과 요청 처리 정비

2026-10-15 자료·문의 통합 정비는 개발 검증·push/PR 인계 범위다. main 병합·배포는 통합 담당 소관이며 새 권한/API/DB·상태 전이는 변경하지 않는다.

- [x] 자료관리: 목록·검색/선택·편집 요청 수명과 처리/갱신 결과 첫 정비 ([통합 WO](WO-O4O-OPERATOR-RESOURCES-INQUIRIES-WORKFLOW-V1.md)). 상세 표시·AI 신규 통합은 후속 판단이며 기존 옵션 계약 유지.
- [x] 자료관리: 필터 응답 역전·숨은 선택·이전 확인창·저장 후 조회 실패와 페이지 보정 회귀/보완 ([CHECK](../checks/CHECK-O4O-OPERATOR-RESOURCES-INQUIRIES-WORKFLOW-V1.md)).
- [x] 문의관리: 강의 문의·약국 협업 문의·Neture 문의 메시지의 조회/처리/부분 성공·입력/결과·재시도 정비 ([통합 WO](WO-O4O-OPERATOR-RESOURCES-INQUIRIES-WORKFLOW-V1.md)). 서브도메인 운영자 범위이며 중앙 관리자·약사회 분회 제외.
- [x] 약국 협력사업: 담당 사업 조회·심사와 콘텐츠 편집/제출 책임 분리, 사업 전환·실패 사유 보존 정비 ([WO](WO-PHARMACY-PROGRAM-WORKFLOW-REFINEMENT-V1.md), push/PR 인계).
- [ ] Neture `useLatestRequest`, 강의 `useOperatorQueue`, 직접 작성한 수명 관리 코드 비교.
- [ ] 서비스 간 공통화는 사용자 확정에 따라 전체 정비 단계에서만 판단. 개별 서비스 작업에서는 후보만 기록.
- [ ] 포럼 카테고리·상품 신청·커뮤니티 공통 화면의 실제 소비처 재조사 후 개별 작업 크기 확정.
- [ ] 최소 2개 소비처 검증 후 차수 종료 재조사.

### 3차 — 서비스·업무별 대형 화면 정비

- [x] Neture 상품 승인: 요청값·선택 함수, 승인/거절 실행 절차·실패 UX·조회 수명 정비 및 main/배포.
- [x] Neture 상품 승인: 상세/입력/품질 표시 분리 (이번 [TODO](WO-NETURE-PRODUCT-APPROVAL-PRESENTATION-V1.md)).
- [x] Neture 상품 승인: 승인대기 삭제 실패·대상 보존 검증 및 정비 ([TODO](WO-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md), PR #555 main/CI·운영 배포 확인 완료).
- [x] Neture 상품 승인: 승인 상품 휴지통 오류 처리·목록/분석 책임 분리 완료 ([통합 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md), PR #570 main·CI·운영 배포 확인 완료).
- [ ] Neture 등록 상품·가입 신청: 실제 경로와 상태 전이 대조 후 조회/행동 분리.
- [x] 공급자 승인: 상세·서류 표시·입력 모델·심사 요청 수명 분리와 사유/오류 보존 정비 완료 ([통합 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md), PR #570 main·CI·운영 배포 확인 완료).
- [ ] 약국 사업 행사: 운영자 행사/모집 조건 심사는 [첫 정비](WO-PHARMACY-PROGRAM-WORKFLOW-REFINEMENT-V1.md) 완료. 공급자 행사 작성·참여 승인 화면 자체의 책임 분리는 후속.
- [x] 펀딩 심사 상세: 심사·단계/포럼 복구·입금/이행·CSV·KPI 요청 책임 분리, 동기 쓰기 잠금·저장 후 조회 실패 복구 정비 ([WO](WO-FUNDING-OPERATOR-WORKFLOW-REFINEMENT-V1.md)). 이번 종료는 push/PR 인계이며 main 병합·배포는 통합 담당.
- [x] 펀딩 개설자/운영자 계약 대조: supplier API·개설 진행/포럼 회원 관리와 operator API·심사/입금 확인은 별도 책임. 이번 작업에서 합치지 않음 ([조사](WO-FUNDING-OPERATOR-WORKFLOW-REFINEMENT-V1.md)). 개설자 화면 자체의 구조 정비는 별도 후속.
- [x] 강의: 심사 목록/검토·문의 어댑터/기존 문의·수료증 요청/입력/결과 흐름 정비 ([WO](WO-LECTURE-OPERATOR-WORKFLOW-REFINEMENT-V1.md)). push/PR 인계이며 main 병합·배포는 통합 담당.
- [ ] 강의 수료증 폐기 사유 서버 보관·감사 이력: 현재 서버가 reason을 소비하지 않음. 별도 API/DB·보유 정책 작업.
- [x] 개별 커뮤니티: 가입·제재·탈퇴·이력 책임 분리 및 실패 입력/대상·중복/늦은 응답·저장 후 재조회 정비 ([WO](WO-O4O-COMMUNITY-MEMBER-WORKFLOW-REFINEMENT-V1.md), 개발 검증·push/PR 인계 상태는 WO/CHECK에서 구분).
- [ ] 전체 관리자 지정 화면: 검색·대상 선택·지정/회수·가입 상태 안내 분리.
- [ ] 업무별 완료 후 재조사. 약사회 분회는 추가하지 않음.

### 4차 — 회원관리 API 정비 (별도 검증 범위)

- [ ] MembershipConsoleController: 상태 변경의 단건/일괄 중복 절차 정리.
- [ ] 수정·역할 변경의 요청 검증과 서비스 경계/권한 판정 분리.
- [ ] MembershipApprovalService: 상태 전이·복구·탈퇴 트랜잭션 경계 대조.
- [ ] 공통 계정과 서비스 회원 원장 변경 범위에 대한 회귀 검증.
- [ ] demo 보호, 마지막 admin 보호, 서로 다른 서비스 영향 방지 조건 보존 확인.
- [ ] 현재 동작과 맞지 않는 과거 주석을 같은 작업 범위에서 정정.
- [ ] API 응답·오류 코드·부분 실패·일괄 결과 호환 검증.
- [ ] DB/schema 변경이 필요하면 이 차수에서 시행하지 않고 별도 Core 작업으로 분리.

### 별도 대형 업무 — 코드 정비와 분리

- [ ] 전체 계정 완전 제거.
- [ ] 커뮤니티 신고·숨김/복구·소유자 승계·이력 보존 집행.
- [ ] 공급자 서류/상품 심사/처리 이력을 연결한 새 업무 흐름.
- [ ] 강의 수료 평가·일괄/자동 수료증 발급.
- [ ] 서비스 재배치 및 담당자 처리 결과→참여자/내 매장 전체 실계정 흐름 확인.

새 업무 설계는 구조 정비 완료의 조건으로 끼워 넣지 않는다. 각 업무는 별도 TODO/WO로 관리한다.

## 1차 첫 작업 기록

변경: `OperatorMembersConsolePage`의 목록·통계 읽기 상태와 자동 조회를
내부 `useMembersConsoleQuery`로 이동한다. 외부 props와 서비스 adapter 계약은 유지한다.
검색·URL·정렬 입력, 선택, 단건/일괄 행동, 권한과 모달은 기존 화면에 남긴다.

검증과 소비처 매트릭스는 [CHECK](../checks/CHECK-O4O-OPERATOR-CODE-REFINEMENT-PHASE1-V1.md)에 기록한다.
전체 TODO는 ACTIVE로 유지한다. 조회 분리 완료가 1차 전체 완료를 뜻하지 않는다.

### 2026-10-14 실행 상태

PR #544·#555의 main CI 및 운영 배포 확인이 완료됐다. 선행 PR #557과 API/migration 배포는 Promote `38497933074`에서 완료됐고, 의존 Neture 배포 및 후속 Neture Delivery `38499037614`도 실제 deploy/serving Report가 통과했다. 최신 조사 main `6eeea05a2` Delivery `38500377113`은 NO_DEPLOY다. 과거 API 의존 보류는 해소됐다.
삭제 실패·대상 보존 WO의 실제 판정 기록을 따른다. 다음 운영자 정비는 승인 상품 휴지통 이동 오류 처리, 이후 목록/분석 상태 책임 조사다. 서비스 간 공통화와 약사회 분회는 제외한다.

### 2026-10-14 상품·공급자 승인 통합 정비 착수

사용자 요청에 따라 함수/모달 단위로 종료하지 않고 두 승인 화면의 책임·실패·재시도를 하나의 업무 묶음으로 정비한다. [이번 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md)의 조사 후 보완 TODO를 따른다. 서비스 간 공통화와 약사회 분회는 제외한다.

### 상품·공급자 승인 통합 정비 결과

[이번 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md)의 두 승인 업무 정비를 하나의 묶음으로 완료했다. PR #570·main CI·Neture [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38507211952) 운영 반영을 확인했다. 전체 운영자 TODO는 ACTIVE이며, 다음 조사 큐는 약국 사업자 회원관리의 변경값·검증·순차 저장 결과다. 서비스 간 공통화와 약사회 분회는 제외한다.

### 약국 사업자 회원 수정 실행 상태

[WO](WO-KPA-PHARMACY-MEMBER-EDIT-WORKFLOW-V1.md)의 입력·검증·info/status 순차 저장을 한 묶음으로 정비했다.
공개 export/props·API·DB 변경 없이 KPA 전용 모델/hook을 분리하고 부분 성공 후 재전송을 방지한다.
전체 TODO는 ACTIVE이며 약사회 분회·서비스 간 공통화는 제외한다.
다음 회원관리 API 정비에서는 KPA 전용 status의 operator 정지 차단과
회원 유형 select/API 권한 불일치를 공통 상세·단건·일괄 경로와 함께 확인한다.
로컬/fixture 검증과 실계정 검증(사용자 담당)은 구분한다. main 병합·배포는 실행하지 않는다.

### KPA 일상 회원관리 권한 후속 결과

[전용 WO](WO-KPA-MEMBER-DAILY-AUTHORITY-ALIGNMENT-V1.md)에서 앞서 발견한 정지·복구/회원 유형 권한 불일치를 해소했다.
모달의 일상 상태 선택과 admin 민감 상태 선택도 분리한다. 선행 회원 수정 정비를 새 branch에 포함하며
두 작업의 main 병합·배포는 아직 하지 않는다. 약사회 분회는 제외한다.

### 협력사업 운영자 정비 인계

[WO](WO-PHARMACY-PROGRAM-WORKFLOW-REFINEMENT-V1.md)에서 조회·확인/사유 입력·처리/재조회와
콘텐츠 초안/요청값/저장 수명을 분리했다. API/DB·권한·모집 참여 주체·이벤트 가격/인덱스는 변경하지 않았다.
전체 TODO는 ACTIVE다. 공급자 참여 심사 화면과 실계정 내 매장 반영 검증은 완료로 표시하지 않는다.
종료는 push/PR이며 통합·배포는 별도 담당 공간에서 진행한다.

### PR #579 잠금 상태 리뷰 보완

권한은 최신 잠금 상태를 확인했으나 승인/복구·가입일·이력/알림이 잠금 전 상태를 사용하던 경합을
[리뷰 보완 WO](WO-KPA-MEMBER-LOCKED-STATUS-REVIEW-FIX-V1.md)로 수정했다. API 회귀 148건·빌드 PASS.
기존 PR에 추가 push 후 통합 담당에게 재인계하며 main 병합·운영 반영 완료로 표시하지 않는다.

### 2026-10-15 개별 커뮤니티 회원 운영 정비

[이번 WO](WO-O4O-COMMUNITY-MEMBER-WORKFLOW-REFINEMENT-V1.md)와 [CHECK](../checks/CHECK-O4O-COMMUNITY-MEMBER-WORKFLOW-REFINEMENT-V1.md)에서 가입 심사·제재·관리 탈퇴·이력 조회를 하나의 운영 흐름으로 정비했다.
사유 입력과 실패 재시도, 저장 성공/목록 갱신 실패를 분리하며 권한·마지막 admin 보호·기존 API를 유지한다.
서비스 간 공통화·신고·소유자 승계·자동 이력 삭제·약사회 분회는 제외한다. main/운영 반영은 이번 개발 완료 판정에 포함하지 않는다.
강의 PR #587은 앞선 공간에서 전달된 별도 작업이며 이번 diff에서 강의 코드를 수정하지 않는다.

### 2026-10-15 서브도메인 운영자 실패 복구 통합 정비

사용자 후속 지시로 전체 관리자 지정 화면은 다른 담당자에게 남기고, 약국 상품 신청·포럼 목록 및
커뮤니티 개설 심사의 확인된 5건을 [통합 WO](WO-O4O-SUBDOMAIN-OPERATOR-RECOVERY-V1.md)로 묶었다.
상품 처리 실패의 대상·사유 보존, 목록 응답 역전 방어, 포럼 오류 전달·재조회,
커뮤니티 반려 입력 보존 및 저장 성공/조회 실패 구분을 보완했다.
공통 UI의 약국·Neture 활성 소비처와 등록 신청 확인 모달을 함께 검증했다.
[검증 기록](../checks/CHECK-O4O-SUBDOMAIN-OPERATOR-RECOVERY-V1.md)을 따른다.
전체 TODO는 ACTIVE이며, 이 작업 종료는 push/PR 인계다. 중앙 관리자·약사회 분회·새 정책/DB 변경과
강의 수료증 폐기 사유 서버 보관은 이 작업에서 완료로 표시하지 않는다. main 병합·배포는 통합 담당 소관이다.

### 2026-10-15 기능 재점검 후 가입·콘텐츠 승인·포럼 변경 보완

[후속 WO](WO-O4O-OPERATOR-REMAINING-RECOVERY-V1.md)는 가입 반려 사유 초기화·일괄 일부 실패의 전부 성공 표시,
KPA 제공 콘텐츠 목록 응답 역전, 포럼 변경/삭제 검사·재시도 수명을 한 묶음으로 정비한다.
선행 #612를 개발 branch에 포함하고 최신 main의 TODO 문서 충돌은 양쪽 기록을 보존해 해결했다.
후속 PR과 #612의 변경은 중복되므로 통합 담당은 하나의 통합 경로를 선택한다.
자료·문의 #616, 공통 서비스 회원 #628은 별도 미병합 PR이며 이번 변경에 포함하지 않았다.
강의 폐기 사유 서버 저장, 커뮤니티 신고·승계·이력 자동 파기 및 실계정 업무 검증은 여전히 별도 후속이다.
이번 검증과 한계는 [CHECK](../checks/CHECK-O4O-OPERATOR-REMAINING-RECOVERY-V1.md)를 따른다.
