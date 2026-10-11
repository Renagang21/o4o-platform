# WO-O4O-SUPPLIER-BUSINESS-SERVICE-EXTRACTION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: 공급자 책임 분리 리팩토링 사용자 진행 지시
> **기준 commit**: `f66114199a6b28fad457efc2e95d7f00a3972dfa`

## 조사 전 TODO

최신 main의 정본과 서비스 모집단 확인 → 독립 영역 선정 → TODO 보정 → 계약을 유지하며 분리 → 검증 → push·PR.

## 최신 코드·문서 점검

[Supplier Domain](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)의 Business 축과
[업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9를 기준으로 모집단을 재산출했다.
[B2B 주문](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)과
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)를 함께 확인했다.

- `supplier.service.ts`: 1,734줄. Identity·등록/승인·정지/재활성·디렉터리·프로필·조직 helper를 포함.
- 프로필 호출: `NetureService` → `NetureSupplierService`.
- 공급자 본인 `supplier-management.controller.ts`와 운영자 보완 `operator-supplier.controller.ts`가 같은 메서드를 사용.
- 조직 read helper는 승인·정지·목록·공개 디렉터리에서도 소비. 삭제하지 않고 새 Business 구현에 위임한다.
- 기존 프로필 정본 검사는 구현 파일을 직접 읽으므로 새 Business 파일까지 검사 범위를 확장해야 한다.

## 조사 후 보정한 TODO

- [x] 프로필 read/write·주문조건 read·조직 read/부분 write를 `NetureSupplierBusinessService`로 분리
- [x] 기존 facade 메서드·오류 클래스 import 경로 유지
- [x] 조직 helper 단일 구현 유지, 기존 lifecycle·guard·공개 디렉터리 동작 유지
- [x] 새 구현 파일까지 기존 소스 계약 검사 확장
- [x] SonarCloud 중복 지적 후 GET/PATCH 연락처·주문조건 응답을 전용 projection으로 공유
- [x] 동작 회귀·타입·lint·민감정보 검사 결과 확인
- [ ] push·PR 및 CI·Codex 확인
- [ ] main 통합·Delivery는 이번 PR에 대한 승인 및 기술 gate 확인 후 진행

## 계약과 제외 범위

Organization의 사업자번호·주소·metadata와 Supplier의 서비스 프로필 구분을 유지한다.
조직과 공급자 write는 같은 트랜잭션이며 주소/metadata의 다른 키를 보존한다.
프로필 완성 판정은 승인과 분리하고, 주문조건·배송 설정은 기존 저장/응답 의미를 유지한다.
오류의 타입·메시지·전파 및 조직 read 실패 시 기존 fallback을 유지한다.

새 API·route·role·인가·schema·migration·dependency·프레임워크를 추가하지 않는다.
기존 프로그램·승인/정지 lifecycle·onboarding·운영 DB write는 이번 작업에 포함하지 않는다.
후속 후보는 lifecycle과 공개 디렉터리 책임 분리이며, 각 단계에서 최신 main을 다시 조사한다.

## 검증 범위

신규 동작 검증은 기존 facade의 반환·오류 호환, canonical read, 프로필 완성 별칭,
주소/metadata 부분 병합, 저장 정규화, 조직 미연결 거부, 양쪽 저장 실패의 전파를 확인한다.
트랜잭션 manager를 대체한 단위 검증이며 실제 DB rollback이나 인증된 운영 화면 검증을 대신하지 않는다.

## 로컬 검증 결과

- 기존 소스 계약 5 suites / 134 tests PASS, 신규 동작 13 tests PASS (서로 다른 총 147 tests).
- 신규 테스트 최초 11건 이후 facade/오류 호환 2건을 추가하고 최종 13건 재실행 PASS.
- API 의존 패키지 사전 빌드 및 API `tsc --noEmit` PASS.
- 변경 TypeScript 5개 파일 lint PASS; 신규 테스트 추가 후 해당 파일 재검사 PASS.
- 민감정보 검사 3,839 files PASS, `git diff --check` PASS.
- TypeScript AST로 이동한 7개 메서드 본문이 기준 commit과 동일함을 확인.
- 실제 DB rollback·인증된 운영 Supplier 화면·운영 DB write 미실행.
- 문서 정합: 이번 WO에 실행 범위를 기록. Supplier Frozen 정본의 정책/구조 변경 없음.

## PR 분석 후 보정

첫 CI Gate 및 CodeQL은 PASS, SonarCloud는 신규 코드 중복 7.1%로 실패했다.
GET/PATCH에서 같은 연락처·주문조건 응답 필드를 전용 함수로 공유하여 중복을 제거했다.
이는 API/권한/저장 의미 변경이 아니며 두 경로의 동일 필드 동작 검증을 추가했다.
위 AST 비교는 최초 이동 단계의 증거이고, 최종 GET/PATCH 본문은 projection 위임 때문에 달라졌다.

중복 보정 후 신규 동작 15건 + Supplier Domain/Identity 계약 68건 = 3 suites / 83 tests PASS.
기존 다른 계약 66건을 포함한 서로 다른 총 검증은 149건이다.
