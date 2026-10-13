# Neture 상품 승인 — 요청값·선택 대상 정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 요청 — Neture 상품 승인 화면 요청값 구성·선택 대상 판정 조사 진행

## 기존 TODO와 이번 작업

[항목별 2차 TODO](https://github.com/Renagang21/o4o-platform/blob/e282d13f36f8bc07b4f09b57084889ed97b5ed7b/docs/work-orders/WO-O4O-OPERATOR-COMPLEXITY-PHASE2-TODO-V1.md)의 상품 승인 F1/C1/T1 조사 항목을 상세화한다.
이전 TODO는 미병합 branch의 기록이므로 이번 main 기준에서 코드를 다시 조사하고 다른 branch를 자동 합치지 않는다.
기준: `origin/main af24236df8d38457f2b2d7889ae983caa3ea675f`.
종료 범위: TODO 보완 → 서비스 내부 함수 추출 → 검증 → commit/push. PR 생성·병합·배포 제외.

서비스 간 공통화는 전체 정비 때 진행한다. 이번에는 Neture 내부 모듈만 추가한다.
약사회 분회 제외, 기존 공유 모듈·API·권한·업무 상태 전이·DB 변경 없음.

## 조사 결과와 TODO 보완

화면 `ProductServiceApprovalPage`는 `/operator/product-service-approvals`와
`/admin/product-service-approvals`에 mount된다. 1,167줄이며 주요 함수의 분기 복잡도는 기존 조사 56이었다.
목록과 통계는 함께 조회하며 결과를 적용한 뒤 선택을 초기화한다.
원문 파일 경로 소비처 검사에서 살아 있는 raw-source 검사 계약은 확인되지 않았다.

| ID | 조사 대상 | 발견 | 정비 방법 | 보존 조건 |
|---|---|---|---|---|
| F1 | 요청값 구성 | 조회 callback 안에서 점수 구간·필터·페이지 조립 | 내부 `buildServiceApprovalListParams` | status all→undefined, 빈 필터→undefined, 공백/기간 값 전달, limit 30 |
| C1 | 선택 대상 판정 | selectedIds→현재 items 중 pending만 허용 | 내부 `getSelectedPendingServiceApprovalIds` | 승인 레코드 id, 선택 순서, 정확한 소문자 pending, 첫 일치 기준 |
| T1 | 요청/행동 연결 | filter→조회, 선택→모달→승인/거절→재조회 | 단위·화면·browser 회귀 | API·메모·사유·권한·페이지 재조회 유지 |

- 점수: low=0~59, mid=60~79, high=80 이상, 전체는 범위값을 넣지 않는다.
- hasIssues는 true일 때 문자열 `'true'`, false일 때 undefined다.
- priority/service/date/search는 기존 값을 그대로 전달한다. 추가 검증·정규화하지 않는다.
- 선택 대상은 현재 목록의 `ServiceApprovalItem.id`다. 상품 `offerId`나 이전 페이지에만 있는 id로 일괄 처리하지 않는다.
- pending 판정은 현재 존재하는 한 표현이며, 이번 작업은 새 중복을 제거했다고 설명하지 않는다.
- 필터 변경 후 page 1 조회, 기존 페이지로 처리 후 재조회, 조회 후 선택 초기화를 유지한다.
- 기존 상세/삭제/분석/검색 debounce/승인·거절 handler는 범위를 넓혀 변경하지 않는다.

## 작업 TODO

- [x] 최신 main, route, API list·batch 계약과 원문 소비처 조사.
- [x] 기존 TODO를 이번 작업의 보존 조건·예외·검증 기준으로 보완.
- [x] Neture 내부 요청값·pending 선택 함수 추출.
- [x] 점수 경계·빈 필터·전체 필터·선택 순서/ID·비대기/누락 대상을 단위 검증.
- [x] 필터 연계·일괄 승인/거절·권한 제한의 화면 회귀 검증.
- [x] Neture 전체 테스트·타입·build·lint, desktop/mobile browser 검증.
- [x] CHECK 기록, commit/push.

## 범위 밖 발견과 후속 TODO

- [ ] 기존 승인/거절 handler가 API의 `success:false`와 일괄 부분 실패 결과를 명시적으로 구분하지 않는다. 별도 실패 UX 작업으로 검토.
- [ ] 조회·분석의 늦은 응답, 검색 타이머 수명, 중복 저장 방어를 A1 항목으로 조사.
- [ ] 상세 Drawer·행동 모달·품질 표시의 R1/C1 책임 분리 조사. 390px 카드 상품명 폭이 0인 기존 표시 문제도 포함 (main 원본 대조 확인).
- [ ] 이번 결과를 전체 항목별 TODO의 다음 작업 착수 시 반영. 다른 미병합 branch를 수정·재작성하지 않는다.
- [ ] 다른 서비스와 비슷한 코드가 있으면 전체 정비의 공통화 후보로만 기록.

검증: [CHECK](../checks/CHECK-NETURE-PRODUCT-APPROVAL-MODEL-REFINEMENT-V1.md).
