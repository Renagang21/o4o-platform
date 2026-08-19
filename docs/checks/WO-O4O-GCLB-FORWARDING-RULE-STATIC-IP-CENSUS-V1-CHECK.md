# WO-O4O-GCLB-FORWARDING-RULE-STATIC-IP-CENSUS-V1 — CHECK

- **작성일**: 2026-08-19
- **대상 프로젝트**: `netureyoutube` (display name `neture-services`)
- **성격**: 조사·판정 전용. **삭제·변경·DNS 수정 0건**
- **완료 판정**: `forwarding rule 미조사 0 / static IP 미조사 0 / UNKNOWN 0 / 삭제·변경 0`

---

## §1 Census 총계

| 리소스 | 수 | 비고 |
|---|---:|---|
| forwarding rule (global) | **4** | 전부 `EXTERNAL_MANAGED` · PREMIUM · TCP · IPv4 |
| forwarding rule (regional) | **0** | `--filter="region:*"` → 0건 |
| static external IP (reserved) | **1** | `neture-static-ip` = `136.110.132.35` (global, IN_USE) |
| ephemeral external IP | **2** | `34.117.153.136`, `34.54.126.46` (address 리소스 없음 = forwarding rule 자동 할당) |
| target HTTP proxy | **3** | |
| target HTTPS proxy | **1** | |
| target SSL / TCP proxy | **0** | |
| URL map | **2** | `o4o-global-lb`(application), `neture-https-frontend-redirect`(redirect) |
| backend service | **9** | 전부 `EXTERNAL_MANAGED` |
| backend bucket | **0** | |
| serverless NEG | **9** | 전부 asia-northeast3 · Cloud Run 1:1 |
| health check | **1** | `hc-neture-http` (backend 미연결 — 아래 §9) |
| legacy compute SSL cert | **9** | **전부 `PROVISIONING_FAILED_PERMANENTLY`** |
| Certificate Manager map | **1** | `o4o-main-cert-map`, entry **20**, cert **3** (전부 ACTIVE) |
| Cloud DNS managed zone | **0** | DNS 는 외부(레지스트라) 관리 |
| proxy-only subnet | **0** | |

### backend service ↔ NEG ↔ Cloud Run

| backend service | serverless NEG | Cloud Run |
|---|---|---|
| `backend-neture-web-http` | `neg-neture-web` | `neture-web` |
| `backend-o4o-core-api` | `neg-o4o-core-api` | `o4o-core-api` |
| `backend-kpa-society-web` | `neg-kpa-society-web` | `kpa-society-web` |
| `backend-glycopharm-web` | `neg-glycopharm-web` | `glycopharm-web` |
| `backend-k-cosmetics-web` | `neg-k-cosmetics-web` | `k-cosmetics-web` |
| `backend-glucoseview-web-advanced` | `neg-glucoseview-web` | `glucoseview-web` |
| `backend-pharmacy-hub-web` | `neg-pharmacy-hub-web` | `pharmacy-hub-web` |
| `o4o-admin-dashboard-backend-http` | `neg-o4o-admin-dashboard` | `o4o-admin-dashboard` |
| `backend-account-center-web` | `neg-account-center-web` | `o4o-main-site` |

---

## §2 DNS 실측 (8.8.8.8, 2026-08-19)

| 도메인 | resolve IP | 판정 |
|---|---|---|
| neture.co.kr / www / admin. / api. | `136.110.132.35` | LB |
| kpa-society.co.kr / www / api. | `136.110.132.35` | LB |
| glycopharm.co.kr / www / api. | `136.110.132.35` | LB |
| **k-cosmetics.site** / www / api. | `136.110.132.35` | LB |
| **glucoseview.co.kr** / www / api. | `136.110.132.35` | LB |
| **pharmacyhub.co.kr** / www | `136.110.132.35` | LB |
| siteguide.co.kr / www | `136.110.132.35` | LB (§9-2 참조) |
| account.neture.co.kr | `74.125.204.121` | **LB 아님** (Google ghs 대역) |
| ~~k-cosmetics.co.kr~~ / www | `203.245.12.x`, `183.111.139.237` | **GCP 아님** — production 도메인 아님 |
| ~~glucoseview.com~~ / www | `3.33.130.190`, `15.197.148.33` | **GCP 아님** — production 도메인 아님 |
| ~~pharmacy-hub.co.kr~~ / www | **NXDOMAIN** | 존재하지 않음 |
| api.siteguide.co.kr | **NXDOMAIN** | |

> **WO §3 최소 대상 목록 정정**: WO 가 지정한 `k-cosmetics.co.kr` · `glucoseview.com` · `pharmacy-hub.co.kr` 는 **현재 production 도메인이 아니다.**
> 실 production 은 `k-cosmetics.site` · `glucoseview.co.kr` · `pharmacyhub.co.kr` 이며, 저장소 `.github/workflows/deploy-web-services.yml` 의
> `VITE_SERVICE_URL_K_COSMETICS=https://k-cosmetics.site` · `VITE_SERVICE_URL_PHARMACY_HUB=https://pharmacyhub.co.kr` 와 일치한다. 저장소가 정확하다.

**HTTPS 응답 실측**: 위 LB 도메인 20개 전부 응답. 웹 14개 `200`, `api.*` 4개 루트 `404`(API 루트 정상 동작). 실패 0건.

---

## §3 forwarding rule 별 전체 경로

### (1) `neture-https-frontend-forwarding-rule` — 판정 **ACTIVE_REDIRECT_ONLY**

```text
neture.co.kr 외 전 production 도메인
  ↓ DNS A
136.110.132.35  (neture-static-ip, reserved)
  ↓ :80
neture-https-frontend-forwarding-rule   (생성 2025-12-26)
  ↓
neture-https-frontend-target-proxy      (HTTP)
  ↓
neture-https-frontend-redirect          (URL map, defaultUrlRedirect httpsRedirect=true, 301)
  ↓
→ HTTPS 로 301 (backend 없음)
```

- 실측: `curl -H "Host: neture.co.kr" http://136.110.132.35/` → **301 `https://neture.co.kr:443/`**
- 30일 traffic **179,069** (전량 `3xx`, backend 이름 공란 = redirect)
- **이름이 `https` 이지만 실제는 :80 HTTP redirect 규칙이다.** 이름만 보고 판단하면 오판한다.

### (2) `o4o-global-lb-forwarding-rule-2` — 판정 **ACTIVE_REQUIRED / ACTIVE_SHARED**

```text
production 도메인 20개
  ↓ DNS A
136.110.132.35  (neture-static-ip — (1)과 동일 IP 공유)
  ↓ :443
o4o-global-lb-forwarding-rule-2         (생성 2025-12-27)
  ↓
o4o-global-lb-target-proxy-2            (HTTPS)
  ├─ certificateMap: o4o-main-cert-map  ← 실제 TLS 종단 (entry 20 · cert 3 · 전부 ACTIVE)
  └─ sslCertificates: cert-final-neture-v3 (PROVISIONING_FAILED_PERMANENTLY — 미사용 잔재)
  ↓
o4o-global-lb                           (URL map, hostRule 11 / pathMatcher 9)
  ↓
backend-* (9) → serverless NEG (9) → Cloud Run (9)
```

- 30일 traffic **459,032** — 전 서비스 backend 로 분산 (core-api 220,858 · neture-web 88,630 · k-cosmetics 33,895 · kpa-society 30,316 · glycopharm 26,688 · glucoseview 17,548 · admin 13,223 · pharmacy-hub 2,801)
- **production 유일 진입 경로.**

### (3) `o4o-global-lb-forwarding-rule` — 판정 **LEGACY_UNUSED_CANDIDATE**

```text
(DNS 참조 없음)
  ↓
34.117.153.136  (ephemeral — address 리소스 미존재)
  ↓ :80
o4o-global-lb-forwarding-rule           (생성 2025-12-31)
  ↓
o4o-global-lb-target-proxy              (HTTP)
  ↓
o4o-global-lb                           ← redirect 맵이 아니라 application 맵
  ↓
backend-neture-web-http (default) 만 도달
```

### (4) `o4o-global-lb-forwarding-rule-3` — 판정 **LEGACY_UNUSED_CANDIDATE**

```text
(DNS 참조 없음)
  ↓
34.54.126.46    (ephemeral — address 리소스 미존재)
  ↓ :80
o4o-global-lb-forwarding-rule-3         (생성 2026-03-12)
  ↓
o4o-global-lb-target-proxy-3            (HTTP)
  ↓
o4o-global-lb                           ← redirect 맵이 아니라 application 맵
  ↓
backend-neture-web-http (default) 만 도달
```

---

## §4 (3)·(4) 를 LEGACY 로 판정한 근거

WO §6 은 traffic 이 있으면 삭제 후보로 올리지 말 것을 요구한다. (3)·(4) 는 **traffic 이 0 이 아니다** (30일 72,592 / 74,293). 따라서 traffic 의 **성격**을 끝까지 확인했다.

| 확인 항목 | 결과 |
|---|---|
| DNS 참조 | **0건** — 조사한 28개 도메인 중 어느 것도 이 두 IP 로 resolve 되지 않음 |
| Cloud DNS zone | 프로젝트에 zone 0개 (외부 DNS) → 내부 은닉 레코드 가능성 없음 |
| 도달 backend | 30일간 **`backend-neture-web-http`(URL map default) 단독**. host rule 이 매칭된 기록 **0건** |
| 실제 Host 헤더 | Cloud Run `neture-web` 요청 로그 3일 표본: `http://34.117.153.136` 237건 · `http://34.54.126.46` 151건 — **전부 bare IP**. 도메인 Host **0건** |
| User-Agent | bare IP 요청 120건 표본 **전량 동일 UA** (`AppleWebKit/530.17 Safari/530.17`, 2009년 문자열) = 단일 스캐너 |
| 오류 성격 | LB 거부 로그: `invalid_request_headers` · `body_not_allowed` (30일 4xx 6,361 / 249). 출처 IP = DigitalOcean(104.248.219.79 · 142.93.111.157 · 146.190.70.36), 80.94.95.43, 66.132.x 등 알려진 스캐너 대역 |
| 저장소 참조 | IP 문자열·리소스명 grep → **인프라 코드 0건** (문서 기록 2건뿐, §8) |
| 도메인 공유 | 없음 — 두 IP 는 서로 다른 규칙에 1:1, 공유 대상 없음 |
| HTTPS 짝 | **없음.** 두 IP 에 :443 규칙이 존재하지 않음 |
| 실측 응답 | `curl -H "Host: neture.co.kr" http://34.117.153.136/` → **200** (redirect 아님). `34.54.126.46` 도 **200** |

**결론**: 두 규칙의 traffic 은 100% 공인 IP 배회 스캐너이며, 설정된 소비처(도메인·인증서·저장소 config)가 **하나도 없다.**
정상 구조(`같은 IP :80 redirect + :443 application`)에도 해당하지 않는다 — 두 IP 에는 :443 이 없고, :80 이 redirect 맵이 아닌 **application 맵**을 직접 가리킨다.

> **보안 관측(범위 외, 기록만)**: 이 두 진입점은 HTTPS 강제 없이 평문 HTTP 로 production 웹 애플리케이션을 **200 으로 그대로 서빙**한다. (2)/(1) 정상 경로는 301 로 HTTPS 강제된다. 비용보다 이쪽이 제거 동기로 더 크다.

---

## §5 static IP 감사 (WO §8)

| IP | 리소스 | 유형 | 생성 | forwarding rule | DNS | 판정 |
|---|---|---|---|---|---|---|
| `136.110.132.35` | `neture-static-ip` (global address) | **reserved static**, PREMIUM, IPv4, `IN_USE` | 2025-12-26 | **2개 공유** — `neture-https-frontend-forwarding-rule`(:80) + `o4o-global-lb-forwarding-rule-2`(:443) | production 20 도메인 전부 | **ACTIVE_REQUIRED** |
| `34.117.153.136` | **address 리소스 없음** | **ephemeral** (규칙에 자동 할당) | (규칙 2025-12-31) | `o4o-global-lb-forwarding-rule` | 없음 | **LEGACY_UNUSED_CANDIDATE** |
| `34.54.126.46` | **address 리소스 없음** | **ephemeral** | (규칙 2026-03-12) | `o4o-global-lb-forwarding-rule-3` | 없음 | **LEGACY_UNUSED_CANDIDATE** |
| `neture-static-ip` | = `136.110.132.35` | — | — | — | — | 위와 **동일 리소스** |

**WO §8 확정 사항**:
- `neture-static-ip` 와 `136.110.132.35` 는 **별개가 아니라 같은 리소스**다 (`addresses list` 의 `address` 필드 일치, `users[]` 2건).
- `34.117.153.136` · `34.54.126.46` 은 **static IP 가 아니다.** `gcloud compute addresses list` 전체 결과가 1건이므로 예약 IP 가 아니며, forwarding rule 이 잡고 있는 임시 IP 다. → **RESERVED_UNUSED_CANDIDATE 해당 없음** (예약된 미사용 IP 는 프로젝트에 0개).
- 예약 IP 중 `RESERVED`(미사용) 상태는 **0개**.

---

## §6 실제 중복 여부 (WO §6)

- `136.110.132.35` 의 `:80`(redirect) + `:443`(application) 은 **정규 구조이며 중복이 아니다.** 두 규칙 모두 KEEP.
- 이름 유사(`o4o-global-lb-forwarding-rule` / `-2` / `-3`)는 판정 근거로 쓰지 않았다. `-2` 만 :443 application 이고 `-1`/`-3` 은 :80 이다.
- 동일 backend(`backend-neture-web-http`)를 공유한다는 사실도 근거로 쓰지 않았다. 근거는 **DNS 0 · host rule 매칭 0 · bare-IP Host 100% · 저장소 참조 0** 이다.
- 실질 중복: **`-1` 과 `-3` 은 서로에 대해서도 중복**이다 (동일 proxy 구성·동일 url map·둘 다 DNS 소비처 없음). 3개월 간격으로 같은 실수가 반복 생성된 것으로 보인다.

---

## §7 Traffic 조사 결과 (Cloud Monitoring MQL, `https_lb_rule::request_count`)

| forwarding rule | 30일 | 60일 | 성격 |
|---|---:|---:|---|
| `o4o-global-lb-forwarding-rule-2` | 459,032 | 675,319 | production 전량 |
| `neture-https-frontend-forwarding-rule` | 179,069 | 295,722 | 전량 3xx redirect |
| `o4o-global-lb-forwarding-rule-3` | 74,293 | 143,864 | bare-IP 스캐너 |
| `o4o-global-lb-forwarding-rule` | 72,592 | 112,978 | bare-IP 스캐너 |
| (rule 라벨 공란) | 2,769 | 4,937 | 라벨 미부여 |

- **90일 조회 실패**: `within 90d` 및 `within 90d, 90d` 모두 `INVALID_ARGUMENT`. WO §7 의 "가능하면 90일" 보조 확인은 **미수행**이며, 대신 60일로 대체했다. 60일에서도 30일과 동일한 비율·동일한 결론이다.
- LB 요청 로깅은 backend 9개 중 **2개만 enable** (`backend-kpa-society-web`, `o4o-admin-dashboard-backend-http`). 나머지는 거부 요청(4xx)만 로깅된다. 이 때문에 Host 헤더 근거는 LB 로그가 아니라 **Cloud Run 요청 로그**에서 확보했다.

---

## §8 저장소 조사 (WO §11)

| 검색 대상 | 결과 |
|---|---|
| forwarding rule 이름 / IP 문자열 / URL map / backend service 이름 | 인프라 코드·스크립트 **0건** |
| Terraform / deployment config / gcloud LB script | **존재하지 않음** — LB 는 전부 콘솔·CLI 수동 구성 |
| 코드 내 언급 | `apps/api-server/src/utils/trusted-client-ip.ts:12` 주석의 `o4o-global-lb` 1건 (경로 설명, 정상) |
| 문서 내 IP 기록 | `docs/investigations/CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1.md:146`, `docs/archive/work-orders/WO-O4O-E2E-REGISTRATION-APPROVAL-LOGIN-TEST-V1-REPORT.md:112` — 둘 다 `136.110.132.35` 로 **현재와 일치** |
| production 도메인 config | `.github/workflows/deploy-web-services.yml` 이 `k-cosmetics.site` · `pharmacyhub.co.kr` 사용 — **현재 DNS 와 일치** |

**LB 인프라 관련 dead config 0건.** 다만 아래 **도메인 dead reference 3건**을 추가로 발견했다 (WO §11 “기록만, 수정하지 않는다” 적용 — 이번 WO 에서 수정하지 않음).

| 위치 | 내용 | 평가 |
|---|---|---|
| `apps/api-server/src/modules/lms/controllers/CertificateController.ts:30` | `resolveVerificationBase('k-cosmetics')` 의 최종 fallback 이 리터럴 `https://k-cosmetics.co.kr` | **살아있는 경로.** 배포된 `o4o-core-api` 에 `KCOSMETICS_FRONTEND_URL` · `FRONTEND_URL` 이 **둘 다 미설정**(env 21개 중 URL 계열 0개)이므로, k-cosmetics 수료증 검증 링크가 **production 이 아닌 `k-cosmetics.co.kr`(203.245.12.x, GCP 외)로 생성**된다. 정본은 `k-cosmetics.site` |
| `apps/api-server/src/migrations/1736611201000-SeedNetureData.ts:258` | seed 데이터 URL `https://k-cosmetics.co.kr/store/beauty-cosmetic` | seed 전용. 영향도 낮음 |
| 같은 2건의 `apps/api-server/dist/**` 복사본 | 빌드 산출물 | 소스 수정 시 함께 해소 |

> `glucoseview.com` · `pharmacy-hub.co.kr` 은 `services/` · `packages/` · `apps/` 에서 참조 **0건**.
> `74.125.204.121` (account.neture.co.kr) 의 rDNS 는 `ti-in-f121.1e100.net` — Google 인프라가 맞음을 확인했다.

---

## §9 부수 관측 (이번 WO 범위 밖 — 기록만, 변경 0)

1. **legacy compute SSL certificate 9개 전부 `PROVISIONING_FAILED_PERMANENTLY`**
   (`cert-admin` · `cert-final-neture` · `-v2` · `-v3` · `cert-glucoseview` · `cert-glycopharm` · `cert-kcosmetics` · `cert-kpa` · `cert-neture-web` · `cert-siteguide-v1`).
   실제 TLS 는 `o4o-main-cert-map`(Certificate Manager) 이 담당하며, HTTPS proxy 에 붙은 `cert-final-neture-v3` 도 **실사용되지 않는 잔재**다. 다만 proxy 에 attach 되어 있으므로 제거는 detach 를 동반한다 → 별도 WO.
2. **`siteguide.co.kr` / `www.siteguide.co.kr`** — DNS 는 LB 를 가리키고 Certificate Manager entry(`siteguide-entry`, `www-siteguide-entry`, cert `cm-cert-siteguide`)도 ACTIVE 이나, `o4o-global-lb` URL map 에 **host rule 이 없다.** 결과적으로 default backend(`backend-neture-web-http` = neture-web)로 서빙된다 (HTTPS 200 확인, Cloud Run 로그에도 `https://siteguide.co.kr` 도달 기록 존재). 의도된 상태인지 확인 필요.
3. **`account.neture.co.kr`** — URL map `path-matcher-1` → `backend-account-center-web` → `neg-account-center-web` → Cloud Run `o4o-main-site` 경로가 살아 있으나, DNS 는 `74.125.204.121`(Google ghs)로 LB 를 가리키지 않는다. HTTP 404 / HTTPS 연결 실패. **LB 측 경로가 dead 일 가능성**이 높으나, 도메인 용도가 불명확하므로 WO §12 에 따라 삭제 후보로 올리지 않는다 → **HOLD 아님, 별도 조사 대상**.
4. **health check `hc-neture-http`** — serverless NEG backend 는 health check 를 쓰지 않으며, backend service 9개 중 어느 것도 참조하지 않는다(`backend-neture-web-http.healthChecks` 공란). 잔재.
5. **Cloud Run `kpa-branch-web`** — 서비스는 존재하나 NEG·backend·host rule 이 없어 LB 진입점이 없다. run.app 직접 접근만 가능.

---

## §10 비용 관점 (WO §9 — 청구액 미확정, 추정)

Billing 데이터 API 접근 수단이 없다(프로젝트에 BigQuery billing export 미설정). 아래는 **공개 단가 기준 추정치**이며 실제 청구서로 검증되지 않았다.

| 항목 | 현재 | 후속 WO 로 `-1`/`-3` 제거 시 |
|---|---|---|
| forwarding rule 요금 | 외부 Application LB 는 **최초 5개 규칙까지 시간당 정액**. 현재 4개 → 정액 구간 안 | **4→2 로 줄어도 정액 구간 그대로 → 절감 $0 가능성이 높다** |
| 외부 IPv4 주소 | in-use IPv4 3개 (reserved 1 + ephemeral 2) | ephemeral 2개 해제 → **월 $3~7 수준 추정** |
| LB 데이터 처리 | 스캐너 traffic 약 147k req/30일 | 소액. 유의미하지 않음 |
| proxy / URL map / NEG | 리소스 자체 과금 없음 | 변화 없음 |

**비용 절감 가능 후보 총액: 월 $3~7 추정 (최악의 경우 $0).**
즉 **이번 건의 실질 가치는 비용이 아니라 §4 의 평문 HTTP 노출 제거**다. 비용만 놓고 보면 우선순위가 낮다.

---

## §11 최종 판정 집계

### KEEP (2)

| 리소스 | 판정 |
|---|---|
| `neture-https-frontend-forwarding-rule` | ACTIVE_REDIRECT_ONLY |
| `o4o-global-lb-forwarding-rule-2` | ACTIVE_REQUIRED · ACTIVE_SHARED (20 도메인) |
| `neture-static-ip` / `136.110.132.35` | ACTIVE_REQUIRED · ACTIVE_SHARED (규칙 2개) |

### REMOVE_CANDIDATE (2) — **이번 WO 에서 삭제하지 않음**

| 리소스 | 판정 | 동반 제거 대상 |
|---|---|---|
| `o4o-global-lb-forwarding-rule` (`34.117.153.136:80`) | LEGACY_UNUSED_CANDIDATE | `o4o-global-lb-target-proxy` (제거 후 orphan) |
| `o4o-global-lb-forwarding-rule-3` (`34.54.126.46:80`) | LEGACY_UNUSED_CANDIDATE | `o4o-global-lb-target-proxy-3` (제거 후 orphan) |

> URL map `o4o-global-lb` 는 `-2` 가 계속 사용하므로 **유지**한다.
> ephemeral IP 2개는 규칙 삭제와 함께 자동 해제된다(별도 release 불필요).

### HOLD / UNKNOWN (0)

**UNKNOWN 0건.** 4개 forwarding rule · 3개 IP 전부 판정 확정.

### 삭제 시 위험 요소

| 위험 | 평가 |
|---|---|
| production 도메인 영향 | **없음.** 20개 도메인 전부 `136.110.132.35` 로만 resolve. 대상 규칙은 다른 IP |
| 하드코딩된 IP 소비처 | 저장소 grep 0건. 다만 **저장소 밖(외부 시스템·수기 북마크·타 프로젝트)** 은 검증 불가 |
| 인증/callback 등 비정기 진입점 | 30일간 host rule 매칭 0건 · 도메인 Host 0건 → 가능성 낮음. 다만 60일 미만 주기 이벤트는 배제 못함 |
| 롤백 | forwarding rule + target proxy 재생성은 수 분. **단, ephemeral IP 는 회수 불가** — 같은 IP 로 복구 불가능 |

→ 후속 WO 는 **즉시 삭제보다, 대상 규칙의 request_count 를 2~4주 추가 관찰한 뒤 삭제**하는 단계적 절차를 권장한다.

---

## §12 완료 기준 대조

```text
forwarding rule 미조사 0            ✅ 4/4 (global 4 · regional 0)
static IP 미조사 0                  ✅ reserved 1/1 · ephemeral 2/2
domain↔IP↔LB 관계 미확정 0          ✅ UNKNOWN 0
삭제/변경 0                          ✅ GCP write 명령 0회 (list/describe/logging/monitoring read 만 수행)
후속 삭제 후보가 근거와 함께 분리됨   ✅ REMOVE_CANDIDATE 2건 + §4 근거표
```

**후속 삭제 WO 필요 여부: 필요.** 단 비용 절감액이 작으므로(월 $3~7 추정) 우선순위는 낮고, 동기는 평문 HTTP 진입점 제거다.
§9 의 legacy SSL certificate 9개 정리, 그리고 §8 의 `k-cosmetics.co.kr` fallback 교정도 각각 별도 WO 후보다.
