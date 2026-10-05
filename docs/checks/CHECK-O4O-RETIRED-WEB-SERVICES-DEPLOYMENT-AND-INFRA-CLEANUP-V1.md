# CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1

> **상태**: ACTIVE
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

### 2-3. signage-player-web

(배포 경로 제거 PR main 반영 후 기록)

## 3. 검증

(실행 후 기록)

## 4. 남은 항목

(실행 후 기록)
