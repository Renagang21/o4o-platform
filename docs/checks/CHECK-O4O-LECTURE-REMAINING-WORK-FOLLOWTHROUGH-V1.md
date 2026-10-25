# Lecture 잔여 작업 보완 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **근거 WO/IR**: [잔여 TODO](../work-orders/WO-O4O-LECTURE-REMAINING-WORK-FOLLOWTHROUGH-V1.md)

## 변경과 범위

기준 main `b88031578952e727702c83c027cc848053408f89`에서 `wo/lecture-remaining-work-followthrough`를 만들었다. 기존 기준 checkout은 수정하지 않았다. TODO·로컬 검증 안내·읽기 전용 SQL·합성/PG 실행 runner를 Git 추적 파일로 남겨 로컬 인계를 반복 가능하게 했다. 영상 레슨의 기존 metadata에 WebVTT 자막을 연결해 강사 편집→학습자 보호 player까지 전달한다. 신규 schema·migration·dependency·lockfile·권한·공개 API 변경은 없다. PR·병합·배포·운영 DB 변경은 실행하지 않는다.

## Shared Module Change Verification

### Changed shared module

`@o4o/lms-ui`에 optional `LmsLessonData.captions`와 검증된 track projection을 추가했다. 자막이 없는 기존 player는 track 및 crossorigin 속성을 추가하지 않는다. 자막이 있을 때만 anonymous CORS를 사용한다. 소비 서비스가 제공한 보호 lesson 응답 이후에만 연결하며, 익명 curriculum projection whitelist는 그대로다.

### Consumer impact matrix

| 소비처 | 사용 | 영향·권한 | 검증 | 결과 |
|---|---|---|---|---|
| Lecture 학습자 | 직접 | 보호 player의 optional 자막, 기존 수강·진도 경계 유지 | Vitest·타입·빌드·390/1440 브라우저 | 합성 통과 |
| Lecture 강사 | 직접 | 기존 lesson metadata의 captions만 편집, 다른 키 보존 | 편집 회귀·타입·빌드·브라우저 | 통과 |
| 자막 미제공 optional 계약 | 공통 | 기존 영상 CORS 동작 유지 | crossorigin 미추가 회귀 | 통과 |
| Neture/admin/store/KPA 및 다른 서비스 | 현재 source import census에서 해당 shared view 직접 사용 없음 | route/menu/guard 변경 없음 | `@o4o/lms-ui` import census | 직접 영향 없음 |

### Route / role / capability check

신규 route·메뉴·권한 없음. backend 변경 없음. `isFree`·승인 대기/반려 수강의 보호 본문 경계를 변경하지 않았다. 공개 목차에 영상·자막 URL을 추가하지 않았다. JS URL·credential URL·비-WebVTT·잘못된 언어/이름은 학습 track에서 제외한다. 외부 파일 자체를 프록시하거나 접근 권한을 부여하지 않는다.

## 실행 결과

| 검사 | 결과 | 한계 |
|---|---|---|
| frozen install·build:packages | 통과 | 기존 pnpm store 사용, Node 22.18.0·pnpm 10.25.0 |
| Lecture Vitest | 76/76, 18 files | 신규 자막 4건 포함. 기존 합성 계정 fixture duplicate-key 경고 있음 |
| 선택 API Jest | 32/32, 4 suites | 갱신 달력·자동 발급 연결·공개 목차·playback 경계. PG 및 실제 로그인 아님 |
| lms-ui type-check·lecture-web build | 통과 | 프런트의 기존 bundle 크기·Browserslist 경고 |
| 변경 TS ESLint | 통과 | 실행 로그 기준 오류 없음 |
| Chromium WebM/WebVTT 합성 | 390·1440px 통과 | ffmpeg 일회 파일과 route fixture. 실제 cue load·이름 편집·삭제·overflow/pageerror 확인. 운영 자료 전송 아님 |
| 읽기 전용 preview SQL | PGlite fixture 통과 | completed Lecture null 연결만 집계, 기존 링크·타 서비스·미완료 제외. 운영/PG15 아님 |
| runner 입력 경계 | 통과 | 잘못된 포트·5432·5442를 실행 전 거부. 포트가 달라도 독립 cluster 확인은 실행자 의무 |

처음 자막 오류 회귀는 track의 React onError로 오류가 전달되지 않아 실패했다. native track error handler로 수정 후 전체 검사를 재실행했다. 브라우저 fixture의 초기 CSS 경로 오류도 실제 경로로 수정하고 최종 합성 검사를 재실행했다. 실패 검사를 생략하거나 assertion을 제거하지 않았다.

## 미실행·남은 결정

- 공유 로그인 브라우저·Lecture 계정 파일이 현재/기준 checkout에 없어 실계정 전체 흐름은 BLOCKED다. PG15 전체 통합, 운영 자막 자료, 실제 운영 로그인·발급은 실행하지 않았다.
- Windows 잔여 worktree는 이 환경에서 접근할 수 없어 정리 결과 미확인이다.
- 강사 신청 소개·전문 분야는 DB 저장 필드가 없다. 후속 설계는 nullable bio/expertise 추가·길이 검증·신청 payload/운영자 projection·기존 승인 절차 유지·기존 신청 null 호환을 포함해야 한다. migration/API 범위를 확정하기 전 공통 엔티티를 임의 변경하거나 승인 메모에 신청자 소개를 우회 저장하지 않는다.
- 미리보기는 공개 대상(익명 또는 활성 회원)을 사용자에게 질문했으며 아직 미확정이다. 기존 isFree를 공개 허가로 해석하지 않는다.
- 과거 운영 census 대상 0건은 사용자 보고를 인용한 것이며 이번에 재조회/보정한 결과가 아니다. 업무 데이터 생성·잔존 없음.

문서 정합: 사용 안내의 자막 보류 설명을 현재 구현과 한계로 갱신했다. 기존 canonical의 서비스·프런트 서술은 현행 Lecture와 다른 부분이 있어 이번 계약의 단독 근거로 쓰지 않았으며 과거 본문은 변경하지 않았다. canonical index 변경 없음.

## Push 전 main 위치

검증 도중 origin/main이 `8de024e92c`로 이동했다(기준 대비 9 commits). 변경 경로를 대조해 이번 수정 파일과 직접 겹침은 없었다. 이번 역할은 push까지이므로 다른 작업을 자동 병합하지 않았다. 통합 담당은 최신 main과 CI를 다시 확인한다.

## 후속 결정 반영 — 비로그인 미리보기

사용자가 비로그인 공개를 선택해 같은 branch에 후속 구현했다. 기존 isFree를 강사 편집기의 명시적 미리보기 설정에 연결하고, 기존 보호 lesson 경로와 분리한 공개 목록·단일 영상 endpoint 및 공개 화면을 추가했다. 서버는 단일 JOIN read에서 lecture/published/public 및 차시 발행/video/isFree를 모두 요구한다. 목록은 id/title/duration, 영상은 여기에 안전한 HTTPS videoUrl만 제공한다. 본문·교재·metadata·자막·정답·진도는 공개하지 않는다. 미리보기는 수강/북마크/진도/수료 write를 호출하지 않는다. 보호 route의 requireAuth/requireEnrollment는 그대로다. 공통 view 계약을 더 변경하지 않고 Lecture wrapper에 목록 링크를 추가했다.

검증: Lecture Vitest 79/79(19 files), 공개 미리보기/목차/rate-limit/접근 계약 API Jest 45/45(4 suites), api-server type-check·lecture-web build·변경 파일 ESLint 통과. 실제 서비스 SQL을 격리 PGlite에 적용해 공개 1건·비공개/초안/종료/타 서비스/차시 미발행/미리보기 미지정/퀴즈 거부 및 교차 강의 거부 총 9사례를 확인했다. PG15·운영 DB 검증이 아니다. Chromium 390/1440에서 합성 영상 재생·목록 503 재시도·링크 진입·직접 URL·소개 복귀·보호 API/쓰기 호출 없음·pageerror/overflow 없음을 확인했다.

첫 Vitest 실패는 테스트 beforeEach가 mock 함수를 반환해 종료 hook으로 실행된 fixture 오류였고, void hook으로 바꿔 재실행했다. 타입 검사에서 새 controller의 BaseController 상속과 프런트 응답 타입 누락을 수정하고 검사·빌드를 재실행했다. 이전의 미리보기 결정 대기는 이 사용자 답변으로 해소됐다. 실계정·운영 자료·강사 신청 schema·Windows 정리는 계속 미완료다.

## 잔여 개발 전체 보완 — 강사 신청 정보와 PostgreSQL 15 검증

사용자의 “남은 부분도 진행, 작업을 작게 나누지 말라” 지시에 따라 T07 저장 필드·migration·API·신청 화면·운영자 검토·검증을 같은 branch에 포함했다. 이번 지시는 개발·격리 검증·push 범위이며 운영 migration 적용은 수행하지 않는다.

- `InstructorApplication.bio/expertise` nullable varchar(3000/1000)와 `AddLectureInstructorProfile1792886400000`를 incremental manifest에 추가했다. baseline·과거 migration은 변경하지 않는다. 과거 null 신청을 유지하고 데이터 backfill·승인·역할 변경을 하지 않는다.
- 서버는 optional plain text의 타입·trim·길이·NUL을 검사한다. 요청의 userId/status/reviewedBy로 신청자를 바꾸거나 승인을 우회하지 못한다. 오류는 transaction·약관 기록 전에 거부한다. 입력 생략의 기존 API 호출도 유지한다.
- 신청 화면에서 소개·전문 분야를 입력하고 실패 시 보존한다. 계정 변경은 keyed form으로 초안을 초기화한다. 운영자 목록은 검토용 일반 텍스트로 표시하며 HTML을 실행하지 않는다. 공개 강사 프로필·강의 professionalInfo에 자동 복사하지 않는다.
- DB rollback은 non-null 신청자 데이터가 있으면 거부한다. 스키마 rollback으로 내용을 삭제하지 않고 기존 API 코드와 nullable 컬럼을 유지하는 경로를 사용한다.

### Shared Module 추가 영향

| 소비처 | 영향 | 검증 |
|---|---|---|
| `@o4o/lms-core` InstructorApplication | 선택 필드 추가, 기존 관계·이벤트·역할 계약 불변 | 패키지 build, API type-check, broad LMS 회귀 |
| InstructorController apply/operator applications | 기존 인증·약관·중복·운영자 guard 유지, optional 값 저장/조회 | 실제 controller+격리 ports 5건, normalize 9건 |
| InstructorPublicController | 응답 whitelist에 신청 소개 없음, 코드 변경 없음 | source census; 이 경로를 새 공개 API로 등록하지 않음 |
| learner application/operator UI | 입력·일반 텍스트 검토·계정 분리 | Vitest 및 390/1440px 합성 브라우저 |
| migration runner/classifier | append-only manifest와 신규 expected state 등록 | 기존 모든 prefix 및 empty down/up, migration contract |

### 최종 실행 결과

| 검사 | 결과 | 범위·정리 |
|---|---|---|
| lms-core build·API type-check·Lecture build | 통과 | 기존 번들/Browserslist 경고 유지 |
| Lecture Vitest | 83/83, 20 files | 신청 입력·실패 유지·계정 전환·HTML 비실행 추가 |
| 확장 로컬 runner의 선택 API | 254/254, 11 suites | 공개·보호 경계, 신청 controller, 수료 연결·갱신, schema 계약 |
| 넓은 Lecture/LMS API 회귀 | 458/458, 28 suites | PG 선택 spec 7건은 이 실행에서 skip; 아래 별도 실제 DB 실행으로 확인 |
| PostgreSQL 15.18 certificate/profile spec | 7/7 | profile null 호환·저장·DB 길이 제한·보존 rollback 거부 포함; 자체 DB 삭제 |
| PostgreSQL 15.18 operator-inbox fixture | 24/24 | 기존 역할·업무 SQL 회귀, `Fixture cleanup PASS: database count 0` |
| PostgreSQL 15.18 canonical prefixes | 전체 일치 | 신규 fingerprint `dae222617a25e7bcc91b23ec8fe691798d87ffcdb928b3a730d5ff2f24817343`, 6871 lines; empty down/up 통과 |
| migration contract | 21 pass / 0 fail | 실제 산출 state 등록; 검사 기준 완화 없음 |
| Chromium 390/1440px | 통과 | 자막·비로그인 미리보기 및 합성 신청→운영자 검토, pageerror/overflow 없음 |
| 변경 TS ESLint·문서 민감정보 검사 | 통과 | 오류·민감정보 패턴 0 |

PostgreSQL 15.18 바이너리는 테스트용으로 repo 밖에 준비했으며 workspace dependency/lockfile을 바꾸지 않았다. 독립 loopback cluster만 사용했고, 마지막에 검증 DB 잔존 0개·서버 종료를 확인했다. 운영 DB·실계정·외부 알림을 사용하지 않았다. 합성 browser의 auth/약관/API port는 fixture이며 실제 로그인을 수행한 것으로 표시하지 않는다.

발견·보완: 최초 schema 계약 검사가 expected state 누락을 잡아 실제 PG15 prefix 검증으로 산출·등록했다. 기존 foundation test의 “이름에 Lecture가 있는 migration은 0개” 단언은 이번 승인된 schema-only migration을 구분하지 못했다. 정확한 신규 파일 1개와 데이터 INSERT/UPDATE/DELETE 없음·reference seed CLI 유지를 함께 검사하도록 보완하고 전체 회귀를 재실행했다. 브라우저 auth fixture 초기 연결 오류는 fixture module 우선순위를 수정해 두 화면 크기를 다시 검사했다. 잘못 지정된 넓은 testPathPattern의 범위 밖 테스트 실행은 완료 근거로 쓰지 않았으며 `/src/__tests__/`에 한정한 위 회귀를 기준으로 한다.

### 최종 미완료 조건

구현 TODO T04~T08과 재현 가능한 검사 도구는 완료다. T02는 Windows PC 접근·세션 소유자 확인이 필요하고, T03은 실제 로그인용 계정·사용자 공유 브라우저가 없으며, T09는 실제 운영 미디어 자료가 제공되지 않아 미완료다. 이전 “PG15 미설치” 제한은 이번 임시 cluster 준비로 해소됐다. 운영 migration 적용·PR·병합·배포는 이번 push 범위에서 실행하지 않는다.

문서 정합: 강사 신청 보류 설명을 구현·배포 전제와 구분해 갱신했고 TODO·로컬 검증 안내를 함께 보완했다. canonical index·과거 기록물 일괄 수정 없음.
