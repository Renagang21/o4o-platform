# WO-O4O-PARTNER-APPLICATION-ENTITY-TABLE-CONTRACT-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1 — CHECK

- **작업일**: 2026-08-26
- **조사 시작 기준**: `2184053ba` (`HEAD == origin/main`, clean)
- **작업 중 HEAD 이동**: 병렬 세션이 같은 작업트리에서 pull → `e886886cb`. 본 WO 변경분은 그대로 유지됨
- **최종 판정**: **C. LEGACY_OR_DEAD**
- **UNJUDGED**: 0

---

## 1. 모집단 전수 (과거 추정값 미재사용)

| 축 | 실측 |
|---|---|
| `@Entity` tableName | `partner_applications` |
| entity file | `apps/api-server/src/modules/partner/entities/PartnerApplication.ts` |
| repository 소비처 | `partner-application.service.ts` — `AppDataSource.getRepository(PartnerApplication)` **1곳** |
| service | `PartnerApplicationService.submitApplication()` (write 전용) |
| controller/route | `partner-application.routes.ts` — **POST 1개만**. GET/PATCH/DELETE 없음 |
| route mount | `register-routes.ts:410` `app.use('/api/v1/partner/applications', …)` |
| frontend consumer | `services/web-k-cosmetics/src/pages/partners/ApplyPage.tsx` **1곳** |
| menu/entry point | `MembershipGate.tsx` `APPLY_PATH['k-cosmetics']='/partners/apply'` (라이브) · `BusinessOnboardingBanner.tsx` (**미마운트=dead**) |
| role/guard | 라우터 자체엔 guard 없음(주석상 "인증 불필요 공개 API") — **그러나 실제로는 §3 참조** |
| serviceKey | 없음. `serviceInterest` jsonb 만 존재 |
| migration | **없음** (전 migration 파일 검색 결과 0건) |
| 실제 production table | **부재** (§2) |
| 실제 production endpoint 응답 | **401 / 403** (§3) |

> `@o4o/operator` 계열 census 와 달리 이번 모집단은 코드에서 새로 산출했다.

---

## 2. Production table census (read-only)

접속: Cloud SQL Auth Proxy v2 (`--token`, ADC 부재로 gcloud access token 사용) → `127.0.0.1:5442`.
자격증명은 Secret Manager `o4o-api-db-password` 에서 직접 주입 (문서·로그 미기록).
`apps/api-server/.env` 의 DB 비밀번호는 **현재 프로덕션과 불일치**(인증 실패) — 별건으로 보고.

| 확인 | 결과 |
|---|---|
| `partner_applications` 존재 | **없음 — 전 schema 통틀어 0건** |
| `neture_partner_applications` 존재 | 있음 (11 컬럼, PK/FK/UQ 3개) |
| `neture_partner_applications` row | **0행** |
| `partner_%` 유사 table | `partner_commissions` · `partner_referrals` · `partner_settlement_items` · `partner_settlements` (전부 정산/추천 도메인 — 신청 접수 아님) |
| `cosmetics.cosmetics_store_applications` 존재 | **있음** (0행) |
| migration 원장 | `typeorm_migrations` (`migrations` 아님) |

**production write 0건** — root cause 확정 전 write 금지 원칙 준수.

---

## 3. Root cause — **route shadowing** (핵심 발견)

`register-routes.ts` 마운트 순서:

```js
// 21-a
app.use('/api/v1/partner', partnerDashboardRoutes);            // ← 먼저
// 21-b
app.use('/api/v1/partner/applications', partnerApplicationRoutes);  // ← 나중 (도달 불가)
```

`partner-dashboard.routes.ts:24`:

```js
router.use(authenticate, partnerContextGuard);   // router 레벨 guard
```

Express 는 `app.use('/api/v1/partner', …)` 를 **prefix 매칭**하므로 `/api/v1/partner/applications` 요청은
**항상 21-a 에 먼저 걸린다.** 21-b 는 한 번도 실행되지 않는다.

**프로덕션 실측 (안전 — 대상 table 부재로 어떤 payload 도 저장 불가):**

| 요청 | 실제 응답 |
|---|---|
| `POST /api/v1/partner/applications` (익명, `{}`) | `401 AUTH_REQUIRED` |
| 동 (익명, 유효 payload) | `401 AUTH_REQUIRED` |
| 동 (인증됨, `{}`) | **`403 "Partner role required"`** |
| 동 (인증됨, 유효 payload) | **`403 "Partner role required"`** |

→ 코드 주석의 "공개 API / 400 validation / 201 submitted" 계약은 **전부 도달 불가**였다.
→ **"파트너가 되려는 사람"에게 "파트너 역할"을 요구하는 논리적 모순.**

### 3중 고장

1. **도달 불가** — 21-a 가 21-b 를 가림
2. **잘못된 audience** — partner role guard 가 신청자(비파트너)를 차단
3. **table 부재** — 설령 도달해도 `relation "partner_applications" does not exist` → 500

### 부수 발견 — 계약 불일치

| | 값 |
|---|---|
| entity `ServiceInterest` | `'GlycoPharm' \| 'K-Cosmetics'` |
| frontend `ServiceInterest` | `'DIGITAL_SIGNAGE' \| 'BEAUTY_SUPPLY' \| 'ADVERTISEMENT'` |

두 축이 한 번도 통합·검증된 적 없다는 방증.

---

## 4. 데이터 모델 비교 — A 판정 배제 근거

`PartnerApplication` ↔ `NeturePartnerApplication` 은 **이름만 비슷하고 업무가 다르다.**

| 축 | `partner_applications` (PartnerApplication) | `neture_partner_applications` (NeturePartnerApplication) |
|---|---|---|
| PK | uuid | uuid |
| applicant 축 | **외부 업체** (companyName·businessNumber·contactName·email) — 미가입자 | **기존 파트너 user** (partnerId) + recruitmentId |
| status | **없음** (v1 "접수만") | enum `pending/approved/rejected/cancelled` |
| serviceKey | 없음 (serviceInterest jsonb) | 없음 (neture 전용) |
| partner type | 없음 | 모집 공고 참여 |
| metadata | `message` text | `reason` text |
| created/updated | `submitted_at` 만 | applied_at·decided_at·created_at·updated_at |
| unique/index | index(email, businessNumber) | **UNIQUE(recruitment_id, partner_id)** |
| FK | 없음 | recruitment FK |
| lifecycle | 없음 (write-only) | 4-state 승인 lifecycle |

→ 컬럼·업무 의미·write/read lifecycle 이 **실질적으로 다르다** → **A(ENTITY_MAPPING_STALE) 배제.**
`neture_partner_applications` 는 KPA/GP/KCos 매장이 실제로 쓰는 살아 있는 축이다
(`GET /api/v1/neture/partner/applications/mine` 200 다수 — 손대지 않았다).

---

## 5. A / B / C 판정

### ❌ A. ENTITY_MAPPING_STALE
§4 — 두 table 은 다른 업무. 이름 유사성만으로 매핑 금지(WO §4·§11).

### ❌ B. MIGRATION_MISSING
WO §6-B 4개 전제 중 **2개 불충족**:

| 전제 | 결과 |
|---|:--:|
| 기존 production 데이터 없음 | ✅ (table 자체 부재) |
| 기존 다른 table 과 중복 의미 없음 | ❌ **`cosmetics.cosmetics_store_applications` 가 같은 업무를 더 완전하게 수행** |
| 현행 route 실제 사용 | ❌ **도달 불가 + 90일 호출 0건** |
| entity 계약이 canonical | ❌ **status·검수·read path 전무 → canonical 아님** |

migration 을 만들어도 §3 의 1·2 는 그대로 남아 여전히 동작하지 않는다.

### ✅ C. LEGACY_OR_DEAD — **확정**

WO §6-C 제거 전제 검증:

| 전제 | 결과 |
|---|---|
| production 호출 0 | ✅ **90일 0건** (`httpRequest.requestUrl="…/api/v1/partner/applications"`) |
| 대체 canonical 경로 존재 | ✅ `POST /api/v1/cosmetics/stores/apply` → `cosmetics.cosmetics_store_applications` → 운영자 검수 콘솔 `/operator/applications` (list + review approve/reject) |
| 외부 producer/consumer 0 | ✅ 저장소 전체 소비처 1곳(ApplyPage)뿐, 외부 호출 0 |
| active consumer 0 | ⚠️ **ApplyPage 는 라우팅돼 있었다** → 함께 은퇴 처리(§6) |

**read path 0** 이 결정적이다 — GET 도 운영자 콘솔도 없어, 저장에 성공했더라도 **아무도 읽을 수 없는 write-only 블랙홀**이었다.

---

## 6. 수정 (C — 제거)

**schema/migration 변경 0. DB write 0. 권한 변경 0.**

### Backend
| 파일 | 처리 |
|---|---|
| `modules/partner/entities/PartnerApplication.ts` | **삭제** |
| `modules/partner/services/partner-application.service.ts` | **삭제** |
| `modules/partner/partner-application.routes.ts` | **삭제** |
| `modules/partner/entities/index.ts` | export 제거 |
| `modules/partner/index.ts` | `partnerApplicationRoutes` export 제거 |
| `database/entities.ts` | import + registry 배열 항목 제거 |
| `bootstrap/register-routes.ts` | 21-b 마운트 + import 제거 (사유 주석 보존) |

### Frontend (K-Cosmetics)
| 파일 | 처리 |
|---|---|
| `pages/partners/ApplyPage.tsx` | **삭제** |
| `components/onboarding/BusinessOnboardingBanner.tsx` | **삭제** (미마운트 dead + 은퇴 경로 링크) |
| `App.tsx` | lazy import + `partners/apply` route 제거 |
| `components/auth/MembershipGate.tsx` | `APPLY_PATH['k-cosmetics']` 제거 |

> `/partners` (PartnerInfoPage) 는 유지 — 별개의 살아 있는 안내 페이지다.

### UX 공백 아님 — 서비스 정책과의 모순을 제거한 것 (배포 후 실측으로 정정)

초안에서는 "K-Cosmetics 자가 신청 UI 공백 → 후속 WO 로 신청 UI 구축"으로 적었다.
**이 판단은 틀렸다.** 배포 후 E2E 중 살아 있는 `/partners`(`PartnerInfoPage.tsx:55-62`)의 본문이
K-Cosmetics 의 명시 정책을 담고 있다:

> **K-Cosmetics는 소비자를 위한 쇼핑 공간입니다.**
> 공급자, 파트너, 협력사는 **이 서비스의 회원이 아닙니다.**
> 참여 및 협력은 **네뚜레(Neture)** 를 통해 이루어집니다.
> 모든 역할의 등록과 관리는 네뚜레에서 통합 진행됩니다.

즉 **K-Cosmetics 에는 파트너 신청 접수가 존재해서는 안 된다.**
`/partners/apply` 폼과 "파트너 신청하기" CTA 는 서비스 자신의 정책과 정면으로 모순이었고,
`partner_applications` 가 만들어진 적 없다는 사실과도 일관된다.

→ **신청 UI 를 만드는 후속 WO 는 제안하지 않는다.** 파트너/공급자 등록의 canonical 경로는 **Neture** 이며,
   `/partners` 안내 페이지가 이미 그 경로를 안내하고 있다(유지됨).
→ `cosmetics.cosmetics_store_applications` 는 **매장(store) 입점** 축이라 파트너 신청과 별개다.
   0행·UI 없음·90일 호출 0건 상태이며 본 WO 범위 밖으로 남긴다.

---

## 7. 에러 계약

| 경로 | 변경 전 | 변경 후 |
|---|---|---|
| `POST /api/v1/partner/applications` (익명) | 401 (21-a guard) | 401 (동일 — `/api/v1/partner` 라우터가 계속 처리) |
| 동 (인증·비파트너) | 403 Partner role required | 403 (동일) |
| 동 (인증·파트너) | **500 예상** (table 부재) | **500 소멸** — 도달할 dead route 자체가 없음 |
| `GET /partners/apply` (KCos SPA) | 폼 렌더 → 제출 시 403 | SPA NotFound |

**unexpected 500 = 0.** 401/403 은 `/api/v1/partner` 대시보드 라우터의 **의도된** 응답이며,
은퇴로 인해 새로 생긴 것이 아니다 (변경 전과 동일).

---

## 8. 테스트

| 항목 | 결과 |
|---|---|
| api-server `type-check` (`tsc --noEmit`) | ✅ 통과 |
| K-Cosmetics `tsc --noEmit` | ✅ 통과 |
| **TypeORM registry guard** (`scripts/check-typeorm-entities.mjs`) | ✅ **통과** — registry 262 · DEFINED_BUT_UNREGISTERED 0 · 중복 0 · **stale reference 0** |
| 신규 dead-reference guard (`partner-application-retirement.spec.ts`) | ✅ **10/10 통과** |
| api-server 전체 Jest | 3,639 passed / **2 failed** (§8-1) |

신규 guard 10건: 은퇴 파일 5개 부활 방지 · registry 미등록 · module export 미부활 ·
마운트 미부활 · KCos route/CTA 미부활 · **canonical 대체 축 생존 확인**.

### 8-1. 남은 실패 2건 — **본 WO 무관 (수정하지 않음)**

| 스펙 | 사유 |
|---|---|
| `ecommerce-core-and-commerce-residue-retirement.spec.ts` | `packages/ecommerce-core` 존재를 실패로 판정. 병렬 세션의 진행 중 은퇴 작업(`8ec02a27c`) 소관 |
| `content-guard/numeric-consistency.test.ts` · `liquid-guard.test.ts` | content-guard 도메인 |

두 스펙 모두 `PartnerApplication` / `partner/applications` 를 **참조하지 않는다**(grep 확인).
CLAUDE.md 중지 조건 "현재 변경과 무관한 test 실패" → 보고만 한다.

---

## 9. Production E2E — 배포 후 실측 **PASS**

배포: `01c7784dc` → `Deploy API Server (Cloud Run)` **success** · `Deploy Web Services (Cloud Run)` **success**.

### ① 은퇴 endpoint — unexpected 5xx 0

| 요청 | 응답 |
|---|---|
| `POST /api/v1/partner/applications` (익명, `{}`) | `401 AUTH_REQUIRED` |
| 동 (인증, `{}`) | `403 Partner role required` |
| 동 (인증, 유효 payload) | `403 Partner role required` |
| `GET /api/v1/partner/applications/does-not-exist` (인증) | `403 Partner role required` |

→ 은퇴 전과 동일. **500 계열 0건.** 401/403 은 21-a(`/api/v1/partner` 대시보드 라우터)의 의도된 응답이며
   은퇴로 새로 생긴 것이 아니다.

### ② 살아 있는 축 — 부수 피해 0

| 경로 | 응답 |
|---|---|
| `GET /api/v1/neture/partner/applications/mine` | `200 {"success":true,"data":[]}` |
| `GET /api/v1/cosmetics/stores/admin/applications` | `200 {"data":[],"meta":{...total:0}}` (empty state 정상) |
| `GET /api/v1/partner/overview` (21-a) | `403 Partner role required` (계정이 파트너 아님 — 정상) |
| `GET /health/detailed` | `200 healthy` (database check 포함) |

### ③ K-Cosmetics SPA (desktop 1440×900)

| 경로 | 결과 |
|---|---|
| `/partners/apply` | **404 화면** — "요청하신 페이지를 찾을 수 없습니다". 신청 폼 미렌더 ✅ |
| `/partners` | 정상 (파트너 안내 — Neture 유도) ✅ |
| `/operator/applications` | 정상 (canonical 검수 콘솔, table 렌더) ✅ |

**jsErrors 0.**

### ④ DB 재확인

배포 후 `SELECT … WHERE table_name='partner_applications'` → **`NONE`**.
`synchronize` 등으로 테이블이 자동 생성되지 않았음을 확인 (schema drift 0).

### write fixture 미실행 사유

이번 작업은 **제거**이며 생성 대상 업무가 존재하지 않는다.
`cosmetics_store_applications` 는 본 WO 범위 밖이며, 억지 row 생성은 WO §9·§11 금지 사항이다.

---

## 10. 완료 기준

| 기준 | 결과 |
|---|:--:|
| UNJUDGED | **0** |
| canonical table contract 확정 | ✅ `partner_applications` = **비존재·은퇴** / canonical = `cosmetics.cosmetics_store_applications` |
| unexpected 500 | **0** |
| runtime entity/table mismatch | **0** (mismatch 원인 entity 제거) |
| dead active route | **0** |
| cross-service leak | **0** (neture 축 무변경) |
| schema drift | **0** (migration·DB write 0건) |

**금지사항 준수**: 이름 기반 강제 매핑 ✗ · 중복 table 신설 ✗ · 데이터 복사 우회 ✗ ·
try/catch 500 은폐 ✗ · `synchronize:true` ✗ · raw SQL 우회 ✗ · 권한 확대 ✗

---

## 11. 범위 밖 발견 (수정하지 않고 보고)

1. **`apps/api-server/.env` 의 DB 비밀번호가 프로덕션과 불일치** — `o4o_api` 인증 실패.
   Secret Manager `o4o-api-db-password` 가 정본. 로컬 검증 절차 문서와의 정합 필요.
2. **ADC 미구성** — `gcloud auth application-default login` 필요.
   현재는 `cloud-sql-proxy --token=$(gcloud auth print-access-token)` 우회로 접속했다.
3. `packages/ecommerce-core` 은퇴 진행 중 → 관련 spec 1건 red (병렬 세션 소관).
4. `content-guard` spec 2건 red (병렬 세션/기존 이슈).
5. `cosmetics.cosmetics_store_applications` (매장 입점 축) — table·backend·운영자 검수 콘솔은 있으나
   **신청 UI 가 없고 90일 호출 0건 · 0행**. 파트너 신청과는 별개 축이며 본 WO 범위 밖.
   실제로 필요한 업무인지 별도 판단 필요.
6. `PartnerInfoPage` 정책문("파트너는 K-Cosmetics 회원이 아니다 · 등록은 Neture")과
   `MembershipGate` 의 "가입 신청하기" CTA 가 서로 모순이었다 — 본 WO 로 CTA 측을 정리했다.
