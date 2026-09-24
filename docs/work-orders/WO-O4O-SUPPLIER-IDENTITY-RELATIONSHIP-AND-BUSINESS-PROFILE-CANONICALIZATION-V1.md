# WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1

> **상태:** READY FOR EXECUTION · HANDOFF ONLY · 구현 WO · 실행 착수는 별도 명시 지시
> **기준 코드:** 작성 시점 `origin/main` `f8f077e3e`. 실행은 항상 최신 `origin/main` 에서 시작하며 과거 커밋으로 reset/rebase 하지 않는다
> **선행 조사:** [`IR-O4O-SUPPLIER-IDENTITY-BUSINESS-PROFILE-CANONICALIZATION-V1`](../investigations/IR-O4O-SUPPLIER-IDENTITY-BUSINESS-PROFILE-CANONICALIZATION-V1.md)(`f8f077e3e`) — 재조사하지 않는다
> **선행 CLOSED(재판단 안 함):** SUPPLIER_PRODUCT_REGISTRATION · SUPPLIER_POST_REGISTRATION_PRODUCT · ORDER_PAYMENT_FULFILLMENT
> **한 줄:** Supplier 인가의 출발점을 `neture_suppliers.user_id` 에서 **`user → organization_members → organization → supplier profile`** 로 옮기고, Business Identity 의 SSOT 를 **Organization** 으로 정렬한다. **운영 데이터 복구는 마지막 단계에서 사용자 승인 후에만.**

---

# 0. 확정 정책 — 이 WO 에서 다시 판단하지 않는다

```text
1.  Supplier authorization SSOT
      user → organization_members → organizations(type='supplier') → neture_suppliers.organization_id

2.  neture_suppliers.user_id = LEGACY compatibility pointer. canonical authorization 에 쓰지 않는다.

3.  1 User : N Supplier 지원.
      supplier org 1개 → 자동 resolve 가능
      여러 개       → explicit organization/supplier context 필요
      LIMIT 1 임의 선택 = 금지

4.  Organization = 공통 Business Identity SSOT
      상호 · 사업자등록번호 · 대표자 · 사업장 주소 · 업태/종목 · 사업자유형 · 개업일 · 통신판매업 법적정보

5.  NetureSupplier = Neture service-specific Supplier profile
      status · 담당자 · 공개 연락처(+visibility) · 배송정책 · 주문조건 · 서비스 프로필

6.  users.businessInfo = 가입 입력 snapshot
      Supplier profile read/write SSOT 에서 제거 · **타 서비스 key 물리 삭제 금지**

7.  Supplier onboarding/sensitive = 정산계좌 · 정산담당자 · 세금계산서 이메일 · 제출 문서

8.  PATCH /supplier/profile 의 3원장 비트랜잭션 write 제거.
      canonical owner 별 write 로 정렬하고, 한 operation 이 여러 canonical resource 를
      반드시 바꿔야 하면 **transaction 으로 atomic** 처리.

9.  user_id NULL 때문에 businessEntityType/businessStartDate write 가 silent skip 되는 경로 제거.
      **silent success 금지.**

10. Regulated Category = Supplier qualification ledger 로 유지. Product registration gate 연결은 범위 밖.

11. Operator = 승인/검토 · Admin = 관계 governance(정지·재활성). 기존 경계 유지.

12. 기존 운영 Supplier 3건 data repair 는 구현 마지막 단계까지 **금지**. mapping 은 AMBIGUOUS 유지.

13. Phase J 진입 시 **STOP** — 사용자에게 각 Supplier 의 실제 Google User owner 를 확인받은 뒤에만
      organization_members owner 생성 · (필요 시) compatibility user_id 설정 · authenticated smoke.

14. '공급자 테스트' 행(`91169739`)도 사용자의 KEEP/DELETE 결정 전 **삭제 금지**.

15. 신규 Supplier 가입은 처음부터 organization_members owner 를 canonical relation 으로 생성한다.
      **user_id pointer 존재 여부와 무관하게 authorization 이 성립해야 한다.**

16. DB migration 은 가능한 한 마지막. 우선 **migration 0** 으로 canonical authorization/read/write 를
      전환하고, 안정화 후 representativeName/businessType/businessItem 이관 및 user_id 물리 제거를 판정한다.
```

## 0.1 다른 세션 보호

다중 세션이 `main` 에 직접 커밋한다. `git fetch origin` → `git status -sb` 후 착수, 타 세션의 dirty · 미추적 파일 불가침, path-specific stage · `git commit -- <paths>` 만 사용. 동일 WO 가 이미 origin 에 push 돼 있으면 그 정본을 유지하고 결함만 전달한다.

---

# 1. 왜 이 순서인가

IR §9 실측: 운영 3건은 `user_id` NULL · **org owner membership 0건** · `created_by_user_id` NULL · `metadata` 비어 있음 → **소유자를 결정할 근거가 DB 에 없다**. 그래서 **코드 정비는 소유자를 몰라도 대부분 진행할 수 있고**, 운영 데이터에 손대는 순간에만 사용자 확인이 필요하다.

```text
A~H  코드/관계/SSOT 전환 + 테스트   (migration 0 · 운영 데이터 접촉 0)
I    배포
J    STOP → 사용자 승인 → production relationship repair
K    authenticated Supplier smoke        ← J 없이는 영구 불가
L    선택 migration 판정
M    CHECK
```

---

# 2. 구현 범위 A~M (한 묶음 · 작은 WO 로 나누지 않는다)

## A. Relationship authorization 전환 (정책 1·2·15)

대상: `apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts`
(`createRequireActiveSupplier` · `createRequireLinkedSupplier` — 현재 `SELECT id, status FROM neture_suppliers WHERE user_id = $1 LIMIT 1`)

**새 resolve 순서** (공통 resolver 1개로 추출 권장):

```text
1) canonical:  user → organization_members(active · left_at IS NULL)
                    → organizations(type='supplier')
                    → neture_suppliers(organization_id)
2) fallback :  neture_suppliers.user_id = user  ← compatibility pointer (정책 2)
               · 사용 시 logger.warn 로 관측 가능하게 남긴다(무성 fallback 금지)
```

- 두 경로가 **서로 다른 supplier 집합**을 주면 canonical 을 우선하고 차이를 warn 로그로 남긴다.
- `requireLinkedSupplier`(read) / `requireActiveSupplier`(write · `status='ACTIVE'`) 의 **기존 응답 계약**(401 `UNAUTHORIZED` · 403 `NO_SUPPLIER` · 403 `SUPPLIER_NOT_ACTIVE` + `currentStatus`)은 **불변**. 기존 회귀 테스트(`neture-identity.middleware.test.ts`)가 그대로 통과해야 한다.
- `organization_members` 의 어떤 `role` 이 공급자 업무 권한인지 착수 시 census 해 확정한다(최소 `owner`). 역할 어휘를 새로 만들지 않는다.

## B. Multi-Supplier context (정책 3)

```text
supplier org 0개 → 403 NO_SUPPLIER (기존)
supplier org 1개 → 자동 resolve (기존 UX 불변)
supplier org N개 → explicit context 필수
                   미지정 시 409 SUPPLIER_CONTEXT_REQUIRED + { candidates: [{supplierId, organizationId, name}] }
```

- context 전달은 **기존 선례 재사용**: `x-organization-id` 헤더 또는 `?organizationId=` (repo 내 signage 축이 이미 이 패턴을 쓴다). **새 전달 규약을 발명하지 않는다.**
- 지정된 organization 이 그 user 의 membership 집합에 없으면 **403**(스푸핑 금지 · CLAUDE.md §7 Guard Rule #4 정신).
- **`LIMIT 1` 임의 선택 금지** — 후보가 여러 개인데 하나를 고르는 코드가 남으면 안 된다(소스 계약 테스트로 고정).
- 프런트: 후보 1개면 현행 UX 그대로. 여러 개일 때 선택 UI 는 **최소**로 — 새 전역 상태 프레임워크를 만들지 않는다.

## C. Registration path 정렬 (정책 15)

대상: `supplier.service.ts` `registerSupplier()` + `syncSupplierOrganization()`

- 신규 가입은 **반드시** `organization_members` owner 를 만들고, 그것만으로 authorization 이 성립해야 한다.
- `user_id` 는 호환 목적상 **계속 기록**한다(정책 2 — 제거는 L 단계 판정).
- **`USER_ALREADY_HAS_SUPPLIER`(409) 재검토** — 정책 3(1:N 지원)과 충돌한다. 착수 시 다음 중 택해 CHECK 에 근거를 적는다:
  - (C-1) 같은 사용자의 **추가 supplier 조직 등록을 허용**하고 409 를 제거 · 대신 같은 사업자번호/조직 중복만 막는다.
  - (C-2) 이번에는 등록 UX 를 바꾸지 않고 409 를 유지하되, **데이터 모델·인가는 N 을 지원**하도록만 한다(운영자/Admin 이 두 번째 조직을 붙이는 경로는 후속).
  - 권장 **(C-2)** — 이 WO 의 무게중심은 인가 전환이고, 가입 UX 변경은 회귀면이 넓다.
- `syncSupplierOrganization` 의 `if (supplier.userId)` 조건 때문에 **owner 가 안 만들어지는 분기**를 제거한다(정책 9 의 형제 문제).

## D. Business Profile SSOT (정책 4·5)

- **읽기 SSOT 고정**: 상호·사업자번호·주소는 `organizations`. `users.businessInfo` 를 읽지 않는다.
- `representativeName` · `businessType` · `businessItem` 은 **이번엔 이동하지 않는다**(정책 16 · migration 0). 현재 위치(`neture_suppliers`)에서 읽되, **Organization 이 최종 SSOT 임을 코드 주석과 CHECK 에 명시**하고 L 단계 판정 대상으로 남긴다.
- `businessEntityType` · `businessStartDate` 는 **Organization 으로 이관**한다. 현재 `users.businessInfo` 에 쓰는데 **키 자체가 저장된 적이 없다**(IR §5). 저장 위치가 없다면 `organizations.metadata` 또는 기존 컬럼 재사용으로 **migration 0** 해결이 가능한지 착수 시 확인하고, 불가하면 중지 조건 C.

## E. Profile / Onboarding ownership 정렬 (정책 7)

- `taxInvoiceEmail` 이 `PATCH /supplier/profile` 과 `PATCH /supplier/onboarding` **양쪽**에 있다 → **onboarding 소유로 단일화**하고 profile 입력에서 제거(응답에는 남겨도 무방 · read 는 유지).
- 정산 5필드 · 통신판매업 2필드 · 문서는 onboarding 유지. 통신판매업의 Organization 이관은 **정책 판단 보류**(IR P3) — 이번엔 옮기지 않는다.

## F. Atomic write (정책 8)

`updateSupplierProfile()` 이 현재 **트랜잭션 없이** `organizations` → `neture_suppliers` → `users.businessInfo` 순차 write 한다(IR R3).

- canonical owner 별 write 로 정렬한 뒤, 한 요청이 **여러 canonical resource 를 반드시 바꿔야 하면 단일 트랜잭션**으로 묶는다(`dataSource.transaction`).
- 부분 성공 상태(`organizations` 만 저장 / `neture_suppliers` 실패)가 남지 않아야 한다 — 테스트로 고정.

## G. `users.businessInfo` Supplier runtime 은퇴 (정책 6·9)

- Supplier profile **read** 경로에서 제거 · **write** 경로에서 제거.
- `if (supplier.userId)` 뒤에서 조용히 skip 되던 경로 제거 → **silent success 금지**(정책 9). 쓸 위치가 없으면 명시적 오류이거나 애초에 쓰지 않는다.
- **물리 삭제 0** — `storeAddress` 등 매장 축 키가 같은 컬럼에 있어 타 서비스 영향(IR P6). 이 WO 는 Supplier runtime 에서의 역할만 종료시킨다.
- `utils/business-info-write.ts`(json≠jsonb 함정 정본)는 **다른 소비처가 있으므로 삭제하지 않는다** — Supplier 경로에서 호출만 끊는다.

## H. 테스트

```text
[인가 · A]
org owner membership 만 있고 user_id NULL → 정상 진입(canonical)         ← 현재 운영 상태의 해소 증명
user_id 만 있고 membership 없음           → fallback 진입 + warn 로그
둘 다 없음                                 → 403 NO_SUPPLIER
status PENDING                             → write route 403 SUPPLIER_NOT_ACTIVE + currentStatus
기존 middleware 테스트 4종 그대로 통과

[multi-context · B]
supplier org 1개  → 자동 resolve
supplier org 2개 + context 미지정 → 409 SUPPLIER_CONTEXT_REQUIRED + candidates
supplier org 2개 + 유효 context   → 해당 supplier 로 resolve
내 membership 밖 organizationId 지정 → 403 (스푸핑 금지)
소스 계약: supplier resolve 경로에 `LIMIT 1` 임의 선택 0

[등록 · C]
신규 가입 → organization_members owner 생성 · user_id 존재 여부와 무관하게 authorization 성립

[SSOT · D·G]
profile read 가 organizations 를 읽는다 · users.businessInfo 를 읽지 않는다(소스 계약)
profile write 가 users.businessInfo 를 쓰지 않는다(소스 계약)
businessEntityType/businessStartDate 가 silent skip 되지 않는다

[atomic · F]
profile 저장 중간 실패 → 어떤 원장도 부분 반영되지 않는다(롤백 실증)

[경계 유지 · 11]
Operator 승인/검토 route · Admin 정지/재활성 route 의 guard 불변(회귀)
```

`AUTHENTICATED_SUPPLIER_SMOKE` 는 J 이전에는 불가하다 — H 는 전부 **자동 테스트**로 성립해야 한다.

## I. 배포

backend 중심. 프런트 변경(B 의 context 선택 UI)이 있으면 같은 완료 흐름에서 배포. **운영 데이터 write 0.**

## J. **STOP → 사용자 승인된 production relationship repair** (정책 12·13·14)

> **여기서 반드시 멈추고 보고한다.** 사용자가 각 Supplier 의 실제 Google User owner 를 지정하기 전에는 **어떤 UPDATE/INSERT/DELETE 도 하지 않는다.**

승인 후 순서(각 supplier 별):

```text
① 사용자로부터 owner 이메일 확인
② 해당 Google 계정의 users 행 존재 확인 (없으면 사용자가 먼저 로그인 — 계정 생성 대행 금지)
③ organization_members(organization_id, user_id, role='owner') INSERT   ← canonical
④ (호환) neture_suppliers.user_id UPDATE
⑤ 건별 read-only 검증 후 다음 건
```

- `91169739`("공급자 테스트")는 **KEEP / DELETE 를 사용자가 결정**하기 전까지 손대지 않는다(정책 14).
- PENDING 1건(`5de3098e`)은 승인 절차와 함께 판단한다.
- **추측 연결 금지** — `approved_by`(운영자) · 과거 문서의 이메일을 근거로 자동 연결하지 않는다.

## K. Authenticated Supplier smoke

J 완료 후에만 가능. 최소: 로그인 → `/supplier/dashboard` 진입 → `GET /supplier/profile` 200 → (쓰기 1건은 사용자 승인 하에) → 로그아웃. J 가 승인되지 않으면 `AUTHENTICATED_SUPPLIER_SMOKE = PENDING` 으로 기록하고 **그 사유만으로 완료를 막지 않는다**.

## L. 선택 migration 판정 (정책 16)

안정화 후 판정만 하고, 실행이 필요하면 **그 자체를 별도 migration WO** 로 분리한다:

- `representativeName` · `businessType` · `businessItem` → Organization 이관
- `neture_suppliers.user_id` 물리 제거
- `organizations.type='supplier'` 7 vs `neture_suppliers` 3 의 **고아 org 4건** 처분(IR R7)

## M. CHECK 작성

---

# 3. 하지 않는 것

```text
users.businessInfo 물리 삭제 · 타 서비스 key 정리        (IR P6 · 범위 밖)
utils/business-info-write.ts 삭제                        (다른 소비처 존재)
Regulated Category 를 제품 등록 gate 에 연결             (정책 10)
Operator/Admin 권한 경계 변경 · 역할 어휘 신설           (정책 11)
User↔Supplier 다대다 전용 테이블 신설                    (organization_members 로 충분)
승인 전 운영 데이터 write · '공급자 테스트' 삭제          (정책 12·14)
representativeName/businessType/businessItem 이관        (정책 16 · L 판정)
user_id 물리 제거                                        (정책 16 · L 판정)
Product/Order/Payment/Fulfillment 축 재개                (CLOSED)
새 전역 context 프레임워크 · 새 권한 모델
```

---

# 4. 중지 조건

| # | 조건 |
|---|---|
| A | `organization_members` 의 role 어휘로 "공급자 업무 권한" 을 표현할 수 없음(예: owner 외 역할 정의가 필요) |
| B | canonical resolve 와 fallback 이 **서로 다른 supplier** 를 주는 실데이터가 발견됨(운영 판단 필요) |
| C | `businessEntityType`/`businessStartDate` 를 migration 0 으로 Organization 에 저장할 자리가 없음 |
| D | `taxInvoiceEmail` 단일화가 기존 onboarding/profile 소비처를 깨뜨림 |
| E | atomic write 전환이 `organizations` 를 쓰는 **타 서비스 경로**와 락 경합/회귀를 일으킴 |
| F | 등록 409 제거(C-1)가 필요한데 그 영향이 가입 UX 전반으로 번짐 |
| G | J 단계에서 사용자가 지정한 owner 의 users 행이 없고 로그인도 불가 |
| H | DB migration 이 A~I 단계에서 반드시 필요해짐(정책 16 위반) |
| I | package/lockfile 구조 변경 필요 · 타 세션 동일 파일 충돌 |

---

# 5. 검증

| 항목 | PASS 기준 |
|---|---|
| 인가 전환 | §2-H [인가] 전부 PASS · 기존 middleware 테스트 4종 불변 |
| multi-context | §2-H [multi-context] 전부 PASS · `LIMIT 1` 임의 선택 0(소스 계약) |
| 등록 | 신규 가입이 owner membership 을 만든다 · user_id 무관하게 authorization 성립 |
| SSOT | profile read/write 에 `users.businessInfo` 참조 **0**(소스 계약) · organizations 읽기 확인 |
| atomic | 부분 반영 0(롤백 실증) |
| silent skip | `if (supplier.userId)` 뒤 무성 skip 경로 **0** |
| 경계 유지 | Operator/Admin guard 회귀 0 · Product/Order 축 파일 접촉 0(`git diff --stat`) |
| migration | A~I 단계 **DDL 0** |
| 빌드·정적 | `pnpm --filter @o4o/api-server build` · 영향 subset jest · `node scripts/lint-ratchet.mjs` |
| 운영 데이터 | J 승인 전 write **0**(read-only count before/after 동일) |

로컬 팁: api-server 전체 jest 는 `NODE_OPTIONS=--max-old-space-size=6144 npx jest --maxWorkers=1`. 커밋 메시지에 백틱 쓰지 말 것(셸 확장) — `-F` 파일 사용.

---

# 6. 완료 보고 (CHECK 필수 항목)

1. 최종 authorization resolve 경로 · fallback 동작·로그 · 응답 계약 불변 증명
2. multi-Supplier context 계약(전달 방식 · 409 shape · 403 스푸핑 차단)
3. 등록 경로 변경 · C-1/C-2 선택과 근거
4. Business Profile 최종 read/write owner 표
5. `users.businessInfo` Supplier runtime 은퇴 증명(소스 계약) · 물리 삭제 0
6. atomic write 전환 · 롤백 실증
7. silent skip 제거 증명
8. 테스트 결과(§2-H 전수) · 실패/건너뜀 원문
9. Operator/Admin · Product/Order 축 무접촉 증명
10. 배포 결과
11. **J 단계 상태** — 사용자 승인 여부 · 미승인이면 `PRODUCTION_RELATIONSHIP_REPAIR = PENDING(사용자 확인 대기)` 와 3건의 AMBIGUOUS 유지 기록
12. `AUTHENTICATED_SUPPLIER_SMOKE` 결과 또는 PENDING 사유
13. L 판정 결과(이관·user_id 제거·고아 org 4건) — 실행 0 · 제안만
14. 중지 조건 A~I 발동 여부
15. 문서 정합 · commit hash · `HEAD == origin/main`

> **이 WO 완료 시점에 Supplier Identity / Business Profile 축이 닫힌다.** 단 J 가 미승인이면 그 한 항목만 열린 채로 남고, 나머지는 재개하지 않는다.
