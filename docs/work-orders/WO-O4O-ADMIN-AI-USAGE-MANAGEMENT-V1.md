# 관리자 AI 운영 관리 구현 TODO

> **상태**: ACTIVE — 단계별 개발, 현재 차수는 조회 기반 1단계
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO/IR**: 사용자 「TODO 작성 → 코드·문서 보완 → 개발 → push까지」 · [설계안][design] · [사용처 조사표][inventory]

현재 결과: 조회 기반 1단계는 [PR #724](https://github.com/Renagang21/o4o-platform/pull/724)로 main에 병합되고 API·관리자 배포까지 완료됐다. §1·§4의 push-only 종료는 최초 개발 인계 당시의 범위이며 이후 사용자 승인과 통합 결과는 §5·§6에 기록한다. 기능별 쓰기·실행 제어는 §3의 후속 TODO다.

## 1. 이번 차수의 목표와 범위

설계 §9의 첫 단계인 사용처·현재 설정·공급자 연결·기록된 사용량 조회를 실제 관리자 UI/API로 구현한다. 기존 Gemini 화면만으로 전체 AI 상태를 파악할 수 없는 문제를 먼저 해결한다. 기능별 모델/중지 쓰기와 전체 직접 호출 이관은 후속 단계로 구분한다.

기준 main: `df71662340` (2026-10-20). main 미반영 조사·설계는 각각의 고정 커밋 링크로 참조하고 다른 branch를 병합하지 않는다. 기존 설정·비용·가입·업무 권한을 변경하지 않는다. 신규 DB schema·migration·seed·provider 유료 호출·운영 DB 조회/수정 없음. 종료는 검증·commit·push이며 PR·병합·배포는 수행하지 않는다.

## 2. 구현 TODO

- [x] 최신 main·정본·31개 호출 경로와 기존 관리자 소비처 대조
- [x] 서버의 사용처 등록 목록: 기능명·서비스/공통 영역·능력·설정 결정 방식·중지 검사·집계 연결 구분
- [x] 관리자 인증을 거치는 읽기 API: 기존 정책값·연결 유무 확인, 비밀값·prompt·개인 기록 미반환
- [x] 기존 usage 원장의 기간별 공급자/모델/scope 집계: 누락·미분류·조회 오류를 0과 구분
- [x] 관리자 세 탭: 사용처 / API·모델 연결 / 사용량·비용, 이름 검색·영역 선택
- [x] 기존 Gemini 설정 링크·영향 범위 안내 유지, 신규 제어가 적용된 것처럼 표시하지 않음
- [x] API 권한·읽기 전용·실패/누락·기간 경계 검증
- [x] UI 로딩·검색·선택·오류/재시도·통계 범위·기존 경로 검증
- [x] 타입·build·focused tests·문서 검증
- 인계: scope 검사 → commit/push → 원격 SHA 확인. 최종 증거는 완료 보고에 기록한다.

## 3. 다음 구현 TODO

- [ ] 소비처의 실제 운영 이용·현재 설정·사업/서비스 귀속 대조
- [ ] 서비스·기능별 모델 정책, 조건부 저장·유효 버전·구/신 설정 쓰기 정합
- [ ] 전체/서비스/기능 중지의 실제 admission·내부 retry/fallback 연결
- [ ] 번역 기능별 override, 상품 콘텐츠 actor, 직접 HTTP·멀티모달의 시도별 회계 연결
- [ ] 실행 적용 증거와 기능별 durable 사용량 차원 연결
- [ ] DeepSeek 실제 사용 위치·연결 및 유료 STT의 능력/자료·과금 단위 확인
- [ ] 승인 범위의 운영 설정·청구 대조 및 배포 검증

실행 미관측 상태를 적용 완료라고 표시하지 않는다. 과거 scope 공유 기록을 기능별로 나눠 두 번 합산하지 않는다. `durationMs`는 응답 지연으로 음성 길이가 아니다. 기존 금액을 재계산하거나 서비스 귀속을 추정하지 않는다.

## 4. 검증·인계 결과

이번 branch의 구현은 조회 기반 1단계다. 실제 모델/중지 설정 API를 새로 제공하거나 호출 경로를 이관한 것이 아니다. 기존 Gemini 질의 설정은 원래 경로에서 유지하며 새 목록에는 모델 결정 방식과 영향 범위를 표시한다.

| 검증 | 결과·범위 |
| --- | --- |
| API Jest | 최초 2 suites / 28 tests PASS. 통합 리뷰 보완 후 결과는 아래 기록 참조. 주입된 DB fixture와 HTTP router로 권한 gate·읽기 전용·민감정보 미반환·불명/오류·기간·정확한 소수 비용 합산 검증 |
| 관리자 Vitest | 2 files / 17 tests PASS. 이름/영역 선택·상세·공유 정책·오류/재조회·부분 비용·이전 응답 무시·기존 이메일 회귀 포함 |
| Chromium 브라우저 | 데스크톱 1280×800, 모바일 390×844의 실제 관리자 앱 + 차단된 fixture API로 최종 12 tests PASS. UI 동작·재조회·공통 설정 이동/저장 회귀·서비스 역할 거부·비로그인 이동 검증 |
| 타입·build | API/관리자 의존 패키지 build, 양쪽 type-check, API build, 관리자 Vite build PASS |
| 정적 검증 | 변경 구현 파일 ESLint 오류/경고 0, 문서 민감정보 검사 PASS, diff 공백·문서 참조·scope 검사 수행 |

초기 UI 테스트의 분리된 텍스트 matcher를 보완했다. 브라우저 최초 실행의 이메일 로딩 지연은 단일 worker 재검증으로 해소했고, 기존 로그인 제목 기대값은 실제 `관리자 로그인`에 맞게 갱신했다. 마지막 전체 브라우저 실행은 12/12 PASS다. 테스트 assertion·권한 검사를 제거하지 않았다.

실제 Google 로그인·운영 DB/정책값·공급자 인증·실사용/청구 대조는 미실시다. API 테스트 DB는 mock이며 실제 PostgreSQL schema 대조나 migration 검증을 했다고 주장하지 않는다. 브라우저 외부 API는 fixture로 차단했으며 운영 credential·유료 AI를 사용하지 않았다. API 또는 web 개발 서버를 계속 실행해야 하는 환경 변경도 추가하지 않았다.

후속은 §3의 쓰기/실제 호출 제어 이관이다. 본 branch는 push에서 인계하고 PR/CI·병합·배포는 통합 담당이 진행한다. PR 미생성으로 PR CI는 미실행이며 현재 운영에는 미적용이다.

문서 정합: 정본 §12에 조회 기반과 미구현 제어의 경계를 반영했다. 기존 로그인 테스트 제목 1건을 현재 UI와 맞췄고 조사표의 소스 주석 차이 3건은 이번 범위에서 수정하지 않았다.

[design]: https://github.com/Renagang21/o4o-platform/blob/2572abe80a2cfe2927b2e6b7e1a9ae9fa06c8d31/docs/design/DESIGN-O4O-AI-USAGE-CONTROL-V1.md
[inventory]: https://github.com/Renagang21/o4o-platform/blob/84c03f3abc575d117f179cbabe2d687b1a991b14/docs/investigations/IR-O4O-AI-USAGE-CONTROL-INVENTORY-V1.md


## 5. 통합 진행 — 사용자 main 병합·배포 승인 (2026-10-20)

사용자가 개발 종료 후 main 병합과 배포를 지시했다. 최신 main의 추가 변경은 협동조합 배포 증적 문서이며 작업 branch에 병합하고 PR #724를 생성했다. 현재 절은 병합/배포 전 수정 기록이며 운영 완료 증거는 아니다.

- Codex P2: 기존 회계가 provider 사용량 누락을 토큰 0/0·비용 0으로 기록한 경우 NULL 검사만으로는 누락을 감지하지 못했다. 조회 SQL에서 NULL 및 양쪽 0 토큰을 미확인으로 분류하고 비용 미확인에도 반영한다. 원장/한도/실행기의 값은 변경하지 않는다.
- 실제 집계 SQL의 predicate를 in-memory SQLite에서 실행하는 4건의 회귀 검증을 추가했다. PostgreSQL text cast/bind만 테스트 adapter에서 변환하며, 실제 PostgreSQL 검증을 했다는 뜻은 아니다. 0토큰/누락/일부 누락과 명시적으로 계측된 0원, 기간 경계·공유 정책 중복 방지를 구분한다.
- 최초 PR CI의 API shard 3에서 기존 권한 소스 검사가 부모 subrouter의 `use` 선언을 핸들러로 세지 않아 실패했다. 경로가 있는 `use`까지 포함하고 각 선언의 guard를 검사하도록 보완했다. 관리자 권한 자체는 완화하지 않았다.
- 개별 job 로그는 환경의 대상 호스트 제한으로 읽지 못했으나, 공식 전체 run 로그 ZIP으로 원인을 확인했다. 네트워크 정책·credential·workflow를 변경하지 않았다.

수정 후 focused tests 4 suites / 48 tests와 API 타입 검사 PASS. 재실행 CI/리뷰를 확인한 뒤 병합한다. 신규 schema/migration은 없으며 현재 runtime 판정은 API·admin LEVEL 2다.

## 6. 1단계 main 통합·운영 반영 결과 (2026-10-20)

- [PR #724](https://github.com/Renagang21/o4o-platform/pull/724) 병합: `653178d0b884d545f60d472311436ea7a8f3e727`, 2026-10-20 13:42:23 Asia/Seoul. 최신 개발 HEAD의 CI Gate·CodeQL PASS, Codex 재리뷰 findings 없음 및 미해결 스레드 0 확인 후 정상 병합했다.
- 병합 SHA의 [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/39370985041)·[CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/39370985103) PASS. [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/39371832247)는 API → admin 순서로 성공했으며 다른 웹 서비스는 NO_DEPLOY다.
- API `o4o-core-api-04098-sit`, 관리자 `o4o-admin-dashboard-01520-mac`: 둘 다 병합 SHA를 단일 리비전 트래픽 100%로 제공한다. 배포 보고서의 production 상태는 DEPLOYED다.
- 운영 health/readiness 200, 두 조회 API의 비로그인 요청 401, 기존/신규 설정 HTML 및 실제 Settings asset 200을 확인했다. 새 자산의 AI 운영 관리·사용량/비용 표시와 API 연결 경로를 확인했다. 실제 Google 관리자 로그인 후 데이터 조회는 미검증이다.
- 신규 migration·정책 쓰기·유료 AI 호출은 추가하지 않았다. 기존 배포 migration Job은 성공했으나 DB 직접 조회나 pending migration 적용 건수 확인은 수행하지 않았다. DB 무변경을 별도로 입증한 결과로 해석하지 않는다.

전체 AI 관리 개발 완료가 아니라 **조회 기반 1단계의 배포 완료**다. 세부 증거·검증 한계는 [배포 CHECK](../checks/CHECK-O4O-ADMIN-AI-USAGE-MANAGEMENT-DEPLOYMENT-V1.md)에 기록한다. 같은 WO의 배포 기록 후속으로 기존 전용 branch를 유지하며 runtime 변경 없이 문서만 보완한다.
