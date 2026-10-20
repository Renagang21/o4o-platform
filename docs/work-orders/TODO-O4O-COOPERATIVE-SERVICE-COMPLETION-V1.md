# TODO-O4O-COOPERATIVE-SERVICE-COMPLETION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-20
> **범위**: 문서·코드 조사 → TODO 보완 → 구현·검증·commit·push

- 기준: origin/main `b54074d038`. 도메인 `pharmcoop.neture.co.kr`.
- 종료 범위: push. PR 생성·병합·운영 migration·계정 권한 부여·배포·IAM 변경 없음.
- 환경: 기존 전용 작업공간 재사용, 새 branch `wo/cooperative-service-completion`. 운영 데이터 대신 격리 DB와 합성 API 검증.

## 조사 및 실행 TODO

- [x] clean 확인, 최신 main 기준 branch 준비, 초기 TODO 작성
- [x] 가입 자격·개인 가입/심사·다중 조합 이용 조사
- [x] 알림 인프라·연합회 및 조합 운영 현황 조사
- [x] 공급 조건 승인·공급자/조합 자체 콘텐츠·내 매장 복사 경로 조사
- [x] 중복 제외 및 아래 구체적 범위 보완
- [x] 내 조합 목록·상태·이동, 로그인 후 고정 `/test` 진입 제거
- [x] 조합 admin의 가입 기준·제출 정보 안내 수정 및 사유 이력
- [x] 본인 가입·보완·심사 결과·역할 지정 내 처리 소식
- [x] 연합회 조합 상태·개별 조합 회원 상태 집계
- [x] 기존 사업 게시판 API로 목록·본문·페이지 이동·글쓰기·운영자 게시판 개설 연결
- [x] 공급·콘텐츠 기존 경로 회귀 확인, 매장 복사는 기존 매장 권한 유지
- [x] 자동화 검증·타입 검사·빌드·PC/모바일 화면 확인
- [x] 검증 기록·남은 과제·문서 정합 정리
- [ ] 범위 확인 후 commit·push·인계

## 조사 근거와 구현 결정

| 영역 | 현행 근거 | 이번 변경 |
|---|---|---|
| 개인 가입 | `CooperativeManagementService.applyMembership/memberAction` | 기존 신청 내용과 admin 최종 심사 유지. 가입 기준은 `cooperatives.eligibility_description` 재사용, admin만 수정하고 이력 남김 |
| 다중 조합 | `CooperativeService.session`은 활성 조합만 반환, 로그인 `/test` 고정 | 본인 가입/역할 목록을 상태 포함 조회. 중단 조합도 상태만 표시하고 서비스 진입은 제공하지 않음 |
| 알림 | 공통 `NotificationService`는 별도 원장·service scope·SSE 사용 | 기존 `cooperative_management_events`의 본인 대상 결과를 최근 100건 모아보기. 이메일·문자·읽음/미읽음 저장은 이번 구현에 포함하지 않음 |
| 현황 | 연합회 전체 조합/조합별 회원 목록 이미 존재 | 허용된 조회 결과만 상태별 집계. 연합회에 개인 회원 정보·통계를 새로 공개하지 않음 |
| 공급 조건 | `CooperativeBusinessOperator` → `OperatorSemiFranchisePage` proposals 탭 → 사업별 승인 | 중복 승인 원장/화면 추가 없음. 기존 흐름 검증 |
| 콘텐츠 | 공통 contents 탭·`SemiFranchiseContentFormPage`·`SupplierBusinessContentService` | 조합 자체 작성·공급자 승인 기존 구현 유지. 최신 main의 `BusinessHomeShowcase`로 승인 본문 표시 |
| 매장 복사 | `/neture/pharmacy/store/contents/:id/copy` → `SemiFranchiseContentService.pharmacyCopy` | 기존 약국 조직·매장 권한을 그대로 적용. 개인 조합원에게 복사/주문 권한 발급 없음 |
| 회원 게시판 | `MemberSection` placeholder. 기존 `/communities/:communityKey/forum`와 `/boards`는 사업별 접근 검사 | 사업 메타데이터의 실제 communityKey로 연결. 별도 독립 커뮤니티 가입·새 게시판 원장 없음 |

## 유지할 경계와 후속 사항

- 개인은 여러 조합에 가입할 수 있다. 약사·경영자·일반 개인 등 가입 자격은 조합별 안내와 관리자 심사로 운영한다. 자격 증명 자동 검증·면허 원장·구조화된 필수 제출 양식은 별도 정책/개발 과제다.
- 조합원 자격과 약사/경영자의 내 매장 이용 권한은 별개다. 가입 기준 수정은 기존 회원의 상태·역할을 자동 변경하지 않는다.
- 연합회와 개별 조합 admin/operator 범위를 유지한다. 연합회 역할만으로 개별 조합 콘텐츠·회원에 접근하지 않는다.
- 교육은 기존 강의 서비스 사용. 제휴 경영지원·공동 상품 기획은 범위 밖이다.
- 공개 접근 IAM·HTTPS·실제 테스트 조합/계정 준비는 운영 담당 인계 과제다. 이 개발 작업은 운영 접속 가능 상태를 보증하지 않는다.
- 새 migration·의존성·공통 알림 계약·공유 UI 수정 없이 기존 구조를 재사용한다.

## 개발 검증

[검증 기록](../checks/CHECK-O4O-COOPERATIVE-SERVICE-COMPLETION-V1.md)을 따른다. 로컬 자동화 141개 및 합성 API 브라우저 4개 시나리오 통과. 운영 적용·실계정 검증은 실행하지 않았다.
