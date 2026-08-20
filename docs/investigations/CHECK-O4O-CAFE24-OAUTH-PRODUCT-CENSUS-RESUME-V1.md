# CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1

> **WO**: WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-RESUME-V1 (사용자 지시 · 핸드오프 문서 없음)
> **선행**: [CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1](./CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1.md) (Phase B) · [CHECK-O4O-CAFE24-APP-ENTRY-ROUTE-V1](./CHECK-O4O-CAFE24-APP-ENTRY-ROUTE-V1.md)
> **판정**: **PHASE_C_EXECUTED · 매칭률 판정 불가(표본 2건)**
> **일자**: 2026-08-20

## 0. 요약

| 단계 | 결과 |
|---|---|
| 자격정보 Secret Manager 등록 · Cloud Run 주입 | **완료** (값 미노출) |
| callback 인증 경계 교정 | **완료** — 로그인 쿠키 → 서명 state (`a86d3e58c`) |
| 실제 OAuth 연결 (mall_id=sohae2100, shop_no=1) | **완료** — `cafe24_connections` 1행 ACTIVE |
| token refresh 실검증 | **완료** — 실제 갱신 발생 + 새 token 으로 API 성공 |
| Cafe24 실상품 전수 조회 | **완료** — 몰 전체 **2건** |
| 실제 응답 key census | **완료** — 실측 key 84개 |
| ProductMaster 매칭 실측 | **완료** — 2건 전부 NOT_FOUND |
| WO §9 핵심 비율 4종 | **산출은 했으나 의사결정 근거로 쓸 수 없다** — §4 |

**DB write**: census 러너 0건. token refresh 로 `cafe24_connections` 1행이 갱신된 것은 정상 운영 write 다.
**ProductMaster 무변경 · Supplier/Offer/Listing/Organization 생성 0 · 주문/회원/결제 scope 미사용 · Cafe24 상품 원장 복제 0.**

---

## 1. 자격정보 주입 (값 비노출)

| 항목 | 상태 |
|---|---|
| `cafe24-client-id` / `cafe24-client-secret` | Secret Manager 등록 (각 22바이트 · 개행 0) |
| `CAFE24_CLIENT_ID` / `CAFE24_CLIENT_SECRET` | Cloud Run `secretKeyRef` 주입 |
| `CAFE24_REDIRECT_URI` | `https://api.neture.co.kr/api/v1/admin/cafe24/callback` |
| `CAFE24_SCOPES` | **미설정** (지시대로) → 코드 기본값 `mall.read_product` |
| `ENCRYPTION_KEY` | 기존 유지 |
| 원본 자격정보 파일 | 등록 직후 삭제 · 잔여 확인 완료 |

확인은 **env/secretKeyRef 존재 여부만** 했고 값은 조회·기록하지 않았다.

### 1-1. 함정 — CI 배포가 평문 env 를 지운다

`.github/workflows/deploy-api.yml` 은 `--set-env-vars` 체인을 쓴다. 이는 평문 env **집합 전체를 치환**하므로
수동으로 넣은 `CAFE24_REDIRECT_URI` 가 다음 배포에서 사라졌고(24→23), callback 이
`CAFE24_CREDENTIALS_NOT_CONFIGURED` 를 반환했다. `secretKeyRef` 항목은 살아남는다.

**조치**: CI 파일 수정은 CLAUDE.md 중지 조건이라 손대지 않고, `cafe24-redirect-uri` secret(v1)+IAM 을 만들어
`secretKeyRef` 로 배선했다(revision `o4o-core-api-03400-7sg`).
**승인 대기**: workflow 에 `CAFE24_REDIRECT_URI` 한 줄을 추가하고 이 secret 을 은퇴시키는 편이 깨끗하다.

---

## 2. callback 인증 경계 교정

문제: 라우터 전체가 `authenticate` 뒤에 있어 Cafe24 가 되돌려보낸 브라우저 요청이 `verifyState` 에 도달조차 못 하고 `AUTH_REQUIRED` 로 끝났다.

교정: `/callback` 만 guard 앞으로 옮기고, 신뢰 근거를 **authorize 단계에서 발급한 서명 state** 로 둔다.
`state` 에 `uid`(OAuth 를 시작한 관리자)를 추가했으나 **권한 판정에 쓰지 않고 attribution 기록에만** 쓴다.

프로덕션 tamper 매트릭스 (revision `o4o-core-api-03400-7sg`):

| 요청 | 결과 |
|---|---|
| mallId 변조 state | 400 `CAFE24_STATE_INVALID` |
| 서명 변조 state | 400 `CAFE24_STATE_INVALID` |
| 유효 state + 가짜 code | 502 `CAFE24_TOKEN_REQUEST_FAILED_400` (state 는 통과, Cafe24 가 code 거부) |
| `mall_id=other` + 유효 state | 400 `CAFE24_STATE_MALL_MISMATCH` |
| code/state 누락 | 400 `CAFE24_CALLBACK_INVALID` |
| authorize / connections / refresh / disconnect (미인증) | **401** — 관리 endpoint 는 그대로 잠겨 있다 |

단위 테스트 `cafe24-oauth-state-and-token-crypto.spec.ts` **13/13 통과** (만료·uid 왕복·구 revision 호환·uid 변조·mallId 변조).

---

## 3. 실연결 · refresh 실검증

연결: `85a0cc58-…` · `mallId=sohae2100` · `shopNo=1` · `status=ACTIVE` · `scopes=["mall.read_product"]`.

refresh 는 access token 이 살아 있으면 `POST /connections/:id/refresh` 로도 실제 갱신이 일어나지 않는다
(`getUsableAccessToken` 이 캐시 반환). 그래서 **메모리 상 사본의 만료시각만 과거로 둔 채** 갱신 경로를 태워 실측했다(선행 DB write 없음).

| | before | after |
|---|---|---|
| accessTokenExpiresAt | 2026-08-20T17:26:31Z | 2026-08-20T08:37:04Z |
| refreshTokenExpiresAt | 2026-09-03T15:26:31Z | 2026-09-03T06:37:04Z |
| lastRefreshedAt | 06:26:31 | 06:37:05 |

갱신된 token 으로 `products/count` 재호출 성공(=2). `status=ACTIVE` · `lastError=null` 유지.

### 3-1. 함정 — Admin API 버전

등록된 앱의 기본 버전이 **2026-03-01** 이라 코드 기본값 `2024-06-01` 로는 모든 Admin API 가 400
(`... version you requested is not available`) 이었다. 기본값을 `2026-03-01` 로 올렸다(`CAFE24_API_VERSION` 로 계속 덮어쓸 수 있다).

---

## 4. Census 실측 — 그리고 왜 비율로 결정하면 안 되는가

```
npx tsx src/scripts/cafe24-product-census.ts --mall sohae2100 --shop 1 --limit 0
```

| 항목 | 값 |
|---|---|
| 몰 전체 상품 수 | **2** |
| 분석 대상 | 2 |
| 실측 응답 key | 84개 (`barcode` 는 **응답 key 자체가 없다**) |
| 상품명 정규화 충돌 | 0 (2건 모두 고유) |

식별자 필드 실측:

| 필드 | present | blank | unique |
|---|---:|---:|---:|
| `product_no` | 2 | 0 | 2 |
| `product_code` | 2 | 0 | 2 |
| `custom_product_code` | 2 | 0 | 0 (전부 중복) |
| `brand_code` · `manufacturer_code` · `supplier_code` | 2 | 0 | 0 (전부 기본값 중복) |
| `barcode` | **0** | 2 | 0 |
| `origin_place_value` | 0 | 2 | 0 |

WO §9 핵심 비율 4종:

| # | 비율 | 값 |
|---|---|---:|
| ① 강한 식별자 EXACT (barcode/identifier) | 0 / 2 | **0%** |
| ② 상품명+제조사 EXACT | 0 / 2 | **0%** |
| ③ SIMILAR + AMBIGUOUS (사람 확인 필요) | 0 / 2 | **0%** |
| ④ NOT_FOUND (O4O 미등록) | 2 / 2 | **100%** |

**이 숫자로 소유권 축(A/B/C)을 결정하지 않는다.** `sohae2100` 은 상품 2건짜리 테스트몰이고,
그 2건은 Cafe24 기본 샘플 성격이라 O4O `product_masters` 에 있을 이유가 없다. 100% NOT_FOUND 는
"매칭이 불가능하다"가 아니라 **"모집단이 없다"** 는 뜻이다.

다만 표본과 무관하게 성립하는 구조적 사실 2가지는 지금 확정할 수 있다:

1. **`barcode` 는 응답 key 로 존재하지 않았다.** 몰 설정에 따라 비는 것이 아니라 이 앱 버전·이 몰의
   상품 목록 응답에 필드 자체가 없었다. barcode 를 1순위 사다리로 전제한 설계는 재검토가 필요하다.
2. **`manufacturer_code` / `supplier_code` / `brand_code` 는 몰 기본값이 그대로 들어 있다.**
   Cafe24 상점 대부분이 이 값을 실제 제조사로 쓰지 않으므로 "상품명+제조사" 사다리는
   **제조사 축이 사실상 무효**일 가능성이 높다. 실모집단에서 반드시 재측정해야 한다.

---

## 5. 다음 단계

1. **상품이 실제로 있는 몰**(운영 중인 Cafe24 상점)에서 census 재실행. 그 전에는 매칭률로 아무것도 결정하지 않는다.
2. 재측정 시 `barcode` 부재를 전제로 사다리 순서를 다시 본다 (`product_code`/`custom_product_code` 의 O4O 측 대응 필드가 무엇인지 포함).
3. 비율 확보 후 외부 계정 축(A/B/C) · QR 접근 계약을 별도 WO 로 판정. **그 전에 ownership 구조를 만들지 않는다.**

---

## 6. 범위 밖 발견 (보고만)

Cloud Run `o4o-core-api` 의 `DB_PASSWORD` · `JWT_SECRET` · `GEMINI_API_KEY` · `SMTP_PASS` 가
Secret Manager 참조가 아니라 **평문 env 값**으로 들어 있다. 이번 WO 범위 밖이라 손대지 않았다. 별도 WO 대상.

---

## 7. Git · 문서 정합

- 이번 변경 2파일: `cafe24-oauth.client.ts`(API 버전 기본값), `cafe24-product-census.ts`(러너 전용 DataSource).
- `apps/api-server` typecheck exit 0 · cafe24 테스트 13/13 통과.
- 임시 probe 스크립트는 삭제했다. 리포트는 repo 밖(`C:/tmp`)에 둔다.
- **문서 정합**: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
  (CI `CAFE24_REDIRECT_URI` 한 줄 · 평문 secret env 이관 · 실모집단 몰 census 재실행).
