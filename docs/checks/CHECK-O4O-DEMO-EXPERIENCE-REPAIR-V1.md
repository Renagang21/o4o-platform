# CHECK-O4O-DEMO-EXPERIENCE-REPAIR-V1

> **상태**: ACTIVE · **작성일**: 2026-10-09 KST
> **작업**: [Demo 체험 문제 해소](../work-orders/WO-O4O-DEMO-EXPERIENCE-REPAIR-V1.md) 단계 1

## 변경과 소비처

대표 홈 API의 약국(`kpa`) 후보 조회를 기존 약국 승인 원장·활성 owner/admin/manager 관계 해석기에 위임한다. KPA 개인 service membership/`kpa:store_owner`를 추가 요구하지 않는다. 다른 서비스의 기존 membership/role 검사는 유지한다. API 응답 구조·최종 업무 guard·조직 후보 해석기의 권한 집합은 변경하지 않는다.

Neture 홈 모델은 반환된 약국을 KPA 개인 가입 상태로 다시 걸러내지 않는다. 기존 약국 매장 진입 경로만 공통 Store workspace handoff로 연결한다. 홈 매장 버튼과 메인 로그인 모달의 Demo가 같은 함수를 사용하며, 약사 커뮤니티·운영자 등 다른 서비스 handoff는 유지한다. Store 서버의 기존 workspace 인증·인가와 실제 화면 guard를 우회하지 않는다.

| 소비처 | 영향과 판정 |
|---|---|
| 대표 홈 API·약국 매장 카드 | 승인 원장 후보가 있으나 KPA 가입/역할이 없는 약국도 반환·표시 |
| Neture 메인/공급자 호스트의 매장 Demo 모달 | 공통 홈 계산과 Store workspace handoff 사용 |
| Neture 홈 매장 이동 | Demo와 같은 이동 함수; 0개·복수 후보 자동 선택 금지 유지 |
| 약사 커뮤니티·서비스 운영 진입 | 기존 service handoff 유지 |
| 다른 서비스 매장·API 응답 소비처 | 기존 membership/role 조건과 응답 구조 유지 |
| 약국 업무 API·공통 Store | 최종 guard 불변; 실제 데이터 연결 복구는 별도 필요 |

## 검증

- API Jest 3 suites / 53 tests PASS: 새 홈 약국 진입 회귀, 기존 service-scoped 조직 판정, Store workspace handoff 계약.
- Neture Vitest 최종 전체 45 files / 371 tests PASS. 커뮤니티 handoff 보존 회귀를 포함한다.
- Neture focused 첫 실행은 작업 디렉터리와 Vitest include 경로가 맞지 않아 0 tests로 실패했다. 저장소 루트의 문서화된 config 경로로 재실행하여 4 files / 43 tests PASS 후 전체 검증을 수행했다.
- Chromium **로컬 API fixture**: 메인 `/` 헤더 로그인 모달에서 매장 Demo 버튼 클릭. desktop 1440×900·mobile 390×844 각각 승인 후보 1개/KPA 가입 없음 → Store workspace handoff·fixture 목적지 이동 PASS. 승인 후보 없음 → 이동 오류 표시·handoff 0건 PASS. 4개 조합 모두 page error 0건.
- fixture 첫 실행은 HTTPS만 허용하는 기존 URL 검증에 HTTP fixture 목적지를 제공하여 실패했다. 목적지를 HTTPS 형식으로 수정하고 브라우저 route fixture에서 응답한 뒤 위 4개 조합을 재실행했다. 실제 네트워크의 TLS 검증을 비활성화하지 않았다.

- 루트 전체 `pnpm run type-check` PASS. 최초에는 최신 main에서 추가된 workspace export/dependency가 이전 node_modules에 반영되지 않아 전체관리자·Lecture·Store 3단계가 실패했다. 동결 lockfile 설치로 로컬 의존성을 갱신하고 전체를 재실행해 PASS했다. 소스·dependency 선언·lockfile은 변경하지 않았다.
- `node scripts/lint-ratchet.mjs` PASS: 오류 46건으로 baseline 46 유지, warning 1001건. lint 오류 0으로 보고하지 않는다.
- Neture production build PASS. 기존 bundle 크기·Browserslist 경고 잔존.
- 문서 민감정보 검사 2 files / 패턴 0건, `git diff --check` PASS.
- 동결 설치 첫 시도는 non-TTY 조건으로 중단됐고, CI 모드 offline 재시도는 최신 main의 필요한 tarball이 없어 실패했다. 프록시·TLS 검증을 유지한 일반 frozen-lockfile 설치가 완료돼 재검증했다.

필수 CI·PR review는 push한 HEAD 기준으로 확인한다. 위 검증은 로컬 코드 정합을 검증하며 운영 문제가 해결됐다는 판정이 아니다.

## 기존 운영 연결 조사

- 이전 Demo 구축 CHECK에는 2026-10-02 실제 계정·ownership·membership 생성(write 14)과 이후 역할 2건 보완·멱등 조회가 기록돼 있다. 이전에 운영 DB 연결이 존재했다는 사용자 설명과 일치한다.
- 현행 `demo-account-provision.ts`는 2026-10-07 변경에서 `neture:store_owner` 및 합성 약국 승인 원장 생성으로 정렬됐다. 이전 운영 생성 기록의 `kpa:store_owner`와 현재 약국 원장 기준을 같은 상태로 간주하지 않는다. 그 변경이 기존 Demo 행에 적용됐는지는 실제 데이터 census로 확인한다.
- `SETUP.md`·`start-cloud-sql-proxy.cmd`는 로컬 DB와 운영 Auth Proxy를 별도 포트로 구분한다. 현재 checkout의 ignored `.env`를 표준 Node env-file로 사용한 연결 probe는 로컬 포트의 loopback 대상으로 `ECONNREFUSED`였다. 비밀값/실제 접속 문자열은 출력하지 않았고 DB write 0건이다.
- `.github/workflows/deploy-api.yml`은 WIF → Cloud SQL socket → Secret Manager DB 암호 경로로 운영 API/migration Job을 연결한다. 기존 [GCP WIF read-only smoke](https://github.com/Renagang21/o4o-platform/actions/runs/37853330812)를 최신 main에서 재실행해 success를 확인했다. 이 검사는 인증·프로젝트·serving revision 조회이며 DB 조회/쓰기나 배포를 수행하지 않는다.
- 운영 메인 모달의 Demo 버튼으로 약국장 인증 후 본인 `GET /neture/pharmacy/membership`를 추가 조회했다. HTTP 200이지만 연결된 신청 정보 없음. 동시에 홈 매장 0건·업무 capabilities/info HTTP 403을 재확인했다. 이 조회는 원장과 활성 owner 관계를 JOIN하므로 원장 행의 부재와 소유 관계 누락 중 어느 쪽인지 직접 DB 확인 전에는 단정하지 않는다. 정상 Demo 인증 외 운영 데이터 write 없음.

현재 환경 변수/GCP binding 부재만으로 이전 운영 연결이나 기존 작업 경로가 없다고 판단하지 않는다. 확인된 운영 절차를 토대로 read-only census·대상 한정 복구 실행 경로를 준비한다.

## 미완료와 문서 정합

운영 DB 연결·데이터 복구·배포는 미실행이다. 따라서 현재 운영의 약국장 Demo 이동 실패와 `403 STORE_OWNER_REQUIRED`, 공급자의 상품·자료 0건이 해결됐다고 판정하지 않는다. 일반 logout의 다른 브라우저 refresh 폐기는 별도 세션 단계에서 처리한다. 새 WO에 모두 추적하며 Pharmacy-Hub는 삭제 대상으로 인증·Demo 검증에서 제외했다.

main 기준 코드 정합 수정과 운영 해결 완료를 구분한다. 약국 승인/소유 관계가 복구되어도 배포 후 메인 모달의 실제 Store 진입과 업무 API 정상 응답을 확인하기 전에는 운영 완료로 체크하지 않는다.
