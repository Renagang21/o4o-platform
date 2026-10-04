# CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1

> **상태**: IN_PROGRESS
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO**: WO-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1 · 선행 IR-O4O-LEGACY-WEB-SERVICES-RETIREMENT-ASSESSMENT-V1(화면 보고) · [CHECK-O4O-SHARED-CERTIFICATE-SEPARATION-V1](CHECK-O4O-SHARED-CERTIFICATE-SEPARATION-V1.md)

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

(실행 후 기록)

## 3. 검증

(실행 후 기록)

## 4. 남은 항목

(실행 후 기록)
