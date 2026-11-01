# CHECK-O4O-COMMUNITY-SIGNAGE-AI-REGISTRATION-V1

- 작성일: 2026-11-01
- 상태: LOCAL_VALIDATED — 사용자 지시에 따른 PUSH_ONLY
- 기준 main: `948855d408`
- 범위: [TODO](../work-orders/TODO-O4O-COMMUNITY-SIGNAGE-AI-REGISTRATION-V1.md)

## 구현 결과

내 매장 통합 AI에서 영상 등록 정보 준비와 실제 저장을 연결하고, 커뮤니티 디지털사이니지에 같은 등록 흐름을 사용한다. AI는 등록 제목·설명·태그만 보완한다. URL·서비스·조직·소유권은 서버 검증 대상이다. 저장 실패 시 준비 결과와 요청 번호를 보존해 같은 요청을 재시도한다.

커뮤니티의 공유 URL 목록·영상 미리보기·명시적 내 매장 가져오기를 연결했다. 기존 Frozen asset-copy-core의 독립 사본을 사용하며 의도적인 새 사본은 허용한다. 같은 가져오기 요청의 재시도만 주변 transaction adapter에서 멱등 처리한다. 원본 변경이 가져온 사본을 자동 교체하지 않는다.

지정 채널의 Google OAuth/PKCE 연결 화면, 암호화 보관, 공식 resumable upload, 서버 순차 큐, 처리·공유·임베드 가능 상태 확인, 실제 목록 저장 후 기존 알림을 구현했다. 기존 automation_jobs VIDEO·Settings·Media Library·notifications를 재사용한다. Cloud Tasks 인증 전달과 PostgreSQL 채널 잠금을 함께 사용한다. 브라우저를 닫거나 Cloud Run이 scale-to-zero 되어도 서버 전달을 사용할 수 있는 구조다. 운영 연결이 없으면 이용 불가/연결 대기를 표시한다.

접수·전송·YouTube 처리·목록 완료를 구분하고 임의 진행률을 만들지 않는다. 같은 요청·응답 유실은 기존 작업과 세션을 재사용한다. 불확실한 결과는 확인 대기에 두며 새 업로드를 시작하지 않는다. 시작 전 취소, 실패 재시도, 관리자 채널 재연결·기존 영상 확인 연결을 제공한다. 활성 시스템 작업은 기존 VIDEO 수동 완료 기능으로 덮어쓰지 못한다.

## 검증 증거

| 검증 | 결과 |
|---|---|
| 패키지/API 의존 빌드 | build:packages, build:api-deps PASS |
| API 타입 | tsc --noEmit PASS |
| Store 전체 | 92 suites / 935 tests PASS |
| API 주변 집중 회귀 | 8 suites / 49 tests PASS, 선택적 별도 환경 11 SKIP |
| 격리 PostgreSQL | 5 tests PASS: 동시 중복 12건, 입력 충돌 rollback, 계정·조직 분리, 가져오기 단일 사본, 채널 잠금·두 요청 순차 완료·알림 1회·취소/권한/취소 후 재시도 차단 |
| 관리자 UI | 2 tests PASS: 연결 상태 및 StrictMode OAuth callback 1회 처리 |
| Chromium | 1365px/390px PASS: 통합 AI 실제 저장, 응답 유실 재시도, 비동기 접수/완료 구분, 커뮤니티 목록 저장과 기존 인증 handoff |

Community/web-neture 전체 177 suites / 1496 tests PASS. Store·web-neture·Admin·Pharmacy production build PASS. 변경 파일 ESLint 오류 0(기존 미사용 경고 9건), 문서 민감정보 및 diff whitespace 가드 PASS. 브라우저 fixture는 `node scripts/checks/community-signage-registration.browser.mjs`로 실행했다. PostgreSQL은 전용 일회용 로컬 컨테이너만 사용하고 종료 후 제거했다. Provider·인증·알림은 합성 fixture다. 실사용자·실제 채널·운영 DB에는 테스트 데이터를 만들지 않았다.

## 공통 소비처 영향

| 소비처 | 영향 및 검증 |
|---|---|
| Store | 통합 AI action 연결, 공통 영상 등록, 가져오기, 기존 개인 알림 UI. 전체 테스트·build·PC/모바일 fixture |
| Community / web-neture | 디지털사이니지 route/menu/목록·공통 AI 등록·기존 Store handoff. 전체 테스트·build·PC/모바일 fixture |
| Pharmacy 업무 앱 | 공통 store-ui-core/media picker export 소비. 기존 선택 계약 유지, production build |
| Admin | 기존 Settings에 채널 연결 화면 추가, 기존 API/권한 재사용. focused tests·production build |
| API | 기존 signage/asset-copy 주변 adapter 및 YouTube extension. 타입·focused tests·실제 PG |
| 기존 MediaPicker 호출부 | image 기본값·선택/업로드 계약 유지. video 진행 상태 문구만 보완 |
| 공통 Core / auth / ledger | 새 원장·Core 없음. Frozen source 수정 없음. schema/migration/dependency 변경 없음 |

## 미실행 / 후속 운영 확인

- [운영 가이드](../guides/O4O-YOUTUBE-CHANNEL-UPLOAD-OPERATIONS-V1.md)에 따른 실제 Google OAuth 동의·Cloud Tasks/IAM/secret 연결은 수행하지 않았다. 채널 주소만으로 Google 권한이 부여되지 않는다.
- 실제 영상 전송·공개/퍼가기·Google app 승인 상태·실제 서비스 알림까지 end-to-end 확인은 운영 연결 후 필요하다. fixture PASS는 실제 업로드 성공 증거가 아니다.
- Media Library의 기존 MP4/WebM 30MiB 제한은 유지한다. 큰 영상은 기존 수동 YouTube 업로드 경로로 등록한다.
- 약국 TV·태블릿 장시간 현장 재생은 이후 현장 점검 대상이다. 재생 중 목록 자동 교체는 추가하지 않는다.
- 커뮤니티 Hero 아래 범용 AI는 별도 후속 작업이다.
- 사용자 최종 지시에 따라 commit/push까지만 수행한다. PR 생성·PR CI/Codex 리뷰·병합·배포는 이번 종료 범위에 포함하지 않는다. 병합 준비 완료나 운영 적용 완료로 보고하지 않는다.

## 문서 정합

콘텐츠 제작 원칙의 과거 Studio 인계 설명을 당시 범위로 명시하고 현재 자동 업로드 결정·업로드 상태·서비스 공유 기준과 역할 업무공간 문서를 보정했다. 과거 WO/CHECK는 당시 증거로 보존했다. canonical index는 변경하지 않았다.

## Git 종료 범위

push 직전 fetch 결과 origin/main은 `fd2b7aa39f`로 이동했으며 추가 4 commits는 별도 Drugstore 문서 3개다. 이 작업 경로와 중복이 없어 자동 merge/rebase하지 않고 시작 기준을 유지했다. 사용자 지정 종료점은 작업 branch `wo/community-signage-ai-registration`의 commit/push이며 PR 생성·CI/리뷰 추적·main 변경·배포는 수행하지 않는다. 후속 수정에 사용할 worktree/branch는 보존한다.

## 추가 통합 요청 및 리뷰 보완 (2026-11-01)

사용자의 추가 main 병합·배포 지시로 기존 push-only 종료점 이후 PR #918을 생성했다. 최신 main `8e17ba0b8b`의 커뮤니티 개선 요청 route·화면·홈 섹션을 사이니지와 함께 보존했다. 통합 후 커뮤니티 21 tests·API 타입·production build·1365px/390px fixture PASS.

초기 Codex P1은 완료 이력이 있을 때 `onCompleted`가 매 조회 호출되고 커뮤니티 재조회가 등록 컴포넌트를 재마운트하는 반복이었다. 첫 상태 조회는 기존 이력으로 취급하고 이후 새 완료 ID만 한 번 알린다. 목록 갱신 중 등록 컴포넌트를 유지하며 계정 변경 때는 별도 session key로 초기화한다. 실제 Page와 10ms 지연 응답으로 기존 완료 이력·신규 완료·동일 이력 재조회·초안 보존을 검증했다. 보완 집중 회귀 13 tests·PC/모바일 fixture PASS. 실제 채널 연동 미실행 상태와 현장 점검 항목은 유지한다.

추가 CI에서 API shard 2의 `signage-media-library-route-order` 10 cases가 실패했다. 기존 controller mock에 새 `registerVideo`/`enqueueYoutube` handler가 없어 Express router 생성이 실패한 것이 원인이다. mock을 현재 controller 계약으로 보정하고 새 POST의 미인증 차단 2 cases를 추가했다. 해당 suite 14 tests PASS. runtime guard나 기존 library 순서 계약은 완화하지 않았다. 직접 job 로그 저장소는 환경 정책으로 차단됐으나 공식 run 로그 아카이브에서 원인을 확인했으며 환경 설정은 변경하지 않았다.
