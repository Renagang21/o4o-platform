# 강의 수료증 사유·감사 이력 검증

> 작성: 2026-10-17 · 상태: 개발 검증 완료 / branch push 인계
> WO: [TODO](../work-orders/WO-LECTURE-CERTIFICATE-AUDIT-TODO-V1.md)
> Repository: Renagang21/o4o-platform · branch: `wo/lecture-certificate-audit`
> 기준 main: `6bb07622c4` (작업 중 이후 main의 Megapharm CORS 수정은 별도 범위)

## 구현과 경계

대상은 **study.neture.co.kr** 강의 운영자다. 공용 LMS API에서는 lecture course만 이력 조회·수정한다.
중앙 관리자·약사회 분회·새 자동 수료/발급 정책은 추가하지 않았다.

- 기존 발급 조건 확인 뒤 전용 transaction에서 enrollment를 잠그고 수료 상태·기발급을 다시 확인한다. certificate 생성·enrollment 연결·감사 insert가 함께 commit/rollback된다.
- 갱신·폐기·일반 수정은 lecture certificate 행 잠금과 동일 transaction 감사로 보호한다. 선택 폐기 사유를 trim/2,000자 이내로 저장하고, 원문을 일반 로그나 certificate metadata에 복제하지 않는다.
- 재시도 operationId는 UI의 같은 대상·동작·입력에 대해 실패 후 유지한다. 서버는 certificate 행 잠금 아래 같은 ID/요청 hash를 확인해 중복 반영을 막고 다른 payload 재사용은 409 처리한다. 키는 기존 action_logs 보유기간 안에서 유효하며 영구 idempotency 원장을 만들지 않았다.
- `/lms/certificates/:id/history`는 기존 requireLectureOperator와 course scope 아래에서만 조회한다. 사유·행위자·대상·시각·유효성 전후·갱신 개월·일반 수정 항목 이름만 투영한다. 임의 metadata·요청 hash는 반환하지 않는다.
- 본인 전용 certificate read/PDF와 공개 진위 최소 필드를 유지한다. 학습자 목록이 실제 isValid/만료일을 반영해 폐기·만료·유효를 표시하도록 수정했다. PDF 다운로드의 기존 소유권 정책은 변경하지 않았다.
- 운영자 화면은 대상별 이력·페이지·조회 오류/재시도와 쓰기 결과를 구분한다. 이전 대상/언마운트 응답은 폐기하며 저장 성공 뒤 조회 실패에 쓰기를 다시 보내지 않는다.
- 기록은 현행 action_logs 365일 보유/파기 체계와 계정 제거 manifest 잔존 검토를 따른다. 무기한 보관·과거 처리 소급 기록은 없다.

## 실제 검증

| 항목 | 결과 |
|---|---|
| 강의 전체 Vitest | 12 files / 44 tests 통과 |
| 관련 API·공개/소유권·자동 발급 chain·보유 정책 | 5 suites / 181 통과, 기존 조건부 4 skip |
| 서비스 간 LMS·운영자 scope·강의 role guard | 3 suites / 42 통과 |
| 전용 PostgreSQL 통합 | SQL 6개 + 사유 단위 1개 통과 (위 181개에 포함) |
| API/강의 TypeScript·production build | 통과 |
| 변경 코드 ESLint | 오류 0, 기존 lms.routes.ts 미사용 변수 경고 3개 유지 |
| PC 1440 / mobile 390 실제 build + 합성 API | 각 8개 흐름 통과, page error/가로 넘침 0 |
| 문서 민감정보·diff 검사 | 통과 |

SQL 검증은 전용 로컬 PostgreSQL 15/port 55450에서 disposable DB를 생성하여 canonical bootstrap과 현행 incremental을 적용했다.
실제 Certificate entity와 SQL을 사용해 발급/수강 연결, 중복 갱신 직렬화·변조된 replay 거절,
폐기 사유와 일반 수정 항목 저장, 타 서비스/미존재 대상 거절, 제한된 history projection/페이지,
감사 insert 실패 시 certificate·발급·enrollment 연결 rollback을 검증했다.
일반 CI에서는 `O4O_LECTURE_CERT_TEST_PORT=55450` 없이는 SQL fixture를 실행하지 않는다.
privacy-retention의 별도 DB 조건부 4개는 실행하지 않았으며 다른 DB의 준비 상태를 추정하지 않았다.

브라우저에서는 모든 API·외부 요청을 가로채 합성 응답만 사용했다. 운영자 직접 URL,
발급→폐기 실패 입력 보존→같은 요청 ID 재시도→저장 후 이력 조회 실패→조회만 복구,
갱신 실패/재시도·변경 항목 표시·학습자 유효/폐기 표시·공개 QR 진위의 무효/유효를 검증했다.
viewport당 발급 쓰기 1회, 폐기 2회(실패+성공), 갱신 2회(실패+성공)이며 이력 조회는 추가 쓰기 0회다.
산출물은 로컬 `.onboarding/lecture-certificate-audit/`에 보관한다. 실계정/운영 데이터는 사용하지 않았다.
테스트 계정 정본 `docs/local/TEST-ACCOUNTS.local.md`는 현재 checkout에 없으며 과거 계정으로 대체하지 않았다.

주요 명령:

```bash
pnpm --filter @o4o/api-server exec tsc --noEmit
pnpm --filter @o4o/api-server build
pnpm --dir services/web-lecture run build
pnpm exec vitest run --config services/web-lecture/vitest.config.mjs --maxWorkers=2 --minWorkers=1
O4O_LECTURE_CERT_TEST_PORT=55450 pnpm --filter @o4o/api-server exec jest --runInBand --forceExit --runTestsByPath src/__tests__/lecture-certificate-audit.integration.spec.ts
```

Literal source consumers of CertificateService.ts는 기존 lecture-phase2 merge-gate와 completion-certificate-chain 두 테스트에서 검증했다.
기존 allowlist assertion을 유지했고 신규 history scope 거절과 세션 actor/사유 전달을 추가 검증했다.
서버/웹 API의 추가 인자는 선택형으로 기존 소비자의 호출 계약을 유지한다.

## 인계

신규 migration·공유 패키지·dependency·보유 정책 변경 없음. 배포 시 API를 먼저 제공한 뒤 강의 웹을 제공해야 한다.
이번 작업은 사용자 지시대로 검증·commit·push까지이며 PR·병합·배포는 수행하지 않는다.
개발 branch와 cloud checkout은 통합/수정 인계를 위해 KEEP한다.

문서 정합: 신규 TODO와 CHECK, ACTIVE 서비스별 로드맵을 연결했다. 완료된 과거 WO/CHECK·정본 정책은 재작성하지 않았다.
