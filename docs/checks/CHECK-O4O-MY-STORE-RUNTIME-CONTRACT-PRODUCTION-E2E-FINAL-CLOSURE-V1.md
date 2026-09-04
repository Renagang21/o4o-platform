# CHECK-O4O-MY-STORE-RUNTIME-CONTRACT-PRODUCTION-E2E-FINAL-CLOSURE-V1

**대상 WO**: WO-O4O-MY-STORE-RUNTIME-CONTRACT-PRODUCTION-E2E-FINAL-CLOSURE-V1
**시작 HEAD**: `38a6b87e2` → **종료 HEAD**: `c0127b7e6` (배포 완료)
**PR #207 merge SHA**: `30ba6dfe945e00b1430e7f495a438bb151d25570` — main ancestry **포함 확인**
**작성일**: 2026-09-04

---

## 0. 최종 판정

```text
MY STORE SECONDARY QUALITY CLOSURE : NOT_CLOSED (GP tablet 흐름 1건 미완)
사유: 권한 차단 — 아래 §7. 코드·계약 결함은 0이며 발견된 결함 1건은 수정·배포·재검증 완료.
```

| 완료 조건 (WO §15) | 결과 |
|---|---|
| PR #207 main 반영 | **PASS** |
| production 최신 배포 4서비스 | **PASS** (§2) |
| KPA_POST_DEPLOY_E2E_PENDING 해소 | **PASS** (§4) |
| KCos E2E_BLOCKED_AUTH 해소 | **PASS** (§3·§5) |
| GP E2E_BLOCKED_AUTH 해소 | **PASS** (로그인 200) |
| GP 매장 tablet 흐름 | **미완** — fixture 생성이 권한 차단 (§7) |
| PH SERVICE_SPECIFIC 409 계약 회귀 없음 | **PASS** (§6) |
| organization 오선택 0 | **PASS** |
| TABLET visibility 무증상 실패 0 | **결함 1건 발견 → 수정·배포·재검증 완료** (§8) |
| QR / STORE canonical landing | **PASS** |
| 예상 밖 browser/runtime error 0 | **PASS** |

---

## 1. 서비스별 결과표 (WO §14)

| 항목 | KPA | KCos | GlycoPharm | PH |
|---|:--:|:--:|:--:|:--:|
| 최신 배포 | ✅ | ✅ | ✅ | ✅ |
| store-owner login | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| org scope | ✅ 테스트 약국 | ✅ 테스트 뷰티샵 | ⛔ fixture 없음(정상 거부) | ✅ not_connected |
| tablet product pool | ✅ 23건 | ✅ 1건 | ⛔ | ✅ 409 계약 |
| visibility reason | ✅ | ✅ **결함 수정 후 정상** | ⛔ | — |
| Screen Set/runtime | ✅ 12세트·4대 | ⛔ 태블릿 0대 | ⛔ | — |
| QR landing | ✅ 200 | — | ⛔ | — |
| browser console | ✅ err 0 / API 0 | ✅ err 0 / API 0 | — | — |
| 최종 판정 | **PASS** | **PASS** | **PARTIAL** | **PASS** |

---

## 2. 사전 배포 확인 (WO §4)

image tag 가 곧 commit SHA 라 직접 대조했다.

| 서비스 | serving revision | image tag | 판정 |
|---|---|---|---|
| `o4o-core-api` | `o4o-core-api-03531-69l` → (재배포) | `30ba6dfe9…` → **`c0127b7e6…`** | **DEPLOYED_CURRENT** |
| `kpa-society-web` | `kpa-society-web-01919-8lr` | `30ba6dfe9…` | **DEPLOYED_CURRENT** |
| `k-cosmetics-web` | `k-cosmetics-web-01090-vcj` | `30ba6dfe9…` | **DEPLOYED_CURRENT** |
| `glycopharm-web` | `glycopharm-web-01347-w57` | `30ba6dfe9…` | **DEPLOYED_CURRENT** |
| `pharmacy-hub-web` | `pharmacy-hub-web-00180-k2t` | `30ba6dfe9…` | **DEPLOYED_CURRENT** |

배포 SHA 이후 main 에 추가된 커밋은 `38a6b87e2`(docs) 1건뿐이고 **runtime 코드 변경 0**이었다.
이후 §8 수정으로 api-server 를 `c0127b7e6` 로 재배포했다(`Deploy API Server (Cloud Run)` success).

---

## 3. 자격증명 (WO §11) — E2E_BLOCKED_AUTH 해소

이전 WO 들이 기록한 상태:

```text
PharmacyHub 만 실제 폼 로그인 200. KPA/KCos/Neture 는 401 INVALID_CREDENTIALS.
→ 3서비스는 L1 토큰 주입 우회로만 검증했다(= 로그인 검증이 아님).
```

이번에 **정상 폼 로그인 경로로 해소**했다.

### 3-1. 차단 사유를 추정하지 않고 실측했다

```text
probe 결과: ACCOUNT_NOT_ACTIVE   (INVALID_CREDENTIALS 아님)
→ L2 비밀번호는 유효하고, 막고 있던 것은 직전 smoke WO 종료 시 건 suspended 상태뿐이었다.
```

### 3-2. 조치 — 문서화된 재사용 절차

`TEST-ACCOUNTS.local.md §7` 의 절차대로 **canonical `PATCH /api/v1/admin/users/{id}/status`** 로
검증 전용 계정 2개만 `approved` 로 되돌렸다 (사용자 승인). HTTP 200 ×2.

```text
SQL 직접 조작 0 · role 부여 0 · 비밀번호 변경/추측 0 · 임시 admin 승격 0
production write = users.status 2행 (가역)
```

### 3-3. 결과 — 4서비스 canonical 로그인 200

| 계정 | serviceKey | 결과 | roles |
|---|---|:--:|---|
| A `o4o-smoke-mystore@…` | kpa-society | **200** | kpa:store_owner · kpa:operator 외 |
| A | glycopharm | **200** | glycopharm:store_owner 포함 |
| A | pharmacy-hub | **200** | pharmacy-hub:store_owner 포함 |
| B `o4o-smoke-mystore-kcos@…` | k-cosmetics | **200** | cosmetics:store_owner |

> 계정 B 를 따로 쓰는 이유는 §7 주의(다중 org 계정은 service-scoped org 해석이 비결정적)를 피하기 위함이다.
> 계정 A = 테스트 약국 1곳, 계정 B = 테스트 뷰티샵 1곳.

---

## 4. KPA production E2E (WO §5) — PENDING 해소

### 4-1. API 축

| 확인 | 결과 |
|---|---|
| `GET /api/v1/kpa/store/tablets` | **200** · 태블릿 4대 |
| `GET /api/v1/kpa/store/screen-sets` | **200** · 세트 12개 |
| `GET /api/v1/kpa/store/product-pool` | **200** · supplier 23 / local 8 |
| org scope | **테스트 약국** — 타 서비스 org 선택 **0** |
| 경로 | **service-scoped mount `/api/v1/kpa/store/*`** 사용 (PR #207 axis B) |

### 4-2. visibility reason (axis A)

```text
supplierProducts 23건 · 주석 누락 0
  service_scope_mismatch 22  (neture 20 · glycopharm 1 · k-cosmetics 1)
  no_tablet_channel       1  (kpa-society 1 — slug 'kpa' ↔ listing 'kpa-society' alias 통과 후 채널 게이트에서 탈락)
tabletChannel: hasTabletChannel=false
```

### 4-3. 공개 런타임 · QR (UI reason == backend reason)

```text
GET /api/v1/stores/네뚜레-약국/tablet/screen?tabletId=…  → 200 mode=screen_set
  sections: idle_media(1) · corner_description · content_list(5/4) · product_list · qr_guide
  product_list.products = []            ← 편집기 사유(전 상품 비노출)와 정확히 일치
  qrUrl = https://kpa-society.co.kr/qr/tablet-corner-5  → HTTP 200
```

**§9 "UI reason = backend reason" 충족** — 편집기가 "노출 불가"라고 표시한 상품은 런타임에도 0건이다.
이것이 axis A 가 없애려던 무증상 실패(선택은 되는데 런타임 0건)의 해소 증거다.

### 4-4. localProducts 8 vs 런타임 3 — 결함 아님

```text
편집기 localProducts 8건 (전부 is_active=true, visibility 주석 없음)
런타임 localProducts 3건
```

원인을 코드·데이터로 확인했다: 공개 런타임의 권위는 **`store_tablet_displays` 의 visible display rows**다
(실측: 태블릿당 `product_type='local'`, `is_visible=true` **3행**).
즉 5건이 숨겨진 게 아니라 **운영자가 태블릿에 진열하지 않은 것**이다.
supplier 상품과 달리 보이지 않는 비즈니스 게이트가 없으므로 사유 주석이 필요 없다.

### 4-5. 브라우저 (WO §10)

```text
로그인 → /operator 랜딩(계정 A 가 kpa:operator 도 보유) → /store/commerce/tablet-displays 직접 진입
매장 표기      : 테스트 약국
호출 API       : /api/v1/kpa/store/tablets 200 · /api/v1/kpa/store/screen-sets 200
                 /api/v1/kpa/store/tablet-display-settings 200 · /api/v1/kpa/store-hub/capabilities 200
태블릿 카드    : 2개(구강관리 코너 · 피부관리 코너) + 현재 적용 화면 세트 표시
white screen 0 · fatal JS 0 · 무한 redirect 0 · 콘솔 error 0 · 실패 API 0
```

**브라우저에서 service-scoped mount 가 실사용됨을 직접 확인**했다(axis B 배포 검증).

---

## 5. K-Cosmetics production E2E (WO §6)

| 확인 | 결과 |
|---|---|
| store-owner 로그인 | **200** (계정 B) |
| org scope | **k-cosmetics** — 테스트 뷰티샵 |
| product pool | **200** · supplier 1건 (service_key `k-cosmetics`) |
| 타 서비스 상품 풀 혼입 | **0** (neture/kpa/glycopharm 항목 없음) |
| tabletVisible/reason 유실 | **0** (주석 누락 0) |
| 태블릿/Screen Set | **0건** — 해당 org 에 태블릿 미등록 |
| 브라우저 | `/store` 랜딩 → `/store/commerce/tablet-displays` 정상 렌더, 빈 상태 문구 "등록된 태블릿이 없습니다" · 콘솔 error 0 · 실패 API 0 |

**서비스 중립 mount 오선택 회귀는 닫혔다** — KCos 토큰으로 `/api/v1/cosmetics/store/*` 가
테스트 뷰티샵만 해석하며 타 서비스 org 가 섞이지 않았다.

> Screen Set/runtime 은 해당 org 에 태블릿이 없어 미수행이다(데이터 부재이지 결함 아님).

---

## 6. PharmacyHub 회귀 (WO §8) — 409 계약 보존

```text
GET /api/v1/pharmacy-hub/store-owner/ping           → 200 {scope: "pharmacy-hub:store_owner"}
GET /api/v1/pharmacy-hub/store-owner/info           → 200 {store.status: "not_connected", candidateCount: 0}
GET /api/v1/pharmacy-hub/store-owner/tablets        → 409 STORE_NOT_CONNECTED
GET /api/v1/pharmacy-hub/store-owner/screen-sets    → 409 STORE_NOT_CONNECTED
GET /api/v1/pharmacy-hub/store-owner/product-pool   → 409 STORE_NOT_CONNECTED
```

**generic 403 으로 바뀌지 않았다.** 대비가 명확하다:

```text
KPA · KCos · GP (generic scoped mount) → 403 STORE_OWNER_REQUIRED
PH            (service-specific seam)  → 409 STORE_NOT_CONNECTED
```

`AMBIGUOUS_STORE_CONNECTION` 은 **다중 PH org 연결 계정이 없어 미실측**이다(§10).

---

## 7. GlycoPharm — PARTIAL

### 7-1. 403 은 결함이 아니라 axis B 가 의도대로 동작한 결과다

```text
GET /api/v1/glycopharm/store/tablets → 403 STORE_OWNER_REQUIRED
```

근거(프로덕션 실측):

| org | enrollment | slug | 검증 계정 소속 |
|---|---|---|---|
| 테스트 약국 | `kpa-society(active)` | `kpa` | 계정 A **manager** |
| [E2E_TEST] 글라이코팜 검증 약국 | `glycopharm(active)` | (없음) | **비소속** |

`findStoreOrganizationCandidates` 는 org 가 해당 서비스의 **active enrollment 또는 active slug** 를
가져야 후보로 삼는다. 계정 A 의 유일한 org 는 kpa 축이라 glycopharm 후보가 **0** → 정상 거부.

**예전 버그였다면 여기서 KPA org 를 잘못 골랐을 자리다.** 즉 이 403 은 회귀가 아니라 수정의 증거다.

### 7-2. 미완 사유 — 도구 권한 차단

사용자 승인 하에 `[E2E_TEST] 글라이코팜 검증 약국` 에 계정 A 를 **manager 1행**으로 추가하려 했다.
런타임 API 를 먼저 조사했으나 **기존 org 에 멤버를 추가하는 라우트가 없다**
(`organizationOpsService.addMember` 는 신규 org 생성 흐름 안에서만 호출된다).
그래서 그 중앙 서비스와 **완전히 동일한 문장**(컬럼·기본값·`ON CONFLICT DO NOTHING`)으로 실행하려 했으나
**도구 분류기가 프로덕션 DB write 를 차단**했다. 우회하지 않았다.

```text
BEFORE (기록 완료):
  org 13c08a86-a4b7-4b82-834e-6a01b3c2f4c1 [E2E_TEST] 글라이코팜 검증 약국
  organization_members = 1 (renagang21@gmail.com / owner)
  계정 A membership = 없음

실행하려던 문장(= organization_ops.service.ts addMember 원문):
  INSERT INTO organization_members
    (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
  VALUES (gen_random_uuid(),
          '13c08a86-a4b7-4b82-834e-6a01b3c2f4c1',
          '3f5582bc-d0cd-425b-ba5d-7aa3531b037f',
          'manager', false, NOW(), NOW(), NOW())
  ON CONFLICT (organization_id, user_id) DO NOTHING;

AFTER: 미실행
```

대안으로 GP **매장 신청 → 승인 API** 흐름(canonical HTTP)도 검토했으나,
그 경로는 **새 organization + slug + enrollment + auto-listing 다수 행**을 생성한다.
사용자가 승인한 범위(멤버 1행)보다 크므로 임의로 실행하지 않았다.

---

## 8. 발견한 production defect 1건 — 수정·배포·재검증 완료 (WO §12)

### 8-1. 재현

KCos 매장의 **자기 상품**이 `service_scope_mismatch` (다른 서비스 상품) 로 판정됐다.

```text
platform_store_slugs.service_key          = 'cosmetics'
organization_product_listings.service_key = 'k-cosmetics'
```

### 8-2. Root cause

```ts
export function resolveServiceKeys(serviceKey: string): string[] {
  if (serviceKey === 'kpa') return ['kpa', 'kpa-society'];   // ← kpa 만 하드코딩
  return [serviceKey];
}
```

canonical SSOT 는 **두 쌍**이다:
`ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY = { kpa: 'kpa-society', cosmetics: 'k-cosmetics' }`.

프로덕션 분포 실측이 코드 결함임을 확정했다(데이터 drift 아님):

| 매장 slug | listing service_key | 처리 |
|---|---|---|
| `kpa` | `kpa-society` | alias 처리됨 ✅ |
| `pharmacy-hub` | `pharmacy-hub` | 정확 일치 ✅ |
| **`cosmetics`** | **`k-cosmetics`** | **alias 누락** ❌ |

### 8-3. 영향

이 함수는 **공개 런타임 5경로**가 모두 통과한다 — 태블릿 상품 · 화면세트 resolve(×2) ·
대기영상 resolve · 공개 storefront · 편집기 visibility 주석.
→ K-Cosmetics 매장의 자기 상품이 **전 경로에서 영구 비노출**이었고,
매장 운영자에게는 "다른 서비스 상품"이라는 **틀린 사유**가 표시됐다.

### 8-4. 최소 수정

새 로컬 맵을 만들지 않고 SSOT 에서 파생한다.

```ts
export function resolveServiceKeys(serviceKey: string): string[] {
  const canonical = resolveCanonicalServiceKey(serviceKey);
  return canonical === serviceKey ? [serviceKey] : [serviceKey, canonical];
}
```

`kpa` 결과 불변 · self-map 서비스(neture · glycopharm · pharmacy-hub · cafe24-b2b) 불변.
**실질 변화는 cosmetics 한 축뿐이다.**
게이트를 넓히지 않았다 — `kpa-groupbuy` · `k-cosmetics-event-offer` 등 **다른 사업 축의 파생 키는 미포함**.

### 8-5. 배포 후 프로덕션 재검증

| | 수정 전 | 수정 후 |
|---|---|---|
| **KCos** supplier 1건 | `service_scope_mismatch` ❌ | **`no_tablet_channel`** ✅ (참인 사유) |
| **KPA** supplier 23건 | mismatch 22 / no_channel 1 | **동일** (게이트 확장 0) |

매장 운영자가 이제 **참인 사유**를 보고 다음 행동(TABLET 채널 생성·승인)을 알 수 있다.

### 8-6. 회귀 가드 13건

`store-service-key-alias-resolution.spec.ts` — alias 누락과 게이트 확장을 **양방향**으로 고정한다.
SSOT 를 순회해 새 alias 쌍이 추가돼도 자동 반영되며, 이전 형태의 `if (serviceKey === 'kpa')`
하드코딩이 되살아나면 깨진다.

---

## 9. 검증 (WO §13)

| 검증 | 결과 |
|---|---|
| api-server 전체 Jest | **232 suites / 3,863 tests PASS** |
| api-server type-check | **PASS** |
| 관련 회귀 11 suites (scoped-mount · store-owner · tablet · screen-set · store-public) | **108 PASS** |
| 신규 alias 가드 | **13 PASS** |
| Cafe24 B2B (별도 축 회귀) | **47 PASS** |
| rebase 후 재검증 | **PASS** (origin/main `477352035` 유입 후) |
| 배포 | `Deploy API Server (Cloud Run)` **success** → serving `c0127b7e6` |

### 9-1. 관측한 flake 1건

전체 Jest 첫 실행에서 `typeorm-entity-registry-guard.spec.ts` 9건이 실패했으나,
**격리 실행 10/10 PASS**, **전체 재실행 232/232 PASS** 로 재현되지 않았다.
이 spec 은 부프로세스를 반복 spawn 하므로 부하 아티팩트로 판단한다. 내 변경과 무관하다(변경 파일이 겹치지 않는다).

---

## 10. 미검증 사항

```text
1. GP 매장 tablet 흐름 — §7-2 권한 차단으로 미수행.
2. PH AMBIGUOUS_STORE_CONNECTION — 다중 PH org 연결 계정이 없어 미실측.
3. visibility truth table 6종 중 실측 2종(service_scope_mismatch · no_tablet_channel).
   나머지 4종(visible · offer_inactive · channel_not_approved · not_linked_to_channel)은
   **프로덕션에 TABLET 채널을 가진 매장이 하나도 없어** 관측 불가였다
   (KPA·KCos 모두 hasTabletChannel=false). 코드 분기는 존재한다.
   → "모든 gate 충족 → runtime visible" 행은 이번에 실증하지 못했다.
4. 편집기 UI 의 사유 문구 렌더 — 브라우저에서 상품 풀 패널까지 클릭 진입하지 못했다.
   API 응답의 주석(값·누락 0)은 실측했으나 화면 문구 자체는 미확인.
5. KCos Screen Set/runtime — 해당 org 태블릿 0대.
6. Neture — WO 범위 밖(§3).
```

---

## 11. 계정 상태

```text
BEFORE : 계정 A · B 모두 suspended
DURING : canonical admin API 로 approved (사용자 승인)
AFTER  : §7-2 결정 대기로 **현재 approved 유지**
         GP 완주 여부가 정해지면 즉시 suspended 로 되돌린다(승인된 계획).
```

---

## 12. 영향 · 금지선

```text
production DB write : users.status 2행 (검증 전용 계정 재활성화, 승인·가역)
schema / migration  : 0
코드 변경           : api-server 2파일 (+수정 1 · 신규 spec 1)
web 서비스 변경     : 0 (배포 불필요)
인증·권한 재설계    : 0
Cafe24 파일럿 확대  : 0
새 공통화 구조 설계 : 0
```

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건

1. TABLET 채널을 가진 검증 매장 fixture 확보 — visibility truth table 6종 전수 실증용 (§10-3)
2. PH 다중 org 연결 fixture — `AMBIGUOUS_STORE_CONNECTION` 실측용 (§10-2)
