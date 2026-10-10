# PharmacyHub QR redirect cutover

> 상태: ACTIVE · 2026-10-09 · 범위: 기존 인쇄 QR 경로 전환 도구 · 실제 운영 적용 미실행

사용자 승인: PharmacyHub QR을 Neture 약국으로 전환하고 push까지 진행한다. 지정된 `/workspace/o4o-pharmacyhub-retirement` worktree에서 최신 `origin/main` 기준 새 branch `wo/pharmacyhub-qr-cutover`를 사용한다. 기존 제거 PR #375는 병합 완료됐으며 사용자가 Delivery green을 보고했다.

## 실행

`PharmacyHub QR Cutover` workflow는 기존 GitHub Actions WIF·service account를 재사용한다. GCP IAM 권한은 추가하지 않는다. 해당 identity에 URL map read·validate·update 권한이 없으면 작업은 실패하며 운영자가 권한을 확인해야 한다.

1. PR 병합 후 Actions에서 `mode=plan` 실행. 현재 URL map 백업·초안 artifact와 검증 결과 확인.
2. `probe_paths`는 비워 둔다. production Environment의 기존 DB secret 이름, Cloud SQL Auth Proxy와 Secret Manager를 통해 실제 활성 PH 대상의 경로를 읽기 전용 transaction에서 수집한다. DB write·schema 변경은 없고 값은 공개 로그·artifact에 출력하지 않는다. 필요한 권한이 없으면 실패하고 IAM을 임의 변경하지 않는다. 네 종류가 모두 존재하지 않으면 `apply`는 변경 전에 중단한다. `plan`은 존재하는 종류의 개수만 보고한다.
3. `main`에서 `mode=apply` 실행. `DEPLOY_FREEZE`가 정확히 `false`여야 한다. root·www 모두 경로와 쿼리를 유지하며 302로 `pharmacy.neture.co.kr`에 연결되고 목적지는 HTTP 200이어야 한다. 선택적으로 검증된 네 상대 경로를 직접 제공할 수도 있다.
4. 실기기 스캔·매장/상품 화면·스캔 원장 증가는 별도 운영 검증. HTTP 200만으로 SPA의 실제 데이터·렌더가 정상이라고 주장하지 않는다.

범위는 QR·tablet·다국어·제휴 경로 4종뿐이다. Cloud Run·DNS·인증서 삭제나 DB write는 실행하지 않는다. 기존 default backend와 다른 서비스 경로를 유지한다.

## 변경과 복구

실제 URL map의 host rules를 확인하고 변경 전 fingerprint를 Compute API에 전달한다. 다른 운영 작업으로 map이 바뀌면 적용을 거절한다. HTTP 검증은 병렬 요청과 전체 120초 상한을 사용하고 workflow는 30분으로 복구 시간을 확보한다. 작업 시작에서 29분 deadline을 기록하고 write 직전 25분 이상 남지 않으면 적용을 거절한다. 각 GCP write는 request ID를 보존하고, 같은 ID로 HTTP 재시도 후 operation ID를 기록하고 최대 5분 terminal 상태를 확인한다. 일시적 조회 실패도 재확인한다. 완료 불명 상태를 변경 없음으로 간주하지 않는다. 해당 경우 artifact의 operation/request ID로 운영자가 상태를 확인해야 한다.

변경 후 HTTP 검사 실패 시 현재 map이 이 작업의 초안과 일치할 때만 백업을 복원하고 재조회한다. 외부 변경이 있으면 자동 복구를 거절하고 수동 판단을 요구한다. backup artifact는 7일 보존된다.

PR #384 생성 후 GitHub API 접근이 가능해졌다. 현재 cloud executor에는 GCP 실행 identity가 없으며 실제 운영 접근은 GitHub Actions의 기존 WIF 경로를 사용한다. 실제 workflow 실행·운영 QR 검증은 아직 미실행이다. push와 운영 적용은 별개로 보고한다.

## 검증

2026-10-10: 운영자가 Cloud SQL client와 URL map get/validate 전용 역할을 추가했다. run `38029492922`에서 읽기 전용 DB 조회 성공(4종 중 2종), URL map GET 성공, validate POST 403을 확인했다. 운영자가 전달한 Troubleshooter 판정은 `compute.urlMaps.validate=GRANTED`다. 추가 IAM을 추측으로 부여하지 않는다. 동일 WO 진단 branch `wo/pharmacyhub-qr-api-diagnostics`는 지정 worktree에서 최신 main 기준으로 준비했다. API 오류의 허용된 permission/reason만 출력하고 QR 종류별 존재 여부만 기록한다. 원본 오류·credential·실제 public path는 로그에 출력하지 않는다. apply는 미실행이다.

PR #394는 CI 통과 후 병합됐으나 최종 조회에서 새 미해결 리뷰가 발견됐다. 조회 결과를 확인하기 전에 병합 명령을 실행한 절차 오류로 기록한다. 운영 plan은 실행하지 않고 동일 WO의 후속 branch `wo/pharmacyhub-qr-safe-secret-errors`를 최신 main에서 준비했다. secret 조회 subprocess의 실패 출력은 안전한 `read-secret` 오류로 대체하며, rollback 실패가 기존 query 단계와 오류 코드를 덮어쓰지 않도록 보존한다. 지정 worktree 재사용은 동일 WO 연속 수정 예외다.

2026-10-10: 운영자가 WIF provider에 QR workflow를 추가하고 DB password secret 한정 accessor binding을 적용했다. run `38015058829`는 WIF·proxy 시작 후 읽기 전용 inventory에서 실패했다. 기존 catch가 연결/SQL 원인을 숨겨 이 시점의 DB 연결 성공·schema 일치를 주장할 수 없다. 동일 WO의 진단 phase는 최신 main에서 `wo/pharmacyhub-qr-inventory-diagnostics`를 생성하고 지정 worktree를 재사용한다. 오류 원문 대신 실패 단계와 허용된 오류 코드만 출력하며 실제 credential·row·SQL 원문은 출력하지 않는다. 운영 리다이렉트 적용은 미실행이다.

2026-10-09: PR #384는 CI Gate 통과 및 두 review finding 해결 후 `ac27c38c6005f2464a13ed74a3d604a642412482`로 병합됐다. `plan` dispatch는 job-level env에서 지원하지 않는 `runner.temp` context 때문에 HTTP 422로 거절됐으며 운영 실행·변경은 없었다. 동일 WO의 연속 수정으로 사용자 지정 worktree를 유지하고 최신 main 기준 `wo/pharmacyhub-qr-runtime-paths`를 생성했다. 임시 경로는 첫 step에서 `RUNNER_TEMP`를 통해 GITHUB_ENV에 전달하도록 수정한다.

QR 전환·복구·읽기 전용 경로 수집 node:test 16개와 기존 CI 스크립트 node:test 352개 통과. 두 workflow의 YAML parse·diff whitespace·문서 민감정보 검사 통과. QR 테스트는 blocking CI에도 연결한다. GCP URL map API 호출·실제 WIF 권한·운영 HTTP 응답·브라우저/실기기 검증은 아직 실행하지 않았다.
