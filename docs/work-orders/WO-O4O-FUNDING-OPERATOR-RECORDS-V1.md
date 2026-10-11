# 펀딩 운영자 입금 확인·참여 처리 업무 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: 사용자 지시 — TODO 작성 → 문서·코드 조사 → TODO 수정 → 개발·검증·push·main 병합·배포. 실계정 직접 테스트는 후속 사용자 확인으로 유지한다.

## 초기 조사 TODO

- [x] 최신 main과 펀딩 정본·이전 구현 결과 확인
- [x] 운영자 목록·심사·포럼 복구·입금·참여 처리·CSV의 화면/API 연결 조사
- [x] funding admin/operator와 개설자 권한 및 다른 서비스 경계 확인
- [x] 서비스 회원·펀딩 참여자·포럼 회원 및 개설자 명단 공유 구분 확인
- [x] 입금 확인·정정·환불 기록과 처리 상태의 검증·동시성·감사 이력 조사
- [x] 공유 소비처·레거시·오프라인 기록 보존 영향 확인
- [x] 정상/결함/레거시/정책 미정 판정 후 구현 TODO 수정

## 초기 구현 후보 TODO (수정 TODO로 대체)

- 확인된 기록 처리 결함 수정 및 회귀 검증
- 기존 운영 화면을 업무별로 정리하고 중복·혼동 표시 개선
- 명단 조회·공유 및 화면 상태 일관성 보완
- admin/operator의 현행 권한 확인 결과 명시; 새 정책은 임의 도입하지 않음
- API·웹 테스트/빌드·desktop/mobile fixture 브라우저 검증
- push·리뷰·필수 CI·main PR 병합·정상 배포·서빙 검증
- 결과 및 사용자 직접 테스트 목록 기록

## 범위와 기준

개설·심사·전용 포럼·개설자 운영은 [이전 WO](WO-O4O-FUNDING-CREATOR-WORKSPACE-V1.md)의 완료 구현을 사용한다. 신규 PG·결제·정산·주문·배송 기능과 금융 정책을 추가하지 않는다. 기존 payment/settlement 원장을 보존하며 운영 기록 정비만 수행한다. 운영 DB write·DDL·seed·backfill을 검증 목적으로 실행하지 않는다. schema/migration 없이 기존 구조를 활용하는 것을 우선한다.

기준: [content-only 경계](../architecture/O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1.md), [오프라인 기록 정책](../architecture/O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1.md), [입금 확인 감사 정책](../architecture/O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1.md), [초기 운영 모델](../baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md).

작업장: 기존 독립 clone `/workspace/o4o-funding-creator-workspace`의 새 전용 branch `wo/funding-operator-records`. 기준 main: `765c082d03`. 이전 완료 WO/CHECK는 수정하지 않는다.

## 문서 정합

조사 결과와 후속 조치는 이 WO와 새 CHECK에 기록한다. 범위 밖 canonical 내용·색인은 임의 수정하지 않는다.

## 조사 결과와 수정 TODO

초기 조사 7개 항목을 완료했다. 추가 조사에서 `ActionLogService.logSuccess`는 별도 repository insert이며, payment UPDATE와 같은 transaction에 참여하지 않음을 확인했다. 기존 action_logs entity를 transaction manager에서 사용하면 공통 패키지·schema 변경 없이 원자성을 확보할 수 있다.

| 판정 | 근거와 처리 |
|---|---|
| 정상 유지 | funding scope + DB 현재 역할 재판정으로 funding admin/operator만 입금·이행·CSV 업무 가능. 개설자는 별도 명단 조회·포럼 회원 수동 관리. 서비스 회원·펀딩 참여자·포럼 회원은 서로 다르다. |
| 정상 유지 | paidAt COALESCE 보존, confirmedAt 갱신은 이미 구현. settlement PATCH는 409이며 화면도 비노출. 입금 변경으로 포럼 자동 가입·펀딩 진행 상태 전환을 하지 않는다. |
| 결함 | 금액·날짜·문자 필드 검증 부족. payment 전후 조회·UPDATE·감사 insert가 분리되어 동시 수정 시 감사 전후값이 틀리거나 감사만 누락될 수 있음. null 금액 정정도 감사값과 실제값 불일치. |
| 결함 | 입금 확인 완료 후 재확인/메모 정정, 환불 후 재확인 경로 없음. 실패해도 입력 폼이 먼저 닫힘. 참여 조회 실패를 빈 목록으로 숨김. 필터 변경과 상세 재조회가 중복됨. |
| 결함 | backend 입금 필터를 UI·CSV에서 이용하지 못함. CSV가 마지막 확인일을 입금확인일로만 표시하고 전체 명단만 공유하며 사용자 문자열의 spreadsheet formula escaping이 부족. |
| 레거시 | 숨긴 정산 버튼·전이 코드가 운영자 상세에 잔존. 제거해 실수로 다시 활성화되지 않도록 하되 데이터/API의 409 경계는 보존. |
| 정책 유지 | 금융 업무의 admin/operator 세분화는 이번에 새로 정하지 않고 현재 동등 권한을 유지한다. 회원관리의 제재 권한 정책을 입금 관리에 임의 적용하지 않는다. |

수정 TODO(개발 기준):

- [x] 입금 입력 검증과 participant row lock → UPDATE → 기존 action_logs insert를 단일 transaction으로 처리
- [x] 감사 전후값을 실제 DB 결과로 기록, 참조·메모 원문은 감사/application log에서 제외; 실패는 전체 rollback
- [x] 참여자 섹션에서 기존 이행 처리와 입금 확인 업무 구분, 정정·확인 취소·환불 기록·재확인 제공; 저장 실패는 입력 유지
- [x] 참여 조회 loading/error/retry와 최신 요청·route 경계 적용; 입금 상태 필터 추가
- [x] 화면과 동일한 필터의 CSV, 최초/마지막 확인일 구분, 문자열 quoting·formula 방어
- [x] 운영자 목록의 준비/결과/이행 상태 필터와 최신 응답 보호
- [x] 숨긴 정산 UI 전이 제거; settlement 409와 기존 기록 보존 회귀 검증
- [x] 금액·날짜 검증/transaction rollback/감사·scope/조회 실패/정정/CSV 회귀 테스트 및 API·웹 빌드
- [x] desktop/mobile fixture 브라우저 10개 시나리오 PASS
- [x] push·CI·리뷰·정상 병합·api/neture 배포·공개 read-only 확인
- [x] 새 CHECK에 결과와 실계정 직접 테스트·DB 동시성 후속 확인 기록

실행 검증·통합 증거와 실계정 후속 테스트는 [새 CHECK](../checks/CHECK-O4O-FUNDING-OPERATOR-RECORDS-V1.md)에 기록한다.

첫 push 전 main `71c267ac87`으로 미게시 branch를 rebase하고 통합 API 221 tests, 웹 546 tests를 확인했다. TypeORM의 UPDATE raw result가 `[rows, rowCount]`임을 추가 확인해 SELECT CTE projection으로 입금·이행 응답을 정정했다. query parameter 로그의 원문 노출도 같은 서비스 안에서 node-postgres 지원 text binding과 JSON 마스킹으로 보완하고 30 tests로 확인했다.

최종 자체 점검에서 이행 처리 중 필터 변경으로 이전 조건 재조회가 발생할 수 있음을 발견해 필터·CSV 잠금으로 보완했다. 운영 화면 14 tests 및 desktop/mobile 10개 fixture 시나리오를 재실행했고 모두 PASS(긴 회원명 포함).

입금 합계 KPI 조회에도 독립 최신 요청 채널을 적용해 초기 조회의 늦은 응답이 변경 후 합계를 덮어쓰지 않게 했으며 운영 화면 회귀 15 tests 및 웹 production build PASS.

PR 리뷰 P2(금액 빈 입력을 생략해 이전 금액이 남음)를 수정해 명시적 null 정정을 제공했다. API의 null 금액 감사 회귀는 유지하며 UI 회귀 16 tests·빌드·브라우저 10개 재검증 PASS.

재리뷰 P2의 빈 취소·환불 사유도 명시적 null로 수정했다(UI 18 tests·빌드·browser 10개 PASS). CI에서 지적된 테스트 require import 1건을 ES import로 바꿨으며 payment 30 tests와 lint ratchet(46 = 기존 baseline 46) PASS. 게이트 규칙·baseline은 수정하지 않았다.


## 완료 및 후속 검증

[PR #474](https://github.com/Renagang21/o4o-platform/pull/474)를 정상 squash 병합했다. main 구현 SHA는 `5895ed177ecbfd8cc57da2fe4d516e0549dc781d`이다. 최종 PR CI·main post-merge CI·Sonar Quality Gate가 통과했고 최신 HEAD Codex 재리뷰에서 새 finding이 없었다. [Promote 38134096013](https://github.com/Renagang21/o4o-platform/actions/runs/38134096013)이 API → Neture 배포 및 serving SHA 판정을 완료했으며 `production=DEPLOYED · api,neture`이다.

배포 화면의 실제 HTML/JS를 사용한 desktop/mobile fixture browser 10개 PASS, API readiness 200·비로그인 운영 API/CSV 401·funding 화면 200을 확인했다. 운영 API 쓰기는 전부 mock이며 실계정·실 DB 검증을 수행한 것으로 보지 않는다. 상세 증거와 사용자 직접 테스트 5개는 CHECK에 남겼다. 구현·배포 작업은 완료, 직접 테스트는 사용자 요청에 따라 후속 검증으로 유지한다.

동일 WO의 완료 기록을 위해 기존 branch를 유지했고 게시 후 최신 main은 정상 merge로 통합했다. 완료 문서 2개만 추가 PR로 반영하며 이 문서 변경의 `DEPLOYMENT=NOT_APPLICABLE`이다.
