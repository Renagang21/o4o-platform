# PH 개발·미디어 데이터 삭제 apply 및 WIF 복구

> **상태**: ACTIVE · **작성일**: 2026-10-17
> **근거 WO/IR**: [PH 퇴역 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md), [참조 batch 검사 V4](CHECK-O4O-PHARMACYHUB-REFERENCE-BATCHES-V4.md)

PharmacyHub 는 완전 삭제 대상이다(사용자 재확인 2026-10-16). 이 문서는 개발 데이터·미디어 삭제 apply 와 그 창의 WIF 제한·복구 증적이다. 행 식별자·URL·객체 경로·인증 조건 원문은 기록하지 않는다.

## 1. 선행 정리

- Demo 복구 snapshot: 검증 완료 store-cleanup snapshot 1행에서 이미 삭제된 PH 미디어 묶음 before-image 9행(store_execution_assets 4 · store_asset_derivations 2 · store_pop_documents 3)만 제거하고 변경 기록 1행을 추가했다(사용자 한정 승인). before sha256 7f59e5cf13b90c7b5d0ca8117fbd9bf062ab9c18ca56199d66f8df46feb584e2 → after 92a0708cba680c6792be3c5eb27f643d2e853b3eebc4b48857dc8ccfe2231137, 기록 행 ph-media-redaction-7f59e5cf13b90c7b, 보존 4행 해시 불변. guard 는 변경하지 않았다.
- 참조 검사 성능: grouped keyset 검사의 텍스트 비교를 전체 대상 정규식 alternation 에서 대상별 literal strpos("C" collation)로 바꿨다(PR #658, 19b4c4e276). 같은 literal substring 판정이며 범위·컬럼·batch·timeout 은 그대로다.

## 2. read-only plan (main 3c9d599f0bcdeb9c9d0c11509711cb77a139a838)

| 구분 | run | 결과 | worker total_ms |
|---|---|---|---|
| 개발 | 38915310832 | success · applied=false · rowsToDelete 41 (checkout_order_logs 6 · o4o_payments 6 · offer_service_approvals 18 · offer_service_prices 1 · cms_contents 3 · forum_category_requests 1 · checkout_orders 6) · offerAssociations 19 · offerRowsPreserved 19 · exclusiveOffersRetired 19 | 245850 (이전 560847) |
| 미디어 | 38917458710 | success · applied=false · assets 4 · links 1 · objects 4 · missingObjects 0 | 178617 (이전 322943) |

apply 진행 기준(기대 수량 일치 · worker 300초 이하)을 둘 다 충족했다. 가장 느린 구간은 개발 shared_product_descriptions 87049ms(이전 50906ms, 긴 HTML 텍스트에서는 strpos 가 더 느림), product_candidates 67653ms(이전 232236ms)다.

## 3. apply 창

- 조율: 같은 PC 의 통합·개발 세션 3개 모두 진행·예정 운영 작업 0 을 명시 회신했고, 통합 담당이 main 을 3c9d599f0b 에 고정했다. 창 시작·종료를 각 세션에 통지했다.
- WIF: provider 원래 조건 전문을 저장소 밖에 백업했다(653 bytes, 재조회·JSON 과 바이트 일치, sha256 a311157e76aaf9777bac45ab1942ef63d22fb2c50430a6975ca5f19c3cfcde1f). restrictedWifCondition(3c9d599f…) 로 제한 후 재조회 일치(sha256 b02b059df88443f340efafedf77021e0f33f2a821e320a6efe944fd74c7dbf47).
- 개발 apply 38918933176: success. job 은 테이블별 삭제·연결 해제 건수가 고정 census 와 다르면 ROLLBACK 한다.
- 미디어 apply 38920662673: success. GCS 객체는 generation 조건으로 삭제하고 DB commit 전 부재를 확인한다.
- WIF 복구: 백업 전문으로 갱신, 재조회 sha256 이 백업과 일치(WIF_RESTORED). gcp-wif-auth-smoke 38922333939 success(WIF_AUTH_PASS). 이후 통합 담당이 대기열을 재개했다(main 5477a971f2).

## 4. 잔여·보존 검증 (read-only)

- PH 범위 0: checkout_orders · o4o_payments · offer_service_approvals · offer_service_prices · cms_contents · forum_category_requests · media_assets, PH service key 를 가진 supplier_product_offers 0.
- 보존: supplier_product_offers 27행(공유 offer 는 PH 연결만 제거) · media_assets 64행 · 존재하지 않는 asset 을 가리키는 media_entity_links 0 · canonical_demo_repair_snapshots 6행, 해시 1번 항목과 동일.
- 범위 밖 발견: 주문이 없는 checkout_order_logs 14행(2026-08-13~17 생성, PH 표식 0, FK 없음)은 이번 삭제 이전부터 있던 데이터다. 정리하지 않았다.

## 5. 남은 PH 퇴역 작업 (완료 아님)

- snapshot 2차: 삭제된 테스트 매장 before-image 의 PH 잔여(enrollments 8 · platform_store_slugs 8 · organization_product_listings 19 · POP 문서 1 · QR/스캔/URL 언급 26 · 매장명), store-cleanup inventory 매장명 1, store-relink 매장명 1.
- PH 활성 등록·권한·호환 참조와 잔여 공용 코드 정리(TODO 15·16·19).
