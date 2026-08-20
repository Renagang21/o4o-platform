# WO-O4O-ACCOUNT-NETURE-DOMAIN-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1 — CHECK

> **작업 기록 (CHECK) — 조사 + 실제 정리(GCP write) 수행.**
>
> `account.neture.co.kr` 관련 인프라·애플리케이션 계약을 전수조사하고, 이름과 실제 연결이 어긋난 Account Center 구조를 하나의 운영 계약으로 닫은 기록.

- **작성일:** 2026-08-20
- **분류:** Check (조사 + 정리 실행)
- **대상 프로젝트:** `netureyoutube` (neture-services) / `asia-northeast3`
- **최종 판정:** **`ACCOUNT_CENTER_DEAD`** (배포 인프라 기준) — 단, repo `services/web-account` 는 **의도적 보류(미배포 유지)**
- **삭제:** 4건 · **UNKNOWN:** 0 · **HOLD:** 1 (외부 등록기관 DNS)

---

## 1. 요약 판정표

| 항목 | 실측 결과 | 판정 |
|---|---|:---:|
| `account.neture.co.kr` DNS | CNAME → `ghs.googlehosted.com` (**존재함**) | **DANGLING** |
| 해당 CNAME 의 실제 응답 | HTTP 404 (`Server: ghs`) / HTTPS handshake 실패 | 미서빙 |
| Certificate Manager map entry | `account.neture.co.kr` 항목 **없음** | TLS 불가 |
| GCLB URL map host rule | `account.neture.co.kr` → `path-matcher-1` 존재 | **도달 불가 경로** |
| `backend-account-center-web` | LB 요청 60d **시계열 0건** | ORPHAN |
| `neg-account-center-web` | target = **`o4o-main-site`** (이름 불일치) | 오배선 |
| Cloud Run `account-center-web` | image = **`gcr.io/cloudrun/hello`**, rev 00001, 60d 1 request | 플레이스홀더 |
| CI/CD workflow | account 전용 workflow **0건** | 소비처 0 |
| 저장소 runtime 코드 `account.neture` | `apps`/`services`/`packages`/`scripts` **0건** | 소비처 0 |
| API CORS allowlist | `account.neture.co.kr` **미포함** | 소비처 0 |
| `platform_services` / service-catalog | account 서비스 **없음** | 소비처 0 |
| 프로덕션 DB 전수 스캔 (`account.neture`) | 전 스키마 text/varchar/json(b) 컬럼 **0 hit** | 소비처 0 |
| repo `services/web-account` | 존재 + Dockerfile 有, 배포 workflow 無 | **의도적 보류(유지)** |

---

## 2. `account.neture.co.kr` 실제 DNS 상태

선행 Census(`WO-O4O-GCLB-BACKEND-SERVICE-USAGE-CENSUS-AND-ORPHAN-CLEANUP-V1`)의 **"DNS 없음" 기록은 오탐**이었다.
당시 사용한 리졸버가 KT ISP 기본 응답(`168.126.63.1`)을 돌려주어 NXDOMAIN 으로 보였다.

퍼블릭 리졸버(8.8.8.8) 기준 재측정:

```text
account.neture.co.kr  CNAME  ghs.googlehosted.com
ghs.googlehosted.com  A      142.250.198.211
                      AAAA   2404:6800:4005:80a::2013
```

- `ghs.googlehosted.com` = Google 의 **custom-domain 호스트**(Firebase Hosting / App Engine / Cloud Run 도메인 매핑 계열).
- **GCLB IP(`136.110.132.35`) 가 아니다.** → account 트래픽은 애초에 LB 에 도달하지 않는다.

실제 응답:

| 프로토콜 | 결과 |
|---|---|
| `http://account.neture.co.kr/` | **404** (`Server: ghs`, 매핑 미등록 시 Google 기본 응답) |
| `https://account.neture.co.kr/` | **TLS handshake 실패** (`no peer certificate available`) |

매핑 실체 확인:

| 확인 대상 | 결과 |
|---|---|
| Cloud Run domain mappings (`asia-northeast3`/`us-central1`/`asia-northeast1`/`europe-west1`) | **0건** |
| App Engine application | **미존재** (`Apps instance [netureyoutube] not found`) |
| Cloud DNS managed zones | **0건** (`neture.co.kr` NS = `ns.gabia.co.kr` 계열 — 외부 등록기관) |

→ **판정: 과거 Google Hosting 계열 custom domain 잔재의 dangling CNAME.**
Firebase Hosting 정리(`WO-O4O-FIREBASE-RESIDUAL-CLEANUP`) 이후 DNS 레코드만 남은 상태와 정합한다.

---

## 3. GCLB 전체 연결 경로 (변경 전)

```text
account.neture.co.kr
  └─ DNS ─→ ghs.googlehosted.com ─→ (매핑 없음) 404 / TLS 실패      ← 실제 트래픽은 여기서 끝
        ✗ GCLB 에 도달하지 않음

GCLB 내부에는 별개로 아래 경로가 "존재만" 하고 있었다:
  URL map o4o-global-lb
    hostRule  [account.neture.co.kr] → path-matcher-1
      → backend-account-center-web (enableCDN=true, logConfig.enable=false)
        → neg-account-center-web (SERVERLESS, size 0)
          → Cloud Run  o4o-main-site        ← 이름은 account-center, 실제 target 은 main-site
```

이 경로의 도달 불가 사유는 **두 겹**이다.

1. DNS 가 GCLB IP 를 가리키지 않는다.
2. 설령 가리키더라도 Certificate Manager map `o4o-main-cert-map` 에 `account.neture.co.kr` **entry 가 없어** TLS 종료가 불가능하다 (현재 20개 entry 중 account 없음).

즉 이 host rule 은 **한 번도 서빙된 적이 없다.**

---

## 4. Traffic 실측

### 4-1. GCLB (`loadbalancing.googleapis.com/https/request_count`, 60d)

```text
filter resource.backend_target_name == 'backend-account-center-web'
→ timeSeriesData: 0 series
```

시계열 자체가 존재하지 않는다 — 60일간 **단 1건의 요청도 도달하지 않았다.**

### 4-2. Cloud Run (`run.googleapis.com/request_count`, 60d)

| 서비스 | 60d 요청 수 |
|---|---:|
| `account-center-web` | **1** |
| `o4o-main-site` | **15** |

두 서비스 모두 사실상 무트래픽이다. `o4o-main-site` 의 15건은 LB 를 통하지 않은 `*.run.app` 직접 접근으로, 인터넷 스캐너/수동 확인과 구분되지 않는 수준이다.

---

## 5. Frontend 역할 비교

### 5-1. Cloud Run `account-center-web`

| 항목 | 값 |
|---|---|
| image | **`gcr.io/cloudrun/hello`** (Google 제공 hello-world 플레이스홀더) |
| revision | `account-center-web-00001-bpc` (**단 1개, 재배포 이력 없음**) |
| 생성 | 2026-03-13, `client-name=cloud-console` (콘솔 수동 생성) |
| lastModifier | 개인 계정 (github-actions SA 아님) |
| minScale | 미설정 (= 0) |
| LB 연결 | **없음** (어떤 NEG 도 이 서비스를 가리키지 않음) |

→ **애플리케이션 코드가 전혀 배포된 적 없는 자리표시 서비스.**

### 5-2. Cloud Run `o4o-main-site`

| 항목 | 값 |
|---|---|
| image | `asia-northeast3-docker.pkg.dev/.../main-site:bd04204b0…` (자체 빌드) |
| 배포 | `.github/workflows/deploy-main-site.yml` (SA `github-actions@…`) |
| 소스 | `apps/main-site` |
| route tree | `/login`, `/`(Dashboard), `/org/:orgId`, `/forum/*`, `/lms/*`, `/marketing/*`, `/seller/dashboard`, `/mypage/*` |

→ **Account Center 가 아니다.** dashboard·forum·lms·marketing·seller 를 묶은 **레거시 통합 앱**이다.
계정 전용 UI(서비스 목록 / handoff) 를 제공하지 않는다.

### 5-3. repo `services/web-account` (package `account-web`)

```text
services/web-account/src/App.tsx  (27 lines)
  /handoff  → HandoffPage
  /         → DashboardPage (AccountLayout)
```

- **최소 계정센터**(서비스 목록 + handoff) 로 구현되어 있다.
- Dockerfile 은 있으나 **배포 workflow 가 없다** — `deploy-web-services.yml` 의 대상은 neture / k-cosmetics / kpa-society / glycopharm / pharmacy-hub / kpa-branch 6개뿐.
- 이는 사고가 아니라 **문서화된 결정**이다 — [`IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1`](../investigations/IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1.md) (2026-05-24) **Option D** 채택:
  - canonical 계정 위치 = **각 서비스 `/mypage`**
  - `web-account` = 최소 계정센터로 **유지**
  - `web-account` **배포 = 별건 IR 의 영역** (미결정)

### 5-4. §5 판정

```text
ACCOUNT_CENTER_DEAD   ← 배포 인프라(host rule / backend / NEG / Cloud Run 플레이스홀더) 기준
```

- `ACCOUNT_CENTER_IS_CANONICAL` **아님** — 배포된 Account Center 가 존재하지 않는다.
- `MAIN_SITE_IS_ACCOUNT_CANONICAL` **아님** — `o4o-main-site` 는 account 역할을 하지 않는다 (레거시 통합 앱, 라이브 도메인 없음).
- canonical 계정 위치는 **각 서비스 `/mypage`** 이며, 이는 2026-05-24 IR 에서 이미 확정된 사항이다.
- repo `services/web-account` 는 dead 가 아니라 **보류 자산**이므로 이번 정리 대상에서 제외한다.

---

## 6. 인증 / SSO / handoff 소비처 조사 (§7)

`account.neture.co.kr` 을 참조하는 **runtime 계약이 하나라도 있으면 삭제하지 않는다**는 기준으로 5축을 전수 확인했다.

| 축 | 조사 방법 | 결과 |
|---|---|:---:|
| 저장소 runtime 코드 | `git grep 'account\.neture' -- apps services packages scripts` | **0건** |
| API CORS allowlist | `apps/api-server/src/bootstrap/setup-middlewares.ts` `getAllowedOrigins()` 전문 확인 | **미포함** |
| service catalog | `apps/api-server/src/config/service-catalog.ts` | account 키 **없음** (6서비스) |
| 런타임 서비스 목록 | 프로덕션 `GET /api/v1/auth/services` (로그인 후 실측) | neture / glycopharm / kpa-society / k-cosmetics / pharmacy-hub / kpa-branch — **account 없음** |
| 프로덕션 DB | 전 스키마 `text`/`varchar`/`json`/`jsonb` 컬럼 전수 ILIKE `%account.neture%` 스캔 | **0 hit** |

### 6-1. CORS 결정적 근거

`getAllowedOrigins()` 의 `prodOrigins` 에는 `neture.co.kr`·`www`·`admin`·`dev-admin`·`shop`·`forum`·`signage`·`funding`·`auth`·`api` 서브도메인이 열거되어 있으나 **`account` 는 없다.**
즉 Account Center 가 그 도메인에 배포되었더라도 **API 호출이 CORS 로 차단**된다. 운영 계약으로 성립한 적이 없다는 뜻이다.

### 6-2. OAuth / redirect / 이메일 링크

- OAuth callback 은 `passportDynamic.ts` 의 `config.callbackUrl` (DB/설정 주입) 로 결정되며, DB 전수 스캔에서 account 문자열 **0 hit**.
- handoff 는 `handoff-token.service.ts` + `platform_services.entry_url` 기반이며 account row 자체가 없다.
- `FRONTEND_URL` 계열 env 는 `o4o-core-api` 에 account 값으로 주입된 바 없다 (Cloud Run env 확인).

→ **§7 미확정 소비처 0.**

### 6-3. DB 전수 스캔 상세

```sql
-- 읽기 전용. information_schema 로 전 스키마 text/varchar/json(b) 컬럼을 순회하며
-- 각 컬럼에 ILIKE '%account.neture%' count(*) 수행
DO $$ ... RAISE NOTICE 'HIT %.%.% = %' ... $$;
→ 출력: SCAN_DONE (HIT 0건)
```

`platform_services` 실측 9 row — `cosmetics / glycopharm / k-cosmetics / kpa / kpa-branch / kpa-groupbuy / kpa-society / neture / pharmacy-hub`. **account 없음.**

---

## 7. CI/CD 계약 조사 (§6)

| workflow | 대상 | account 관련 |
|---|---|:---:|
| `deploy-main-site.yml` | `SERVICE_NAME: o4o-main-site` (`apps/main-site/**` 변경 시) | 무관 |
| `deploy-web-services.yml` | neture / k-cosmetics / kpa-society / glycopharm / pharmacy-hub / kpa-branch | **account 미포함** |
| `deploy-admin.yml` / `deploy-api.yml` | admin / api | 무관 |

- **account-center 전용 workflow 는 존재하지 않는다.**
- Cloud Run `account-center-web` 의 `client-name=cloud-console` + 개인 계정 lastModifier + 단일 revision 은 **CI 가 아닌 콘솔 수동 생성** 흔적이다.
- `services/web-account` 는 Dockerfile 이 있으나 어떤 workflow 의 `paths` 트리거에도 포함되지 않는다.

→ **CI/CD 소비처 0** 확정.

---

## 8. 최종 계약 판정 및 실행 (§8-C)

§5 판정이 `ACCOUNT_CENTER_DEAD` 이므로 §8-C 를 적용하되, **repo 자산은 제외**한다.

### 8-1. 삭제 기준 대조 (§9)

| 기준 | `account.neture.co.kr` host rule + backend + NEG + Cloud Run |
|---|:---:|
| runtime 소비처 0 | ✅ (LB 60d 시계열 0 / 코드 0 / DB 0) |
| CI/CD 소비처 0 | ✅ |
| DNS 소비처 0 | ✅ (CNAME 이 GCLB 를 가리키지 않음) |
| auth/redirect 소비처 0 | ✅ (CORS·catalog·DB 전부 부재) |
| LB 참조 0 또는 제거 가능 | ✅ (제거 수행) |
| UNKNOWN 0 | ✅ |

### 8-2. 실행 순서 및 결과

사전 백업(rollback 근거): `urlmap-backup-preaccount.json` · `backend-account-backup.json` · `neg-account-backup.json` · `run-account-backup.yaml` (작업 스크래치 보관).

| # | 리소스 | 방식 | 결과 |
|:-:|---|---|:---:|
| 1 | URL map host rule `account.neture.co.kr` + `path-matcher-1` | `url-maps export` → YAML 편집 → `import` | ✅ |
| 2 | backend service `backend-account-center-web` | `backend-services delete --global` | ✅ |
| 3 | serverless NEG `neg-account-center-web` | `network-endpoint-groups delete` | ✅ |
| 4 | Cloud Run `account-center-web` | `run services delete` | ✅ |

**총 4건 삭제.**

### 8-3. `remove-host-rule` 을 쓰지 않은 이유 (안전 조치)

`gcloud compute url-maps remove-host-rule --host=account.neture.co.kr` 를 먼저 시도했으나 다음 오류가 반환되었다.

```text
ERROR: This operation will orphan the path matcher [path-matcher-pharmacy-hub].
```

**요청한 것은 account host rule 인데 gcloud 는 pharmacy-hub path matcher 를 orphan 으로 계산했다.**
production URL map 에 잘못된 인덱스로 write 될 위험이 있어 **즉시 중단**하고, `export → YAML 편집 → import` 방식으로 전환했다.
편집본은 import 전에 다음을 assert 로 검증했다.

- `account.neture.co.kr` / `path-matcher-1` / `backend-account-center-web` 문자열 **부재**
- 나머지 8개 path matcher (`admin`, `glucoseview`, `glycopharm`, `k-cosmetics`, `neture`, `kpa-society`, `api`, `pharmacy-hub`) **전부 존재**
- `defaultService` 불변 (`backend-neture-web-http`)

import 후 실측 host rule 9개 = 변경 전 10개 − account 1개. **의도 외 변경 0건.**

### 8-4. NEG 동반 삭제 근거

`neg-account-center-web` 은 `backend-account-center-web` **전용 1:1** 이었고(다른 backend 참조 0), 삭제 후 소비처가 0 이 되었다.
NEG 의 target 이던 Cloud Run **`o4o-main-site` 는 삭제하지 않았다** — `deploy-main-site.yml` 이라는 **활성 CI 배포 계약이 존재**하므로 §9 의 "CI/CD 소비처 0" 을 충족하지 않는다.

---

## 9. 유지 리소스와 이유

| 리소스 | 판정 | 이유 |
|---|:---:|---|
| `services/web-account` (repo) | **KEEP** | `IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1` Option D 가 "최소 계정센터로 유지, 배포는 별건 IR" 로 확정. dead 가 아니라 **보류 자산**. 삭제는 제품 결정 사항이며 이번 WO 범위 밖 |
| Cloud Run `o4o-main-site` | **KEEP** | `deploy-main-site.yml` 활성 CI 배포 계약 존재 → §9 "CI/CD 소비처 0" 미충족 |
| `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` §11 (Account Center) | **KEEP (무수정)** | 이미 문서 상단에 Legacy Baseline 로 격하 표기됨. §13 "역사 기록 문서는 유지한다" |
| `account.neture.co.kr` DNS CNAME | **HOLD** | 아래 §10 |

---

## 10. HOLD 1건 — 외부 등록기관 DNS

`account.neture.co.kr` → `ghs.googlehosted.com` CNAME 은 **삭제하지 못했다.**

| 사유 | 내용 |
|---|---|
| 권한 | `neture.co.kr` 는 **Cloud DNS 가 아닌 Gabia**(`ns.gabia.co.kr` / `ns1.gabia.co.kr` / `ns.gabia.net`) 에서 관리된다. GCP 콘솔·CLI 로 조작 불가 |
| 정책 | 본 저장소 상시 제약상 **DNS 변경은 금지**이며, WO §8-A 도 "외부 도메인 운영 정책 변경에 해당하면 안전성 확인 후"로 제한 |

**현재 영향:** 없음. 삭제 전후 모두 `http → 404`, `https → TLS 실패` 로 동일하며, 이 CNAME 은 GCLB·Cloud Run 어디로도 트래픽을 보내지 않는다.
**남는 리스크:** dangling CNAME 자체는 Google 공유 호스트(`ghs.googlehosted.com`)를 가리키므로 **제3자가 해당 호스트명을 자기 프로젝트에 매핑해 선점할 이론적 가능성**이 있다(subdomain takeover 계열). 실제 성립하려면 Google 이 도메인 소유 검증을 요구하므로 즉시 위험은 아니나, **Gabia 콘솔에서 레코드를 삭제하는 것이 정답**이다 → 후속 조치 ①.

---

## 11. Production 검증

### 11-1. 도메인 (변경 전 → URL map 변경 후 → 전체 삭제 후, 3회 측정 동일)

| 도메인 | HTTPS |
|---|:---:|
| `neture.co.kr` / `www.neture.co.kr` | 200 / 200 |
| `admin.neture.co.kr` | 200 |
| `kpa-society.co.kr` / `www` | 200 / 200 |
| `k-cosmetics.site` / `www` | 200 / 200 |
| `glycopharm.co.kr` | 200 |
| `glucoseview.co.kr` | 200 |
| `pharmacyhub.co.kr` / `www` | 200 / 200 |
| `siteguide.co.kr` | 200 |
| `http://neture.co.kr/` (redirect) | **301** |

**12 도메인 전부 삭제 전과 동일.**

### 11-2. API / 인증 E2E (삭제 후)

| 항목 | 결과 |
|---|---|
| `GET /health` | `{"status":"alive", ...}` **200** |
| `GET /health/database` | `{"status":"healthy","pingMs":5,"activeConnections":10}` |
| `POST /api/v1/auth/login` (serviceKey=neture) | `success: true` |
| `GET /api/v1/auth/me` | `success: true` |
| `GET /api/v1/auth/services` | `success: true` — 6서비스(neture / glycopharm / kpa-society / k-cosmetics / pharmacy-hub / kpa-branch), **account 없음** |
| `POST /api/v1/auth/logout` | `success: true` **200** |

> 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` (SSOT) 에서 스크립트로 읽어 사용했고 로그·문서 어디에도 기록하지 않았다.

### 11-3. 인프라 정합

| 항목 | 변경 전 | 변경 후 |
|---|:---:|:---:|
| URL map host rule | 10 | **9** |
| backend service (global) | 9 | **8** |
| serverless NEG | 9 | **8** |
| Cloud Run service | 12 | **11** |
| 잔여 backend ↔ NEG ↔ Cloud Run 1:1 정합 | — | **8/8 정상** |

### 11-4. 에러

| 항목 | 결과 |
|---|:---:|
| Cloud Run `severity>=ERROR` (변경 시각 이후) | **0건** |
| GCLB `httpRequest.status >= 500` (변경 시각 이후) | **0건** |

---

## 12. 비용 판정 (§11)

| 리소스 | 분류 | 근거 |
|---|:---:|---|
| URL map host rule / path matcher | `NO_COST_EFFECT` | URL map 구성요소는 개별 과금 대상이 아님 |
| `backend-account-center-web` | `NO_COST_EFFECT` | backend service 는 개별 과금 없음. GCLB 과금은 forwarding rule 수 + 처리 데이터량이며 둘 다 불변 |
| `neg-account-center-web` | `NO_COST_EFFECT` | serverless NEG 개별 과금 없음 |
| Cloud Run `account-center-web` | `NO_COST_EFFECT` (실질) | minScale 미설정(=0) → 유휴 인스턴스 없음. 60d 요청 1건 → 청구액은 0 에 수렴 |

**총 직접 비용 절감 = 사실상 0.** 이번 정리의 가치는 `INDIRECT_COMPLEXITY_REDUCTION` — 이름과 실제 연결이 어긋난(`account-center` → `o4o-main-site`) 경로를 제거해 향후 조사에서 반복 발생하던 오판 소지를 없앤 것이다. **비용 절감으로 과장하지 않는다.**

---

## 13. 저장소 정리 (§13)

| 대상 | 조치 |
|---|:---:|
| dead frontend package/app | **없음** — `services/web-account` 는 보류 자산(§9) |
| dead deployment workflow | **없음** — account 전용 workflow 가 애초에 없음 |
| obsolete env | **없음** — account 관련 env 주입 0건 |
| dead domain literal | **없음** — runtime 코드 0 hit |
| dead infra docs | **없음** — Identity V1 은 이미 Legacy 표기됨, 역사 기록으로 유지 |

→ **코드/설정 변경 0건.** 이번 WO 의 저장소 산출물은 본 CHECK 문서뿐이다.

---

## 14. 중지 조건 대조 (§12)

| 조건 | 해당 | 근거 |
|---|:---:|---|
| account center 역할이 제품 정책상 불명확 | ❌ | 2026-05-24 IR Option D 가 canonical(`/mypage`) + web-account 보류를 이미 확정 |
| OAuth/SSO callback 소비처 발견 | ❌ | 코드·DB·catalog 전부 0 hit |
| 외부 파트너의 `account.neture.co.kr` 사용 가능성 | ❌ | 60d LB 요청 시계열 0건 + TLS 자체가 성립 불가 → 외부 사용 물리적으로 불가능 |
| DB 에 account URL 저장 + 영향 불명확 | ❌ | 전 스키마 전수 스캔 0 hit |
| 두 frontend 역할이 실제로 중복이 아님 | ❌ | `o4o-main-site` 는 account 역할 자체가 없음 (route tree 실측) |
| DNS 신규 연결에 별도 운영 승인 필요 | ✅ **해당** | 신규 연결은 수행하지 않음. 기존 dangling CNAME 삭제도 외부 등록기관 소관 → **HOLD** 처리(§10) |
| UNKNOWN 해소 불가 | ❌ | UNKNOWN 0 |

---

## 15. 완료 기준 대조 (§15)

| 기준 | 결과 |
|---|:---:|
| `account.neture.co.kr` 계약 확정 | ✅ `ACCOUNT_CENTER_DEAD` — 배포 인프라 제거, repo 자산 보류 유지 |
| `o4o-main-site` / `account-center-web` 역할 확정 | ✅ main-site = 레거시 통합 앱(CI 활성) / account-center-web = 플레이스홀더(삭제) |
| backend/NEG target 정합 | ✅ 오배선 쌍 제거 → 잔여 8쌍 전부 이름과 target 일치 |
| auth/SSO 소비처 미확정 0 | ✅ 5축 전부 0 |
| UNKNOWN 0 또는 명확한 HOLD 사유 | ✅ UNKNOWN 0 / HOLD 1 (외부 등록기관 DNS, 사유 명시) |
| 불필요 리소스만 정리 | ✅ 4건, 전부 §9 6기준 충족 |
| production 정상 | ✅ 12 도메인 + health + 인증 E2E 전부 정상 |
| 신규 ERROR 0 | ✅ Cloud Run ERROR 0 / LB 5xx 0 |

---

## 16. 후속 후보 (이번 WO 범위 밖 — 별도 WO 필요)

| # | 항목 | 내용 |
|:-:|---|---|
| ① | **Gabia DNS `account.neture.co.kr` CNAME 삭제** | 유일한 잔여 항목. 등록기관 콘솔 접근 필요. dangling CNAME 정리 목적 |
| ② | **`o4o-main-site` 운영 계약 확정** | 이번 정리로 **LB 연결이 0** 이 되었다. 그런데 `deploy-main-site.yml` 은 여전히 `apps/main-site/**` 변경마다 배포한다. 60d 요청 15건. → 도메인 연결 / 배포 중단 / 서비스 은퇴 중 택1 |
| ③ | **`services/web-account` 배포 여부 결정** | IR Option D 가 "별건 IR" 로 미뤄둔 사안. 배포하려면 (a) Gabia DNS → GCLB, (b) Certificate Manager map entry 추가, (c) URL map host rule + backend + NEG 신규 생성, (d) CORS allowlist 에 origin 추가, (e) deploy workflow 추가 **5종 세트가 모두 필요**하다 |
| ④ | **Cloud Run 평문 secret env 점검** | `o4o-core-api` 에 `DB_PASSWORD` · `SMTP_PASS` 가 **평문 env 로 주입**되어 있음을 조사 중 확인. `ENCRYPTION_KEY` 는 이미 Secret Manager 로 전환 완료(`o4o-encryption-key`)이므로 동일 방식 적용 검토 대상. 값은 본 문서에 기록하지 않음 |
| ⑤ | **LB 미연결 Cloud Run 정리 검토** | `kpa-branch-web` / `o4o-admin-dashboard-dev` / `o4o-main-site` — 이번 삭제로 목록 갱신됨 |

---

## 17. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- **발견 1건:** `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` §11 이 `https://account.neture.co.kr` 를 Account Center 로 기술한다. 다만 해당 문서는 **상단에 이미 Legacy Baseline 격하 표기가 있고** (V2 가 canonical), §16-1 상 기준 문서이나 §16-3 의 인라인 허용 2종(SUPERSEDED 표기 추가 / 깨진 링크 수정) 어디에도 해당하지 않는 **내용 판정 변경**이라 손대지 않았다. → 후속 WO 제안(위 ③ 결정 후 함께 정리).
- 선행 CHECK(`WO-O4O-GCLB-BACKEND-SERVICE-USAGE-CENSUS-AND-ORPHAN-CLEANUP-V1-CHECK.md`)의 "DNS 없음" 기록은 당시 관측 사실이므로 **기록물(§16-1 대상 외)로 수정하지 않았다.** 정정 사실은 본 문서 §2 에 남긴다.
