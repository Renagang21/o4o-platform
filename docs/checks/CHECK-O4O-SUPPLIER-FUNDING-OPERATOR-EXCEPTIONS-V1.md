# 공급자 보완 요청·이력 / 펀딩 입금·이행 예외 검증

작성: 2026-10-16 · 상태: PR #653 blocker 3건 수정·재검증 완료 / branch push 인계 (하단 "PR #653 후속 수정" 참조)
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

## PR #653 후속 수정 (2026-10-16)

검토 head `782394b3d` 에서 통합 담당이 전달한 blocker 3건을 같은 branch 에서 수정했다.

### 실패 원인과 수정

| blocker | 원인 | 수정 |
|---|---|---|
| Codex P1 · 종료 후 이행 의무 소실 | `fulfillment_pending` 이 trial `outcome_confirming`/`fulfilled` 만 보았다. `fulfilled→closed` 는 미이행 참여자가 있어도 허용되므로 종료 순간 입금 확인·이행 미확인 의무가 목록에서 사라졌다 | 판정 범위에 `closed` 중 `statusHistory` 에 `fulfilled→closed` 전환이 기록된 trial 을 추가했다. 모집 실패 자동 종료(`recruiting→closed`, `closeReason=auto_target_missed`)와 심사 단계 종료는 그 전환 기록이 없어 포함되지 않는다. 새 상태·기한은 만들지 않았다 |
| Codex P2 · 제출 전 검토 완료 | `resolve` 가 `resolved` 만 거부해 `requested` 에서도 통과, `submitted_at` 없는 완료가 생겼다. UI 도 요청 상태에서 검토 완료 입력을 보였다 | 공급자 행·요청 행 잠금 뒤 최신 상태가 `submitted` 일 때만 완료하고, `requested` 는 409 `REVIEW_REQUEST_NOT_SUBMITTED` 로 거부한다. UPDATE 에도 기대 상태·version 조건을 넣어 0행이면 409 로 끝낸다. UI 는 운영자에게 `requested` 요청을 "공급자 제출 대기" 안내로만 보여 주고 입력·저장 버튼을 숨긴다 |
| Sonar Reliability C | 신뢰성 BUG 는 `OperatorSupplierApprovalPage.tsx:337` 미처리 Promise(S9383) 1건. 그 밖에 신뢰성 영향 LOW 인 S7503(async 내 await 없음) 3건(`create`·`transition`·`update`) | drawer action 은 `runWrite` 가 모든 오류를 잡아 화면에 표시하므로 Promise 를 `void` 로 명시했다. 서비스 3개는 `return await` 로 바꿔 입력 검증 실패도 기존처럼 reject 로 전달된다(동기 throw 로 바뀌지 않음). 규칙 비활성화·기준 완화는 하지 않았다 |

유지보수성 경고(props readonly · nested ternary · `role="status"` · Cognitive Complexity)는 신뢰성 결함이 아니며 gate 의 maintainability 조건은 A 였다.
수정한 패널의 입력 라벨 중첩 삼항은 변수로 정리했고, 나머지 유지보수성 경고는 이번 blocker 범위 밖이라 두었다.

### 재검증

| 검증 | 결과 |
|---|---|
| frozen install / 공통 패키지 build | 통과 |
| API·Neture TypeScript / production build | 통과 |
| Neture 전체 Vitest | 112개 파일, 1,062개 통과 (패널 신규 2개: 제출 전 완료 차단 · 제출 건 version 포함 완료) |
| 관련 API 단위·경로 (예외·보완 요청·handler·펀딩 기록) | 4 suites, 39개 통과 (신규: requested→resolve 거부, submitted→resolve 허용·상태/version 조건, UPDATE 0행 409, 종료 판정 SQL) |
| 전용 PostgreSQL 통합 (`O4O_SUPPLIER_FUNDING_TEST_PORT=55449`) | 8개 통과. 이번 PC 는 PostgreSQL 17 임시 클러스터(127.0.0.1 전용·trust·세션 scratch 디렉터리)로 실행했다 |
| 통합 신규 2건 | requested→resolve 거부 후 행 불변(state·version·submitted_at·resolved_at), 제출 후 동시 resolve 2건 중 1건만 성공·나머지 `REVIEW_REQUEST_CHANGED`, 감사 2건만 추가 / `fulfilled→closed` trial 은 이행 미확인 유지·이행 기록 후 해소, 모집 실패 자동 종료 trial 은 어떤 예외로도 미포함 |
| migration `1792116000000` | 같은 통합 실행에서 bootstrap+incremental 적용, 등록 fingerprint 일치, down→이전 fingerprint, up→복구, 재실행 no-op, writer fence 활성 확인. 임시 DB 는 afterAll 에서 DROP 했고 잔존 0 을 조회로 확인했다 |
| migration 계약 | 21 pass / 0 fail |
| 변경 파일 ESLint | 오류·경고 0 |
| PC 1440 / mobile 390 브라우저 | production build 를 실제 호스트명으로 띄우고 모든 API 를 합성 응답으로 가로챘다. 요청 상태 공급자는 완료 입력·버튼 0, 제출 상태 공급자는 저장 실패 시 입력 유지→재시도 성공→목록 조회 실패 안내→조회만 재시도. resolve 쓰기 2회(실패1·성공1), 조회 재시도 추가 쓰기 0, page error 0, 가로 넘침 0 |

브라우저 범위: 이번 수정이 바꾼 운영자 보완 요청 흐름만 다시 확인했다. 펀딩 예외 화면·공급자 본인 제출 화면은 UI 코드가 바뀌지 않았거나 Vitest 로 덮이므로 브라우저 재실행을 생략했다.
fixture 계정·식별자는 모두 합성 값이며 운영 DB·운영 API·실제 입금·주문·결제는 사용하지 않았다.

### 통합 담당 인계

- origin/main 에 #652 의 `SeparateSupplierRegistrationPublication1792110685889` 가 이미 manifest·expected-schema-states 끝에 들어가 있다. 이 branch 는 main 을 병합하지 않았으므로 manifest 순서와 최종 fingerprint 는 통합 시 전용 DB 에서 다시 산출해야 한다. 위 fingerprint 검증은 이 branch 단독 기준이다.
- 운영 migration·배포·PR 운영은 수행하지 않았다.

## origin/main 동기화와 fingerprint 재산출 (2026-10-17)

사용자 승인(작업 branch 동기화까지)에 따라 `origin/main` `a9063fc0b` 를 일반 merge commit 으로 병합했다. rebase · force push 는 없다.

- 충돌은 `manifest.ts` · `expected-schema-states.ts` 2개뿐이었다. #652 의 `SeparateSupplierRegistrationPublication1792110685889` 를 앞에, 이 branch 의 `CreateSupplierReviewRequests1792116000000` 을 뒤에 두었다.
- 최종 상태 fingerprint 를 격리 PostgreSQL 17 에서 다시 산출했다: `18c01a7f97f311d41c04cfe9bc2dd56706741360ee6d103dc3845f2a4893b465` / 6,684 lines. #652 상태(6,654)에 이번 테이블의 30줄이 더해진 값이다. 이전 단독 값(`eaaa23ef…` / 6,682)은 폐기했다.
- 통합 spec 에 전 prefix 검증을 추가했다. baseline 부터 migration 을 하나씩 적용하며 각 단계의 fingerprint · line 수가 `EXPECTED_SCHEMA_STATES[k]` 와 같은지 본다. baseline + 29개 prefix 가 모두 일치했다.
- lockfile 변경이 없어 재설치하지 않았고 공통 패키지만 다시 build 했다.

| 검증 (병합 후) | 결과 |
|---|---|
| 격리 PostgreSQL 통합 | 9개 통과 (전 prefix fingerprint · 최종 down/up 복구 · 재실행 no-op · writer fence · 기존 회귀 7). 임시 DB 잔존 0 |
| migration 계약 / deploy-risk source 계약 | 21 pass / 36 pass |
| API tsc · 관련 jest (예외 · 보완 요청 · handler · 펀딩 기록 · DB 상태 분류기) | 통과 · 5 suites 71 통과, 4 skip(분류기 spec 의 격리 DB env-gated 항목) |
| Neture tsc · 전체 Vitest | 통과 · 117개 파일 1,123개 통과 |
| API · Neture production build / 변경 파일 ESLint | 통과 / 0 |

운영 migration · main PR 병합 · 배포는 이 승인 범위가 아니며 수행하지 않았다.

## 2차 origin/main 동기화 · migration epoch 갱신 (2026-10-17)

#663 의 `CreateMemberPaidServiceEntitlements1792137600000` 이 main 에 들어와, 같은 승인 범위(작업 branch 동기화)로 `origin/main` `f95890981` 을 다시 일반 merge commit 으로 병합했다.

- migration 계약 C09 는 incremental epoch 가 manifest 순서대로 **엄격히 증가**해야 한다. 이 branch 의 `1792116000000` 은 main 의 `1792137600000` 보다 작아 뒤에 둘 수 없으므로, 신규 migration 을 `CreateSupplierReviewRequests1792193756961` 로 다시 번호를 매겼다(파일명 · class · name 동시 변경, 본문 SQL 불변). 이 migration 은 운영에 적용된 적이 없어 이력 충돌은 없다. 앞 절들에 남은 `1792116000000` 표기는 당시 기록이다.
- manifest · expected-schema-states 는 main 의 항목을 그대로 두고 그 뒤에 이 migration 을 붙였다.
- 최종 fingerprint 재산출(격리 PostgreSQL 17): `086af046804b172646d4bec9acd190b3dcb076ff10650c2a1b1833df2592d375` / 6,694 lines (#663 상태 6,664 + 이번 테이블 30). 이전 값 `18c01a7f…` / 6,684 는 폐기했다.

| 검증 (2차 병합 후) | 결과 |
|---|---|
| 격리 PostgreSQL 통합 | 9개 통과 (baseline + 30개 전 prefix fingerprint 일치 · 최종 down/up · 재실행 no-op · writer fence · 기존 회귀 7). 임시 DB 잔존 0 |
| migration 계약 / deploy-risk source 계약 | 21 pass (C05 30개 순서 · C22 30개 상태 포함) / 36 pass |
| API tsc · 관련 jest | 통과 · 5 suites 71 통과, 4 skip(분류기 spec env-gated) |
| Neture tsc · 전체 Vitest | 통과 · 117개 파일 1,123개 통과. 첫 실행에서 빌드와 병렬로 돌린 `demoAccounts.test.ts` 가 5초 timeout(6.9초)으로 1건 실패했고, 단독 재실행 1.8초 통과 · 전체 단독 재실행 전부 통과를 확인했다 |
| API · Neture production build / 변경 파일 ESLint | 통과 / 0 |

## 통합 재개·자동 모집 실패 제외 (2026-10-17)

사용자가 이 공간에서 main 병합·배포를 지시하여 기존 PR #653을 재사용한다.
리뷰 지적에 따라 `closeReason=auto_target_missed`는 모든 입금·이행 예외 조회에서 제외했다.
NULL closeReason인 정상 펀딩은 유지한다. 격리 SQL에서 unpaid/pending/failed/금액 누락/불일치/미입금 이행의 6개 원장 조합을 전체 및 6종 필터에 대조했다.
관련 단위·격리 PostgreSQL 테스트 18개가 통과했고, 전 prefix fingerprint·migration down/up·writer fence 검증도 포함했다.
최종 migration 이름은 위 2차 동기화 기록의 `CreateSupplierReviewRequests1792193756961`이다.

최종 리뷰의 공급자 제출 응답 actor UUID 노출도 보완했다. 본인 조회와 제출이 같은 비운영자 projection을 사용하여 requested_by/submitted_by/resolved_by를 제거한다. 실제 handler 응답에 세 필드가 모두 없는 것을 포함한 관련 20개 테스트가 통과했다.
