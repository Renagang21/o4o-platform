# Lecture 전문 강의 학습 개선 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-22
> **근거 WO/IR**: [WO-O4O-LECTURE-PROFESSIONAL-LEARNING-IMPROVEMENTS-V1](../work-orders/WO-O4O-LECTURE-PROFESSIONAL-LEARNING-IMPROVEMENTS-V1.md)

## 결과와 범위

독립 Lecture의 공개 목록·목차, 전문 강의 정보, 영상 bookmark, 기존 교재, 수료증 미발급 복구, 강의 맥락 문의를 보완했다. [현재 사용 안내](../guides/LECTURE-PROFESSIONAL-LEARNING.md)에 동작과 한계를 기록했다. TODO별 상태는 WO를 따른다. 강사 신청서 경력 저장, 샘플 영상 공개 확대, 자막은 완료로 표시하지 않는다.

작업 branch: `wo/lecture-professional-learning-improvements`. 기준 main: `b5a5423587e341958302e08f26815d45df2983d5`. 기존 `/workspace/o4o-platform/SETUP.md` 수정은 이 작업에 섞지 않았다. 새 schema·migration·dependency 선언·lockfile 변경은 없다.

## Shared Module Change Verification

### Changed shared module

- `@o4o/lms-ui`: CourseDetailView, LessonPlayerView, optional port 및 계정 초기화 계약, ResumeVideo, LessonResources.
- 직접 runtime 소비처: 현재 checkout에서 `services/web-lecture`만 확인. symbol/import·route·원본 소스 단언 spec을 함께 검색했다. 이전 KPA·K-Cosmetics 화면을 복구하지 않았다.
- `@o4o/lms-client`: 코드 변경 없음. 기존 envelope·HTTP adapter 재사용. Lecture adapter의 주요 read를 구체 타입으로 정리했다.
- backend LMS: 기존 getCourse에 opt-in 소개 projection, 본인 bookmark API, 운영 미발급 조회를 추가했다. 본문·영상·교재 guard는 유지했다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|---|
| Lecture 학습자 | 직접 사용 | 목록·목차·이어보기·자료·상세 모바일 | 기존 auth/membership 유지; 본인 bookmark 추가 | Vitest·타입·빌드·390/1440px 합성 브라우저 | 통과 |
| Lecture 강사 | 직접 사용 | 전문 정보·자료·영상 입력 | 기존 소유권·검토 요청 경로 유지 | 타입·빌드·기존 API 상태/권한 회귀 | 통과; 실제 계정 작성 flow 미실행 |
| Lecture 운영자 | 직접 사용 | 전문 정보 검토·미발급 복구·미사용 홈 제거 | 미발급 조회는 기존 operator guard; 발급은 기존 API | UI 회귀·Jest·SQL fixture | 통과; 실제 계정 발급 미실행 |
| 기존 optional-port 소비 형태 | 호환 계약 | getCurriculum 미제공 시 getLessons 유지 | 추가 권한 없음 | 주입 port fixture | 통과 |
| KPA·K-Cosmetics·Neture·admin·store | 해당 shared view runtime import 없음 | 이번 화면 변경 직접 영향 없음 | 기존 범위 변경 없음 | import/symbol/path census | 미사용 확인; smoke 실행 안 함 |

### Route / role / capability check

- 공개 목록 안내는 공통 gateSlot의 차단 의미를 바꾸지 않고 Lecture wrapper에서 분리했다.
- 소개 projection은 기존 scope·발행·visibility·membership 검사 뒤에만 실행한다. whitelist에 본문·영상 URL·첨부·미리보기 flag가 없다. 일반 course read는 목차 쿼리에 의존하지 않는다.
- 본문·교재 API의 requireAuth/requireEnrollment, 강사 소유권, operator guard를 제거하지 않았다. pending·rejected 등록의 목차 행은 열리지 않는다.
- bookmark는 인증된 본인의 수강으로만 찾는다. 승인·학습 중·수료 상태와 해당 강의의 발행 video 레슨만 저장한다. 요청의 userId/enrollmentId를 사용하지 않는다.
- 수료증 복구 조회는 Lecture의 completed 등록만 읽고 이미 수료증이 있는 조합을 제외한다. 본인 private read 권한을 넓히지 않는다.
- Lecture의 `/operator/home-presentation` 메뉴·route·전용 wrapper와 미사용 HomePage를 제거했다. 다른 서비스의 공통 Hero 기능은 변경하지 않았다.

## 실행한 검증

| 검증 | 결과 | 범위·한계 |
|---|---|---|
| frozen install 및 build:packages | 통과 | Node 22.18.0·pnpm 10.25.0; 새 worktree 자체 설치·산출물 |
| Lecture Vitest | 61/61 통과 (15 files) | 목록·오류 복구·거부·bookmark·계정 전환·자료·전문 정보·수료증·문의·기존 운영 UI |
| API Jest 선택 10 suite | 296/296 통과 | 새 공개 목차·bookmark 경계, 기존 enrollment/certificate 소유권·교차서비스·수료증 체인·rate-limit·Phase2 검토/승인 계약·목록 공통 UI |
| lms-ui type-check | 통과 | 공통 패키지 |
| lecture-web build | 통과 | tsc -b + Vite; 번들 크기·Browserslist 데이터 경고는 남음 |
| api-server type-check·build | 통과 | 새 controller/service 포함; tsc build, tsup 배포 bundle은 별도 |
| 변경 TypeScript ESLint | 0 errors·4 warnings | 기존 route 미사용 변수 2건, account별 재조회 useCallback/useMemo dependency 경고 2건 |
| 공개 화면 합성 Chromium | 390px·1440px 통과 | 목록 503→재시도·키보드 검색·상세·공개 목차·전문 정보·가로 넘침 없음·pageerror 0 |
| 실제 shared player + 합성 port Chromium | 390px·1440px 통과 | 교재 링크·영상 실패 안내·bookmark 복원/저장·계정 전환 기록 분리·가로 넘침 없음; 실제 영상 전송/코덱 검증 아님 |
| 실제 SQL + PGlite 메모리 PostgreSQL | 통과 | baseline Progress DDL 기반; 반복 upsert·별도 수강·완료 상태/시간/다른 metadata 보존; 미발급 조회의 service·검색·기발급 제외 |

브라우저는 별도 합성 컨텍스트와 요청 fixture를 사용했다. 실제 로그인·생성·발급 요청을 외부 서비스에 보내지 않았다. PGlite는 별도 메모리 DB를 생성·종료했으며 운영/개발 DB와 연결하지 않았다. 이는 PostgreSQL 15 위의 전체 API 통합 검증을 대신하지 않는다. 임시 fixture·이미지·로그는 Git에 넣지 않았다.

## 실패 조사와 수정

- 공통 패키지 산출물 생성 전 시작한 타입 검사는 미빌드 모듈로 실패했다. 패키지 빌드 후 재검증했다.
- 새 hook 의존성을 사용하는 기존 테스트의 Router/Auth fixture를 보완했다. 기존 assertion을 비활성화하지 않았다.
- 처음 추가한 목차 결합은 일반 상세에도 쿼리를 수행했다. opt-in query로 바꿔 목차 장애와 기존 상세를 분리하고 회귀 테스트를 추가했다.
- private API와 public API의 실제 권한 검사는 변경하지 않았다. 강사 신청 필드가 DB에 없다는 이유로 migration을 만들지 않았다.

## 외부 비교와 미검증

공식 공개 비교 후보 인프런(`www.inflearn.com`), Coursera Professional Certificates(`www.coursera.org`), 패스트캠퍼스(`fastcampus.co.kr`)는 이 환경에서 모두 proxy CONNECT 403이었다. 외부 기능을 직접 확인한 사실로 인용하지 않는다. 실제 비교를 완료하려면 환경 설정에서 해당 목적지 접근을 확인한 뒤 재조사한다.

실계정 파일은 현재/기준 checkout에 없다. 실제 계정 로그인·실제 강사 작성→심사→수강→수료·운영 영상 재생·운영 PostgreSQL 15 전체 API flow는 미실행이다. 메트릭 미전송을 허용하는 서버 호환 경로는 기존 그대로이며 제거하지 않았다. cross-session 실제 시청 구간 합산·샘플 영상 공개·자막·강사 신청서 소개 저장은 후속 범위다.

## 통합 담당 인계

PR·병합·배포·운영 데이터 변경은 실행하지 않는다. 작업 branch와 최종 SHA는 종료 보고에서 전달한다. 통합 담당은 현재 main과 변경 충돌·required CI·Codex review를 확인하고 별도 권한과 절차에 따라 통합한다. 배포 전 실제 개발용 DB/자료 제공 환경에서 protected media와 PostgreSQL 15 전체 flow를 확인한다. worktree는 후속 수정용으로 보존한다.

문서 정합: 오래된 LMS 기준의 KPA·K-Cosmetics 프런트 설명은 현행 Lecture 구현과 다르며 이번 개선 기준으로 사용하지 않았다. 과거 정본을 일괄 재작성하지 않고 Lecture 사용 안내와 서비스 색인 연결을 추가했다.
