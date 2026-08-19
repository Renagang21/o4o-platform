# WO-O4O-GCLB-REMOVE-UNUSED-FORWARDING-RULES-V1 — CHECK

- **작업일**: 2026-08-19 (삭제 실행 03:30:16 / 03:30:34 UTC)
- **프로젝트**: `netureyoutube` (display name `neture-services`)
- **선행 문서**: [WO-O4O-GCLB-FORWARDING-RULE-STATIC-IP-CENSUS-V1-CHECK.md](WO-O4O-GCLB-FORWARDING-RULE-STATIC-IP-CENSUS-V1-CHECK.md)
- **성격**: GCP production 리소스 **삭제 실행** + 삭제 후 정상성 검증. 저장소 코드 변경 0.

---

## 1. 대상 확정 (§3)

삭제 대상은 선행 Census 의 `REMOVE_CANDIDATE` **2건뿐**이다.

| 항목 | `o4o-global-lb-forwarding-rule` | `o4o-global-lb-forwarding-rule-3` |
|---|---|---|
| IP | `34.117.153.136` (**ephemeral**) | `34.54.126.46` (**ephemeral**) |
| protocol / port | TCP / **80-80** | TCP / **80-80** |
| scheme | EXTERNAL_MANAGED, PREMIUM | EXTERNAL_MANAGED, PREMIUM |
| target proxy | `o4o-global-lb-target-proxy` (HTTP) | `o4o-global-lb-target-proxy-3` (HTTP) |
| URL map | `o4o-global-lb` (**KEEP 규칙과 공유**) | `o4o-global-lb` (**KEEP 규칙과 공유**) |
| backend | `backend-neture-web-http` (default backend) | `backend-neture-web-http` (default backend) |
| 생성 시점 | 2025-12-31T23:16:01-08:00 | 2026-03-12T20:14:05-07:00 |
| DNS 참조 | **0** | **0** |

> **Census 집계 대조**: WO §3 의 `KEEP = 3` 은 Census 의 KEEP 표 3행(= forwarding rule **2건** + static IP **1건**)을 센 값이다.
> forwarding rule 기준 KEEP 은 **2건**이다. 따라서 삭제 후 예상 rule 총수는 `4 - 2 = 2` 이고, 실제 결과도 2 다 (§4).

## 2. 삭제 직전 재검증 (§4)

### 2-1. DNS — 참조 0

URL map `o4o-global-lb` 의 host rule 19개 + `siteguide.co.kr` / `www.siteguide.co.kr` / `glucoseview.com` 을
**외부 resolver 2곳(8.8.8.8 · 1.1.1.1)** 에서 각각 조회했다.

| 결과 | 도메인 |
|---|---|
| → `136.110.132.35` (**KEEP static IP**) | `neture.co.kr` · `www.neture.co.kr` · `admin.neture.co.kr` · `api.neture.co.kr` · `kpa-society.co.kr` · `www.` · `api.` · `glycopharm.co.kr` · `www.` · `api.` · `k-cosmetics.site` · `www.` · `api.` · `glucoseview.co.kr` · `www.` · `api.` · `pharmacyhub.co.kr` · `www.` · `siteguide.co.kr` · `www.` — **20건** |
| → Google ghs (`74.125.203.121` / `142.251.24.121`) | `account.neture.co.kr` (Census 기록과 동일, LB 미사용) |
| → 외부 파킹 (`15.197.148.33` / `3.33.130.190`) | `glucoseview.com` (O4O LB 아님) |
| → `34.117.153.136` 또는 `34.54.126.46` | **0건** |

- 프로젝트에 **Cloud DNS managed zone 0개** (DNS 는 외부 등록기관 관리) → 프로젝트 내부 record 참조 가능성 없음
- 두 후보 IP 의 **PTR 없음**, 주요 도메인 **AAAA 없음**

### 2-2. GCLB 소비처

| 확인 | 결과 |
|---|---|
| target proxy | 각 후보 rule 이 **유일 소비자**. 다른 rule 이 같은 proxy 를 쓰지 않음 |
| URL map | 두 proxy 모두 `o4o-global-lb` 를 가리키지만, 이 URL map 은 **KEEP 규칙 `o4o-global-lb-forwarding-rule-2`(:443) 가 계속 사용** → 삭제해도 orphan 아님 |
| backend / NEG | 후보 전용 backend·NEG 없음. 전부 공유 |
| certificate | 후보는 **HTTP proxy** 라 SSL certificate 연결 자체가 없음 |

### 2-3. HTTP redirect 역할 아님 (§13 오판 방지)

| rule | URL map | 성격 |
|---|---|---|
| `neture-https-frontend-forwarding-rule` (:80, `136.110.132.35`) | `neture-https-frontend-redirect` (`httpsRedirect: true`, 301) | **production 의 HTTP→HTTPS redirect 담당 = KEEP** |
| 후보 2건 (:80) | `o4o-global-lb` (application) | redirect 아님. **평문 HTTP 로 앱을 그대로 서빙** |

→ 후보 삭제로 redirect 기능이 손실되지 않는다. 오히려 평문 노출 경로가 사라진다.

### 2-4. Traffic — 의미 있는 사용 0

최근 **7일** `loadbalancing.googleapis.com/https/request_count` 를
`forwarding_rule_name × backend_target_name × matched_url_path_rule × response_code_class` 로 분해했다.

| rule | 도달 backend | matched_url_path_rule |
|---|---|---|
| `o4o-global-lb-forwarding-rule-2` (KEEP) | neture-web · o4o-core-api · k-cosmetics-web · kpa-society-web · glycopharm-web · glucoseview-web · pharmacy-hub-web · admin-dashboard — **8종** | UNMATCHED |
| `o4o-global-lb-forwarding-rule` (후보) | **`backend-neture-web-http` 단 1종** (default backend) | UNMATCHED |
| `o4o-global-lb-forwarding-rule-3` (후보) | **`backend-neture-web-http` 단 1종** (default backend) | UNMATCHED |

후보 2건은 **host rule 이 한 번도 매칭되지 않았다**. 즉 어떤 production 도메인 Host 도 이 경로로 들어온 적이 없다.

Cloud Run `neture-web` 요청 로그(7일) 실측 — 전부 **bare IP Host** 이며 스캐너다.

| IP | 표본 Host | User-Agent / 경로 |
|---|---|---|
| `34.117.153.136` | `http://34.117.153.136/…` 100% | `FlowIQLabsBot`, `forestengine.net`, `/geoserver/web/`, `/SDK/webLanguage` — 취약점 스캔 |
| `34.54.126.46` | `http://34.54.126.46/…` 100% | `Infrawatch/1.0`, `/mcp` · `/api/mcp` · `/sse` — MCP 엔드포인트 스캔 |

도메인 Host **0건**. 30일 request_count(후보 약 72.6k / 74.3k)는 전량 이 스캐너 트래픽이다.

### 2-5. 저장소

`34.117.153.136` / `34.54.126.46` / `o4o-global-lb-forwarding-rule` / `o4o-global-lb-target-proxy` 전체 검색:
**배포 스크립트·infra 설정·코드 참조 0건.** 매칭은 전부 `docs/checks/**` 기록물이며, 그중 실사용 언급은
KEEP 규칙 `-2` 에 대한 것이다.

## 3. 삭제 가능 조건 대조 (§5)

| 조건 | `…-rule` | `…-rule-3` |
|---|---|---|
| DNS 참조 0 | ✅ | ✅ |
| active proxy 소비 0 (전용 proxy, 공유 없음) | ✅ | ✅ |
| active URL map 소비 0 (공유 map → orphan 아님) | ✅ | ✅ |
| backend/NEG 전용 소비 0 | ✅ | ✅ |
| 최근 traffic 의미 있는 사용 0 | ✅ | ✅ |
| 다른 도메인 공유 0 | ✅ | ✅ |
| UNKNOWN 0 | ✅ | ✅ |

→ **2건 모두 삭제 실행. HOLD 0건.**

## 4. 삭제 실행 결과 (§6) 및 재 Census (§7)

```
2026-08-19T03:30:16Z  delete o4o-global-lb-forwarding-rule    → DONE
2026-08-19T03:30:34Z  delete o4o-global-lb-forwarding-rule-3  → DONE
```

| 리소스 | 삭제 전 | 삭제 후 | 판정 |
|---|---:|---:|---|
| forwarding rule | 4 | **2** | 예상(`4-2`)과 일치 |
| static IP (address) | 1 | **1** (`neture-static-ip`, `IN_USE`) | 변동 없음 |
| target HTTP proxy | 3 | **3** | 의도적 미삭제 → 2건 orphan 화 |
| target HTTPS proxy | 1 | **1** | 변동 없음 |
| URL map | 2 | **2** | 변동 없음 |
| backend service | 9 | **9** | 변동 없음 |
| NEG | 9 | **9** | 변동 없음 |
| SSL certificate | 10 | **10** | 변동 없음 |

잔존 forwarding rule (KEEP 2건):

| name | IP | port | target |
|---|---|---|---|
| `neture-https-frontend-forwarding-rule` | `136.110.132.35` | 80 | `neture-https-frontend-target-proxy` (redirect) |
| `o4o-global-lb-forwarding-rule-2` | `136.110.132.35` | 443 | `o4o-global-lb-target-proxy-2` |

**UNKNOWN 0.** §6 대로 static IP · target proxy · URL map · backend · certificate 는 하나도 삭제하지 않았다.

## 5. Static IP 후속 판정 (§10)

| IP | 분류 | 비고 |
|---|---|---|
| `136.110.132.35` (`neture-static-ip`) | **ACTIVE · SHARED** | KEEP 규칙 2건이 공유. production 20 도메인 전량의 진입점 |
| `34.117.153.136` | **소멸** | 예약 IP 가 아닌 ephemeral 이라 rule 삭제와 함께 회수됨 (**동일 IP 재확보 불가**) |
| `34.54.126.46` | **소멸** | 동일 |

→ **새로 생긴 `RESERVED_UNUSED` IP 0건.** 프로젝트의 예약 IP 는 여전히 `neture-static-ip` 1개뿐이며 사용 중이다.
static IP 관련 후속 삭제 후보 **없음**.

## 6. Legacy SSL certificate 참조 상태 (§11)

삭제된 2건은 HTTP proxy 라 certificate 를 참조하지 않았으므로 **참조 상태 변화 없음**.

| 항목 | 상태 |
|---|---|
| compute SSL certificate 총수 | 10 (전부 `MANAGED` · `PROVISIONING_FAILED_PERMANENTLY`) |
| proxy 에 붙어 있는 것 | `cert-final-neture-v3` 1건 (`o4o-global-lb-target-proxy-2`) |
| 참조 0 → 후속 삭제 후보 | **9건** — `cert-admin` · `cert-final-neture` · `cert-final-neture-v2` · `cert-glucoseview` · `cert-glycopharm` · `cert-kcosmetics` · `cert-kpa` · `cert-neture-web` · `cert-siteguide-v1` |
| UNKNOWN / HOLD | 0 |

실제 TLS 는 Certificate Manager 의 `o4o-main-cert-map` 이 담당한다(legacy `sslCertificates` 보다 우선).
**이번 WO 에서 SSL cert 삭제는 하지 않았다.** 후속 WO 후보로 남긴다.

## 7. Production 도메인 검증 (§8)

삭제 **전/후 동일 항목**을 측정했고 **전 항목 동일**하다.

| 도메인 | :80 | :443 최종 | 도달 IP | TLS 검증 |
|---|---|---|---|---|
| `neture.co.kr` / `www.` | 301 → https | **200** | `136.110.132.35` | OK(0) |
| `kpa-society.co.kr` / `www.` | 301 → https | **200** | `136.110.132.35` | OK(0) |
| `glycopharm.co.kr` / `www.` | 301 → https | **200** | `136.110.132.35` | OK(0) |
| `k-cosmetics.site` / `www.` | 301 → https | **200** | `136.110.132.35` | OK(0) |
| `glucoseview.co.kr` / `www.` | 301 → https | **200** | `136.110.132.35` | OK(0) |
| `pharmacyhub.co.kr` / `www.` | 301 → https | **200** | `136.110.132.35` | OK(0) |
| `admin.neture.co.kr` | 301 → https | **200** | `136.110.132.35` | OK(0) |
| `api.neture.co.kr` | 301 → https | **404** (루트 라우트 없음 — 삭제 전과 동일) | `136.110.132.35` | OK(0) |
| `siteguide.co.kr` | 301 → https | **200** (default backend fallthrough — 기존과 동일) | `136.110.132.35` | OK(0) |

- `glucoseview.com` 은 O4O LB 소속이 아니다(외부 파킹). WO §8 의 목록 중 실제 운영 도메인은 `glucoseview.co.kr` 다.
- 삭제된 IP 직접 접근: `http://34.117.153.136/` · `http://34.54.126.46/` → **503** (LB 미연결). 의도한 결과다.

## 8. API / Cloud Run 검증 (§9)

| 항목 | 결과 |
|---|---|
| Cloud Run 12개 서비스 Ready | ✅ `account-center-web` · `glucoseview-web` · `glycopharm-web` · `k-cosmetics-web` · `kpa-branch-web` · `kpa-society-web` · `neture-web` · `o4o-admin-dashboard` · `o4o-admin-dashboard-dev` · `o4o-core-api` · `o4o-main-site` · `pharmacy-hub-web` — 전부 `True` |
| `o4o-core-api` Ready | ✅ |
| `GET /health` | **200** |
| `GET /health/database` | **healthy** (PostgreSQL 15.17, pingMs 2, activeConnections 10, longRunningQueries 0) |
| 로그인 smoke | **200 · `success: true`** (`POST /api/v1/auth/login`, `serviceKey: neture`, 계정은 `docs/local/TEST-ACCOUNTS.local.md` SSOT) |
| TLS / redirect error | 0 |
| LB connection 관련 신규 5xx | **0** — LB 로그의 503 2건은 §7 의 **본 검증용 curl 이 삭제된 IP 를 친 것**(`retriable_error`) |

### 신규 ERROR 판정 — **삭제로 인한 신규 ERROR 0**

삭제 후 25분 창에서 Cloud Run `severity>=ERROR` 2건이 잡혔고 둘 다 `POST /api/v1/cosmetics/forum/posts` 500 이다.

```
03:24:23Z  /api/v1/cosmetics/forum/posts 500   ← 삭제(03:30:16) 이전
03:31:53Z  /api/v1/cosmetics/forum/posts 500   ← 삭제 이후
```

**같은 엔드포인트가 삭제 전에도 동일하게 실패**했으므로 이번 삭제와 무관한 기존 애플리케이션 결함이다.
24시간 창 전체에서도 이 엔드포인트의 500 은 위 2건뿐이며, 5xx 는 `2026-08-18T11` 시간대 44건 등
삭제 이전부터 산발적으로 존재했다. 이번 범위 밖이므로 **기록만 하고 수정하지 않는다** (별도 WO 후보).

## 9. 저장소 변경 (§12)

**코드 변경 0건.** forwarding rule 삭제를 반영해야 할 배포 스크립트·infra 설정 참조가 존재하지 않는다(§2-5).
본 CHECK 문서만 추가한다.

발견된 dead infra reference: 없음. (기존 CHECK 기록물의 IP·rule 언급은 과거 시점 사실 기록이므로 손대지 않는다.)

## 10. 완료 기준 대조 (§15)

| 기준 | 결과 |
|---|---|
| REMOVE_CANDIDATE 2건 중 안전 조건 충족 대상 삭제 완료 | ✅ 2/2 삭제 (HOLD 0) |
| ACTIVE 리소스 손실 0 | ✅ static IP · proxy · URL map · backend · NEG · cert 전부 보존 |
| UNKNOWN 0 | ✅ |
| production 도메인 정상 | ✅ 15 도메인 삭제 전/후 동일 |
| HTTP→HTTPS 정상 | ✅ 전 도메인 301 |
| Cloud Run 정상 | ✅ 12/12 Ready |
| API/DB 정상 | ✅ `/health` 200 · `/health/database` healthy · 로그인 200 |
| 신규 ERROR 0 | ✅ (관측된 500 2건은 삭제 전부터 존재하던 기존 결함) |

## 11. 후속 WO 후보

| # | 대상 | 근거 |
|---|---|---|
| 1 | orphan target HTTP proxy 2건 (`o4o-global-lb-target-proxy` · `o4o-global-lb-target-proxy-3`) | forwarding rule 삭제로 소비처 0. §6 에 따라 이번 WO 미포함 |
| 2 | legacy SSL certificate 9건 | 전부 `PROVISIONING_FAILED_PERMANENTLY` · proxy 참조 0 |
| 3 | `POST /api/v1/cosmetics/forum/posts` 500 | 기존 애플리케이션 결함 (본 WO 범위 밖) |
| 4 | `siteguide.co.kr` host rule 부재 (default backend fallthrough) | Census §9 관측, 정책 판단 필요 |
