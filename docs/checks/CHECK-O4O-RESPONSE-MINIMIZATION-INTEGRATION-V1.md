# CHECK-O4O-RESPONSE-MINIMIZATION-INTEGRATION-V1

- 작성일: 2026-11-02 (Asia/Seoul)
- 사용자 지시: push된 변경과 남은 PR을 main에 순차 병합·배포.
- 대상: 기존 [PR #905](https://github.com/Renagang21/o4o-platform/pull/905), 개발 인계 HEAD `219adad855`.
- 통합 기준: `807db30f69` (PR #925·#920·#921·#922 반영). 전용 통합 worktree에서 원래 PR 변경을 결합하고, 같은 PR의 후속 검증·보완으로 반영한다. 다른 세션의 작업트리는 수정하지 않는다.

## 보완

Sonar는 신규 코드 중복률 3.7%로 실패했다. 두 facade의 동일한 Offer 수정 입력 정의를 기존 writer의 `Parameters` 타입으로 연결해 복사본을 제거했다. 런타임의 허용 필드·권한·가격·주문·결제 동작은 변경하지 않는다. Sonar 실제 재분석은 새 PR HEAD에서 확인하며 로컬 토큰 비교만으로 게이트 통과를 선언하지 않는다.

기존 상거래 통합 테스트의 전제는 현행 정본과 달랐다. 정상 공통 계정의 일반 커뮤니티 접근은 추가 가입을 요구하지 않으며, 약국 승인 시 Pharmacy 기본 가입이 자동 연결된다. 누락 가입을 검증하는 테스트는 격리 fixture에서 해당 가입 행을 명시적으로 제거한다. 독립 사업 가입·동의, 타 조직·운영자 접근, 정지·종료 차단 기대값은 유지한다. 운영 코드를 옛 테스트에 맞게 되돌리지 않는다.

## 검증

- Node 22 / frozen install / 공통 패키지·API 의존 빌드 PASS.
- HTTP 응답·게시·Offer 쓰기 계약: 3 suites / 107 tests PASS.
- Neture 게시 저장·상품 상세·전송 계약: 3 suites / 46 tests PASS.
- API TypeScript noEmit PASS. facade 타입 보정 후 반복 토큰 조사에서 해당 중복 블록 제거 확인.
- 격리 PostgreSQL 15의 정본 bootstrap + 모든 incremental migration: 7411 lines, `4adee8f4fc7f40b3dd9ae6ff84d5bafad7128378e4c58b4042a4234528542a17` 일치.
- 실제 DB 4 suites: supplier-store-round-trip, supplier-proposal-terms, store-cooperation-workflows 3 suites PASS. commerce는 fixture 보정 후 빈 전용 DB에서 56 tests PASS. 네 suite 합계 107 tests PASS / skip 0.
- 최초 실행은 fixture의 허용 DB 이름·포트와 달라 실패했다. guard를 완화하지 않고 정확한 loopback 이름/포트로 실행했다. 실패 후 남은 합성 데이터가 반복 실행에 영향을 줘 전용 DB를 빈 상태로 다시 구성했고 최종 통과를 확인했다.

테스트는 이번 세션 소유 일회성 PostgreSQL 컨테이너·합성 데이터만 사용했다. 운영 DB·실상품·주문·결제·게시 상태·메일은 테스트로 변경하지 않는다. 검증 컨테이너와 데이터는 전체 검증 종료 후 제거한다. main CI·Delivery·실제 서빙 SHA 및 운영 smoke는 이번 통합 작업의 최종 보고에서 구분한다.

문서 정합: 과거 실행 기록은 재작성하지 않고 본 후속 검증 기록으로 #905의 미완료 DB 조건을 보완한다. 기본 가입 자동 연결·일반 커뮤니티 접근 정본의 정책은 변경하지 않는다.
