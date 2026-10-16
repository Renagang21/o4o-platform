# 공급자 보완 요청·이력 / 펀딩 입금·이행 예외 검증

작성: 2026-10-16 · 상태: 개발 검증 완료 / branch push 인계
Repository: Renagang21/o4o-platform
Branch: `wo/supplier-funding-operator-exceptions` · base: `daad0563c`
작업서: [TODO](../work-orders/WO-O4O-SUPPLIER-FUNDING-OPERATOR-EXCEPTIONS-TODO-V1.md)

## 변경과 경계

- 공급자 운영 승인 화면의 보완 요청 생성·제출 대기 큐·검토 완료·처리 이력을 연결했다. 본인은 `/mypage/business-profile`에서 자기 공급자 요청에 응답한다.
- 기존 supplier operator guard와 조직 관계 guard를 유지한다. body의 공급자/행위자 ID는 사용하지 않는다. Demo·비활성 변경을 차단한다.
- 요청별 version과 공급자 행 잠금·미완료 요청 부분 unique index로 중복/늦은 변경을 막는다. 요청 변경과 감사 저장은 동일 트랜잭션이다. 알림 실패는 저장 성공과 구분한다.
- 펀딩 운영 목록에 입금 확인 대기/실패·확인 금액 누락/불일치·결과 확정 이후 이행 미확인·이행 완료/입금 미확인 조회를 추가했다. 대상 참여자로 이동해 기존 기록을 수정한다.
- 이행 변경에 행 잠금과 원자적 감사를 추가했다. 참여자 처리 이력은 허용 항목만 투영하며 입금 참고값·비고 원문을 반환하지 않는다.
- SupplierStatus·회원·상품 승인 원장은 변경하지 않는다. 모집 종료를 입금/이행 기한으로 사용하지 않으며 실제 결제·송금·환불·정산 실행은 추가하지 않았다.
- 중앙 관리자·약사회 분회·운영 데이터 변경은 제외했다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| frozen install / 공통 패키지 build | 통과 |
| API·Neture TypeScript / production build | 통과 |
| Neture 전체 Vitest | 112개 파일, 1,060개 통과 (신규 UI 14개 포함) |
| 관련 API 단위·경로·기존 입금/권한 회귀 | 6 suites, 83개 통과 |
| 공급자 identity/context 경계 | 2 suites, 45개 통과 |
| 전용 PostgreSQL 15 통합 | 6개 통과 |
| migration 계약 / manifest 소비 소스 계약 | 21개 / 36개 통과 |
| 변경 코드 ESLint | 오류 0, 기존 펀딩 목록 hooks 경고 2개 유지 |
| PC 1440 / mobile 390 브라우저 | 8개 흐름·16개 화면, page error/가로 넘침 0 |
| 문서 민감정보 검사 / diff 공백 검사 | 통과 |

SQL 통합은 canonical bootstrap + incremental 28개를 매번 전용 임시 DB에 적용한다.
요청 생성→본인 제출→검토 완료, 타 공급자/늦은 version 차단, 동시 생성 하나만 성공,
펀딩 6종 판정·취소/환불 제외, 비공개 참고값 배제, 감사 insert 실패 시 요청/이행 변경 롤백을 검증했다.
신규 테이블의 계정 제거 writer fence 활성화, migration down/up fingerprint 복구와 재실행 no-op도 확인했다.
테스트는 `O4O_SUPPLIER_FUNDING_TEST_PORT=55449` 전용 opt-in이며 일반 테스트에서 실제 DB에 접속하지 않는다.

브라우저는 실제 production build를 사용하되 모든 API·외부 요청을 합성 응답으로 가로챘다.
공급자 요청/검토/본인 제출과 펀딩 이행 각각 실패 입력 보존→재시도 성공→저장 후 조회 실패→조회만 재시도를 PC/mobile에서 확인했다.
각 흐름의 쓰기는 실패 1회+성공 1회이며 조회 재시도는 추가 쓰기 0회였다.
산출물은 로컬 `.onboarding/supplier-funding-operator/`에 보관하며 저장소에는 합성 화면·로그를 추가하지 않는다.

주요 명령:

```bash
pnpm --filter @o4o/api-server exec tsc --noEmit
pnpm --filter @o4o/api-server build
pnpm --filter @o4o/web-neture exec tsc --noEmit
pnpm --filter @o4o/web-neture build
pnpm --filter @o4o/web-neture exec vitest run
O4O_SUPPLIER_FUNDING_TEST_PORT=55449 pnpm --filter @o4o/api-server exec jest --runInBand --forceExit --runTestsByPath src/__tests__/supplier-funding-operator.integration.spec.ts
node scripts/db/check-migration-contract.mjs
node --test scripts/ci/__tests__/deploy-risk.test.mjs
node scripts/check-doc-sensitive.mjs
```

## 통합 담당 인계

신규 migration: `CreateSupplierReviewRequests1792116000000` (additive table/index/기존 writer fence 연결).
manifest와 예상 스키마 상태는 끝에만 추가했으며 기존 baseline·migration·예상 상태는 바꾸지 않았다.
최종 fingerprint: `eaaa23ef2132dc1f9d49906a0c13d4fe04f898787811709b47f8282e977825bc` / 6,682 lines.
사용자 FK 3개는 SET NULL, 공급자 FK는 CASCADE이며 신규 정책으로 무기한 이력 보존을 약속하지 않는다.
자유 입력의 개인정보 사본은 기존 계정 제거 manifest의 명시적 잔존 검토를 따른다.

운영 migration은 적용하지 않았다. API/웹을 제공하기 전에 통합 담당이 현재 main migration 순서·실제 스키마와 실행 승인을 확인해야 한다.
다른 개발과 manifest/expected-state append가 겹치면 통합 순서에 맞춰 전용 DB에서 fingerprint를 다시 산출한다.
PR·CI 운영·병합·배포는 수행하지 않는다. 개발 branch는 통합 및 후속 수정을 위해 KEEP한다.

문서 정합: TODO 완료 항목과 조사 근거를 갱신하고 서비스별 roadmap에 이번 범위를 연결했다.
정본 정책과 완료된 과거 WO/CHECK는 재작성하지 않았다.
