# WO-O4O-KCOSMETICS-CERTIFICATE-VERIFICATION-DOMAIN-FALLBACK-FIX-V1 — CHECK

- **작업일**: 2026-08-19
- **기준 main**: `c4ee67595`
- **작업 방식**: 별도 worktree (`/c/tmp/wt-kcos-cert`), production write 0
- **성격**: 코드 수정 + unit(contract) test + production 검증

---

## 1. 원인 재확인

`apps/api-server/src/modules/lms/controllers/CertificateController.ts` 안의 private 함수
`resolveVerificationBase()` 가 `k-cosmetics` 의 코드 fallback 으로
`https://k-cosmetics.co.kr` 를 사용하고 있었다.

배포된 `o4o-core-api` 의 환경변수 21개를 전수 확인한 결과 `URL` / `FRONT` 를 포함하는 키가
**0개**다. 즉 `KCOSMETICS_FRONTEND_URL` 도 `FRONTEND_URL` 도 설정돼 있지 않으므로
production 에서 실제로 선택되는 값은 **코드 fallback 그 자체**였다.

```
gcloud run services describe o4o-core-api ... → env 21건, URL/FRONT 매칭 0건
```

## 2. 도메인 실측 (중지 조건 §10 판정)

| 도메인 | DNS A | HTTP | 실체 |
|---|---|---|---|
| `k-cosmetics.site` | `136.110.132.35` (= `neture-static-ip`, O4O GCLB) | 200 | **O4O 정본 production** |
| `k-cosmetics.co.kr` | `203.245.12.100/113/126`, `183.111.139.237` | 200 | **제3자 Cafe24 몰** (`Server: openresty`, mall_id `anbkorea2017`) |
| `www.k-cosmetics.co.kr` | 동일 대역 | — | 동일 |

`k-cosmetics.co.kr` 은 **O4O 가 운영하는 서비스가 아니다.** 따라서 §10 의
"`k-cosmetics.co.kr` 이 실제 별도 운영 서비스" 중지 조건에 해당하지 않는다.
오히려 현재 fallback 은 수료증 검증 QR 을 **무관한 제3자 쇼핑몰로 보내고 있었다** — 수정 필요성이 더 강하다.

`.github/workflows/deploy-web-services.yml:47` 의 `VITE_SERVICE_URL_K_COSMETICS: https://k-cosmetics.site`
와도 일치한다.

## 3. `resolveVerificationBase()` 최종 계약

정의 위치를 `apps/api-server/src/modules/lms/utils/certificate-verification-base.ts` 로 분리하고
`export` 했다 (계약을 unit test 로 고정하기 위함). **동작 자체는 동일하다.**

| serviceKey | 1순위 | 2순위 | 코드 fallback |
|---|---|---|---|
| `k-cosmetics` | `KCOSMETICS_FRONTEND_URL` | `FRONTEND_URL` | **`https://k-cosmetics.site`** (변경) |
| `glycopharm` | `GLYCOPHARM_FRONTEND_URL` | `FRONTEND_URL` | `https://glycopharm.co.kr` (미변경) |
| `kpa-society` / `null` / unknown | `KPA_FRONTEND_URL` | `FRONTEND_URL` | `https://kpa-society.co.kr` (미변경) |

- 호출부는 **정확히 1곳**: `CertificateController.downloadPdf()` (수정 후 `:283`).
  `verificationUrl = ${base}/certificate/verify/${certificate.id}` 를 만들어
  `generateCertificatePdf()` 에 넘기고, `certificatePdf.ts:58` 에서 **QR 코드 생성에만** 쓰인다.
- 이메일·화면은 이 URL 을 소비하지 않는다. 프론트(`MyCertificatesPage.tsx:50`)는
  `window.location.origin` 으로 자체 생성하므로 backend resolver 와 무관하다.
- 검증 API 는 `GET /api/v1/lms/certificates/verify/:verificationCode` (public) 이며 URL 문자열을 저장하지 않는다.

## 4. 기존 데이터 판정 (§9) — **dynamic only**

production DB(`o4o_platform`, read-only SELECT) 실측:

| 확인 항목 | 결과 |
|---|---|
| `%certificat%` 테이블 | `lms_certificates` 1개뿐 |
| `%verification%url%` 컬럼 | `lms_certificates."verificationUrl"`, `service_legal_profiles.business_info_verification_url` |
| `lms_certificates` 전체 row | **0** |
| `lms_certificates."verificationUrl"` non-null | **0** |
| 그중 `k-cosmetics.co.kr` 포함 | **0** |
| `service_legal_profiles` (2 row) 중 `k-cosmetics.co.kr` 포함 | **0** |

코드상으로도 `CertificateService.issueCertificate()` 는 `verificationUrl` 을 **쓰지 않는다**
(발급 시 저장 경로 없음). URL 은 PDF 다운로드 시점에 매번 계산된다.

→ **`dynamic only`. 잘못 저장된 DB URL 0건. 기존 발급 수료증 파손 위험 0 (발급분 자체가 0건).**
→ 대량 교정·migration 불필요.

## 5. Migration / Seed 판정 (§6) — **수정하지 않음**

`apps/api-server/src/migrations/1736611201000-SeedNetureData.ts:258` 에
`'https://k-cosmetics.co.kr/store/beauty-cosmetic'` 이 있다.

| 판정 근거 | 실측 |
|---|---|
| 이미 실행 완료? | `typeorm_migrations` 에 `SeedNetureData` **1건 기록** |
| 재실행되는가? | 아니오 (TypeORM 은 기록된 migration 을 재실행하지 않음) |
| 현재 데이터에 남아있는가? | `neture_partnership_requests` 중 `k-cosmetics.co.kr` 포함 row **0건** (이미 제거됨) |
| 성격 | `'seller-3' / '뷰티코스메틱' / beauty@cosmetic.com` 등 **가공 데모 데이터**, 검증 링크 계약과 무관 |

→ **기록물 성격 + 재실행 없음 + 잔존 데이터 0** 이므로 §6 에 따라 **수정하지 않는다.**

`apps/api-server/dist/**` 에도 같은 문자열이 있으나 `dist/` 는 `.gitignore:55` 로 추적 제외된
로컬 빌드 산출물이다. 배포는 CI 재빌드이므로 별도 조치 불필요.

## 6. 수정 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/modules/lms/utils/certificate-verification-base.ts` | **신규** — resolver 분리 + `k-cosmetics` fallback 을 `k-cosmetics.site` 로 교정 |
| `apps/api-server/src/modules/lms/controllers/CertificateController.ts` | private 함수 제거 → util import 로 대체 (호출부 시그니처 동일) |
| `apps/api-server/src/modules/lms/utils/__tests__/certificate-verification-base.test.ts` | **신규** — contract test 6건 |

**env 추가·변경: 없음.** §3 "정본이 코드 fallback 으로 충분하면 env 추가를 강제하지 않는다" 에 따라
Cloud Run env 를 늘리지 않았다. GCLB/DNS/forwarding rule 변경 없음.

## 7. Test 결과 (§7)

`apps/api-server` — `npx jest --testPathPattern=certificate-verification-base`

```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

| case | 내용 | 결과 |
|---|---|---|
| 1 | `KCOSMETICS_FRONTEND_URL` 설정 시 최우선 | PASS |
| 2 | `FRONTEND_URL` 만 설정 시 그 값 | PASS |
| 3 | 둘 다 없으면 `https://k-cosmetics.site` (`k-cosmetics.co.kr` 미포함) | PASS |
| 4 | glycopharm / kpa-society / null / unknown 회귀 없음 | PASS |
| 4-b | 서비스별 env 가 다른 서비스로 새지 않음 | PASS |
| 5 | 최종 URL host `k-cosmetics.site` + path `/certificate/verify/{id}` + query 없음 | PASS |

타입 검증: `npx tsc --noEmit -p tsconfig.json` → **0 error**.
(worktree 는 node_modules 를 junction 으로 연결했으므로 `--typeRoots` 를 실제 경로로 지정해 실행했다.)

## 8. Production 검증 (§8)

| 항목 | 결과 |
|---|---|
| 배포 리비전이 본 커밋 포함 | 아래 §8-1 |
| 생성 URL host | `k-cosmetics.site` |
| `k-cosmetics.co.kr` 신규 생성 | **0건** (코드에 리터럴 잔존 0, 저장 경로 없음) |
| HTTP 응답 | `https://k-cosmetics.site/certificate/verify/{id}` → **200** |
| QR/링크 소비 경로 | PDF QR 단일 경로 확인 (`certificatePdf.ts:58`) |
| Cloud Run ERROR | §8-1 |
| 실제 수료증 1건 end-to-end | **수행 불가 — production `lms_certificates` 0건.** 수료증을 새로 만들려면 production write 가 필요하므로 수행하지 않았다 (숨기지 않고 기록). |

### 8-1. 배포 후 실측 (2026-08-19 03:10 KST 기준 UTC)

- commit `ea392d071` push → **Deploy API Server (Cloud Run) run 32210818979 = success**
- 신규 리비전 **`o4o-core-api-03377-cwj`** (2026-08-19T03:09:59Z), 트래픽 100% 이관 완료
  - image `api-server@sha256:159f816f...3da4bd`
- 배포 후 env 재확인: 총 21건, `URL`/`FRONT` 매칭 **0건** → 코드 fallback 이 그대로 유효
- `GET https://api.neture.co.kr/health` → **200**
- 신규 리비전 severity>=ERROR → **0건**
- 신규 리비전 `httpRequest.status>=500` → **0건**
  (조회된 500 1건은 배포 **이전** 리비전 `o4o-core-api-03376-ztj` 의 03:00:16
  `/api/v1/lms/courses/courses?serviceKey=glycopharm` 로, 이번 변경과 무관한 기존 결함이다.
  경로가 `courses/courses` 로 중복돼 있다 — 이번 WO 범위 밖, 별도 WO 후보로 기록만 한다.)
- 소스 잔존 `k-cosmetics.co.kr` (dist 제외 3건, 모두 URL 생성 경로 아님):
  - `migrations/1736611201000-SeedNetureData.ts:258` — §5 판정에 따라 미변경
  - `utils/certificate-verification-base.ts:15` — 주석
  - `utils/__tests__/certificate-verification-base.test.ts:44` — 회귀 방지 단언

## 9. 부수 관측 (이번 WO 에서 변경하지 않음)

- `FRONTEND_URL` 은 `packages/mail-core/src/mail.service.ts` 등 여러 곳에서
  `neture.co.kr` / `admin.neture.co.kr` 기본값과 함께 쓰이는 **범용 env** 다.
  만약 이 값이 API 서버에 설정되면 k-cosmetics/glycopharm 검증 링크가 모두 그 값으로 끌려간다.
  현재 미설정이라 문제되지 않지만, 향후 `FRONTEND_URL` 을 API 서버에 넣을 때는
  **서비스별 env 3개를 함께 설정**해야 한다. (별도 WO 후보)
- `k-cosmetics.co.kr` 은 제3자 Cafe24 몰이다. O4O 문서·코드에서 이 도메인을
  자사 도메인처럼 쓰는 표기가 남아있지 않은지는 이번 범위 밖.

## 10. 완료 기준 대조 (§12)

| 기준 | 결과 |
|---|---|
| production fallback = `k-cosmetics.site` | ✅ |
| `k-cosmetics.co.kr` 신규 생성 = 0 | ✅ (리터럴 제거, 저장 경로 없음) |
| 다른 서비스 회귀 = 0 | ✅ (glycopharm/kpa fallback 미변경 + test case 4/4-b) |
| UNKNOWN = 0 | ✅ (env·DB·seed·소비처 모두 실측 확정) |
| production 검증 PASS | §8 — 실제 수료증 e2e 만 데이터 0건으로 미수행 |
| LB/DNS/forwarding rule 미포함 | ✅ 변경 0 |
