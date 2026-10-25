# Lecture 격리 검증 발견 결함 보완

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **근거 WO/IR**: 사용자 제공 실제 이메일 로그인 격리 검증 결과 및 Lecture 잔여 작업 전체 진행 지시

## 범위·작업 방식

사용자 보고는 main `23717b6dc0` / PostgreSQL 17.9에서 수행됐다. 이 문서는 해당 실계정 검증을 여기서 재실행한 기록이 아니다. 운영 DB 접근·데이터 생성 없이 재현 가능한 회귀를 고친다. 기존 Lecture 후속 작업의 연속 Phase로 `wo/lecture-remaining-work-followthrough` / PR #809를 유지한다. 공통 인증은 Shared Module Change Protocol에 따라 소비처를 확인하고 기존 세션·역할·서비스 경계를 보존한다.

## TODO

- [x] 승인 전 진도 API 호출 차단: approved/in_progress/completed만 허용, scope 확인 이후·lesson 조회와 완료 체인 이전 판정.
- [x] requireEnrollment의 모든 비동기 DB 오류 전달: UUID 입력 오류는 400, 나머지는 next(error), Express 4 미처리 rejection 방지.
- [x] optionalAuth의 검증된 사용자 JWT memberships 부착: requireAuth와 동일, 비사용자·비활성·제한·폐기·만료/종료 세션의 기존 차단 유지.
- [x] 태그 검증 오류 400: typed CourseValidationError만 처리, DB 장애 500 유지.
- [x] Sonar javascript:S4036 원인 확인·수정: 합성 브라우저 스크립트 ffmpeg 실행에 PATH 검색 제거, 기본 절대 경로 또는 명시적 절대 경로 사용.
- [x] 합성 HTTP·단위·공통 인증 회귀, API type-check, 390/1440 브라우저 합성 smoke.
- [ ] 새 HEAD의 CI·Sonar·Codex 확인 후 정상 PR 병합·배포·운영 읽기 검증.
- [ ] 실제 로그인 브라우저 검증 및 PostgreSQL 로그인 시나리오 재검증: 로그인 가능한 로컬 환경에서 수행.

## 완료 기준

수정·회귀 테스트·검증 결과를 push하고 PR #809의 gate를 다시 확인한다. 운영 반영과 실계정 검증은 별도로 결과를 기록한다. 사용자 보고에 남은 다른 PC의 디렉터리·worktree는 이 클라우드에서 삭제하지 않는다. 상세 결과·소비처 매트릭스는 [CHECK](../checks/CHECK-O4O-LECTURE-ISOLATED-FINDINGS-V1.md)를 따른다.
