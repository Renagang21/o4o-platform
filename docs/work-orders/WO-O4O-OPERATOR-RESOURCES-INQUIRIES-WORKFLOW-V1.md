# 서브도메인 자료·문의 운영 흐름 통합 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: 사용자 자료·문의관리 조사→보완→검증→push·PR 지시

기준 main `c7f2c29eb`, 전용 branch `wo/operator-resources-inquiries`.
[역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)과
[공통 모듈 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다.
중앙 관리자·약사회 분회·새 상태 전이·권한·API/DB 변경·운영 작업을 제외한다.

## 실제 소비처·보존 계약

- 자료 콘솔: 약국 `OperatorResourcesPage` → 기존 공통 `OperatorResourcesConsolePage` → `resourcesApi`.
  현재 다른 활성 서비스 wrapper는 없다. source/lifecycle/form/AI slot의 공개 계약은 유지하며 폐기 서비스는 복구하지 않는다.
- 문의 공통 화면: 강의 `OperatorContactPage` → `ContactInquiryAdminPage` → `lectureContactApi`.
  상태/내부 메모는 순차 저장하며 상태 성공·메모 실패 시 상태를 재전송하지 않는다. 외부 답변 발송을 만들지 않는다.
- 약국 협업 문의: `CollaborationRequestsPage` → `collaborationRequestApi`. 기존 pending/reviewing/done 유지.
- Neture 문의 메시지: `OperatorContactMessagesPage` → `operatorContactApi`.
  supplier/과거 partner 신규 문의만 일괄 확인. 개별 상태/메모 및 service/other 처리를 추가하지 않는다.
- 별도 중앙 admin 페이지·공통 테이블/확인 모달 자체는 수정하지 않는다.

## 조사 후 통합 TODO

- [x] 자료 목록·필터·페이지·선택의 수명/응답 역전·오류 envelope·삭제 후 페이지 보정 검증 및 보완.
- [x] 자료 단건/일괄 처리 잠금·결과 보존·갱신 실패와 조회 전용 복구, 기존 lifecycle 옵션 회귀.
- [x] 기존 자료 등록/편집 초기값·저장 실패 입력·중복 저장·늦은 detail 및 AI slot 수명 보완.
- [x] 강의 문의 상세의 오류/성공 표시, 순차 부분 성공·재조회 실패·scope 전환 수명 보완.
- [x] 약국 협업 문의의 조회 실패/재시도·응답 역전·처리 대상/결과·동기 중복 잠금 보완.
- [x] Neture 일괄 확인 성공과 조회 실패 분리·동기 중복 실행·필터/페이지 보호.
- [x] 모든 활성 소비처·raw-source 계약·권한/API 회귀·타입/빌드·PC/모바일 검증.
- [x] 전체 TODO·CHECK 문서 정합과 push/PR 통합 인계 자료 정리.

새 서비스 간 공통화 계층은 만들지 않는다. 개발 종료는 push/PR이며 main 병합·배포는 통합 담당 소관이다.

## 결과

네 활성 경로의 개발·검증을 완료했다. [CHECK](../checks/CHECK-O4O-OPERATOR-RESOURCES-INQUIRIES-WORKFLOW-V1.md)에 회귀 383개, 타입·빌드·PC/모바일과 실제 소비처·후속 경계를 기록한다. PR/CI의 최신 상태는 PR과 완료 보고에서 제공한다.
