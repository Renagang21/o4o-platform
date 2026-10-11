# WO-O4O-NETURE-DASHBOARD-ROLE-READ-REFACTOR-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-11
> **범위**: Neture 대시보드 조회 책임 분리와 기존 세 역할 회귀 검증
> **기준 main**: b19dc0a3ddaa32073407687b8dc84870a398fc76

## TODO 초안 → 조사 후 확정

최초 TODO는 최신 정본·잔여 서비스·소비처를 조사한 뒤 하나의 구현 묶음을 정하도록 작성했다.
현재 코드의 모집단을 확인하여 공급자·관리자·매장 조회 책임 분리를 선정했다.

- [x] 최신 main 정본·완료 영역·호출부 census
- [x] 세 역할 대시보드 조회 분리 및 기존 facade 유지
- [x] 모든 필수 조회 실패·응답·범위에 대한 동작 검증 작성
- [x] PRIVATE 매장범위 및 공개 호스트 source-contract 소비 경로 갱신
- [x] focused tests·build·type·lint·메서드 동등성 검증
- [ ] push·PR review·main 병합·Delivery·운영 read-only 검증

## 현재 모집단과 결정

`NetureDashboardService` 444줄의 공개 메서드는 4개다.

| 구현 책임 | 기존 메서드 | 이동 위치 |
|---|---|---|
| 공급자 private 승인·서비스별 주문요약·제품 통계 | getSupplierOrdersSummary / getSupplierDashboardSummary | supplier-dashboard.service.ts |
| 플랫폼 전체 공급자·제품·승인 통계 | getAdminDashboardSummary | admin-dashboard.service.ts |
| 매장 상품 접근·PRIVATE 신청 상태 | getSellerDashboardInsight | seller-dashboard.service.ts |

소비처는 `NetureService`와 supplier-management, supplier-order, hub-trigger, seller controller다.
web-neture dashboard API와 Hub가 공급자 요약을 소비한다. 기존 import와 facade는 유지하므로
라우터·컨트롤러·프런트 호출 변경은 없다. Seller는 매장 경영자이며 Supplier와 다른 조회 범위다.

`SupplierCopilotService`는 이미 checkout 기반 공급자 전용 KPI·성과·유통·트렌드 reader다.
다른 승인지표 reader와 합치거나 지표 의미를 바꾸지 않는다. 호출 0인 private
`formatRelativeTime`만 제거한다. 새 generic repository·통계 engine은 도입하지 않는다.

## 유지 계약

- Supplier Domain 5축, Organization identity, PRIVATE `allowed_seller_ids` 범위 유지.
- 기존 SQL·바인딩·집계 기간·로그 prefix·응답 필드·타입·기본값·오류 전파 유지.
- 공급자는 supplierId, 매장은 organization/allowed seller 범위, 관리자는 global 조회 유지.
- 정본의 B2B payment-first·consumer commerce 은퇴 계약 유지. 신규 주문·결제·배송 write 없음.
- schema·migration·dependency·권한·route·API·Core/Frozen 본문 변경 없음.
- 제품 기준정보 write, 프로그램 통합, Google owner 복구, 운영 DB 변경 없음.

## 검증과 한계

38개 신규 동작 검증은 각 필수 조회의 실패 전파, 역할별 바인딩, 승인 집계·빈 tier/서비스,
7일 경계·canonical 매장 링크와 기존 facade 결과를 확인한다. 기존 supplier boundary와
공개 호스트 검사는 이동한 구현까지 소비하도록 유지/확장한다.
원본 4메서드와 새 구현의 AST 본문 및 public method 모집단을 별도로 비교한다.

환경 설정 스킬의 worktree 생성 제한에 따라 독립 clone/branch에서 작업한다.
기준 checkout과 기존 survey worktree는 변경하지 않는다.
운영 계정 정본 `docs/local/TEST-ACCOUNT.txt`는 작업·기준 checkout에 없다.
관리자·매장 실제 계정 smoke는 미실행으로 구분한다. 이전 세션에서 사용자가 승인한 공개 공급자
Demo 체험은 공급자 read-only 검증에만 사용하며 실제 관리자·매장 계정을 대체하지 않는다.
운영 응답 원문·개인정보·token을 기록하지 않는다.

문서 정합: source-contract 경로를 역할별 구현으로 정렬한다. 과거 census/WO를 현행 TODO로
재사용하거나 Frozen 정본을 다시 쓰지 않는다. 기존 서비스별 주문요약의 은퇴 서비스 안내는
이번 책임 분리에서 기능 복구/변경하지 않으며 별도 정책 판정이 필요한 잠재 잔재로 기록한다.

## 로컬 검증 결과

- 신규 동작 38건 PASS. 원본 서비스로 같은 검사 38건을 실행해 baseline PASS 확인.
- 신규 동작과 기존 boundary/공개 호스트 계약 3 suites / 95 tests PASS.
- API 의존 패키지 빌드·API tsc --noEmit·변경 파일 ESLint·문서 민감정보·diff 검사 PASS.
- AST 4메서드 본문과 기존 public 메서드 모집단 동일. 기존 SQL/바인딩 변경 없음.
- 배포 전 PC/모바일 공개 공급자 Demo read-only smoke PASS. 공급자 대시보드·주문 요약 API 각200/success=true.
- 관리자·매장 실제 인증 smoke 및 실DB 집계 fixture 검증 미실행. 운영 업무 write 없음.

PR/CI/배포 결과는 최종 결과 artifact에서 구분하여 기록한다.

## PR 품질 검사 보완

첫 Sonar 분석에서 이동한 관리자 `recentEvents.map`이 항상 빈 배열에 적용되는 dead code라
Reliability gate가 실패했다. 과거 event table 제거 뒤 남은 변환을 타입 명시한 빈 배열로
교체하여 기존 recentActivities 배열 타입과 실제 빈 응답을 유지했다. 공급자 승인 수 파싱은
동일 intrinsic인 Number.parseInt로 정렬했다. SQL·API 정책 변경은 없다. 최신 main
e1cd3b187 통합과 함께 전체 focused 검증을 다시 진행한다. 최종 AST 비교는 이 두 개의
동작 동일 정리를 정규화한 뒤 수행하고, 원본 문자 그대로 동일한 메서드와 구분한다.
