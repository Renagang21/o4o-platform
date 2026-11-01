# 드럭스토어형 약국 전환 검증

> **상태**: COMPLETED — 이름·키·운영 데이터·새 호스트·약국 공통 앱 배포 검증 완료
> **작성일**: 2026-10-31
> **작업**: [WO](../work-orders/WO-O4O-DRUGSTORE-BRAND-DOMAIN-TRANSITION-V1.md)

## 변경

공식 표시명·도메인과 사업 키·역할·경로·공통 extension·운영 전환 스크립트·문서를 현행 이름으로 통일했다. 기존 사업의 UUID·회원 FK·정지/반려/탈퇴 결정은 보존한다. 개인정보처리방침을 게시하거나 동의·약사 자격을 생성하지 않는다.

## 검증

- 약국 앱: 23 files / 172 tests PASS.
- 공통 공간 UI: 24 files / 222 tests PASS.
- 운영자 공통 UI: 35 files / 233 tests PASS.
- Store 관련 UI: 2 files / 24 tests PASS.
- Admin 운영자 지정·역할·사업 원장: 4 files / 45 tests PASS.
- 공통 서비스 전환: 1 file / 21 tests PASS.
- API 기존 인증·호스트·운영·health와 실제 PostgreSQL 전환: 6 suites / 83 tests PASS. 추가 순수 전환 테스트는 별도 기록하며 합산 중복을 주의한다.
- canonical PostgreSQL baseline과 incremental 53개 순차 적용 PASS. 전환 후 실제 schema fingerprint `aab4a2e779cbdcfe5948dbbcd2e71539d365ac05cad42902066a018ca105ca82` / 7410 lines. 사업 key 설명 comment 변경 포함.
- 운영 스크립트 Python 53 tests PASS. 실제 GCP/LB 변경을 실행한 검증이 아니다.
- Neture: 1493 tests PASS.
- 추가 전환 순수/PG 검증: 2 suites / 21 tests PASS(기존 API 기록의 PG 6개와 중복).
- PC 1440px·모바일 390px Pharmacy/드럭스토어형 약국 4개 합성 브라우저 흐름 PASS: 선택 약국 scope, 신청·승인 대기, 약국 전환·탈퇴, query/hash, pageerror 0·가로 넘침 0. 운영 로그인 검증은 아니다.
- API type-check, Pharmacy·Neture·Store·Admin production build PASS.
- 테스트는 일회성 로컬 PostgreSQL과 합성 계정/응답을 사용한다. 운영 원장 변경·실제 신규 승인·동의 기록 생성 없음.

PR 검증 결과는 [PR #911](https://github.com/Renagang21/o4o-platform/pull/911)의 최종 HEAD checks/review를 기준으로 한다. 초기 구현 HEAD `59b4d2b585`의 Codex 리뷰는 지적 없이 완료했다.

## 초기 운영 확인과 배포 — 당시 관측

새 공식 호스트의 현재 환경 DNS 조회는 해석 실패, 정상 프록시 HTTPS 요청은 503이다. DNS 전파·LB 연결·TLS 완료를 확인하지 못했다. 해당 관측은 코드 회귀 테스트의 실패와 구분한다. DNS/IP 우회와 인증·IAM 변경은 하지 않는다.

`DEPLOYMENT = REQUIRED`: 새 migration 성공 후 API와 공통 패키지 소비 앱을 현재 Delivery 계획에 따라 배포하고 새 호스트 공개·로그인·사업 권한을 확인해야 한다. 아직 main 병합이나 배포 완료로 보고하지 않는다.

## 문서 정합

표시명·URL·내부 사업 키·문서 경로를 함께 정합했다. 과거 실행 기록은 이름 정규화 주석을 두며 새 도메인에서 재실행한 증거로 승격하지 않는다. 완료 상태를 단계별로 구분한다.

### 리뷰 보완 — 과거 관측 대상

PR #911의 P1 지적에 따라 과거 WO/CHECK/IR 84건의 본문에서 현재 호스트를 과거 관측 대상으로 표시하지 않도록 보완했다. 현재 이름·주소는 별도 현행 안내에만 두고, 과거 증적은 “당시 구명칭·구호스트”로 구분한다. 이전 이름·URL을 전부 제거하라는 사용자 지시를 따르면서 현재 도메인을 과거에 검증한 것으로 오인하지 않게 한다. 원문·실제 당시 호스트는 Git 이력에 보존되어 있으며 이력 재작성은 없다.

### 최신 main 공통 UI 통합

main `c7c5cd100c`(PR #907)을 작업 branch에 통합했다. 공통 서비스 목록 충돌은 main의 `serviceKey`·세션 복귀 기능을 유지하면서 드럭스토어형 약국의 새 키·표시명·주소를 적용했다. 새 `serviceReturnContext`와 API handoff 별칭도 새 키로 정렬했다. 추가 원장·권한 승인은 없다.

통합 후 API 인증/대표 진입 75 tests PASS, 별도 실제 로컬 PostgreSQL handoff 38 tests PASS(처음에는 해당 PG suite를 건너뛰었으며 전용 DB 준비 후 실제 실행했다). 약국 앱 172 tests·서비스 전환 21 tests·auth-utils 43 tests, Pharmacy/Neture production build·API type-check, PC/390px 합성 브라우저 4흐름을 재검증했다. 이전 커밋의 검증으로 최종 HEAD 성공을 대신하지 않으며 최종 CI/리뷰는 PR에서 확인한다.

## 2026-11-01 통합·운영 사전 점검

- PR #911은 main `cf91b6aec2811280bc9c71446521d35b6116f409`에 병합됐다. main CI 41266338817·CodeQL 41266338788 PASS. Delivery 41266986281은 LEVEL_3 보류다. 아직 운영 migration/배포를 실행하지 않았다.
- GitHub 인증이 일시적으로 HTTP 401을 반환했다가 재조회에서 회복됐다. 네트워크 설정이나 자격증명을 추가하지 않았다.
- 새 호스트 DNS는 기존 Pharmacy/Neture와 동일한 프런트 주소를 가리키나 HTTPS 503이다. 기존 Pharmacy/Store는 200이다.
- 기존 WIF 읽기 전용 `retire-plan` 실행 41266635418에서 URL map의 호스트 범위가 현행 계약과 다른 것으로 확인됐다. mutation·삭제·DB write는 없다. 이 상태로 Pharmacy 배포를 강행하지 않는다.
- 후속 운영 도구는 고정 새 호스트의 TLS·라우팅만 plan→digest 검증→apply 한다. 인증서가 필요하면 고정 단일 호스트·운영 소유 marker의 신규 certificate/map entry만 생성한다. 기존/공용 인증서와 map·proxy·IAM·DNS·DB는 삭제/변경하지 않는다(단, URL map의 승인된 hostRules/tests 전환만 변경).
- TLS ACTIVE 후 라우팅을 전환하며 새 HTML·JS hash를 대상 Run과 대조한다. 공개 검증 실패 시 자신의 변경만 복원하고, 동시 편집이 감지되면 타인의 설정을 덮어쓰지 않는다. 중간에 생성한 TLS 자원은 삭제하지 않고 재plan 대상으로 보고한다.
- 운영 도구 Python 75 tests·workflow gate/diff 회귀를 실행했다. 실제 TLS 상태와 정확한 변경 digest는 운영 plan에서 확인해야 하며 테스트를 운영 실행 성공으로 보고하지 않는다.

PR #912 리뷰 보완: 최초 라우팅 쓰기 이후의 보상 복원은 새 배포 gate와 분리했다. 자신의 현재 topology 일치와 최신 Compute fingerprint를 확인하므로 다른 writer를 덮어쓰지 않으며, 이후 main 이동·배포 대기로 복원이 차단되지 않는 회귀를 추가했다.

추가 리뷰 보완: Certificate Manager 프로젝트 ID/번호 별칭을 plan 양쪽 경로에서 정규화하여 발급 상태 진행만으로 digest가 변하지 않게 했다. TLS 대기·plan 시작부터의 라우팅 쓰기에 15분, 공개 검증에 180초 wall-clock 제한을 두며, 늦게 준비된 TLS로 라우팅 쓰기를 시작하지 않는다. 새 호스트 모드는 이미 green인 CI를 요구하고 작업 step에 30분 한도를 두어 40분 job 안에서 보상 복원 시간을 확보한다. 기존 모드의 대기·한도는 유지한다.

## 1차 통합·배포 판정 — 후속 결과는 아래 절 참조 — 2026-11-01

이 절은 1차 배포 당시의 상태다. 이후 IAM 준비·TLS·호스트 전환 결과는 아래 후속 실행 절에 기록한다.

| 대상 | 결과 | 증거 |
|---|---|---|
| 이름·키·주소 변경 | PR #911 main 병합 | `cf91b6aec2811280bc9c71446521d35b6116f409` |
| 보호된 호스트/TLS 작업 경로 | PR #912 main 병합 | `948855d408978848b5d23875643e7194a62546a7` |
| 최종 main 검증 | CI·CodeQL PASS | CI 41269096834 / CodeQL 41269096774. 별도 PR #910 상담 변경도 포함된 최종 main을 검증했다. |
| API·Admin·Partner·Neture·Lecture·Store·KPA Branch | 선택한 7개 배포 SUCCESS | [Promote 41270480059](https://github.com/Renagang21/o4o-platform/actions/runs/41270480059), 실제 serving SHA 최종 보고 성공 |
| 운영 데이터 전환 | migration·API 준비 상태·트래픽 전환·전환 후 검증 성공 | 위 실행의 API `Run database migrations` 및 verified rollout 단계 SUCCESS |
| Pharmcoop 프런트엔드 | 배포·공개 검증·트래픽 전환 SUCCESS | [41271616656](https://github.com/Renagang21/o4o-platform/actions/runs/41271616656), `frontend_only=true`; 조합 fixture 단계 SKIPPED |
| 약국 공통 앱(Pharmacy·드럭스토어·CarePharm) | 이번 SHA 미배포 | canonical host 조건 불일치와 GCP 조회 403으로 보류. 기존 앱을 유지하며 강제로 guard를 건너뛰지 않았다. |
| 새 호스트 연결 | 미완료 | 운영 plan 41270112435 / 재조회 41271606173·41271974635 모두 `GET resource request failed (HTTP 403)` |

### 데이터 읽기 검증

지정된 기존 점주 테스트 계정으로 로그인하고 허용된 조회만 수행했다. 운영 사업 `drugstore`는 HTTP 200, 공식 이름 **드럭스토어형 약국**으로 응답하고, 이전 사업 키는 `BUSINESS_NOT_FOUND` 404다. 이전과 새 사업의 UUID 기반 policy scope fingerprint가 동일하다. Pharmacy·CarePharm 사업 identity와 해당 계정의 role/accessible-store fingerprint도 전후 동일하다.

이 계정은 약사 자격이 미요청인 기존 상태이므로 약국 회원 목록·store-access는 전후 모두 403이다. 조회를 통과시키기 위해 자격·역할을 승인하지 않았다. 따라서 모든 실제 운영자·개인 회원의 로그인·자격 흐름을 완료했다고 확대하지 않는다. 로그인에 따라 생성되는 정상 보안·감사기록은 보존 정책을 따르며 일회성 업무 fixture는 생성하지 않았다.

### 공개 화면 검증과 한계

- 새 호스트 DNS는 기존 프런트와 같은 주소를 가리키지만 HTTPS 503이다. 호스트 연결 완료로 보고하지 않는다.
- 기존 Pharmacy·CarePharm·Store·Pharmcoop 루트는 200으로 응답했다. Pharmacy는 기존 앱 유지 상태의 PC/390px, Store·Pharmcoop은 이번 배포 후 PC/390px에서 pageerror 0·가로 넘침 0을 확인했다. 실제 운영 응답을 환경 CA로 TLS 검증하는 HTTP 클라이언트 경유로 브라우저에 전달했으며 fixture 응답·실제 인증 우회는 없다.
- Neture 공개 루트는 이 환경의 프록시 경유에서 403으로 재검증하지 못했다. 해당 화면을 200/PASS로 집계하지 않는다. 배포 workflow의 Run revision smoke·전환·serving SHA 확인 성공과 구분한다.
- Hospital Pharmacy는 runtime 변경이 없어 이번 배포에 포함하지 않았다. 전체 GCP 서비스가 모두 같은 SHA로 배포됐다고 보고하지 않는다.

### 1차 배포 당시 남은 운영 단계

현재 GCP plan은 읽기 단계에서 403이므로 이 실행에서 새 TLS 자원 생성·라우팅 변경·IAM 변경은 없다. 기존 WIF 배포 계정의 호스트/TLS 작업 권한을 소유자가 확인·준비해야 한다. 응답 원문을 로그에 노출하지 않으므로 403만으로 정확히 어느 권한이 부족한지 단정하지 않는다. 고정 작업에 필요한 최소 권한과 소유자용 명령은 [호스트/TLS 운영 준비 안내](../guides/DRUGSTORE-HOST-TLS-OPERATIONS-V1.md)에 둔다.

권한 준비 후 최신 main의 green CI를 확인하고 `drugstore-plan`→실제 digest 검토→`drugstore-cutover`→약국 공통 앱 선택 promote를 이어간다. 이 문서 변경 자체는 `DEPLOYMENT = NOT_APPLICABLE`이며 이미 성공한 7개와 Pharmcoop을 기록 때문에 다시 배포하지 않는다.

## 후속 실행 — IAM 준비와 새 호스트 전환

2026-11-01 프로젝트 소유자가 안내된 7개 권한의 custom role을 만들고 기존 GitHub Actions 서비스 계정에 연결했다. 이전 403은 아래 새 실행에서 해소됐다. 사용자 콘솔 작업과 workflow 자체의 `iam_changed=false`는 구분한다.

- 최초 권한 준비 후 plan [41274057623](https://github.com/Renagang21/o4o-platform/actions/runs/41274057623) SUCCESS.
- cutover [41274165762](https://github.com/Renagang21/o4o-platform/actions/runs/41274165762)는 TLS 준비 후 main 변경을 감지해 새 쓰기 gate에서 중단됐다. 준비한 TLS 자원은 보존했다.
- 최신 main `e40ee20a4ae11d8e20df4e7c5ed3c6284439c7b5`의 CI 41274554617·CodeQL 41274554605 PASS. PR #914 회원 관리 변경이 포함됐지만 호스트 전환 코드·DB migration 추가는 없다.
- 새 plan [41275239518](https://github.com/Renagang21/o4o-platform/actions/runs/41275239518) SUCCESS: TLS ACTIVE, 인증서·entry 재생성 불필요.
- cutover [41275330103](https://github.com/Renagang21/o4o-platform/actions/runs/41275330103) SUCCESS: 새 호스트 연결과 공개 HTML·JS의 대상 Run 앱 일치 검증 통과. 작업 자체의 IAM·DB 변경은 없다.
- 공개 DNS는 기존 Pharmacy와 같은 프런트 주소이며 새 호스트 HTTPS 200을 재확인했다. 실제 주소·개인정보·운영 응답 원문은 공개 기록에 넣지 않는다.

약국 공통 앱 단독 선택 Promote [41275554203](https://github.com/Renagang21/o4o-platform/actions/runs/41275554203)는 판정 단계만 SUCCESS이고 배포는 SKIPPED다. 최신 API 변경 commit의 WO 키를 판정할 수 없어 `HELD_API_NOT_DEPLOYED`로 보류됐다. 실제 독립성을 추정해 guard를 우회하지 않았다. PR #914 변경·최신 main CI·새 migration 부재를 확인하고 API·Admin·약국 공통 앱 선택 Promote [41275690779](https://github.com/Renagang21/o4o-platform/actions/runs/41275690779)를 이어 실행했다. 동일 SHA·동일 API/Admin/약국 앱을 선택한 선행 실행 [41275688209](https://github.com/Renagang21/o4o-platform/actions/runs/41275688209)이 이미 배포를 시작했음을 확인해 중복 대기 실행 41275690779만 취소했다. 이 시점은 배포 완료 판정 전이며 실제 완료 결과는 아래 절에 기록했다.

## 최종 완료 판정 — 2026-11-01

이 절이 현재 판정이다. 앞 절의 403·503·미배포·진행 중은 당시 관측이며 아래 실제 결과로 해소됐다. 전체 협업체 운영 개통이나 모든 회원 자격 검증을 완료했다는 뜻은 아니다.

- [Promote 41275688209](https://github.com/Renagang21/o4o-platform/actions/runs/41275688209) SUCCESS. API → Admin·약국 공통 앱이 main `e40ee20a4ae11d8e20df4e7c5ed3c6284439c7b5`로 배포됐다. API·웹의 verified rollout, 약국 canonical routing 검사, 최종 serving SHA 보고 모두 SUCCESS. commit status `production`도 `DEPLOYED · deploy: api,admin,kpa-society`다.
- 앞서 성공한 7개 서비스 중 이번 API·Admin만 최신 main으로 갱신했다. Partner·Neture·Lecture·Store·KPA Branch 및 Pharmcoop은 기존 성공 배포를 유지한다. 문서 때문에 해당 서비스를 재배포하거나 Hospital Pharmacy를 추가 배포하지 않았다.
- 새 도메인 루트 HTML 200, `/assets/index-DNX32MFU.js` 200·`application/javascript`. 실제 공개 JS에서 구명칭·구주소 검색 결과 0건. TLS 검증을 끄거나 DNS/IP 우회를 하지 않았다.
- 실제 공개 Drugstore·Pharmacy·CarePharm·Pharmcoop의 PC 1440px/모바일 390px 총 8건: HTTP 200, pageerror 0·가로 넘침 0. Drugstore 두 화면 모두 공식 이름 표시·구명칭 없음. 합성 API 응답을 사용하지 않았다.
- 새 API 배포 후 지정 테스트 계정의 허용된 읽기를 다시 검증했다. 새 사업 키 200·공식 이름, 이전 키 404, 사업 identity와 계정 role/store fingerprint 유지. 약사 자격 미요청에 따른 403도 유지했다. 실사용자 자격 승인·회원 상태 변경·일회성 업무 fixture는 생성하지 않았다.

이름·도메인·사업 키 전환 WO는 완료다. 미게시 약관·약사 자격·실제 운영자/회원의 전체 업무 흐름 및 현재 프록시에서 차단된 Neture 공개 화면 재확인은 본 완료의 검증 범위를 넘으며 성공으로 간주하지 않는다. 기존 TLS 자원 삭제·Cloud Run 이름 변경도 하지 않았다.

문서 정합: 본 WO/CHECK의 최신 상태와 초기·1차 실행 기록을 구분했다. 증적 2개 문서만 갱신하며 canonical 정책·회원 자격은 변경하지 않는다. 이 완료 기록 자체는 `DEPLOYMENT = NOT_APPLICABLE`이다.
