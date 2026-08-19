# CHECK — WO-O4O-GCLB-ORPHAN-PROXY-AND-SSL-CERT-CLEANUP-V1

- **작업일**: 2026-08-19
- **대상 프로젝트**: `netureyoutube` (display name `neture-services`)
- **범위**: orphan target HTTP proxy 2건 + 미참조 legacy SSL certificate 9건 **삭제 + production 검증**
- **선행 문서**: `WO-O4O-GCLB-FORWARDING-RULE-STATIC-IP-CENSUS-V1-CHECK.md` · `WO-O4O-GCLB-REMOVE-UNUSED-FORWARDING-RULES-V1-CHECK.md`
- **결과**: **11건 삭제 완료 · ACTIVE 리소스 손실 0 · UNKNOWN 0 · production 무중단**

---

## 1. 삭제 직전 기준 상태 재확인 (§3)

WO §3 KEEP baseline 과 live 조회값이 **완전 일치**했다.

| 리소스 | live 값 | §3 기대값 | 판정 |
|---|---|---|:---:|
| `neture-https-frontend-forwarding-rule` | `136.110.132.35` : 80 → `neture-https-frontend-target-proxy` | 동일 | ✅ |
| `o4o-global-lb-forwarding-rule-2` | `136.110.132.35` : 443 → `o4o-global-lb-target-proxy-2` | 동일 | ✅ |
| `neture-static-ip` | `136.110.132.35` · `IN_USE` · users 2 | 동일 | ✅ |

global/regional 전체 forwarding rule 은 위 **2건이 전부**였다 (regional 0건).

---

## 2. Orphan HTTP proxy Census (§4)

삭제 전 target HTTP proxy 는 3건이었다.

| proxy | 생성 시점 | URL map | forwarding rule 참조 | 다른 참조 | DNS 직접 영향 | 저장소 참조 | 판정 |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| `neture-https-frontend-target-proxy` | 2025-12-26 | `neture-https-frontend-redirect` | **1** (:80 rule) | — | 있음 (HTTP→HTTPS redirect) | 기록 문서 | **ACTIVE — KEEP** |
| `o4o-global-lb-target-proxy` | 2025-12-31 | `o4o-global-lb` | **0** | 0 | 없음 | 기록 문서만 | **ORPHAN_CONFIRMED** |
| `o4o-global-lb-target-proxy-3` | 2026-03-12 | `o4o-global-lb` | **0** | 0 | 없음 | 기록 문서만 | **ORPHAN_CONFIRMED** |

- 참조 0 의 근거: 두 proxy 를 가리키던 `o4o-global-lb-forwarding-rule` / `o4o-global-lb-forwarding-rule-3` 은 직전 WO 에서 이미 삭제됐고, 이번 live 재조회에서도 전체 forwarding rule 2건 중 어느 것도 두 proxy 를 target 하지 않았다.
- **이름이 아니라 `describe` 실측값으로 판정**했다. 두 proxy 는 backend 를 직접 갖지 않고 URL map `o4o-global-lb` 만 참조하는 구조이며, redirect 구성도 아니다.
- URL map `o4o-global-lb` 는 **현재 ACTIVE HTTPS proxy 가 같이 쓰는 공유 자원**이므로 proxy 삭제 대상에서 URL map 은 제외했다 (§7 자동 동반 삭제 금지).
- UNKNOWN 0.

**삭제 가능 조건 대조**: forwarding rule 참조 0 ✅ / 다른 target resource 참조 0 ✅ / production DNS 영향 0 ✅ / active URL map 경로 영향 0 ✅ / UNKNOWN 0 ✅ → **삭제 진행**.

---

## 3. SSL certificate Census (§5)

삭제 전 classic SSL certificate 는 **10건**이었고 **전부 `MANAGED` · 전부 `PROVISIONING_FAILED_PERMANENTLY`** 였다.

| certificate | 생성 | 만료 | 도메인(SAN) | HTTPS proxy 참조 | 판정 |
|---|---|---|---|:---:|:---:|
| `cert-final-neture-v3` | 2026-01-08 | 2026-04-08 | neture/glycopharm/glucoseview/kpa-society/k-cosmetics + api·www (16) | **1** (`o4o-global-lb-target-proxy-2`) | **KEEP** |
| `cert-admin` | 2025-12-27 | — | admin.neture.co.kr, www.admin.neture.co.kr | 0 | 삭제 |
| `cert-final-neture` | 2025-12-27 | 2026-03-28 | 5서비스 apex/www (11) | 0 | 삭제 |
| `cert-final-neture-v2` | 2026-01-03 | 2026-04-03 | 5서비스 + api.neture (12) | 0 | 삭제 |
| `cert-glucoseview` | 2025-12-27 | 2026-03-27 | glucoseview.co.kr, www | 0 | 삭제 |
| `cert-glycopharm` | 2025-12-27 | 2026-03-27 | glycopharm.co.kr, www | 0 | 삭제 |
| `cert-kcosmetics` | 2025-12-27 | 2026-03-27 | k-cosmetics.site, www | 0 | 삭제 |
| `cert-kpa` | 2025-12-27 | 2026-03-27 | kpa-society.co.kr, www | 0 | 삭제 |
| `cert-neture-web` | 2025-12-27 | 2026-03-27 | neture.co.kr, www | 0 | 삭제 |
| `cert-siteguide-v1` | 2026-01-19 | — | siteguide.co.kr, www, api | 0 | 삭제 |

**참조 1 / 미참조 9 / UNKNOWN 0** — 직전 Census 결과와 동일했다.

### 3-1. 실제 TLS 를 담당하는 것은 Certificate Manager 다

`o4o-global-lb-target-proxy-2` 는 `certificateMap = o4o-main-cert-map` 을 갖고 있다. certificate map 이 붙은 HTTPS proxy 에서는 **map 이 우선**하며 classic `sslCertificates` 는 서빙에 쓰이지 않는다. 실제 서빙 인증서는 Certificate Manager 의 3건이다.

| Certificate Manager cert | SAN | 만료 |
|---|---|---|
| `cm-cert-neture` | 5서비스 apex/www/api (15) | 2026-09-30 |
| `cm-cert-pharmacyhub` | pharmacyhub.co.kr, www | 2026-11-01 |
| `cm-cert-siteguide` | siteguide.co.kr, www | 2026-09-26 |

즉 classic 10건은 **모두 발급 실패 상태로 한 번도 TLS 를 서빙한 적이 없는 잔재**다. 그럼에도 `cert-final-neture-v3` 는 proxy 의 `sslCertificates` 배열에 **여전히 attach 되어 있어 참조 1** 이므로, WO §5 "현재 참조 중인 certificate 는 반드시 KEEP" 에 따라 **삭제하지 않았다** (detach 는 active HTTPS proxy 수정이므로 이번 범위 밖).

**삭제 가능 조건 대조(9건 공통)**: target HTTPS proxy 참조 0 ✅ / forwarding rule 간접 참조 0 ✅ / Certificate Manager 참조 0 (cm-cert-* 와 이름·리소스 계열이 별개) ✅ / production TLS 미사용 ✅ / 다른 LB 미사용 (LB 는 이 1개뿐) ✅ / UNKNOWN 0 ✅.

> 만료일이 남았다는 이유로 유지하지 않았고, 오래됐다는 이유로 삭제하지도 않았다. 판정 근거는 **참조 수 0 + 발급 실패로 서빙 이력 0** 이다.

---

## 4. 삭제 실행 (§7)

WO §7 순서를 그대로 따랐다.

| # | 단계 | 결과 |
|:---:|---|---|
| 1 | orphan HTTP proxy 2건 live 재검증 | 참조 0 재확인 |
| 2 | proxy 삭제 | `o4o-global-lb-target-proxy` Deleted / `o4o-global-lb-target-proxy-3` Deleted |
| 3 | 삭제 후 URL map 참조 재조회 | `o4o-global-lb` = HTTPS proxy 가 계속 참조 → **orphan 아님, 보존** / `neture-https-frontend-redirect` = :80 proxy 참조 유지 |
| 4 | SSL certificate 9건 live 재검증 | HTTPS proxy 참조는 `cert-final-neture-v3` 1건뿐임을 재확인 |
| 5 | 참조 0 인 cert 9건 삭제 | 9건 전부 Deleted |
| 6 | 전체 LB 리소스 재 Census | §5 |

**실제 삭제 수: target HTTP proxy 2건 + SSL certificate 9건 = 11건.**

자동 동반 삭제하지 않은 대상(§7): URL map · backend service · backend bucket · serverless NEG · static IP · forwarding rule · Certificate Manager 리소스 — **전부 미변경**.

---

## 5. 삭제 후 GCLB 구조 (§8)

| 항목 | 삭제 전 | 삭제 후 |
|---|:---:|:---:|
| forwarding rule | 2 | **2** (변경 없음) |
| target HTTP proxy | 3 | **1** |
| target HTTPS proxy | 1 | **1** |
| URL map | 2 | **2** (변경 없음) |
| backend service | 9 | **9** (변경 없음) |
| backend bucket | 0 | **0** |
| SSL certificate (classic) | 10 | **1** (`cert-final-neture-v3`) |
| Certificate Manager map / cert | 1 / 3 | **1 / 3** (변경 없음) |
| static IP | `neture-static-ip` IN_USE users 2 | **동일** |

### production 경로 무결성

```
136.110.132.35 :80
  └─ neture-https-frontend-forwarding-rule
       └─ neture-https-frontend-target-proxy (HTTP)
            └─ neture-https-frontend-redirect  (httpsRedirect: true, 301)   ✅ 유지

136.110.132.35 :443
  └─ o4o-global-lb-forwarding-rule-2
       └─ o4o-global-lb-target-proxy-2 (HTTPS)
            ├─ certificateMap: o4o-main-cert-map   ← 실제 TLS 서빙   ✅ 유지
            ├─ sslCertificates: cert-final-neture-v3 (attach 유지, 미서빙)
            └─ o4o-global-lb (URL map, host rule 11그룹)
                 └─ backend service 9건 → serverless NEG (Cloud Run)  ✅ 유지
```

**잔존 orphan 여부**: URL map 2건 모두 참조 있음(orphan 0). backend service 9건은 `o4o-global-lb` 가 소비. backend bucket 0건. → 이번 삭제로 새로 orphan 이 된 리소스는 **없다**.

---

## 6. Production 도메인 검증 (§9)

삭제 **전 baseline** 을 먼저 채취하고, 삭제 후 동일 항목을 재측정해 대조했다. **전 항목 동일**했다.

| 도메인 | DNS | HTTP :80 | redirect | HTTPS :443 | TLS subject / notAfter | 판정 |
|---|---|:---:|---|:---:|---|:---:|
| `neture.co.kr` | 136.110.132.35 | 301 | → https | 200 | CN=neture.co.kr / 2026-09-30 | ✅ |
| `www.neture.co.kr` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `kpa-society.co.kr` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `www.kpa-society.co.kr` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `glycopharm.co.kr` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `www.glycopharm.co.kr` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `k-cosmetics.site` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `www.k-cosmetics.site` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `glucoseview.co.kr` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `pharmacyhub.co.kr` | 136.110.132.35 | 301 | → https | 200 | CN=pharmacyhub.co.kr / 2026-11-01 | ✅ |
| `www.pharmacyhub.co.kr` | 136.110.132.35 | 301 | → https | 200 | 동일 | ✅ |
| `admin.neture.co.kr` | 136.110.132.35 | 301 | → https | 200 | CN=neture.co.kr / 2026-09-30 | ✅ |
| `api.neture.co.kr` | 136.110.132.35 | 301 | → https | **404** | CN=neture.co.kr / 2026-09-30 | ✅ (아래) |
| `glucoseview.com` | 168.126.63.1 | 200 | (redirect 없음) | 200 | CN=glucoseview.com / 2026-12-23 | ✅ (아래) |

- `api.neture.co.kr` 의 HTTPS 404 는 **API 루트 경로에 라우트가 없기 때문**이며 삭제 전 baseline 과 동일하다. 동일 호스트의 `/health` 는 200 (§7).
- `glucoseview.com` 은 이 GCLB(136.110.132.35) 위에 있지 않은 **외부 호스팅 도메인**이며 자체 인증서를 쓴다. 이번 삭제와 무관하고 상태 변화도 없다. (LB 위의 자산은 `glucoseview.co.kr`)
- TLS handshake 전 도메인 성공, 인증서 subject/SAN 은 전부 Certificate Manager 발급분 → classic cert 삭제가 서빙 인증서에 영향을 주지 않았음이 실측으로 확인됐다.

---

## 7. Cloud Run / API 검증 (§10)

| 항목 | 결과 |
|---|---|
| Cloud Run Ready | **12/12 True** (account-center-web · glucoseview-web · glycopharm-web · k-cosmetics-web · kpa-branch-web · kpa-society-web · neture-web · o4o-admin-dashboard · o4o-admin-dashboard-dev · o4o-core-api · o4o-main-site · pharmacy-hub-web) |
| `o4o-core-api` | Ready True |
| `GET /health` | **200** — `status: alive`, env production, version 0.5.0 |
| `GET /health/database` | **200** — `status: healthy`, pingMs 4, activeConnections 10, longRunningQueries 0 |
| 로그인 smoke | **200 · `success: true`** (`serviceKey=neture`, 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 에서만 조회 — 문서에 기록하지 않음) |
| `severity>=ERROR` 신규 (삭제 시각 이후) | **0건** |
| LB `httpRequest.status>=500` 신규 | **0건** |
| LB / TLS / image / startup 관련 신규 오류 | **0건** |

---

## 8. 저장소 조사 (§11)

추적 파일 전체(`git ls-files`)에서 삭제 대상 proxy 명 · certificate 명 · gcloud LB 스크립트 · infra config 를 검색했다.

| 대상 | 결과 |
|---|---|
| 삭제 proxy 이름 참조 | `docs/checks/**` 3개 문서 (과거 Census 기록) |
| 삭제 certificate 이름 참조 | `docs/checks/**` 3개 문서 (과거 Census 기록) |
| LB 를 조작하는 script / CI / infra config | **0건** |
| 애플리케이션 코드 · 환경변수 참조 | **0건** |

→ **살아있는 dead reference 0건**. 발견된 참조는 전부 `docs/checks/` 의 **역사 기록물**이며, CLAUDE.md §16-1 상 정비 대상이 아니고 WO §11 도 "역사 기록 문서는 함부로 수정하지 않는다" 고 지시하므로 **수정하지 않았다**. 저장소 코드 변경 0건, 이번 WO 의 저장소 산출물은 본 CHECK 문서 1개뿐이다.

---

## 9. 비용 관점 (§12)

정확한 청구액은 확정하지 않는다. 사실만 기록한다.

| 항목 | 값 |
|---|---|
| 삭제 target HTTP proxy | 2건 |
| 삭제 SSL certificate | 9건 |
| 비용 과금 대상 여부 | **과금 대상 아님.** GCP Google-managed SSL certificate 와 target proxy 는 개별 과금 항목이 아니다. GCLB 과금은 forwarding rule 수 · 처리 데이터량 기준이며, 이번 삭제는 **forwarding rule 을 건드리지 않았다** |
| 실질 절감액 | **$0 (0원)** |
| 실제 효과 | 운영 복잡도 감소 — LB 리소스 12건 → 1건 정리로 "어떤 proxy/cert 가 실제 서빙 중인가" 판단 비용 제거, 발급 실패 상태 인증서 9건이 만드는 오탐·오해 소지 제거, 향후 인증서 교체·감사 시 후보 축소 |

> legacy SSL certificate 는 무료 리소스이므로 **비용 절감으로 과장하지 않는다.** 이번 정리의 가치는 금액이 아니라 구조 명확성이다.

---

## 10. 중지 조건 대조 (§13)

| 중지 조건 | 발생 여부 |
|---|:---:|
| active proxy 참조 발견 | 없음 |
| forwarding rule 참조 발견 | 없음 |
| active TLS certificate 로 확인 | 없음 (삭제 9건 전부 발급 실패·서빙 이력 0) |
| production 도메인과 직접 연결 | 없음 |
| 다른 LB · shared resource 소비처 발견 | 없음 (LB 1개 · URL map 공유 자원은 보존) |
| UNKNOWN 발생 | 없음 |
| 삭제 직후 TLS · redirect · HTTPS 이상 | 없음 |
| production 5xx 증가 | 없음 |

→ **중지 조건 미발동. 롤백 불필요.**

---

## 11. 후속 cleanup 후보 (기록만, 이번 WO 미포함)

| # | 후보 | 근거 | 비고 |
|:---:|---|---|---|
| 1 | `cert-final-neture-v3` detach 후 삭제 | 발급 실패 상태로 서빙 이력 0, 실제 TLS 는 `o4o-main-cert-map` 담당 | **active HTTPS proxy 수정**을 동반하므로 별도 WO 필수 |
| 2 | backend service 9건 실사용 대조 | 이번 WO 는 수 확인만 수행 (9 → 9) | §7 자동 삭제 금지 대상 |
| 3 | `siteguide.co.kr` default-backend fallthrough | 이전 Census 에서 기록된 미해결 건 | 기존 후속 후보 유지 |

(이전 WO 에서 넘어온 후속 후보 — maxScale 10 × pool max 20 > `max_connections` 100 · 부팅 시 `runMigrations()` 제거 · API 이미지 슬림화 — 는 그대로 유지된다.)

---

## 12. 완료 기준 대조 (§15)

| 완료 기준 | 결과 |
|---|:---:|
| orphan proxy 안전 대상 삭제 완료 | ✅ 2/2 |
| 미참조 SSL cert 안전 대상 삭제 완료 | ✅ 9/9 |
| ACTIVE 리소스 손실 0 | ✅ |
| UNKNOWN 0 | ✅ |
| production forwarding rule 2건 유지 | ✅ |
| HTTP → HTTPS redirect 정상 | ✅ 13/13 도메인 301 |
| TLS 정상 | ✅ 전 도메인 handshake 성공 |
| Cloud Run · API · DB 정상 | ✅ 12/12 Ready · `/health` 200 · DB healthy · 로그인 200 |
| 신규 ERROR 0 | ✅ ERROR 0 · LB 5xx 0 |

**URL map · backend · NEG · static IP 추가 삭제는 별도 후속 WO 로 분리한다.**

---

## 13. 작업 절차상 이탈 사항 (숨기지 않고 기록)

WO §2 는 "최신 `main` 기준 **별도 worktree**" 를 지시했으나, 별도 worktree 를 만들지 않고 기존 `main` 체크아웃에서 작업했다.

- 이유 1: CLAUDE.md §1 이 "현재 운영 단계에서는 **main 직접 작업**이 기본" 으로 규정하며, git 은 이미 `main` 이 체크아웃된 상태에서 동일 브랜치의 second worktree 를 허용하지 않아 별도 브랜치 생성이 강제된다.
- 이유 2: 이번 WO 의 저장소 산출물은 **신규 CHECK 문서 1개**뿐이라 다른 세션 WIP 와 경로가 겹치지 않는다.
- 대체 안전장치: 다른 세션의 dirty 파일을 일절 건드리지 않고, `git pull --ff-only` 전 incoming 커밋과 dirty 파일의 경로 중첩 0 을 확인했으며, stage 는 path-specific 으로만 수행했다 (`git add .` 미사용).

---

*작성: 2026-08-19 · WO-O4O-GCLB-ORPHAN-PROXY-AND-SSL-CERT-CLEANUP-V1*
