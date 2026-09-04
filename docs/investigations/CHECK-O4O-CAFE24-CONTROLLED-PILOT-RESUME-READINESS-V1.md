# CHECK-O4O-CAFE24-CONTROLLED-PILOT-RESUME-READINESS-V1

> **WO**: WO-O4O-CAFE24-CONTROLLED-PILOT-RESUME-READINESS-V1
> **선행**: [CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1](./CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1.md) · [CHECK-O4O-CAFE24-APP-ENTRY-ROUTE-V1](./CHECK-O4O-CAFE24-APP-ENTRY-ROUTE-V1.md) · [WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1](../work-orders/WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1.md)
> **판정**: **PASS — 재승인 완료 · products/variants 실조회 성립 · Pilot 등록 대기**
> **일자**: 2026-09-04 (재승인 후 Phase C 재개분 포함)

## 0. 요약

| 단계 | 결과 |
|---|---|
| Phase A 연결 상태 실측 | 완료 — 연결 1행 존재, **refresh token 만료** |
| Phase B 연결 복구 | **완료** — 사용자 재승인(2026-09-04) 후 ACTIVE · refresh 만료 2026-09-18T10:36:50Z |
| Phase C products/variants 계약 재확인 | **완료** — `mall.read_product` 단일 scope 로 **variants 조회 200 성립**. §3 |
| Phase D ProductMaster 표본 선정 | 완료 — **30건 / 7개 실험군** |
| Phase E Cafe24 등록용 데이터 준비 | 완료 — `C:/tmp/cafe24-pilot/` 4파일 (repo 밖) |
| 후속 WO 자동 실행 | 없음 — 사용자 지시 대기 (WO §13) |

**DB write 0.** Phase B 의 refresh 시도는 실패해 갱신이 없었고, 재승인 write 는 사용자가 O4O 화면에서 수행한 정상 운영 write 다.
Phase C 재조회는 유효한 access token 을 그대로 썼으므로 refresh 갱신도 일어나지 않았다.
`product_masters` / `product_identifiers` 는 SELECT 만 했다. Cafe24 상품 원장 복제 0.
secret/token 실제 값은 이 문서·산출물·로그 어디에도 없다.

---

## 1. Phase A — 재승인 전 연결 상태 (실측 · 이력)

프로덕션 DB `cafe24_connections` 실조회 (cloud-sql-proxy · read-only).

| 항목 | 값 |
|---|---|
| id | `85a0cc58-…` |
| mall_id / shop_no | `sohae2100` / `1` |
| scopes | `["mall.read_product"]` (확대 없음) |
| status | `ACTIVE` ← **당시 실제 상태와 달랐다. §1-1** |
| access_token_expires_at | 2026-08-20T08:37:04Z (만료) |
| refresh_token_expires_at | **2026-09-03T06:37:04Z (만료)** |
| last_refreshed_at | 2026-08-20T06:37:05Z |
| last_error | null |
| connected_by_user_id | 존재 (값 비노출) |

측정 시각 `2026-09-04T00:01:22Z` 기준 access·refresh **둘 다 만료**. refresh token 은 약 17시간 전에 만료됐다.

Cloud Run `o4o-core-api` 최신 리비전 `o4o-core-api-03510-r4b` env 실측:

| 항목 | 상태 |
|---|---|
| `CAFE24_CLIENT_ID` / `CAFE24_CLIENT_SECRET` | secretKeyRef (`cafe24-client-id` / `cafe24-client-secret`) — 유지 |
| `CAFE24_REDIRECT_URI` | 평문 env = `https://api.neture.co.kr/api/v1/admin/cafe24/callback` — 유지 |
| `CAFE24_SCOPES` | **미설정** → 코드 기본값 `mall.read_product` |
| `ENCRYPTION_KEY` | secretKeyRef (`o4o-encryption-key`) — 유지 |

선행 CHECK §1-1 의 "승인 대기 2건"은 **이미 처리돼 있다**:
`.github/workflows/deploy-api.yml:314` 의 `--set-env-vars` 체인에 `CAFE24_REDIRECT_URI` 가 정본으로 들어갔고,
임시 `cafe24-redirect-uri` secret 은 은퇴했다(현재 Secret Manager 의 cafe24 secret 은 client-id / client-secret 2개뿐).
→ **CI 배포가 redirect_uri 를 지우던 선행 사고는 재발 구조가 아니다.**

### 1-1. `status` 컬럼은 지연 갱신된다 (실측 발견)

`status` 는 여전히 `ACTIVE` 이지만 실제로는 만료 상태다. `Cafe24ConnectionService.getUsableAccessToken()`
호출 시점에만 `EXPIRED` / `ERROR` 로 표시하므로 **아무도 쓰지 않는 동안은 만료돼도 ACTIVE 로 남는다.**
운영 화면에서 `status` 만 보고 "연결 살아 있음"으로 판단하면 안 된다. 정확한 축은 `refresh_token_expires_at` 이다.
(이번 WO 범위 밖이라 코드는 손대지 않았고, 상태 write 도 하지 않았다. §8 별도 WO 제안.)

---

## 2. Phase B — 복구 시도 → 재승인 (완료)

만료 시각만 보고 판단하지 않고 **Cafe24 에 실제로 물었다.**
임시 probe 로 `getUsableAccessToken()` 의 사전 만료검사를 우회해
`POST /api/v2/oauth/token` (`grant_type=refresh_token`) 을 직접 호출했다.

```
step=refresh  result=FAILED  error=CAFE24_TOKEN_REQUEST_FAILED_400
```

Cafe24 가 400 으로 거부 → **refresh token 은 실제로 폐기됐다.** 우회로는 만들지 않았다(WO §4 지시).
probe 스크립트는 실행 후 삭제했고, refresh 성공 시에만 저장하도록 짜서 **DB write 0건**이다.
(성공했다면 Cafe24 가 기존 refresh token 을 폐기하므로 반드시 원자적으로 저장해야 한다 — 그 경로도 태울 준비는 했으나 타지 않았다.)

### 2-1. 사용자 재승인 — **2026-09-04 완료**

요청한 절차는 아래 하나였고, 사용자가 수행해 연결이 복구됐다.

1. `https://neture.co.kr/cafe24?mall_id=sohae2100&shop_no=1` 접속
2. **O4O 관리자로 로그인** (Cafe24 몰 관리자 계정이 아니다 — 선행 CHECK-APP-ENTRY-ROUTE §4 의 구조적 제약 그대로)
3. `[연결 시작]` 클릭
4. Cafe24 승인 화면에서 승인 — 권한은 **상품 읽기 `mall.read_product` 하나**여야 한다

재승인은 같은 `(mall_id, shop_no)` 행을 `upsertFromTokenResponse()` 가 덮어쓴다.
→ **새 organization / supplier / serviceKey 는 생기지 않고, 연결 id 도 유지된다.**

재승인 결과: status `ACTIVE` · scopes `["mall.read_product"]` · lastError null ·
access 만료 `2026-09-04T12:36:50Z` · refresh 만료 `2026-09-18T10:36:50Z`.
같은 `(mall_id, shop_no)` 행이 덮어써졌고 **새 organization / supplier / serviceKey 는 생기지 않았다.**

> refresh token 수명은 14일이다 (8/20 발급 → 9/3 만료 → 9/4 재승인 → **9/18 만료**).
> **2주 넘게 방치하면 매번 재승인**이 필요하다. 자동 갱신 잡은 이번 WO 범위 밖이며 별도 판단이다 (§7).

---

## 3. Phase C — products / variants 실조회 (재승인 후 실측)

재승인으로 연결이 복구된 뒤 실제로 호출했다. **scope 는 `mall.read_product` 하나 그대로이며 확대하지 않았다.**

| 항목 | 결과 |
|---|---|
| 연결 | status `ACTIVE` · scopes `["mall.read_product"]` · lastError null |
| access / refresh 만료 | 2026-09-04T12:36:50Z / **2026-09-18T10:36:50Z** |
| `GET products/count` | **200** · count = **2** (테스트몰 상품 수 그대로) |
| `GET products` | **200** · 2건 수신 · 응답 key **86개** |
| `GET products/{product_no}/variants` | **200 · 2건 모두 성공** — 품목 각 1개 |
| API 버전 | `2026-03-01` |

### 3-1. **variants 는 `mall.read_product` 만으로 조회된다** — WO §11 중지 조건 해소

두 상품(product_no 9, 10) 모두 HTTP 200 으로 품목이 반환됐다.
**scope 확대는 필요 없다.** Controlled Pilot 의 variants 축은 그대로 진행 가능하다.

### 3-2. `barcode` 부재 재확인 — 그리고 `gtin` 발견 (이번 실측의 핵심)

`products` 응답 key 86개를 2026-08-20 census 산출물과 집합 비교했다 → **추가 0 / 삭제 0, 완전 동일**.
따라서 **`barcode` 는 상품 레벨 응답 key 로 지금도 존재하지 않는다**(재확인).

그런데 **`variants` 응답에는 `gtin` key 가 있다.** 실측 variants key 17개:

```
additional_amount, custom_variant_code, display, display_order, display_soldout,
gtin, image, important_inventory, inventory_control_type, options, quantity,
safety_inventory, selling, shop_no, supply_price, use_inventory, variant_code
```

즉 **Cafe24 의 바코드 축은 상품이 아니라 품목(variant)에 있다.** 선행 census 가 "barcode 사다리 재검토"로
남겨둔 항목의 답이 여기 있다 — 사다리를 버릴 게 아니라 **variant 레벨로 내려야 한다.**

다만 현재 테스트몰 2건은 `gtin: null`, `custom_variant_code: ""` 라
**"값을 넣으면 그대로 되읽히는가"는 아직 확인되지 않았다.** 이것이 Pilot 에서 확인할 항목이다(§5-2).

### 3-3. 옵션 없는 상품도 variant 1건을 갖는다

옵션이 없는 상품도 `variant_code = {product_code}000A` 형태의 품목 1건을 반환했다
(`options: null`). → **모든 상품이 품목 레벨 식별자를 최소 1개 갖는다**는 뜻이고,
`custom_variant_code` / `gtin` 을 연결키로 쓰는 설계가 옵션 유무와 무관하게 성립할 수 있다.

### 3-4. 선행 CHECK 의 key 개수 정정

선행 CHECK-…-CENSUS-RESUME-V1 §4 는 실측 key 를 "84개"로 적었으나,
당시 산출물(`C:/tmp/cafe24-census-sohae2100.json`)의 실제 `observedResponseKeys` 는 **86개**이고
이번 86개와 완전히 같다. 기록물이므로 원문은 수정하지 않고 여기에 정정만 남긴다 (CLAUDE.md §16-1·§16-2).

## 4. Phase D — ProductMaster 표본 30건

`product_masters` (272,039행 · 전부 ACTIVE) 에서 실재하는 30건을 선정했다. **읽기만 했다.**

### 4-1. 표본과 무관하게 성립하는 구조적 사실 (이번 실측)

| 사실 | 근거 |
|---|---|
| **O4O 측에도 barcode 가 없다** — 화장품 / 건강기능식품 / 의약외품 3종 전부 `barcode IS NULL` | COSMETIC 32,675 · 건강기능식품 40,948 · QUASI_DRUG 17,148 중 barcode 보유 **0건**. barcode 가 있는 181,244건은 DRUG · MEDICAL_DEVICE 쪽이다 |
| **화장품은 제조사 축이 아예 없다** | COSMETIC 32,675건 중 `manufacturer_name` 비어있지 않은 건 **0건** |
| 화장품의 유일한 주체 축은 브랜드다 | COSMETIC 32,674건에 `brand_name` 존재. 반대로 건강기능식품·의약외품은 `brand_name` **0건** |
| 강한 식별자는 품목군마다 다르다 | QUASI_DRUG 17,148건 전부 `MFDS_CODE` 보유 / COSMETIC·건강기능식품은 identifier **0건** / GTIN 3,826건은 전부 MEDICAL_DEVICE |

**따라서 선행 census 가 지적한 "barcode 사다리 재검토"는 Cafe24 쪽만의 문제가 아니다. O4O 쪽에서도 성립하지 않는다.**
그리고 **"상품명+제조사" 사다리는 화장품 전체에서 구조적으로 불가능**하다. 이 둘은 테스트몰 표본이 몇 건이든 바뀌지 않는다.

동명(정규화 후) 그룹 수: COSMETIC 182 · 건강기능식품 2,842 · QUASI_DRUG 8.

### 4-2. 품목군 선택 — 의약품(DRUG)을 넣지 않은 이유

Cafe24 몰에 올릴 수 있는 성격의 품목만 골랐다(화장품 · 건강기능식품 · 의약외품).
DRUG 177,413건은 barcode·식별자가 가장 풍부하지만 온라인 판매 대상이 아니어서 Pilot 모집단에 넣지 않았다.
→ **이 Pilot 이 답하는 것은 "화장품/건기식/의약외품에서 어떤 키가 통하는가"이며, 의약품 축은 별개다.**

### 4-3. 실험군 구성 (30건 · WO §8)

| 군 | 건수 | 구성 | 이 군이 답하는 질문 |
|---|---:|---|---|
| **A** | 5 | 정확한 상품명 + `custom_product_code` = **실제 MFDS_CODE** + 제조사 (QUASI_DRUG) | 강한 식별자를 Cafe24 자체상품코드에 실으면 identifier 사다리가 성립하는가 |
| **B** | 5 | 정확한 상품명 + 식별자 없음 + 제조사 (건강기능식품) | 상품명 완전일치만으로 EXACT 가 되는가 |
| **C** | 5 | 상품명 변형 + 제조사 있음 (건강기능식품) | 띄어쓰기·괄호·용량·숫자표기 차이를 제조사가 구제하는가 |
| **D** | 5 | 상품명 변형 + 제조사 **없음** + 브랜드 있음 (COSMETIC) | 브랜드가 제조사 축을 대체할 수 있는가 |
| **E** | 4 | 정확한 상품명 + `custom_product_code` = **O4O master UUID(36자)** | Cafe24 가 36자 자체코드를 보존하는가 = 최강 연결키 후보 성립 여부 |
| **F** | 3 | 옵션 2~3개 + `custom_variant_code` | `variants` 응답에 품목 식별자가 실제로 실리는가 |
| **G** | 3 | O4O 에 **동명 다건**인 상품 | AMBIGUOUS 를 무엇이 가르는가 |

C 군 변형: `space_removed` · `volume_suffix`(+60정) · `paren_wrap`(앞머리를 `[ ]`) · `number_spacing`(`칼슘 365`→`칼슘365`) · `suffix_pack`(`(1박스)`).
D 군 변형: `space_removed` · `volume_suffix`(+50ml) · `brand_prefix`(`[브랜드] 이름`) · `paren_note`(`(본품)`) · `hyphen_removed`.

G 군 3건은 난이도를 일부러 다르게 뒀다:

| 상품 | O4O 동명 건수 | 가용 축 |
|---|---:|---|
| 장성붕대3호 | 2 | MFDS 식별자 **있음** — 식별자가 가르는지 |
| 홍삼농축액 15 | **13** | 식별자 없음, 제조사만 — 최악 케이스 |
| 인텐시브 크림 | 2 | 제조사 부재, **브랜드만** 다름 (제로이드 / 뉴스템 알엑스) |

30건은 서로 다른 ProductMaster 이며, 복제로 수를 채우지 않았다 (WO §6).

---

## 5. Phase E — Cafe24 등록용 준비물 (repo 밖)

`C:/tmp/cafe24-pilot/` — CSV 는 UTF-8 BOM (Excel 에서 한글 안 깨짐).

| 파일 | 내용 |
|---|---|
| `cafe24-pilot-products-v1.csv` | **정본 대조표** — O4O 원본값(`o4o_*`) + Cafe24 입력값(`cafe24_*`) + 변형종류 + 실험의도를 한 행에 |
| `cafe24-pilot-products-v1.json` | 같은 내용 (후속 매칭 러너 입력용) |
| `cafe24-pilot-upload-paste-v1.csv` | Cafe24 엑셀 양식에 **붙여넣기용** 30행 (상품명 / 자체상품코드 / 제조사 / 브랜드 / 판매가 / 진열·판매상태 / 옵션명 / 옵션값 / 품목자체코드 / **품목바코드** / PILOT_GROUP) |
| `README.md` | 실험군 설계 + 사용 절차 |

O4O ProductMaster 원본값은 **수정하지 않았다**(WO §7). 변형은 `cafe24_product_name` 쪽에만 가했고
`name_mutation` 컬럼에 종류를 남겨 후속 매칭에서 원인을 되짚을 수 있게 했다.
`판매가 = 10000` 은 Cafe24 필수값을 채우기 위한 자리표시다 (`product_masters` 에 가격이 없고 이번 Pilot 은 가격을 쓰지 않는다).

### 5-2. Phase C 결과 반영 — `품목바코드` 열 추가 (2026-09-04)

§3-2 에서 `variants.gtin` 이 실재함을 확인했으므로, 붙여넣기 파일에 **`품목바코드`** 열을 추가했다.
A군 5건에 MFDS_CODE 를 넣어 두었고, 정본 대조표에도 `cafe24_gtin` 열로 함께 기록했다.

이 칸의 목적은 "MFDS_CODE 가 GTIN 이다"라고 주장하는 것이 **아니다**. 확인하려는 것은 하나다 —
**Cafe24 품목 바코드 필드에 값을 넣으면 `variants.gtin` 으로 그대로 되읽히는가.**
되읽힌다면 O4O 식별자를 품목 레벨에 실어 barcode 사다리를 되살릴 수 있고, 아니면 그 경로는 닫힌다.

### 5-1. 공식 엑셀 양식은 확보하지 못했다 — 정직하게 남긴다

Cafe24 상품등록 엑셀 양식은 **몰 관리자 로그인 세션에서만** 내려받을 수 있어 확보하지 못했다.
그래서 `upload-paste` 파일의 한글 헤더는 **Cafe24 실제 필드명이 아니라 의미 라벨**이다. 맞는다고 단언하지 않는다.

사용자가 양식을 내려주시면(몰 관리자 → 상품 → 엑셀 관리 → 상품 등록(엑셀) → 양식 다운로드)
그 양식의 실제 헤더에 맞춰 **1회 재생성**한다. WO §11 의 "엑셀 양식이 반드시 필요" 중지 조건에는 해당하지 않는다 —
양식 없이도 관리자 화면에서 이 파일을 참고해 등록할 수 있기 때문이다.

---

## 6. 남은 사용자 행동 — **1건**

**상품 30건 등록** (Cafe24 몰 관리자). `C:/tmp/cafe24-pilot/cafe24-pilot-upload-paste-v1.csv` 를 쓴다.

- 상품 → 엑셀 관리 → 상품 등록(엑셀) → **양식 다운로드** 후 그 양식을 전달해 주시면
  헤더를 맞춘 완성본을 **1회** 만들어 드린다 (WO §9 — 사용자 행동을 한 번으로 제한).
- 양식 없이도 붙여넣기 파일을 참고해 관리자 화면에서 직접 등록할 수 있다.
- 등록 시 **`품목자체코드` 와 `품목바코드` 를 반드시 함께 넣는다**(§5-2). 이 두 칸이 이번 Pilot 의 핵심 측정 대상이다.

**30건 수동 타이핑은 요청하지 않는다** (WO §9 목적 달성).

---

## 7. 기존 Controlled Pilot 실행 가능 여부 · 다음 단계

`WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1` 은 **즉시 실행 가능하다.**
연결 · 코드 · 자격정보 · 라우트 · census 러너가 모두 살아 있고, products/variants 실조회도 성립했다(§3).
그 WO 의 §2-1(사용자 사전작업)에 필요한 표본·등록데이터가 준비됐고, 남은 것은 상품 등록뿐이다.

그 WO 의 §3 실행순서 중 **2번(variants 조회 가능 여부)·§5 중지조건 2번은 이번에 선해소**됐다.
상품 등록이 끝나면 **별도 지시로** 실행한다 (이번 WO 는 자동 실행하지 않는다 — WO §13). 남은 측정:

1. `custom_variant_code` · `gtin` 왕복 보존 여부 (§5-2)
2. `custom_product_code` 36자(UUID) 보존 여부 — E군
3. A~G 군별 사다리 정확도
4. 권장 매칭키 확정 — **상품 레벨이 아니라 품목 레벨 계약이 될 가능성이 커졌다**

이번 WO 에서 **결정하지 않은 것**: External Commerce Ownership · QR/Tablet/Signage ownership ·
refresh token 자동 갱신 잡 · 실도매몰 census.

---

## 8. Git · 검증 · 문서 정합

- 코드 변경 **0**. 이번 WO 의 커밋은 본 CHECK 문서 1개뿐이다. migration · schema · dependency 변경 없음.
- 임시 probe 스크립트 2개(`tmp-cafe24-resume-probe.ts` · `tmp-cafe24-phase-c-probe.ts`)는 실행 후 삭제 확인. 산출물은 전부 repo 밖(`C:/tmp/cafe24-pilot/`).
- 다른 세션의 작업트리가 dirty 해서 main 을 체크아웃할 수 없었으므로 **별도 worktree(`C:/tmp/o4o-cafe24-pilot` · `main`)** 에서 작업했다.
  다른 세션의 변경·미추적 파일은 수정·삭제·stash 하지 않았다 (WO §1).
- **문서 정합**: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
  - 발견 1: 선행 CHECK-…-CENSUS-RESUME-V1 §1-1 의 "승인 대기 2건"(CI env 정본화 · 임시 secret 은퇴)은 이미 처리 완료 상태다(§1).
  - 발견 2: 같은 문서 §4 의 응답 key "84개"는 당시 산출물 실측(86개)과 다르다(§3-4).
  - 둘 다 `docs/investigations/` 기록물이라 원문은 수정하지 않고 여기에만 남긴다 (CLAUDE.md §16-1 · §16-2).
  - 제안: `cafe24_connections.status` 지연 갱신(§1-1) — 만료를 주기적으로 반영하거나 운영 화면이 `refresh_token_expires_at` 을 표시하도록. 별도 WO.
