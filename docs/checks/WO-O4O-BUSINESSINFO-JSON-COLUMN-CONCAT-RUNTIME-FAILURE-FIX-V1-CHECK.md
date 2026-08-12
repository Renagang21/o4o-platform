# WO-O4O-BUSINESSINFO-JSON-COLUMN-CONCAT-RUNTIME-FAILURE-FIX-V1 — CHECK

- **일자**: 2026-08-12
- **범위**: `users."businessInfo"` 가 `json` 컬럼인데 `jsonb` concat 을 적용해 프로덕션 저장이 실패하던 경로 수정
- **선행**: `WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1` (493f8ebe7) — 공통 헬퍼 신설
- **운영 DB write**: 없음(SQL 직접) / 단, 검증 9의 **API runtime smoke** 는 테스트 계정 1건 실제 저장 후 원복
- **migration**: 없음 / **backfill**: 없음

---

## 1. 실패 경로와 실제 컬럼 타입

### 컬럼 타입 전수 (프로덕션 `o4o_platform`, read-only)

`information_schema` 기준 **`json` 타입 컬럼은 DB 전체에 9개뿐**이다.

```
ai_query_logs.attached_info / ai_query_logs.context_data
email_logs.attachments / email_logs.metadata / email_logs.response
linked_accounts.providerData
operator_notification_settings.notifications
users.businessInfo          ← 유일하게 jsonb concat 이 적용되던 컬럼
users.permissions
```

나머지 JSON 컬럼(`neture_orders.metadata`, `*.raw_payload`, `dispatch_log`,
`organizations.metadata`, `store_multilingual_product_content_groups.metadata` 등)은 전부 **`jsonb`**
이므로 기존 concat 이 정상 동작한다 — **이번 수정 대상이 아니다**.

### 실패 원인

`pg_cast` 상 json↔jsonb 는 **assignment('a')** 캐스트만 있다.
→ `SET col = $1::jsonb` (대입)는 되지만, `COALESCE(json, jsonb)` 처럼 **implicit 해석**이
필요한 자리에서는 공통 타입을 찾지 못하고 실패한다.

### 수정한 4경로 (전수)

| # | 경로 | 파일:행 | 갱신 키 | 중첩 |
|---|------|--------|--------|------|
| F1 | KPA 약국 기본정보 `PUT /pharmacy/info` | `routes/o4o-store/controllers/pharmacy-info.controller.ts:349` | businessType · businessItem · businessEntityType · businessStartDate | 없음 |
| F2 | GlycoPharm 마이페이지 `PATCH /glycopharm/mypage/business-info` | `routes/glycopharm/controllers/mypage.controller.ts:288` | pharmacyName · businessName · representativeName · businessAddress · businessPhone · businessType · businessItem · businessEntityType · businessStartDate · taxInvoiceEmail · businessEmail · contactEmail | 없음 |
| F3 | K-Cosmetics 마이페이지 `PATCH /cosmetics/mypage/business-info` | `routes/cosmetics/controllers/cosmetics-mypage.controller.ts:202` | F2 와 동일 (단 `pharmacyName` 대신 **`storeName`**) | 없음 |
| F4 | Neture 공급자 프로필 P4 | `modules/neture/services/supplier.service.ts:1159` | businessEntityType · businessStartDate | 없음 |

4경로 모두 **최상위 키만** 쓰고 중첩 객체(`metadata` / `storeAddress`)는 건드리지 않는다.

---

## 2. 프로덕션 오류 증거와 사용자 영향

### Cloud Run 로그

```
2026-07-23T12:51:22Z  error: error: COALESCE could not convert type jsonb to json
2026-07-23T12:50:36Z  error: error: COALESCE could not convert type jsonb to json
```

### 라이브 API 실측 (수정 전, 2026-08-12)

테스트 계정(`renagang21`, 약국/매장 경영자)으로 프로덕션 API 직접 호출:

```
GET   /api/v1/glycopharm/mypage/business-info   → 200 (조회는 정상)
PATCH /api/v1/glycopharm/mypage/business-info   → 500 {"success":false,"error":"사업자 정보 수정 중 오류가 발생했습니다."}
```

### 사용자 영향 (경로별로 다르다)

| 경로 | 사용자에게 보이는 것 | 심각도 |
|---|---|---|
| F2 · F3 | **500 오류** — 저장이 안 되는 것을 사용자가 안다 | 기능 불능 (관측 가능) |
| F1 · F4 | **`success: true`** — catch 로 삼킨 뒤 저장 **전** 값을 다시 읽어 응답 | **거짓 성공 (관측 불가)** |

F1 은 KPA 약국이 업태·종목·사업자유형·개업일을 저장하면 성공 메시지가 뜨지만
값이 이전 값 그대로 되돌아온다. F4 는 Neture 공급자 P4 필드가 같은 방식으로 유실됐다.

---

## 3. 서비스별 수정 키와 보존 계약

- 각 경로가 **원래 쓰던 키 집합을 그대로 유지**했다. 키 이름·의미·검증 규칙 변경 없음.
- KPA 에서 확정한 주소·전화 우선순위(`address` > `businessAddress`, `metadata.pharmacy_phone`)는
  **다른 서비스에 적용하지 않았다.** F2/F3 는 계속 `businessAddress` 를 쓴다.
- 서비스 경계 유지: K-Cosmetics 는 `storeName`, GlycoPharm 은 `pharmacyName` — 상호 침범 없음(테스트로 고정).
- 요청에 없는 키는 patch 에 담기지 않아 DB 값이 그대로 보존된다.
- 권한 가드(403) · 검증(400) · 응답 projection 은 전부 그대로.

---

## 4. 공통 헬퍼 재사용 범위

4경로 전부 `utils/business-info-write.ts` 의 `buildBusinessInfoUpdateStatement` 로 교체했다.
신규 SQL 을 만들지 않았고, 키 화이트리스트·파라미터 바인딩·NULL/비객체 방어를 그대로 물려받는다.

```
읽기: CASE WHEN jsonb_typeof("businessInfo"::jsonb) = 'object' THEN "businessInfo"::jsonb ELSE '{}'::jsonb END
합침: || $n::jsonb
복귀: (...)::json      ← 컬럼 타입이 json 이므로 반드시 되돌린다
```

---

## 5. 오류 삼킴 경로의 처리 결과

| 경로 | 기존 | 변경 후 |
|---|---|---|
| F1 `pharmacy-info` | `catch → console.error` 후 저장 전 값으로 200 | 삼킴 제거 → `asyncHandler` 로 전파(오류 미들웨어). 바로 위 `orgRepo.save(org)` 와 동일한 전파 방식 |
| F4 `supplier.service` | `catch → logger.error` 후 계속 진행, 성공 응답 | 삼킴 제거 → 호출자 오류 처리로 전파. 위 `supplierRepo.save(supplier)` 와 동일 |

F2·F3 는 원래 삼키지 않았다(500 반환) — **오류 처리 구조를 손대지 않았다.**
두 파일의 `catch (err)` 미사용 변수 경고 등 무관한 오류 처리 구조는 리팩터링하지 않았다.

---

## 6. PostgreSQL · 테스트 · lint · typecheck

### 실 PostgreSQL 실행 검증 (프로덕션 엔진, read-only SELECT)

각 경로의 **실제 patch 모양**으로 헬퍼가 생성한 표현식을 평가.

| 케이스 | 결과 |
|---|---|
| S1 F1 P2/P4 4키 | 4키 반영 · `sentinelRoot` · `metadata` 2키 · `storeAddress` 3키 전부 보존 |
| S2 F2 6키 | 동일하게 보존 |
| S3 F3 4키 | 동일하게 보존 |
| S4 F4 2키 | 동일하게 보존 |
| S5 null · 빈 문자열 | `null` → `null`, `''` → `''` (키 삭제 아님 — 기존 계약 유지) |
| S6 컬럼이 NULL · `"scalar"` · `[1,2]` | 오류 없이 정상 결과 |

### 자동화 테스트 (신규 20건)

| 파일 | 건수 |
|---|---|
| `utils/__tests__/business-info-json-column-guard.test.ts` (신규) — **저장소 전수 스캔 가드** | 3 |
| `routes/glycopharm/controllers/__tests__/mypage.businessInfoWrite.test.ts` (신규) | 7 |
| `routes/cosmetics/controllers/__tests__/cosmetics-mypage.businessInfoWrite.test.ts` (신규) | 5 |
| `routes/o4o-store/controllers/__tests__/pharmacy-info.businessInfoWrite.test.ts` (신규) | 5 |

가드 테스트는 주석을 제거한 뒤 소스 전체를 스캔해 `COALESCE("businessInfo", ...)` 재유입을 막는다.
(컴파일·기존 테스트로는 못 잡고 프로덕션에서만 터지던 종류라 회귀 가드를 남겼다.)

영향 범위 일괄(`kpa · glycopharm · cosmetics · o4o-store · operator · auth · neture · utils`):
**53 suites / 681 tests 전부 PASS.** 직전 WO 의 JSONB 수렴·dual-read 회귀 포함.

### typecheck / lint

- `tsc --noEmit` **exit 0 — 저장소 전체 오류 0건**.
  직전 WO 에서 보고한 `kpa-branch-scope.middleware.ts` TS2322 는 **소스 문제가 아니라
  `@o4o/security-core` 의 stale `dist`** 때문이었다. `security-core/src/types.ts:23` 에는
  `'kpa-branch'` 가 이미 있었고, dist 가 재빌드(08-12 21:13)되며 해소됐다.
  → 본 WO 는 이 파일을 수정하지 않았다.
- eslint: 변경 4파일 **오류 0건**. 경고 7건은 전부 **기존** `catch (err)` 미사용 변수
  (이번에 손대지 않은 블록).

### 미커버 항목 (숨기지 않고 명시)

- **F4 `supplier.service` 는 전용 단위 테스트를 추가하지 않았다.** 전역 `AppDataSource` 와
  대형 서비스 의존성 때문에 하네스 비용이 크다. 대신 ①저장소 전수 가드 ②PG 실행 검증(S4)
  ③typecheck 로 커버했다. 필요 시 별도 WO 로 하네스 정비 후 추가한다.

---

## 7. migration · 운영 DB write

- **migration 없음** · **신규 테이블/컬럼 없음** · **backfill 없음**
- SQL 직접 실행에 의한 **운영 데이터 변경 없음** (모든 psql 접속은 read-only SELECT)
- 검증 9의 API runtime smoke 만 테스트 계정 1건에 실제 저장을 수행했고 **원래 값으로 되돌렸다** (§8)

---

## 8. 배포 revision · 배포 후 로그 · runtime smoke

(아래는 push 후 실측 결과로 갱신)

---

## 9. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
(직전 WO 에서 남긴 `MembershipConsoleController.updateMember` 다중 statement 비원자성 — 본 WO 범위 외 유지)
