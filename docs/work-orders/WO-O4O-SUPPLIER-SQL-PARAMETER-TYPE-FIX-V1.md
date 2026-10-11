# WO-O4O-SUPPLIER-SQL-PARAMETER-TYPE-FIX-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: Demo 공급자 운영 조회에서 발견한 HTTP 500 오류 수정 사용자 지시
> **기준 commit**: `4f75e2563af5b105edabef430d835098f63a100c`

## 조사 전 TODO

최신 main·정본·타입 확인 → TODO 보정 → 실제 타입의 일회용 DB 재현 → 최소 수정 → 회귀 검증 → PR·main 통합·배포·운영 재검증.

## 코드·문서 조사와 확정한 문제

[Supplier Domain](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)의 Orders·Products 축,
[B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)과
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)를 함께 확인했다.

- `CheckoutOrder.entity.ts`와 `20260414100000-CreateCheckoutTables.ts`의 공급자 식별자는 varchar(100)이다.
- 공급 제안의 `supplier_id`는 UUID다. 통합 주문의 all 조회 및 상품 성과·추세 SQL은 하나의 바인딩을 양쪽 타입 비교에 사용했다.
- 기존 통합 fixture는 checkout 식별자까지 UUID로 선언하여 이 오류를 검증하지 못했다.
- fixture를 실제 타입으로 고친 PostgreSQL 15 검증에서 11건 중 7건이 `character varying = uuid` 또는 `uuid = text`로 실패했다. 개별 주문 출처의 조회 성공과 합친 조회 실패라는 운영 관찰에 부합한다.

## 조사 후 TODO와 구현

- [x] checkout fixture를 varchar(100)으로 정렬하고 실제 타입 검증 추가
- [x] 통합 주문의 UUID·varchar 비교에 각 파라미터 cast 명시
- [x] 상품 성과·추세의 공유 파라미터에도 타입 명시
- [x] 기존 공급자 격리·결제 상태·페이지 및 새 분석 집계 회귀 검증
- [x] 변경 파일 lint·공백 검사
- [x] API 타입·문서 민감정보 검사 완료
- [ ] PR·required CI·Codex blocker 확인 후 main 통합
- [ ] Delivery 결과와 PC/mobile Demo 공급자 조회 확인

컬럼을 cast하거나 schema·migration·운영 데이터를 바꾸지 않는다. API 응답·권한·서비스 범위·집계 의미와 기존 실패 전파 계약은 유지한다.
공급자 분석은 기존 SQL 집계이며 내부 LLM 호출을 추가하지 않는다.

## 로컬 검증 근거

- 수정 전: 실제 타입 fixture에서 7 failed / 4 passed (11 tests).
- API 의존 패키지 빌드·`tsc --noEmit`·변경 TypeScript lint·문서 민감정보·공백 검사 PASS.
- 수정 후: 4 suites / 73 tests PASS. 일회용 PostgreSQL 15 통합 11건이 실제 실행됐으며 skip은 없다.
- 분석 회귀는 foreign owner, unpaid, cancelled, refunded 주문 제외와 현재/이전 기간 성장률을 확인한다.
- 기존 주문 회귀는 300건 초과 페이지, 안정 정렬, ownership·service scope·paid 필터·bridge 중복 제거·오류 전파를 확인한다.
- 기본 CI에서는 명시적 loopback fixture 포트가 없으면 DB 통합 suite는 skip한다. 그 결과를 DB 검증 PASS로 해석하지 않는다.
- 운영 검증은 사용자가 지정한 공개 Canonical Demo 버튼으로 진행하며 프로필·상품·주문 저장과 상태 변경은 실행하지 않는다.

## 문서 정합

기존 테스트 fixture의 컬럼 타입을 entity/migration 선언과 일치시켰다. 사업·도메인 정본의 기준은 변경하지 않는다.
