# WO-O4O-NETURE-SETTLEMENT-RESPONSIBILITY-REFACTOR-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-12
> **최종 갱신**: 2026-10-12
> **유형**: 기존 정산 서비스 책임 리팩터링
> **범위**: 공급자 조회 · 관리자 조회 · 정산 계산/취소/승인/지급 및 기존 알림
> **상위 정본**: [Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) · [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md#9-리팩터링-실행-규칙-모든-단계-공통) · [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) · [Commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)

## 목표와 최신 모집단

TODO 초안 → 최신 코드/정본/소비처 조사 → TODO 보정 후 실행한다.
기준 main은 `614248fda7aa932b07fe17a9e2dac16da7835fe4`다. 과거 IR의 미완성/계약 판정을 현재 정책으로 승격하지 않는다.

`NetureSettlementService` 487행에 공개10개와 private 알림1개가 함께 있다. 직접 runtime 소비자는
supplier-settlement.controller와 admin-settlement.controller다. 기존 façade/constructor/public signature를 유지한다.

| 분리 담당 | 기존 메서드 |
|---|---|
| SupplierSettlementReadService | getSupplierSettlements, getSupplierKpi, getSupplierSettlementDetail |
| AdminSettlementReadService | getAdminSettlements, getAdminKpi, getAdminSettlementDetail |
| SettlementCommandService | calculateSettlements, cancelSettlement, approveSettlement, paySettlement, notifySupplierSettlementPaid(private) |

상태 목록/필터 타입만 작은 공유 파일로 이동한다. 기존 고정 수수료와 순수 helper3개는 command 담당에 유지한다.
새 engine/repository/framework/알림 transport를 만들지 않는다.

## 보존 계약

- 공급자 supplierId SQL 격리, 관리자 auth/role, controller 검증/오류, route·API·UI.
- delivered + payment-ready + neture service scope + 미정산 주문, 기간의 inclusive end-date 및 양수 매출 조건.
- 주문 라인 snapshot 기반 합계, 기존10%/Math.round/지급액 차액·그룹별 순차 생성·주문별 연결.
- calculated→approved→paid, calculated/approved→cancelled 조건부 UPDATE 및 취소 후 연결 행 해제.
- 미존재/잘못된 상태의 null, DB 예외 전파와 동적 SQL의 notes bind marker/파라미터 순서.
- 지급 변경 성공 뒤 canonical owner resolver·settlement.paid·기존 URL/metadata/수신자 순차 처리.
- 현재 구현은 DataSource.query 순차 작업이며 별도 transaction/queryRunner가 없다. 새 트랜잭션을 도입해
  기존 부분 쓰기/실패 동작을 바꾸지 않는다. 이 관찰은 기존 코드의 원자성을 보장한다는 뜻이 아니다.
- 알림 주석은 fire-and-forget이지만 구현은 실패를 내부에서 처리하는 helper를 await한다. 완료 시점과 실패 처리도 보존한다.

금액·수수료·권한·정산 대상·상태·정책·schema/migration·의존성·CI/배포 인프라 변경은 범위 밖이다.
다른 트랙의 account-erasure DDL이나 운영 DB write/실제 지급을 이 작업 승인으로 실행하지 않는다.

## 검증과 전달

1. 원본 façade를 통해 새 행동 계약을 실행한 뒤 같은 검증으로 분리본을 확인한다.
2. 소스 경로를 검사하는 기존 계약3개를 분리 경로로 정합화하며 핵심 assertion을 유지한다.
3. 이동11메서드의 본문/SQL 생성 및 binding, 금액 helper·상수, 공개10 signature/constructor를 비교한다.
4. 관련 회귀·typecheck·scoped lint·API dependency/build/실제 compiled ESM import·문서/범위 검사를 수행한다.
5. 최신 CI/CodeQL/Sonar/Codex finding 처리 후 normal PR/main 통합 및 실제 native 배포/serving을 확인한다.
6. 사용자에게 이미 허용된 공개 공급자 Demo의 정산 읽기 및 기존 화면을 PC/mobile에서 확인한다.
   실계정 검증 유예는 유지하며 운영 정산 계산·승인·지급·취소나 직접 DB 쓰기를 하지 않는다.

로컬 dependency fake와 실제 DB/운영 검증의 한계를 구분하고 결과를 기록한다. 완료 상태는 실제 전달 증거를 확인한 후 기록한다.

## 초기 구현 검증

원본에서 행동69건을 통과시킨 뒤 분리본의 같은69건, façade21건 및 기존 보호를 포함한
7 suites / 246 tests가 통과했다. 이동11메서드 본문과18개 query/바인딩이 순서까지 동일하며
공개10 signature/constructor, 필터 구조, 수수료 helper3개/고정 상수와 상태 목록도 동일하다.

API dependency/build·typecheck·scoped lint(오류/경고0), 실제 compiled ESM import/lazy constructor가
통과했다. 실제 AppDataSource는 초기화되지 않았으며 import 시 시작된 기존 로컬 notification
heartbeat만 검증 종료 시 중지했다. 문서 민감정보 검사와 diff 검사도 통과했다.
실제 PostgreSQL 트랜잭션 fixture·운영 정산 쓰기·실제 지급은 실행하지 않았다.

## 품질 리뷰 처리

Sonar의 새 경고10건을 GitHub check annotation으로 확인했다. 새 역할 서비스3개의
DataSource 필드를 readonly로 선언하고 façade3개의 lazy 초기화 대입을 return과 분리했다.
공개 constructor/signature와 이동한11메서드 본문·SQL·금액 정책은 바꾸지 않는다.

나머지4건은 계산 시 공급자별/주문별 쓰기와 지급 알림 수신자 루프의 await다.
기존 순서·부분 쓰기/실패 전파·첫 알림 실패 시 이후 수신자 처리 중단을 보존해야 하므로
병렬화하지 않는다. 실제로 해당 순차/실패/완료 시점을 행동 계약에서 검증한다.
이는 경고를 숨기는 설정 변경이나 원자성 보장으로 해석하지 않는다.

## 전달 완료 — 2026-10-12 (Asia/Seoul)

- [PR #516](https://github.com/Renagang21/o4o-platform/pull/516), 최종 source
  `bf293491956591522af7555bc9f6c9a20cbaf4b8`를 normal merge해 main
  `c64e54c0601b664d432cce8bf202ef51e2d0a795`에 반영했다. 최신 main의 점포 공통 권한 변경까지
  점검하고 정산/권한 회귀9 suites / 288 tests, API typecheck/build를 통과했다.
- PR CI `38258462946`, CodeQL `38258462970`, Codex 지적/미해결 리뷰0 및
  Sonar gate PASS를 확인했다. readonly/lazy 초기화6건은 해소됐고, 보존해야 하는 순차
  await4건만 남았다(check `114845559472`). 원본11메서드 본문/18query·바인딩/금액과
  공개10메서드 signature·constructor는 동일하며 façade는487→71행이다.
- main CI `38259679233`/CodeQL `38259679256` PASS, native Delivery `38260853504`의
  LEVEL_3(API·Store) 판정 후 [Promote `38261132551`](https://github.com/Renagang21/o4o-platform/actions/runs/38261132551)가
  같은 main SHA를 배포했다. API job `114852513738`의 빌드·readiness·트래픽 전환·전환 후
  검증이 성공했으며, 최종 production status는 **DEPLOYED · deploy: api,store**다.
  native Report는 실제 serving SHA와 단일 revision100%를 다시 조회해 target 일치를 확인한다.
- 같은 SHA를 다른 세션도 먼저 dispatch한 경합에서 자기 중복 pending run `38261203786`만
  취소했다. 다른 세션의 실행을 변경하지 않고 동일 target의 실제 전달 증거로 확인했다.
- 배포 전·후 공개 공급자 Demo PC(1440×1000)/mobile(390×844) 로그인, 홈/상품/주문/정산
  화면4개 및 목록/paid 필터/KPI가 모두 HTTP200·정상 응답이었다. JS 오류/조회 실패/가로
  넘침/정산 업무 쓰기0, API health=alive·ready=ready. 토큰·응답 본문·식별자·개인정보를
  smoke 결과에 저장하지 않았다.

### 검증 한계와 문서 정합

Demo 정산0건으로 실제 상세 조회는 NOT_RUN이다. 실제 계정/Google 로그인 유예를 유지하며
운영 계산·승인·취소·지급·은행 송금 및 실제 PostgreSQL 쓰기 fixture는 검증하지 않았다.
공통 native API 배포의 기존 **Run database migrations** step은 실행·성공했다.
이번 source 및 누적614→c64에는 migration 파일 변경이 없지만, job 실행을 생략했거나
운영 DB 전체 write0이었다고 주장하지 않는다. 직접 job 상세 로그/적용 건수는 환경의
artifact host 제한으로 조회하지 못했으며, 해당 host만 추가한 설정 초안은 게시 대기다.

최신 AGENTS/SETUP/정본Index/Supplier FROZEN/Role Workspace§9/Commerce/B2B/문서 lifecycle을
기준으로 TODO와 WO를 정합화했다. 새 금전·권한·schema 정책이나 engine·route·인프라 변경은 없다.
이 완료 기록은 문서만 변경하며 이미 배포된 정산 runtime의 재배포를 요구하지 않는다.
