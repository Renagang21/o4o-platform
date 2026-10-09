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

실제 URL map의 host rules를 확인하고 변경 전 fingerprint를 Compute API에 전달한다. 다른 운영 작업으로 map이 바뀌면 적용을 거절한다. 변경 후 HTTP 검사 실패 시 현재 map이 이 작업의 초안과 일치할 때만 백업을 복원하고 재조회한다. 외부 변경이 있으면 자동 복구를 거절하고 수동 판단을 요구한다. 네트워크 오류 등 결과가 불확실하면 운영 작업의 완료 상태와 실제 map을 다시 확인해야 한다. backup artifact는 7일 보존된다.

PR #384 생성 후 GitHub API 접근이 가능해졌다. 현재 cloud executor에는 GCP 실행 identity가 없으며 실제 운영 접근은 GitHub Actions의 기존 WIF 경로를 사용한다. 실제 workflow 실행·운영 QR 검증은 아직 미실행이다. push와 운영 적용은 별개로 보고한다.

## 검증

QR 전환·복구·읽기 전용 경로 수집 node:test 13개와 기존 CI 스크립트 node:test 352개 통과. 두 workflow의 YAML parse·diff whitespace·문서 민감정보 검사 통과. QR 테스트는 blocking CI에도 연결한다. GCP URL map API 호출·실제 WIF 권한·운영 HTTP 응답·브라우저/실기기 검증은 아직 실행하지 않았다.
