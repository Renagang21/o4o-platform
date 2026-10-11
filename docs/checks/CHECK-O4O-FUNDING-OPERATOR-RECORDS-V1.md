# 펀딩 운영자 입금·참여 이행 정비 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **WO**: [WO-O4O-FUNDING-OPERATOR-RECORDS-V1](../work-orders/WO-O4O-FUNDING-OPERATOR-RECORDS-V1.md)

## 범위와 결과

funding admin/operator의 현재 동일 업무 권한을 유지한다. 서비스 회원 자격·펀딩 참여·포럼 회원은 분리되며 입금 변경이 포럼 가입이나 진행 상태를 자동 변경하지 않는다. settlement mutation은 계속 409이다. 신규 schema/migration·운영 DB 테스트 write·PG·송금 실행을 추가하지 않았다.

| 항목 | 검증 |
|---|---|
| API 회귀 | 최신 main 통합 후 funding·Neture dashboard·공급자/공개 origin 경계 11 suites, 221 tests PASS. 최종 query parameter 마스킹 보강 후 payment service 30 tests 추가 실행 PASS. 실제 TypeORM transaction orchestration과 mock query runner를 사용해 감사 실패 시 rollback/commit 미실행을 검증했다. 실 DB lock 경쟁 검증은 아님. |
| 웹 회귀 | Neture 66 files, 546 tests PASS. 최종 이행 처리 중 필터·CSV 잠금 보강 후 운영 화면 3 files, 14 tests 추가 PASS. 정정 실패 입력 유지, 환불 재확인, 최초 확인일 미전송, route 변경 후 이전 응답 무시, 입금/이행 필터·CSV 일치, 조회 error/retry 포함. |
| 빌드 | API TypeScript production build, Neture TypeScript + Vite production build PASS. Neture의 기존 large chunk 경고는 비차단. |
| 데이터·감사 | 동일 participant+trial row lock, UPDATE와 action_logs insert 단일 transaction. 감사 금액·상태는 실제 RETURNING 값 사용. paymentReference/paymentNote 원문은 감사와 이번 구현의 application log에 기록하지 않음. node-postgres 실제 binding 값은 유지하며 TypeORM query parameter JSON 출력은 마스킹한다. |
| CSV | 화면 조건을 그대로 적용. 최초/마지막 확인일 별도 컬럼. 문자열 quoting·formula 방어, UTF-8 파일명. |

## 브라우저·통합·배포

브라우저는 fixture 인증·API 응답/쓰기만 사용한다. 운영 API write나 실계정 인증을 검증한 것으로 보고하지 않는다. 로컬 production bundle에서 정정 실패·재시도 / 확인 취소·재확인 / 환불 기록·재확인 / 입금 필터·CSV·이행 / 준비 단계 필터의 5개 시나리오 × desktop 1440px·mobile 390px = 10 PASS. runtime error와 페이지 가로 넘침은 0. 마지막 UI 보강 후 10개 모두 재실행 PASS. mobile의 공백 없는 긴 회원명 줄바꿈도 확인했다. 화면도 desktop/mobile에서 확인했다. 운영 데이터 write는 0이다. PR/CI/배포 증거는 진행 후 이 절에 기록한다.

## 사용자 직접 테스트로 남기는 항목

1. 실제 funding admin/operator 계정으로 운영 화면 접근, 다른 서비스 운영자만 가진 계정의 차단 및 권한 회수 후 기존 로그인 접근 차단.
2. 테스트 펀딩 참여자의 최초 입금 확인 → 재확인·금액/메모 정정 → 확인 취소 → 재확인 → 실제 환불 완료 후 환불 기록. 최초 확인일·금액·참조 보존, 마지막 확인일 갱신 확인.
3. 실 DB action_logs와 입금 기록의 전후 상태·금액 대조 및 동시 수정 시 감사 순서 확인. 장애 주입은 별도 승인된 비운영 환경에서 수행.
4. 입금 상태·보상·이행 조건별 명단과 CSV 일치, 최초/마지막 확인일·한글 파일명 확인.
5. 이행 상태 변경이 공통 계정·다른 서비스·포럼 회원 자격에 영향을 주지 않고 settlement 변경은 계속 차단되는지 확인.

## 문서 정합

현재 정책을 변경하지 않은 구현 정비 기록이다. 이전 COMPLETED WO/CHECK와 canonical 색인은 수정하지 않았다. 수동 테스트는 실행 증거가 생길 때까지 후속 항목으로 남긴다.

통합 기준: 초기 main `765c082d03`에서 시작했으며, 첫 push 전 최신 main `71c267ac877a93d2851b3f78afb8cdd60b852b79`으로 미게시 branch를 rebase했다. 작업 대상 파일과의 충돌은 없었다.
