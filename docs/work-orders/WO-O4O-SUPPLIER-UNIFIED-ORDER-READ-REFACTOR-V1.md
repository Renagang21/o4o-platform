# Supplier 통합 주문 조회 리팩토링

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: 공급자 서비스 조사 후 사용자 구현 진행 지시
> **기준 commit**: `359dedcc2629dc00a7b4b919126405fb0bf98aa8`

## 범위

공급자 서비스 전체 조사에서 발견한 첫 개선 대상이다. 공급자 도메인 구조를 바꾸지 않고 통합 주문의 읽기 정확성을 개선한다.
상위 계약은 [Supplier Domain](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[B2B 주문](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)을 따른다.

## 코드·문서 점검 후 보정한 TODO

- [x] 최신 main에서 통합 주문·controller·소비 API·기존 계약 테스트 재점검
- [x] 기존 응답 모양과 HTTP 500 계약 보존. 부분 성공 표시용 새 API 계약은 추가하지 않음
- [x] 원장별 300건 제한 및 애플리케이션 메모리 페이지 처리 제거
- [x] 단일 SQL snapshot에서 전체 건수·페이지 조회. 페이지 주문에 대해서만 명세 집계
- [x] `created_at DESC, source ASC, id ASC`로 동일 시각에도 안정 정렬
- [x] 조회 실패는 controller로 전파하여 성공 0건·일부 성공으로 오인하지 않게 처리
- [x] 임시 PostgreSQL·기존 계약 회귀 및 타입 검증 결과 기록
- [ ] PR CI·Codex 검토 후 integration-ready 판정
- [ ] 이번 변경의 main 통합 승인 후 merge·Delivery 확인

## 보존하는 계약

공급자 ownership·서비스 범위 helper, checkout 결제 완료만 노출, bridge된 checkout 중복 제외,
Neture 처리 URL, checkout 읽기 전용, `testPayment`, 빈 목록의 `totalPages=1`을 보존한다.
원장 병합·동기화·결제·배송 상태 변경·migration은 없다.

## 검증 시나리오

300건 초과 목록과 후속 페이지, 범위 밖 페이지의 전체 건수, 같은 시각의 원장 간 페이지 경계,
타 공급자/서비스·미결제 제외, bridge 중복 제외, 실제 0건, 원장 조회 실패를 확인한다.
DB 테스트는 `O4O_SUPPLIER_ORDER_TEST_PORT`로 지정한 일회용 loopback fixture만 사용한다.
기본 CI에서 DB 통합 테스트가 skip되면 실제 실행 검증을 대체하지 않는다.

### 로컬 검증 결과

- 일회용 PostgreSQL 16에서 신규 통합 테스트 6건·실패/입력 테스트 10건 실행
- Supplier Domain 및 B2B 주문 소스 계약 포함: 4 suites, 68 tests PASS
- API 의존 패키지 사전 빌드 후 `tsc --noEmit` PASS
- 변경 TypeScript 3개 파일을 루트 ESLint flat config로 검사: PASS
- 민감정보 검사와 `git diff --check` PASS
- 운영 DB·인증된 브라우저 smoke·운영 데이터 규모에서의 실행 계획은 미확인

## 후속 조사 후보

이번 PR에 포함하지 않는다: 프런트 공급자 API 업무축별 분리 → 상품 목록/Drawer/등록 책임 분리 →
백엔드 프로필·승인·오퍼 책임 분리 → 대시보드 요청 측정. 단계마다 최신 코드와 계약을 다시 대조한다.
운영 데이터의 규모·쿼리 성능과 인증된 공급자 업무는 별도 실제 검증이 필요하다.
