# 약국 협업체 운영 개통 검증 기록

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **상태**: ACTIVE
> **작성일**: 2026-10-27 · **최종 갱신**: 2026-10-27
> **근거 WO**: [WO-O4O-COOPERATION-OPERATIONAL-READINESS-V1](../work-orders/WO-O4O-COOPERATION-OPERATIONAL-READINESS-V1.md)

## 판정

자료 본문·첨부 열람 보완과 격리 검증은 완료했다. 실제 운영 개통은 미완료다. 개발·main 통합·배포·실계정·실매장 검증을 서로 대신하는 완료 증거로 사용하지 않는다.

## 소비처와 변경

| 소비처 | 확인 범위 |
|---|---|
| Pharmacy·드럭스토어형 약국 / web-pharmacy-business | 공통 회원 업무·전용 자료·운영자 검토 |
| CarePharm / web-neture | 공통 회원 업무·전용 자료·운영자 검토 |
| Pharmcoop / web-pharmacy-coop | 개인 회원 업무·운영자 검토, 약국 scope 미부여 |
| shared-space-ui·operator-core-ui | 본문·첨부 표현, 기존 transport·scope 유지 |

요약과 전체 본문을 함께 제공하고 현재 자료·개정 이력의 첨부를 열 수 있게 했다. 첨부는 자동으로 읽지 않으며 HTTP/HTTPS 외 스킴·상대 경로·자격정보 포함 URL을 거절한다. 공유 UI helper를 추가했고 기존 가입·role·API·schema 계약은 변경하지 않았다. API 변경은 격리 PostgreSQL 권한 회귀 테스트뿐이다.

## 로컬 검증

| 검증 | 결과 |
|---|---|
| shared-space-ui 전체 | 23 files / 206 tests PASS |
| operator-core-ui 전체 | 30 files / 217 tests PASS |
| pharmacy-business 전체 | 20 files / 149 tests PASS |
| API model + 격리 PostgreSQL | 2 suites / 28 tests PASS |
| Store 음성·상담 기존 로직 | 2 files / 26 tests PASS — 실제 장치 검증 아님 |
| 합계 | 626 tests PASS |
| Pharmacy Business·Neture·Pharmcoop build | 세 호스트 PASS |
| 변경 UI ESLint·diff 공백 검사 | PASS |
| canonical baseline + incremental prefix | 빈 로컬 PostgreSQL 15에서 46 prefixes fingerprint PASS |

회귀 테스트는 수정 전 새 회원 열람 4개가 실패하는 것을 확인했고 수정 후 통과했다. 초기 frontend build는 최신 main의 content-editor dist가 오래되어 실패했으며, 기존 패키지 재빌드 후 통과했다. 의존성·lockfile·관련 없는 소스 변경은 없다.

실행은 SETUP 환경 적용 후 각 패키지 Vitest, root의 `pnpm exec vitest run --config services/web-pharmacy-business/vitest.config.mjs`, API의 기존 Jest 설정을 사용했다. 로그와 합성 브라우저 산출물은 로컬 `.onboarding/cooperation-ops-*`에 두고 public 저장소에 원문을 넣지 않는다.

## 브라우저 검증

실제 빌드 산출물을 loopback preview로 실행하고 합성 인증·API만 연결했다. 실제 계정과 운영 API를 사용하지 않았다. 네 공간 × 1440/390 폭, 총 8개 시나리오 모두 PASS. 각 시나리오의 회원·운영자는 별도 browser context를 사용했다.

- 필수 공지 게시→회원 확인→운영자 대기 수 갱신
- 활동 신청→승인→진행→완료와 회원 상태 반영
- 지원 진입 시 scope/hash 유지→문의 접수→운영자 배정·기한
- 자료 분류·관련 교육·개정 반영과 양측 전체 본문·첨부 표시
- 양측 page error 0, 가로 넘침 없음; CarePharm mobile screenshot 육안 확인

첨부 실파일을 다운로드하거나 실제 microphone/speech 장치를 사용하지 않았다. Pharmcoop은 개인 가입, 나머지는 선택 약국 경영 단위의 fixture로 구분했다.

## 실제 환경 읽기 확인

2026-10-27 시점의 정상 HTTPS·공개 API와 지정 점주/직원 Secret만 사용했다. API는 허용된 Pharmacy 동일 출처 proxy를 통해 조회했다.

| 항목 | 관측 결과 / 한계 |
|---|---|
| 네 공개 홈 | 모두 HTTP 200 |
| Pharmacy·드럭스토어형 약국·CarePharm 가입 정책 | 각각 503 / POLICY_UNAVAILABLE |
| 세 사업의 공개 terms·privacy | 총 6개 endpoint 모두 404; 이 경로에서 게시 문서 없음 |
| 공개 cooperatives 목록 | 빈 목록; 전체 DB에 조합이 없다는 의미로 확대하지 않음 |
| 지정 점주 로그인·접근 매장 | 성공, 접근 매장 1개 / owner |
| 점주의 세 사업 회원 업무 | 각각 200, 업무·자료 응답 구조 확인. 실제 양방향 쓰기 검증은 아님 |
| 지정 직원 로그인 | 401 / INVALID_CREDENTIALS, 실패 후 재시도·초기화·권한 부여 없음 |
| 운영자·개인 조합원 | 지정 계정 미확보, 검증 미실행 |

사업 데이터 생성·수정·삭제, role 변경, 약관 게시, 가입 seed는 실행하지 않았다. 정상 인증 과정에서 생기는 보안·감사 기록은 보존 정책을 따르며 조기 삭제하지 않았다. 계정값·응답 원문·개인/약국 식별자는 공개 기록에서 제외한다.

## 남은 개통 작업

직원 Secret 정정, 운영자·개인 조합원·테스트 약국 지정이 필요하다. 신규 가입 전에는 실제 운영 주체의 약관·개인정보처리방침 게시가 필요하다. CarePharm의 미정 회사 정보를 임의 작성하지 않는다. 공개 조합 정보·개별 사업 제공 기능·직원 허용 설정도 지정 운영자와 확인해야 한다. 실제 매장 PC·태블릿·음성 검증은 미실행이다.

## 전달·정리 상태

[PR #844](https://github.com/Renagang21/o4o-platform/pull/844)를 main에 병합했다. 배포 기준 SHA는 `fd0ea63f014c155b2b5dc7259e1fed6eb50ae0c4`다. 작업 branch는 `wo/cooperation-operational-validation-20261027`이며, 배포 기록은 후속 문서 branch로 반영한다.

- PR 최종 HEAD `1160d395ed65c555400e7f4bb05eb6ccbb11860d`: CI Gate·CodeQL·SonarCloud PASS, Codex 리뷰 완료/지적 없음, 미해결 스레드 0건.
- 초기 SonarCloud의 props readonly 2건·map callback 1건을 수정했고 관련 20개 테스트를 jsdom에서 다시 통과했다. 처음 root Vitest 실행은 DOM 환경 누락으로 실패해 올바른 jsdom 환경에서 재실행했다. 실패를 제품 결함으로 확대하지 않았다.
- [main CI 40445728861](https://github.com/Renagang21/o4o-platform/actions/runs/40445728861): PASS.
- [자동 Delivery 40446808867](https://github.com/Renagang21/o4o-platform/actions/runs/40446808867): 완료. 공유 UI 변경은 LEVEL_3 승인 대기 판정.
- [Promote 40446999749](https://github.com/Renagang21/o4o-platform/actions/runs/40446999749): `services=neture,kpa-society`, PASS. 양쪽 verified rollout의 새 revision smoke·트래픽 전환·배포 확인과 최종 serving SHA report 성공.
- [Pharmcoop 40445750897](https://github.com/Renagang21/o4o-platform/actions/runs/40445750897): `apply=false`, `frontend_only=true`, PASS. API 호환성 확인·private frontend smoke·reviewed revision 트래픽 100% 검증 성공. 조합/회원 등록 단계는 미실행.
- API·migration은 배포하지 않았다. 다른 웹 호스트는 이번 승격에서 선택하지 않았다. 전역 production commit status의 NOT_SELECTED/pending은 미선택 호스트가 남은 표시이며, 요청한 두 호스트와 Pharmcoop 배포 실패를 뜻하지 않는다.

2026-10-27 배포 후 확인:

| 공개 공간 | 홈 | 로드한 JS | JS 응답 |
|---|---|---|---|
| Pharmacy | 200 | `/assets/index-CDrFRRNd.js` | 200 |
| 드럭스토어형 약국 | 200 | `/assets/index-CDrFRRNd.js` | 200 |
| CarePharm | 200 | `/assets/index-B6g209nv.js` | 200 |
| Pharmcoop | 200 | `/assets/index-DqjcKuME.js` | 200 |

Pharmacy/드럭스토어형 약국과 CarePharm의 공개 JS가 전환 전 파일에서 변경된 것도 확인했다. Pharmcoop은 앞서 완료된 배포의 JS를 다시 확인했다. 배포 후 인증 화면의 실계정 양방향 쓰기·실장치 브라우저 검증은 수행하지 않았으며 앞선 격리 브라우저 검증으로 대신 완료 처리하지 않는다.

격리 SQL fixture는 synthetic 사용자·업무·인증 문의 잔존 0건을 확인했다. 본 작업 label을 확인한 PostgreSQL container와 연결 anonymous volume을 제거했고, 본 작업 preview만 종료했다. loopback 4311·4312·4313·55479 포트 종료를 확인했다. 다른 리소스는 정리하지 않았다.

## 문서 정합

기존 V2의 COMPLETED는 개발·통합·배포 완료이며 실계정·실매장 검증은 별도라고 명시돼 있어 모순이 아니다. 과거 기록과 canonical index를 다시 쓰지 않았다. 본 작업은 운영 개통 미완료를 ACTIVE로 추적한다.

## 2026-10-27 후속 — main 병합 전 가입 대상 정합 검증

### 범위와 구현

사용자 「진행하자 main병합 전까지」에 따른 후속 작업이다. 기준 main `e96c4a7934`, 작업 branch `wo/cooperation-opening-validation-20261027`. 앞 절의 PR #844/#846 배포는 이전 변경의 완료 증거이며, 아래 새 변경의 main 반영·배포를 뜻하지 않는다.

Pharmacy/드럭스토어형 약국 참여 화면이 URL에 있는 약국 선택을 가입 상태 조회·신청·탈퇴 요청에 전달하지 않는 결함을 확인했다. 기존 API는 선택 조직 header를 지원하지만 이 화면은 생략하고 있었다.

- 현재 계정의 접근 가능 목록에서 owner/admin/manager 약국을 선택한다. 사업 미가입 약국도 신청할 수 있어야 하므로 활성 사업 회원만 고르는 자료함 selector로 대체하지 않았다.
- 하나면 자동 선택하되 잘못된 명시적 선택을 다른 약국으로 바꾸지 않는다. 여러 개면 선택 전 가입 조회·신청·탈퇴를 시작하지 않는다. 직원 전용 목록에는 경영자 가입 조작을 제공하지 않는다.
- 가입 조회·신청·탈퇴 모두 기존 `X-Store-Organization-Id`로 같은 약국을 전달한다. 기존 다른 POST 소비처의 동작은 유지한다.
- 약국/계정/사업 전환 시 입력·동의·상태를 분리하고 이전 응답을 버린다. 처리 중 selector를 잠그되 외부 URL 전환 후 새 약국의 selector가 잠긴 채 남지 않도록 한다. 다른 query와 hash도 보존하며 참여자 게시판 진입에도 선택 약국을 유지한다.
- 담당 운영자 안내에는 회원용 약국 선택을 요구하지 않는다. CarePharm의 기존 scoped client와 Pharmcoop 개인 가입 코드는 변경하지 않았다. 서버 권한·API endpoint·schema·dependency·CI 설정 변경은 없다.

직접 소비처는 Pharmacy/드럭스토어형 약국 앱의 `/my/participation`과 기존 `/businesses/:businessKey/participation`이다. 로컬 `businessApi.post`의 다른 소비처는 사업 게시판 작성·가입 요청·댓글·좋아요·게시판 관리이며, 선택 인자를 주지 않은 기존 호출 형태를 유지한다.

### 검증

| 항목 | 결과 |
|---|---|
| Pharmacy Business 전체 | 21 files / 160 tests PASS — 새 회귀 11개 포함 |
| shared-space-ui 전체 | 23 files / 206 tests PASS |
| operator-core-ui 전체 | 30 files / 217 tests PASS |
| Pharmcoop 전체 | 11 files / 85 tests PASS |
| 합계 | 668 tests PASS |
| Pharmacy Business production build | PASS |
| 변경 파일 ESLint·diff 검사 | PASS |
| 문서 민감정보 검사 | PASS |

새 회귀는 미선택·명시적 타 약국·직원 전용·목록 조회 실패/복구·미게시 약관 차단·지정 약국 신청/탈퇴·변경 시 입력/동의 초기화·이전 응답 무시를 확인한다. 기존 테스트의 모든 header 포함 조회를 active로 고정하던 mock을 제거하고 자료함 fixture의 가입 상태를 개별 지정했다.

초기 회귀 실행에서 약국 선택 시 hash가 사라지는 것을 발견해 URL 갱신을 보완했다. mock 변경으로 드러난 자료함 fixture 누락 2건도 정정한 뒤 전체 검증했다. 첫 ESLint의 기존 effect dependency 경고를 정리했고 최종 검사에는 경고가 없다.

실제 Pharmacy/드럭스토어형 약국 빌드 산출물을 loopback preview로 실행했다. 모든 외부 요청을 가로채 합성 API만 연결했으며 운영 자격증명이나 업무 데이터는 사용하지 않았다. 두 host × 1440/390 폭, 총 4개 시나리오 PASS:

- 다중 약국에서 선택 전 가입 조회 0건
- 약국 A의 신청→pending, 약국 B의 기존 active 조회→탈퇴 요청
- 모든 조회/쓰기의 선택 조직 header 일치, 이전 약국 상태 제거
- query/hash 보존, page error 0, 가로 넘침 없음; mobile screenshot 육안 확인

로컬 합성 API 상태 전이 결과이며 실제 운영 신청·승인·탈퇴를 수행한 것은 아니다. 실계정 양방향 업무·실장치 음성 검증의 완료 증거로 사용하지 않는다.

### 실제 환경 재확인과 잔여 입력

정상 HTTPS와 지정 점주 Secret으로 읽기만 재확인했다. 인증의 보안/감사 기록은 정책에 따라 보존하며 사업 데이터 쓰기는 없다.

| 항목 | 이번 관측 |
|---|---|
| 네 공개 홈 | 모두 200 |
| 세 사업의 가입 정책 | 각각 503 |
| 세 사업 terms/privacy | 총 6개 경로 모두 404 |
| 공개 cooperatives | 200, 0건 — 전체 DB에 조합이 없다는 결론 아님 |
| 지정 점주 | 로그인·접근 매장 조회 200, owner 매장 1개 |
| 점주의 Pharmacy/드럭스토어형 약국/CarePharm 업무 읽기 | 모두 200, 업무·자료 응답 구조 확인 |
| 직원 | 이전 401 이후 Secret 정정 확인이 없어 이번 재로그인 미실행 |
| 운영자·개인 조합원 | 지정 계정 Secret 미연결, 실계정 검증 미실행 |

운영자와 개인 조합원 Secret 연결·테스트 대상 지정은 사용자 입력 대기다. 기능/직원 허용/담당 운영자/공개 조합 설정은 확인 경로를 정리했으나 실제 설정값까지 검증하지 못했다. 실제 회사 정보 없는 CarePharm 초안은 빈칸 유지이며 게시하지 않았다. 운영 데이터·role·조합 등록·약관 게시·신청/탈퇴·문의/공지/활동의 운영 쓰기는 수행하지 않았다.

[개통 검증 절차](../guides/O4O-COOPERATION-OPENING-VALIDATION-V1.md)에 계정/가입 단위, 기존 운영 설정 진입, 공지·자료·활동·지원의 양방향 확인, 운영 쓰기 사전조건과 실제 장치 검증 기준을 묶었다.

### 전달 상태

이번 변경은 검증·commit·push까지만 진행한다. PR 생성·main 병합·자동 병합·배포는 미실행이다. 개통 전체 상태는 ACTIVE를 유지한다. 최종 빌드로 브라우저 4개 시나리오를 재실행해 모두 통과했다. 본 작업 preview만 종료했고 loopback 4311 포트 종료를 확인했다. 이번 작업은 DB container를 생성하지 않았다. 원격 branch 일치는 push 후 별도로 확인한다.

문서 정합: 이전 배포 완료 기록을 유지하면서 새 미배포 변경과 개통 미완료를 분리했다. canonical index·과거 완료 상태 변경은 없다.


### PR #851 리뷰 보완

사용자가 main 통합·배포를 승인한 후 최신 main의 펀딩 변경을 충돌 없이 반영했다. Codex가 신청 중 외부 약국 전환 후 원래 약국으로 돌아오면 이전 pending marker 때문에 selector가 잠기는 문제를 지적했다. 회귀를 확장해 수정 전 1개 실패를 재현했고, 선택 약국 변경 시 marker를 정리하도록 보완했다. 이전 요청이 새 화면을 갱신하지 않는 기존 경계는 유지한다. 최종 CI·리뷰·배포 결과는 후속 기록으로 추가한다.


## 2026-10-27 PR #851 통합·배포 결과

사용자 「MAIN 병합 배포까지 진행」에 따라 앞 절의 push 종료 경계 이후 통합·배포를 진행했다. [PR #851](https://github.com/Renagang21/o4o-platform/pull/851)의 main merge SHA는 `60bec2ef4f8bdb228653a66a828c3f7b363b8a35`다.

- 최종 PR HEAD `8be89a4af671458a4fd4a54719a10604c5d02d12`: CI Gate·CodeQL·SonarCloud PASS. Codex 재리뷰는 추가 지적 없음, 기존 지적 스레드 해결 확인. 이전 커밋의 CI는 수정 후 대체되어 이 작업에서 취소했으며 최종 HEAD의 성공을 기준으로 판정했다.
- 리뷰 보완 후 확장된 참여 회귀 11개·Lint·production build PASS. 선택 약국 재방문 시 잠김을 수정 전 실패/수정 후 성공으로 확인했다.
- [main CI 40473082273](https://github.com/Renagang21/o4o-platform/actions/runs/40473082273): PASS.
- [Delivery 40474459408](https://github.com/Renagang21/o4o-platform/actions/runs/40474459408): 완료, LEVEL_3 판정.
- [Promote 40474710232](https://github.com/Renagang21/o4o-platform/actions/runs/40474710232): `services=kpa-society`, PASS. 실제 Cloud Run 서비스는 현행 설정의 `pharmacy-business-web`이다. 새 revision smoke·트래픽 전환·배포 확인·최종 serving SHA report가 성공했다.

이번 코드의 runtime 소비처인 Pharmacy/드럭스토어형 약국 호스트만 승격했다. API·migration·Neture/CarePharm·Pharmcoop은 이번 작업에서 배포하지 않았다. 전역 production status의 NOT_SELECTED/pending은 미선택 호스트의 남은 판정이며 이번 대상 배포 실패가 아니다. 전체 서비스 배포 완료로 확대하지 않는다.

배포 후 두 공개 홈과 새 `/assets/index-DEh5rNzw.js`가 모두 200이다. 배포 전 파일은 `/assets/index-CDrFRRNd.js`였으며, 새 공개 bundle에 「가입 상태를 확인할 약국」이 포함된 것도 확인했다. 실행 중인 운영 계정의 신청·탈퇴 쓰기는 수행하지 않았다. 실계정 양방향/실장치 검증의 잔여 조건은 앞 절과 같다.

후속 기록은 문서 전용 변경이며 별도 runtime 배포 대상이 아니다. 운영 개통 전체 상태는 ACTIVE를 유지한다.


## 2026-10-27 테스트 조합 실제 등록 착수

사용자가 테스트 조합의 실제 등록·연합회 목록 노출을 요청하고, 점주 테스트 계정을 해당 조합 관리자, 공급자 테스트 계정을 개인 조합원으로 명시 선택했다. 값은 기록하지 않으며 환경 연결 `O4O_TEST_STOREOWNER_EMAIL`·`O4O_TEST_SUPPLIER_EMAIL`을 사용한다.

대상은 기존 등록 도구의 `test` / `coop-test` 하나다. 조합 관리자 역할과 개인 회원 active 자격만 연결하고 기존 약국·공급자·플랫폼 역할은 변경하지 않는다. 사용자가 계속 표시해 확인하려는 테스트 조합의 설정 등록이며, 주문·결제·공지·문의 등 일회성 업무 데이터를 생성하지 않는다.

기존 workflow가 dispatch 계정 선택값을 후속 step의 env 로그에 그대로 노출할 수 있어 실행 전에 runner masking 단계를 추가한다. 계정값은 event 파일에서 읽어 마스킹 명령으로만 전달하며 실패 시 등록 전에 중단한다. 기존 main HEAD·green CI·동일 SHA serving API·실제 API image digest 고정·dry-run·transaction·충돌 검사 경계는 완화하지 않는다. 권한·DB 구조·의존성 변경은 없다.

마스킹 helper의 원문/정규화 계정, workflow 명령 escape, 누락/잘못된 입력의 출력 전 거절 테스트 3개 PASS. 아직 운영 조합 등록은 실행하지 않았다. 통합·사전 점검·등록·공개/계정별 조회 결과를 본 절에 추가한다.


### 테스트 조합 등록 완료·권한 검증

2026-10-27 사용자 지정 계정 연결과 실제 등록을 완료했다. 운영 기준 SHA는 `34c57fed2d2718a378276755a4805c050f5cd52b`다.

| 단계 | 결과 |
|---|---|
| 마스킹 보완 [PR #856](https://github.com/Renagang21/o4o-platform/pull/856) | main 통합 완료, CI Gate·Codex 지적 없음·SonarCloud PASS |
| [main CI 40498015680](https://github.com/Renagang21/o4o-platform/actions/runs/40498015680) | PASS |
| [API verified 배포 40498060741](https://github.com/Renagang21/o4o-platform/actions/runs/40498060741) | PASS — 기존 동일 SHA gate를 유지하기 위한 표준 재배포. API 코드·migration 추가 없음 |
| [사전 점검 40500292786](https://github.com/Renagang21/o4o-platform/actions/runs/40500292786) | `apply=false`, `frontend_only=false`, PASS. masking·동일 SHA API image pin·등록 조건/충돌 검사 성공, frontend 배포 skipped |
| [실제 등록·앱 배포 40500586717](https://github.com/Renagang21/o4o-platform/actions/runs/40500586717) | `apply=true`, `frontend_only=false`, PASS. 등록 Job·revision readiness·private frontend smoke·검토 revision 트래픽 100% 검증 성공 |

등록 대상은 `test` 조합과 `coop-test` 사업이다. 승인된 점주 테스트 계정에는 **해당 조합 local admin**, 승인된 공급자 테스트 계정에는 **개인 회원 active**를 연결했다. 계정 생성·비밀번호 변경·전역/연합회 권한 부여는 없다. 개인 조합원 자격을 약국 조직 가입으로 복사하지 않았다.

실제 API로 다음을 확인했다. 개인 식별자·계정값·원문 응답은 공개 기록에서 제외했다.

| 검증 | 관측 |
|---|---|
| 공개 directory | 200, 0건 → 1건. `slug=test`, `businessKey=coop-test` 일치 |
| 두 지정 계정 로그인 | 모두 200, 기존 활성·이메일 인증 계정 사용 |
| 조합 관리자 | 해당 조합 admin 확인, 업무 관리·역할 목록·회원 목록 조회 200 |
| 개인 회원 | active 개인 가입, 회원 업무 조회 200, `subjectType=person` |
| 개인 회원의 관리 접근 | 업무 관리·역할 목록 각각 403 |
| 개인 회원에 약국 조직 header를 덧붙인 접근 | 403 — 개인 가입 단위와 약국 단위 혼합 거절 |
| 기존 권한/매장 | 등록 전후 원래 global roles와 접근 약국/역할 fingerprint 일치, 두 계정 모두 기존 매장 연결 유지 |
| 연합회 권한 | 두 계정 모두 연합회 역할 없음 유지 |

운영 HTML/JS와 실제 공개 API 데이터를 사용해 1440/390 폭 브라우저에서 카드 1개·빈 목록 안내 제거·`조합 공간 방문 → /test`·개별 조합 제목을 확인했다. 두 시나리오 PASS, page error 0, 개별 조합 화면 가로 넘침 없음, mobile screenshot 육안 확인.

클라우드의 HTTP 허용 목록에는 직접 API host가 없어 브라우저 검증은 허용된 Pharmacy 동일 출처 API proxy로 연결하는 테스트 transport override를 사용했다. 첫 cross-origin proxy 시도는 proxy의 중복 CORS 헤더 때문에 실패했고 동일 출처 테스트 연결로 정정했다. 운영 데이터·응답·자격 판정은 합성하지 않았다. 직접 API host의 네트워크/CORS 검증으로 확대하지 않는다. 임시 HTTP 파일과 browser context는 종료 시 정리했다.

공개 진입은 [연합회](https://pharmcoop.neture.co.kr/) → [테스트 조합](https://pharmcoop.neture.co.kr/test), 해당 조합 관리는 `/test/operator`다. `/operator`는 별도 연합회 권한 공간이다. 이미 열린 연합회 페이지에는 새로고침이 필요하다.

이 조합은 사용자가 계속 표시해 확인하도록 요청한 테스트 공간 설정으로 유지한다. 이번 작업에서 주문·결제·공지·문의 등의 일회성 테스트 업무 데이터는 생성하지 않았다. 정상 인증의 보안/감사 기록은 정책에 따라 보존한다. 실제 법정정보·약관 게시와 일반 신규 가입 개통을 완료한 것으로 처리하지 않는다.

**문서 정합:** 이전의 계정 미지정·공개 조합 0건·테스트 등록 미실행 표는 당시 관측으로 보존한다. 이번 등록으로 Pharmcoop 테스트 조합 및 두 지정 계정 연결 항목을 해소했다. 다른 사업의 운영자·약관·실매장 항목은 남아 전체 WO는 ACTIVE다.

## 2026-10-29 — 네 공간 개통·업무 연결 재검증

기준 main `9fe9fa7e41`, branch `wo/cooperation-opening-end-to-end-20261029`. ERP Assistant는 사용자 결정에 따라 리팩터링 이후 별도 과제로 제외한다. 이번 변경은 격리 검증 fixture·회귀와 개통 절차/기록이며 runtime 기능·권한·API·schema 변경이 없다.

### 현재 운영 관측

허용된 Pharmacy 동일 출처 proxy와 기존 지정 Secret으로 읽기만 조회했다. 정상 로그인 외 업무 데이터 쓰기·자격 신청/승인·역할 변경·약관 게시를 하지 않았다.

| 항목 | 현재 결과 / 판정 |
|---|---|
| 네 도메인 공개 홈 | 모두 200 |
| 세 약국 사업의 가입 정책 | 각각 503; 공개 terms/privacy 경로 여섯 개는 404. 신규 가입 개통 미완료 |
| 지정 점주 | 로그인 200, 접근 매장 1개/owner 유지. 본인 공통 약사 자격 조회 200, `unrequested` |
| 점주의 Pharmacy/드럭스토어형 약국/CarePharm 회원 업무 | 모두 403 / `COOPERATION_MEMBERSHIP_REQUIRED`. 최신 개인 약사 자격 조건과 일치하며 과거 200을 현재 완료 증거로 사용하지 않음 |
| 점주의 세 약국 사업 운영 업무 | 모두 403. 담당 운영자 목록 조회 200이나 해당 세 사업 지정 없음. 테스트 조합 admin을 다른 사업 운영자로 간주하지 않음 |
| Pharmcoop | 공개 조합 1건, 지정 조합 관리자 관리 조회 200, 지정 개인 회원 조회 200/`person` |
| Pharmcoop 경계 | 개인 회원의 관리·역할 관리 403, 약국 header 혼합 403. 두 계정의 기존 전역 역할·매장 연결 fingerprint 동일, 연합회 권한 없음 유지 |
| 직원 | 이전 로그인 실패 후 Secret 정정 확인이 없어 재로그인하지 않음. 변수 ready를 계정 검증 성공으로 취급하지 않음 |

공통 약사 자격은 [운영 책임 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md)에 따라 중앙의 위임된 검토 담당자가 면허 근거를 확인해 승인해야 한다. 기존 약국 승인이나 owner 역할로 자동 대체하지 않는다. 본인 자격 미신청만으로 세 사업의 가입 상태까지 판정하지 않는다. 약사 승인 후 선택 약국의 현행 사업 가입도 다시 확인해야 한다.

### 격리 DB·UI 검증

- 새 전용 PostgreSQL 15 컨테이너를 loopback `55479`에만 열고 빈 DB에서 canonical baseline + incremental **49 prefixes** fingerprint를 확인했다. 운영 DB 접속 없음.
- 약국 경영 fixture 두 명에만 합성 승인 자격·검토 사유를 추가했다. 개인 조합원은 약사 자격 없이 유지한다. 최초 실행은 필수 검토 사유 누락으로 setup 실패했고 fixture를 정정한 뒤 **2 suites / 31 tests PASS**. 해당 실패를 제품 결함이나 운영 자격 변경으로 처리하지 않았다.
- 새 회귀: 개인 자격 취소 즉시 약국 읽기/문의 쓰기 거부와 개인 조합원 이용 유지. 약국/개인 두 가입 단위 각각 문의 접수→담당 배정→발송 실패 답변 비공개→성공 답변만 회원 표시→동일 요청 재시도 시 중복 발송 없음→운영 대기/기한 초과 감소→타 회원에게 미노출을 실제 SQL·기존 서비스로 확인했다. 메일 transport만 mock이며 실제 이메일 발송 증거는 아니다.
- 공통 회원/운영자 관련 UI **8 files / 56 tests PASS**, 약국 앱 전체 **21 files / 160 tests PASS**. 총 **247 tests PASS**.
- Pharmacy Business·Neture·Pharmcoop 최신 소스 production build 모두 PASS. lockfile·dependency·CI·배포 설정 변경 없음.
- 현재 빌드의 합성 API 브라우저 검증은 네 공간 × 1440/390 폭 **8개 시나리오 PASS**. 공지 게시/확인과 대기 수, 활동 신청/승인/진행/완료, 지원 진입/접수/담당 배정, 자료 개정/본문/첨부/교육 링크를 확인했다. 개인·약국 scope를 분리하고 각 시나리오의 page error 0·가로 넘침 없음을 확인했으며 CarePharm mobile screenshot을 육안 확인했다. 브라우저 API fixture와 실제 PostgreSQL 검증은 별도이며 하나의 live backend E2E로 보고하지 않는다. 실제 음성 장치·실제 이메일 발송은 미검증이다.
- 격리 DB 검증 후 합성 사용자 0건을 확인했다. 전체 컨테이너·익명 volume과 이번 preview 프로세스를 종료·정리하며 private 로그/합성 screenshot은 저장소 밖에 유지한다. 정상 운영 로그인에서 생성된 보안·감사 기록은 보존 정책을 따른다.

### 개통을 위해 남은 입력과 검증

1. 약국 단위 검증 계정의 실제 약사 자격 신청·근거 확인·중앙 담당자 수동 승인, 해당 약국의 사업별 가입 확인.
2. Pharmacy/드럭스토어형 약국/CarePharm의 실제 담당 운영자 지정. 조합 관리자나 플랫폼 일반 역할을 자동 전용하지 않음.
3. 직원 자격증명 정정 확인 후 실제 허용·거절 검증.
4. 사업별 운영 주체·법정정보·약관 준비. CarePharm 회사 정보 빈칸은 유지하며 미정 상태로 게시하지 않음.
5. 실매장 PC·태블릿·마이크·읽어주기 검증과 실제 운영 데이터의 완전 정리 가능 범위를 확정한 양방향 검증. 격리 UI/DB 성공을 이 항목의 완료로 대체하지 않음.

문서 정합: 과거 계정·운영 응답은 당시 관측으로 보존하고 현재 상태를 별도 기록했다. 약사 자격 선행 조건을 개통 guide에 보완했으며 전체 WO는 ACTIVE다. ERP Assistant를 이번 미완료 개발 목록에 포함하지 않는다.
