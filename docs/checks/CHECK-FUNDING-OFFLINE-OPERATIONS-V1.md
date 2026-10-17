# 펀딩 오프라인 운영 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-17 · **최종 갱신**: 2026-10-17
> **범위**: 개발 검증·push 인계. PR·병합·배포·운영 DB 적용은 미실행.

## 정책과 구현

사용자 확정 [오프라인 운영 정책](../architecture/O4O-FUNDING-OFFLINE-OPERATION-POLICY-V1.md)과 [TODO](../work-orders/WO-FUNDING-OFFLINE-OPERATIONS-TODO-V1.md)를 기준으로 구현했다.

- 모집 기한/정원은 신규 참여 제한에만 사용한다. public GET의 상태 변경과 API 시작 시 자동 결과 worker 실행을 제거했다. 모집 결과는 funding 운영자가 기록하며 개설자·기존 일반 단계 변경 API는 모집→준비 전환을 대신하지 않는다.
- 기존 입금 원장과 약정 참여금을 구분한다. 공개 목록/상세는 실제 입금에서 기록된 환급을 뺀 금액을 read-only 집계한다. 입금·환급 변경 시 같은 transaction에서 currentAmount도 갱신한다. 기존 전체/개별 KPI도 수동 성공·미달 판정과 원장 순모금을 반영한다. 조회 시 소급 backfill은 없다.
- 모금 결과·중지·약정 정정·철회·누적 환급 정정은 이유와 최신 version을 요구한다. trial→participant 순서의 잠금과 감사 저장을 같은 transaction에서 처리한다. 중지/철회 자체로 입금·실제 환급·포럼 회원 원장을 변경하지 않는다.
- 환급액은 입금액을 넘을 수 없다. 전액 환급 후 감액 정정은 남은 입금 상태를 복구한다. 환급 기록이 있는 입금을 미입금/취소로 바꾸어 잔액을 숨길 수 없다. 입금액 정정은 환급액보다 작을 수 없으며 잔액에 맞는 상태를 기록한다.
- 환급 확인 대기·약정 미등록을 기존 예외 목록에 연결한다. 철회/중지된 대상을 입금 독촉·신규 이행 대기 대상으로 잘못 안내하지 않는다.
- 공급자 상태 관리·승인 상세에 진행 펀딩 조회와 funding 운영자 링크를 추가했다. 역사적 supplierAccountId가 있으면 legacy 사용자 연결보다 우선한다. 공급자 비활성화·펀딩 중지·권한 부여는 자동 실행하지 않는다.
- 참여자는 자기 철회·환급 기록만 조회한다. 운영자 사유/감사 metadata는 공개 DTO에 포함하지 않는다. 참여 상세의 계정/대상 변경과 늦은 응답, 조회 실패 재시도도 보완했다.
- 모집 일시는 한국 시간으로 편집한다. 무관한 수정은 원래 ISO 시각/밀리초를 보존한다. 실제 환급일 입력은 브라우저 현지 시각을 ISO로 전송한다.

## 실행 검증

Node 22.18.0 / pnpm 10.25.0, frozen install 및 공유 패키지 build 후 검증했다. 환경 재생성 후 같은 기준 main `a554025725`에서 작업을 복원했다. setup skill의 clean cloud checkout 재사용 지침에 따라 전용 branch를 사용했다.

| 검증 | 결과/방법 |
|---|---|
| 웹 전체 회귀 | root `pnpm exec vitest run --config services/web-neture/vitest.config.mjs` — 120 files / 1,130 tests PASS |
| 기존 API 집중 회귀 | payment-record, workspace, operator-exceptions, participation, operator-records, public-and-creator — 6 suites / 81 tests PASS |
| 새 SQL 통합 | 12 tests PASS — 아래 격리 PostgreSQL 검증 참조 |
| API·웹 빌드 | `pnpm --filter @o4o/api-server run build`, `pnpm --dir services/web-neture build` PASS (TypeScript 포함) |
| Migration 계약 | `node scripts/db/check-migration-contract.mjs` — 21 PASS / 0 FAIL |
| 배포 위험 분류 회귀 | `node --test scripts/ci/__tests__/deploy-risk.test.mjs` — 36 PASS |
| Lint | 변경 runtime 경로 오류 0. 기존 controller의 미사용 import/disable 경고 2건은 범위 밖으로 보존 |
| 문서 민감정보·diff | `node scripts/check-doc-sensitive.mjs`, `git diff --check` |

### 격리 SQL

운영 연결 설정을 사용하지 않았다. loopback 전용 PostgreSQL 15 / 전용 포트 55451 / synthetic 사용자·사업 데이터만 사용했다. 고정 opt-in `O4O_FUNDING_OFFLINE_PORT=55451` 없이는 이 통합 테스트가 skip된다. canonical bootstrap과 ordered incrementals 전체를 적용한 일회성 DB를 테스트 종료 시 DROP하고 pg_database 잔존 0을 확인한다. 운영 DB write·DDL·계정 생성은 없다.

`funding-offline-operations.integration.spec.ts`에서 migration 재실행/최종 fingerprint, 신규 migration down/up 시 이전·최종 schema 복원, 기한 경과 시 read-only 모집 유지, 약정과 입금 분리, 명시적 성공/미달 판정, 중지·철회 후 입금 보존, 부분/전액 환급·정정, 감사 실패 원복, 범위/금액/달력 날짜 검증, 공급자 연결 경계, 환급 후 입금 정정, 같은 version 동시 요청의 1건 커밋과 기존 KPI의 수동 결과/순모금 반영을 검증한다.

최종 schema fingerprint: `76c1307f0ee0a073e7ce53f9ae00e58c8695b6084842d42f6475bac35df58c04` / 6,698 lines. 기존 baseline/과거 migration/기존 expected state는 변경하지 않았다.

### PC·모바일 브라우저

실제 web-neture production bundle을 localhost preview에서 제공하고 `funding.neture.co.kr` / `supplier.neture.co.kr` host 분기를 재현했다. Playwright + Chromium, 1440×1000·390×1000에서 모든 API/외부 요청을 synthetic fixture로 차단·대체했다. 실제 계정 로그인이나 운영 API 작업의 검증 결과로 보지 않는다.

- 펀딩: 모금 결과 저장 실패→사유 보존→재시도 성공→조회만 실패→읽기 재시도(추가 write 0)→중지→철회→부분 환급. 크기별 fixture POST 5회(의도한 실패 1회 포함), 수평 넘침 0·pageerror 0.
- 공급자: 상태 변경 대화상자의 진행 펀딩 조회 실패→재시도→funding 운영자 링크 확인. 크기별 write 0·수평 넘침 0·pageerror 0. 비활성화나 펀딩 중지를 실행하지 않았다.
- 로컬 산출물은 `.onboarding`에만 보관한다. synthetic 브라우저 상태는 context 종료 시 폐기한다.

## 통합 인계와 남은 범위

- 개발 branch: `wo/funding-offline-operations`. main/배포 완료로 보고하지 않는다. PR 생성부터는 지정된 통합 담당이 맡는다.
- migration `AddFundingOfflineState1792212000000`을 운영 적용한 뒤 API/웹을 제공해야 한다. 이번에는 격리 DB에만 적용했다. 운영 적용 승인은 별도이며 down은 보관 중인 새 업무 기록을 잃으므로 운영 rollback 수단으로 실행하지 않는다.
- 기존 `refunded` 행에 환급액/처리일이 없으면 임의로 금액을 채우지 않고 기존 완료 상태·금액 미등록으로 안내한다. 운영자의 확인/정정이 필요하다. 미기록 입금은 확인 입금으로 추정하지 않는다.
- 실제 계정/실제 배포본 업무 검증은 미실행이다. 은행 조회·PG·실제 송금·실제 환급·통합 운영 대시보드·개설자 승계·철회 후 재가입 정책은 이번 구현에 포함하지 않는다.
- 모집 결과 알림은 commit 이후 기존 best-effort 알림을 호출한다. 알림 전송 보장/재시도 queue는 새로 만들지 않았다.
- 기존 자동화 관련 완료 WO/CHECK는 당시 기록으로 보존한다. 현행 정책은 위 새 정책 문서이며 canonical index 등재는 별도 문서 작업으로 남긴다.

문서 정합: 사용자 확정 정책·TODO·이 CHECK·ACTIVE 운영자 roadmap의 인계를 연결했다. 과거 기록과 canonical index는 재작성하지 않았다.
