# CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1

> **WO**: [WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1](../work-orders/WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1.md)
> **선행 CHECK**: [CHECK-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1](./CHECK-O4O-CAFE24-PRODUCTMASTER-QR-TABLET-PILOT-V1.md) (Phase A)
> **판정**: **PHASE_B_IMPLEMENTED · PHASE_C_BLOCKED** — WO §11 중지 조건 1번(Cafe24 credential/test mall 확보 불가) 성립
> **일자**: 2026-08-18

## 0. 요약

| 단계 | 결과 |
|---|---|
| §4 OAuth 저장 schema | **완료** — `cafe24_connections` (migration 20270313000000) |
| §5 Phase B OAuth | **완료** — authorize / callback / refresh / disconnect + state 서명 |
| §6 Phase C 실상품 조회 | **미실행** — Cafe24 자격정보·테스트몰 부재 (코드는 준비됨) |
| §7 식별정보 Census | **미실행** — 위와 동일 |
| §8 ProductMaster 매칭 실측 | **미실행** — 위와 동일 |
| §9 필수 질문 8개 | **숫자로 답할 수 없음** — §5 참조 |

**DB write 0** (migration 은 CI/CD 자동 실행 대상이며 이번에 직접 실행하지 않았다) · **Cafe24 API 호출 0** · **ProductMaster 무변경** · **Supplier/Offer/Listing/Organization 생성 0**.

추가 발견 1건: **프로덕션에 `ENCRYPTION_KEY` 가 설정돼 있지 않다** — §6 참조. 이번 구현은 fail-closed 로 막았다.

---

## 1. 구현한 것 (Phase B)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/cafe24/entities/Cafe24Connection.entity.ts` | mall 별 연결정보 엔티티 |
| `apps/api-server/src/database/migrations/20270313000000-CreateCafe24Connections.ts` | 테이블 + UNIQUE(mall_id, shop_no) + status CHECK |
| `apps/api-server/src/modules/cafe24/cafe24-oauth.client.ts` | authorize URL · code 교환 · refresh (HTTP 경계 전용) |
| `apps/api-server/src/modules/cafe24/cafe24-oauth-state.ts` | HMAC 서명 stateless state (5분 만료) |
| `apps/api-server/src/modules/cafe24/cafe24-token-crypto.ts` | token 암호화 전제 검사 (fail-closed) |
| `apps/api-server/src/modules/cafe24/cafe24-admin-api.client.ts` | 상품 count/목록 조회 **전용** |
| `apps/api-server/src/modules/cafe24/services/cafe24-connection.service.ts` | 저장·갱신·해제. token 은 encrypt 후 저장 |
| `apps/api-server/src/modules/cafe24/controllers/cafe24-oauth.controller.ts` | `/api/v1/admin/cafe24/*` (admin 전용) |
| `apps/api-server/src/scripts/cafe24-product-census.ts` | Phase C~8 실행기 (DB write 0) |

### 1-1. 설계상 **일부러 만들지 않은 것**

- 소유권 컬럼(`organization_id` / `supplier_id` / `service_key`) 없음 — "이 mall 을 누가 소유하는가"는 Census 이후 결정 (WO §5).
- External Provider / Commerce Account 범용 모델 없음 — 지금 필요한 것은 Cafe24 연결정보뿐 (WO §4).
- 상품·주문·회원 컬럼 없음. `client_secret` 컬럼 없음(환경 secret 전용).

### 1-2. 재사용한 선례

- 암호화: `apps/api-server/src/utils/crypto.ts` 의 `encrypt`/`decrypt` — `routes/platform/store-policy.routes.ts` 의 apiKey/apiSecret 저장과 동일 패턴. **새 암호화 유틸을 만들지 않았다.**
- 매칭: `normalizeName`(`services/bulk-match.service.ts`) · `normalizeIdentifier`(`modules/neture/utils/product-identifier.util.ts`) 를 census 스크립트가 import 한다. **두 파일 모두 무변경.**
- 엔티티/migration/route 등록 관례: `external_channel_product_links` 를 그대로 따랐다.

### 1-3. 계약 요약

```text
GET    /api/v1/admin/cafe24/authorize?mallId=&shopNo=   → { authorizeUrl, scopes }
GET    /api/v1/admin/cafe24/callback?code=&state=       → connection 저장 (token 미응답)
GET    /api/v1/admin/cafe24/connections                 → 목록 (token 미포함)
POST   /api/v1/admin/cafe24/connections/:id/refresh     → 갱신 동작 확인
DELETE /api/v1/admin/cafe24/connections/:id             → 해제(이력 보존)
```

라우터 전체가 `authenticate` + `requireRole([platform:super_admin, neture:admin, neture:operator])` 뒤에 있다 (CLAUDE.md §8 — 인증 없는 연동/진단 route 금지). 응답·로그 어디에도 access/refresh token 을 싣지 않는다.

**token 갱신 원자성**: Cafe24 는 refresh 시 기존 refresh token 을 폐기하므로 access/refresh/양쪽 만료시각을 **한 UPDATE** 로 교체한다 (`cafe24-connection.service.ts` `getUsableAccessToken`). 부분 저장 시 연결이 영구히 죽는다.

---

## 2. 필요한 환경변수

`apps/api-server/.env.example` 에 추가했다. 실제 값은 커밋하지 않는다.

```text
CAFE24_CLIENT_ID / CAFE24_CLIENT_SECRET / CAFE24_REDIRECT_URI
CAFE24_SCOPES=mall.read_product      # 최소 scope. 주문/회원/결제 scope 추가 금지
CAFE24_API_VERSION=2024-06-01
ENCRYPTION_KEY                        # 32바이트 이상. 미설정 시 연결 거부
```

---

## 3. 검증 결과

| 항목 | 결과 |
|---|---|
| typecheck (`tsc -p tsconfig.json --noEmit`) | **PASS** (exit 0, 오류 0) |
| unit test (`cafe24-oauth-state-and-token-crypto.spec.ts`) | **PASS 8/8** — state 서명·변조·만료·형식 4건 + 암호화 전제 4건 |
| Cafe24 실연결 smoke | **미실행** — 자격정보 부재 |
| browser smoke | **미실행** — 자격정보 없이는 `/authorize` 가 503 만 반환하므로 검증할 화면 동작이 없다 |
| DB write | **0** |

솔직히 적으면: **런타임 경로 중 Cafe24 를 실제로 때리는 부분은 한 줄도 검증되지 않았다.** token 교환/갱신/상품조회는 실 몰이 붙는 순간 최초로 실행된다.

---

## 4. Phase C~8 을 실행하는 방법 (자격정보 확보 후)

```bash
# 1) Cloud Run / 로컬 env 에 CAFE24_* + ENCRYPTION_KEY 설정
# 2) 관리자 로그인 상태에서 승인 URL 발급 → 브라우저로 이동 → mall 관리자 승인
#    GET /api/v1/admin/cafe24/authorize?mallId=<mall>
# 3) census 실행 (DB write 0)
cd apps/api-server
npx tsx src/scripts/cafe24-product-census.ts --mall <mall_id> --limit 0
```

산출물은 repo 밖 JSON 리포트 1건이며 다음을 포함한다: 실제 응답 key 집합(`observedResponseKeys` — 문서상 필드가 아니라 **실측**), 필드별 present/blank/unique/duplicate/usableRate, 상품명 정규화 후 충돌 수, 매칭 status(EXACT/AMBIGUOUS/SIMILAR/NOT_FOUND) 및 방식별(barcode/identifier/name+manufacturer/name/similar) 분포.

---

## 5. WO §9 필수 질문 — 현재 답변 상태

**8개 모두 숫자로 답할 수 없다.** 근거가 되는 실상품 응답이 0건이기 때문이다. 추정치를 적지 않는다.

| # | 질문 | 상태 |
|---|---|---|
| 1 | 자동매칭이 현실적인가 | 미측정 |
| 2 | 가장 강한 식별자 | 미측정 (census 스크립트가 방식별 분포로 답한다) |
| 3 | barcode/GTIN 실사용 가능 여부 | 미측정 — 단, **O4O 측에도 `product_masters.barcode` 가 nullable** 이라 양쪽 결측이 겹칠 수 있다(Phase A §2-1) |
| 4 | 상품명+제조사만으로 어디까지 | 미측정 |
| 5 | 사람 확인 필요 비율 | 미측정 (= SIMILAR + AMBIGUOUS) |
| 6 | O4O 미등록 비율 | 미측정 (= NOT_FOUND) |
| 7 | ProductMaster schema 변경 필요 여부 | **현재 근거로는 불필요** — 읽기만으로 매칭 사다리 5단계가 성립한다 |
| 8 | Cafe24 상품 원본 저장 필요 여부 | **현재 근거로는 불필요** — census 는 메모리 집계로 충분했다 |

---

## 6. 발견 — 프로덕션 `ENCRYPTION_KEY` 미설정 (범위 밖, 보고만)

`utils/crypto.ts:5` 는 `ENCRYPTION_KEY` 가 없으면 **소스에 박힌 기본 키**(`default-32-char-encryption-key!!`)로 조용히 대체한다.

2026-08-18 확인:

- 로컬 `apps/api-server/.env` — `ENCRYPTION_KEY` 없음
- 프로덕션 `o4o-core-api` Cloud Run env 20개 중 `ENCRYPTION_KEY` **없음** (`gcloud run services describe`)

즉 이 유틸을 쓰는 기존 소비처(`routes/platform/store-policy.routes.ts` 의 결제 apiKey/apiSecret, `config/passportDynamic.ts`)는 **소스에 공개된 키로 암호화**되고 있다. 실질적으로 난독화다.

**이번 WO 에서 한 조치**: Cafe24 token 은 이 상태에서 저장하지 않는다. `cafe24-token-crypto.ts` 가 키 미설정·기본키·32바이트 미만을 모두 거부하고, `/authorize` 는 503 `CAFE24_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED` 를 반환한다.

**하지 않은 것**: 기존 store-policy / passportDynamic 경로는 건드리지 않았다 — WO 범위 밖이고, 키를 지금 설정하면 **기존 암호문이 전부 복호화 불가**가 된다(재입력 또는 재암호화 마이그레이션 필요). 별도 WO 대상이다.

---

## 7. 다음 단계

1. **사용자**: Cafe24 Developer Center 앱 생성 → client_id/secret/redirect_uri 확보 + 테스트몰 사용 가능 상태. redirect_uri 는 `https://api.neture.co.kr/api/v1/admin/cafe24/callback` 형태로 등록해야 한다.
2. `ENCRYPTION_KEY` 를 Secret Manager 에 등록하고 Cloud Run 에 주입 (Cafe24 연결의 전제).
3. migration 20270313000000 배포(CI/CD 자동) 후 §4 절차로 Census 실행.
4. Census 숫자를 근거로 외부 계정 축(A/B/C) · QR 접근 계약을 별도 WO 로 판정. **그 전에 ownership 구조를 만들지 않는다.**

---

## 8. Git · 문서 정합

- 신규 9파일 + 등록 2파일(`database/entities.ts`, `bootstrap/register-routes.ts`) + `.env.example`.
- 동시 작업 중인 다른 세션의 LMS/education 변경은 접촉하지 않았다 (path-specific stage).
- **문서 정합**: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건.
  발견 1건 = §6 `ENCRYPTION_KEY` 미설정. 기준 문서 수정 없이 보고만 한다.
