# Lecture 전문 강의 작성·학습 안내

> **상태**: ACTIVE
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-25
> **근거 WO/IR**: [WO-O4O-LECTURE-PROFESSIONAL-LEARNING-IMPROVEMENTS-V1](../work-orders/WO-O4O-LECTURE-PROFESSIONAL-LEARNING-IMPROVEMENTS-V1.md)

## 범위

독립 서비스 `lecture`(`services/web-lecture`)의 전문 강의 탐색·작성·학습 기능 안내다. 이전 KPA·K-Cosmetics 화면은 개선 기준이 아니다. 공통 LMS 엔진·기존 인증·active membership·승인·콘텐츠 접근 검사를 재사용한다. 전문 강의 수료는 공인 자격이나 법정 보수교육 이수의 인정과 구분한다.

## 강의 탐색과 목차

`/`는 `/courses`로 연결된다. 비로그인·미가입 안내는 목록 위에 표시되며 목록·로딩·오류·빈 결과를 가리지 않는다. 검색과 페이지 이동을 제공한다.

강의 상세와 목차는 서로 독립적으로 조회된다. `GET /api/v1/lms/courses/:id?includeCurriculum=true`는 **기존 강의 조회의 service·게시 상태·visibility·membership 판정 이후** 발행된 레슨의 `id`, `title`, `type`, `order`, `duration`만 `data.curriculum`에 제공한다(최대 1,000개). 본문·영상 URL·첨부·정답·미리보기 flag는 포함하지 않는다. 회원 전용 강의를 익명에게 공개하는 API가 아니다. 일반 강의 조회는 목차 조회에 의존하지 않는다.

공통 UI의 optional `getCurriculum` port가 없으면 기존 `getLessons` port를 쓴다. 목차 조회 거부·일시적 실패·빈 결과를 구분하며 실패 시 다시 조회한다. 수강 정보 조회 실패를 미수강으로 취급해 새 신청을 유도하지 않는다. 서버가 명시한 미가입·비활성 membership의 403은 이용 자격 안내·문의 링크를 표시하며, 다른 403·일시적 장애와 구분한다. 승인 대기·반려 등록은 목차의 학습 링크를 열지 않는다. 레슨·본문 API의 기존 guard는 유지된다.

## 전문 강의 작성과 검토

강의 편집의 전문 강의 안내에 학습 대상, 수강 성과, 선수 지식, 강사 소개·전문 분야, 자료 최종 검토일을 입력한다. 기존 `Course.metadata.professionalInfo`를 사용하며 schema 변경은 없다. 실제 확인한 검토일을 입력하고 자동으로 오늘 날짜를 붙이지 않는다.

입력 정보는 학습자 상세와 운영자 검토 화면에 표시된다. 기존 강의 metadata의 다른 키는 서버의 부분 병합으로 보존된다. 게시된 강의 수정의 재검토 전환과 운영자의 검토·반려·승인 절차는 그대로다. 강사 신청에서는 별도로 소개(선택, 최대 3,000자)와 전문 분야(선택, 최대 1,000자)를 입력할 수 있다. `POST /lms/instructor/apply`의 optional bio/expertise를 서버에서 문자열·길이·NUL 검사와 trim 후 저장한다. 과거 신청·기존 클라이언트의 미입력은 null로 유지한다. 신청자와 pending 상태는 서버가 확정하며 승인 상태·reviewedBy·rejectionReason은 신청 payload로 설정할 수 없다.

이 소개는 운영자의 `/operator/instructors` 검토 화면에 일반 텍스트로 표시되며 강의 professionalInfo나 공개 프로필에 자동 게시되지 않는다. 계정 전환 시 입력 초안을 초기화한다. 저장·전송 실패 시 같은 계정의 입력은 유지하며 기존 약관 동의·중복 신청·운영자 승인 절차를 그대로 따른다. 새 필드를 쓰려면 `AddLectureInstructorProfile1792886400001` incremental migration이 먼저 적용돼야 한다. 개발 브랜치의 구현이며 운영 적용은 별도 통합·배포 절차를 따른다.

## 영상·자료

강사 편집기는 HTTPS MP4·WebM·Ogg의 직접 파일 주소를 받는다. URL query가 있는 서명 주소도 가능하다. YouTube·Vimeo 페이지 주소·iframe은 지원하지 않는다. 브라우저 지원 코덱, 주소 만료, CORS·자료 제공자의 접근 권한은 별도로 확인한다. 기존 영상이 재생되지 않으면 플레이어에서 오류와 다시 불러오기 버튼을 제공한다.

기존 `Lesson.attachments`의 자료 이름·HTTPS 주소를 강사가 연결한다(최대 20개). 학습자는 보호된 레슨 응답에 포함된 자료 링크를 새 창으로 열 수 있다. 공개 목차에는 자료 링크를 넣지 않는다. 외부 URL 자체를 보호하거나 파일을 업로드하는 새 시스템은 제공하지 않는다. 실행 가능한 URL scheme은 학습 링크로 렌더하지 않는다.

사용자가 비로그인 미리보기를 승인했다. 영상 차시 편집에서 “미리보기 공개 (비로그인 포함)”를 선택하면 기존 `isFree` 필드로 저장한다. 강의가 `lecture`·`published`·`public`이고 차시가 `video`·발행·`isFree=true`일 때만 아래 전용 공개 경로에서 제공한다. draft·회원 전용·종료·타 서비스·다른 강의의 차시는 공개하지 않는다.

- 목록: `GET /api/v1/lms/courses/:courseId/previews` — id·제목·학습 시간만 제공
- 영상: `GET /api/v1/lms/courses/:courseId/previews/:lessonId` — id·제목·학습 시간·안전한 HTTPS 영상 URL만 제공
- 화면: 강의 상세의 무료 미리보기 링크 → `/courses/:courseId/preview/:lessonId`

기존 공개 목차 whitelist와 보호 lesson API는 변경하지 않는다. 미리보기 응답에 본문·교재·metadata·퀴즈·자막 URL·진도는 포함하지 않는다. 시청은 enrollment·bookmark·progress·수료를 생성하거나 갱신하지 않는다. 발행 취소·미리보기 해제 후 새 요청은 차단되지만 이미 공개된 외부 파일 URL을 회수하는 기능은 아니다. 제공자 측 미디어 공개·접근 정책을 확인한 자료만 지정한다.

## 이어보기와 수료 판정

`GET /api/v1/lms/enrollments/:courseId/playback`은 본인의 최근 위치를, `lessonId` query가 있으면 해당 레슨 위치를 반환한다. `POST`는 `{ lessonId, positionSeconds }`를 저장한다. 기존 인증·Lecture active learner guard와 course scope를 통과해야 하며 승인·학습 중·수료 등록에만 허용한다. 다른 강의·초안·영상 아닌 레슨에는 저장하지 않는다. 위치는 유한한 0~604,800초만 허용한다.

저장 위치는 기존 `Progress.metadata.playback`의 bookmark다. upsert는 해당 JSON 키만 갱신하며 완료 상태·완료율·실제 체류 시간·퀴즈 결과를 바꾸지 않는다. 계정·수강·레슨으로 분리된다. 영상을 재생한 뒤 최대 15초 간격, 일시정지·종료·수동 저장 시 저장한다. 저장 요청이 진행 중이면 최신 강제 저장을 대기시킨 뒤 순서대로 처리한다. 네트워크 실패·즉시 창 종료에서는 마지막 구간이 저장되지 않을 수 있다. 저장 실패는 화면에서 확인하고 재시도할 수 있다.

재진입 시 이어보기 버튼으로 위치를 복원한다. 내 강의의 이어서 학습은 최근 미완료 레슨 또는 첫 미완료 레슨으로 이동한다. 위치 복원은 수료 실적이 아니다. 클라이언트 영상 완료 메트릭은 `video.played`의 실제 재생 구간 합을 사용한다. 과거 위치를 복원하거나 끝으로 seek한 사실만으로 시청 시간을 늘리지 않는다. 이 변경은 서버의 기존 임계값·메트릭 미전송 호환 경로를 바꾸지 않는다. 세션을 넘는 실제 시청 구간 합산은 구현하지 않았다.

## 수료증 복구와 문의

운영자의 수료증 화면에서 미발급 수료 건을 학습자 이름·강의 제목으로 조회하고 기존 발급 API를 재시도한다. Lecture의 수료 완료 등록 중 어떤 수료증도 없는 최근 100건만 조회한다. 발급 실패는 학습 완료를 되돌리지 않는다. 이미 발급·폐기된 수료증은 재발급 대기 목록에 넣지 않는다. 본인 수료증 read 경계를 넓히지 않는다.

레슨의 문의 링크는 기존 문의 화면으로 강의·레슨 ID를 전달한다. 화면에 전달 대상을 알리고 접수 본문에 함께 넣는다. 문의는 서비스 운영자에게 전달되며 새 강사 채팅·커뮤니티를 만들지 않는다. 자막 연결은 아래 WebVTT 안내를 따른다. 실제 운영 자막 자료의 제공·전송 검증은 별도다.

## 개발 검증

도구·설치 기준은 [SETUP.md](../../SETUP.md)를 따른다. 공통 패키지를 먼저 빌드한 뒤 저장소 루트에서 실행한다.

```bash
pnpm run build:packages
pnpm exec vitest run --config services/web-lecture/vitest.config.mjs --maxWorkers=2
pnpm --filter @o4o/lms-ui type-check
pnpm --filter lecture-web build
pnpm --filter @o4o/api-server type-check
```

API 회귀 spec과 실제 검증 범위는 [CHECK](../checks/CHECK-O4O-LECTURE-PROFESSIONAL-LEARNING-IMPROVEMENTS-V1.md)를 참고한다. 합성·메모리 fixture의 통과를 실제 계정·운영 DB·배포 완료로 해석하지 않는다.

## WebVTT 자막 연결

영상 레슨 편집기의 자막에서 HTTPS `.vtt` 주소, 언어 코드(예: `ko`, `en-US`), 표시 이름을 입력한다(최대 8개, 이름 80자). 직접 업로드·자동 자막 생성은 제공하지 않는다. `Lesson.metadata.captions`에 저장하며 다른 metadata 키를 보존한다. 자막 삭제는 빈 배열로 저장한다. 공개 목차에는 자막 주소를 넣지 않으며 본문·영상과 같은 기존 수강 권한으로 조회한다.

학습 플레이어의 자막 버튼에서 언어를 선택한다. 자막이 있는 영상은 `crossOrigin=anonymous`로 로드하므로 **영상과 자막 모두** 브라우저의 CORS·HTTPS 접근을 허용해야 한다. 자막 없는 기존 영상의 CORS 동작은 바꾸지 않는다. 외부 파일 자체의 접근 통제는 자료 제공자 책임이며, 비공개 자막에 영구 공개 URL을 사용하지 않는다. 잘못된 주소·언어·이름은 편집 저장을 막고, 비정상 legacy track은 학습 화면에 연결하지 않는다. 로딩 오류는 안내하며 영상 재생·수료 판정을 변경하지 않는다.

실제 로그인과 격리 DB 검증은 [로컬 검증 안내](LECTURE-LOCAL-VALIDATION.md), 전체 미완료 조건은 [잔여 TODO](../work-orders/WO-O4O-LECTURE-REMAINING-WORK-FOLLOWTHROUGH-V1.md)를 따른다.
