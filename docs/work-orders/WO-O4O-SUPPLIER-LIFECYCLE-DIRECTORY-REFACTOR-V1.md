# WO-O4O-SUPPLIER-LIFECYCLE-DIRECTORY-REFACTOR-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: 공급자 후속 리팩토링을 작게 나누지 않고 진행하라는 사용자 지시
> **기준 commit**: `ffa4403ddf3d897e0de5ef9f531e3ed21f155480`

## 조사 전 TODO

TODO 작성 → 최신 main·정본·이전 조사 점검 → 모집단 재산출 → TODO 보정 → 구현·검증 → PR·main 통합·배포·운영 읽기 검증.

## 최신 코드·문서 점검 및 범위 결정

[Supplier Domain](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)의 Business 축과
[역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9를 기준으로 확인했다.
[B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)과
[Store commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)를 함께 확인했다.

기존 Business 분리 후 `supplier.service.ts`는 1,282줄이며 등록·승인·정지/재활성화·운영 목록·공개 상세·연락처 노출·조직 동기화를 함께 처리했다.
현행 호출자는 `NetureService`, 공급자 관리·운영자 공급자·관리자 controller와 공개 공급자 route다.
Identity 조회는 콘텐츠·상품 이미지 등의 기존 guard가 canonical resolver를 통해 사용한다.
HTTP route·controller·인가 경계는 그대로 두고 아래 책임 분리를 하나의 PR과 배포로 묶는다.

## 조사 후 수정한 TODO

- [x] 신청·승인·반려·비활성화·재활성화와 내부 Demo/알림/의무 집계/조직 동기화를 Lifecycle 서비스로 이동
- [x] pending·governance·전체·페이지·공개 목록/상세와 연락처·신뢰·마스킹을 Directory 서비스로 이동
- [x] 기존 Supplier facade·공개 메서드·오류 클래스·타입·순수 페이지 helper import 경로 유지
- [x] 조직 read와 프로필 완성 판정은 Business 단일 구현 재사용
- [x] 판매·정산 필수 필드 판정을 Business로 이동
- [x] 반복되는 거래 전이 row lock/Demo gate와 목록 계정 enrichment를 각각 단일 helper로 정리
- [x] 소스 계약의 검사 대상을 이동된 구현까지 확장하고 기존 불변식 유지
- [x] 로컬 10 suites · 235 tests PASS, 의존 빌드·API 타입·변경 파일 lint·문서 민감정보·diff 검사 PASS
- [ ] PR 검토·CI
- [ ] 최신 main 통합·배포·읽기 전용 PC/모바일 검증·정리

## 유지 계약

- 등록·승인·재활성화의 현재 Neture 가입 승인 전제조건, 사업자 정보·소유 증빙 검사.
- Demo 사용자뿐 아니라 legacy user pointer가 없는 Demo 조직도 차단; 조회 실패는 fail-closed.
- governance 전이는 기존 트랜잭션 안에서 row lock·상태 재확인·주문/정산 차단·cascade를 수행한다.
- 역할 변경과 알림은 기존 커밋 이후 순서와 오류 처리 그대로 유지한다. 재활성화가 상품 승인·진열을 자동 복구하지 않는다.
- 연락처는 canonical 조직 ownership·승인 거래처·visibility로 판정하며 legacy user pointer만으로 공개하지 않는다.
- 공개 연락처의 기존 로그인 전제, operator 계좌 마스킹, 이름/사업자번호의 Organization SSOT, 목록 페이지/집계 의미.
- 선택적인 조직/governance enrichment 실패의 기존 fallback과 필수 조회 실패 전파.

새 API·route·권한·정책·schema·migration·dependency·프레임워크를 추가하지 않는다.
운영 공급자 상태/프로필 변경 및 실제 사용자 ownership 복구는 수행하지 않는다.

## 검증 기록

그대로 이동한 19개 메서드와 기존 Identity 조회 2개는 조직 helper 수신자 정규화 후 AST 본문 비교를 통과했다.
기존 공개 메서드 모집단과 5개 타입/helper 정의도 동일하다.
공통 helper로 보정한 4개 메서드는 상태 잠금·Demo 보호·계정 조회·목록 응답의 동작 회귀로 검증한다.
로컬 token 기반 서비스 중복 탐지는 clone 0건이며 외부 SonarCloud 결과와 구분한다.

운영 lifecycle write 테스트는 실행하지 않는다. 트랜잭션 경계/실패/커밋 후 역할 순서 테스트는 manager double 기반이며 실제 DB rollback/concurrency 검증으로 표현하지 않는다.
로컬 검증: 10 suites · 235 tests PASS (신규 lifecycle/directory 동작 47건 포함). 의존 빌드·API 타입·변경 파일 lint·문서 민감정보·diff 검사 PASS. PR·CI·배포·운영 smoke는 후속 확인한다.
