# CHECK-O4O-RETIRED-WEB-RESIDUAL-CLEANUP-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO**: WO-O4O-RETIRED-WEB-RESIDUAL-CLEANUP-V1 · 선행 [CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1](CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1.md) §4 남은 항목

퇴역 웹 서비스(glucoseview-web · signage-player-web) 정리 뒤 남은 잔재 — 미부착 보안정책 · 퇴역 이미지 ·
API CORS origin · player 앱 소스 — 를 제거하고, `www.neture.co.kr/hospital` 을 정식 주소 `neture.co.kr/hospital` 로 보낸다.

---

## 1. 인프라 (2026-10-05 · production · 코드로 관리되지 않음)

### 1-1. Cloud Armor 보안정책 — 6개 삭제

삭제 직전 global backend service 10개 · backend bucket 0개의 `securityPolicy` / `edgeSecurityPolicy` 를 다시 읽어 부착 0 을 확인했다.
6개 모두 GCP 가 backend 생성 때 자동으로 만든 기본 정책(throttle 500/60s + allow)이고 사용자 규칙은 없다. 정의는 삭제 전 `security-policies export` 로 백업했다(로컬).

| 삭제 | 원래 대상 backend |
|---|---|
| `default-security-policy-for-backend-account-center-web` | `backend-account-center-web` (없음) |
| `default-security-policy-for-backend-glycopharm-web` | `backend-glycopharm-web` (없음) |
| `default-security-policy-for-backend-service-backend-neture-web` | 구 `backend-neture-web` (없음) |
| `default-security-policy-for-backend-siteguide-core` | `backend-siteguide-core` (없음) |
| `default-security-policy-for-o4o-admin-web-backend` | 구 admin backend (없음) |
| `default-security-policy-for-o4o-admin-web-backend-http` | 구 admin backend (없음) |

유지 · 사후 확인: `default-security-policy-for-backend-k-cosmetics-web` → `backend-k-cosmetics-web`, `default-security-policy-for-backend-neture-web-http` → `backend-neture-web-http` 부착 그대로. 정책 목록 = 이 2개.

### 1-2. 이미지 — `gcr.io` (Artifact Registry `us/gcr.io`) package 3개 삭제

삭제 직전 Cloud Run 서비스 10개 · Job(`o4o-api-migrations`) · 전체 revision 의 이미지 참조를 다시 읽어 소비처 0 을 확인했다.
저장소 안 참조는 과거 CHECK 기록 1곳뿐이다. 퇴역 서비스라 rollback 대상 이미지도 없다.

| 삭제 package | 태그 수 | 비고 |
|---|---|---|
| `glucoseview-web` | 10 | 서비스 삭제 완료 |
| `signage-player-web` | 69 | 서비스 삭제 완료 · cleanup 정책(최근 10개 KEEP)으로는 사라지지 않음 |
| `glycopharm-web` | 0 | 빈 package |

보존: `siteguide-web`(siteguide 결정 대기) · 운영 서비스 이미지 전부 · `o4o-api` 저장소 · 추가 발견 미사용 이미지(`neture-api` · `github.com/renagang21/o4o-platform` · `o4o-api/neture-web` · `o4o-api/admin-dashboard-dev` — 별도 판정).

### 1-3. URL map `o4o-global-lb` — `www.neture.co.kr/hospital` → apex 301

최신 export(fingerprint 포함)를 백업하고, 조사 시점 export 와 내용이 같음을 확인한 뒤 두 곳만 바꿔 `validate`(loadSucceeded · testPassed) → `import` 했다.
import 후 다시 export 해 의도한 내용과 일치함을 확인했다.

| 변경 | 내용 |
|---|---|
| host rule `www.neture.co.kr` | `path-matcher-neture` → `path-matcher-www-neture` |
| 신규 path matcher `path-matcher-www-neture` | default = `backend-neture-web-http` · `/hospital` · `/hospital/*` → `urlRedirect { hostRedirect: neture.co.kr, httpsRedirect, MOVED_PERMANENTLY_DEFAULT, stripQuery: false }` |

`path-matcher-neture` 는 community · funding · supplier 가 같이 쓰므로 그대로 두었다(여기에 규칙을 넣으면 세 host 에도 적용된다).
www 전체 apex redirect 는 하지 않았다 — 토큰 저장이 origin 단위라 www 세션이 끊긴다.

| 검증 | 결과 |
|---|---|
| `www…/hospital` | 301 `Location: https://neture.co.kr:443/hospital` |
| `www…/hospital/x/y?a=1&b=2` | 301 `Location: https://neture.co.kr:443/hospital/x/y?a=1&b=2` — 경로 · query 보존 |
| redirect 추적 `www…/hospital/?a=1` | 1 hop → 200 "병원약국" |
| `www…/` · `www…/hospitality` | 200 neture-web (redirect 아님) |
| `neture.co.kr/hospital/` | 200 "병원약국" |
| `community…/hospital` · `community…/` · `funding…/` · `supplier…/` | 200 neture-web (변화 없음) |

`Location` 의 `:443` 은 LB 가 기본 포트를 명시하는 것이다 — 브라우저 origin 은 `https://neture.co.kr` 과 같다.

## 2. 코드 (PR)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/bootstrap/setup-middlewares.ts` | CORS `prodOrigins` 에서 `https://signage.neture.co.kr` · `https://signage-player-web-3e3aws7zqa-du.a.run.app` · `https://hospital.neture.co.kr` 제거. hospital 주석을 정식 주소(`neture.co.kr/hospital` → origin `https://neture.co.kr`, 이미 등록)로 갱신 |
| `services/signage-player-web/**` | 앱 소스 삭제 (30 파일). 소스 밖 import 0 |
| `pnpm-lock.yaml` | importer `services/signage-player-web` 제거 + 그 importer 만 쓰던 dev 패키지(eslint 9.39.1 계열 · typescript-eslint 8.48.0 계열 · globals 16.5.0 · hermes-* · zod-validation-error 등) 정리. **319줄 삭제 · 추가 0** — 다른 패키지 버전 변경 없음 |
| `scripts/ci/detect-affected.mjs` | `NON_RUNTIME_GLOBAL_PREFIXES` 에 `services/signage-player-web/` 추가 — workspace 에서 빠진 은퇴 디렉터리 diff 가 "매핑 불가 → 전 서비스 fallback" 이 되지 않게 한다(기존 계약 W7b 유지). 어떤 Dockerfile 도 `services/` 를 통째로 COPY 하지 않음을 확인 |
| `apps/api-server/src/__tests__/channels-stack-retirement.spec.ts` | player `App.tsx` 를 읽던 2 케이스 → "player 앱 소스 없음" 확인으로 교체 |
| `apps/api-server/src/__tests__/signage-player-web-deployment-contract.spec.ts` | "소스는 유지" 주석 정정 + 소스 · lockfile importer 부재 assert 추가 |

보존: Tablet ScreenSet 경로 · `/api/signage/:sk/active-content`(store-web) · store-ui-core / web-store 의 `signage-player`("TV 재생") 메뉴 키 · `hospital-pharmacy-web` run.app origin.
이번 범위에서 뺀 것(불필요한 재배포 유발): `services/web-hospital-pharmacy/Dockerfile` ARG 기본값 · `deploy-web-services.yml` L99 주석 · `apps/admin-dashboard/vite.config.ts` dev `allowedHosts` 의 `signage.neture.co.kr`.

### 2-1. 로컬 검증

| 검사 | 결과 |
|---|---|
| api-server jest — channels-stack-retirement · signage-player-web-deployment-contract · lecture/store/unified-store CORS 관련 spec | 5 suites PASS |
| `node --test scripts/ci/__tests__/*.test.mjs` | 351/351 PASS (W7b 포함) |
| `pnpm install --lockfile-only` | 버전 변경 0 (임시 cache-dir 사용 — 로컬 메타데이터 캐시가 오래돼 google-auth-library 11.x 를 못 보던 문제 회피) |
| `deploy-risk --base origin/main --head HEAD` | **LEVEL_3** — 아래 §3 |

## 3. 배포 판정

`deploy-risk` base/head 결과: `service-deletion`(삭제된 `Dockerfile` · `package.json`) · `deploy-infra`(삭제된 `Dockerfile` · `nginx.conf`) 는 어떤 운영 서비스에도 귀속되지 않는 pipeline hit 이고,
lockfile `packages/snapshots` 정리는 "의존성 해석 변경" 으로 판정돼 api · admin · web 8개가 영향 대상 · LEVEL_3(Delivery HOLD → promote 1회)이 된다.
web 8개 · admin 의 런타임 소스는 바뀌지 않는다(삭제된 패키지는 player 전용 dev 도구).

## 4. 배포 · 운영 검증

(merge · promote 뒤 기록)

## 5. 남은 항목

- siteguide 도메인 · 인증서 · `siteguide-web` 이미지 — 사용 방향 결정 대기
- pharmacy-hub 서버 · 도메인 · QR 4행 — 약국 commerce 트랙(PR #308)에서 이전 후 정리
- player 전용이던 API `/api/signage/:sk/channels/:id/{heartbeat,playback-logs,errors}` — 별도 판정
- 추가 발견 미사용 이미지 4종 — 별도 판정
- 원격 branch 정리 목록 — GitHub 에서 삭제(로컬 `push --delete` 차단)
