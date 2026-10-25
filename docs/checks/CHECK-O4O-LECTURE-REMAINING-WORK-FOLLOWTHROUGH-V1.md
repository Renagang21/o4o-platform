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
