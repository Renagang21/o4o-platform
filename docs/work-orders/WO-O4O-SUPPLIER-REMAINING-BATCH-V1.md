# 공급자 잔여 개발 보완 일괄

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거**: 사용자 — 남은 부분도 일괄 진행, push까지만

## 작업 경계와 TODO

최초 TODO는 조사 전에 `/workspace/artifacts/supplier-remaining-batch-todo.md`에 작성했다.
최신 main `d42b94053`과 직전 공급자 push `04966c122`의 차이를 조사했다.
직전 안정화는 main에 없으므로 새 독립 checkout/`wo/supplier-remaining-batch`에 dependency merge했다.
다른 작업 폴더/branch 및 원격 `wo/supplier-write-stability`는 수정하지 않았다.

- [x] 최초 TODO → 최신 정본·코드·소비처·테스트 census → 범위 보정
- [x] 재고 version 비교와 실제 화면 충돌 복구
- [x] 기존 정산 연결 UNIQUE 충돌의 사전 검출·운영자 안내
- [x] 현재 supplier에게 보이는 bridge만 호환 조회에서 중복 제거
- [x] PostgreSQL·HTTP·웹 회귀 및 PC/mobile fixture browser 검증
- [x] 타입·빌드·lint·차이 검사
- [x] 명시적 파일 commit → branch push 및 원격 일치 확인

main PR/merge·배포·운영 DB 쓰기는 범위 밖이다. 사용자 유예 실계정 검증은 그대로 유지한다.
최종 fetch에서 main이 `9400a625e`로 이동했다. 추가 경로는 PharmacyHub 퇴역 스크립트/워크플로/기록이며 이번 변경 경로와 겹치지 않는다.
push 종료 범위이므로 자동 main 통합을 하지 않았으며, 나중의 PR 통합 시 최신 main을 다시 확인해야 한다.

## 최신 조사로 확정한 구현

관련 정본은 [Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[B2B Contract](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[Commerce Boundary](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)다. 이전 IR의 bridge 부재를 현행 사실로 사용하지 않는다.

| 영역/소비처 | 확정한 문제 | 변경 |
|---|---|---|
| InventoryService → InventoryController → supplierApi → SupplierInventoryPage | 행 잠금만으로 오래 열린 화면의 절대값 덮어쓰기를 구분할 수 없음 | 조회/수정 응답의 opaque `inventory_version`, 선택적 `expected_version` 비교. 같은 행 잠금 안에서 비교 후 쓰기. 충돌은 409 |
| 재고 화면 저장·추적 토글 | 추적 토글은 서버의 최신 재고·version을 반영하지 않음. 오류 시 저장 상태 복구 필요 | 편집 시작 snapshot 전달, 서버 응답 병합. 충돌은 자동 재시도 없이 최신 조회 후 명시적 재검토. 조회 실패는 기존 오류/재시도 화면 |
| 재고 화면 mobile/접근성 | 좁은 화면의 4열 통계가 글자 단위로 줄바꿈. 토글/입력 label 연결 부족 | 자동 2/4열 grid, switch 접근성 상태와 입력 label 연결. 새 UI route 없음 |
| SettlementCommandService → AdminSettlementController → adminSettlementApi → 기존 계산 UI | 같은 주문이 두 supplier aggregate에 나타나면 UNIQUE 오류를 기존 기간 중복으로 오해 | INSERT 전에 겹침 검출. `SETTLEMENT_ORDER_SUPPLIER_CONFLICT`와 안내를 409로 전달. 기존 UI 메시지 경로 재사용 |
| SupplierUnifiedOrderService의 checkoutScopeSql | 다른 supplier/service 또는 item 연결 없는 bridge 포인터도 정상 paid checkout을 숨김 | supplier ownership+visible service+item 연결이 있는 fulfillment만 checkout 중복 제거. checkout은 read-only 유지 |

## 보존한 계약

- 기존 versionless inventory 호출은 호환 유지한다. 현재 화면은 version을 사용한다. schema/migration과 새로운 version column은 없다.
- version은 재고 필드·행 갱신 시각에서 계산하며 배송 등 비UI 쓰기도 반영한다. 권한 토큰이 아니다.
- 기존 수수료·반올림·PAID+DELIVERED eligibility·정산 상태 전이·원장·UNIQUE를 유지한다.
- 혼합 supplier 주문의 금액 분배를 임의 결정하거나 자동 분리/backfill하지 않는다. 현재 저장 제약에 맞지 않는 연결을 조기에 거절한다.
- 기존 auth/active supplier/admin scope, source pagination/count snapshot, 호환 조회 오류 전파와 fulfillment URL 계약을 유지한다.
- 실제 paid+bridge 운영 근거 없이 호환 조회를 폐쇄하지 않는다. 이번 변경은 읽기 정합성 보완이다.

## 검증과 사용자 후속

[검증 기록](../checks/CHECK-O4O-SUPPLIER-REMAINING-BATCH-V1.md) 및
[사용자 실계정 검증 절차](../guides/SUPPLIER-REAL-ACCOUNT-VERIFICATION-V1.md)를 참고한다.
개발·로컬 검증 완료와 main 통합/운영 동작 확인은 별개다.
실계정·실데이터·실운영 부하는 NOT_RUN이다. 호환 조회 제거 판단과 금융 분배/schema 변경은 후속 근거/승인 대상이다.

문서 정합: 정본 정책·이전 WO/CHECK는 유지하고 이번 실행 기록/검증 절차만 추가했다.

## Git 인계

구현 commit `48d4cc56cf15a9bc6484dd32aac4b5b3d2ed49af`를 `wo/supplier-remaining-batch`에 push했고 `ls-remote`로 일치를 확인했다.
이 branch에 앞선 쓰기 안정화도 포함된다. 종료 기록 commit의 원격 SHA는 최종 보고에서 확인한다.
승인된 개발·검증·commit/push 범위 완료이며 main 통합·배포 완료를 뜻하지 않는다.
독립 checkout/branch는 KEEP — main 미통합, 후속 인계에 필요하다.
