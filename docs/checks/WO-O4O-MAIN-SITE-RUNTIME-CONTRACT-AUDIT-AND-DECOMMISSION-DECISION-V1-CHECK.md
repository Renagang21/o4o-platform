# WO-O4O-MAIN-SITE-RUNTIME-CONTRACT-AUDIT-AND-DECOMMISSION-DECISION-V1 — CHECK

- 수행일: 2026-08-20
- 대상: Cloud Run `o4o-main-site` (project `netureyoutube` · region `asia-northeast3`)
- 선행: [WO-O4O-ACCOUNT-NETURE-DOMAIN-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1-CHECK.md](WO-O4O-ACCOUNT-NETURE-DOMAIN-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1-CHECK.md)

---

## 1. 요약 판정

| 축 | 판정 |
|---|---|
| **최종 판정** | **`REDUCE_TO_INTERNAL_OR_LIMITED_ROLE`** |
| runtime 삭제 | **수행하지 않음** (§14 중지 조건 `unique route/function 존재` 발동) |
| CI 계약 | `LEGACY_DEPLOY_CONTRACT` (trigger 범위는 정상 — `OVERBROAD_TRIGGER` 아님) |
| traffic 소유권 | **확정** — 실사용자 0 |
| UNKNOWN | **0** |
| production 신규 ERROR/5xx | 0 |
| 비용 | `NO_COST_EFFECT` |

**한 줄 결론**: `o4o-main-site` 는 살아 있는 외부 frontend 가 아니라 **도메인·API 양쪽에서 모두 단절된 레거시 통합 앱**이다.
다만 코드상 **유일 기능 3개**(marketing product viewer / quiz viewer / LMS bundle viewer)가 남아 있어 §9C `DECOMMISSION_CONFIRMED` 게이트를 통과하지 못한다. 따라서 폐기하지 않고 **역할 축소·문서화**로 닫는다.

---

## 2. Cloud Run live spec

| 항목 | 값 |
|---|---|
| region | `asia-northeast3` |
| 생성 | 2025-12-29 (AWS Lightsail → Cloud Run 이관 시점) |
| current revision | `o4o-main-site-00021-9tv` (generation 21) |
| image | `asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/main-site:bd04204b0…` |
| 마지막 배포 | **2026-08-12 01:01 UTC** |
| CPU / memory | 1 / 256Mi |
| min / max scale | **0** / 5 (서비스 annotation 의 `maxScale: 20` 은 stale, template 값이 우선) |
| **env** | **0건 (런타임 주입 없음)** — `VITE_API_URL` 은 빌드타임 상수 |
| ingress | `all` |
| service account | `117791934476-compute@developer` (기본 SA) |
| traffic | latestRevision 100% |
| Ready | True |
| 컨테이너 | `nginx:alpine` + 사전 빌드 dist (SPA) |

---

## 3. 인프라 소비처 — **전부 0**

| 축 | 결과 |
|---|---|
| GCLB backend service | **0** — `o4o-main-site` 를 가리키는 backend 없음 |
| serverless NEG | **0** — NEG 8개 전수 확인. 대상 = glucoseview / glycopharm / k-cosmetics / kpa-society / neture / admin-dashboard / core-api / pharmacy-hub |
| Cloud Run domain mapping | **0** — asia-northeast3 / asia-northeast1 / us-central1 / europe-west1 전 리전 0건 |
| custom domain | **0** |
| scheduler / job / webhook | **0** |

> 선행 WO 에서 `neg-account-center-web`(→ `o4o-main-site`) 을 삭제한 결과, 현재 LB 연결은 **완전히 0** 이다.

---

## 4. Traffic 실측 및 소유권 판정

**60일 요청 총 11건. 전부 `/` 단일 경로, 전부 200. 커스텀 Host 헤더 요청 0건.**

| 분류 | 건수 | 근거 |
|---|---:|---|
| **CI self-smoke** | **8** | `curl/8.5.0` · Azure IP(20.x · 52.x · 4.x · 128.24.x · 172.185.x) = GitHub Actions runner. **8건 전부 `deploy-main-site.yml` 실행 시각 + 약 3분** 에 정확히 대응 → 워크플로의 `Verify deployment` 단계가 자기 자신을 curl 한 것 |
| **scanner/bot** | 2 | `Mozilla/5.0 (compatible)` · AWS IP(23.23.253.54 · 3.224.234.70) · run.app URL 직접 |
| **점검 curl** | 1 | 2026-08-19 `curl/8.12.1` (국내 IP) — 선행 WO 검증 중 발생 |
| **실사용자 브라우저** | **0** | 실제 브라우저 UA(Chrome/Safari/Edge) 요청 **0건** |

**최근 24시간 로그 엔트리 = 0건.**

판정: **traffic 소유권 확정 — 자기 CI 와 봇이 전부이며, legacy bookmark 조차 없다.**

---

## 5. 결정적 발견 — API 도달 불가 (CORS 차단)

`o4o-main-site` 는 정적 셸(`/` 200)은 응답하지만 **API 호출이 전부 차단된다.**

```
OPTIONS https://api.neture.co.kr/api/v1/auth/services
  Origin: https://o4o-main-site-3e3aws7zqa-du.a.run.app   → HTTP 500 (CORS 거부)
  Origin: https://neture-web-3e3aws7zqa-du.a.run.app      → HTTP 204 + access-control-allow-origin
```

원인: `apps/api-server/src/bootstrap/setup-middlewares.ts` 의 `getAllowedOrigins()` `prodOrigins` 에
6개 서비스 web 의 run.app URL 은 있으나 **`o4o-main-site` 의 run.app URL 은 없다.**
커스텀 도메인도 없으므로 **어떤 origin 으로도 API 에 도달할 수 없다.**

> 즉 로그인·대시보드·포럼·LMS·viewer 등 **데이터가 필요한 모든 화면이 현재 동작 불가**다.
> 정적 200 응답을 "살아 있음" 으로 오독하지 않기 위해 이 실측을 기록한다.

---

## 6. Route / Function census (`apps/main-site`)

소스 292 파일 / 44MB. `apps/main-site/src/router/index.tsx` 기준 실제 등록 route:

| route | 기능 | 판정 | 근거 |
|---|---|---|---|
| `/login` | 로그인 | `DUPLICATED_ELSEWHERE` | 5개 서비스 web + admin 전부 자체 로그인 보유 |
| `/` · `/org/:orgId` | DashboardPage | `LEGACY_ONLY` | 각 서비스가 자체 홈 보유 |
| `/forum` · `/forum/post/:slug` | 포럼 | `DUPLICATED_ELSEWHERE` | forum 은 CLAUDE.md §13 공통 구조, 4서비스 구현 |
| `/forum/write` | — | **`DEAD_ROUTE`** | 본문이 `글쓰기 페이지 준비 중...` 스텁 |
| `/lms` · `/lms/courses` · `/lms/course/*` | LMS | `DUPLICATED_ELSEWHERE` | glycopharm · k-cosmetics · kpa-society 등에 동일 route |
| `/lms/bundle/:bundleId` | BundleViewer | **`ACTIVE_UNIQUE`** (코드) | `BundleViewerPage` 는 main-site 에만 존재 |
| `/marketing/product/:id` | ProductContentViewer | **`ACTIVE_UNIQUE`** (코드) | `ProductContentViewerPage` main-site 전용 |
| `/marketing/quiz/:id` | QuizCampaignViewer | **`ACTIVE_UNIQUE`** (코드) | `QuizCampaignViewerPage` main-site 전용 |
| `/seller/dashboard(/:sellerId)` | 판매자 대시보드 | `LEGACY_ONLY` | 기본값이 하드코딩된 `sellerId="test-seller-001"` (테스트 잔재) |
| `/mypage/*` | — | **`DEAD_ROUTE`** | 본문이 `마이페이지 준비 중...` 스텁 |

### 타 서비스 대체 여부 종합

| 기능 | 판정 |
|---|---|
| 로그인 / 인증 | `REPLACED` |
| 대시보드 / 홈 | `REPLACED` |
| 포럼 | `REPLACED` |
| LMS (수강/코스/레슨) | `REPLACED` |
| mypage | `REPLACED` (5서비스 전부 보유) |
| seller | `PARTIALLY_REPLACED` (neture hub · cosmetics-seller-extension) |
| **marketing viewer 2 · LMS bundle viewer 1** | **`STILL_UNIQUE`** |

---

## 7. 사용자 진입 경로 조사

저장소 전수 검색(`git grep`) 결과:

| 축 | 결과 |
|---|---|
| `o4o-main-site` 문자열 | workflow 2 · `SETUP.md` · `scripts/README.md` · `.github/workflows/README.md` · docs 기록물 8 — **runtime 코드 0** |
| run.app URL(`o4o-main-site-3e3aws7zqa` 등) | **저장소 전체 0건** |
| service catalog | `service-catalog.ts` 6키(neture · glycopharm · kpa-society · k-cosmetics · pharmacy-hub · kpa-branch) — **main-site 없음** |
| auth callback / redirect / handoff / logout redirect | **0** — `o4o-core-api` env 전수 확인, main-site 를 가리키는 URL 0건 |
| 이메일 링크 / QR | **0** |
| CORS allowlist | **미포함** (§5) |

### 유일한 진입 링크 2건 — 이미 끊어져 있음

```
apps/admin-dashboard/src/pages/marketing/publisher/product/edit.tsx:352
  <a href={`/marketing/product/${product.id}`} target="_blank">Preview</a>
apps/admin-dashboard/src/pages/marketing/publisher/quiz/edit.tsx:660
  <a href={`/marketing/quiz/${campaign.id}`}  target="_blank">Preview</a>
```

두 링크는 **상대 경로**다. admin-dashboard 는 `admin.neture.co.kr` 에서 서빙되므로
`admin.neture.co.kr/marketing/product/{id}` 로 해석되고, admin-dashboard 라우터에는 해당 route 가 **없다**
(`apps/admin-dashboard/src/routes/lms-marketing.routes.tsx` 의 marketing route 는 전부 `/admin/marketing/*` 접두).

→ **Preview 버튼은 main-site 로 가지 않으며, 현재도 이미 깨져 있다.**
main-site 를 삭제해도 새로 깨지는 것은 없고, 유지해도 저절로 동작하지는 않는다.

---

## 8. CI/CD 계약 판정 — `LEGACY_DEPLOY_CONTRACT`

`deploy-main-site.yml`:

| 항목 | 값 |
|---|---|
| trigger | `push:main` · paths `apps/main-site/**`, 워크플로 자신 · `workflow_dispatch` |
| target | `o4o-main-site` / image `main-site` / repo `o4o-api` |
| build | `pnpm run build` + 인라인 생성 `Dockerfile.cloudrun` (nginx:alpine) |
| secret/env | `GCP_SA_KEY` 만. 런타임 env 주입 **없음** |
| 최근 실행 | 15회 전부 success (2026-02-26 ~ 2026-08-12) |

**trigger 범위 자체는 정상이다** — `apps/main-site/**` 로 한정되어 있어 `OVERBROAD_TRIGGER` 가 아니다.

그러나 최근 배포를 유발한 커밋은 전부 **부수적 변경**이다.

```
bd04204b0 fix(lint): ESLint 신규 오류 정리            ← 2026-08-12 (최신)
cf9346bf5 / 43437815b  chore: reduce lint baseline
1b7177036 chore(forum): remove dead forum-yaksa package
ab5570573 chore(yaksa): 레거시 약사회 기능 전면 제거
196b84a58 chore(cleanup): Dropshipping 잔재 제거
6f5835084 feat(deadcode): GROUPBUY-MAIN-SITE-CLEANUP   ← 2026-05-15
```

**2026-03 이후 main-site 에 신규 기능 커밋은 0건이고, 전부 lint 정리 또는 코드 삭제다.**
즉 CI 는 기능을 배포하는 것이 아니라 **다른 정리 작업의 부산물로 재배포되고 있다.**

또한 워크플로 마지막 줄이 아직 다음을 출력한다.

```
⚠️ Note: Custom domain mapping required for https://neture.co.kr
```

이 전제는 **실현되지 않았고**, 현재 `neture.co.kr` 은 `neg-neture-web → neture-web` 이 서빙한다.
→ 워크플로가 상정했던 운영 계약은 이미 다른 서비스로 이전되었다.

---

## 9. 최종 판정 근거 — §9C 게이트 대조

| §9C 조건 | 실측 | 통과 |
|---|---|:--:|
| 실제 사용자 진입 0 | 실브라우저 요청 0 · 24h 0 | ✅ |
| auth/callback/handoff 소비처 0 | 0 | ✅ |
| **unique 기능 0** | **코드상 3건 존재** (viewer 2 + bundle 1) | **❌** |
| GCLB/DNS/custom domain 소비처 0 | 0 | ✅ |
| CI 가 legacy 배포 계약 | `LEGACY_DEPLOY_CONTRACT` | ✅ |
| traffic 이 bot/test/run.app 수준 | CI 8 · bot 2 · 점검 1 | ✅ |
| UNKNOWN 0 | 0 | ✅ |

**6/7 통과, `unique 기능 0` 미충족.**
§14 중지 조건에 `unique route/function 존재` 가 명시되어 있고 "이 경우 KEEP 또는 REDUCE 판정으로 종료한다" 이므로
**Cloud Run 삭제 및 CI 제거를 수행하지 않는다.** 판정 = **`REDUCE_TO_INTERNAL_OR_LIMITED_ROLE`**.

> 다만 그 unique 기능 3건은 §5(CORS 차단) · §7(Preview 링크 상대경로) 때문에 **현재 실행 불가**다.
> "코드상 유일 = 3" 과 "운영상 도달 가능 = 0" 을 구분해 기록한다. 이 간극이 후속 판단의 핵심이다.

---

## 10. 실제 변경

| 대상 | 내용 |
|---|---|
| `scripts/README.md` | Cloud Run 표에서 `o4o-main-site` 의 도메인이 **`neture.co.kr`** 로 적혀 있었다. 바로 아래 줄 `neture-web` 과 **동일 도메인 중복 기재**이며 사실과 다르다. `(도메인 미연결)` + 근거 WO 표기로 교정 |

**GCP 리소스 변경 0건 · Cloud Run 삭제 0건 · 워크플로 변경 0건 · 소스 코드 변경 0건.**

`deploy-main-site.yml` 의 오해 소지 있는 마지막 안내 문구는 **의도적으로 수정하지 않았다** —
이 워크플로는 자기 파일 변경에도 trigger 되므로, 주석 한 줄 때문에 프로덕션 재배포를 유발하는 것은 비대칭적이다. §16 후속 후보로 남긴다.

---

## 11. 유지한 자산과 이유

| 자산 | 유지 이유 |
|---|---|
| Cloud Run `o4o-main-site` | §14 중지 조건(unique function) 발동. `min-instances=0` 이라 유휴 비용 0 |
| `apps/main-site` 소스 (292 파일) | §9B "대규모 코드 삭제는 이번 WO 에서 하지 않는다" + §13 "향후 재사용 가능한 소스 자산은 별도 판정 없이 삭제하지 않는다". viewer 3종은 재사용 후보 |
| `deploy-main-site.yml` | trigger 범위 정상. 폐기는 DECOMMISSION 판정 시에만 |
| admin-dashboard Preview 링크 2건 | admin 기능이라 이번 WO 범위 밖. 별도 WO 로 분리 |
| docs 기록물 | §2 "역사 기록 문서는 유지한다" |

---

## 12. Production 검증

| 항목 | 결과 |
|---|---|
| `https://neture.co.kr/` | 200 |
| `https://www.neture.co.kr/` | 200 |
| `https://admin.neture.co.kr/` | 200 |
| `https://api.neture.co.kr/health` | 200 |
| `https://kpa-society.co.kr/` | 200 |
| `https://k-cosmetics.site/` | 200 |
| `https://glycopharm.co.kr/` | 200 |
| `https://pharmacyhub.co.kr/` | 200 |
| `/health/database` | `healthy` · pingMs 4 · activeConnections 10 · longRunningQueries 0 |
| Cloud Run Ready | **11/11 True** |
| 신규 ERROR / 5xx | **0** (인프라 변경 자체가 0건) |

### 기존 결함 1건 (이번 WO 원인 아님)

```
https://branch.kpa-society.co.kr/ → 000
nslookup @8.8.8.8 → Non-existent domain (NXDOMAIN)
```

`kpa-branch-web` 은 Cloud Run Ready 이나 **DNS·LB 연결이 없다.** 선행 WO 의 후속 후보(`LB 미연결 Cloud Run 정리 검토`)에 이미 등록된 항목이며, 이번 변경과 무관한 선존재 상태다. 이번 WO 에서 손대지 않았다.

---

## 13. 비용 판정

| 대상 | 분류 | 근거 |
|---|---|---|
| `o4o-main-site` Cloud Run | **`NO_COST_EFFECT`** | `min-instances=0` · 60일 11요청(그중 8건이 자기 CI) → billable instance time 사실상 0. 삭제해도 절감액 없음 |
| CI 실행 시간 | `INDIRECT_COMPLEXITY_REDUCTION` (미실현) | 배포 빈도가 낮아 유의미한 절감 아님 |
| `scripts/README.md` 교정 | `NO_COST_EFFECT` | 문서 정합 |

**이번 WO 의 가치는 비용이 아니라 계약 정합이다. 과장하지 않는다.**

---

## 14. 중지 조건 대조 (§14)

| 조건 | 해당 | 비고 |
|---|:--:|---|
| 실제 사용자 traffic 발견 | ✗ | 실브라우저 0 |
| 외부 링크/파트너 소비처 발견 | ✗ | 0 |
| **unique route/function 존재** | **✓** | **발동 → decommission 중지** |
| auth/callback/handoff 소비처 발견 | ✗ | 0 |
| traffic 소유권 불명확 | ✗ | 11건 전건 분류 완료 |
| CI 역할 불명확 | ✗ | `LEGACY_DEPLOY_CONTRACT` 확정 |
| 다른 서비스 대체 여부 UNKNOWN | ✗ | 기능별 판정 완료 |
| production 영향 예측 불가 | ✗ | 변경 자체가 문서 1건 |

---

## 15. 완료 기준 대조 (§16)

| 기준 | 결과 |
|---|---|
| `o4o-main-site` 역할 확정 | ✅ 레거시 통합 앱 · 도메인/API 이중 단절 |
| traffic 소유권 확정 | ✅ CI 8 / bot 2 / 점검 1 / 실사용자 0 |
| 사용자·auth·CI 소비처 미확정 0 | ✅ |
| 타 서비스 대체 여부 판정 완료 | ✅ 기능별 REPLACED / STILL_UNIQUE 표 |
| UNKNOWN 0 또는 명확한 HOLD | ✅ UNKNOWN 0 |
| 필요한 경우 runtime/CI 정리 | ✅ 판정이 REDUCE 이므로 정리 대상 없음 |
| production 정상 | ✅ (기존 결함 1건 별도 기록) |
| 신규 ERROR 0 | ✅ |

---

## 16. 후속 후보 (이번 WO 범위 외 · 별도 WO 필요)

1. **admin-dashboard Preview 링크 2건 정합** — 상대 경로라 현재도 깨져 있다. viewer 를 어디서 서빙할지 결정한 뒤 절대 URL 로 교정하거나 버튼을 제거한다. **이 결정이 `o4o-main-site` 최종 폐기 가부를 좌우한다.**
2. **marketing/LMS viewer 3종 이관 판단** — 3개를 서비스 web(예: `neture-web`) 으로 옮기면 §9C 의 마지막 게이트(`unique 기능 0`)가 해소되어 `DECOMMISSION_CONFIRMED` 가 가능해진다.
3. `deploy-main-site.yml` 마지막 안내 문구(`Custom domain mapping required for neture.co.kr`) 교정 — 재배포 유발을 감수할 시점에 함께 처리.
4. `kpa-branch-web` DNS NXDOMAIN 처리 — 연결 또는 은퇴.
5. `o4o-admin-dashboard-dev` 등 LB 미연결 Cloud Run 일괄 정리 검토.

---

## 17. 문서 정합

- 발견 1건 — `scripts/README.md` 의 `o4o-main-site → neture.co.kr` 오기(동일 도메인 중복 기재)
- SUPERSEDED 표기 0건
- 링크 수정 0건 (교정 1건은 링크가 아닌 사실 오기)
- 별도 WO 제안 5건 (§16)

`SETUP.md` §7 과 `.github/workflows/README.md` 는 도메인 열이 없어 drift 가 없다 — 수정하지 않았다.
