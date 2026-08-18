# CHECK-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1

> **WO**: [WO-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1](../work-orders/WO-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1.md)
> **판정**: **STOP_AT_PHASE_A** — WO §15 중지 조건 4/6 + CLAUDE.md 중지 조건 2건 성립
> **일자**: 2026-08-18 · **코드 변경 0 · DB 변경 0 · 외부 API 호출 0**

## 0. 요약

Phase A(기존 O4O 재사용 경계 확인)를 코드로 완주했다. 결론은 **Phase B 이후를 지금 구현하면 안 된다**는 것이다.

WO 가 스스로 정의한 §15 중지 조건 6개 중 **4개가 실제로 성립**한다. 억지 우회(원장 복제·public 개방·serviceKey 화이트리스트 추가·organization 강제 생성)는 모두 WO §2 "절대 하지 않을 것" 또는 Frozen Baseline 위반으로 이어진다.

| §15 중지 조건 | 성립 | 근거 |
|---|:---:|---|
| Cafe24 상품 식별정보가 매칭에 현저히 부족 | **판정 불가** | Cafe24 실 계정·테스트몰 부재(§6) |
| QR 접근정책을 바꿔야만 Pilot 가능 | **YES** | §3 |
| Tablet 사용에 기존 O4O membership/store 생성이 필수 | **YES** | §4 |
| Cafe24 앱을 기존 supplier/serviceKey 로 넣어야만 동작 | **YES** | §3·§4·§5 (serviceKey 화이트리스트 3곳) |
| 기존 ProductMaster 를 수정해야만 매핑 가능 | NO | §2 — 읽기만으로 충분 |
| Signage 사용에 supplier 유통구조/service membership 생성이 필수 | **YES** | §5 |

추가로 CLAUDE.md 중지 조건 2건: **DB schema 신규 테이블 필요**(§6-1), **외부 서비스 자격정보·승인 필요**(§6-2).

---

## 1. 조사 범위

- 대상: `apps/api-server` · `packages/{screen-content-core,tablet-screen-set-editor,tablet-kiosk-core,digital-signage-core}`
- 방법: 정적 코드·migration·guard 추적. 프로덕션 DB 접속 없음, 외부 API 호출 없음.
- Cafe24 관련 코드/자격정보 전수 검색 결과 **저장소 내 Cafe24 참조는 이 WO 문서 1건뿐**이다. 기존 연동 자산 0.

---

## 2. ProductMaster — 재사용 가능 (문제 없음)

WO §3 이 요구한 lookup 경로는 **이미 존재하고 그대로 쓸 수 있다.** Cafe24 때문에 ProductMaster 를 수정할 필요는 없다.

| 필요 | 경로 | 비고 |
|---|---|---|
| 텍스트/바코드/제조사 검색 | `GET /api/v1/neture/products/library/search` — `product-library.controller.ts:64`, mount `bootstrap/register-routes.ts:827` | `requireAuth` 만. 비관리자는 ACTIVE-only 강제 |
| 검색 대상 컬럼 | `modules/neture/services/catalog.service.ts:399-411` | `name` / `regulatory_name` / `barcode` / `manufacturer_name` / `product_aliases` |
| 이름 기반 후보 매칭 | `BulkMatchService.matchNames` — `services/bulk-match.service.ts:64` | `EXACT_MATCH` / `SIMILAR_MATCH` / `NOT_FOUND` 3-상태. WO §6 우선순위 3 에 그대로 대응 |
| 식별자 조회 | `ProductIdentifierService.findByIdentifier` / `findByNormalizedValue` — `services/product-identifier.service.ts:50,62` | **서비스 레벨만 존재. HTTP route 미등록** |

### 2-1. 확인된 갭 2건 (Pilot 진행 시 필요, 그러나 blocker 아님)

1. **검색이 `product_identifiers` 를 보지 않는다.** WO §6 매칭 우선순위 2(자체상품코드 ↔ ProductIdentifier 일치)를 지금 API 로는 수행할 수 없다. `catalog.service.ts` 검색 WHERE 에 `EXISTS (product_identifiers …)` 를 additive 로 넣거나, identifier lookup 을 HTTP 로 노출해야 한다 — **공유 검색 API 수정**이므로 CLAUDE.md Shared Module 규칙상 소비처(관리자 목록·공급자 picker·저작 picker) 영향 확인이 선행돼야 한다.
2. **`barcode` 는 nullable 이고 O4O 합성 내부코드 생성은 중단됐다** (`entities/ProductMaster.entity.ts:41-46`). 즉 O4O 측에도 실 바코드가 없는 master 가 존재한다 — 매칭률은 Cafe24 측 입력 품질만의 문제가 아니다.

---

## 3. QR — **중지 조건 성립**

QR 계열이 **두 갈래**이고, Cafe24 외부 사업자에게는 **양쪽 다 그대로는 못 쓴다.**

### 3-1. 제품 Landing QR (ProductMaster 기준 고정 URL)

- 공개 read: `GET /api/v1/public/product-landings/:publicKey` — `modules/neture/controllers/product-landing.controller.ts:46`
- **설명서 본문은 O4O 로그인 세션에만 응답한다.** 비로그인은 `authRequired` shell 만 받는다 (Baseline V3-AMENDMENT #8·#9 / **ADR-0002**). 컨트롤러 주석에 명시.
- 발급(mint)은 **admin 전용**: `router.use(requireRole(ADMIN_ROLES))` + `requireProductDbWrite` — 같은 파일 `:73-74`, `:101`

→ Cafe24 사업자는 **자기 상품 QR 을 발급할 수 없고**, 그 QR 을 스캔한 **일반 소비자는 본문을 볼 수 없다**. WO §8 이 "임의로 public 공개하지 않는다"고 못박은 바로 그 지점이다.

### 3-2. 매장 QR (`/qr/{slug}`)

- URL 도출: `routes/platform/store-screen-set-qr.service.ts:29` — `https://{service-catalog domain}/qr/{slug}`. 도메인이 **service-catalog 키에서만** 나온다.
- 원장 `store_qr_codes` 는 `organization_id NOT NULL + FK 강제` — `routes/o4o-store/controllers/qr.controller.ts:36`
- 공개 랜딩은 **이중 게이트**(QR `is_active` + Screen Set 유효) — `store-screen-set-qr.service.ts:56-60`

→ organization 없는 Cafe24 mall 은 QR 행을 만들 수 없고, 만든다 해도 **어느 서비스 도메인으로 URL 을 낼지 정의되지 않는다**(§5-1).

---

## 4. Tablet — **중지 조건 성립**

- **프런트는 재사용 가능하다.** `@o4o/tablet-screen-set-editor` 는 API 주입형이다 — `ScreenSetBuilderApi` / `contentSources` / preview 를 props 로 받고 앱 전역 auth·router 에 의존하지 않는다 (`packages/tablet-screen-set-editor/src/index.tsx:1-30`). 타입 SSOT 는 `@o4o/screen-content-core`.
- **막히는 곳은 백엔드 소유권 축이다.** `store_tablet_screen_sets` 의 `CHK_stss_owner_scope` — `database/migrations/20270210000000-AddScreenSetOwnerScopeModel.ts:47-56`:

```text
origin='store'    → organization_id NOT NULL, supplier_id NULL
origin='operator' → organization_id NULL, service_key NOT NULL, created_by_user_id NOT NULL
origin='supplier' → organization_id NULL, supplier_id NOT NULL, service_key NOT NULL
```

세 조합 어디에도 **"외부 커머스 계정"이 들어갈 자리가 없다.** Cafe24 mall 을 넣으려면 (a) organization 생성 → WO §15 중지, (b) supplier 로 편입 → WO §2 "절대 하지 않을 것" 위반, (c) CHECK 제약 확장 → DB schema 변경(CLAUDE.md 중지) 셋 중 하나다.

---

## 5. Digital Signage — **중지 조건 성립**

- 관리 API: `/api/signage/:serviceKey/*` 에 `requireAuth` + `validateServiceKey` 전역 적용 — `routes/signage/signage.routes.ts:47-48`
- **serviceKey 화이트리스트**: `pharmacy · cosmetics · tourism · common · kpa-society · neture · glycopharm` — `middleware/signage-role.middleware.ts:644`. 미등록 키는 400 `INVALID_SERVICE_KEY`.
- playlist 생성은 `requireSignageStore` → **organizationId 필수**(header/query/body 어디로든) + 해당 조직 권한 — `middleware/signage-role.middleware.ts:261-272`
- 무인증 공개 API 는 존재하나 **`scope='global'` 미디어 읽기 전용**이다 — `routes/signage/signage-public.routes.ts:50`. 매장 playlist 편성·publish 경로가 아니다.
- 엔티티는 `packages/digital-signage-core/src/backend/entities/` 에 17개 존재(Playlist / PlaylistItem / Media / Schedule / Display …). **새 Signage 시스템을 만들 이유는 없다** — WO §3 의 전제는 옳았다.

→ WO §10 이 요구한 "playlist 조회 → 항목 추가 → publish → playback" 전 구간이 `organizationId` + 화이트리스트 serviceKey 를 요구한다.

### 5-1. 관통하는 단일 원인 — serviceKey 화이트리스트 3중

Cafe24 는 세 곳 모두에서 배제된다. 하나만 뚫어도 나머지가 막는다.

| 위치 | 허용 키 |
|---|---|
| `config/service-catalog.ts` | neture · glycopharm · kpa-society · k-cosmetics · pharmacy-hub · kpa-branch |
| `middleware/signage-role.middleware.ts:644` | pharmacy · cosmetics · tourism · common · kpa-society · neture · glycopharm |
| `routes/platform/store-screen-set-qr.service.ts:18-24` (`SVC_TO_CATALOG`) | kpa · kpa-society · glycopharm · cosmetics · k-cosmetics |

---

## 6. Cafe24 Connector 자체의 blocker 2건

### 6-1. 토큰 저장소가 없다 → 신규 테이블 필요 (CLAUDE.md 중지 조건)

기존 외부 채널 인증 선례는 **플랫폼 단일 자격증명 + 메모리 캐시**다 — `modules/external-sales/channels/naver/naver-commerce.client.ts:63-64, :124` (`process.env.NAVER_COMMERCE_*`, `client_credentials`).

Cafe24 는 **mall 별 authorization_code + 장수명 refresh_token** 이라 이 패턴을 쓸 수 없다. WO §4 가 요구한 mall_id / access·refresh token / expiry / install 상태를 담을 **신규 테이블이 반드시 필요**하다 → CLAUDE.md 중지 조건("DB schema · migration 필요").

### 6-2. 자격정보·테스트몰이 없다 → §13 검증 1~9 전 항목 실행 불가

저장소·env 어디에도 Cafe24 client_id/secret 이 없고 테스트 쇼핑몰도 없다. CLAUDE.md 중지 조건("실제 계정 · 자격정보 · 외부 서비스 승인 필요")에 해당한다. **§13 검증 1~9 중 단 하나도 지금 통과시킬 수 없다** — 즉 지금 구현하면 전량 미검증 코드가 된다.

---

## 7. 유용한 선례 — 방향은 반대지만 설계는 그대로 쓸 수 있다

`external_channel_product_links` — `modules/external-sales/entities/external-channel-product-link.entity.ts`

이미 **"연동 상태만 저장하고 상품명·가격·이미지·상세는 저장하지 않는다"** 는 WO §2·§10 과 동일한 철학으로 만들어져 있다. 다만 방향이 반대다.

```text
기존 (outbound) : O4O ProductMaster  →  NAVER / COUPANG 판매 등록
이번 (inbound)  : Cafe24 상품        →  O4O ProductMaster 연결
```

키는 `UNIQUE(organization_id, master_id, channel_code)` 로 **매장(organization) 기준**이다. Cafe24 mapping 을 여기에 얹으려면 소유 축이 `organization_id` → `외부 계정(mall)` 으로 바뀌어야 하므로 **같은 테이블 재사용은 부적절**하고, 같은 설계 원칙의 **별도 테이블**이 맞다.

> 부수 확인: WO §12 는 "Naver/Coupang API 구현 금지"라 했는데, **판매 등록 방향 연동은 이미 구현되어 있다**(`naver-commerce.client.ts`). WO §12 는 "이번 Pilot 에서 추가 개발 금지"로 읽으면 모순이 없다. 문서 수정은 하지 않았다.

---

## 8. 최소 후속 구조 제안 (WO §15 "최소 후속 구조를 제안한다")

지금 필요한 것은 코드가 아니라 **결정 3개**다. 셋 다 정해지기 전에는 어떤 구현도 되돌릴 비용이 커진다.

### 결정 1 — 외부 커머스 계정의 O4O 내 표현 (가장 근본)

| 안 | 내용 | 비용 | 위험 |
|---|---|---|---|
| **A** | Cafe24 mall 마다 **organization + store 를 생성**해 기존 store 축을 그대로 탄다 | 코드 변경 최소 (QR·Tablet·Signage 전부 즉시 동작) | WO §15 가 명시적으로 금지한 경로. organization 의미 오염 |
| **B** | `external_commerce_accounts` 신규 축 + 각 소비처에 **owner adapter** 도입 | 큼 (CHECK 제약·guard·serviceKey 3곳) | Frozen Baseline(F3 Store Layer, F6 Boundary) 재해석 필요 → 별도 WO |
| **C** | Cafe24 를 **`serviceKey` 하나로 등록**하고 mall 을 그 서비스의 store 로 둔다 | 중간 | service-catalog 의미(= O4O 자체 서비스)와 충돌 |

권고는 **B 를 목표로 두되, 그 자체가 Baseline 판정 WO 로 선행**되어야 한다는 것이다. A 는 당장 동작하지만 WO 가 이미 금지했고, 나중에 되돌릴 수 없다.

### 결정 2 — QR 소비자 접근 모델

현행 ADR-0002(설명서 본문 = O4O 로그인 전용)를 Cafe24 소비자에게 적용하면 QR 은 사실상 무의미하다. 필요한 최소 모델은 **"외부 계정이 소유한 랜딩에 한해 본문 공개"** 인데, 이는 ADR 개정이므로 **QR 접근정책 전용 WO** 로 분리해야 한다.

### 결정 3 — Connector 를 먼저 분리 발주

결정 1·2 와 무관하게 **Phase B(OAuth Connector)만 단독으로 선행 가능**하다. 다만 §6-1(신규 테이블) · §6-2(자격정보) 승인이 선행 조건이다.

**권고 실행 순서**: ① Cafe24 앱 등록·테스트몰 확보(사용자) → ② 토큰 테이블 schema 승인 → ③ Phase B~C 만 구현·검증(상품 조회까지) → ④ **그 실 데이터로 §15 첫 번째 중지 조건(식별정보 충분성)을 실측** → ⑤ 결정 1·2 판정 WO → ⑥ Phase D~E.

④ 가 핵심이다. Cafe24 실 상품의 식별자 품질을 모른 채 결정 1·2 를 확정하면, 매칭률이 낮을 경우 만든 구조 전체가 무의미해진다.

---

## 9. WO §14 CHECK 필수 항목 대조

| 항목 | 결과 |
|---|---|
| 구현 구조 | **구현 없음** (Phase A 에서 중지) |
| Cafe24 OAuth scope | 미확인 — 앱 등록 불가(§6-2) |
| Cafe24 실제 확보 가능 상품 필드 | **미확인** — 테스트몰 부재. 문서상 `READ_PRODUCT` 만으로 단건 조회 가능(WO 부록 B) |
| ProductMaster 매칭 방식 | 경로 확인 완료(§2). identifier 검색 갭 1건 |
| mapping 저장 위치 | **미결정** — 결정 1 선행(§8) |
| 기존 O4O 코드 재사용 부분 | product-library 검색 · BulkMatchService · tablet-screen-set-editor(주입형) · digital-signage-core |
| 신규 코드 | 0 |
| QR 계약 결과 | **불가** — 발급 admin 전용 + 본문 로그인 게이트(§3) |
| Tablet 계약 결과 | **불가** — `CHK_stss_owner_scope` 3조합에 외부 계정 없음(§4) |
| Signage 계약 결과 | **불가** — organizationId + serviceKey 화이트리스트(§5) |
| Supplier/Offer/Listing 생성 0 | **확인** — 코드 변경 0 |
| 주문/회원/결제 API 사용 0 | **확인** — 외부 호출 0 |
| browser smoke | **미실행** — 검증 대상 기능 없음 |
| 실제 제품 매칭 표본 결과 | **없음** — Cafe24 상품 확보 불가 |
| 다음 보완 필요사항 | §8 결정 1~3 |

---

## 10. Git · 문서 정합

- 코드/DB 변경 0. 이 CHECK 문서 1건만 추가.
- **문서 정합**: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(§8).
  발견 1건 = WO §12 "Naver/Coupang 구현 금지" 와 기존 `modules/external-sales` 구현의 표면적 충돌(§7). 방향이 달라 실제 모순은 아니므로 **문서 수정 없이 보고만** 한다.
