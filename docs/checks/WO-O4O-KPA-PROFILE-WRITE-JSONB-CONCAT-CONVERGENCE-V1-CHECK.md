# WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1 — CHECK

- **일자**: 2026-08-12
- **범위**: KPA 회원·프로필 수정 경로의 `users."businessInfo"` JSONB write 수렴
- **선행**: `WO-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1` (695b96cdb, read 정렬)
- **운영 DB write**: 없음 (read-only 검증만) / **migration**: 없음 / **배포**: 없음

---

## 1. write 경로별 기존 갱신 방식과 유실 가능성

전수 조사 기준: `UPDATE users SET "businessInfo"` raw SQL + ORM 경유 `businessInfo` 대입.

| # | 경로 | 파일 | 기존 방식 | 유실 가능성 |
|---|------|------|----------|------------|
| P1 | KPA 운영자 `PATCH /kpa/members/:id/info` | `routes/kpa/controllers/member.controller.ts` | SELECT → 스냅샷 spread → `SET "businessInfo" = $1::jsonb` **전체 교체** | lost update(전 키) + `metadata` 통째 재생성 |
| P2 | 본인 `PATCH /auth/me/profile` | `modules/auth/controllers/auth-account.controller.ts` | SELECT → `{...existing, ...sanitized}` → **전체 교체** | lost update(전 키) + `storeAddress` 최상위 통째 교체 |
| P3 | 공통 운영자 `PUT /operator/members/:userId` | `controllers/operator/MembershipConsoleController.ts` | SELECT → `{...existing, ...bizFields}` → **전체 교체** | lost update(전 키) + **`storeAddress` 파괴적 재생성** |
| P4 | KPA 마이페이지 `PUT /kpa/mypage/profile` | `routes/kpa/services/mypage.service.ts` | `findOne` → `updateData.businessInfo = {...bi, metadata:{...}}` → ORM **전체 교체** | lost update(전 키) + `metadata` 통째 재생성 |

**P4 는 WO 의 대상 4항목에 명시되지 않았으나 포함했다.** P1 과 **같은 `metadata` 객체**를 쓰기
때문이다 (P1=`metadata.pharmacy_phone`, P4=`metadata.workplace`). P4 를 제외하면 WO 검증 3번
(한 경로 수정으로 다른 경로 키 유실)이 그대로 남는다.

### 실측 근거 (프로덕션 `o4o_platform`, read-only)

- `businessInfo` 보유 21명 / 비객체 0건
- `metadata` 객체 보유 2명 — 하위 키 `pharmacy_phone` 2, **`workplace` 1** (형제 키가 실재)
- `storeAddress` 객체 보유 11명 — `baseAddress` 11, `detailAddress` 9, **`zipCode` 6**
- P3 의 파괴적 재생성: 상세주소만 수정해도 `baseAddress ← ''`, `zipCode` 키 소멸
  (`baseAddress: address1 || ''` + 조건부 spread 구조)

---

## 2. 경로별 소유 키와 변경 허용 키

| 경로 | 변경 허용(요청이 명시할 때만) | 절대 미변경 |
|------|------------------------------|------------|
| P1 | `businessNumber` `contactName` `zipCode` `address` `address2` `ownerPhone` `ceoName` `taxInvoiceEmail` / 중첩 `metadata.pharmacy_phone` | legacy alias(`representativeName` `taxEmail`), `storeAddress`, `metadata.workplace`, 미지 키 |
| P2 | allowedFields 목록(기존 그대로) / 중첩 `storeAddress.*` | 허용 목록 밖 전부, `metadata.*`, 미지 키 |
| P3 | `businessName` `businessNumber` `businessType` `businessCategory` `ceoName` `contactName` `taxInvoiceEmail` `pharmacyPhone` `managerPhone` `zipCode` `address` `address2` / 중첩 `storeAddress.{zipCode,baseAddress,detailAddress}` | `metadata.*`, 미지 키 |
| P4 | 중첩 `metadata.workplace` | 그 외 전부(`metadata.pharmacy_phone` 포함) |

canonical 키 결정·legacy 삭제는 **하지 않았다** (WO 제약). P3 는 legacy `pharmacyPhone` 을
기존대로 최상위에 쓴다.

---

## 3. 적용한 JSONB 부분 갱신 방식

신설: `apps/api-server/src/utils/business-info-write.ts`

```sql
-- 최상위: 기존 값에 patch 를 concat (요청이 명시한 키만 params 로)
CASE WHEN jsonb_typeof("businessInfo"::jsonb) = 'object' THEN "businessInfo"::jsonb ELSE '{}'::jsonb END || $n::jsonb
-- 중첩: 해당 객체의 현재값에만 concat (형제 하위 키 보존)
jsonb_set(<위 결과>, '{metadata}',
  CASE WHEN jsonb_typeof("businessInfo"::jsonb -> 'metadata') = 'object'
       THEN "businessInfo"::jsonb -> 'metadata' ELSE '{}'::jsonb END || $m::jsonb, true)
```

- 애플리케이션 스냅샷을 되쓰지 않는다 → **병합용 사전 SELECT 제거**, lost update 소멸
- 값은 전량 파라미터 바인딩, 키 이름은 `^[A-Za-z0-9_]+$` 화이트리스트 (CLAUDE.md §7 Guard Rule 2)
- 같은 키를 root/nested 양쪽에 넣으면 즉시 오류 (의도 모호 차단)

### 컬럼 타입 발견 (중요)

`users."businessInfo"` 의 실제 타입은 **`json`** 이다 (`jsonb` 아님). 실측:

```
information_schema.columns → data_type = json, udt_name = json
pg_cast: json→jsonb / jsonb→json 모두 castcontext = 'a' (assignment)
```

그래서 기존 `SET "businessInfo" = $1::jsonb`(P1)는 assignment cast 로 **동작하지만**,
저장소 곳곳의 아래 패턴은 **런타임 실패**한다 (COALESCE 는 implicit cast 만 사용).

```
ERROR: COALESCE could not convert type jsonb to json
```

본 WO 표현식은 읽을 때 `::jsonb` 명시 캐스트, 마지막에 `::json` 으로 되돌려 이 문제를 피한다.

---

## 4. 중첩 객체 · null · 빈 문자열 처리

- **중첩**: `metadata` / `storeAddress` 는 `jsonb_set` + 하위 concat → 형제 하위 키 보존.
  `metadata` 가 객체가 아니면(스칼라·null) 빈 객체로 방어 (`jsonb ||` 스칼라 오류 회피).
- **null**: 기존 계약 유지. P1 의 `value || null`, P4 의 `workplace || null` 은 그대로
  JSON `null` 저장이며 **키 삭제가 아니다**. 본 모듈은 키 삭제를 하지 않는다.
- **빈 문자열**: 기존 계약 유지. 단 **P3 의 `storeAddress` 하위 키 1건만 정규화**했다.
  기존에는 전체 교체 부작용으로 빈 값이 "키 소멸"이었는데, 부분 병합에서 그대로 두면
  **상세주소 지우기가 동작하지 않는다**. 그래서 같은 핸들러의 최상위 키(`address2`)와
  동일하게 "보낸 값 그대로 저장(`''`)"으로 맞췄다. 읽기는 `resolveKpaBusinessContact` 의
  `pick()` 이 `''` 를 부재로 처리하므로 **표시 결과는 동일**하다.
- **값 부재**: 요청에 키가 없으면 patch 미포함 → DB 값 그대로 보존 (모든 경로 공통).
- P2 에서 `storeAddress: {}` (빈 객체) 는 이제 "변경 없음"이다 (이전에는 전체 교체로 초기화).
  객체가 아닌 `storeAddress`(예: `null`)는 기존대로 최상위 값으로 저장한다.

---

## 5. transaction 경계와 실패 주입 결과

| 경로 | 경계 | 실패 주입 |
|------|------|----------|
| P1 | 기존 단일 transaction 유지 (kpa_members / users scalar / businessInfo / profile / role 회수) | 중간 실패 시 commit 0 · rollback 1 · 500 (기존 테스트 유지) |
| P2 | 기존 단일 transaction 유지 | transaction 1회 호출 고정 |
| P3 | scalar 컬럼 + businessInfo 를 **단일 UPDATE statement** 로 유지 (statement 원자성) | 단일 statement 이므로 부분 반영 불가 |
| P4 | **신규**: scalar update + businessInfo write 를 단일 transaction 으로 묶음 | 주입 실패 시 commit 0 · rollback 1 · transaction 밖 users write 0건 |

P4 의 `university → kpa_members` 는 기존 계약대로 best-effort(실패 삼킴)이므로 **의도적으로
transaction 밖**에 두었다. PostgreSQL 에서 실패 statement 를 같은 transaction 안에 넣으면
catch 해도 transaction 전체가 오염되기 때문이다.

### 범위 외 잔여 (수정하지 않음, 보고만)

- P3 는 `service_memberships.role` 변경 · 비밀번호(service_credentials) 변경 · users UPDATE 가
  서로 다른 statement 로 나가며 transaction 이 없다. 비밀번호 실패 시 role 변경은 이미 반영된 채
  오류 응답이 된다. **JSONB 축이 아니고** `changeMemberServicePassword` 가 자체 connection 을
  쓰므로 본 WO 에서 손대지 않았다 → 별도 WO 제안.

---

## 6. 보존 테스트 · 회귀 테스트 · typecheck

### 실 PostgreSQL 보존 검증 (프로덕션 엔진, read-only SELECT · UPDATE 없음)

헬퍼가 생성한 **실제 표현식**에 sentinel 키를 넣어 평가. 6 케이스 전부 보존 확인.

| 케이스 | 결과 |
|--------|------|
| C1 주소만 수정 | `sentinelRoot` · `metadata.*` · `storeAddress.*` 전부 보존 |
| C2 `metadata.pharmacy_phone` 수정 | **`metadata.workplace` 보존** |
| C3 `metadata.workplace` 수정 | **`metadata.pharmacy_phone` 보존** |
| C4 `storeAddress.detailAddress` 수정 | **`zipCode` · `baseAddress` 보존** (기존 구현은 `baseAddress` 를 `''` 로 파괴) |
| C5 상세주소 빈 문자열 | 지우기 동작 + 형제 키 보존 |
| C6 최상위 + `storeAddress` 하위 일부 | 양쪽 각각 부분 갱신, 나머지 보존 |

- NULL / `{}` / 비객체(`"scalar"`) 입력에서도 오류 없이 정상 결과

### 자동화 테스트

| 파일 | 건수 |
|------|-----|
| `utils/__tests__/business-info-write.test.ts` (신규) | 14 |
| `routes/kpa/controllers/__tests__/member.controller.businessInfoWrite.test.ts` (신규) | 7 |
| `controllers/operator/__tests__/MembershipConsoleController.businessInfoWrite.test.ts` (신규) | 8 |
| `modules/auth/controllers/__tests__/auth-account.businessInfoWrite.test.ts` (신규) | 7 |
| `routes/kpa/services/__tests__/mypage.service.businessInfoWrite.test.ts` (신규) | 7 |
| 기존 `member.controller.writeAtomicity.test.ts` | 보존 판정만 신계약으로 갱신 |

영향 범위 일괄 실행 `src/routes/kpa src/controllers/operator src/modules/auth src/utils`:
**18 suites / 268 tests 전부 PASS.**

- 직전 WO 의 dual-read 회귀(`businessInfoRead.test.ts`, `member.controller.businessInfoRead.test.ts`) 포함 PASS
- 기존 원자성 계약(`writeAtomicity`) PASS

### typecheck / lint

- `tsc --noEmit`: 본 WO 변경 파일 오류 **0건**
- 잔여 1건은 **본 변경과 무관한 기존 실패**:
  `src/middleware/kpa-branch-scope.middleware.ts(44,3) TS2322: '"kpa-branch"' is not assignable to type 'ServiceKey'`
  → 도입 커밋 `958f84542` (kpa-branch SaaS 기반 구축, 다른 WO). `ServiceKey`(`src/types/roles.ts`)에
  `kpa-branch` 가 없다. CLAUDE.md 중지 조건("현재 변경과 무관한 build 실패")에 따라 **미수정 · 보고**.
- eslint: 변경 파일 오류 0건

---

## 7. migration · 운영 DB write · 배포

- **migration 없음** · **신규 테이블/컬럼 없음** · **backfill 없음**
- **운영 DB write 없음** — Cloud SQL Auth Proxy 경유 read-only SELECT 만 수행
  (컬럼 타입 확인 / 키 분포 실측 / 표현식 평가)
- **배포 없음**

---

## 8. 범위 외 발견 (수정 안 함 · 별도 WO 제안)

1. **`COALESCE("businessInfo",'{}'::jsonb) || $2::jsonb` 패턴 4곳이 프로덕션에서 실패한다.**
   컬럼이 `json` 이라 COALESCE 타입 해석이 안 된다. Cloud Run 로그 실측:
   `2026-07-23T12:50:36Z / 12:51:22Z — error: COALESCE could not convert type jsonb to json`
   - `routes/o4o-store/controllers/pharmacy-info.controller.ts:349` — **try/catch 로 삼킴**
     (P2/P4 사업자 필드가 저장되지 않고 `console.error` 만 남음)
   - `routes/glycopharm/controllers/mypage.controller.ts:288`
   - `routes/cosmetics/controllers/cosmetics-mypage.controller.ts:202`
   - `modules/neture/services/supplier.service.ts:1159`
   → 다른 서비스 계약이라 본 WO 제약("다른 서비스 프로필 write 계약 미변경")에 따라 손대지 않음.
   본 WO 의 `buildBusinessInfoUpdate` 를 그대로 재사용하면 해소된다.
2. `auth-register.controller.ts:265,921` · `services/account-linking.service.ts:555` 도
   read-modify-write 전체 교체다. 가입·계정 병합 경로라 본 WO 대상 아님.
3. P3 의 다중 statement 비원자성 (위 §5 잔여).

---

## 9. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (§8)
