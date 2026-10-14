# 운영자 코드 복잡성 2차 — 항목별 조사·정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-14
> **근거 WO/IR**: 사용자 요청 — 항목별 조사, TODO 작성 → TODO 보완 → 작업 → push

## 방향과 범위

이 문서의 2차는 1차 조회 분리 이후의 항목별 정비다. 앞선 서비스군별 권장 차수를 기계적으로 따르지 않는다.
서비스 안에서 조사하되 발견 사항은 정비 항목별로 분류한다. 사용자 후속 요청에 따라 화면의 업무 흐름을 기준으로 묶어 완료하며, 함수·모달 하나씩을 별도 작업 종료점으로 삼지 않는다.
이번 첫 작업은 Neture 가입 신청 화면의 읽기 모델·필터·중복 대상 판정이다.
전체 TODO는 개별 작업 완료 후에도 ACTIVE다. 초기 종료 범위는 push였으며, 사용자 후속 요청으로 PR 정상 병합·필요한 배포까지 진행한다. 표시 정비 PR #544와 삭제 보완 PR #555는 main/CI 및 운영 배포 확인 완료다. 배포 보류 해소 근거는 아래 실행 상태와 삭제 CHECK를 따른다. 앞선 작업은 통합 PR #538과 배포 완료 기록을 기준으로 구분한다.

사용자 확정: **서비스 간 공통화는 개별 서비스 작업에서 구현하지 않고 전체 정비 때 진행한다.**
비슷한 코드를 발견하면 동일 업무 규칙인지 기록한다. 개별 정비에서 새 공유 패키지·서비스 분기형 공통 콘솔을 만들지 않는다.
기존 공통 모듈 변경도 소비처 전체를 확인하는 전체 정비 작업으로 별도 분리한다.
개별 서비스 내부에서 검증·값 계산·표시 모델을 함수로 추출하는 것은 진행한다.

- 약사회 분회 제외. KPA-Society 약국 사업자와 구분한다.
- 전체 관리자와 개별 서비스 admin/operator의 기존 권한 경계 유지.
- 새 정책·상태 전이·API·DB 변경, 기능 제거는 이 구조 정비에 섞지 않는다.
- 요청 순서·중복 저장·부분 성공 방어를 단순화 목적으로 삭제하지 않는다.
- 실계정 지정·재로그인·접근 검증은 사용자 담당이다.
- 각 작업은 최신 main에서 재조사한다. 미병합된 다른 branch를 자동 합치지 않는다.

기준 정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).
앞선 1차 기록은 branch `wo/operator-refactor-phase1`, commit `d71ac8e19`에 있다.
그 TODO의 조기 공통화 제안보다 이번 사용자 지시가 우선하며, 아래 전체 정비 후보로 이관한다.

## 조사 항목과 전체 TODO

| ID | 항목 | 조사 질문 | 정비/판정 기준 | 상태 |
|---|---|---|---|---|
| D1 | 중복 코드 | 내용뿐 아니라 변경 이유·입력·결과·권한도 같은가? | 서비스 내부의 실제 동일 판정 정리, 서비스 간은 후보 기록 | Neture 가입·상품 승인 일부 완료, 타 영역 대기 |
| F1 | 함수 추출 | 변환·검증·계산·요청값 조립이 화면/handler에 섞였는가? | 입력/결과가 명확한 서비스 내부 함수 | Neture 가입·상품 승인 일부 완료, 타 영역 대기 |
| R1 | 책임 분리 | 조회·입력·상세 표시·심사를 한 컴포넌트가 맡는가? | 업무 목적이 명확한 컴포넌트/hook, 단순 파일 분할 금지 | Neture 상품 상세·결정 입력 첫 정비 완료, 타 영역 대기 |
| C1 | 조건문/권한 | 중첩·반복 조건과 권한 판정이 섞였는가? | 조건 의미를 명시하고 기존 보호·경계 유지 | 대기 |
| S1 | 상태 | 중복·파생·모순되는 상태와 동기화가 있는가? | 소유권과 전이 정의, 계산 가능한 값의 중복 저장 검토 | 대기 |
| A1 | 비동기 | 늦은 응답·중복 요청·실패/부분 성공·재시도가 얽혔는가? | 실제 재현과 결과 유지부터, 방어 보존 | Neture 상품 승인 완료, 타 영역 대기 |
| N1 | 이름/주석/불필요 코드 | 이름·주석이 현재 동작과 일치하는가? | 실제 소비처·테스트 계약 확인 후 같은 범위에서 정리 | 대기 |
| T1 | 검증 가능성 | 동작 유지와 수정 결과를 확인할 수 있는가? | API 요청·표시·실패 결과의 회귀 검증 | 첫 작업 검증, 작업마다 반복 |

각 발견 기록: **ID → 위치 → 복잡한 이유 → 수정 방법 → 보존 조건 → 검증 → 개별 작업/전체 정비 후보**.
줄 수·분기 수는 참고다. 감소를 위해 코드 의미를 압축하거나 작은 함수로 무조건 쪼개지 않는다.

### 서비스/업무별 조사 큐

- [x] Neture 가입 신청: D1/F1/T1 최초 조사와 첫 정비.
- [x] Neture 상품 승인: 요청값·pending 선택, 결정 실행·실패 UX, 조회/분석/검색 수명 정비 및 main/배포 완료.
- [x] Neture 상품 승인: 상세 Drawer·결정 입력·품질 표시의 R1/F1 정비 ([이번 TODO](WO-NETURE-PRODUCT-APPROVAL-PRESENTATION-V1.md)).
- [x] Neture 상품 승인: 승인대기 상품 삭제 실패·대상 보존·재시도 검증 및 정비 ([TODO](WO-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md), PR #555 main/CI·운영 배포 확인 완료).
- [x] Neture 상품 승인: 승인 상품 휴지통 이동 오류 처리, 목록/분석 상태 책임 분리 구현·로컬 검증 ([통합 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md), PR #570 main·CI·운영 배포 확인 완료).
- [x] Neture 공급자 승인: 심사 입력·서류 표시·요청 수명 C1/R1/A1 정비·로컬 검증 ([통합 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md), PR #570 main·CI·운영 배포 확인 완료).
- [ ] 약국 사업자 회원관리: 필드 변경값·검증·순차 저장 결과 F1/C1/A1 조사.
- [x] 약국 협력사업 운영자: 담당 사업 조회·행사/모집 조건 심사·콘텐츠 편집의 R1/S1/A1 조사·첫 정비 ([WO](WO-PHARMACY-PROGRAM-WORKFLOW-REFINEMENT-V1.md)). 공급자 참여 심사 화면은 별도 후속. 종료는 push/PR 인계.
- [ ] 펀딩: 단계별 안내·상태 변경·참여/KPI 갱신 F1/R1/A1 조사. 단계 연결은 main/배포 완료; 구조 분리는 별도.
- [ ] 강의: 문의·심사·수료증 입력/처리/결과 R1/S1/A1 조사. 오류 보완은 main/배포 완료; 구조 분리는 별도.
- [ ] 개별 커뮤니티: 가입·제재·탈퇴·이력 C1/R1 조사. 새 신고/승계 정책 설계는 별도.
- [ ] 전체 관리자 지정 화면: 검색·대상 선택·지정/회수·가입 안내 R1/S1 조사.
- [ ] 회원관리 API: 단건/일괄 중복과 서비스 경계·트랜잭션 D1/C1 조사. 별도 검증 작업.

위 큐는 조사·후속 정비 대상이며 한 번에 모두 수정하지 않는다. 다음 작업 착수 시 최신 코드로 위치를 다시 산출한다.

### 전체 정비 때 판단할 후보 (개별 서비스에서 구현 금지)

- [ ] 서비스별 요청 수명 관리 패턴 비교 (`useLatestRequest`, `useOperatorQueue`, inline guards).
- [ ] 목록/선택/일괄 처리 결과의 동일 계약과 서비스 차이 대조.
- [ ] 공통 회원·자료·문의·협력사업 모듈 전체 소비처와 상태 소유권 조사.
- [ ] 공통화가 조건/옵션·결합도를 늘리는지 확인하고 동일 규칙만 대상으로 확정.
- [ ] 공통 패키지 변경 시 최소 2개 소비처와 개별 서비스 차이를 검증하는 별도 WO.

## 첫 작업: 조사 후 TODO 보완

착수 기준 `origin/main f66ed5f5f8e6198e0043053b24cae6230ffa96cf`.
`RegistrationRequestsPage`는 `/operator/applications`에서 실행되며,
응답 변환이 조회 함수 안에, 필터가 화면 안에 있고, pending 선택 판정이 3곳에 반복돼 있다.
수정 파일 경로를 대상으로 원문 소비처를 검색한 결과 살아 있는 raw-source 계약은 없다.

| 위치/발견 | 보완된 작업 | 반드시 유지할 동작 |
|---|---|---|
| fetchRequests의 API 응답 변환 | Neture 내부 `mapRegistrationRequest`로 추출 | 사업자 필드·메모·처리 결과 보존, role/service fallback, 날짜 없는 경우만 현재 시각 |
| filteredRequests의 검색/상태/유형 조건 | `filterRegistrationRequests`로 추출 | 대소문자 무시, 공백 trim 안 함, 이름/이메일/회사명 검색, ALL 의미 |
| bulk approve/reject·선택 pending count | `getSelectedPendingRegistrationIds`와 단일 파생 목록 | 알려진 PENDING만, 선택 순서 유지, 필터로 가려진 기존 선택을 임의 삭제하지 않음 |
| 승인·반려·메모 handler | 이번 작업에서는 기존 실행 흐름 유지 | API·사유·알림·오류 메시지·성공 후 재조회 유지 |

### 첫 작업 완료 체크

- [x] TODO 작성과 실제 코드/route/소비처 조사.
- [x] 보존 조건과 예외·검증을 TODO에 보완.
- [x] 서비스 내부 모델·필터·pending 판정 함수 추출, 중복 판정 정리.
- [x] 단위/화면 회귀·타입·production build·browser 검증.
- [x] CHECK 기록과 commit/push.

검증 결과: [CHECK](../checks/CHECK-O4O-OPERATOR-COMPLEXITY-PHASE2-NETURE-REGISTRATIONS-V1.md).

## 방법론 근거

이전 방향 조사에서 확인한 공개 자료를 실무 기준으로 적용한다. 커뮤니티 전체의 합의나 무조건적인 규칙으로 해석하지 않는다.

- [Kent C. Dodds — AHA Programming](https://github.com/kentcdodds/kentcdodds.com/blob/main/services/site/content/blog/aha-programming.mdx): 성급한 추상화보다 실제 사용 사례와 차이 확인.
- [Google — What to look for in a code review](https://github.com/google/eng-practices/blob/master/review/reviewer/looking-for.md): 이해·변경하기 쉬운 설계, 과도한 일반화 경계.
- [Google — Small CLs](https://github.com/google/eng-practices/blob/master/review/developer/small-cls.md): 하나의 목적과 동작 가능한 작은 변경.
- [React — Choosing the State Structure](https://github.com/reactjs/react.dev/blob/main/src/content/learn/choosing-the-state-structure.md): 중복·파생·모순 상태 감소.
- [React — Reusing Logic with Custom Hooks](https://github.com/reactjs/react.dev/blob/main/src/content/learn/reusing-logic-with-custom-hooks.md): 구체적인 목적의 hook, 모든 작은 중복 추출 불필요.

## 후속과 문서 정합

가입 요청과 상품 승인 요청값/선택·실패 UX·조회 수명 작업은 [통합 WO](WO-O4O-OPERATOR-REFINEMENT-INTEGRATION-V1.md)에서 main/배포 완료를 확인한다.
이번 R1 표시·입력 정비는 별도 push 단위다. 공통 회원관리의 남은 구조 정비와 공통 모듈 비교·공통화는 전체 정비 단계로 유지한다.
API 대규모 정비, 전체 계정 제거, 커뮤니티 새 업무, 공급자 전체 심사 동선, 수료증 자동화는 별도 작업이다.
과거 개별 WO/CHECK의 당시 push·미병합 기록은 재작성하지 않는다. 현재 권한 정책은 공통 회원관리 정본과 사용자 확정 정책을 따른다.

### 2026-10-14 실행 상태

PR #544·#555의 main CI 및 운영 배포 확인이 완료됐다. 선행 PR #557과 API/migration 배포는 Promote `38497933074`에서 완료됐고, 의존 Neture 배포 및 후속 Neture Delivery `38499037614`도 실제 deploy/serving Report가 통과했다. 최신 조사 main `6eeea05a2` Delivery `38500377113`은 NO_DEPLOY다. 과거 API 의존 보류는 해소됐다.
삭제 실패·대상 보존 WO의 실제 판정 기록을 따른다. 다음 운영자 정비는 승인 상품 휴지통 이동 오류 처리, 이후 목록/분석 상태 책임 조사다. 서비스 간 공통화와 약사회 분회는 제외한다.

### 2026-10-14 상품·공급자 승인 통합 정비 착수

사용자 요청에 따라 함수/모달 단위로 종료하지 않고 두 승인 화면의 책임·실패·재시도를 하나의 업무 묶음으로 정비한다. [이번 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md)의 조사 후 보완 TODO를 따른다. 서비스 간 공통화와 약사회 분회는 제외한다.

### 상품·공급자 승인 통합 정비 결과

[이번 WO](WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md)의 두 승인 업무 정비를 하나의 묶음으로 완료했다. PR #570·main CI·Neture [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38507211952) 운영 반영을 확인했다. 전체 운영자 TODO는 ACTIVE이며, 다음 조사 큐는 약국 사업자 회원관리의 변경값·검증·순차 저장 결과다. 서비스 간 공통화와 약사회 분회는 제외한다.

### 협력사업·행사 운영 흐름 정비 결과

기존 공유 모듈의 조회/심사 수명과 콘텐츠 초안/저장 수명을 분리했다.
Neture 전체 담당 사업과 약국 사업자 businessKey=pharmacy 소비처를 함께 검증했다.
실패 사유·대상 보존, 성공 후 조회만 재시도, 이전 사업 요청 무효화를 정비했다.
모집 조건 승인(운영자)과 참여 승인(공급자)은 분리하며 공급자 참여 심사 화면 자체는 후속이다.
[CHECK](../checks/CHECK-PHARMACY-PROGRAM-WORKFLOW-REFINEMENT-V1.md)에 검증·참여/내 매장 연결·인계 범위를 기록한다.
개발 담당은 push/PR까지, 통합·배포는 별도 담당 공간에서 진행한다. 약사회 분회는 제외한다.
