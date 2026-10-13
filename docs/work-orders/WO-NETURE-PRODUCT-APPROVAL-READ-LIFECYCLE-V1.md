# Neture 상품 승인 — 조회·분석·검색 수명 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 요청 — 다음 운영자 정비, TODO 보완 → 작업 → push

## 기준과 범위

[이전 실패 UX TODO](https://github.com/Renagang21/o4o-platform/blob/66416aec8081b347cf861eec32322ad472de3237/docs/work-orders/WO-NETURE-PRODUCT-APPROVAL-FAILURE-UX-V1.md)의 A1 조회·타이머 항목을 진행한다.
기준 main `aa59a0962f1295f1203bbc1261befb09b98a6f6e`에서 새로 조사했다.
이전 요청값/선택 분리·실패 UX branch는 미병합이며 자동 합치거나 수정하지 않는다.
종료 범위는 commit/push다. PR 생성·main 병합·배포는 제외한다.
세션 전용 clone/branch를 사용한다. 약사회 분회와 서비스 간 공통화는 제외한다.

정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9,
[공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).
이번에는 기존 Neture 내부 `useLatestRequest`를 재사용하며 해당 hook이나 공유 패키지는 수정하지 않는다.

## 조사 → TODO 보완

`ProductServiceApprovalPage`의 목록/통계와 분석은 늦은 성공·실패·finally 결과도 적용한다.
검색 타이머는 재입력 시 취소하지만 unmount나 분석 바로가기의 즉시 검색에서 취소하지 않는다.
쓰기 후 재조회는 과거 handler가 캡처한 필터·페이지를 사용한다.

| 항목 | 정비 | 보존/검증 조건 |
|---|---|---|
| 목록+통계 | 같은 요청 채널의 최신 응답만 원자적으로 적용 | 예전 성공/실패/finally가 최신 목록·통계·선택·loading을 바꾸지 않음 |
| 필터·페이지 전환 | 필터 scope + 요청 순번으로 보호 | 기본 page 1, limit 30과 기존 요청값/상태 판정 유지 |
| 분석 | 목록과 별도 채널, 기간과 사용자 scope로 보호 | 이전 기간의 성공/실패가 최신 분석을 덮거나 숨기지 않음 |
| 기간 전환 표시 | 응답에 scope를 함께 저장 | 이전 수치는 표시하지 않되 기간 선택은 유지하고 loading 안내 |
| 분석 null/최신 오류 | 오래된 분석 제거·분석 영역만 숨김 | 목록 조회·회원/상품 권한에 영향 없음 |
| 검색 300ms | 재입력·즉시 검색·unmount에서 타이머 취소 | 공백/검색값 원문과 기존 대기 시간 유지 |
| 쓰기 후 갱신 | 최신 필터 callback과 최근 요청 페이지를 ref에 저장 | 처리 중 검색/페이지가 바뀌어도 오래된 화면 조건을 다시 조회하지 않음 |
| unmount | 요청 결과 반영·새 후속 조회 차단 | 이미 전송한 네트워크 요청을 취소했다고 설명하지 않음 |

이전 callback을 요청 채널에 등록하기 전에 scope를 확인해 현재 유효한 요청을 무효화하지 않는다.
승인/거절/삭제 API와 실패 판정은 이번에 바꾸지 않는다. 재조회 대상만 최신 조건으로 맞춘다.
기존 revalidate 성공 후 page 1로 돌아가는 계약도 유지한다. 서버가 페이지를 보정하면 반환된 실제 페이지를 이후 갱신 기준으로 사용한다.

## 작업 TODO

- [x] 최신 main·route·목록/분석/검색·처리 후 갱신 경로 재조사.
- [x] 응답 순서·빈 결과·오류·timer·unmount·과거 callback의 보존 조건 보완.
- [x] 목록/분석 채널에 기존 Neture 요청 수명 hook 적용.
- [x] 분석 결과 scope 저장, 기간 전환의 오래된 수치 표시 방지.
- [x] 검색 timer cleanup와 즉시 검색의 이전 timer 취소.
- [x] 처리 후 최신 조건/페이지의 재조회 경로 정리.
- [x] 순서를 뒤집은 응답·오류/finally·선택·분석·timer·쓰기 갱신 회귀 테스트.
- [x] Neture 전체 테스트·타입·build·lint 및 desktop/mobile 기능 smoke.
- [x] CHECK 기록, commit/push.

검증 기록: [CHECK](../checks/CHECK-NETURE-PRODUCT-APPROVAL-READ-LIFECYCLE-V1.md).

## 후속

- [ ] 이전 실패 UX·요청값 분리 branch와 통합 시 같은 파일의 변경을 대조. 이번에는 통합하지 않음.
- [ ] 모바일 카드 상품명 표시와 Drawer/모달 책임 분리는 별도 R1 작업.
- [ ] 상품 삭제의 실패 결과·입력/대상 보존은 별도 검증 범위.
- [ ] API/DB·전체 계정 삭제·서비스 권한 정책 변경 없음.
- [ ] 서비스 간 공통화는 전체 정비 때 판정.

## 문서 정합

이전 A1 항목을 현재 main 기준으로 상세화한다. 다른 branch의 과거 기록이나 권한 정본을 재작성하지 않는다.
실계정 지정·재로그인·접근 확인은 사용자 담당이다.
