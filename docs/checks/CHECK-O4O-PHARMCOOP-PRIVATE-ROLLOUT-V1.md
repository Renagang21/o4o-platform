# CHECK-O4O-PHARMCOOP-PRIVATE-ROLLOUT-V1

- 작성일: 2026-10-20
- 상태: COMPLETED · 승인된 API/Pharmcoop 운영 배포 완료
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

## 배포 전 조사 기록

Delivery 39274738660은 SUCCESS지만 실제 배포는 실행되지 않았다.
로그의 production 판정은 HELD_LEVEL_3이고 API serving SHA는 aeabc5daa다.
최신 기준 main 8075aa77ca의 별도 API 권한 변경(staff-feature-permissions.ts)이 자동 배포를 막았다.
Pharmcoop workflow의 same-SHA API 조건은 유지한다. 변경 범위에 migration 파일 차이는 없다.
별도 API 변경 운영 승격과 공유 운영 자원 사용 여부를 확인하기 전에는 이를 묵시적으로 배포하지 않는다.
이 문서는 재배포 성공을 주장하지 않는다.

## 승인·통합·운영 검증 — 2026-10-20

사용자가 PR #718 병합 및 선행 API 배포를 명시 승인했다.
기존 조사 시점 이후 main에는 #719 등 별도 통합이 추가돼 최신 main 기준으로 다시 확인했다.
PR #718 HEAD 36fbf66027ce996c2f22e19874db955e160b0f2f의 required CI Gate·CodeQL·SonarCloud SUCCESS,
리뷰 blocker/미해결 스레드 0, 실제 main ruleset 충족을 확인하고 merge했다.
통합 SHA: df716623406cc53960a8fa07c6fc53570065b4a3.

- main CI [39363211439](https://github.com/Renagang21/o4o-platform/actions/runs/39363211439) SUCCESS.
- API 사전 dry-run 39363245471은 실행 자체 SUCCESS이나 당시 CI pending으로 배포 0/BLOCKED_CI였다.
  이를 배포 성공으로 판단하지 않고 main CI 완료 뒤 실제 승격했다.
- [API Promote 39364187263](https://github.com/Renagang21/o4o-platform/actions/runs/39364187263):
  services=api, SUCCESS. 현재 serving 원장은 d176026c2였고 target까지 migration 파일 차이 0을 재확인했다.
  기존 migration job, 새 revision Ready, traffic switch, 전환 후 readiness 검사가 모두 SUCCESS.
  o4o-core-api-04095-now가 통합 SHA로 traffic 100%를 받으며 report의 API 상태 DEPLOYED.
  공식 API /health/ready의 status=ready도 별도 읽기 전용 확인했다.
- [Pharmcoop 39364787132](https://github.com/Renagang21/o4o-platform/actions/runs/39364787132):
  apply=false/frontend_only=true, SUCCESS. same-SHA API gate 통과, fixture provision SKIPPED.
  cooperative-web-00005-niq를 traffic 0%로 배치하고 Ready=True 확인 후 WIF ID token 발급 성공.
  인증된 /, /test, /login의 HTTP 및 HTML 검사를 통과한 뒤 traffic 전환했다.
  후속 control-plane 검증으로 검토한 revision의 traffic 100%를 확인했다.

범위는 API와 Pharmcoop 배포다. API 한정 Promote의 전체 production 상태는 다른 서비스
NOT_SELECTED 때문에 pending일 수 있으며 이를 전 서비스 배포 완료로 보고하지 않는다.
조합·가입·역할 원장 변경 단계는 실행하지 않았고 IAM/WIF·공개 접근·DNS 설정도 변경하지 않았다.
실제 사용자 OAuth·업무 시나리오와 공개 Pharmcoop 도메인은 이번 검증 대상이 아니다.
개별 job 로그용 환경 네트워크 초안의 게시 여부와 별개로 전체 실행 ZIP API로 운영 로그를 확인했다.
