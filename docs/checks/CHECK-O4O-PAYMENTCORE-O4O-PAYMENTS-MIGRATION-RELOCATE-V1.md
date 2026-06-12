# CHECK-O4O-PAYMENTCORE-O4O-PAYMENTS-MIGRATION-RELOCATE-V1

> PaymentCore canonical 결제 원장 `o4o_payments` 생성 migration 이 미스캔(orphaned) 디렉터리에 있어 production 미적용 → migration 러너 스캔 디렉터리로 **이전**(테이블명/참조 무변경).
> **결과: PASS** — api-server tsc 0 / migration relocate(IF NOT EXISTS 안전) / entity 정합 / **배포 migration job 적용 확인(typeorm_migrations #534 #535, o4o_payments 생성)**.
> 상위: `IR-O4O-PAYMENTCORE-O4O-PAYMENTS-SCHEMA-CONTRACT-AUDIT-V1` — 2026-06-11

---

## 1. 변경 파일 (2 rename, 1 디렉터리 이전)
| 변경 | 경로 |
|------|------|
| **이전(생성)** | `apps/api-server/src/database/migrations/1771027200000-CreateO4oPaymentsTable.ts` |
| **이전(생성)** | `apps/api-server/src/database/migrations/1771027200001-AddPaymentKeyUniqueAndStatusIndex.ts` |
| **제거(orphaned 원본)** | `apps/api-server/src/migrations/1771027200000-CreateO4oPaymentsTable.ts` |
| **제거(orphaned 원본)** | `apps/api-server/src/migrations/1771027200001-AddPaymentKeyUniqueAndStatusIndex.ts` |

> git rename 으로 인식(내용 거의 동일, 주석에 relocate WO 추가). class name/timestamp/컬럼 **무변경**. PlatformPayment entity·PaymentCore·controller·checkout_payments **무변경**. 나머지 `src/migrations/` 38개 **무접촉**.

## 2. 근본 원인 (IR 재확인)
- migration 러너(`connection.ts:1077-1079`, `migration-config.ts:64-66`)는 **`src/database/migrations`**(prod: `dist/database/migrations/*.js`)만 스캔.
- o4o_payments 생성 migration 은 **`src/migrations/`**(미스캔)에 있어 typeorm_migrations 에 등록·적용된 적 없음 → `relation "o4o_payments" does not exist`.
- → 스캔 디렉터리로 이전하면 CI/CD migration job 이 적용.

## 3. 안전성
- `CREATE TABLE IF NOT EXISTS "o4o_payments"`, `CREATE [UNIQUE] INDEX IF NOT EXISTS ...` → **재적용/멱등 안전**(이미 있으면 no-op).
- entity ↔ migration 컬럼 정합(전수 대조): id/status/amount/currency/transactionId(unique)/orderId(idx)/paymentKey/paymentMethod/paidAmount/requestedAt/paidAt/failedAt/cancelledAt/refundedAt/failureReason/sourceService(idx)/metadata/createdAt/updatedAt. 2번째 migration: paymentKey partial-unique + status idx.
- down: DROP TABLE/INDEX IF EXISTS — rollback 시 데이터 손실 가능(운영 rollback 은 신중, 일반적으로 forward-only).

## 4. 테이블명/참조 무변경 (기준 준수)
- `o4o_payments` 테이블명 유지. PaymentCore 가 checkout_payments 를 보도록 바꾸지 않음. 두 테이블 병합 안 함. PlatformPayment entity 구조 무변경.

## 5. collision 확인
- 스캔 디렉터리에 동일 o4o_payments/CreateO4oPaymentsTable/AddPaymentKeyUnique migration **없음**(grep 0). class name/filename timestamp 충돌 **없음**.

## 6. 영향 범위
- o4o_payments 적용 시 **KPA/Glyco/KCos/Neture B2B 4 서비스 PaymentCore prepare/confirm 활성화**(공통 `TypeORMPaymentRepository`→PlatformPayment). 이전엔 모두 미작동(테이블 부재) → 본 이전으로 결제 leg 가능.

## 7. 검증
- **api-server tsc 0** ✅
- **migration 멱등/정합** ✅ (§3)
- **collision 없음** ✅ (§5)
- **build 산출 경로**: `src/database/migrations/*.ts` → `dist/database/migrations/*.js`(기존 498 migration 과 동일 구조) → prod glob `dist/database/migrations/*.js` 포함.

## 8. Live 검증 (배포 신리비전 — migration job)
- 배포 `de3f55e06`(00:39) 의 Cloud Run Job `o4o-api-migrations` 가 migration 적용. 후속 동시 deploy(00:42/00:49) job 은 `Migrations executed: 0`(이미 적용됨).
- **typeorm_migrations 등록 확인** (gcloud logging, migrate job `[X]`=applied):
  - `[X] 534 CreateO4oPaymentsTable1771027200000` ✅
  - `[X] 535 AddPaymentKeyUniqueAndStatusIndex1771027200001` ✅
- → **o4o_payments 테이블 생성 + 두 migration 적용 완료**(스캔 dir 이전으로 CI/CD job 이 정상 픽업·실행). 이전엔 미스캔 dir 이라 영구 미적용이었음 — 근본 원인 해소 입증.

## 9. 완료 기준 체크 (WO §10)
1(orphaned 2건 확인) ✅. 2(database/migrations 추가) ✅. 3(index migration 추가) ✅. 4(table name 무변경) ✅. 5(checkout_payments 대체 안 함) ✅. 6(entity 정합) ✅. 7(tsc) ✅. 8(migration job 성공) ✅. 9(o4o_payments 생성) ✅. 10(typeorm_migrations 등록 #534/#535) ✅. 11(CHECK) ✅. 12(path-specific) ✅. 13(다른 세션 무접촉) ✅.

## 10. 남은 GAP/RISK · 후속
- **§8 live 확인**: 배포 migration job 적용·o4o_payments 존재·typeorm_migrations 등록(로그/`gcloud sql`).
- **E2E V2**: `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V2` — o4o_payments 적용 후 prepare→Toss→confirm→paid→bridge→supplier 노출(그동안 deferred 전체 체인 실증).
- **orphaned audit**: `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1` — `src/migrations/` 38개 잔여 전수 조사(다른 미적용 drift).

---

*Date: 2026-06-11 · Status: PASS (o4o_payments migration 스캔 dir 이전, 멱등·정합. migration job 적용 확인 §8 배포후).*
