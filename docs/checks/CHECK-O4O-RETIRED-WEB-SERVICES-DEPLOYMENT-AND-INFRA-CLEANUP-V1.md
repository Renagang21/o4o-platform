# CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO**: WO-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1 · 선행 IR-O4O-LEGACY-WEB-SERVICES-RETIREMENT-ASSESSMENT-V1(화면 보고) · CHECK-O4O-SHARED-CERTIFICATE-SEPARATION-V1 (PR #305)

RETIRE_READY 로 판정된 `glucoseview-web` · `signage-player-web` 을 배포 대상과 Google Cloud 에서 정리하고,
`hospital.neture.co.kr` LB host rule 잔재를 제거한다. 다음 배포로 서비스가 재생성되지 않는 상태까지가 완료 조건이다.

---

## 1. 배포 경로 정리 (코드)

| 파일 | 변경 |
|---|---|
| `.github/workflows/deploy-web-services.yml` | `deploy-signage-player` job · `VITE_API_URL_SIGNAGE_PLAYER` env · detect-changes output · dispatch 선택지 · `all`/단일 분기 · summary needs/출력 제거 (job 9 → 8) |
| `scripts/ci/detect-affected.mjs` | `WEB_SERVICES` 에서 `signage-player` 제거 — 소스 디렉터리 변경은 "Web consumer 0, 무영향"(fallback 아님) |
| `scripts/ci/deploy-risk.mjs` | `WEB_CLOUD_RUN` 매핑 제거 |
| `scripts/ci/__tests__/*` | W3 · W7 갱신, W7b(은퇴 디렉터리 변경 → 배포 0 · fallback 아님) 추가, R6b 갱신, gate 개수 9 → 8 |
| `apps/api-server/src/__tests__/signage-player-web-deployment-contract.spec.ts` | 채택 계약 → **은퇴 계약**(workflow job · registry · risk 매핑 재유입 금지) |
| `.github/workflows/README.md` · `docs/services/README.md` | 웹 8종 · 배포 은퇴 표기 |

`glucoseview-web` 은 이미 어떤 workflow · registry 에도 없다(재생성 경로 0) — 코드 변경 없음.
`delivery.yml` · `promote.yml` · `deploy-orchestrate.mjs` 는 registry 에서 파생되므로 직접 수정 없음.

보존: `services/signage-player-web` 소스(앱 소스 삭제는 이번 범위 밖) · `/api/signage/:sk/active-content`(store-web 소비) · Tablet ScreenSet 경로 전체.

## 2. 인프라 정리

### 2-1. URL map `o4o-global-lb` (2026-10-05 · production)

- 변경 직전 export 백업(세션 scratchpad) · fingerprint `WJECfxDAjng=` 가 IR 시점과 동일함을 재확인한 뒤, 같은 fingerprint 를 담은 파일로 `url-maps import` (동시 변경 시 거부되는 낙관적 잠금).
- 서버측 `url-maps validate` load · test PASS 후 적용. 적용 후 fingerprint `B4NpS3QjblY=`.
- `remove-host-rule` 대신 export/import 를 쓴 이유: 이전 시도에서 무관한 `path-matcher-store` 를 고아로 판정하는 경고가 났다(병원약국 Foundation CHECK §7-D-2).

| 대상 | 처리 |
|---|---|
| host rule `glucoseview.co.kr` · `www.glucoseview.co.kr` + `path-matcher-glucoseview` | 제거 |
| `path-matcher-api` host 목록의 `api.glucoseview.co.kr` | 그 host 만 제거 — matcher · `backend-o4o-core-api` 보존 |
| host rule `hospital.neture.co.kr` + `path-matcher-hospital` | 제거 (DNS · 인증서 없음 · 정본 진입은 `neture.co.kr/hospital`) |
| 그 밖의 host rule 14 · path matcher 11 · default service | 변경 0 (스크립트로 동일성 단언) |

복구: 백업 YAML 을 `gcloud compute url-maps import o4o-global-lb --global --source=<backup>` (fingerprint 행 갱신 후).

### 2-2. glucoseview 전용 자원 삭제

삭제 전 정의를 YAML 로 백업(세션 scratchpad · 커밋하지 않음). 각 단계 직전에 참조 0 을 확인했다.

| 순서 | 자원 | 참조 확인 | 결과 |
|---|---|---|---|
| 1 | backend `backend-glucoseview-web-advanced` | URL map 참조 0 | 삭제 |
| 2 | serverless NEG `neg-glucoseview-web` (asia-northeast3) | backend 참조 0 | 삭제 |
| 3 | 보안정책 `default-security-policy-for-backend-glucoseview-web-advanced` | 이 backend 전용 · 다른 backend 사용 0 | 삭제 |
| 4 | DNS authorization `dns-authz-glucoseview-co-kr` · `dns-authz-www-glucoseview-co-kr` · `dns-authz-api-glucoseview-co-kr` | 인증서 참조 0 (`cm-cert-neture-v3` 는 description 문구만 일치 · authz/SAN 참조 없음 · ACTIVE 확인) | 삭제 |
| 5 | Cloud Run `glucoseview-web` | 직전 요청 = 조사용 curl 뿐 · workflow/registry 0 | 삭제 |

### 2-3. 보안정책 잔재 (glucoseview 전용 · 미부착)

| 자원 | 확인 | 결과 |
|---|---|---|
| `default-security-policy-for-backend-glucoseview-web-http` | 어떤 backend 에도 부착 0 · 이름상 glucoseview 전용 (병행 세션 read-only 인벤토리와 교차 확인) | 삭제 (정의 백업 후) |

### 2-4. signage-player-web

| 단계 | 결과 |
|---|---|
| 배포 경로 제거 main 반영 | PR #306 → merge `4cfcbf339` |
| main CI | success |
| Delivery (`4cfcbf339`) | Classify success · Web/API/Admin skipped — 재배포 0 (로컬 판정 LEVEL_1 · deploy_required=false 와 일치) |
| 실행 중 · 대기 중 배포 | 0 |
| LB 연결 | NEG · backend 없음 (원래 LB 미연결) |
| Cloud Run `signage-player-web` (serving `signage-player-web-00099-vav`) | 정의 백업 후 삭제 |

## 3. 검증 (2026-10-05)

| 항목 | 결과 |
|---|---|
| Cloud Run 서비스 목록 | 10개 — hospital-pharmacy · k-cosmetics · kpa-branch · kpa-society · lecture · neture · admin · core-api · pharmacy-hub · store. `glucoseview-web` · `signage-player-web` 없음 |
| 삭제된 run.app URL | 두 서비스 모두 404 |
| 재생성 경로 | `deploy-web-services.yml` job 8 · `WEB_SERVICES` · `WEB_CLOUD_RUN` 에 두 서비스 없음 — delivery · promote · orchestrate 는 registry 파생. glucoseview 는 원래 0. 은퇴 계약 spec 이 재유입을 막는다 |
| 유지 host HTTPS (21 URL) | neture · www · `/hospital/` · `kpa-society.co.kr/kpa/` · kpa. · admin · 3 api `/api/health` · k-cosmetics · kpa-society · pharmacyhub · store · study · retail · pharmacy · community · funding · supplier · `/tablet/setup` 2 — 전부 200 · 체인 검증 0 |
| `/hospital` | `neture.co.kr/hospital/` → 병원약국 화면 (hospital-pharmacy-web) |
| `/kpa` | `kpa-society.co.kr/kpa/` → 분회 · `/kpa/tablet/*` → kpa-society (규칙 변경 0) |
| Tablet ScreenSet 재생 | 운영 DB 에서 활성 태블릿 + current screen set 이 있는 매장 3곳 read-only 조회(값 미기록) → `/api/v1/stores/:slug/tablet/screen` · `idle` · `settings` 각 200/success(`screenSet` 포함) · 재생 페이지 200 |
| 검증용 재배포 | 하지 않음 |

## 4. 보존 (이번 WO 범위 밖)

`pharmacy-hub-web` · pharmacyhub 도메인 · `cm-cert-pharmacyhub` · QR 4행 · DB 데이터 전부 · siteguide 도메인/인증서/entry · 이미지 저장소 · 공유 IAM/SA · `services/signage-player-web` 소스 · `/api/signage/:sk/active-content` · `backend-hospital-pharmacy-web`(neture.co.kr/hospital 경로).

## 5. 남은 항목

| 항목 | 메모 |
|---|---|
| API CORS 잔재 — `setup-middlewares.ts` 의 signage run.app origin · `signage.neture.co.kr` · `hospital.neture.co.kr` | 삭제된 서비스 · 해석 불가 host 라 무해. API 런타임 코드라 API 배포가 동반되므로 다음 API 변경 WO 에 묶는다 |
| `services/web-hospital-pharmacy/Dockerfile` ARG 기본값 `https://hospital.neture.co.kr` · deploy workflow 주석 | workflow 가 값을 덮어씀 — 무영향 |
| `services/signage-player-web` 소스 · lockfile importer · `channels` 계열 legacy 테이블(0행) | 앱 소스 삭제 · 테이블 drop 은 별도 판단 |
| 다른 고아 보안정책 (`…account-center-web` · `…glycopharm-web` · `…siteguide-core` · `…service-backend-neture-web` · `…o4o-admin-web-backend(-http)`) | 미부착으로 보이나 이번 대상 아님 — 별도 인벤토리 후 정리 |
| 이미지 `gcr.io/…/glucoseview-web` · `glycopharm-web` · `signage-player-web` · `siteguide-web` | 저장소 단위 개별 승인 |
| URL-FIRST CENSUS P14 "KEEP" 라벨 · 앞선 IR 의 `/kpa` 서술(`neture.co.kr` 가 아니라 `kpa-society.co.kr` 규칙) | 기록 문서 — 정정은 이 CHECK 로 대신한다 |
| siteguide · pharmacy-hub | 각각 도메인 결정 · 기능/QR 이전 트랙 |
