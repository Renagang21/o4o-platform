# 서브도메인 운영자 실패 복구 통합 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: 사용자 서브도메인 운영자 점검 후 5건 통합 보완·push/PR 지시

## 범위

기준 main `c7f2c29eb`. 약국 상품 신청의 실패 후 재시도 단절·필터 응답 역전, 약국 포럼 조회 실패의 빈 목록 위장, 커뮤니티 개설 반려 사유 유실·조회 실패와 빈 목록 동시 표시를 한 묶음으로 정비한다.
[역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공통 모듈 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다.
전체 관리자·약사회 분회·역할/가입/DB 변경·운영 데이터 조작은 제외한다. 공통 모듈의 버그를 고치며 새 서비스 간 통합 계층은 만들지 않는다.

## 소비처 조사

- ProductApplicationManagementConsole: 활성 UI는 web-kpa-society ProductApplicationManagementPage. 공개 exports와 api/config 계약 유지.
- OperatorForumCategoriesPage: web-kpa-society ForumCategoriesManagementPage, web-neture ForumDeletePage. Neture Operator의 disableHardDelete·포럼명 확인 옵션 및 서버 delete-check/409 가드 유지.
- useOperatorAction: ProductApplicationManagementConsole만 호출한다. 성공/실패 boolean 반환을 추가하고 실패 대상은 보존한다.
- OperatorConfirmModal: 상품 신청 콘솔과 web-neture RegistrationRequestsPage. 기존 void callback 동작을 유지하며 false 반환 시 사유를 보존한다. 등록 신청 소비처 회귀도 검증한다.
- CommunityServiceAdminPage: community 서브도메인의 `/operator/communities`(개설 심사), `/admin/communities`(개별 커뮤니티 운영). 중앙 admin.neture.co.kr와 별개다. 개별 운영자 지정 권한·마지막 admin 보호는 바꾸지 않는다.
- 제거된 서비스의 과거 주석/문서는 활성 소비처로 복구하지 않는다. 심볼·파일명·API/경로 리터럴 및 raw-source 검사 소비처를 함께 확인한다.

## 통합 TODO

- [x] 상품 승인/거절 실패의 대상·사유·오류 보존과 재시도, 동기 중복 실행·저장/갱신 실패 분리.
- [x] 상품 목록·통계·선택/필터 조회 수명과 역전·unmount 방어.
- [x] 포럼 조회 오류/재시도·이전 데이터 보존·stale 행동 차단 및 두 소비처 검증.
- [x] 커뮤니티 개설 심사 입력·처리·목록 갱신/실패 분리와 사용자 입력 보존.
- [x] 기존 권한·API·공통 확인 모달 소비처 회귀, 타입·빌드·PC/모바일 검증.
- [x] 전체 TODO/CHECK 정합 및 push/PR 통합 인계 자료 정리.

전용 worktree `/workspace/o4o-wt/subdomain-operator-recovery`, branch `wo/subdomain-operator-recovery`에서 진행한다.
새 정책·일괄 상태 전이·계정/서비스 가입·영구삭제 집행은 하지 않는다. 개발 담당 종료는 push/PR이며 main 병합·배포는 통합 담당에게 인계한다.

## 결과

구현·검증 완료. [CHECK](../checks/CHECK-O4O-SUBDOMAIN-OPERATOR-RECOVERY-V1.md)에 회귀 1,352개, 타입·빌드·실제 소비처 PC/모바일 검증과 한계를 기록했다. PR URL·CI 최신 상태는 PR 및 완료 보고에서 제공한다.
