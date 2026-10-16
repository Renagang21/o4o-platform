# 서비스 회원관리 운영 흐름 통합 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: 사용자 공통 회원관리 잔여 정비·검증·push/PR 지시

기준 main `352df65dd`, branch `wo/service-members-workflow`.
[역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [회원관리 표준](../platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md), [공통 모듈 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다.
중앙 관리자·약사회 분회·새 권한/API/DB·운영 데이터 변경은 제외한다. 완료된 약국 전용 수정·개별 커뮤니티 회원 운영을 재작성하지 않는다.

## 소비처·보존 계약

- 공통 콘솔: Neture UsersManagementPage, 약국 MemberManagementPage, ServiceMembersWorkspace.
- 서비스 workspace: 공급자·펀딩·커뮤니티 ServiceMembersPage, 강의 OperatorMembersPage. 서비스 가입과 개별 커뮤니티 가입은 별개다.
- 공통 수정창: Neture EditUserModal, 서비스 workspace. 약국은 기존 KpaEditUserModal을 유지한다.
- 상세 UserDetailPage·중앙 관리자·기존 삭제 API의 정책은 수정하지 않는다. 승인 모드·확장 행/일괄·수정/삭제 slot 계약 유지.

## 통합 TODO

- [x] 목록·통계 요청 수명/필터 역전, 실패 표시·조회 전용 복구·페이지 보정.
- [x] 검색/정렬/URL/선택과 처리 대상 수명 대조, 쓰기 중 배경 조작·중복 실행 방어.
- [x] 단건/일괄 및 확장 행동의 성공/실패·부분 성공·재조회 결과 분리와 실패 건 재시도.
- [x] 상세 반려 입력·처리 실패 보존, 수정창 로딩/저장 수명·실패 입력·중복 저장 방어.
- [x] 공통 소비처·승인 모드·서비스 권한·마지막 admin 보호 회귀, 타입/빌드·PC/모바일.
- [x] 전체 TODO·CHECK 문서 정합과 push/PR 통합 인계 자료 정리.

새 서비스 간 통합 계층을 만들지 않는다. 개발 종료는 push/PR이며 main 병합·배포는 통합 담당 소관이다.

## 결과

개발·검증 완료. [CHECK](../checks/CHECK-O4O-SERVICE-MEMBERS-WORKFLOW-V1.md)에 453개 회귀, 타입/빌드, 여섯 실제 소비처 PC/모바일과 후속 경계를 기록했다. PR/CI 최신 상태는 PR과 완료 보고에서 제공한다.
