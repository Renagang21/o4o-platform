# CHECK-O4O-MY-STORE-RUNTIME-CONTRACT-PRODUCTION-E2E-FINAL-CLOSURE-V1

**대상 WO**: WO-O4O-MY-STORE-RUNTIME-CONTRACT-PRODUCTION-E2E-FINAL-CLOSURE-V1
**시작 HEAD**: `38a6b87e2` → **종료 HEAD**: `c0127b7e6` (배포 완료)
**PR #207 merge SHA**: `30ba6dfe945e00b1430e7f495a438bb151d25570` — main ancestry **포함 확인**
**작성일**: 2026-09-04

---

## 0. 최종 판정

```text
KPA          = PASS
K-Cosmetics  = PASS
PharmacyHub  = PASS
GlycoPharm   = PASS_WITH_FIXTURE_LIMITATION

MY STORE SECONDARY QUALITY CLOSURE : CLOSED
```

GlycoPharm 은 production store-owner **fixture 부재**로 product pool → visibility → runtime
전체 경로를 실브라우저로 완주하지 못했다. 그러나

```text
- 실제 폼 로그인 200
- service-scoped org 후보 0
- 403 STORE_OWNER_REQUIRED 정상
- 타 서비스 org 오선택 0
- 관련 회귀 테스트 PASS
```

이므로 **코드 회귀나 unresolved defect 가 아니라 production fixture coverage limitation** 으로 판정한다.

검증을 위해 production 조직 membership 을 새로 조성하지 않았다 —
이번 WO 의 목적은 공통화 코드와 실제 production 계약의 검증이지 fixture 조성이 아니며,
"fixture 가 없으면 우회 생성하지 않는다" 원칙을 유지했다(2026-09-05 사용자 결정).

| 완료 조건 (WO §15) | 결과 |
|---|---|
| PR #207 main 반영 | **PASS** |
| production 최신 배포 4서비스 | **PASS** (§2) |
| KPA_POST_DEPLOY_E2E_PENDING 해소 | **PASS** (§4) |
| KCos E2E_BLOCKED_AUTH 해소 | **PASS** (§3·§5) |
| GP E2E_BLOCKED_AUTH 해소 | **PASS** (로그인 200) |
| GP 매장 tablet 흐름 | **BLOCKED_BY_FIXTURE** — 회귀 아님 (§7) |
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
| 최종 판정 | **PASS** | **PASS** | **PASS_WITH_FIXTURE_LIMITATION** | **PASS** |

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

## 7. GlycoPharm — PASS_WITH_FIXTURE_LIMITATION

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

### 7-2. 미완 사유와 종결 결정 — fixture 를 조성하지 않는다

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
승인 범위(멤버 1행)보다 크므로 실행하지 않았다.

### 7-3. 종결 결정 (2026-09-05)

권한 규칙을 열어 다시 시도하거나 SQL 을 직접 실행하는 대신 **fixture 공백으로 확정하고 종결**한다.

```text
GP:
  AUTH                          = PASS
  SERVICE-SCOPED ORG RESOLUTION = PASS
  STORE-OWNER FULL FLOW         = BLOCKED_BY_FIXTURE
  REGRESSION                    = NO
```

근거:

1. 이번 WO 의 목적은 **공통화 코드와 실제 production 계약의 검증**이지, 검증을 위해
   production 조직 membership 을 조성하는 것이 아니다.
2. 이번 공통화의 핵심 결함이었던 **타 서비스 조직 오선택은 production 에서 재현되지 않았고,
   오히려 올바르게 거부됨**이 §7-1 로 확인됐다. 즉 검증 목적은 이미 달성됐다.
3. 신규 membership 이 1행이라도 production 운영 상태를 바꾸는 것이고,
   **"fixture 가 없으면 우회 생성하지 않는다"** 원칙과 어긋난다.

따라서 GP 는 `PASS_WITH_FIXTURE_LIMITATION` 이며 unresolved defect 로 남기지 않는다.
후속으로 GP 검증 fixture 가 정식으로 생기면 그때 tablet 전 경로를 완주한다(§문서 정합 제안 3).

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
1. GP 매장 tablet 흐름 — fixture 부재로 미수행. 회귀가 아니라 coverage limitation (§7-3).
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
DURING : canonical admin API 로 approved (사용자 승인) → 4서비스 E2E 수행
AFTER  : canonical admin API 로 suspended 원복 완료 (HTTP 200 ×2)
```

**원복을 선언만 하지 않고 실측했다** — 4개 (계정 × serviceKey) 조합 전부
`ACCOUNT_NOT_ACTIVE` 로 다시 막히는 것을 확인했다.

```text
계정A/kpa-society  → ACCOUNT_NOT_ACTIVE
계정A/glycopharm   → ACCOUNT_NOT_ACTIVE
계정A/pharmacy-hub → ACCOUNT_NOT_ACTIVE
계정B/k-cosmetics  → ACCOUNT_NOT_ACTIVE
```

검증 중 발급한 로컬 토큰 파일도 모두 삭제했다.
`organization_members` 는 **추가하지 않았다** — GP org 는 BEFORE 그대로 members 1 (renagang21/owner).

---

## 12. 영향 · 금지선

```text
production DB write : users.status 2행 — 재활성화 후 **원복 완료**(순변화 0)
organization_members : 0행 (조성하지 않음)
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
3. GlycoPharm store-owner fixture 정식 확보 — GP tablet 전 경로 완주용 (§7-3).
   이번에는 우회 조성하지 않고 coverage limitation 으로 남겼다.

---

# Addendum — 최종 종결 (2026-09-07)

## A-1. 선행 PR 상태

| PR | 내용 | 상태 |
|---|---|---|
| #207 | `WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1` 본체 | **MERGED** 2026-09-04T13:49:41Z · head `98bbd4a23` · merge commit `30ba6dfe9` |
| #208 | `reserveSlug` census drift closure (main green 복구) | **MERGED** 2026-09-07T00:08:51Z |
| #211 | 태블릿 client 계약 중복 해소 (타입 전용) | **MERGED** · merge commit **`6322f360d18c6d630aab16cfc359a6d7b2d7397e`** |

> #207 은 본 세션의 main merge push(`7d7d00a98`) · dedup push(`26c7e0eb1`) **이전에** 이미 merge 되어
> 두 push 는 main 에 도달하지 못했다. dedup 커밋을 `origin/main` 기준 새 브랜치로 옮겨 #211 로 재제출했다.

**#211 범위**: `@o4o/store-ui-core` 에 `StoreTabletRow` · `StoreTabletDisplayRow` ·
`StoreTabletProductPoolResponse<TLocalProduct>` 추가, KCos/GP client 는 **타입 alias 만** 사용.
`BASE` 경로 · 함수 본문 · runtime 동작 변경 0. 임계 완화 · `NOSONAR` · 테스트 삭제 · gate 우회 없음.
service tablet spec 의 병렬 테스트 본문 중복은 **의도적으로 유지**(추상화하면 무엇을 단언하는지 가려진다).

## A-2. Production 배포

```text
main SHA            : 6322f360d
API revision        : o4o-core-api-03543-ddr   (2026-09-07T02:12:18Z)
image digest        : sha256:cd94e232ee45678cd7aefb7af3a27a1d4904e0394baa12d99e2124b107ac36ab
web revisions       : kpa-society-web-01921-5m2 · k-cosmetics-web-01092-vqv
                      glycopharm-web-01349-zrs · pharmacy-hub-web-00182-sgl · neture-web-01547-5v9
                      (모두 2026-09-07T02:08~02:09Z)
health              : https://api.neture.co.kr/health → alive / production / 0.5.0
```

Deploy API Server · Deploy Web Services · Deploy Admin Dashboard · CodeQL 모두 `success`.

## A-3. 인증 — 우회 조성 없음

계정 `renagang21@gmail.com` (기존 승인된 검증 계정, `docs/local/TEST-ACCOUNTS.local.md`).
**임시 계정 생성 0 · self-grant 0 · role 변경 0 · membership 생성 0 · DB 직접 수정 0.**

발급 토큰의 roles 에 `kpa:store_owner` · `cosmetics:store_owner` · `glycopharm:store_owner` ·
`pharmacy-hub:store_owner` 가 이미 모두 포함되어 있고 4개 membership 이 전부 `active` 다.

로그인 실측 (`serviceKey` 필수):

| serviceKey | 결과 |
|---|---|
| `kpa-society` | 200 |
| `k-cosmetics` | 200 |
| `glycopharm` | 200 |
| `cosmetics` | 401 `SERVICE_NOT_MEMBER` — **문서 표기 오류**. 실제 membership serviceKey 는 `k-cosmetics` |
| `pharmacy-hub` | 401 `INVALID_CREDENTIALS` — 서비스 credential 이 문서와 불일치 (fixture drift) |

PH 는 위 계정이 정상 발급받은 토큰(`pharmacy-hub:store_owner` 보유)으로 검증했다.
**PH 로그인 credential 문서 drift 는 인증 fixture 문제이며 My Store runtime 계약의 결함이 아니다.**

## A-4. Production E2E 결과

### 서비스별 mount 응답 (모두 200)

| 서비스 | mount | tablets | product-pool | display-settings |
|---|---|:---:|:---:|:---:|
| KPA | `/api/v1/kpa/store` | 200 | 200 | 200 |
| K-Cosmetics | `/api/v1/cosmetics/store` | 200 | 200 | 200 |
| GlycoPharm | `/api/v1/glycopharm/store` | 200 | 200 | 200 |
| PharmacyHub | `/api/v1/pharmacy-hub/store-owner` | 200 | 200 | — |

### 축 A — 조직 해석 스코프 (핵심 회귀 대상)

`product-pool` supplier product row id 집합의 **쌍별 교집합 = 전부 0**:

```text
rows : kpa=31  kcos=1  gp=1  ph=19   neutral(/api/v1/store)=0
overlap : kpa∩ph=0  kcos∩kpa=0  kcos∩ph=0  gp∩kpa=0  gp∩kcos=0  gp∩ph=0
```

→ 네 mount 가 각각 **서로 다른 조직**을 해석한다. 타 서비스 조직 유출 없음.
서비스 중립 back-compat mount `/api/v1/store/product-pool` 은 Neture(공급자) 조직을 골라 0행 —
KCos/GP 를 서비스 축으로 재스코프한 축 A 설계와 일치한다.

행 수준 격리도 확인: KPA 태블릿 id 를 PH · KCos mount 로 조회 → **404 `NOT_FOUND`** (200 유출 아님).

### 축 B — runtime 계약 필드 실측

`/tablets` 응답이 `StoreTabletRow` 와 일치: `id · name · location · is_active · created_at`.
`/tablets/:id/displays` 응답이 `StoreTabletDisplayRow` 와 일치:

```json
{"id":"9932c00a-…","product_type":"local","product_id":"cd3a2b29-…",
 "sort_order":0,"is_visible":true,"created_at":"2026-07-17T03:04:01.586Z"}
```

`/product-pool` 응답이 `StoreTabletProductPoolResponse` 와 일치:
`supplierProducts` · `localProducts` · `tabletChannel{hasTabletChannel,hasApprovedTabletChannel,tabletChannelStatus}`.
`/tablets/:id/idle-playlist` → `{items:[]}` 정상.

### deep link · 새로고침

| 경로 | 결과 |
|---|---|
| `kpa-society.co.kr/store/tablets` | 200 |
| `k-cosmetics.site/store/tablets` | 200 |
| `glycopharm.co.kr/store/tablets` | 200 |
| `pharmacyhub.co.kr/store-owner/tablets` | 200 (`pharmacy-hub.co.kr` 은 미매핑 — 정본 도메인은 하이픈 없음) |
| `POST /auth/refresh` → 재조회 | 200 → `/kpa/store/tablets` 200 |

> 중간에 관측한 refresh 401 `TOKEN_FAMILY_MISMATCH` 는 **검증 절차 자체가 만든 현상**이다
> (같은 계정으로 4회 연속 로그인 → token family 회전). 단일 로그인 후 refresh 는 200 이다. 결함 아님.
> `POST /auth/refresh` 를 body 없이 호출하면 LB 가 411 을 돌려준다 — 앱 도달 전 단계이며 결함 아님.

## A-5. 판정

```text
KPA          : PASS
PharmacyHub  : PASS
K-Cosmetics  : PASS
GlycoPharm   : PASS

MY STORE RUNTIME CONTRACT PRODUCTION E2E = CLOSED
```

발견된 코드 결함: **0건**. 발견된 문서 fixture drift: 2건 (A-6).

## A-6. 잔여 — 문서 fixture drift (코드 아님)

`docs/local/TEST-ACCOUNTS.local.md` (gitignored) 실측 불일치 2건. **본 WO 범위 밖이라 수정하지 않고 보고만 한다.**

1. K-Cosmetics serviceKey 표기가 `cosmetics` 로 되어 있으나 실제 membership 은 `k-cosmetics`.
2. `renagang21@gmail.com` 의 pharmacy-hub 서비스 credential 이 문서 값과 불일치 (401).

## A-7. production DB 순변화

```text
쓰기 목적 작업     : 0 (모든 검증 호출은 GET)
role / membership  : 0
schema / migration : 0
테스트 조건 조성   : 0
부수 효과          : 로그인에 따른 users.lastLoginAt 갱신 · refresh token family 발급
                     (정상 인증 경로의 부수 효과이며 검증 조건 조성이 아니다)

production DB net change = 0
```

## 문서 정합

발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
→ `TEST-ACCOUNTS.local.md` fixture 정정 (A-6). gitignored 로컬 문서이므로 별도 항목으로 남긴다.
