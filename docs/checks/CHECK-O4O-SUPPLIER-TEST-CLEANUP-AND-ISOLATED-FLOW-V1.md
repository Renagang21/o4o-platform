# 공급자 테스트 데이터 정리·격리 업무 흐름 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **작업 근거**: 사용자 지시 — 운영 검증용 상품 정리 후 격리 환경에서 전체 업무 흐름 검증
> **기준 main**: `c9b72ee2a` · branch: `wo/supplier-test-cleanup-closure`

## 판정

격리 환경의 전체 업무 흐름·주문 조회 회귀 **5 suites / 63 tests PASS, SKIPPED 0**.
이번 검증이 만든 전용 DB 2개를 제거하고 `pg_database` 잔존 0을 각각 확인했다.
사용자가 운영자 화면에서 대상 Offer 1개를 휴지통 이동 후 완전 삭제하고, 정확한 대상 ID의 DELETE HTTP 200을 확인했다.
후속 독립 조회에서 대상 Offer의 상품·재고 미존재, 기존 Offer 5개의 ID 보존, 공유 Master 보존을 확인했다.
**이번 운영 테스트 데이터 정리와 격리 전체 흐름 검증은 완료**다.
운영 상품 승인·추가 주문·결제·배송·정산 write는 실행하지 않았다. 운영자 삭제의 실행 증적과 후속 조회의 확인 범위를 구분한다.

## 적용 기준

- [AGENTS §5](../../AGENTS.md#5-위험-변경--사용자-확인): 일회성 테스트 업무 데이터와 연결 데이터 완전 삭제, 삭제 불가능한 운영 테스트 금지
- [B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md), [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
- [약국 매장 설계 §8](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md): 테스트 결제는 PG 미호출, 약국 주문의 Neture 정산 제외
- [개인정보 보존·파기 정책](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md): 로그인·보안·감사기록은 일회성 상품·주문 데이터와 구분해 보존 정책 적용

## 운영 상품 정리 조사 — 삭제 전

대상은 이전 실계정 검증에서 생성한 **새 SupplierProductOffer 1개**다.
기존 상품 5개와 공유 ProductMaster는 이번 삭제 대상이 아니다. 실제 대상 ID는 사용자에게 직접 전달했고 비공개 실행 journal에 보관한다.

| 확인 | 결과 |
|---|---|
| 공급자 상품·재고 조회 | 대상 존재, PENDING·비활성, 공급가 100, 재고 2·추적 true |
| 매장 공급 옵션·장바구니·주문 | 각각 0건, 대상 미노출 |
| 공급자 주문·정산 | 각각 0건 |
| 운영자 정리 권한 | 경영자·공급자·직원 각각 `GET /neture/operator/product-cleanup/recycle-bin` HTTP 403 |
| 자격정보 | 제공된 세 계정과 기존 환경 설정을 확인했다. 운영자 계정·추가 outbound identity/secret 없음. 권한 승격·우회·운영 DB 직접 연결 없음 |

기존 완전 삭제 경로:

- PENDING 전용: `DELETE /api/v1/neture/operator/product-cleanup/pending-offers/:offerId`.
  상태·승인된 서비스 승인·활성 listing·service product 연결을 검사한 뒤 transaction에서 spot 정책과 Offer를 삭제한다.
- 운영자 UI: 해당 Offer 삭제 → 휴지통 → 완전 삭제(`DELETE .../hard-delete/:offerId`).
  휴지통 이동만으로 정리를 완료했다고 판단하지 않는다.
- 두 경로 모두 `requireAuth`와 `neture:operator` scope가 필요하다. API 접근 거절을 피하기 위한 새 삭제 endpoint는 만들지 않았다.
- source상 Offer FK 연결(서비스 승인·서비스 가격·제품 승인·listing 등)은 CASCADE이며 공유 Master는 지우지 않는다.
  이는 구현 조사 결과이며 **운영의 연결 데이터 잔존 0을 확인한 결과는 아니다**.

위 조사 후 사용자에게 대상 1개만 완전 삭제하도록 요청했다. 앞선 상품 승인·기록 보존 계획은 철회했다.
당시 세 계정의 403과 삭제 전 상품 존재 결과는 삭제 완료 전의 기록이며, 현재 결과는 아래 후속 확인을 따른다.
공급자 목록 미노출만으로 hard delete를 증명하지 않고 사용자 실행 증적과 대조했다.

## 격리 환경 전체 흐름

Node 22.18.0 / pnpm 10.25.0, frozen lockfile 설치와 `build:packages` PASS.
기존 표준 loopback PostgreSQL 15 컨테이너를 사용하고 별도의 빈 DB를 생성했다.
DB를 만들기 전에 존재하지 않음을 확인하고 실행별 ownership marker를 남겼다.
접속값을 출력하지 않고 migration runner의 DB_*를 전용 DB로 명시적으로 덮어썼다.

### 상품 → 주문 → 배송·재고 → 정산 경계

`supplier-store-round-trip.integration.spec.ts`와 `neture-pharmacy-commerce.integration.spec.ts`,
`b2b-supplier-to-store-order-canonical-contract.spec.ts`: **3 suites / 39 tests PASS**(DB 통합 28 + 계약 11).

- 표준 bootstrap/incremental 적용과 post-migration schema fingerprint assertion PASS.
- 실제 서비스로 기존 Master 연결·중복 등록 거절·가격 수정·소유권 거절·Master 보존·운영자 등록 승인을 검증했다.
- 매장 신청·사업 가입 승인 → 장바구니 → 실제 checkout → 테스트 결제·중복 확인 → bridge 1회 생성 검증.
- 결제 전 fulfillment 차단, 다른 구매자 결제 거절, 실제 공급자 준비·송장·배송 완료와 재고 10 → 8,
  반복 배송의 이중 차감 방지 검증.
- 약국 테스트 주문의 Neture 정산 제외를 확인했다. 별도의 합성 Neture 주문으로 계산·승인·지급·중복 지급 차단을 검증했다.
  실제 PG·운송사 발송·운영자 운영 계정·운영 금융 데이터는 사용하지 않았다. 외부 알림 전달은 대체했다.

종료 직전 fixture에는 checkout 8, fulfillment 주문 3, shipment 2, settlement 1 등 실제 합성 업무 행이 있었다.
종료 시 ownership marker를 재확인하고 `finally`에서 이번 DB를 제거했다.
`pg_database` 해당 DB 건수 **0**, 다른 DB 이름 목록 보존을 확인했다. 기존 개발 DB·다른 컨테이너는 삭제하지 않았다.

### 주문 호환 조회·페이지 경계

`supplier-unified-order.integration.test.ts`와 `supplier-unified-order.service.test.ts`:
**2 suites / 24 tests PASS**(DB 통합 14 + 단위 10).

- 두 원장의 300건 초과 조회, 전체 건수·빈 페이지·동률 정렬, bridge 중복 제거,
  공급자/서비스/결제 scope와 조회 실패 전파를 검증했다.
- fixture의 DDL·행은 transaction rollback 후 public/neture 테이블 **0**, neture schema **0**.
  그 뒤 해당 전용 DB도 소유권 확인 후 제거하여 `pg_database` 잔존 **0**.
- 현행 통합 조회는 페이지 상한 100이며 전체 건수와 페이지를 같은 snapshot에서 읽고 상세 집계는 해당 페이지에 한정한다.
  운영 주문 표본이 없어 사용하지 않는 호환 경로라고 판단할 근거는 없다. 삭제하지 않았다.
- 이는 격리 데이터의 기능·페이지 경계 검증이다. 운영 동시 사용자·지연시간·트래픽 부하 시험으로 표현하지 않는다.

## main·배포 확인

- 통합 [PR #595](https://github.com/Renagang21/o4o-platform/pull/595)와 원본 #584/#592는 MERGED.
  통합 target `761fb49e3e289cee4312f0d01b87a3c6e43058cb`.
- 해당 target의 [Promote 38658675983](https://github.com/Renagang21/o4o-platform/actions/runs/38658675983) SUCCESS:
  API build-and-deploy, Neture·Store deploy, 최종 serving SHA Report 성공.
- 삭제 원칙 [PR #604](https://github.com/Renagang21/o4o-platform/pull/604)는 MERGED.
  현재 main에는 로그인·접속·보안·감사기록을 개인정보 보존 정책과 구분하는 후속 기준도 포함돼 있다.
- 기준 main의 [Delivery 38688367732](https://github.com/Renagang21/o4o-platform/actions/runs/38688367732) SUCCESS,
  Neture deploy·serving Report 성공을 확인했다. 과거 target과 현재 source를 동일한 배포 검증으로 합치지 않는다.
- 현재 API `/health`·`/health/ready`, supplier·store HTML 각각 HTTP 200.
  HTML/health 응답만으로 현재 개별 서비스의 정확한 serving SHA를 새로 측정했다고 주장하지 않는다.
- 이번 작업은 배포를 dispatch하거나 PR을 병합하지 않았다.

## 운영자 완전 삭제 이후 확인 — 2026-10-15

사용자 실행 증적:

- 운영자 등록 상품 목록에서 **이번 Offer 1개만** 휴지통으로 이동. 해당 목록 27 → 26.
  이동 요청 자체의 기록은 없으며 휴지통에 들어온 것으로 확인했다.
- 휴지통에서 동일 Offer의 `DELETE /api/v1/neture/operator/product-cleanup/hard-delete/:offerId` 실행, HTTP 200.
  사용자 보고의 전체 ID가 비공개 실행 journal의 이번 생성 ID와 일치한다. 휴지통 2 → 1.
- 해당 Offer의 spot 가격 정책도 삭제됐다고 보고했다. 다른 휴지통 항목과 상품은 수정하지 않았다.
- source상 이 API의 transaction은 spot 정책과 Offer를 삭제하며 FK 연결은 CASCADE다.
  운영 DB 직접 조회로 모든 연결 테이블의 잔존 건수를 독립 실측한 것은 아니다.

삭제 이후 독립 확인(모두 HTTP 200):

| 조회 | 결과 |
|---|---|
| 공급자 상품 | 5개, 대상 ID 없음. 테스트 전 원래 Offer 5개의 ID 집합과 정확히 일치 |
| 공급자 재고 | 5개, 대상 offer_id 없음. 원래 Offer 5개의 ID 집합과 정확히 일치 |
| 공유 ProductMaster 단건 | 200, 기존 master ID·이름·barcode 유지. 공유 원장을 삭제하지 않음 |
| 매장 공급 옵션·장바구니·주문 | 각각 0개, 대상 없음 |
| 공급자 통합 주문·정산 | 각각 0개 |
| 이번 격리 DB 2개 | 로컬 컨테이너 재시작 후 catalog 재확인, 각각 pg_database 잔존 0 |

로컬 비공개 실행 journal을 정리 완료 상태로 갱신했다. 초기 catalog 재조회는 컨테이너가 중지돼 실패했으며,
기존 소유 PostgreSQL 컨테이너를 재시작한 뒤 재조회했다. 실패 실행을 잔존 0의 증거로 사용하지 않았다.
업무 코드 변경이 없어 앞선 63건을 불필요하게 재실행하지 않았고, 이번에는 삭제 이후 기능 조회와 문서 검사를 수행했다.

사용자가 언급한 휴지통 이동 확인창 동작은 해당 요청 기록이 없어 원인이나 UI 결함을 확정하지 않았다.
이를 확인하려고 운영에 새 테스트 상품을 만들거나 다른 항목을 삭제하지 않았다.

## 완료·인계

이번 운영 테스트 Offer 정리와 격리 업무 흐름 검증의 미해결 blocker는 없다.
운영 부하·호환 경로 제거는 별도 실사용·트래픽 근거가 있을 때 판단한다. 이번 완료 범위로 확대하지 않는다.
새 업무 코드 결함은 발견하지 않았다. SETUP에는 실행 전 DB 소유권·실패 시에도 finally 정리·삭제 후 잔존 확인을 명시했다.
기록용 branch push·PR까지 수행하며 병합·배포는 통합 담당에게 인계한다. worktree는 PR 병합 전까지 KEEP한다.

문서 정합: 실계정 승인·기록 보존 계획을 철회하고 운영자 완전 삭제 결과와 후속 조회를 반영해 COMPLETED로 갱신했다. 현행 사업·정산 정책 변경 없음.


## 통합 후속 — 실행 가능한 소유권·finally 정리 (2026-10-16 KST)

#618 리뷰에서 SETUP 예시가 lifecycle 설명과 달리 bootstrap/test를 별도 프로세스로 실행하던 결함을 확인했다. `scripts/dev/run-supplier-store-fixture.ts` 한 프로세스가 전용 loopback URL을 검증하고 DB 존재 시 거절, 생성 후 무작위 database comment marker 기록, canonical bootstrap·incremental prefix fingerprint 확인, 합성 업무 테스트 실행, finally에서 소유권 확인·DROP·잔여0 검증을 수행한다. 기존 DB·타 연결 강제 종료·FORCE DROP은 없다. 연결값은 출력하지 않는다. SIGKILL/호스트 종료의 finally 한계와 잔여 확인도 명시했다.

격리 PostgreSQL15에서 실제 공급자→매장 통합 **2 PASS**, bootstrap 전체 fingerprint 일치, 성공 후 DB0을 외부 control 조회로 확인했다. 기존 동일 이름 DB는 실행 거절 후 보존(1건), 검증 하네스가 만든 DB만 직접 정리했다. 테스트 자식 프로세스 실패를 주입했을 때도 wrapper 실패 코드와 finally cleanup·DB0을 확인했다. 컨테이너는 종료·제거했다. 실제 운영 DB·계정·PG 결제·메일·배송 요청은 실행하지 않았다. build:packages·script lint·문서 민감정보·diff 검사 PASS.

같은 문서 통합 branch는 #611 인증 후속 TODO와 #633 My Home UX 계획의 전체 이력도 포함한다. 계획 문서를 병합해도 그 계획의 구현·운영 검증이 완료되는 것은 아니다. 실제 인증 계정 비교의 로그 접근 제한은 유지한다.


### 같은 통합 PR 리뷰 후속 — 서버 준비와 중단 시 정리

SETUP의 앞부분도 wrapper 소유권 모델에 맞춰, PostgreSQL 서버만 준비하고 대상 DB는 없는 상태로 유지하도록 고쳤다. 로컬 role의 CREATEDB 및 postgres 관리 DB 접속 권한을 명시했다. 동기식 테스트 자식 호출을 비동기 spawn으로 바꾸고 SIGINT/SIGTERM을 받아 이번 실행의 자식만 중지한 뒤 소유권 확인·DB 정리·잔여0 확인을 수행한다. Linux는 생성한 자식 process group, Windows는 해당 자식 PID의 task tree만 대상으로 한다. 다른 DB 연결을 강제로 끊지 않는다.

Linux 격리 PostgreSQL15에서 성공2 tests/DB0, 기존 DB 거절·보존, 자식 실패/DB0을 다시 확인했다. 실제 장기 대기 자식 프로세스 실행 중 SIGINT와 SIGTERM 각각을 전달해 비정상 종료 코드 및 finally cleanup PASS·외부 DB count0을 확인했다. 컨테이너 제거 완료. Windows taskkill 분기는 이 Linux 환경에서 실행하지 않았으며, SIGKILL/호스트 종료의 한계는 유지한다.
