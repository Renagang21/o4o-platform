# 테스트 매장 정리의 참조 삭제·보존 규칙

> 상태: COMPLETED
> 작성일: 2026-10-11 · 최종 갱신: 2026-10-11
> 근거: [잔여 업무 검증](WO-O4O-STORE-REMAINING-WORKFLOW-VERIFICATION-V1.md)
> 범위: 기존 정리 CLI의 주문 소유 참조·감사 이력·상품 출처 처리

## 승인과 경계

사용자는 기존 자료를 테스트 데이터로 확인하고, 유지 매장 A를 제외한 테스트 매장 정리와 기존 운영자·관리자 계정 전체 보존을 승인했다. 기존 cutoff·정확한 후보 fingerprint·원본 소유 관계·plan digest·복구 기록·트랜잭션 경계를 유지한다. 공급자·사용자·Demo registry는 삭제 root가 아니다. workflow·권한·Core·schema/migration·dependency 변경은 없다.

KPA 역할 정본 §7은 감사 이력의 보존을 요구한다. B2B 주문 계약과 소비자 commerce 경계를 먼저 확인했으며 주문 기능을 복구하거나 변경하지 않는다. 이번 변경은 승인된 테스트 조직 정리 CLI에만 적용된다.

## 조사와 구현

기존 운영 read-only plan 38128450487은 두 주문 컬럼(각 14행), 감사 대상 2행, 상품 출처 1행에서 미모델링 참조로 중단됐다. 실제 삭제는 미실행이었다.

| 참조 | 처리 |
|---|---|
| `checkout_orders.sellerId` / `sellerOrganizationId` | organizations에 대한 명시적 소유 참조로 추적. UUID 판매자/판매 조직이 유지 조직에 걸리면 차단. 플랫폼 문자열을 조직 UUID로 간주하지 않음. 새 소유 edge가 미선택 UUID 참조를 숨기지 않도록 coverage 검사 유지 |
| `kpa_operator_audit_logs.target_id` | `target_type=member`이고 실제 삭제 graph의 kpa_members에 일치하는 역사적 대상만 보존. 감사 테이블을 보호 대상으로 지정. 알려지지 않은 target discriminator는 차단 |
| `organization_product_listings.source_id` | event-offer 서비스의 ensureStoreProduct가 복사한 출처 기록. 유지 매장 A 소유, `source_type=event-offer`, 실제 graph 원본과 master/offer identity가 모두 일치할 때만 해당 매장 행 보존. 다른 조직·불명확한 출처·identity 불일치는 차단 |

보존 행 전체는 graph의 retainedReferences로 before-image와 plan digest·기존 recovery 기록에 포함한다. 실제 삭제 후 같은 PK의 보존 행이 정확히 불변인지 확인하고, 누락·변경 시 transaction 전체를 rollback한다. 공개 결과는 테이블명·수량만 출력한다.

## 실제 검증

- 정리 CLI 안전 단위 검증 16개 PASS (relink/census 포함 33개 PASS).
- 격리 로컬 PostgreSQL 시나리오 6개 PASS: read-only plan, 실제 apply와 유지 매장/계정/감사/출처 불변, 알 수 없는 출처 차단, master 불일치 차단, 유지 매장 seller 조직 혼재 차단, 보존 before-image 변경 시 digest 거부·rollback.
- 로컬 fixture database는 서버 control file/process/socket identity 확인 후 무작위 자기 이름으로 생성했고 실행 종료 시 삭제했다. 운영 연결·운영 write를 사용하지 않았다.

## TODO

- [x] 정본·producer·기존 참조 차단 조사
- [x] 소유 참조와 역사적 보존 규칙 구현
- [x] 단위·실제 PostgreSQL 검증
- [x] PR required CI·리뷰·main 통합·사후 확인
- [x] 운영 read-only plan에서 정확한 16개 후보와 전체 영향 확인
- [x] 적격 plan·동일 digest·공유 runtime 직렬화 확인 후 승인 범위 apply
- [x] 실제 테스트 계정의 접근 가능 매장 1개 및 유지 관계·계정 검증

운영의 출처 discriminator/identity가 위 조건을 충족한다고 가정하지 않는다. 운영 plan에서 추가 차단이 있으면 그 근거를 확인하고 보완한다. CLI·테스트·기록만 변경하므로 서비스 배포는 NOT_APPLICABLE이며, 운영 데이터 정리 실행과 구분한다.

## 동일 WO 보완 Phase — 주문 변경 로그

PR #476은 main `7aad4eed9689f0515889e3a4f5a1ff260d94ee67`에 통합됐고 PR CI 38132184172, main 사후 CI 38132732306 및 CodeQL 38132732302 PASS다. 작업 branch에서 요청한 read-only run 38132195128은 production의 main ref 제한으로 시작되지 않았다. 제한을 변경하지 않고 main에서 다시 실행했다.

main read-only plan 38132747331은 기존 네 컬럼의 참조를 처리한 뒤 `checkout_order_logs.orderId` 14행의 미모델링 참조로 중단됐다. apply·삭제는 0건이다. OrderLog entity는 주문 상태 변경·운영자 감사·분쟁 이력을 기록하며 물리 schema의 orderId에는 cascade FK가 없다. 매장 약관 정본의 운영·보안로그 보존 경계에 따라 실제 삭제 graph의 checkout_orders에 일치하는 역사적 orderId만 보존한다. checkout_order_logs도 보호 대상으로 두고 전체 before-image/digest/recovery/post-delete 불변 검증에 포함한다. 다른 ID·테이블·컬럼은 보존 예외로 확장하지 않는다.

같은 전용 worktree/branch를 동일 WO 보완 Phase에 이어 사용한다. 보완된 로컬 SQL 6개와 안전 검사 33개가 PASS이며 운영 재plan은 최신 코드의 기술 gate와 main 통합 후 실행한다.

## 운영 완료 및 사후 확인

PR #477은 main `abdbe8894d069554a54afbd8513c8034bdaf27cb`에 반영됐고 최신 PR CI 38133579365, main 사후 CI 38134168847 및 CodeQL 38134168871 PASS다. 같은 WO의 결과 기록 Phase도 기존 전용 worktree/branch를 이어 사용한다.

- 운영 read-only plan **38134169210 SUCCESS**: 정확한 16개 조직, 32개 테이블·352행의 정리 범위, 보존 이력 17행 확인.
- 운영 apply **38135279630 SUCCESS**: plan과 동일 digest·테이블/수량·보존 이력·계정 수. 기존 복구 테이블에 before-image를 저장하고 정리 후 원본 유지 조직·사용자 수·보존 행 불변을 검증해 commit했다. 실행 head는 `bd95b0ec21945904df73ed1007486132726eda00`이며 CLI와 workflow 및 직접 import source가 검증한 #477 코드와 동일함을 확인했다.
- 실행 전 다른 운영 인프라 작업의 종료와 Delivery의 실행 job skip을 확인했다. apply 동안 다른 배포·운영 변경 작업이 없음을 다시 확인했다. 기존 main ref·owner·freeze gate를 유지했다.
- 사후 read-only discovery **38136199586 SUCCESS**: 기존 cutoff 안의 삭제 후보 0개, 유지 매장 원래 primary owner 관계 확인, 사용자 5개·활성 Demo 2개·운영자/관리자 2개 유지.
- 실제 계정 API: 접근 가능 매장 **17개 → 1개**, 유지 매장 A 존재·서비스 판정 200/resolved·활성 KPA 업무 연결 1개. 공급자 로그인·본인 조회 200 및 기존 공급자 role 확인.
- desktop 1440px / mobile 390px 브라우저 **20개 PASS**: 로그인·handoff, 단일 매장 A 자동 선택, 내 매장·자료함·자체 상품·QR·태블릿 관리 직접 경로, 자료함·QR·태블릿 메뉴 클릭. 대상 API 200, 기록된 API/화면 오류 0.

| 보존한 역사적 참조 | 행 수 |
|---|---:|
| checkout_order_logs | 14 |
| kpa_operator_audit_logs | 2 |
| 유지 매장의 organization_product_listings 출처 기록 | 1 |

단일 매장은 StoreContext의 effectiveId 규칙으로 자동 선택된다. sessionStorage에 명시 선택값을 쓰지 않는 것은 정상 동작이다. 브라우저 검증은 접근 목록의 유일한 A, 서버 store-services의 resolved/A 응답, 실제 X-Store-Organization-Id 헤더의 A 일치로 확인했다. 처음 저장값을 비교한 검사만을 선택 실패나 제품 버그로 해석하지 않는다.

초기 브라우저 TLS 오류는 이번 턴의 기존 NSS 신뢰 DB 접근을 허용한 후 해결됐다. CA 추가·TLS 검증 비활성화 없이 기존 환경 CA로 다시 검증했다. 실제 QR 스캔·물리 태블릿 출력은 이번 결과에 포함하지 않는다. 운영 원본 변경·두 정상 매장·물리 기기 TODO는 상위 잔여 검증 WO에 유지한다.

계정·조직 식별자·원문 응답·private 실행 기록은 공개 문서에 넣지 않았다. 서비스 배포는 NOT_APPLICABLE이며 위 운영 데이터 apply는 실제 실행·검증 완료다.
