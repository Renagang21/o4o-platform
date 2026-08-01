# CHECK-PHARMACY-HUB-WEB-CLOUD-RUN-AND-DOMAIN-GO-LIVE-V1

> WO: `WO-PHARMACY-HUB-WEB-CLOUD-RUN-AND-DOMAIN-GO-LIVE-V1`
> 작업일: 2026-08-01 · 브랜치 `main` · HEAD `db86521d2`
> **결과: ⚠️ 중지 조건 ① 발동 — `pharmacyhub.co.kr` DNS 존이 존재하지 않아 도메인 연결 불가.
> 인프라 변경은 수행하지 않았다. Cloud Run 배포·앱 설정·CORS 는 이미 완비 상태로 확인.**

---

## 1. 기존 배포 상태

| 항목 | 값 |
|---|---|
| Cloud Run 서비스 | **`pharmacy-hub-web`** (이미 존재 — 신규 생성 불필요) |
| 리전 | `asia-northeast3` |
| run.app URL | `https://pharmacy-hub-web-3e3aws7zqa-du.a.run.app` |
| 최신 리비전 | `pharmacy-hub-web-00008-5cm` |
| traffic | ✅ **100%** (latestRevision) |
| 중복 서비스 | ❌ 없음 — 전 리전 조회 결과 `pharmacy-hub-web` **1개** |

→ 중지 조건 ③(같은 이름 서비스 중복) **미해당**. 기존 서비스를 재사용한다.

## 2. ⚠️ 중지 조건 ① — DNS 존이 없다

`pharmacyhub.co.kr` 은 **등록·위임은 되어 있으나 DNS 존이 만들어져 있지 않다.**

### 2-1. 조사 경로와 근거

| 단계 | 결과 |
|---|---|
| 공용 리졸버(8.8.8.8 / 1.1.1.1) | ❌ **SERVFAIL** — A·NS·SOA 모두 조회 불가 |
| `.kr` 레지스트리(`b.dns.kr`) 위임 확인 | ✅ **위임 존재** — `ns.gabia.net` · `ns1.gabia.co.kr` · `ns.gabia.co.kr` |
| 권한 네임서버 직접 질의 (3대 전부) | ❌ **Query refused** |

세 권한 네임서버가 모두 질의를 거부한다 = **Gabia 계정에 해당 도메인의 존이 생성되어 있지 않다.**
(위임만 있고 존이 없으면 공용 리졸버는 SERVFAIL 을 낸다.)

### 2-2. 관리 위치

DNS 관리처는 **Gabia** 다. 프로젝트에 **Cloud DNS managed zone 은 0개**이며,
다른 O4O 도메인(`kpa-society.co.kr` 등)도 동일하게 Gabia 네임서버를 쓴다.

즉 **DNS 레코드는 GCP 에서 만들 수 없고 Gabia 콘솔에서만 만들 수 있다.**
이 세션에는 Gabia 접근 권한이 없다 → WO 중지 조건 ①("도메인 DNS 권한 … 확인할 수 없음") 해당.

### 2-3. 그래서 하지 않은 것

WO 의 "변경하지 말고 보고한다" 에 따라 **GCP 인프라를 일절 변경하지 않았다.**

```
NEG 생성 0 · backend-service 생성 0 · url-map 수정 0 · 인증서 발급 0 · 도메인 매핑 0
```

공유 LB(`o4o-global-lb`)는 neture · kpa-society · glycopharm · k-cosmetics · api 를 함께
서빙한다. DNS 가 없으면 어차피 검증이 불가능하므로, 검증 없이 공유 프로덕션 LB 를 건드리지 않았다.

## 3. 도메인·LB·인증서 구조 (조사 결과 — 변경 없음)

구조 자체는 **명확하게 파악**했다 → 중지 조건 ②(연결 구조 불명확) **미해당**.

```
DNS A → 136.110.132.35
   └ o4o-global-lb-forwarding-rule-2 (443)
       └ o4o-global-lb-target-proxy-2
           ├ certificateMap: o4o-main-cert-map → cm-cert-neture (ACTIVE)
           └ urlMap: o4o-global-lb
               └ hostRules → pathMatcher → backend-<svc> → neg-<svc> → Cloud Run
```

### 3-1. 인증서 — 실제로 유효한 것은 Certificate Manager 쪽이다

| 구분 | 상태 |
|---|---|
| `sslCertificates: cert-final-neture-v3` (레거시) | ⚠️ `PROVISIONING_FAILED_PERMANENTLY` (전 도메인 `FAILED_NOT_VISIBLE`) |
| `certificateMap: o4o-main-cert-map` → `cm-cert-neture` | ✅ **ACTIVE** — 실서비스 HTTPS 를 담당 |

`cm-cert-neture` 의 SAN 에 **`pharmacyhub.co.kr` 은 포함되어 있지 않다.**
따라서 도메인 연결 시 인증서 작업도 함께 필요하다.

### 3-2. 현재 미존재 리소스

```
neg-pharmacy-hub-web         없음
backend-pharmacy-hub-web     없음
url-map hostRule (pharmacyhub.co.kr)  없음
```

## 4. 환경변수 · API · CORS — **이미 완비**

DNS 와 무관한 영역은 전부 준비된 상태로 확인했다. **추가 작업 불필요.**

### 4-1. 배포 workflow 영속 반영 (이미 되어 있음)

`.github/workflows/deploy-web-services.yml`

| 항목 | 값 |
|---|---|
| path 필터 | `services/web-pharmacy-hub/**` |
| 수동 dispatch 옵션 | `pharmacy-hub` 포함 |
| `VITE_API_URL_PHARMACY_HUB` | ✅ **`https://api.neture.co.kr`** |
| `VITE_SERVICE_URL_PHARMACY_HUB` | ✅ **`https://pharmacyhub.co.kr`** |
| `deploy-pharmacy-hub` job | 존재 · 빌드 인자로 위 두 값 주입 |

→ workflow 재실행해도 설정이 유지된다(값이 workflow 에 하드코딩되어 있으므로).

### 4-2. 빌드 산출물 실측

배포된 번들에서 직접 확인했다.

```
bundle: /assets/index-KBYwuG5o.js
  "api.neture.co.kr"            → 포함  ✅
  "pharmacy-hub-web-…run.app"   → 0건   ✅ (run.app 이 코드에 박혀 있지 않다)
```

→ 도메인 연결 후 **재빌드 없이도** API 주소는 이미 공식 주소다.

### 4-3. CORS — 공식 도메인이 이미 허용됨

```
OPTIONS /api/v1/pharmacy-hub/service-info
  Origin: https://pharmacyhub.co.kr
  → 204 · access-control-allow-origin: https://pharmacyhub.co.kr · allow-credentials: true
```

`setup-middlewares.ts` 의 `prodOrigins` 에 `https://pharmacyhub.co.kr` · `www` · run.app 이 등재되어 있다.
→ 중지 조건 ④(CORS 변경이 타 서비스 계약에 영향) **미해당** — 변경 자체가 불필요했다.

## 5. Smoke — run.app 기준 (공식 도메인 불가)

공식 도메인 검증은 DNS 부재로 **수행 불가**다. 대신 동일 리비전을 run.app 으로 전수 확인했다.

| 화면 | 결과 |
|---|---|
| 홈 `/` | ✅ 200 |
| 로그인 `/login` | ✅ 200 |
| 가입 `/join` · 가입 상태 `/join/status` | ✅ 200 |
| 운영자 승인 `/operator/memberships` | ✅ 200 |
| 공급자 제공 설정 `/supplier/products` | ✅ 200 |
| 약국 상품 목록·상세 | ✅ 200 |
| 장바구니 `/store-owner/cart` | ✅ 200 |
| 주문 목록·상세 | ✅ 200 |
| 결제 진입 `/store-owner/payment` | ✅ 200 |
| **새로고침 시 라우트 404 없음** | ✅ 딥링크 전부 200 (SPA fallback 정상) |
| API CORS | ✅ §4-3 |
| Cloud Run traffic | ✅ 100% |

실결제는 수행하지 않았다(WO 지시).

## 6. 데이터 변경

```
migration 0 · DB write 0 · GCP 리소스 생성/수정 0 · 코드 변경 0
```

## 7. 도메인 연결에 남은 작업 (사용자 조치 필요)

DNS 가 선행되어야 나머지가 의미를 갖는다. 순서가 중요하다.

### ① Gabia — DNS 존 생성 + A 레코드 (**사용자만 가능**)

```
pharmacyhub.co.kr.       A     136.110.132.35
www.pharmacyhub.co.kr.   A     136.110.132.35
```

`136.110.132.35` = `o4o-global-lb-forwarding-rule-2` (443) 의 IP.
다른 O4O 도메인(`kpa-society.co.kr`)이 가리키는 것과 **같은 IP**다.

### ② GCP — LB 연결 (DNS 전파 확인 후)

```bash
gcloud compute network-endpoint-groups create neg-pharmacy-hub-web \
  --region=asia-northeast3 --network-endpoint-type=serverless \
  --cloud-run-service=pharmacy-hub-web

gcloud compute backend-services create backend-pharmacy-hub-web \
  --global --load-balancing-scheme=EXTERNAL_MANAGED

gcloud compute backend-services add-backend backend-pharmacy-hub-web \
  --global --network-endpoint-group=neg-pharmacy-hub-web \
  --network-endpoint-group-region=asia-northeast3

# url-map: pharmacyhub.co.kr / www 호스트 규칙 + path matcher 추가
```

> ⚠️ url-map 은 **공유 프로덕션 자원**이다. 수정 전 `gcloud compute url-maps export o4o-global-lb`
> 로 현재 구성을 백업하고, 기존 hostRules 를 보존한 채 추가만 할 것.

### ③ 인증서 — `pharmacyhub.co.kr` 을 Certificate Manager 에 추가

`cm-cert-neture` 는 해당 도메인을 포함하지 않는다. 신규 CM 인증서 발급 후
`o4o-main-cert-map` 에 map entry 를 추가한다. **DNS 가 LB 를 가리킨 뒤에야 프로비저닝된다.**

### ④ 연결 후 재검증

§5 의 항목을 `https://pharmacyhub.co.kr` 로 다시 수행 + HTTPS 인증서 확인.

## 8. 중지 조건 판정

| 조건 | 판정 |
|---|---|
| **도메인 DNS 권한·관리 위치 확인 불가** | ⚠️ **해당** — 관리처는 Gabia 로 특정했으나 **존 미생성 + 접근 권한 없음** (§2). 인프라 변경 중지 |
| 기존 LB 연결 구조 불명확 | ❌ 미해당 — 구조 전부 파악 (§3) |
| 같은 이름 Cloud Run 서비스 중복 | ❌ 미해당 — 1개 (§1) |
| 로그인·CORS 변경이 타 서비스 계약에 영향 | ❌ 미해당 — CORS 이미 허용, 변경 불필요 (§4-3) |
| 병행 세션 파일 수정 필요 | ❌ 미해당 |

## 9. 결론

**Pharmacy-Hub 애플리케이션 측은 도메인 연결 준비가 끝나 있다** —
Cloud Run 배포 100% · API 주소 공식화 · CORS 허용 · workflow 영속 · 전 화면 정상.

남은 것은 **Gabia 에서의 DNS 존 생성 한 단계**이며, 그것은 이 세션의 권한 밖이다.
DNS 가 올라오면 §7 ②③ 은 기계적으로 수행 가능하다.
