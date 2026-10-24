# Lecture 수료증 처리 이력 단일화

> **상태**: ACTIVE
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24
> **근거 WO/IR**: PR #767 운영 검증 중 발견한 수료증 처리 이력 구현 3종 중복 — 사용자 승인(2026-10-24 "진행해")

## INITIAL_PURPOSE

Lecture 수료증의 발급·갱신·수정·폐기 처리 이력을 main 의 공통 운영 이력(`recordOperation` · `action_logs`) 하나로 단일화한다. 병합되지 않은 두 브랜치(`wo/lecture-certificate-audit` 172a35cb92 · `wo/lecture-certificate-business-operations` ada591fab4)는 병합하지 않고 필요한 동작만 main 기준으로 옮긴다.

## CONFIRMED_DECISIONS

| 항목 | 결정 | 근거 |
|---|---|---|
| 기준 구현 | main `certificate-operation.service.ts` (0cdd93b97c) | `recordOperation` 은 main 의 13개 서비스 파일이 쓰는 공통 운영 이력이다. 두 브랜치는 그 이전 별도 방식 |
| 이력 키 | `lecture.certificate_{issue,renew,update,revoke}` | 기존 `lecture.certificate_revoke` 행을 그대로 읽는다. migration 없음 |
| 이력 경로 | `GET /lms/certificates/:id/operations` 하나 (기존) | audit `/history` · business-ops 중복 등록 폐기 |
| 이력 응답 | `{ operations, page, hasMore }` — `operations[]` 에 `action · before · after · months · changedFields · trigger` 추가 | 기존 `actorId · at · reason` 유지(추가만) |
| 재시도 | renew·update·revoke 의 선택 `operationId`(UUID) — 같은 id 는 한 번만 적용 | audit 브랜치의 재시도 안전성 |
| 발급 | 수료 재확인 · 중복 확인 · 수료증 저장 · `certificateId` 연결 · 발급 이력을 수강 행 잠금 아래 한 트랜잭션 | audit 브랜치의 발급 원자성 |
| 권한 | 이력 조회·변경은 기존 `requireLectureOperator` + 변경은 기존 inbox writer 판정 | 폐기에만 있던 판정을 갱신·수정에도 적용 |
| 갱신 규칙 | 기존 `Certificate.renew()` 그대로 — `now + months`, `isValid=true` | 동작 변경 없음. 전후 상태가 이력에 남는다 |
| 미발급 목록 검색 | `%` · `_` · `\` 를 문자 그대로 일치 | PR #767 검증 PG17 관찰 1건 |
| 자동 발급 연결 보존 (작업 중 추가) | 수료 체인 3곳(영상·글 / 퀴즈 / 과제)이 체인 뒤 재저장 전에 `certificateId` 를 DB 값으로 맞춘다 | 격리 검증에서 main 그대로도 자동 발급 수료증의 `lms_enrollments."certificateId"` 가 null 로 되돌아감을 재현. 같은 발급 연결 범위라 이 WO 에서 처리 |

## OUT_OF_SCOPE

- 운영 DB 적용 · 배포 · PR · merge (통합 담당)
- 학습자 유효기간 표시 등 audit 브랜치의 학습자 화면 변경
- 갱신이 폐기된 수료증을 다시 유효로 만드는 기존 규칙의 변경 (정책 판단 필요 — 보고만)
- 원격 브랜치 2개 삭제 (GitHub 에서 사용자가 직접)
- scope guard 403 응답 형식 · 강의 생성 태그 누락 500 (공통 모듈 · 별도 WO)

## DONE_CRITERIA

- 4개 동작이 한 키 체계로 기록되고, 기존 폐기 이력이 조회된다
- 회귀: 미발급 목록 · 기존 발급·중복 409 · 학습자 수료증 조회 · 공개 검증 유지, 사유·처리자는 운영자 이력에만
- 실제 PostgreSQL 통합 검증(격리) · 기존 Lecture/LMS 테스트 · 타입 · 빌드 통과
- 작업 branch commit · push · 인계 — 결과는 [CHECK](../checks/CHECK-O4O-LECTURE-CERTIFICATE-OPERATION-HISTORY-UNIFICATION-V1.md)
