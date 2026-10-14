# 공급자 접근성·화면 책임 정비

> **상태**: ACTIVE
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거**: 사용자 공급자 접근성·복잡도 보완 및 큰 화면 책임 분리 진행 지시
> **기준 main**: `24b96f373` · 작업 branch: `wo/supplier-quality-responsibilities`

## 조사와 결정

조사 전 TODO를 작업 artifact에 작성하고 최신 main에서 전용 worktree를 만들었다.
[역할별 업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[공유 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 확인했다.
이전 코드 정비 1~5차와 main 통합·배포는 완료된 이력으로 보존한다.

현재 주문 화면은 독립 요약/통합 조회와 서비스 카드/주문 표시를 함께 담당한다.
대시보드는 primary 권한 확인, 병렬 조회와 독립 retry, 파생 값, 지표 표시를 함께 담당한다.
이벤트 화면은 목록·제안 현황·안내 조회, 입력 검증과 서비스별 제안, 모달 표시를 함께 담당한다.
각 역할별 모듈로 분리하고 공개 page export 및 route는 유지한다.

등록·가져오기·이벤트 입력의 label 연결과 강제 autofocus, 이름 없는 화면 이동/모달 닫기/서비스 펼치기를 보완한다.
재사용 가능한 React useId로 인스턴스별 ID를 생성한다. 브랜드 목록이 없을 때도 label은 직접 입력 control에 연결된다.

## 범위와 보존 계약

- 주문 요약/통합 조회의 독립 실패·재시도와 source/page/limit 요청을 유지한다.
- 대시보드 primary 실패 시 secondary 미호출, 실패/정상 0건 구분, 영역 retry, 내부 LLM 없는 SQL 지표를 유지한다.
- 지표 접기 상태는 페이지에 남겨 primary 실패·재시도 뒤에도 유지한다.
- 이벤트 초기 query의 1회 선택, 기본 KPA 대상, 검증 순서/문안, 조건 payload, 서비스별 부분 성공과 목록 refresh를 유지한다.
- 기존 오류/중복/권한 판정, 실제 저장 의미, API·route·금융·schema·dependency·CI는 변경하지 않는다.
- 공급자 내부 화면 모듈만 변경하며 공유 UI 패키지와 다른 Programs는 변경하지 않는다.

## TODO

- [x] 원본 화면 동작 기준 테스트 5건 PASS
- [x] 업무별 상태/조회·파생값·표시 분리 및 접근성 보완
- [x] 29개 이동 callback/helper AST 동일성 확인
- [x] 집중 동작·접근성 25건, Supplier Boundary 41건, PC/mobile fixture 브라우저 검증
- [x] 최종 전체 회귀·타입/빌드/lint·독립 diff 점검
- [x] commit/push·PR·required CI·review·main 통합
- [ ] Delivery의 API 의존 보류 해소 후 운영 배포 확인

실계정·운영 상품/주문/정산 write는 이번 범위가 아니다.
검증 및 미확인 결과는 [CHECK](../checks/CHECK-O4O-SUPPLIER-QUALITY-RESPONSIBILITIES-V1.md)에 구분한다.
문서 정합: 현행 정본 정책 변경 없음.

## main 통합과 운영 선행조건

[PR #556](https://github.com/Renagang21/o4o-platform/pull/556)이 main `f2bc1076fb60e203c5cb2c1ece3caede0b176719`에 정상 병합됐다.
최종 source HEAD `88dce2d5c`의 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38493766203)은 SUCCESS다.
CI Gate·API Jest 3 shards·전체 품질·Admin/Neture build·CodeQL이 통과했다.
최초 code HEAD `78de72b`의 SonarCloud는 PASS, 자동 Codex review COMPLETED·findings 0·미해결 thread 0이다.
두 HEAD 사이의 supplier source 및 경계 테스트 차이 0을 확인했다.
병합에 포함된 직전 main 추가 변경은 운영자 완료 기록 4개 문서이며 supplier runtime 차이 0이다.

운영 배포는 코드 통합과 구분한다. [운영자 배포 판정](../checks/CHECK-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md)에
별도 API 타입 재export 번들 오류와 미적용 `CreateAiUsageReservations1791870434349` 때문에 Neture 의존 보류가 기록되어 있다.
API 빌드 수정은 [PR #557](https://github.com/Renagang21/o4o-platform/pull/557)의 별도 작업이다.
그 API 빌드 및 승인된 migration/API 배포 후 이번 공급자 frontend의 Delivery/운영 확인을 재개한다.
이번 실행에서 API/migration을 dispatch하거나 dependency guard를 우회하지 않았다.
현재 API health·Neture HTML의 HTTP 200은 기존 운영 가용성 증거이며 새 코드 배포 증거가 아니다.

이 문서 후속은 같은 WO의 main/Delivery 기록 단계다. 검증 harness와 artifact 재현을 위해 작업 worktree는 KEEP하며 기존 원본 checkout과 다른 세션 자원은 보존한다.
