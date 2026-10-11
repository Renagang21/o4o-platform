# WO-O4O-NETURE-OFFER-WRITE-RESPONSIBILITY-REFACTOR-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-11
> **유형**: 기존 상품 쓰기 책임 리팩터링
> **범위**: Neture Offer 등록 · 수정 · 승인/반려 · 유통 · 일괄 처리
> **상위 정본**: [Supplier Domain Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) · [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md#9-리팩터링-실행-규칙-모든-단계-공통)

## 문제와 목표

역할별 조회가 분리된 `NetureOfferService`에도 상품 등록, 공급 조건 편집, 유통 변경, 승인 lifecycle과 일괄 작업이 함께 남아 있다.
호출처의 기존 공개 계약은 유지하면서 업무별 쓰기 구현과 검증 범위를 명확하게 한다.

TODO 작성 후 최신 main의 코드/문서/호출처를 조사하고 아래 책임으로 범위를 확정한다.
조사 기준은 `cb85731ca940b5957068cfb46ab239ecbcd680d8`이며 과거 IR의 남은 목록을 그대로 사용하지 않는다.

## 현행 모집단과 결정

- `offer.service.ts`: 1,641행, 공개 읽기 9개 · 쓰기 11개 · 등록 private helper 3개.
- 호출 경로: `NetureService` → `NetureOfferService`; supplier-product / operator-product-approval controller, neture.routes, hub-trigger가 소비한다.
- 공급자 등록 경로는 기존 Master 연결 하나다. Master 생성은 Candidate → Promotion Core가 맡는다.
- 공급처 미지정/OSA 0행 상품의 등록 승인·반려 예외와 OSA가 있는 상품의 기존 파생 처리를 모두 보존한다.
- operator 일괄 승인·반려 endpoint는 단건 서비스를 반복하고 ActionLog를 남기는 기존 controller 책임을 유지한다.
- `setServiceDelivery`는 현행 HTTP 호출처가 없다. 새 route·소비처 없이 기존 façade 호환만 보존한다. PH 전용 기능의 복구/확장은 하지 않는다.

| 책임 서비스 | 기존 메서드 |
|---|---|
| `SupplierOfferRegistrationService` | createSupplierOfferFromExistingMaster, findDuplicateOffer, asOfferDuplicateViolation, persistOfferForResolvedMaster |
| `SupplierOfferWriteService` | updateSupplierOffer, updateBusinessContent, batchUpdateSupplierOffers, bulkDeleteOffers |
| `SupplierOfferDistributionService` | updateDistribution, setServiceDelivery |
| `OfferLifecycleService` | approveProduct, rejectProduct, submitForApproval, batchToggleOfferActive |

`NetureOfferService`는 같은 constructor/public signatures/type export를 가진 lazy façade로 유지한다.
기존 3개 순수 정책 함수만 `offer-write-policy.ts`로 옮긴다. 기존 승인 원장 서비스는 수정하지 않는다.

## 보존 계약

- supplier identity/ownership · HTTP auth/scope guard · operator actor 전달 · API/route/DTO.
- ProductMaster read-only, 등록 primitive 단일, 중복/휴지통 구분과 해당 unique constraint의 23505 fallback.
- 규제 permit · 약국 대상 서비스 · DRUG gate · PRIVATE 활성화/유통 변경 gate.
- `distribution_type`은 입력축으로부터 파생. 비승인 대상 키 보존과 승인 대상 추가/취소/재심사.
- 승인·반려 cascade와 같은 QueryRunner의 commit/rollback/release 순서.
- 일괄 작업의 순차 실행, 부분 성공, 건별 오류. 삭제는 연결 가드를 가진 soft delete다.
- PUBLIC 자동 listing 확산의 기존 승인/활성 조건과 비동기 오류 처리.

새 framework/repository/상태머신, schema/migration, dependencies, CI/deployment 인프라, 역할/정책 확대는 범위 밖이다.

## 검증과 전달

1. 새 행동 계약 테스트를 원본 monolith에서 실행하고 같은 테스트로 분리본을 검증한다.
2. 소스 위치를 참조하는 기존 계약 테스트는 모든 책임 서비스까지 검사 범위를 확장한다. private repository 주입 테스트는 해당 책임 서비스로 이동하며 기존 assertion을 유지한다.
3. moved method/pure helper AST, SQL와 binding, 공개 method signature를 비교한다.
4. 관련 Jest, type-check, scoped lint, API dependency build, 문서 민감정보 검사를 수행한다.
5. PR checks · CodeQL · Sonar · Codex review를 확인하고 normal PR merge → native Delivery → 실제 serving 배포를 추적한다.
6. production health와 사용자에게 이미 허용된 공개 공급자 Demo의 읽기만 점검한다. 실제 테스트 계정 검증과 운영 쓰기는 하지 않는다.

운영 결과와 트랜잭션의 실제 DB 동작 확인 여부는 별도 검증 결과에서 구분한다. 이 WO의 기준점과 과거 결과를 최신 정책으로 다시 쓰지 않는다.

## 중복 코드 보완

초기 PR #485의 SonarCloud 결과가 병합 뒤 도착해 신규 중복률 4.1%로 기준 3%를 넘었다.
승인·반려의 기존 승인 원장 조회/누락 행 생성만 `OfferLifecycleService.ensureServiceApprovals`로 공유한다.
같은 QueryRunner를 전달하며 이미 승인 행이 있는 경우, 공급처 미지정인 경우, 누락 서비스별 행 생성 후의
승인/반려와 cascade 분기는 그대로 유지한다. 순차 batch를 병렬화하거나 analyzer exclusion을 추가하지 않는다.

이 보완 후에는 approveProduct/rejectProduct 본문 자체가 원본과 동일하다고 보고하지 않는다.
기존 SQL와 바인딩의 다중집합, 공개 signature, 동적 transaction 순서/실패 검증과 다른 12개 moved method의
AST 동일성을 구분해 확인한다. 초기 본문 동일 증적은 당시 검증 이력으로 보존한다.

보완 검증: 새 행동 계약 58건을 원본 monolith에서도 통과시킨 뒤 분리본 관련 14 suites / 311 tests가
통과했다. 기존 승인 행이 있지만 대상 키가 없는 경우의 파생 sync와 준비 SELECT/INSERT 실패 시
판정 전 rollback/release를 추가 검증했다. DB 호출/바인딩 36개의 다중집합과 공개 signature 20개,
다른 moved method 12개 및 순수 함수 3개 본문은 동일하다.

사용자는 병행 PharmacyHub 정리 중 WIF 임시 차단 유지를 지정했다. main 통합과 배포를 구분하고,
차단 해제 전 실제 배포 및 새 코드의 운영 검증을 완료했다고 보고하지 않는다.
