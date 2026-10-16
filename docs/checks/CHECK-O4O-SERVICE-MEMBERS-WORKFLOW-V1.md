# 서비스 회원관리 운영 흐름 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: [통합 WO](../work-orders/WO-O4O-SERVICE-MEMBERS-WORKFLOW-V1.md)

## 범위·판정

기준 main `352df65dd`, branch `wo/service-members-workflow`.
서비스 회원 목록→선택/상세→단건/일괄 처리·공통 수정→조회 복구 흐름을 통합 정비했다.
[회원 표준](../platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md)·[역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)을 유지한다.
중앙 관리자·약사회 분회·약국 전용 수정/개별 커뮤니티 재작성·권한/역할/API/DB·운영 변경은 없다.

| 확인/보완 | 결과 |
|---|---|
| 목록·통계의 늦은 이전 응답 | 수정 전 목록 필터/클라이언트 역전 2개 회귀 실패로 재현. 채널별 최신 요청·수명 판정, 통계 오류 별도 표시/재조회 |
| 검색·정렬·URL·선택 | URL 초기 복원/기존 replace sync·관계없는 query 유지. 명시적 조건 변경 시 선택/대상/이전 안내 초기화, 자동 페이지 보정은 처리 안내 유지 |
| 단건/일괄·확장 행동 | 동기 쓰기 잠금, 저장 후 목록/통계까지 대기. 부분 성공의 실패 ID만 재시도. 확장 행동의 API·오류 소유권은 서비스 유지 |
| 반려/실패와 갱신 | 상세 안의 실패 대상/사유 유지, 필수 반려 사유 guard를 일반 회원 모드에도 일치. 성공과 후속 조회 실패 구분 및 읽기만 재시도 |
| 공통 수정창 | 회원/서비스별 요청 수명·미조회 저장 차단·실패 입력/서버 사유 보존·중복 제출·저장 중 닫기 보호. 공개 역할 옵션·사업자/선택 분류 계약 유지 |
| 서비스 탈퇴 확인 | 실행 중 중복·Escape/닫기 보호, 실패 사유를 대상 문구에 유지, unmount 뒤 완료 콜백 방지. 기존 soft delete 범위·서버 권한 그대로 |

## 실제 소비처·계약

- 콘솔: Neture UsersManagementPage, 약국 MemberManagementPage, ServiceMembersWorkspace.
- workspace: 공급자·펀딩·커뮤니티 ServiceMembersPage와 강의 OperatorMembersPage.
- 공통 수정창: Neture EditUserModal과 서비스 workspace. 약국은 KpaEditUserModal 그대로.
- 단순 서비스 탈퇴 flow: Neture UsersManagementPage와 서비스 workspace.
- 전체 저장소 import/심볼·API/파일명 리터럴·`check-literal-consumers.mjs --source` 대조.
  콘솔·공통 수정창·단순 탈퇴 파일 경로에 의존하는 활성 원문 검사 계약 0. 기존 회귀를 삭제·완화하지 않았다.
- 승인 전용 모드의 수정/삭제/일괄 차단 유지. 서비스별 client/확장 slot·선택 stats/listAll 계약 유지.
  role 탭은 기존처럼 현재 페이지 내 필터다. 서버 역할 필터·새 API를 만들지 않는다.
- 공통 전체 상세 UserDetailPage·중앙 관리자·일반화된 삭제 컴포넌트는 수정하지 않았다.
  운영 tier 지정·전체 계정 복구/삭제를 서비스 회원 관리로 열지 않는다.

## 자동 검증

중복 실행을 중복 산입하지 않은 **453개 PASS**, 신규·확장 업무 회귀 21개 포함.

| 실행 | 결과 |
|---|---:|
| operator-core-ui 전체 Vitest | 13파일 114개 |
| 약국 전체 Vitest | 18파일 145개 |
| 강의 전체 Vitest | 10파일 40개 |
| Neture SubdomainOperatorEntryLinks + SubdomainOperatorRoute | 2파일 53개 |
| API Jest: member-management-policy / membership-read-guard.contract / member.controller.writeAtomicity | 3파일 101개 |

- 신규 21개: 조회 4개, 콘솔 12개, 공통 수정/단순 탈퇴 5개.
- 상태/서비스 payload, 승인 모드, URL 초기 복원, 실패 사유/입력, 중복·unmount·역전,
  부분 성공·실패 ID 재시도, 저장 후 조회 분리·마지막 페이지 보정 회귀를 확인했다.
- 기존 회원 권한·서비스 경계·KPA 쓰기 원자성 회귀를 실행했다. backend 보호를 바꾸지 않는다.
- Node 22.18.0 / pnpm 10.25.0 frozen install·build:packages, operator-core-ui 타입 검사,
  Neture·약국·강의 타입/production build, 변경 파일 ESLint 경고 0 통과. 의존성/lockfile 변경 없음.
- 큰 chunk·기존 Browserslist 데이터 안내는 빌드 실패가 아니며 관련 없는 설정을 변경하지 않았다.

## PC·모바일 실제 빌드

Chromium, 1440×1000 / 390×844. 모든 요청을 가로채 자산은 로컬 preview, API는 가상 응답으로 처리했다.
실계정·운영 API/DB 검증이 아니다.

- supplier/funding/community: `/operator/service-members/{key}`.
- lecture·Neture·약국: 각 호스트 `/operator/members`.
- 여섯 소비처 각각 목록 장애→다시 조회→승인 실패의 대상/오류 유지→재시도 성공→목록 갱신 장애→읽기만 복구.
  각 시나리오 상태 쓰기는 실패 1회+성공 1회이며 조회 재시도는 쓰기를 반복하지 않는다.
- 공통 수정창: 공급자·강의·Neture에서 수정 실패→입력 유지→같은 대상 재시도. 각 PUT 실패 1회+성공 1회.
- 12개 소비처/viewport 시나리오 pageerror 0·문서 가로 넘침 0. 모바일 표는 내부 스크롤.
  스크린샷 30장·결과 JSON은 작업공간 검증 산출물에 보관한다.

## 문서 정합·후속·인계

전체 TODO·WO·CHECK를 연결했다. 조회/처리 복구의 완료와 상세 표시·수정 모델·API의 남은 구조 정비를 구분했다.
정본·canonical index 변경 없음. 신규 정책·서버 멱등성·공통 전체 상세 변경은 별도 후속이다.
개발 종료는 commit/push·PR. PR URL·최신 CI는 PR/완료 보고에 기록하며 main 병합·배포는 통합 담당 소관이다.
전용 worktree는 미병합 후속 수정용 KEEP. 타 세션 파일·branch를 변경하지 않는다.


## 2026-10-16 통합 후속 — Consumer Impact Matrix

원개발 검증은 위453 PASS 및12개 PC/mobile fixture 시나리오의 소비처별 대응이다. 통합 재검증은 기존 결과와 구분해 후속으로 기록한다.

| 소비처 | 사용 여부·변경 영향 | route / role / capability 영향 | 검증 방식·기록된 결과 |
|---|---|---|---|
| Neture | UsersManagementPage의 공통 콘솔·EditUserModal·soft delete flow, 조회/쓰기 수명·입력 보존 | `/operator/members`, 기존 운영자 guard·역할 옵션·soft delete 범위 유지 | 공통 회귀·진입53개, PC/mobile 목록/승인 실패 복구·수정 입력 재시도 PASS |
| 약국(KPA 앱) | MemberManagementPage의 공통 콘솔, KpaEditUserModal은 기존 구현 유지 | `/operator/members`, 약국 승인/복구·마지막 관리자 보호·확장 slot 유지 | 약국145개 및 API 권한/쓰기 원자성, PC/mobile 처리/조회 분리 PASS |
| 강의 | OperatorMembersPage → ServiceMembersWorkspace → 공통 콘솔·수정창 | 강의 `/operator/members`, 기존 강의 membership/role guard와 API 유지 | 강의40개, PC/mobile 목록·처리 복구 및 공통 수정 실패 입력 유지 PASS |
| 공급자 | ServiceMembersPage → ServiceMembersWorkspace | `/operator/service-members/supplier`, 기존 공급자 지정 운영자·승인 전용 제한 유지 | 공통114개 및 PC/mobile 목록/처리/수정 재시도 PASS |
| 펀딩 | ServiceMembersPage → ServiceMembersWorkspace | `/operator/service-members/funding`, 기존 펀딩 지정 운영자·승인 전용 제한 유지 | 공통114개 및 PC/mobile 목록/처리·조회만 재시도 PASS |
| 커뮤니티 | ServiceMembersPage → ServiceMembersWorkspace | `/operator/service-members/community`, 서비스 운영자와 개별 커뮤니티 운영자를 통합하지 않음 | 공통114개 및 PC/mobile 목록/처리·조회만 재시도 PASS |
| 중앙 관리자·분회·공통 전체 사용자 상세 | 공통 콘솔 직접 소비 범위 밖, 별도 상세/권한 구현 유지 | route/role/capability 변경 없음, 전체 계정 복구·삭제를 서비스 관리로 노출하지 않음 | import/심볼·API/파일명 리터럴 검색, 새 브라우저·실계정 검증 미실행 |
