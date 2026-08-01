# CHECK-O4O-CLOUD-RUN-INGRESS-LOAD-BALANCER-ONLY-V1

> WO: `WO-O4O-CLOUD-RUN-INGRESS-LOAD-BALANCER-ONLY-V1`
> 작업일: 2026-08-01 · 브랜치: `main` · 작업 전 HEAD `657c25807`

---

## 1. 대상

| 항목 | 값 |
|------|-----|
| project | `netureyoutube` |
| region | `asia-northeast3` |
| Cloud Run service | `o4o-core-api` |
| Cloud Run URL | `https://o4o-core-api-3e3aws7zqa-du.a.run.app` |
| 공식 도메인 | `https://api.neture.co.kr` |
| **변경 전 ingress** | **`all`** (ingress-status 도 `all`) |
| 변경 전 traffic | 최신 revision 100% |

## 2. 공식 경로 연결 근거 (실측)

```
api.neture.co.kr
  → o4o-global-lb (URL map)
      hostRules: api.neture.co.kr · api.glycopharm.co.kr · api.glucoseview.co.kr
                 api.kpa-society.co.kr · api.k-cosmetics.site
      → pathMatcher: path-matcher-api
      → defaultService: backend-o4o-core-api
          → neg-o4o-core-api  (networkEndpointType = SERVERLESS)
              → cloudRun.service = o4o-core-api
```

WO §12 중지 조건 ①② (도메인–서비스 연결 미확정 / NEG·backend 확정 불가) 해당 없음.

## 3. 변경 전 우회 실측 — 취약점 확인

| 요청 | 결과 |
|------|------|
| `https://api.neture.co.kr/health` | 200 |
| `run.app/health` | **200** |
| `run.app/api/v1/pharmacy-hub/service-info` | **200 — 애플리케이션 데이터 도달** |

직접 URL 로 애플리케이션에 그대로 도달했다. 그 경로는 프록시 체인이 달라
직전 WO(`...-TRUSTED-CLIENT-IP-...`)에서 실측·적용한 **`trust proxy = 2` 전제가 성립하지 않는다.**

## 4. 직접 URL 의존성 조사

| 소비처 | 결과 |
|--------|------|
| 애플리케이션 코드 (`apps/` · `services/` · `packages/`) | **0건** |
| GitHub Actions 워크플로 | **0건** (배포 후 health check 는 `status.url` 을 동적으로 조회 — §5 에서 처리) |
| Cloud Scheduler | **없음** — `cloudscheduler.googleapis.com` API 자체가 미활성 |
| Cloud Tasks | **없음** — `cloudtasks.googleapis.com` API 미활성 |
| Pub/Sub push 구독 | **0건** |
| 웹 앱 환경변수 · CORS origin | 직접 URL 미사용 (`VITE_API_BASE_URL` 등은 `api.neture.co.kr`) |
| 문서 · 로컬 설정 | `docs/**`(예시·과거 기록) · `.claude/settings.local.json`(로컬 권한 목록) — **런타임 아님, 미변경** |

**마이그레이션은 Cloud Run Jobs** (`gcloud run jobs create/update/execute o4o-api-migrations`)로
control plane 을 통해 실행된다 → 서비스 ingress 와 무관하다.

WO §12 중지 조건 ③④ (필수 소비처 의존 / 내부 호출 중단 위험) 해당 없음.

## 5. 변경 파일 — 배포 SSOT 영속화

`.github/workflows/deploy-api.yml` **1개 파일만** 변경했다.

1. **ingress 영속 설정**

```diff
           --allow-unauthenticated \
+          --ingress=internal-and-cloud-load-balancing \
           --port=8080 \
```

`--allow-unauthenticated` 는 **그대로 유지**했다 — 인증 축과 네트워크 진입 축은 별개이며
WO §5.2 가 임의 변경을 금지한다.

2. **배포 후 검증을 두 축으로 분리** (⚠️ 이걸 같이 고치지 않으면 배포가 실패한다)

기존 검증은 `curl -sf "${SERVICE_URL}/health"` 로 **run.app URL** 을 호출했다.
GitHub Actions 러너는 외부 인터넷이므로 ingress 제한 후 이 curl 이 실패해 job 이 `exit 1` 된다.

```
revision readiness → gcloud run services describe (control plane)
외부 API health    → ${PUBLIC_API_URL}/health  (= https://api.neture.co.kr)
```

`PUBLIC_API_URL` env 를 추가하고, **ingress 값이 기대와 다르면 배포를 실패시키는 가드**도 넣었다.

3. 요약 출력의 URL 을 공식 도메인 기준으로 변경 (run.app 은 `LB-only` 표기로 병기)

`deploy-web-services.yml` 등 **다른 Cloud Run 서비스 배포 정의는 변경하지 않았다** (`ingress` 언급 0).

## 6. 적용 결과

배포 워크플로를 통해 적용했다 (수동 `gcloud run services update` 만 남기지 않음).

| 항목 | 값 |
|------|-----|
| ingress | **`internal-and-cloud-load-balancing`** |
| traffic | `o4o-core-api-03083-s6p` 100% |
| Ready | `True` |
| IAM invoker | `roles/run.invoker` = `allUsers` — **변경 없음** |

## 7. 검증

### 7-1. 직접 run.app URL — 차단 확인

| 경로 | 결과 |
|------|------|
| `run.app/health` | **404 (Google 인프라 HTML)** |
| `run.app/api/v1/pharmacy-hub/service-info` | **404 (Google 인프라 HTML)** |
| `run.app/api/v1/platform-services` | **404 (Google 인프라 HTML)** |

WO §7 판정 기준(“애플리케이션 JSON 응답이나 실제 API 데이터가 반환되지 않을 것”) 충족.
변경 전 세 경로 모두 200 + 애플리케이션 응답이었다.

### 7-2. 공식 도메인

| 항목 | 결과 |
|------|------|
| `/health` | ✅ 200 |
| `/api/v1/pharmacy-hub/service-info` · `/api/v1/platform-services` | ✅ 200 |
| `/api/v1/admin/users` (미인증) | ✅ **401** — 기존 계약 유지 |
| 로그인 | ✅ 200 |
| 관리자 API (인증) | ✅ 200 |
| Pharmacy-Hub store-owner 상품 | ✅ 200 |

### 7-3. CORS preflight

| Origin | 결과 |
|--------|------|
| `neture.co.kr` · `kpa-society.co.kr` · `glycopharm.co.kr` · `k-cosmetics.site` | ✅ 204 · `allow-origin` 정확 반영 |
| `pharmacy-hub-web-*.run.app` · `pharmacyhub.co.kr` | ✅ 204 · 사전 등록 origin 유지 |

### 7-4. 주요 웹 서비스 회귀

`neture.co.kr` · `kpa-society.co.kr` · `glycopharm.co.kr` · `k-cosmetics.site` ·
`pharmacy-hub-web-*.run.app` — **전부 200**.

> 웹 서비스들의 Cloud Run ingress 는 변경하지 않았으므로 자체 URL 접근도 그대로다.

### 7-5. trust proxy 전제 보호

공식 LB 경로에서 정상 GET / 위조 XFF 주입 GET 모두 200 (기능 회귀 없음).
위조 값이 보안용 client IP 로 선택되지 않는다는 것은 직전 WO 에서 프로덕션 실측으로 확인했고,
`trusted-client-ip.test.ts` 13건이 이를 고정하고 있다.

**임시 진단 엔드포인트를 다시 추가하지 않았다** (WO §13.6). 대신 위 정적·단위 검증과
LB 경로 확인으로 대체했다.

이제 애플리케이션이 받을 수 있는 외부 프록시 체인이 **공식 LB 경로 하나로 단일화**되어
`trust proxy = 2` 전제가 인프라 수준에서 보호된다.

## 8. 데이터 변경

```
DB migration 0 · DB write 0 · 신규 테이블 0 · 신규 role 0 · 사용자/membership 변경 0
```

Cloud Run service configuration 과 배포 정의만 변경했다.

## 9. 미변경 · 알려진 제한

| 항목 | 상태 |
|------|------|
| 다른 Cloud Run 서비스 (`neture-web` · `kpa-society-web` · `glycopharm-web` · `k-cosmetics-web` · `pharmacy-hub-web` · `o4o-admin-dashboard` · `account-center-web` · `glucoseview-web` · `signage-player-web`) | **ingress 미변경** — 동일 정비가 필요한지는 후속 판단. 다만 이들은 정적 웹이라 위험 성격이 다르다 |
| `--allow-unauthenticated` / IAM invoker | 유지 (WO §5.2) |
| IP block TTL · unblock API | 후속 WO |
| Cloud Armor · WAF | 범위 밖 |
| 다중 인스턴스 IP block 일관성 | 후속 WO 의 알려진 한계 |

**남은 진입 경로**: Cloud Run 정책상 `internal-and-cloud-load-balancing` 은 VPC 내부 및
허용된 Google 내부 경로를 계속 허용한다. 외부 인터넷 직접 진입만 차단된다.

## 10. 후속

직전 중지 WO 재개 조건이 모두 갖춰졌다.

```
WO-O4O-SECURITY-IP-BLOCK-TTL-AND-UNBLOCK-V1
```

재개 시 `rule_sql_injection` 의 임계값 부재(오탐 1회 즉시 차단)도 TTL 과 함께 검토할 것.
