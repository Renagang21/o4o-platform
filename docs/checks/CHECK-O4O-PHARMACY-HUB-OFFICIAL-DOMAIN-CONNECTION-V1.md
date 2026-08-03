# CHECK-O4O-PHARMACY-HUB-OFFICIAL-DOMAIN-CONNECTION-V1

**작업**: Pharmacy-Hub 공식 도메인(`pharmacyhub.co.kr`) 연결 — 기존 공유 LB `o4o-global-lb` 편입
**작업 일자**: 2026-08-03
**프로젝트**: `netureyoutube` (GCP)
**상태**: **완료** — 인증서 ACTIVE · HTTPS 200 · CORS 정상 · 기존 도메인 회귀 0

---

## 1. 공식 주소 (canonical)

```text
https://pharmacyhub.co.kr        ← 공식 주소 (canonical)
https://www.pharmacyhub.co.kr    ← 동일 Web 제공 (현재 리디렉션 미구성 — §7-1)
```

| 항목 | 값 |
|------|-----|
| Web 서비스 | Cloud Run `pharmacy-hub-web` (asia-northeast3) |
| API 주소 | `https://api.neture.co.kr` (변경 없음) |
| LB 진입 IP | `136.110.132.35` (`o4o-global-lb-forwarding-rule-2`, 443) |
| `run.app` 노출 | 사용자-facing 링크에 없음 (LB 경유만) |

---

## 2. 생성한 리소스 (기존 자원 수정 0)

| # | 리소스 | 종류 | 값 |
|:-:|--------|------|-----|
| 1 | `dns-auth-pharmacyhub-root` | DNS authorization | domain `pharmacyhub.co.kr`, `FIXED_RECORD` |
| 2 | `dns-auth-pharmacyhub-www` | DNS authorization | domain `www.pharmacyhub.co.kr`, `FIXED_RECORD` |
| 3 | `cm-cert-pharmacyhub` | Managed certificate | SAN 2개, `state: ACTIVE` |
| 4 | `cm-entry-pharmacyhub-root` | Certificate map entry | `o4o-main-cert-map` / `pharmacyhub.co.kr` / `ACTIVE` |
| 5 | `cm-entry-pharmacyhub-www` | Certificate map entry | `o4o-main-cert-map` / `www.pharmacyhub.co.kr` / `ACTIVE` |
| 6 | `neg-pharmacy-hub-web` | Serverless NEG | asia-northeast3 → Cloud Run `pharmacy-hub-web` |
| 7 | `backend-pharmacy-hub-web` | Global backend service | `EXTERNAL_MANAGED` / `HTTPS` / `timeoutSec 30` / `portName http` / `enableCDN false` |
| 8 | `path-matcher-pharmacy-hub` + host rule | URL map 항목 | `o4o-global-lb` 에 additive 추가 |

### 2-A. Gabia DNS (사용자 작업)

| 호스트 | 유형 | 값 |
|--------|------|-----|
| `@` | A | `136.110.132.35` |
| `www` | A | `136.110.132.35` |
| `_acme-challenge` | CNAME | `a74bae62-….2.authorize.certificatemanager.goog.` |
| `_acme-challenge.www` | CNAME | `a3834445-….18.authorize.certificatemanager.goog.` |

- 네임서버 변경 없음 / Cloud DNS 존 신설 없음 / `run.app` 을 DNS 에 연결하지 않음.
- **계획 보완 사항**: 기존 `cm-cert-neture` 가 DNS authorization 방식이므로, A 레코드 2개 외에 `_acme-challenge` CNAME 2개가 추가로 필요했다. 초기 계획(A 2개)에서 누락되어 순서를 조정했다.

### 2-B. backend service 파라미터 근거

기존 O4O Web backend 4종을 조사해 다수 패턴을 채택했다.

| 항목 | 조사 | 채택 |
|------|------|------|
| loadBalancingScheme | 9/9 `EXTERNAL_MANAGED` | `EXTERNAL_MANAGED` |
| protocol | Web 4개 중 3개 `HTTPS` (kpa-society 만 `HTTP`) | `HTTPS` |
| timeoutSec | 9/9 `30` | `30` |
| enableCDN | 패턴 불일치(3 true / 1 false) — 지시 항목 외 | **`false`** — 신규 SPA 의 stale chunk 캐시 위험 회피 |

---

## 3. URL map 변경 (additive only)

`o4o-global-lb` 에 아래 2개 항목만 추가했다.

```text
pharmacyhub.co.kr
www.pharmacyhub.co.kr
→ path-matcher-pharmacy-hub
→ backend-pharmacy-hub-web
```

| 안전 조치 | 결과 |
|-----------|------|
| 변경 전 export 보존 | fingerprint `v50WmnjPru0=` 로 백업 (롤백 가능) |
| 변경 전후 diff | **추가 8줄 / 삭제·수정 0줄** |
| `gcloud compute url-maps validate` | `loadSucceeded: true`, `testPassed: true` |
| 적용본 재-export 대조 | 의도 YAML 과 fingerprint 외 **완전 동일** (신규 `HMGAWZWG4bw=`) |
| 기존 host rule 10개 / path matcher 8개 / `defaultService` | **무변경** |

- `path-matcher-pharmacy-hub` 는 `pathRules`·`routeRules` 없이 `defaultService` 만 지정 → 해당 호스트의 **모든 경로**가 backend 로 전달된다(SPA 딥링크 포함). 기존 8개 path matcher 와 동일한 구성 방식이다.

---

## 4. 검증 결과

### 4-1. DNS

| 레코드 | 유형 | 기대값 | 권한 NS 3곳 | 8.8.8.8 | 1.1.1.1 |
|--------|:----:|--------|:---:|:---:|:---:|
| `pharmacyhub.co.kr` | A | `136.110.132.35` | ✅ | ✅ | ✅ |
| `www.pharmacyhub.co.kr` | A | `136.110.132.35` | ✅ | ✅ | ✅ |
| `_acme-challenge.pharmacyhub.co.kr` | CNAME | authorization 값 | ✅ | ✅ | ✅ |
| `_acme-challenge.www.pharmacyhub.co.kr` | CNAME | authorization 값 | ✅ | ✅ | ✅ |

권한 NS(`ns.gabia.co.kr` / `ns1.gabia.co.kr` / `ns.gabia.net`) 응답 상호 일치.

### 4-2. HTTPS 인증서

| 항목 | 결과 |
|------|------|
| subject | `CN=pharmacyhub.co.kr` |
| issuer | `Google Trust Services WR3` |
| SAN | `pharmacyhub.co.kr`, `www.pharmacyhub.co.kr` |
| 유효기간 | `2026-08-03` ~ `2026-11-01T04:03:22Z` — `cm-cert-pharmacyhub.expireTime` 과 **정확히 일치** → 의도한 인증서로 서빙 확인 |
| `ssl_verify_result` | `0` (검증 통과) |
| 도메인 인증 | `pharmacyhub.co.kr` / `www.pharmacyhub.co.kr` 모두 `AUTHORIZED`, `failureReason` 없음 |

### 4-3. Backend 정확성

서빙된 `index.html` 이 `pharmacy-hub-web` run.app 원본과 **바이트 동일**.

- `<html lang="ko" data-service="pharmacy-hub">` / `<title>Pharmacy-Hub 파머시 허브</title>`
- 동일 asset 해시 `index-KBYwuG5o.js`
- 정적 asset: JS 200 (355,947 B) · CSS 200 (12,195 B)

Cloud Run: `latestReadyRevision = pharmacy-hub-web-00011-qsp`, traffic **100%**, `Ready: True`.

### 4-4. 경로 smoke — **실제 라우트 정정 기록**

> **정정**: 검증 계획서에 있던 `/register` · `/membership-status` 는 **정의된 라우트가 아니다.**
> 실제 경로는 **`/join`** 과 **`/join/status`** 다 (`services/web-pharmacy-hub/src/App.tsx`).
> SPA `path="*"` catch-all 때문에 두 경로도 HTTP 200 을 반환하지만 화면은 fallback 이 렌더된다.
> **배포 결함이 아니라 검증 목록의 경로명 오류**이며, 이후 문서·링크는 `/join`, `/join/status` 를 사용한다.

실제 라우트 기준 재검증 — 두 도메인 모두 전부 **200**:

| 경로 | 비고 |
|------|------|
| `/` | 홈 |
| `/login` | 로그인 |
| `/join` | 가입 신청 (계획서의 `/register` 아님) |
| `/join/status` | 가입 상태·반려 사유 (계획서의 `/membership-status` 아님) |
| `/store-owner` | 약국 경영자 홈 |
| `/store-owner/products` · `/store-owner/products/:offerId` | 상품 목록·상세 |
| `/store-owner/cart` | 장바구니 |
| `/store-owner/orders` · `/store-owner/orders/:orderId` | 주문 목록·상세 |
| `/store-owner/payment` · `/payment/success` · `/payment/fail` | 결제 진입 (실결제 미수행) |
| `/supplier` · `/supplier/products` | 공급자 |
| `/operator` · `/operator/memberships` | 운영자 |

**딥링크 새로고침**: 중첩 경로·파라미터 경로를 직접 요청해도 200 + `index.html` 반환 (SPA fallback 정상).

### 4-5. API CORS (`api.neture.co.kr`)

| Origin | preflight(OPTIONS) | 실요청(GET) | `access-control-allow-origin` |
|--------|:---:|:---:|---|
| `https://pharmacyhub.co.kr` | 204 | 200 | `https://pharmacyhub.co.kr` |
| `https://www.pharmacyhub.co.kr` | 204 | 200 | `https://www.pharmacyhub.co.kr` |

`allow-credentials: true`, 허용 method(`GET,POST,PUT,DELETE,OPTIONS,PATCH`)·header 정상. 미등록 Origin 은 ACAO 를 받지 못해 차단된다(§7-3 참조).

### 4-6. 기존 O4O 도메인 회귀

| 도메인 | 결과 |
|--------|------|
| `neture.co.kr` / `www` | 200 |
| `admin.neture.co.kr` | 200 |
| `kpa-society.co.kr` / `www` | 200 |
| `glycopharm.co.kr` / `www` | 200 |
| `glucoseview.co.kr` / `www` | 200 |
| `k-cosmetics.site` / `www` | 200 |
| `api.neture.co.kr` | `/health` 200 · `/api/v1/auth/status` 200 (루트 `/` 404 = 라우트 없음, 정상) |
| `account.neture.co.kr` | ❌ TLS 실패 — **기존 별도 이슈** (§7-2) |

전부 `cm-cert-neture` 로 서빙되며 IP·인증서·backend 매핑 변화 없음. certificate map entry 는 18 → 20 (기존 18개 `ACTIVE` 유지, 추가분만 신규).

---

## 5. 변경 없음 확인

| 대상 | 결과 |
|------|------|
| DB | 변경 0 (migration 0 / 테이블 0 / row 0) |
| 애플리케이션 코드 | 변경 0 |
| Cloud Run 서비스 설정 | 변경 0 (기존 `pharmacy-hub-web` 재사용) |
| 기존 인증서 `cm-cert-neture` | 변경 0 |
| 레거시 `cert-final-neture-v3` | 변경 0 (실제 서빙은 certificate map 경유) |
| 기존 map entry 18개 | 변경 0 |
| 기존 NEG 8개 / backend 8개 | 변경 0 |
| 기존 host rule·path matcher | 변경 0 |
| 실결제 | 미수행 |

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|------|------|
| `pharmacyhub.co.kr` 정상 접속 | ✅ |
| `www.pharmacyhub.co.kr` 정상 접속 | ✅ (리디렉션 없이 동일 Web 제공 — §7-1) |
| 인증서 정상 | ✅ |
| 주요 화면·딥링크 정상 | ✅ |
| API CORS 정상 | ✅ |
| 기존 도메인 회귀 없음 | ✅ |

---

## 7. 후속 / 별도 이슈

1. **`www` → 루트 301 리디렉션 미구성** (선택). 현재는 두 주소가 같은 Web 을 제공하고 canonical 만 루트 도메인으로 유지한다. 공유 LB 에서 리디렉션을 구성하려면 별도 URL map `routeRules` 변경이 필요하므로 이번 범위에서 제외했다.
2. **`account.neture.co.kr` HTTPS 불가 — 본 작업과 무관한 기존 이슈.** URL map 에 host rule(`path-matcher-1` → `backend-account-center-web`)은 있으나 certificate map entry 가 **0개**이고 `cm-cert-neture` SAN 에도 없어 TLS handshake 가 실패한다. 본 작업 착수 시점 조회(entry 18개)에서도 동일했으므로 회귀가 아니다. 처리하려면 동일 절차(dns-authorization → 인증서 → map entry)가 필요하며 **별도 작업**으로 분리한다.
3. **미허용 Origin 에 500 응답 — 본 작업과 무관한 기존 이슈.** CORS 차단 자체는 정상 동작하나 응답 코드가 `403` 이 아닌 `500 Internal Server Error` 다. API 서버 CORS 미들웨어의 기존 동작이며 본 작업 범위 밖이다. 정리하려면 별도 WO 가 필요하다.
4. Pharmacy-Hub B2B 장바구니·주문 트랙은 별도 진행 (본 문서 범위 외).
