# O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT

Status: **BASELINE AMENDMENT** — F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` 를 `V2-AMENDMENT` 에 이어 개정한다.
Date: 2026-07-12
근거 WO: `WO-O4O-PRODUCT-DESCRIPTION-AUTH-ACCESS-BASELINE-AMENDMENT-V1`
근거 정책(SSOT): `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md`
근거 조사: `docs/investigations/IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md` · `docs/checks/CHECK-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md`
결정 기록: `docs/adr/ADR-0002-o4o-product-description-authenticated-access.md`

> F12 V1 §4 거버넌스("구조 변경은 본 Baseline 을 개정하는 명시적 WO 필수") 및 V2-AMENDMENT §7 에 따라, **열람 접근 모델 변경**을 baseline 에 공식 반영한다.
> **V1 6 불변식 + V2 불변식 7 은 모두 유지**하되, **불변식 #3(공개 permalink) 의 "공개" 의미만 개정**하고 접근 통제 원칙을 명확화한다.
> 본 개정은 **문서·결정 정비 전용**이다. 코드·DB·migration·deploy·QR 재발급·URL 변경 **없음**. 인증 구현은 후속 WO(§8) 범위다.

---

## 1. 개정 배경

V1 불변식 #3 은 Resource permalink `/r/{id}` 를 **공개(public) 진입점**으로 규정했고, V2-AMENDMENT 는 이를 Product Landing `/p/{key}` 로 확장하면서 역시 **공개 URL** 을 전제했다. read-only 감사(`IR/CHECK-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1`)에서 현재 구현이 그 전제대로 **완전 무인증 공개**(`GET /api/v1/public/product-landings/:key`, 인증 미들웨어 0)임이 확인되었다.

그러나 새로 확정된 `O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1`(§2)은 다음을 요구한다.

> 상품마다 하나의 **고정 URL·기본 QR 은 유지**하되, **설명서 본문은 유효한 O4O 로그인 사용자에게만** 제공한다. 비로그인 사용자는 로그인·가입 후 원래 상품 URL 로 복귀한다.

즉 현재 baseline(공개 열람)과 새 정책(로그인 전용 열람)이 정반대다. 이 개정은 그 충돌을 baseline 차원에서 해소한다.

**핵심**: 이 변경은 **공개 URL/QR 을 폐기하는 작업이 아니다.** 고정 URL·기본 QR·landing key·ProductMaster↔Landing 연결은 **그대로 유지**하고, **비로그인 요청에 설명서 본문만 제공하지 않도록** 열람 통제를 바꾸는 것이다.

---

## 2. 개정 내용

### 2.1 불변식 #3 개정 — "공개 permalink" → "고정 permalink · 인증 열람"

- **유지**: 상품마다 **고정·영구 permalink**(`/r/{id}` Resource / `/p/{key}` Product Landing). opaque, 재사용/재발급 금지(tombstone=soft delete). ProductMaster 당 Landing/QR 1개(V2 #7).
- **개정**: permalink 의 **URL 은 안정적으로 존재**하되, **설명서 본문(canonical description body 등)은 유효한 O4O 로그인 세션에만 응답**한다. permalink 존재 ≠ 본문 공개.
- 소비자 진입 흐름:
  ```
  상품 고정 URL 접속
  → O4O 로그인 세션 확인
     ├─ 로그인됨      → 설명서 본문 표시
     └─ 비로그인      → 로그인·가입 화면 → 인증 완료 → 원래 고정 URL 로 복귀(returnUrl) → 본문 표시
  ```

### 2.2 불변식 #4 유지 — QR 비저장·동적생성·재발급 없음

- **유지**: QR = 고정 URL 인코딩, **이미지 비저장·동적생성**, 저장은 Landing 신원(`public_key`)뿐. 열람 통제가 바뀌어도 **QR 주소·이미지·landing key 는 불변** → **기존 인쇄물·POP·태블릿 QR 재발급 0**.
- 스캔 흐름(개정 후): `기존 QR 스캔 → 기존 고정 URL 진입 → 로그인 여부 확인 → 로그인/가입 → 기존 설명서로 복귀`.

### 2.3 신규 원칙 — 서버 인증이 접근 통제의 기준

접근 제한은 **프론트 화면 숨김이 아니라 서버 API 인증**으로 강제한다.

- **금지**: 프론트에서만 로그인 체크 · HTML 에 본문을 포함한 뒤 화면에서 숨김 · 공개 API 를 그대로 두고 페이지에서만 차단 · `noindex` 만으로 보호.
- **필수**: 설명서 본문 API 인증 · 비로그인 응답에 본문 없음 · 인증 실패 시 명시적 응답 · 로그인 후 원래 URL 복귀(returnUrl).

### 2.4 신규 원칙 — 공개 범위 정의(비로그인 응답)

| 비로그인에게 허용 가능 | 비로그인에게 제공 금지 |
|---|---|
| 로그인 필요 안내 | 설명서 본문 HTML |
| 최소 상품 식별정보(범위는 후속 구현 WO 확정) | summary 전체 |
| 로그인·가입 CTA | 기능성·효능·판매 콘텐츠 |
| returnUrl | 공급자 제작 설명서 본문 |
| | canonical description |

"최소 상품 식별정보"의 정확한 범위는 후속 구현 WO 에서 결정하되, **본문은 포함하지 않는다는 원칙**을 본 개정으로 확정한다.

### 2.5 신규 원칙 — 검색엔진·캐시 보호 (보조조치)

`noindex` 는 **보조조치**이며 실제 통제는 서버 인증이다. baseline 보호 원칙:

- 설명서 URL sitemap 제외 · 비로그인 페이지 `noindex` · Open Graph·meta description 에 본문 미포함 · 공개 검색 API 에 본문 미포함 · 인증 응답을 공개 CDN 캐시에 저장하지 않음 · 비로그인 HTML 에 본문 미포함 · 로그·분석 이벤트에 전체 본문 기록 금지.

### 2.6 열람과 구독의 분리 (QR-ENTITLEMENT 정책과 정합)

- **설명서 열람 = O4O 로그인 회원 기본 권한.** 유효한 로그인 세션이 있으면 **회원 유형(소비자·매장 경영자·공급자·운영자·관리자) 무관 동일 설명서**를 열람한다. 열람 단계에서 **별도 유료 구독을 요구하지 않는다.**
- **구독(entitlement) 은 열람이 아니라 사업 기능에 적용**: 설명서 수정(역할 권한), 태블릿 편성·POP·캠페인 QR·공급자 배포·통계·고급 다국어 운영 등.
- `O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1` §1-A 의 "상품 기본 QR = 공공재·무료·영구" 와 **정합**한다. 여기서 **"무료·공공재"는 과금·소유(개별 상품 과금 없음, 특정 매장·공급자 소유 아님)를 뜻하며, "일반 인터넷 공개"를 뜻하지 않는다.** 상품 기본 QR 콘텐츠(설명서 본문) 열람은 **O4O 기본 로그인**을 전제로 하며, 그 열람에 구독 과금은 없다. 사업용 QR(§1-B)의 entitlement 게이트는 본 개정과 무관하게 유지된다.

### 2.7 상품 기본 QR ↔ 사업용 QR 구분 유지

본 개정은 **상품 기본 QR 의 접근 제어만** 변경한다. 사업용 QR 구조는 변경하지 않는다.

| | 상품 기본 QR | 사업용 QR |
|---|---|---|
| 기반 | ProductMaster / ProductLanding (`product_landings`) | 매장·공급자 조직 (`store_qr_codes`) |
| 수량 | 상품당 1개 고정 URL | 조직이 캠페인·POP·태블릿·코너용 생성 |
| 열람 | **O4O 로그인 후 설명서 본문** | slug 해석 + (도입 시) entitlement 게이트 |
| 구독 | 열람 무료(로그인 기본 권한) | entitlement 적용 가능 |
| 개정 영향 | 열람 인증만 추가(URL·QR 불변) | **변경 없음** |

---

## 3. 불변식 (V3 확정)

| # | 불변식 | 상태 |
|:-:|---|---|
| 1 | DESCRIPTION Resource = `shared_product_descriptions` | V1 유지 |
| 2 | canonical = (master, resourceType, descriptionType) 당 1개 | V1 유지 |
| 3 | Resource/Landing permalink 고정·영구(`/r/{id}` · `/p/{key}`) — **URL 은 안정 존재, 설명서 본문은 O4O 로그인 세션에만 응답** | **개정(열람 인증)** |
| 4 | QR 이미지 비저장·동적생성(저장은 Landing 신원 public_key) — **재발급 없음** | 유지 |
| 5 | 계층 1(Resource/Landing) ↔ 계층 2(Store Production Material) 분리 | V1 유지 |
| 6 | ProductMaster 는 Resource/Landing 를 모른다(단방향 참조) | V1 유지 |
| 7 | ProductMaster 당 Product Landing 1개 · 대표 QR 1개(UNIQUE) | V2 유지 |
| **8** | **설명서 접근 통제 = 서버 API 인증** (프론트 숨김·noindex 단독 금지). 비로그인 응답에 본문 없음 + 로그인 후 returnUrl 복귀 | **신규** |
| **9** | **설명서 열람 = O4O 로그인 기본 권한**(회원 유형 무관·구독 무관). 구독은 사업 기능(수정·태블릿·POP·캠페인·배포·통계·고급 다국어)에만 | **신규** |

---

## 4. 파생 규칙

- **모든 ProductMaster 는 Landing/QR 대상**(V2 §4 유지). 설명 없으면 Landing 이 "상세 설명 준비 중" 렌더 — 이 안내 화면은 비로그인에도 노출 가능(본문 아님).
- 기존 배포 URL·QR 은 그대로 작동한다: 기존 QR 스캔 → 기존 고정 URL → 로그인/가입 → 기존 설명서 복귀. **새 QR 발급·landing key 재생성·기존 URL 폐기·ProductLanding 일괄 재생성·기존 QR 데이터 변경 금지.**
- 열람 인증 게이트는 `exposure_state` 게이트(행정처분/회수, V2 §4)와 **직교**한다. 둘 다 통과해야 로그인 사용자에게 본문을 제공한다.
- **의약품 의료 내용 자동 생성 금지**(V1 상위 규칙·CLAUDE.md) 유지.

---

## 5. 거버넌스

- 본 V3 확정 후 후속 구현 WO 착수 가능(§8). V1 6 불변식·V2 #7·2계층 구조는 재설계 대상이 아니다. 본 개정 범위(§2) 외 구조 변경은 다시 명시적 WO 필요.
- 본 개정은 **Frozen 역사 문서(V1·V2·IR·CHECK·WO)를 소급 재작성하지 않는다.** V1 #3 의 "공개" 의미 변경은 본 V3 로 명문화하며, V1·V2 원문은 그대로 보존한다(문서 계보로 참조).
- 결정 자체는 `ADR-0002-o4o-product-description-authenticated-access` 에 기록한다.

---

## 6. 변경 전·후 정책 비교

| 항목 | 개정 전(V1/V2) | 개정 후(V3) |
|---|---|---|
| 설명서 본문 접근 | 공개·무인증 | **O4O 로그인 세션 전용** |
| 고정 URL / landing key | 유지 | **유지(불변)** |
| 기본 QR(주소·이미지) | 유지·동적생성 | **유지·재발급 없음** |
| 비로그인 요청 | 본문 반환 | **본문 미반환 + 로그인 CTA + returnUrl** |
| 접근 통제 기준 | (없음) | **서버 API 인증** |
| 검색엔진/캐시 | 미규정 | **sitemap 제외·noindex·OG/검색 본문 미포함·공개 캐시 금지** |
| 열람 vs 구독 | 미분리 | **열람=로그인 기본 권한 / 구독=사업 기능** |
| 사업용 QR(`store_qr_codes`) | — | **변경 없음** |

---

## 7. 무변경 확인 (이 개정의 산출은 문서뿐)

```
코드 변경        = 0
DB write        = 0
migration       = 0
deploy          = 0
QR 재발급        = 0
landing key 변경 = 0
기존 URL 변경     = 0
product_landings 데이터 변경 = 0
store_qr_codes 변경 = 0
```

---

## 8. 후속 구현 WO (본 개정 범위 밖)

```
WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1 (제안)
```
예상 범위: `/p/{key}` 페이지 로그인 게이트 · 설명서 API 인증 · 비로그인 본문 차단 · 로그인·가입 returnUrl · 로그인 후 원래 설명서 복귀 · `noindex`/OG/sitemap 정비 · 공개 검색 응답 본문 제거 · 공개 캐시 방지 · 기존 QR 호환성 smoke.

본 baseline 개정 WO 에서는 위 코드를 구현하지 않는다.

---

*본 문서는 F12 baseline 의 세 번째 개정(V1 → V2-AMENDMENT → V3-AMENDMENT)이다. 설계 신규 없음 — 확정 정책(`O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1`)의 열람 접근 모델을 baseline 불변식에 반영하고, 고정 URL·기본 QR 유지를 재확인한다.*
