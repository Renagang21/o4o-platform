# Neture 상품 승인 — 요청값·선택 대상 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: [TODO](../work-orders/WO-NETURE-PRODUCT-APPROVAL-MODEL-REFINEMENT-V1.md)

완료 범위는 이번 요청값·선택 대상 함수 분리의 개발·검증·push다. 전체 화면 정비나 main 병합·배포 완료가 아니다.

## 기준과 조사

- Base: `origin/main af24236df8d38457f2b2d7889ae983caa3ea675f`.
- Branch: `wo/neture-product-approval-refinement`.
- 기존 기준 checkout/미병합 작업을 보존하고 세션 전용 clone에서 진행.
- 경로: `/operator/product-service-approvals`, `/admin/product-service-approvals`.
- 목록 API와 통계 동시 조회, 성공 후 선택 초기화, 현재 페이지에서 일괄 처리 후 재조회 계약 확인.
- 파일 경로 literal 검사에서 역사 문서 참조만 확인, 살아 있는 raw-source 계약 없음.
- 기존 2차 TODO의 상품 승인 항목을 이번 WO에서 보존 조건과 검증 기준으로 상세화했다.

## 변경과 유지 계약

`ProductServiceApprovalPage`에서 Neture 내부 `productServiceApprovalModel`로 다음을 추출했다.

- `buildServiceApprovalListParams`: status/service/search/date/page/score/issues/priority 구성.
- `getSelectedPendingServiceApprovalIds`: 현재 items에서 정확한 pending 승인 레코드만 선택 순서대로 반환.

페이지 크기 30, 점수 low 0~59 / mid 60~79 / high 80 이상, 빈 필터 undefined,
hasIssues 문자열 `'true'`, 공백 검색/기간 원문, 승인 id와 offerId 구분을 유지한다.
선택 판정은 원래 한 곳에 있었으며 중복 제거라고 주장하지 않는다. 화면과 독립적으로 검증 가능한 책임으로 이동했다.

승인/거절/삭제 handler와 렌더링 본문은 base 원문과 문자열 대조해 일치를 확인했다.
외부 API/props·권한·route·검색 debounce·analytics·DB·공통 export를 변경하지 않았다.
서비스 간 공통화와 약사회 분회 작업은 없다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| frozen-lockfile offline install | PASS, manifest/lockfile 변경 없음 |
| `pnpm run build:packages` | PASS |
| Neture 전체 Vitest | 74파일·638테스트 PASS |
| 새 내부 모델 테스트 | 12개 PASS |
| 새 화면 연결 테스트 | 4개 PASS |
| Neture `tsc --noEmit` | PASS |
| Neture production build (tsc 포함) | PASS |
| 변경 TS/TSX 4파일 eslint `--max-warnings 0` | PASS |
| desktop 1440/mobile 390 × approve/reject 기능 smoke | 4시나리오 PASS |
| main 원본 390 mobile 기능/표시 대조 | 1시나리오 확인 |
| `git diff --check`, docs 민감정보 검사 | PASS |

단위 테스트: 빈/전체 필터, 4개 점수 구간, 3개 상태, 복합 필터·페이지·공백·입력 불변,
선택 순서·누락/비대기 제외, 승인 ID/offer ID 구분, 대소문자·첫 일치 기준·빈 선택.
화면 테스트: 복합 필터와 debounce 검색 전달, 일괄 승인/거절 ID와 사유·재조회,
Neture 관리 역할이 없을 때 처리 버튼 비활성 유지.

초기 모델 테스트의 검색 기대값에 다른 문자열이 들어 있어 1개가 실패했다.
입력값 그대로 보존하는 기존 계약에 맞게 테스트 오타를 고친 뒤 전체 테스트를 재실행했다.
초기 browser harness는 함수형 Vite config를 객체처럼 merge해 서버 기동에 실패했다.
기존 config의 callback을 호출해 실제 구성을 받은 뒤 합치는 방식으로 검증 harness만 수정했다.

## Browser 검증과 실제 제한

실제 페이지·Neture 스타일·실제 API adapter에 합성 operator 역할과 합성 응답을 주입했다.
실서비스 인증/route wrapper·실계정·운영 데이터 검증은 포함하지 않는다. 실제 접근 확인은 사용자 담당이다.

4개 시나리오에서 score 60~79, hasIssues, HIGH, 공백 검색, limit 30이 요청에 반영되고,
전체 선택 후 승인대기 ID만 batch API로 전달되는 것을 확인했다.
승인 메모/거절 사유와 성공 후 재조회도 유지됐다. browser page error는 없었다.

**기존 모바일 표시 문제:** 390px에서는 카드의 상품명 영역 폭이 0으로 줄어 상품명이 보이지 않았다.
main 원본 컴포넌트를 같은 fixture/스타일로 마운트해 같은 현상을 확인했다.
이번 렌더링 본문은 원본과 동일하다. 모바일 기능 smoke 통과가 모바일 레이아웃 정상 판정을 뜻하지 않는다.
카드 표시 R1 작업의 후속 항목으로 남긴다. DOM에 데이터가 있는 것과 화면 표시 정상 여부를 구분했다.

## 효과와 후속

화면 줄 수 1,167→1,153, 목록 조회 callback cyclomatic complexity 15→5.
주요 화면 함수는 56→56이다. 구성 분기를 내부 함수로 옮겨 책임을 나눈 결과이며,
전체 분기나 상태 수가 줄었다고 설명하지 않는다. 새로운 요청값 검증/정규화를 추가하지 않았다.

- 기존 API `success:false` 및 일괄 부분 실패를 handler가 명시적으로 구분하지 않는 문제는 별도 실패 UX 작업.
- 늦은 응답/중복 저장/타이머 수명은 A1 후속 조사.
- 카드 모바일 표시와 상세 Drawer/모달 분리는 R1 후속 조사.
- 서비스 간 공통화는 전체 정비 때 후보를 다시 판정.

## 문서 정합

이번 TODO에 조사·보존 조건·완료 결과와 후속 항목을 반영했다.
기존 미병합 2차 TODO의 역사 기록을 다른 branch에서 재작성하지 않았다.
정본/권한 정책과 다른 서비스 문서는 변경하지 않았다.
