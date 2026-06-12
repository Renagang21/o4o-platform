# IR-O4O-PAYMENTCORE-O4O-PAYMENTS-SCHEMA-CONTRACT-AUDIT-V1

> **유형**: Investigation / Schema Contract Audit (read-only)
> **목적**: Neture B2B canonical E2E positive smoke 의 결제 prepare 단계 오류 `relation "o4o_payments" does not exist` 원인 확정.
> **성격**: 코드/DB/migration/API/UI **무변경**. 조사 문서만.
> **상위 기준**: `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V1` · P2b/aggregation/widget CHECK
> **작성일**: 2026-06-11

---

## 1. 요약 판정 — **후보 A (o4o_payments canonical, migration 미적용). 근본 원인 = orphaned migration 디렉터리.**

`o4o_payments` 는 PaymentCore 의 canonical 결제 원장이고 entity 참조도 정확하다. 그러나 **테이블 생성 migration 이 migration 러너가 스캔하지 않는 디렉터리(`apps/api-server/src/migrations/`)에 있어 production 에 적용된 적이 없다.** → 테이블 부재 → prepare 실패.

| 후보 | 판정 |
|------|:---:|
| **A. o4o_payments canonical + migration 미적용** | ✅ **확정** (단, 누락이 아니라 **잘못된 디렉터리로 인한 미스캔/미적용**) |
| B. checkout_payments 가 canonical인데 PaymentCore 가 o4o_payments 오참조 | ❌ — entity 참조 정확(`@Entity('o4o_payments')`), checkout_payments 는 별도 역할 |
| C. migration 있으나 prod 미적용 | ✅ (A의 메커니즘 — orphaned 디렉터리) |
| D. entity/table naming drift | ❌ (entity 정확) / **디렉터리 drift 는 있음** |

> **추가 중대 발견**: PaymentCore 결제는 **KPA/Glyco/KCos/Neture B2B 4 서비스 공통** 경로다 → o4o_payments 부재는 **모든 서비스의 PaymentCore prepare/confirm 에 영향**. Neture B2B 가 처음 드러냈을 뿐, 이전엔 어느 서비스도 positive 결제 smoke 가 성공한 적이 없어 잠재화돼 있었다.

---

## 2. PaymentCore 테이블 계약 (확정)
- **canonical 결제 원장 = `o4o_payments`**:
  - `apps/api-server/src/entities/payment/PlatformPayment.entity.ts:22` → `@Entity('o4o_payments')`.
  - `TypeORMPaymentRepository`(`services/payment/adapters/TypeORMPaymentRepository.ts:40,43`) → `dataSource.getRepository(PlatformPayment)` → o4o_payments 에 prepare INSERT / confirm UPDATE.
  - `PaymentCoreService`(packages/payment-core) → repository → PlatformPayment.
- **공유 소비처**(모두 `new PaymentCoreService(new TypeORMPaymentRepository(...), ...)`):
  - `routes/kpa/controllers/kpa-payment.controller.ts`
  - `routes/glycopharm/controllers/glycopharm-payment.controller.ts`
  - `routes/cosmetics/controllers/cosmetics-payment.controller.ts`
  - `routes/neture/controllers/neture-b2b-payment.controller.ts`
  → **4 서비스 결제가 동일하게 o4o_payments 의존.**

## 3. migration 현황 (근본 원인)
- o4o_payments 생성 migration **존재**:
  - `apps/api-server/src/migrations/1771027200000-CreateO4oPaymentsTable.ts` (`CREATE TABLE IF NOT EXISTS "o4o_payments" ...`)
  - `apps/api-server/src/migrations/1771027200001-AddPaymentKeyUniqueAndStatusIndex.ts`
- **그러나 migration 러너는 이 디렉터리를 스캔하지 않는다**:
  - `src/database/connection.ts:1077-1079` — prod: `['dist/database/migrations/*.js']`, dev: `[__dirname + '/migrations/*.ts']`(= `src/database/migrations/*.ts`).
  - `src/database/migration-config.ts:64-66` — `join(__dirname,'migrations','*.{js,ts}')`(= `src/database/migrations`).
  - 두 설정 모두 **`database/migrations`** 만 스캔. **`src/migrations/` 는 어떤 migration 소스에도 등록되지 않음**(grep: 비-database/migrations 참조 0건).
- **스캔 디렉터리(`src/database/migrations/`)에는 o4o_payments 생성 migration 이 없음**(grep 0건). → typeorm_migrations 에 등록될 일이 없고, CI/CD 자동 마이그레이션이 o4o_payments 를 만들지 않음.
- 즉 **migration 파일은 있으나 "잘못된 폴더"에 있어 영구 미적용** → `o4o_payments` production 부재.

> **광범위 위험**: `src/migrations/` 에는 **40개** 파일이 orphaned 상태(스캔 dir `database/migrations` 는 498개). o4o_payments 외에도 이 40개가 모두 미적용일 수 있음 — 별도 audit 필요(§7).

## 4. production schema 확인
- 직접 SQL 은 prod 방화벽(`gcloud sql connect` 인터랙티브, psql 미설치)으로 본 IR 에서 미수행.
- **그러나 positive smoke 의 런타임 오류 `relation "o4o_payments" does not exist` 자체가 production 에 테이블이 없음을 입증**(prepare 가 o4o_payments INSERT 시도 → Postgres undefined_table). → 추가 SQL 조회 없이 부재 확정.
- typeorm_migrations 에 `CreateO4oPaymentsTable` 가 없을 것(스캔 dir 밖이라 등록 불가) — 후속 WO 에서 `gcloud sql` 로 교차 확인 권장.

## 5. checkout_payments vs o4o_payments (역할 구분)
- `o4o_payments`(PlatformPayment) = **PaymentCore 결제 거래 원장**(prepare/confirm 상태머신, transactionId/paymentKey/sourceService). 4 서비스 공통.
- `checkout_payments`(CheckoutPayment) = **checkout_order 별 결제 요약/상세**(checkoutService.completePayment 가 갱신; 별도 entity). CheckoutOrder 도메인.
- → 둘은 **역할이 다름**. o4o_payments 를 checkout_payments 로 "대체"하면 안 됨(후보 B/단순 rename 비채택). 누락된 것은 o4o_payments.

## 6. 핵심 질문 답변
1. canonical payment table? **o4o_payments**. 2. PaymentCore 가 o4o_payments 참조? **예**(PlatformPayment). 3. entity 존재? **예**. 4. 생성 migration 존재? **예, 단 orphaned dir**. 5. prod 부재가 미적용 때문? **예 — 스캔 안 되는 dir**. 6. checkout_payments 와 역할 차이? **PaymentCore 원장 vs checkout_order 결제요약**. 7. KPA/Glyco/KCos 도 동일 위험? **예(공통 의존)**. 8. Neture B2B 만의 문제? **아니오 — payment-core 전체**. 9. 수정 방향? **테이블 생성(migration 을 스캔 dir 로 이전) — 참조 수정 아님**. 10. 새 migration vs 적용? **기존 migration 을 `src/database/migrations/` 로 이전(또는 재작성)하여 CI/CD 적용**.

## 7. 후속 WO (제안)
1. **`WO-O4O-PAYMENTCORE-O4O-PAYMENTS-MIGRATION-RELOCATE-V1`**(권장) — `src/migrations/1771027200000-CreateO4oPaymentsTable.ts` + `1771027200001-AddPaymentKeyUniqueAndStatusIndex.ts` 를 **스캔 디렉터리 `src/database/migrations/`** 로 이전(class name/timestamp 정합) → main 배포 시 CI/CD 자동 적용. `CREATE TABLE IF NOT EXISTS` 라 재적용 안전. 적용 후 `gcloud sql`/로그로 o4o_payments 존재 + typeorm_migrations 등록 확인.
2. **`IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1`**(중요) — `apps/api-server/src/migrations/` 40개 파일이 모두 미적용인지, 어떤 것이 prod 에 필요한데 누락됐는지 전수 audit(o4o_payments 외 잠재 schema drift).
3. 재실행: `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V2` — o4o_payments 적용 후 prepare→Toss→confirm→paid→bridge→supplier 노출 실측.

## 8. smoke 보존
- abandoned pending: `paymentGroupId pg_08e1501d...`, `checkoutOrder 5a038670... (ORD-20260611-6689)`, amount 27000, status/paymentStatus=pending.
- o4o_payments 적용 후 이 paymentGroupId 재사용 가능 여부 확인(여전히 pending+payable 이면 prepare 재시도 가능). 불가 시 새 cart→checkout-confirm-b2b 로 V2 smoke. **본 IR 에서 결제 재시도 안 함.**

## 9. 이번 IR 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. migration 이전/생성 안 함. 결제 재시도 안 함.
다른 세션 WIP 무접촉.
```

## 10. 최종 기준 문장
`o4o_payments` 는 PaymentCore 의 canonical 결제 원장이며 entity 참조는 정확하다. 오류의 근본 원인은 **생성 migration 이 migration 러너가 스캔하지 않는 `src/migrations/` 디렉터리에 있어 production 에 적용된 적이 없다**는 것이다(스캔 dir 은 `src/database/migrations/`). 이는 Neture B2B 만이 아니라 KPA/Glyco/KCos 를 포함한 **모든 서비스의 PaymentCore 결제**에 영향한다. 수정은 테이블명 변경이 아니라 **migration 을 스캔 디렉터리로 이전하여 CI/CD 가 o4o_payments 를 생성**하는 것이며, orphaned `src/migrations/` 40개 파일 전반에 대한 별도 audit 이 필요하다.

---

*Date: 2026-06-11 · read-only IR · 코드 무변경 · 판정: 후보 A(o4o_payments canonical, orphaned-dir migration 미적용). 영향: payment-core 전체(4 서비스).*
