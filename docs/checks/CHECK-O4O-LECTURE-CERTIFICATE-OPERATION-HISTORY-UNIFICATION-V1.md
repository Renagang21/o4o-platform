# Lecture 수료증 처리 이력 단일화 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24
> **근거 WO/IR**: [WO-O4O-LECTURE-CERTIFICATE-OPERATION-HISTORY-UNIFICATION-V1](../work-orders/WO-O4O-LECTURE-CERTIFICATE-OPERATION-HISTORY-UNIFICATION-V1.md)

## 결과

수료증 발급·갱신·수정·폐기 이력을 main 공통 `recordOperation` 의 `lecture.certificate_{issue,renew,update,revoke}` 하나로 단일화했다. 이력 경로는 기존 `GET /lms/certificates/:id/operations` 하나이며 응답에 `action · before · after · months · changedFields · trigger · page · hasMore` 를 추가했다(기존 필드 유지). 새 schema · migration · dependency 변경은 없다.

작업 branch: `wo/lecture-certificate-operation-history-unification`. 기준 main: `8f8e8b7ae8`.

## 두 미병합 브랜치 처리

| 브랜치 | 판정 | 옮긴 것 | 버린 것 |
|---|---|---|---|
| `wo/lecture-certificate-audit` (172a35cb92) | 병합하지 않음 | 4개 동작 이력 · 전후 상태 · 재시도 id(`operationId`) · 발급 트랜잭션(수강 행 잠금) · 이력 페이지 | `/history` 경로 · 별도 키 `lecture.certificate.*` · 별도 INSERT 구현 · 요청 해시 비교 · 학습자 화면 변경 |
| `wo/lecture-certificate-business-operations` (ada591fab4) | 병합하지 않음 | 없음 (audit 의 부분집합) | main 과 같은 경로의 중복 등록 · 별도 키 `lecture.certificate_operation` · `operator-core-ui` 무관 변경 |

두 원격 브랜치 삭제는 저장소 설정상 GitHub 에서 직접 수행한다.

## 작업 중 발견 · 수정한 기존 결함

자동 수료로 발급된 수료증의 `lms_enrollments."certificateId"` 가 null 로 남는다. 수료 체인 호출부가 체인 이전에 읽은 enrollment 를 체인 뒤 다시 저장하면서 TypeORM `save()` 의 비교가 체인이 기록한 값을 null 로 되돌린다. 격리 검증에서 main 의 `CertificateService` 그대로도 같은 결과를 재현했다. 영향: 강사 참여자 화면 `certificateIssued` · CSV `Y/N` 이 자동 발급 수료증을 미발급으로 표시. 수정: 체인 뒤 재저장 전에 DB 값을 맞추는 `keepCertificateLink` 를 체인 3곳에 적용하고 소스 계약 테스트를 추가했다. 이미 null 로 저장된 과거 행의 보정은 하지 않았다(운영 Lecture 수료증 0건, 2026-10-23 read-only 확인).

## Shared Module Change Verification

### Changed shared module

- `apps/api-server/src/modules/lms/services/certificate-operation.service.ts` (기존 `revokeLectureCertificate` 시그니처 유지 + 선택 인자 추가)
- LMS 수료 체인 3곳: `EnrollmentService` · `QuizService` · `AssignmentService`

### Consumer impact matrix

| 소비처 | 사용 | 변경 영향 | route/role 영향 | 검증 | 결과 |
|---|---|---|---|---|---|
| `CertificateController` · `CertificateService` | 직접 | 4개 동작 이력 · 발급 트랜잭션 · 미발급 검색 escape | 없음 (기존 `requireLectureOperator`) | 격리 PG 흐름 · Jest | 통과 |
| `operator-inbox.integration.spec.ts` | `revokeLectureCertificate` 직접 호출 | 반환·로그 형태 유지 (`reason · beforeValid · afterValid` 유지, `before · after` 추가) | 없음 | operator-inbox PG fixture | 통과 |
| 수료 체인 3곳 | 직접 | 재저장 전 연결 보존 | 없음 | 소스 계약 · 격리 흐름 F7 | 통과 |
| Lecture 운영 화면 | API | 처리 이력 표시 · 재시도 id | 없음 | Vitest · build | 통과 |
| 그 밖의 서비스 | `recordOperation` 은 수정하지 않음 | 없음 | 없음 | 소비처 변경 없음 | 해당 없음 |

## 실행한 검증

| 검증 | 결과 | 범위·한계 |
|---|---|---|
| api-server type-check · lecture-web build | 통과 | |
| Lecture Vitest | 69/69 (15 files) | 신규 2: 이력 표시·페이지, 재시도 id 재사용 |
| API Jest Lecture·LMS 23 suite | 389/389 | 신규 PG spec 포함(아래), 소스 계약 3 추가 |
| 신규 `lecture-certificate-operations.postgres.spec.ts` | 6/6 | 격리 PostgreSQL 17.9 · 자체 DB 생성·삭제. 갱신 전후·재시도 1회 · 수정 allowlist · 폐기 비공개·실패 롤백 · 범위·권한 · 과거 폐기 행 · 자동 발급 · 페이지 · 검색 escape |
| `run-operator-inbox-fixture.ts` | 24/24 · schema prefix 전체 · `Fixture cleanup PASS: database count 0` | PostgreSQL 17.9 (SETUP 은 15 기준) |
| 격리 전체 흐름 (검증 전용 spec, 커밋 안 함) | 9/9 | 실제 `lms.routes` · 인증만 대체. 강사 신청→심사→수강→수료→자동 발급(이력·연결)→발급 실패 주입→미발급 목록→수동 발급(이력)→중복 409→갱신 재시도 1회→폐기 사유가 학습자·공개 검증·metadata 에 없음 |
| 변경 파일 ESLint | 0 error | `QuizService` 기존 미사용 import 경고 2건은 기존 |

PostgreSQL 15 위의 실행은 이 환경에 PG15 · Docker 가 없어 하지 못했다. 운영 DB · 배포 · 실제 계정 검증은 수행하지 않았다.

## 남은 판단

- 갱신은 기존 규칙대로 폐기된 수료증도 다시 유효로 만든다. 이번에는 바꾸지 않고 전후 상태를 이력에 남긴다. 유지 여부는 정책 판단이다.
- 이미 null 로 저장된 `certificateId` 과거 행 보정은 데이터 변경이라 별도 승인 대상이다(현재 운영 대상 0건).

문서 정합: 해당 없음

## 통합 리뷰 보완 — 갱신 달력 계산

PR #789 Codex 리뷰에서 PostgreSQL 월 interval이 월말을 보정해 기존 `Certificate.renew()`의 JavaScript `setMonth()` overflow와 달라지는 점을 확인했다. 동일한 JavaScript 달력 계산으로 만료일을 만든 뒤 잠금 트랜잭션 안에서 저장하도록 보완했다. 평년·윤년 월말, 윤일 12개월 갱신, 연도 경계의 회귀 4건과 자동 수료 연결 계약을 통합 환경에서 실행해 2 suite 12건이 통과했다. 운영 데이터 변경·과거 행 보정은 수행하지 않았다.
