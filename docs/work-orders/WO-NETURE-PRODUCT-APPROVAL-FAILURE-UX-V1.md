# Neture 상품 승인 — 실패·부분 실패 처리 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 요청 — 다음 운영자 코드 정비 작업 진행, push까지

## 범위와 이전 TODO

[이전 상품 승인 TODO](https://github.com/Renagang21/o4o-platform/blob/a5121b8065564eeafab15a0a239cd59e1b4feaf3/docs/work-orders/WO-NETURE-PRODUCT-APPROVAL-MODEL-REFINEMENT-V1.md)의 실패 UX 항목을 진행한다.
최신 기준 main `aa59a0962f1295f1203bbc1261befb09b98a6f6e`에서 화면·API·backend 계약을 다시 조사했다.
이전 요청값/선택 함수 분리 branch는 미병합이며 자동 합치지 않는다. 이번 작업은 기존 main의 처리 handler에서 진행한다.
세션 전용 clone/branch를 사용하고 기존 작업공간을 보존한다.

TODO 보완 → 최소 수정 → 검증 → commit/push. PR 생성·main 병합·배포는 제외한다.
서비스 간 공통화는 전체 정비 때 진행한다. 이번 결과 판정 함수는 Neture 내부 모듈이다.
약사회 분회·공통 Core·API/schema·권한 정책·삭제 처리·모바일 카드 레이아웃은 변경하지 않는다.
실계정 지정·재로그인·접근 검증은 사용자 담당이다.

## 조사와 TODO 보완

화면 `/operator/product-service-approvals`, `/admin/product-service-approvals`에서
기존 approve/reject handler가 반환 `success`를 확인하지 않고 모달/입력을 닫고 목록을 갱신한다.
예외가 throw되면 loading 해제도 보장되지 않는다.

일괄 backend는 각 id를 처리해 `{approved|rejected, failed, errors}`를 만들고,
controller는 일부/전체 항목 실패에도 `{success:true,data:...}`를 반환한다.
frontend adapter는 성공/실패 count를 선언하지만 구조화된 실패 id는 제공하지 않는다.
`errors` 문자열을 파싱해서 실패 id를 추정하거나 새 API를 만들지 않는다.

| 상황 | 기존 문제 | 이번 처리 | 보존/안전 조건 |
|---|---|---|---|
| 단건/일괄 success:false | 성공처럼 닫힘 | 모달 안 오류 안내 | 메모/사유·선택 유지, 재시도 가능 |
| 일괄 success:true, 성공 0·failed>0 | 전체 완료처럼 닫힘 | 실패 건수 안내 | 같은 선택·입력 유지 |
| 일괄 성공>0·failed>0 | 실패 사실 누락 | 완료/실패 건수 안내, 목록 갱신 | 기존 선택 해제, 새 목록에서 pending 다시 선택 |
| 전체 성공 | 기존 정상 경로 | 완료 안내 후 닫기/갱신 | API·reason·페이지·권한 유지 |
| throw | 미해제 loading/미처리 rejection | catch+finally로 복구 | 입력/선택 유지, 기술 오류 문자열 노출 안 함 |
| 처리 중 반복 확인/취소 | 중복 요청/늦은 응답 위험 | 동기 ref guard + UI 잠금 | 단건/일괄/다른 결정을 동시에 제출하지 않음 |
| 처리 중 unmount | 오래된 write 응답 반영 | 결과 반영과 재조회 생략 | write 요청 자체를 취소한 것으로 보고하지 않음 |

부분 성공 시 현재 목록에 없는 실패 id를 자동 선택하지 않는다. API의 count만 보여주고 사용자가 새 목록에서 다시 선택한다.
갱신 실패 때도 성공한 상품을 재전송하지 않도록 선택은 갱신 전에 해제한다.

## 작업 TODO

- [x] 최신 main, route, adapter와 controller/service 응답 계약 조사.
- [x] 실패/부분 성공/전체 실패/throw/중복/수명 보존 조건과 검증 기준 보완.
- [x] Neture 내부 결과 판정 함수와 단일 승인/거절 실행 절차 정리.
- [x] 실패 입력 유지, 부분 성공 안내·선택 초기화, finally 복구·동기 중복 guard 추가.
- [x] 단위·화면 회귀 검증 (실패 후 재시도, partial 후 성공 id 재전송 방지 포함).
- [x] Neture 전체 테스트·타입·build·lint, desktop/mobile 기능 smoke.
- [x] CHECK 기록, commit/push.

검증 기록: [CHECK](../checks/CHECK-NETURE-PRODUCT-APPROVAL-FAILURE-UX-V1.md).

## 후속 TODO

- [ ] 목록/통계/분석 조회의 응답 순서, 타이머 수명, 현재 필터와 선택의 관계는 별도 A1 작업.
- [ ] 모바일 카드 상품명 표시와 Drawer/모달 책임 분리는 R1 작업.
- [ ] 상품 삭제 실패 처리와 대상 보존은 별도 민감 작업 검증 범위.
- [ ] 전체 계정 삭제·서비스 권한 정책·DB 변경은 이 작업에 포함하지 않음.
- [ ] 서비스 간 공통화는 전체 정비 후보로만 기록.

## 문서 정합

현재 실패 UX 항목을 상세화한다. 과거/미병합 branch의 기록과 권한 정본을 이번 branch에서 재작성하지 않는다.
