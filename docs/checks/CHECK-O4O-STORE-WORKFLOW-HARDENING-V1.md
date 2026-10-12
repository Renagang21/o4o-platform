# CHECK-O4O-STORE-WORKFLOW-HARDENING-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-12 (KST)
> **근거 WO/IR**: [WO-O4O-STORE-WORKFLOW-HARDENING-V1](../work-orders/WO-O4O-STORE-WORKFLOW-HARDENING-V1.md)

정본: [매장 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) · [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md)

## 최종 판정

코드 정비와 main 통합·운영 배포 PASS. 실제 계정 로그인·직원 초대·승인·해제·업무 데이터 변경과 물리 기기 검증은 미실행이다. 사용자 계정 생성·권한 backfill·운영 자료 변경은 수행하지 않았다.

## 검증

| 검사 | 결과 |
|---|---|
| API/Role 회귀 | 4 suites / 55 tests PASS (unit fixture, 운영 SQL 동시 변경 검증 아님) |
| 내 매장 웹 | 8 files / 50 tests PASS |
| API 타입·웹 production build | PASS |
| ESLint ratchet·문서 민감정보·staged 범위·diff | PASS (기존 오류 baseline 46 유지) |
| 공통 인증 UI 동일 CI 설정 재확인 | 17 files / 209 tests PASS |
| 로컬 PC·모바일 합성 UI | 1280px·375px, 36 assertions PASS |
| 실제 배포 Store 번들 합성 UI | TLS 검증 curl로 HTML·JS·CSS 조회 후 Chromium 실행, PC·모바일 36 assertions PASS |
| 공개 운영 응답 | API readiness·Store·My Home HTTP 200 |

합성 UI는 QR·사이니지·채널·태블릿의 source 실패→재시도, QR 상품 편집 종료·유형 변경 후 오류 해제, 태블릿 상세 실패→위치 목록 복귀를 확인한다. 실제 인증·사업 계정·기기 검증을 대신하지 않는다.

## main 통합·배포 확인

- 구현 PR #514 최신 head `47b0e9a7b3260feefec7c5b450e3b162dadd1be1`: [필수 CI](https://github.com/Renagang21/o4o-platform/actions/runs/38256829272)·CodeQL·정책 검사 PASS, 리뷰 네 건 해결.
- main 정상 병합 `483f633379ca2d6771f6475b92562cc59700ed08` (2026-10-12 KST).
- 공통 인증 UI의 동일 CI 설정 로컬 재확인: 17 files / 209 tests PASS. 앞선 timing 실패를 이 결과로 삭제하거나 해당 failed run을 PASS로 바꾸지 않는다.
- [main 사후 CI](https://github.com/Renagang21/o4o-platform/actions/runs/38257999374)·CodeQL PASS. 최신 main c64e54c06의 [CI](https://github.com/Renagang21/o4o-platform/actions/runs/38259679233)·CodeQL도 PASS.

- [자동 Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38259145416)는 Auth Role writer 변경을 LEVEL 3으로 판정해 보류했다. 이전 운영 API `614248fda`부터 최신 대상까지 migration 차이 0을 확인했다.
- 다른 PR #516 통합으로 main이 이동하여 이전 SHA로 시작한 본인 Promote 38259891208은 취소했다. 내 매장 구현 파일은 최신 main에서 차이 0이다. 다른 세션의 실행은 수정·취소하지 않았다.
- [정식 Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38261132551) SUCCESS, `production=DEPLOYED · deploy: api,store`.
- 실제 운영 배포 SHA: `c64e54c0601b664d432cce8bf202ef51e2d0a795`. 구현 병합 SHA `483f63337`와 후속 문서 커밋은 이 서빙 SHA와 구분한다.
- 배포 후 API readiness·내 매장 웹·My Home HTTP 200. 실제 계정 로그인·운영 업무 데이터 변경·물리 기기 검증은 미실행이다.
- 이 결과 정합은 문서-only이며 `DEPLOYMENT=NOT_APPLICABLE`이다.
- 배포된 Store HTML·JS·CSS를 TLS 검증 curl로 받아 Chromium에서 실행한 PC·모바일 합성 화면 검증 36개 PASS. 실제 계정 세션·업무 데이터 검증은 아니다.
