# Lecture 로컬 검증 실행 안내

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **근거 WO/IR**: [잔여 작업 TODO](../work-orders/WO-O4O-LECTURE-REMAINING-WORK-FOLLOWTHROUGH-V1.md)

## 준비와 자동 검사

최신 main 또는 인계된 검사 SHA에서 AGENTS.md·SETUP.md를 따른다. `pnpm install --frozen-lockfile` 후 `pnpm run build:packages`를 실행한다. 변경 코드가 있는 개발 branch는 검사 SHA를 명시하고 운영 제공 버전과 구분한다.

```bash
node scripts/lecture/verify-isolated.mjs --synthetic-only
# 별도 로컬 임시 PostgreSQL을 준비한 경우에만:
node scripts/lecture/verify-isolated.mjs --postgres-port 55439
```

위 포트는 예시이며 실행 중인 dedicated 임시 cluster의 포트를 사용한다. spec은 loopback의 관리 DB에서 임의 이름의 DB를 생성하고 baseline·incremental schema 적용 후 삭제한다. 운영 proxy 포트나 기존 업무 DB·공유 DB를 사용하지 않는다. runner는 5432/5442를 거부하지만 포트만으로 환경이 격리됐다고 보증하지 않는다. 사전에 해당 cluster가 테스트 전용인지 확인한다. PG username은 기존 spec의 `O4O_LECTURE_CERT_OPS_PG_USER`로 지정한다. cluster 생성·종료는 이 runner가 하지 않는다.

`--synthetic-only`는 DB 통합과 실제 로그인을 실행하지 않는다. 테스트 통과만으로 실계정 전체 흐름을 PASS로 보고하지 않는다. PG15 권장이며 다른 버전이면 버전과 한계를 기록한다.

## 자막 합성 브라우저 검사

```bash
node scripts/lecture/browser-captions-smoke.mjs
```

ffmpeg(libvpx)와 Playwright Chromium이 필요하다. Linux `/usr/bin/chromium`을 자동 사용하거나 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`로 실행 파일을 지정한다. 일시 WebM과 WebVTT를 브라우저 라우팅으로 제공하고 실제 text track cue 로딩·편집·삭제·390/1440px 넘침을 검사한다. 외부 서버·실계정·업무 DB를 호출하지 않는다. 임시 파일과 자체 서버·브라우저는 종료 시 정리한다. 이 성공은 실제 운영 파일의 CORS 검증을 대신하지 않는다.

## 실제 로그인·역할별 흐름

로컬 프런트→API→DB가 모두 격리 환경인지 먼저 확인한다. 운영자·강사·학습자 전용 계정과 테스트 영상·WebVTT·자료를 준비하고, 생성 데이터·연결 데이터의 삭제 경로를 정한다. 계정 출처는 `docs/local/TEST-ACCOUNTS.local.md`이며 없으면 기준 checkout도 확인하고 누락을 보고한다. 과거 seed·다른 서비스 staff를 Lecture 운영자로 추정하지 않는다.

사용자가 조작할 수 있는 브라우저에 `/login`을 열고 직접 로그인받는다. 같은 세션에서 이어서 검증한다. 비밀번호·토큰·쿠키를 채팅으로 요구하지 않는다. 도구가 없으면 BLOCKED다.

| 순서 | 역할·작업 | 확인 |
|---|---|---|
| 1 | 강사 작성·편집 | 전문 정보·영상·교재·자막 저장/재조회, 기존 metadata 보존 |
| 2 | 강사 검토 요청→운영자 심사/승인 | 기존 소유권·검토 상태, 공개 소개와 보호 본문 분리 |
| 3 | 학습자 수강 신청·승인 | pending/rejected 학습 차단, approved 학습 허용 |
| 4 | 영상·읽기·퀴즈·과제 완료 | 실제 재생·자료 전송·자막 CORS 확인, seek가 실제 시청으로 오인되지 않음 |
| 5 | 자동 수료증 발급 | 수강 certificateId 연결 유지, 발급 이력, 강사 참여자/CSV 발급 표시 |
| 6 | 준비된 completed 미발급 fixture 수동 발급 | 미발급 목록 제외·중복 409·이력, 완료 상태 유지 |
| 7 | 갱신·수정·폐기와 재시도 | 동일 operationId 적용 1회, 월말/윤년, 이력 전후 상태·페이지 조회 |
| 8 | 학습자/공개 수료증 응답 | 내부 폐기 사유·처리자 미노출, 타인·타 서비스·비로그인 차단 |
| 9 | 390px·1440px 브라우저 | 메뉴 진입·직접 URL·키보드·toast·실제 API·콘솔·가로 넘침 |

서버 오류 주입과 자동 발급 실패 fixture는 격리 환경에서만 수행한다. 갱신이 폐기 수료증을 다시 유효하게 만드는 기존 규칙은 이번에 변경하지 않았다. 테스트용 발급물을 실제 자격·법정 이수 인정으로 취급하지 않는다.

## 과거 연결 누락 조회

이전 사용자 제공 운영 census는 대상 0건으로 보정 종료다. 이 작업은 재보정 요청이 아니다. 추후 별도 조사 시에는 승인된 운영 접속에서 `psql -X -f scripts/lecture/certificate-link-preview.sql`로 개수만 확인한다. 읽기 전용 SQL이며 자동 UPDATE는 제공하지 않는다. 과거 `/workspace` 전달용 파일이 다른 PC에 없었던 문제를 해결하기 위해 이제 이 SQL을 Git으로 전달한다.

## 정리·결과 보고

생성한 전용 업무 데이터와 연결 데이터의 완전 삭제·잔존 여부를 확인한다. 기존 사용자 데이터와 보안·감사 보존기록은 삭제하지 않는다. 종료 후 전용 browser context·임시 cluster를 닫는다. Windows worktree 정리는 모든 junction/symlink를 확인·해제한 뒤 자기 작업공간만 삭제한다. 이 클라우드 작업에서 다른 PC 파일을 삭제했다고 보고하지 않는다.

보고에는 검사 SHA/시각/프런트·API·DB/PG 버전/역할, 항목별 PASS·FAIL·BLOCKED·미실행, 마스킹된 근거, 데이터 생성·삭제·잔존 수량, Git 상태, 문서 정합을 기록한다. 실제 개인정보·응답 원문·비밀번호·토큰·쿠키를 public repo에 남기지 않는다.
