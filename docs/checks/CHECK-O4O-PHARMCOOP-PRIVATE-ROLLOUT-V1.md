# CHECK-O4O-PHARMCOOP-PRIVATE-ROLLOUT-V1

- 작성일: 2026-10-20
- 상태: 검증 완료 · 운영 재배포 대기
- 작업: TODO-O4O-PHARMCOOP-PRIVATE-ROLLOUT-V1

## 원인과 수정

실행 39271655092의 전체 실행 ZIP에서 새 cooperative-web revision의 traffic 0%,
익명 HTTP smoke 세 경로의 403 및 DEPLOY_FAILED_BEFORE_TRAFFIC_SWITCH를 확인했다.
개별 job 로그의 차단과 달리 전체 실행 로그 API는 현재 환경에서 다운로드된다.

Pharmcoop workflow만 수정했다. 기존 Ready/traffic 0% 검사를 유지하고,
기존 pinned Google auth action으로 서비스 URL audience의 ID token을 발급받는다.
태그 URL의 `/`, `/test`, `/login`에서 인증된 HTTP 성공 및 HTML 본문을 확인한 뒤에만
traffic을 전환하고, 전환 후 검토한 revision의 100% 배분을 재확인한다.
최초 생성은 기존 비공개 Ready 검사를 유지하며 같은 인증 HTTP 검사를 추가한다.
공용 helper/다른 서비스/IAM/DB/공개 접근 권한은 변경하지 않았다.
인증 주체에 기존 invoke 권한이 없다면 여전히 fail-closed이며 IAM을 자동 부여하지 않는다.

## 실행 검증

- YAML 파싱 및 수정 shell의 bash -n PASS.
- 실제 workflow shell을 추출해 합성 gcloud/curl로 실행: 정상 3개 HTML 경로 후 전환,
  Ready 실패·빈 token·HTTP 403·비 HTML 응답에서 전환 중단,
  전환 후 잘못된 배분 검출 등 6 cases PASS. 외부 운영 요청/credential 사용 없음.
- 기존 cloud-run-rollout 및 deploy-workflow-gates 105 tests PASS.
- 문서 민감정보 검사 및 git diff --check PASS.
- 실제 WIF ID token 발급·Cloud Run invoke·운영 traffic 전환은 미실행이다.

## 운영 선행 조건

Delivery 39274738660은 SUCCESS지만 실제 배포는 실행되지 않았다.
로그의 production 판정은 HELD_LEVEL_3이고 API serving SHA는 aeabc5daa다.
최신 기준 main 8075aa77ca의 별도 API 권한 변경(staff-feature-permissions.ts)이 자동 배포를 막았다.
Pharmcoop workflow의 same-SHA API 조건은 유지한다. 변경 범위에 migration 파일 차이는 없다.
별도 API 변경 운영 승격과 공유 운영 자원 사용 여부를 확인하기 전에는 이를 묵시적으로 배포하지 않는다.
이 문서는 재배포 성공을 주장하지 않는다.
