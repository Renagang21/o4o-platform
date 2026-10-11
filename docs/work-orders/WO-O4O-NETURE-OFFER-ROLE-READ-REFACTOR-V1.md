# WO-O4O-NETURE-OFFER-ROLE-READ-REFACTOR-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-11
> **범위**: 공급자·관리자·운영자 상품 조회 책임 분리 및 기존 write 경로 회귀 검증
> **기준 main**: 5895ed177ecbfd8cc57da2fe4d516e0549dc781d

## TODO와 현재 모집단

TODO 초안 작성 후 최신 main의 코드·정본을 확인하여 상품 조회를 한 묶음으로 확정했다.
과거 조사 기록의 잔여 목록을 현행 정책으로 재사용하지 않았다.

- [x] Supplier Boundary·Role Workspace·commerce 정본 및 최신 모집단 조사
- [x] 기존 NetureOfferService 2462줄의 공개 조회 9개와 조회 helper 6개 확인
- [x] 공급자·관리자·운영자 조회 분리, 기존 공개 메서드·facade 유지
- [x] 검색·필터·페이지·집계·실패 전파 행동 검사와 기존 write 보호 검증
- [ ] 타입·lint·CI·검토·main 병합·배포·운영 검증

| 역할 | 조회 | 새 구현 |
|---|---|---|
| 공급자 | getSupplierProducts / getSupplierProductsPaginated / getSupplierProductApprovalCounts | supplier-offer-read.service.ts |
| 관리자 | getPendingProducts / getAllProducts / getAllProductsPaged / getProductsSummary | admin-offer-read.service.ts |
| 운영자 | getOperatorSupplyProducts / getAllRegisteredOffers | operator-offer-read.service.ts |

소비처는 NetureService 및 supplier-product·Hub·admin·operator 상품 컨트롤러다.
기존 Offer 서비스 메서드가 lazy reader로 위임하므로 컨트롤러·route·프런트 호출은 그대로다.
단일 역할 목록 조회를 write 워크플로와 분리하며 새 generic repository/framework를 만들지 않는다.
조회 전용 조직명 helper는 관리자·운영자 내부에서 기존 비치명적 enrichment 계약을 유지한다.

## 유지 계약

[Supplier Domain Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)의 5축·ProductMaster read-only·distribution 입력/승인 계약을 유지한다.
[Role Workspace](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9에 따라 최신 모집단을 산출했다.
[Store Commerce Boundary](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)와 [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)의 경계를 유지한다.

- 공개 메서드 9개의 이름·인자·기본값·반환 타입·응답·오류 전파를 보존한다.
- 공급자 소유 필터, PRIVATE 매장 범위, soft-delete 제외, 승인 SSOT, 완성도와 목적 파생, 검색 바인딩·정렬 whitelist·페이지 한도를 유지한다.
- 관리자 조직명 enrichment의 비치명적 실패, 운영자 조회 범위·전체 KPI 기준을 유지한다.
- 쿼리와 바인딩 표현식, 로그 prefix, 등록·수정·승인/거절·일괄 처리 본문은 동일하다.
- 새 기능·권한·API/route·DB schema/migration·의존성·CI/배포 인프라 변경은 없다.
- Google owner 복구·실 계정 관계 변경·운영 DB write·프로그램 통합·제품 Master write는 범위 밖이다.

## 검증과 결과 기록

신규 행동 검증 43개를 분리 전 모놀리스에 먼저 적용해 PASS 기준을 만들었다.
동일 검증을 분리 후에도 실행하고 실제 reader 위임·쓰기 금지 검사를 추가한다.
AST 비교는 이동한 전체 멤버와 남은 write/repository 멤버를 비교하며 static 클래스 참조 이름만 정규화한다.
SQL·파라미터·필터 표현식의 기능 변경은 허용하지 않는다.

공급자 Demo read-only 검증은 기존 사용자가 승인한 공개 체험 경로로만 실행한다.
관리자·매장 실제 계정 검증은 사용자가 나중에 수행하기로 명시했다. 새 계정·운영 credential을 요청하지 않는다.
실 DB fixture 검증은 이 문서만으로 PASS 주장하지 않으며 별도 실행 근거가 없으면 미실행이다.
토큰·쿠키·개인정보·운영 응답 원문은 기록하지 않는다.

환경 setup 스킬에 따라 새 worktree 대신 독립 clone/branch를 사용하고 기존 checkout을 보존한다.
PR·CI·운영 배포·smoke 결과는 최종 외부 결과 artifact에 기록한다.
문서 정합: 구현 이동과 검사 경로를 맞추며 Frozen 정본·과거 WO는 다시 쓰지 않는다.

## 로컬 결과

- 원본 모놀리스 기준 행동 검사 43건 PASS.
- 신규 행동·정확한 위임·read-only 경계 검사 55건 PASS, 기존 write/등록/승인 계약 포함 11 suites / 231 tests PASS.
- API 의존성 빌드·tsc --noEmit·대상 ESLint·문서 민감정보·diff 검사 PASS.
- 이동 멤버 16개(조직명 helper의 두 역할 사본 포함), 남은 repository/write 멤버 18개 모두 AST 동등성 PASS. 공개 메서드 모집단 동일. static 클래스 참조명만 정규화했다.
- 실 PostgreSQL fixture 검증은 미실행이며 동일 SQL의 코드 비교와 mock 행동 검증을 실DB 검증으로 표시하지 않는다.

## PR 품질 검사 보완

첫 전체 CI는 통과했으나 Sonar가 이동 코드의 신규 중복률 7.6%(기준3%)와 기존 필터 함수 복잡도16(기준15)을 지적했다.
관리자 전체/페이지 DTO 공통 필드와 조직명 enrichment를 41줄의 전용 read helper로 묶고 승인 필터 분기를 private helper로 옮겼다.
새 범용 repository/framework나 품질 검사 예외는 추가하지 않았다. lazy 초기화와 Number.parseInt 표기도 정리했다.

이 보완은 최초 문자/AST 동일 이동과 구분한다. DTO 매핑 2개·필터 builder만 helper 추출로 본문이 달라졌다.
원본 모놀리스에 관리자 전체 DTO strict 검사3개를 먼저 적용해 PASS(선택 외56개는 skipped) 확인했다.
최종59개 신규 검사 및 기존 보호 포함11 suites /235 tests PASS. 타입·lint PASS.
SQL 호출/바인딩32개와 SQL fragment/ORM 표현식81개 모두 동일하고 남은 write/repository 멤버18개 및 공개 메서드 모집단도 동일하다.
