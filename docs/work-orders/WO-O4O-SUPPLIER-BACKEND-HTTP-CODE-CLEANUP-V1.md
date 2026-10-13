# 공급자 backend HTTP 책임 정비

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거**: 사용자 — 다음 작업, 너무 작게 나누지 말 것. 공급자 코드 정비 4차를 commit → push까지 진행.

## 최초 TODO와 fresh census

조사 전에 `/workspace/artifacts/supplier-code-phase4-todo.md`에 TODO를 작성했다.
최신 main `e36bcf931`에서 새 독립 clone/`wo/supplier-code-phase4`를 만들고,
앞선 승인 push `70546698a`를 dependency merge했다. 이전 작업 폴더·branch는 보존했다.
현재 코드의 route mount·controller·middleware·서비스 위임·웹 API 소비처·소스 검사를 확인한 뒤 TODO를 보정했다.

정본: [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[B2B Contract](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[Commerce Boundary](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md).

- [x] 최초 TODO → 현재 코드/문서/소비처 점검 → 범위 보정
- [x] 원래 HTTP 동작과 기존 경계 검사를 먼저 실행
- [x] 사업자 관리 13개 + 상품 12개 endpoint의 업무별 handler 분리
- [x] bulk Candidate 검증·중복 표기·행별 후보 생성을 업무 서비스로 이동
- [x] 정의되지 않은 객체 상속 키의 제품 유형 접수 결함 재현·수정
- [x] 기존 소스 assertion을 유지하며 facade가 연결한 실제 handler/모듈까지 검사
- [x] 회귀·HTTP 요청·AST·타입·TypeScript 빌드·운영 번들·lint 검증
- [ ] 명시적 파일 commit → 전용 branch push → 원격 일치 확인

## 구현 범위

| 책임 | 구현 |
|---|---|
| 사업자 관리 | 공개 factory와 13개 route의 순서를 유지. 등록/대시보드, profile, onboarding/문서, 품목군의 4개 handler 모듈로 분리. controller 341 → 151행 |
| 상품 HTTP | 기존 factory와 12개 route의 순서를 유지. 조회, Offer command, distribution/pricing의 3개 handler 모듈. controller 483 → 174행 |
| 대량 등록 업무 | `SupplierBulkCandidateService`가 기존 유형/금지 컬럼/행별 검증, 요청 내 중복 표기, 순차 Candidate 생성과 결과 집계를 담당. HTTP는 gate·상태/오류 응답을 담당 |
| 데이터 소유권 | middleware가 확정한 supplierId와 인증 userId만 사용. profile 저장은 taxInvoiceEmail 제외, onboarding 소유 유지. 승인 전 자기 프로필 보완은 linked gate |
| 타입 경계 | handler가 쓰는 서비스 메서드만 Pick 타입으로 명시. 새 저장 원장·프로그램 engine·공통 controller framework 없음 |
| 소스 경계 | test-only AST helper가 facade의 실제 handler 참조를 따라가고 전체 이동 모듈을 포함. 원래 assertion 삭제·완화 없음 |

기존의 인증/linked/active/membership 순서와 upload middleware 위치를 보존했다.
등록/프로필/onboarding 오류 구조, 문서 스트림/헤더, Offer command 입력과 상태 매핑,
부분 성공·중복 행 처리, Candidate 출처/분류는 유지했다.
Supplier Management의 사업자등록증 필드 저장 위치 주석만 현행 조직 metadata 소유권에 맞췄다.

### 대량 등록의 정의된 유형만 허용

원래 `BULK_TYPE_MAP[typeKey]`는 객체 상속 키도 존재하는 값으로 취급했다.
`constructor`/`toString`/`__proto__` 요청이 fixture Candidate 생성 후 HTTP 201로 접수되는 것을 재현했다.
정의된 own key인지 확인해 기존 `400 INVALID_PRODUCT_TYPE`로 거부한다.
공식 8개 유형/별칭과 행별 검증·출처·생성 순서는 보존한다. 새로운 제품 유형 정책을 만들지 않는다.

## 검증·인계

동일 트랙 [CHECK 4차 절](../checks/CHECK-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1.md)에 증거를 추가했다.
최종 fetch에서도 main은 `e36bcf931`이다. 새 clone에서 frozen install, shared/API dependency graph build를 실행했다.
실계정/운영 DB 검증은 사용자 유예대로 NOT_RUN. CI Gate 수동 실행·PR/main merge·배포는 범위 밖이다.

이미 얇은 모듈 router와 주문/배송/재고/정산 controller·서비스·인가/트랜잭션은 변경하지 않았다.
외부 이미지/가져오기·콘텐츠 관련 controller는 조사 모집단에 포함했으나 이번 25개 endpoint 책임과 별개이므로 보존했다.
후속은 이 나머지 처리 경계와 앞선 mobile Drawer/공통 에디터 한계를 최신 main에서 재조사해 묶음으로 정비하는 것이다.

문서 정합: backend 사업자 필드 저장 위치 코드 주석을 현행 정본에 맞췄다. 정본 정책 변경 없음.
