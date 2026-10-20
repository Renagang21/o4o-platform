# TODO-O4O-PHARMCOOP-PRIVATE-ROLLOUT-V1

- 상태: COMPLETED
- 작성일: 2026-10-20
- 기준 main: 8075aa77caf8869c2815d7242cb65a5c07464c6a

## 목적과 조사

Pharmcoop 비공개 Cloud Run의 새 revision을 인증 없이 검사해 실패한 배포를 복구한다.
실행 39271655092의 전체 로그 API 다운로드로 `/`, `/test`, `/login` HTTP 403 및
`DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH`를 확인했다. 신규 revision은 traffic 0%였다.
개별 job 로그 다운로드는 환경 정책에 차단되지만 전체 실행 ZIP 다운로드는 성공한다.

## 작업

- [x] 실패 로그 및 당시 workflow, 공용 rollout 검사, Dockerfile 조사
- [x] 현재 운영 API가 aeabc5daa, 최신 main은 별도 권한 변경으로 LEVEL_3 보류임을 확인
- [x] 비공개 서비스의 Ready 검사 후 기존 WIF 주체의 ID token으로 HTML 경로 검사
- [x] 익명 접근 허용/IAM 변경 없이 검증 성공 때만 traffic 전환
- [x] workflow shell 및 실패 시 전환 중단 회귀 검증
- [x] commit·push·리뷰 및 main 통합
- [x] API 동일 SHA gate와 기존 LEVEL_3/운영 DB 경계를 충족한 후 frontend_only 재배포
- [x] 배포 및 traffic 검증 결과 보고

## 경계

Pharmcoop workflow만 수정한다. 공용 rollout helper 및 다른 서비스는 변경하지 않는다.
운영 계정·조합/회원 원장·IAM/WIF·DNS·공개 접근 정책을 변경하지 않는다.
최신 main에 쌓인 별도 API 권한 변경의 운영 승격을 이 복구에 자동 포함하지 않는다.

## 운영 완료 — 2026-10-20

사용자가 PR #718 병합과 선행 API 운영 승격을 명시 승인했다.
PR #718은 df716623406cc53960a8fa07c6fc53570065b4a3으로 main 병합됐다.
main CI 39363211439 SUCCESS 후 API 한정 Promote 39364187263 SUCCESS,
Pharmcoop frontend_only 실행 39364787132 SUCCESS를 확인했다.
API 및 Pharmcoop 새 revision 모두 검증 후 traffic 100% 전환을 확인했다.
상세 결과: CHECK-O4O-PHARMCOOP-PRIVATE-ROLLOUT-V1.
