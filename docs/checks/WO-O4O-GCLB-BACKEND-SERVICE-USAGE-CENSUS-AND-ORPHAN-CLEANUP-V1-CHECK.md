# CHECK — WO-O4O-GCLB-BACKEND-SERVICE-USAGE-CENSUS-AND-ORPHAN-CLEANUP-V1

- **작업일**: 2026-08-19
- **대상 프로젝트**: `netureyoutube` (display name `neture-services`)
- **범위**: GCLB backend service 9건 전수 사용여부 확정 + `ORPHAN_CONFIRMED` 만 안전 삭제
- **선행 문서**: `WO-O4O-GCLB-ORPHAN-PROXY-AND-SSL-CERT-CLEANUP-V1-CHECK.md`
- **결과**: **미조사 0 · ORPHAN_CONFIRMED 0건 → 삭제 0건 · UNKNOWN 1건(명확한 HOLD 사유) · production 무변경**

---

## 1. 요약 판정표 (§14)

| # | backend service | proto | 생성 | host rule | NEG | Cloud Run | 30d 요청 | **판정** |
|:--:|---|:--:|---|---|---|---|--:|:--|
| 1 | `backend-neture-web-http` | HTTPS | 2025-12-27 | `neture.co.kr`, `www.neture.co.kr` **+ URL map defaultService** | `neg-neture-web` | `neture-web` | 232,231 | **ACTIVE_SHARED** |
| 2 | `backend-o4o-core-api` | HTTP | 2026-01-03 | `api.neture` · `api.glycopharm` · `api.glucoseview` · `api.kpa-society` · `api.k-cosmetics` (5) | `neg-o4o-core-api` | `o4o-core-api` | 249,958 | **ACTIVE_SHARED** |
| 3 | `backend-kpa-society-web` | HTTP | 2026-01-02 | `kpa-society.co.kr`, `www.` | `neg-kpa-society-web` | `kpa-society-web` | 31,166 | **ACTIVE_REQUIRED** |
| 4 | `backend-k-cosmetics-web` | HTTPS | 2026-01-02 | `k-cosmetics.site`, `www.` | `neg-k-cosmetics-web` | `k-cosmetics-web` | 34,239 | **ACTIVE_REQUIRED** |
| 5 | `backend-glycopharm-web` | HTTPS | 2025-12-31 | `glycopharm.co.kr`, `www.` | `neg-glycopharm-web` | `glycopharm-web` | 27,519 | **ACTIVE_REQUIRED** |
| 6 | `backend-glucoseview-web-advanced` | HTTPS | 2025-12-31 | `glucoseview.co.kr`, `www.` | `neg-glucoseview-web` | `glucoseview-web` | 17,516 | **ACTIVE_REQUIRED** |
| 7 | `o4o-admin-dashboard-backend-http` | HTTP | 2026-01-02 | `admin.neture.co.kr` | `neg-o4o-admin-dashboard` | `o4o-admin-dashboard` | 13,606 | **ACTIVE_REQUIRED** |
| 8 | `backend-pharmacy-hub-web` | HTTPS | 2026-08-02 | `pharmacyhub.co.kr`, `www.` | `neg-pharmacy-hub-web` | `pharmacy-hub-web` | 3,025 | **ACTIVE_REQUIRED** |
| 9 | `backend-account-center-web` | HTTPS | 2026-03-12 | `account.neture.co.kr` (**DNS 부재**) | `neg-account-center-web` | **`o4o-main-site`** | **0** | **UNKNOWN — HOLD** |

| 분류 | 수 |
|---|:--:|
| backend service 총수 | **9** |
| ACTIVE_REQUIRED | **6** |
| ACTIVE_SHARED | **2** |
| DEFAULT_FALLTHROUGH_ONLY | **0** |
| ORPHAN_CONFIRMED | **0** |
| UNKNOWN | **1** |
| 미조사 | **0** |

**삭제 backend 목록: 없음. 삭제 후 backend 총수 9 (변경 없음).**

> ACTIVE_SHARED / ACTIVE_REQUIRED 구분 기준: **서로 다른 서비스 도메인**을 여러 개 받으면 SHARED, apex+`www.` 처럼 같은 도메인의 변형만 받으면 REQUIRED 로 분류했다. `backend-o4o-core-api` 는 5개 서비스의 `api.*` 를 한 backend 로 받고, `backend-neture-web-http` 는 자기 host rule 에 더해 **URL map defaultService** 역할까지 겸한다.

---

## 2. 전 항목 Census 상세 (§3)

| backend service | scheme | timeout | CDN | security policy | LB logging | health check |
|---|---|:--:|:--:|---|---|:--:|
| `backend-neture-web-http` | EXTERNAL_MANAGED | 30s | on | `default-security-policy-for-backend-neture-web-http` | disabled | 없음(서버리스 NEG) |
| `backend-o4o-core-api` | EXTERNAL_MANAGED | 30s | off | 없음 | disabled | 없음 |
| `backend-kpa-society-web` | EXTERNAL_MANAGED | 30s | off | 없음 | **enabled** (sampleRate 1) | 없음 |
| `backend-k-cosmetics-web` | EXTERNAL_MANAGED | 30s | on | `default-security-policy-for-backend-k-cosmetics-web` | disabled | 없음 |
| `backend-glycopharm-web` | EXTERNAL_MANAGED | 30s | on | `default-security-policy-for-backend-glycopharm-web` | disabled | 없음 |
| `backend-glucoseview-web-advanced` | EXTERNAL_MANAGED | 30s | on | `default-security-policy-for-backend-glucoseview-web-advanced` | disabled | 없음 |
| `o4o-admin-dashboard-backend-http` | EXTERNAL_MANAGED | 30s | off | 없음 | **enabled** (sampleRate 1) | 없음 |
| `backend-pharmacy-hub-web` | EXTERNAL_MANAGED | 30s | off | 없음 | 미설정 | 없음 |
| `backend-account-center-web` | EXTERNAL_MANAGED | 30s | on | `default-security-policy-for-backend-account-center-web` | disabled | 없음 |

- NEG region 은 **전부 `asia-northeast3`**, endpoint type 전부 `SERVERLESS`, backend ↔ NEG 는 **전부 1:1** (한 NEG 를 두 backend 가 공유하는 사례 0).
- 서버리스 NEG 이므로 health check 는 원래 부착되지 않는다 (결함 아님).
- LB access logging 이 9건 중 2건만 켜져 있다 — 이번 WO 범위 밖, 후속 후보로만 기록한다.

---

## 3. 관계 추적 (§4)

URL map `o4o-global-lb` 의 host rule 11그룹 / pathMatcher 11개를 전수 전개했다. **어떤 hostRule 에도 참조되지 않는 pathMatcher 는 0개**였고, 모든 pathMatcher 는 `pathRules` 없이 `defaultService` 만 갖는 단순 구조였다.

```text
136.110.132.35 :443
  └─ o4o-global-lb-forwarding-rule-2
       └─ o4o-global-lb-target-proxy-2 (HTTPS, certificateMap=o4o-main-cert-map)
            └─ URL map: o4o-global-lb        [defaultService = backend-neture-web-http]
                 ├─ neture.co.kr / www.neture.co.kr      → path-matcher-neture       → backend-neture-web-http          → neg-neture-web           → neture-web
                 ├─ api.neture / api.glycopharm / api.glucoseview / api.kpa-society / api.k-cosmetics
                 │                                        → path-matcher-api          → backend-o4o-core-api             → neg-o4o-core-api         → o4o-core-api
                 ├─ kpa-society.co.kr / www.             → path-matcher-kpa-society   → backend-kpa-society-web          → neg-kpa-society-web      → kpa-society-web
                 ├─ k-cosmetics.site / www.              → path-matcher-k-cosmetics   → backend-k-cosmetics-web          → neg-k-cosmetics-web      → k-cosmetics-web
                 ├─ glycopharm.co.kr / www.              → path-matcher-glycopharm    → backend-glycopharm-web           → neg-glycopharm-web       → glycopharm-web
                 ├─ glucoseview.co.kr / www.             → path-matcher-glucoseview   → backend-glucoseview-web-advanced → neg-glucoseview-web      → glucoseview-web
                 ├─ admin.neture.co.kr                   → path-matcher-admin         → o4o-admin-dashboard-backend-http → neg-o4o-admin-dashboard  → o4o-admin-dashboard
                 ├─ pharmacyhub.co.kr / www.             → path-matcher-pharmacy-hub  → backend-pharmacy-hub-web         → neg-pharmacy-hub-web     → pharmacy-hub-web
                 ├─ account.neture.co.kr                 → path-matcher-1             → backend-account-center-web       → neg-account-center-web   → o4o-main-site   ⚠ DNS 부재
                 └─ (host rule 없는 그 외 전부)          → defaultService             → backend-neture-web-http          → neg-neture-web           → neture-web
                                                                                        ↑ siteguide.co.kr / www. 가 여기로 떨어진다
```

**default backend 로만 연결되는 backend service 는 없다** — `backend-neture-web-http` 는 명시 host rule 도 함께 갖는다. 따라서 `DEFAULT_FALLTHROUGH_ONLY` 판정 대상은 0건이다.

---

## 4. Traffic 검증 (§6)

Monitoring MQL `loadbalancing.googleapis.com/https/request_count` 를 `resource.backend_target_name` 으로 집계했다. 30일이 1차 기준, 6주·60일을 보조로 확인했다.

### 30일 · 응답코드 분포

| backend_target | 2xx | 3xx | 4xx | 5xx | 합계 |
|---|--:|--:|--:|--:|--:|
| `backend-o4o-core-api` | 105,085 | 23,784 | 118,641 | 1,296 | **249,958** |
| `backend-neture-web-http` | 223,373 | 1,728 | 7,106 | 8 | **232,231** |
| `backend-k-cosmetics-web` | 34,046 | 169 | 16 | 0 | **34,239** |
| `backend-kpa-society-web` | 29,835 | 168 | 1,131 | 0 | **31,166** |
| `backend-glycopharm-web` | 27,383 | 104 | 32 | 0 | **27,519** |
| `backend-glucoseview-web-advanced` | 17,500 | 16 | 0 | 0 | **17,516** |
| `o4o-admin-dashboard-backend-http` | 12,660 | 32 | 914 | 0 | **13,606** |
| `backend-pharmacy-hub-web` | 2,065 | 952 | 8 | 0 | **3,025** |
| `backend-account-center-web` | — | — | — | — | **0 (계열 자체 없음)** |
| *(backend 없음 = :80 redirect proxy)* | 3,109 | 181,792 | 368 | 8 | 186,094 |

### 보조 창 (누적 요청)

| backend_target | 30d | 6주 | 60d |
|---|--:|--:|--:|
| `backend-neture-web-http` | 232,231 | 294,585 | 391,776 |
| `backend-o4o-core-api` | 249,958 | 282,102 | 328,530 |
| `backend-kpa-society-web` | 31,166 | 41,870 | 56,437 |
| `backend-k-cosmetics-web` | 34,239 | 41,676 | 52,317 |
| `backend-glycopharm-web` | 27,519 | 34,063 | 44,679 |
| `backend-glucoseview-web-advanced` | 17,516 | 23,986 | 31,334 |
| `o4o-admin-dashboard-backend-http` | 13,606 | 19,201 | 24,451 |
| `backend-pharmacy-hub-web` | 3,025 | 3,025 | 3,025 |
| **`backend-account-center-web`** | **0** | **0** | **0** |

90일 창은 MQL 파싱 오류(retention 초과)로 조회되지 않아 **60일이 확인 가능한 최대 구간**이다. 숨기지 않고 기록한다.

### Cloud Run 요청량과의 대응 (30d)

`o4o-core-api` 269,665 · `neture-web` 249,037 · `k-cosmetics-web` 35,069 · `kpa-society-web` 33,721 · `glycopharm-web` 26,298 · `glucoseview-web` 18,351 · `o4o-admin-dashboard` 17,409 · `pharmacy-hub-web` 4,429 — **LB backend 집계와 서비스별로 정합**한다 (Cloud Run 쪽이 소폭 큰 것은 run.app 직접 호출·헬스체크 포함).

LB 를 통하지 않는 Cloud Run: `kpa-branch-web` 27 · `o4o-main-site` 11 · `o4o-admin-dashboard-dev` 3 · `account-center-web` 1 — 전부 run.app 직접 접근 수준이다.

### 스캐너 / bare-IP 트래픽 구분

`backend-o4o-core-api` 의 4xx 118,641 건은 API 서버가 인증 실패·미존재 경로에 반환하는 정상 4xx 가 대부분이며, `backend-neture-web-http` 4xx 7,106 건에는 default fallthrough 로 들어오는 bare-IP·미등록 host 스캐너 요청이 섞여 있다. **이 둘은 어느 쪽이든 backend 존치 근거가 이미 2xx 수십만 건으로 충족**되므로 판정에 영향을 주지 않는다. traffic 0 인 `backend-account-center-web` 에는 스캐너 트래픽조차 도달하지 않았다 (DNS 부재 때문).

---

## 5. `backend-account-center-web` — UNKNOWN(HOLD) 판정 근거

**삭제하지 않았다.** §5 의 `ORPHAN_CONFIRMED` 조건을 충족하지 못한다.

| ORPHAN_CONFIRMED 조건 | 실측 | 충족 |
|---|---|:---:|
| URL map 참조 0 | **1** (`path-matcher-1`) | ❌ |
| host/path rule 참조 0 | **1** (`account.neture.co.kr`) | ❌ |
| default backend 참조 0 | 0 | ✅ |
| NEG 소비처 없음 또는 전용 orphan | `neg-account-center-web` 전용 1:1 | ✅ |
| 최근 의미 있는 traffic 0 | 60일 0건 | ✅ |
| 저장소 배포 계약 참조 0 | backend 이름 참조 0 | ✅ |
| UNKNOWN 0 | ❌ (아래) | ❌ |

### HOLD 사유 (§13 중지 조건 해당)

1. **URL map host rule 이 실재한다.** 삭제하면 `account.neture.co.kr` 라우트가 깨진다. GCLB 도 참조 중인 backend 삭제를 거부한다.
2. **DNS 가 존재하지 않는다.** `account.neture.co.kr` 는 LB IP 로 해석되지 않고 ISP 기본 응답(`168.126.63.1`)만 돌아온다. traffic 0 의 원인은 "죽은 backend" 가 아니라 **"아직 DNS 가 연결되지 않은 준비된 라우트"** 다.
3. **Cloud Run ownership 이 불일치한다.** `neg-account-center-web` → Cloud Run **`o4o-main-site`** 를 가리킨다(이름은 account-center-web). 별도로 Cloud Run `account-center-web` 서비스가 존재하나(2026-03-13 생성, revision `00001`, 30d 요청 1건) **LB 에 연결되어 있지 않다.**
4. **`o4o-main-site` 는 살아있는 배포 계약을 갖는다** — `.github/workflows/deploy-main-site.yml` (`SERVICE_NAME: o4o-main-site`). 반면 `account-center-web` 을 배포하는 workflow 는 **0건**이다.

→ 이름·트래픽만으로 orphan 판정하지 않는다는 §2 원칙과 §13 "Cloud Run 서비스와 ownership 불명확" 중지 조건에 따라 **UNKNOWN 유지 · 삭제 보류**. 별도 WO 후보로 §9 에 기록한다.

---

## 6. `siteguide.co.kr` 특별 확인 (§7)

| 확인 항목 | 실측 |
|---|---|
| 현재 DNS | `siteguide.co.kr` · `www.siteguide.co.kr` → **136.110.132.35** (GCLB) / `api.siteguide.co.kr` → 미해석 |
| GCLB 도달 여부 | **도달함** — HTTP 301 → HTTPS 200 |
| host rule 존재 여부 | **없음** (URL map `o4o-global-lb` 의 hostRules 11그룹 어디에도 siteguide 없음) |
| fallthrough 대상 | URL map `defaultService` = **`backend-neture-web-http`** → `neture-web` |
| 실제 응답 | HTML `<title>` = **"Neture — O4O 유통·협업 플랫폼"** — SiteGuide 가 아니라 **Neture 사이트가 그대로 서빙**됨 |
| TLS | Certificate Manager `cm-cert-siteguide` (SAN: siteguide.co.kr, www) 로 정상 handshake |
| Cloud Run 서비스 존재 여부 | **없음** — siteguide 전용 Cloud Run 서비스 0건 |
| 과거/legacy 흔적 | `docs/archive/checks/CHECK-O4O-SITEGUIDE-RESIDUAL-AUDIT-V1.md` · `CHECK-O4O-GLYCOPHARM-DOMAIN-MAPPING-SITEGUIDE-REMOVAL-V1.md` |
| 실제 운영 서비스인지 | **부분적으로 살아있다** — API 서버에 `siteguide` 독립 스키마(`siteguide_businesses` · `siteguide_api_keys` · `siteguide_usage_summaries` · `siteguide_execution_logs`)와 문의 채널(`platformInquiryController.ts`)이 존재. 즉 백엔드 도메인은 실재하나 **웹 프론트가 없어 도메인이 Neture 로 흘러든다** |

**판정: DEFAULT_FALLTHROUGH (도메인 계약 미정의).** backend service 자체의 orphan 문제는 아니다 — `backend-neture-web-http` 는 어차피 ACTIVE 다.

WO §7 지시대로 **도메인 계약을 임의 변경하지 않았다.** DNS·인증서·host rule 어느 것도 손대지 않았다. 별도 WO 후보로 §9 에 기록한다.

---

## 7. 삭제 실행 (§8)

`ORPHAN_CONFIRMED` **0건** → **삭제 실행 없음.**

| 항목 | 값 |
|---|:--:|
| 삭제 대상 | 0건 |
| backend service 총수 (전/후) | 9 / **9** |
| URL map 참조 무결성 | 변경 없음 — pathMatcher 11개 전부 유효한 backend 를 가리킴, dangling 0 |
| 신규 NEG orphan | 0건 |

GCP write 작업은 이번 WO 에서 **1건도 수행하지 않았다** (조회 전용).

---

## 8. NEG 판정 (§9)

serverless NEG 9건, 전부 `asia-northeast3` · `SERVERLESS`. backend ↔ NEG **1:1**, 공유 NEG 0건.

| NEG | 소비 backend | Cloud Run | **판정** |
|---|---|---|:--|
| `neg-neture-web` | `backend-neture-web-http` | `neture-web` | **ACTIVE** |
| `neg-o4o-core-api` | `backend-o4o-core-api` | `o4o-core-api` | **ACTIVE** |
| `neg-kpa-society-web` | `backend-kpa-society-web` | `kpa-society-web` | **ACTIVE** |
| `neg-k-cosmetics-web` | `backend-k-cosmetics-web` | `k-cosmetics-web` | **ACTIVE** |
| `neg-glycopharm-web` | `backend-glycopharm-web` | `glycopharm-web` | **ACTIVE** |
| `neg-glucoseview-web` | `backend-glucoseview-web-advanced` | `glucoseview-web` | **ACTIVE** |
| `neg-o4o-admin-dashboard` | `o4o-admin-dashboard-backend-http` | `o4o-admin-dashboard` | **ACTIVE** |
| `neg-pharmacy-hub-web` | `backend-pharmacy-hub-web` | `pharmacy-hub-web` | **ACTIVE** |
| `neg-account-center-web` | `backend-account-center-web` | `o4o-main-site` | **UNKNOWN — HOLD** (backend 판정에 종속) |

**NEG 삭제 0건.** §9 의 "명백한 1:1 dead pair" 예외는 적용하지 않았다 — `backend-account-center-web` 이 dead 로 확정되지 않았고, 그 NEG 가 가리키는 `o4o-main-site` 는 CI 배포 계약이 살아있기 때문이다.

`size 0` 표기는 serverless NEG 의 정상 표시이며 endpoint 부재를 뜻하지 않는다 (판정 근거로 쓰지 않았다).

---

## 9. 후속 orphan / 정리 후보 (기록만)

| # | 후보 | 근거 | 필요 조치 |
|:--:|---|---|---|
| 1 | `account.neture.co.kr` 라우트 계약 확정 | host rule 존재 · DNS 부재 · traffic 0 · NEG 가 이름과 다른 `o4o-main-site` 지시 · Cloud Run `account-center-web` 은 LB 미연결 + CI 배포 workflow 0 | **별도 WO** — ① DNS 연결 후 정식 운영 ② 라우트 폐기(host rule → backend → NEG 순 삭제) ③ NEG target 을 `account-center-web` 으로 교정, 중 택1 |
| 2 | `siteguide.co.kr` 도메인 계약 확정 | DNS 는 LB 로 오는데 host rule 없음 → Neture 사이트가 응답. 백엔드 `siteguide` 스키마는 실재 | **별도 WO** — 전용 host rule 신설 / 도메인 회수 / 명시적 리다이렉트 중 택1 |
| 3 | `cert-final-neture-v3` detach 후 삭제 | 발급 실패·서빙 이력 0, 실 TLS 는 `o4o-main-cert-map` | 직전 WO 에서 이월 (active HTTPS proxy 수정 동반) |
| 4 | LB access logging 정책 통일 | 9건 중 `backend-kpa-society-web` · `o4o-admin-dashboard-backend-http` 2건만 enabled | 관측성 정책 WO |
| 5 | Cloud Run LB 미연결 서비스 정리 검토 | `kpa-branch-web` 27 · `o4o-admin-dashboard-dev` 3 · `account-center-web` 1 (30d) | Cloud Run 정리 WO (LB 범위 밖) |

(이전 WO 이월 후보 — maxScale 10 × pool max 20 > `max_connections` 100 · 부팅 시 `runMigrations()` 제거 · API 이미지 슬림화 — 유지)

---

## 10. Production 검증 (§10)

WO §10 은 "**삭제가 발생한 경우** 반드시 수행" 이다. 이번 WO 는 **삭제 0건 · GCP write 0건**이므로 변경 유발 요인이 없으나, 상태 기록을 위해 축약 확인을 수행했다.

| 항목 | 결과 |
|---|---|
| Cloud Run Ready | **12/12 True** |
| `GET /health` | 200 — `status: alive`, production, v0.5.0 |
| `GET /health/database` | 200 — `status: healthy`, pingMs 4, longRunningQueries 0 |
| 주요 도메인 HTTP/HTTPS/redirect/TLS | 직전 WO(동일 세션, 약 30분 전) 에서 14개 도메인 전수 측정 — 전부 301→200 정상. 이번 WO 는 LB 구성을 **변경하지 않았으므로** 재측정 대상 변화 없음 |
| LB 5xx | 30일 집계상 `backend-o4o-core-api` 1,296 · `backend-neture-web-http` 8 — **기존 baseline 수준, 이번 작업으로 인한 증가 없음**(작업 중 write 0) |
| Cloud Run `severity>=ERROR` 신규 | 0건 |

> 로그인 smoke 와 서비스 화면 확인은 직전 WO 에서 동일 세션·동일 LB 구성으로 통과했고(로그인 200 `success: true`), 이번 WO 가 아무 리소스도 변경하지 않았으므로 재실행하지 않았다. **건너뛴 사실을 명시한다.**

---

## 11. 비용 관점 (§11)

| 항목 | 판정 |
|---|---|
| backend service 직접 과금 여부 | **과금 대상 아님.** GCLB 과금은 forwarding rule 수 + 처리 데이터량 + (사용 시) Cloud Armor 정책 기준이며, backend service 객체 자체는 개별 과금 항목이 아니다 |
| serverless NEG 직접 과금 여부 | **과금 대상 아님** |
| 이번 WO 의 삭제 | 0건 |
| **효과 분류** | **`NO_COST_EFFECT`** |

삭제가 0건이므로 절감액도 0이다. 향후 §9 의 후보 1·2 를 정리하더라도 backend/NEG 는 무료 리소스이므로 효과는 `INDIRECT_COMPLEXITY_REDUCTION` 에 그친다. **비용 절감으로 과장하지 않는다.**

---

## 12. 저장소 조사 (§12)

추적 파일 전체(`git ls-files`) 대상 검색.

| 검색 대상 | 결과 |
|---|---|
| backend service 이름 9종 | 코드/CI 참조 **0건**. `docs/checks/**` · `docs/archive/**` 기록물에만 등장 |
| NEG 이름 9종 | 코드/CI 참조 **0건** |
| URL map `o4o-global-lb` | `apps/api-server/src/utils/trusted-client-ip.ts:12` — **주석 1건**(경로 설명). 동작 코드 아님, 현재 구조와 일치 → 수정 불필요 |
| gcloud LB script / infra config | **0건** — 저장소에 LB 를 생성·수정하는 스크립트가 없다 (LB 는 수동 관리) |
| CI/CD 배포 계약 | `.github/workflows/**` 는 Cloud Run 서비스명만 다루고 LB 리소스를 조작하지 않음. `deploy-main-site.yml` = `o4o-main-site` 배포 계약 확인 |
| `siteguide` | API 서버 실코드(독립 스키마 migration · `platformInquiryController.ts`)에 존재 — **dead 아님** |
| `account.neture.co.kr` | 저장소 참조 **0건** |

**현재 production 배포 계약과 충돌하는 dead config: 0건.** 역사 기록 문서는 수정하지 않았다. 저장소 코드 변경 0건, 산출물은 본 CHECK 문서 1개뿐이다.

---

## 13. 중지 조건 대조 (§13)

| 중지 조건 | 발생 | 조치 |
|---|:--:|---|
| production host/path 참조 발견 | **예** (`backend-account-center-web`) | 삭제 보류 |
| default backend 사용 여부 불명확 | 아니오 (`backend-neture-web-http` 로 확정) | — |
| traffic 의미 불명확 | 아니오 | — |
| Cloud Run 서비스와 ownership 불명확 | **예** (`neg-account-center-web` → `o4o-main-site`) | 삭제 보류 |
| shared NEG 발견 | 아니오 (전부 1:1) | — |
| UNKNOWN 존재 | **예** (1건) | 삭제 보류 |
| 삭제 후 5xx/TLS/redirect 이상 | 해당 없음 (삭제 0건) | — |

→ 중지 조건 3개가 발동했고, **해당 리소스만 보류**한 채 나머지 8건의 Census 는 완결했다.

---

## 14. 완료 기준 대조 (§15)

| 완료 기준 | 결과 |
|---|:--:|
| backend service 미조사 0 | ✅ 9/9 조사 |
| UNKNOWN 0 또는 명확한 HOLD 사유 | ✅ UNKNOWN 1건 — §5 에 4개 근거로 HOLD 명시 |
| ORPHAN_CONFIRMED 만 삭제 | ✅ ORPHAN_CONFIRMED 0건 → 삭제 0건 |
| ACTIVE 손실 0 | ✅ |
| production 정상 | ✅ Cloud Run 12/12 · `/health` 200 · DB healthy |
| 신규 ERROR 0 | ✅ |

---

*작성: 2026-08-19 · WO-O4O-GCLB-BACKEND-SERVICE-USAGE-CENSUS-AND-ORPHAN-CLEANUP-V1*
