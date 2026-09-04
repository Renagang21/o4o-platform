# CHECK-O4O-CAFE24-CONTROLLED-PILOT-RESUME-READINESS-V1

> **WO**: WO-O4O-CAFE24-CONTROLLED-PILOT-RESUME-READINESS-V1
> **선행**: [CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1](./CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1.md) · [CHECK-O4O-CAFE24-APP-ENTRY-ROUTE-V1](./CHECK-O4O-CAFE24-APP-ENTRY-ROUTE-V1.md) · [WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1](../work-orders/WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1.md)
> **판정**: **PASS(연결·계약) / HOLD(1차 등록) — products·variants 실조회 성립, 그러나 표본 30건은 아직 몰에 없다 (§9)**
> **일자**: 2026-09-04 (재승인 후 Phase C 재개분 포함)

## 0. 요약

| 단계 | 결과 |
|---|---|
| Phase A 연결 상태 실측 | 완료 — 연결 1행 존재, **refresh token 만료** |
| Phase B 연결 복구 | **완료** — 사용자 재승인(2026-09-04) 후 ACTIVE · refresh 만료 2026-09-18T10:36:50Z |
| Phase C products/variants 계약 재확인 | **완료** — `mall.read_product` 단일 scope 로 **variants 조회 200 성립**. §3 |
| Phase D ProductMaster 표본 선정 | 완료 — **30건 / 7개 실험군** |
| Phase E Cafe24 등록용 데이터 준비 | 완료 — `C:/tmp/cafe24-pilot/` (repo 밖) |
| Phase F 실제 양식 기반 업로드 CSV | **완료** — 90열 원본 양식 그대로 30행 · validation 통과. §5-3 |
| 2차(품목 식별자) 입력 경로 조사 | 완료 (read-only) — 관리자 재고 엑셀이 canonical. §5-4 |
| Phase G 1차 업로드 결과 실측 | **표본 30건 미생성** — 몰의 40건은 우리 표본이 아니다. §9 |
| Phase H 반려 원인 확정 · v3 | **완료** — 원인 `공급가` 필수 누락. `공급가` 열만 채운 v3 생성. §10 |
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

### 5-1. 공식 엑셀 양식은 확보하지 못했다 — 정직하게 남긴다 (**2026-09-04 해소 · §5-3**)

> 아래는 양식 확보 전의 기록이다. 사용자가 양식을 전달해 §5-3 에서 정본 CSV 를 생성했다.

Cafe24 상품등록 엑셀 양식은 **몰 관리자 로그인 세션에서만** 내려받을 수 있어 확보하지 못했다.
그래서 `upload-paste` 파일의 한글 헤더는 **Cafe24 실제 필드명이 아니라 의미 라벨**이다. 맞는다고 단언하지 않는다.

사용자가 양식을 내려주시면(몰 관리자 → 상품 → 엑셀 관리 → 상품 등록(엑셀) → 양식 다운로드)
그 양식의 실제 헤더에 맞춰 **1회 재생성**한다. WO §11 의 "엑셀 양식이 반드시 필요" 중지 조건에는 해당하지 않는다 —
양식 없이도 관리자 화면에서 이 파일을 참고해 등록할 수 있기 때문이다.

### 5-3. Phase F — 실제 양식 기반 업로드 CSV 생성 (2026-09-04 · §5-1 해소)

사용자가 Cafe24 신규 상품등록 기본 양식 `excelUploadProductDefault.csv` 를 전달해 §5-1 의 한계가 해소됐다.
양식 실측: **90열 · UTF-8 BOM · LF · 헤더 1행 + 샘플 3행**.

산출물 `C:/tmp/cafe24-pilot/cafe24-pilot-upload-v2.csv` — **원본 헤더/열 순서 무변경**, 표본 30행.
생성·검증 스크립트와 상세 리포트(`upload-v2-report.md` · `validation-v2.txt`)도 같은 폴더에 둔다 (repo 밖).

**업로드 전 validation (실측)**

| 항목 | 결과 |
|---|---|
| 헤더 라인 바이트 완전 일치 / 열 개수 | 일치 / 90 = 90 |
| 인코딩 · 개행 | UTF-8 BOM 동일 · CR 0 |
| 데이터 행 · 90열 위반 | 30행 · 0건 |
| 상품코드(00) 공백 | 30/30 (신규 등록 규칙) |
| 자체 상품코드(01) | 13/30 입력 · 중복 0 · 길이 8·9·36 |
| 필수/기본값 12개 열 | 30/30 채움 · 판매가 전부 숫자 |
| 옵션 문법 | F군 3행 전부 OK — 예상 품목 3+2+3=8 |
| 옵션 없는 27행 | 상품당 품목 1건 자동 생성 (§3-3 실측) |
| 그룹 분포 | A5 B5 C5 D5 E4 F3 G3 = 30 |

**양식 규칙과의 충돌 2건 — 명시한다.**

1. **제조사·브랜드는 이름이 아니라 코드다.** 제조사(51)/공급사(52)/브랜드(53)는 `M0000000`/`S0000000`/`B0000000`
   형태의 몰 등록 코드라 O4O 의 이름 문자열을 넣을 수 없다 → 3열 모두 공백.
   대신 products 응답에 실재하는 자유 텍스트 필드로 옮겼다: 제조사명 → `모델명`(`model_name`),
   브랜드명 → `상품명(관리용)`(`internal_product_name`).
   따라서 **이번 Pilot 의 제조사·브랜드 축은 Cafe24 제조사/브랜드 필드가 아니라 이 두 필드로 측정된다.**
   실도매몰에서 제조사·브랜드로 매칭하려면 API 가 코드만 주므로 **이름 조회가 별도로 필요하다** — 범위 밖.
2. **이 양식에는 품목(variant) 레벨 열이 없다.** `custom_variant_code`(자체품목코드) · `gtin`(바코드) 열이
   **존재하지 않는다.** 1차 업로드로는 **상품 + 품목 생성까지만** 가능하고 품목 식별자는 입력되지 않는다.
   미반영: custom_variant_code 3행(F군) · gtin 5행(A군) → 2차 단계(§5-4).

몰마다 다른 마스터 값(상품분류 번호 · 자체분류 코드 · 제조일자/출시일자)은 비웠다.
업로드가 그중 하나를 필수로 반려하면 그 값만 채워 1회 재생성한다.
**임의 판매·주문 설정은 만들지 않았다** — 나머지 74열은 공백이다.

### 5-4. 2차 입력 경로 (품목 식별자) — read-only 조사

| 경로 | `custom_variant_code` | `gtin` | 비고 |
|---|:---:|:---:|---|
| 관리자 **상품 > 재고 관리 > 상품 재고 관리** → 엑셀 다운 → 수정 → 재고정보 수정 업로드 | **가능** | 미확인 | 공식 Help Center. 자체**상품**코드는 불가, 자체**품목**코드만 가능. xls/xlsx · 1회 1,000품목 |
| Admin API `PUT /products/{no}/variants/{code}` · `PUT /products/{no}/variants` | 문서상 가능 | 미확인 | **`mall.write_product` 필요** — 현재 scope 밖 · WO 금지선 |
| 관리자 상품수정 화면의 옵션/품목 관리 | 가능 | 미확인 | 30건 수동은 WO §9 목적에 반함 |

`gtin` 은 variants **응답 key** 로는 실재하나(§3-2, 값 null) 관리자·엑셀 **입력 경로를 공식 문서에서 확인하지 못했다.**
확인되지 않은 것을 확인된 것처럼 적지 않는다.

**권장 2차 방법** — `mall.write_product` 확대는 제안하지 않는다. 관리자 엑셀로 목적이 달성된다.

1. 1차 업로드 후 **상품 재고 관리**에서 품목 엑셀 다운로드 (예상 품목 38건 = 27 + 8 + 3)
2. 그 파일을 주시면 **자체품목코드 열만 채운 수정본을 1회 생성** (옵션 없음 = 자체상품코드와 동일 / F군 = `{code}-{n}` /
   A군 5건은 MFDS_CODE 를 품목 레벨에도 실어 품목 단위 identifier 사다리를 만든다)
3. 업로드 후 variants 재조회로 **왕복 보존 여부** 실측
4. 그 엑셀에 바코드 열이 없으면 `gtin` 은 **현행 관리자 경로로 입력 불가**로 확정하고,
   품목 식별자 계약을 `custom_variant_code` 단독으로 간다 (O4O 바코드를 그 칸에 실으면 되므로 기능 손실 없음)

---

## 6. 남은 사용자 행동 — **1차 업로드 1건**

**상품 30건 일괄 등록** — 몰 관리자 → 상품 → 엑셀 관리 → 상품 등록(엑셀) 에
`C:/tmp/cafe24-pilot/cafe24-pilot-upload-v2.csv` 를 업로드한다 (원본 양식 90열 그대로).

- 결과로 **상품 30 + 품목 38** 이 생성된다. 품목 식별자는 이 단계에서 들어가지 않는다(§5-3 충돌 2).
- 필수값 반려가 나면 반려 메시지만 알려주시면 그 열만 채워 **1회** 재생성한다.
- 이후 §5-4 의 2차(자체품목코드) → 3차(products+variants Census · 매칭 실측) 순서로 간다.

**30건 수동 타이핑은 요청하지 않는다** (WO §9 목적 달성).
`cafe24-pilot-upload-paste-v1.csv` 는 양식 확보 전의 참고본이며, 업로드 대상은 **v2** 다.

## 7. 기존 Controlled Pilot 실행 가능 여부 · 다음 단계

`WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1` 은 **즉시 실행 가능하다.**
연결 · 코드 · 자격정보 · 라우트 · census 러너가 모두 살아 있고, products/variants 실조회도 성립했다(§3).
그 WO 의 §2-1(사용자 사전작업)에 필요한 표본·등록데이터가 준비됐고, 남은 것은 상품 등록뿐이다.

그 WO 의 §3 실행순서 중 **2번(variants 조회 가능 여부)·§5 중지조건 2번은 이번에 선해소**됐다.
상품 등록이 끝나면 **별도 지시로** 실행한다 (이번 WO 는 자동 실행하지 않는다 — WO §13). 남은 측정:

1. `custom_variant_code` 왕복 보존 여부 (§5-4 2차) · `gtin` 은 입력 경로부터 확정 필요
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
- **문서 정합**: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (Phase F 에서 추가 발견 없음)
  - 발견 1: 선행 CHECK-…-CENSUS-RESUME-V1 §1-1 의 "승인 대기 2건"(CI env 정본화 · 임시 secret 은퇴)은 이미 처리 완료 상태다(§1).
  - 발견 2: 같은 문서 §4 의 응답 key "84개"는 당시 산출물 실측(86개)과 다르다(§3-4).
  - 둘 다 `docs/investigations/` 기록물이라 원문은 수정하지 않고 여기에만 남긴다 (CLAUDE.md §16-1 · §16-2).
  - 제안: `cafe24_connections.status` 지연 갱신(§1-1) — 만료를 주기적으로 반영하거나 운영 화면이 `refresh_token_expires_at` 을 표시하도록. 별도 WO.

---

## 9. Phase G — 1차 업로드 후 실측 (2026-09-04) · **표본 30건 미생성**

사용자가 "1차 Pilot CSV 업로드 완료" 를 알려와 `sohae2100` 몰을 read-only 로 전수 재조회했다
(`products/count` → `products` 전 페이지 → 상품별 `products/{no}/variants`, `mall.read_product` 단일 scope).
산출물: `C:/tmp/cafe24-pilot/phase-g-report.json` · `phase-g-summary.txt`.

### 9-1. 실측 결과 — 몰에 있는 40건은 우리 표본이 아니다

| 항목 | 값 |
|---|---|
| 총 상품 수 | **40** (Phase C 시점 2건 → 40건) |
| `product_no` 범위 | 11 ~ 50 (Phase C 의 기존 2건 `P000000I`/`P000000J` = no 9·10 은 **현재 목록에 없다**) |
| 생성 시각 | **40건 전부 2026-09-04 11:15** (수 초 내 일괄 생성) |
| 표본 30건과 상품명 일치 | **0건** (앞 6자 부분일치까지 봐도 0) |
| 표본 자체상품코드(13건) 일치 | **0건** |
| `custom_product_code` | 40건 전부 **빈 문자열** |
| `model_name` / `internal_product_name` | 40건 전부 **비어 있음** |
| `manufacturer_code` / `brand_code` | 40건 전부 기본값 `M0000000` / `B0000000` |
| 옵션 | 40건 전부 옵션 없음 · 품목 1건씩 |

몰에 실재하는 40건은 `햇살 가득 고함량 비타민D3 5000IU` · `온가족 생유산균 100억 …` 같은
**일반 건강기능식품 상품명**이고, 우리 30건 표본(A~G군)의 어떤 값과도 겹치지 않는다.

**판정: `cafe24-pilot-upload-v2.csv` 는 이 몰에 반영되지 않았다.** 다른 데이터가 업로드됐거나
업로드가 반려됐을 가능성이 크다. 이 상태에서 §3 왕복 검증(자체상품코드 · model_name ·
internal_product_name · 옵션→품목 수)은 **측정 자체가 성립하지 않는다.** 성립하지 않는 것을 측정했다고 적지 않는다.

### 9-2. 이번 조회로 확정된 사실 (표본과 무관하게 유효)

- `mall.read_product` 단일 scope 로 **40건 전부 variants HTTP 200** — §3-1 재확인(모집단 40으로 확대)
- 옵션 없는 상품은 **정확히 품목 1건**(`{product_code}000A`) — §3-3 재확인(40/40)
- 40건 전부 `custom_variant_code = ""` · `gtin = null` — **품목 식별자는 상품 등록만으로는 채워지지 않는다.**
  §5-3 충돌 2(양식에 품목 열 없음)와 일치한다
- 제조사·브랜드를 비운 채 등록하면 **기본 코드 `M0000000`/`B0000000` 가 자동으로 들어간다** — §5-3 충돌 1의 전제 확인

### 9-3. 다음 행동 — 사용자 확인 대기 (중지)

Controlled Pilot 본 매칭 판정은 **시작하지 않았다.** 품목 엑셀 다운로드 요청도 아직 보내지 않는다 —
받아도 우리 표본 품목이 없어 채울 대상이 없기 때문이다. 확인이 필요한 것은 하나다:

**어떤 파일이 업로드됐는가, 그리고 업로드 결과 화면에 성공/실패가 어떻게 나왔는가.**

- 업로드가 반려됐다면 반려 메시지의 필드명만 알려주시면 그 열만 채워 v3 를 **1회** 재생성한다
- 다른 파일이 올라간 것이라면 `cafe24-pilot-upload-v2.csv` 로 다시 업로드하면 된다
- 11:15 에 생성된 40건은 **우리 실험 모집단이 아니다.** 남겨둘지 정리할지는 사용자 판단이며,
  이 WO 는 Cafe24 write 를 하지 않으므로 삭제·수정하지 않는다

표본 30건이 실제로 생성된 뒤에야 §5-4 의 2차(자체품목코드) → 3차(매칭 Census) 로 간다.

---

## 10. Phase H — 반려 원인 확정 · v3 생성 (2026-09-04)

### 10-1. 원인

업로드 결과: **30/30 실패** · 메시지 `"공급가은(는) 필수입력 항목 입니다."`
파일 구조(헤더·열 순서·인코딩·열 개수) 문제가 아니었다. §5-3 에서 `공급가`(20)를 비운 것이 원인이다.
원본 양식 샘플 3행은 소비자가·공급가·상품가·판매가를 **모두 숫자로** 채우고 있었다 — 그 신호를 놓쳤다.

### 10-2. 조치 — `공급가` 열만 최소 수정

`cafe24-pilot-upload-v3.csv` 생성. 규칙은 하나뿐이다: **공급가 = 판매가 × 0.8 = `8000`.**
이번 Pilot 은 가격정책이 아니라 ProductMaster 매칭을 보므로 값을 복잡하게 만들지 않는다.

**v2 대비 변경된 열: `공급가` 30행 — 그 외 0.** 헤더·열 순서·실험축(자체상품코드 · 상품명 변형 ·
모델명/상품명(관리용) carrier · 옵션 문법)은 그대로다.

### 10-3. validation (업로드 전 · `validation-v3.txt`)

| 항목 | 결과 |
|---|---|
| 헤더 라인 바이트 일치 / 열 개수 | 일치 / 90 = 90 |
| UTF-8 BOM · CR | BOM 유지 · CR 0 |
| 데이터 행 · 90열 위반 | 30 · 0 |
| 공급가 blank / 판매가 blank | **0 / 0** |
| 숫자 형식 · 통화기호·쉼표 | 전부 숫자 · 0건 |
| 공급가 ≤ 판매가 | 성립 (8000 ≤ 10000) |
| v2 대비 변경 열 | `공급가` 30행뿐 |
| 상품코드(00) 공백 / 자체상품코드 | 30/30 / 13건 중복 0 |
| 옵션 3행 · A~G 분포 | 문법 유지 · A5 B5 C5 D5 E4 F3 G3 = 30 |

여전히 비워 둔 열: 상품분류 번호 · 자체분류 코드 · 제조일자 · 출시일자 · 상품가.
몰마다 다른 마스터 값이라 추측으로 채우지 않는다. 또 전량 반려되면 **첫 오류 메시지 1개만** 주시면
그 열만 채워 v4 를 만든다 — 필수열을 한 번에 하나씩 닫는 편이 빠르다.

### 10-4. 남은 사용자 행동

`C:/tmp/cafe24-pilot/cafe24-pilot-upload-v3.csv` 업로드 → **성공/실패 숫자만** 알려주면 된다.
성공하면 Phase G 조회를 다시 돌려 왕복 보존을 실측하고, 그다음 §5-4 의 2차(자체품목코드)로 간다.
