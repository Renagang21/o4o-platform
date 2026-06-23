# CHECK — Toss Env 배포 워크플로 영속화 V1

> **작업명:** `WO-O4O-TOSS-ENV-PERSIST-IN-DEPLOY-WORKFLOW-V1`
> **유형:** 배포 워크플로 영속화(코드 0). PaymentCore/Toss adapter/entitlement/frontend/DB/migration **무변경**.
> **작성일:** 2026-06-23
> **결과: 조건부 PASS — deploy-api.yml 영속화 완료. 단 GitHub Secrets 미등록(사용자 액션 필요) → env-present/clientKey 라이브 검증은 secret 등록 + 재배포 후로 분리.**
> 선행: `IR-O4O-FOREIGN-VISITOR-NON-PARTNER-CLOSURE-AUDIT-V1` §3.6(회귀 발견)

---

## 1. 작업 일시 / 회귀 원인

- 2026-06-23. 회귀: `TOSS_PAYMENTS_CLIENT_KEY` 가 최신 api 리비전에서 사라져 prepare clientKey 가 placeholder `test_ck_test_key` 로 fallback.
- 원인: `deploy-api.yml` 가 `--set-env-vars` 다중 플래그로 **전체 env 집합을 재지정** → 목록에 없는 env(TOSS_*)는 매 배포마다 제거. 이전 out-of-band(gcloud update) 설정이 후속 api 배포(scan-event 등)로 소실.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `.github/workflows/deploy-api.yml` | `--set-env-vars` 목록에 `TOSS_PAYMENTS_CLIENT_KEY` / `TOSS_PAYMENTS_SECRET_KEY` 2줄 추가(secret 참조) |
| `docs/investigations/CHECK-O4O-TOSS-ENV-PERSIST-IN-DEPLOY-WORKFLOW-V1.md` (본 문서) | — |

- backend/adapter/entitlement/frontend/DB/migration **무변경**.

## 3. 정확한 env 변수명

```text
TOSS_PAYMENTS_CLIENT_KEY   ← TossPaymentProviderAdapter 가 읽는 client key (구독 결제 회귀 대상)
TOSS_PAYMENTS_SECRET_KEY   ← confirm/secret key (함께 영속화)
```
- `TOSS_CLIENT_KEY`(legacy/다른 경로)는 **대상 아님** — deploy-api.yml 미추가.
- adapter 확인: `apps/api-server/src/services/payment/adapters/TossPaymentProviderAdapter.ts:29` → `process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key'`.

## 4. deploy-api.yml 변경 내용 (secret 참조만)

```yaml
--set-env-vars="GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}" \
--set-env-vars="TOSS_PAYMENTS_CLIENT_KEY=${{ secrets.TOSS_PAYMENTS_CLIENT_KEY }}" \   # 추가
--set-env-vars="TOSS_PAYMENTS_SECRET_KEY=${{ secrets.TOSS_PAYMENTS_SECRET_KEY }}" \   # 추가
--vpc-connector=o4o-vpc-connector \
```
- YAML 유효성: `yaml.safe_load` OK. set-env-vars 라인 27→29.

## 5. GitHub Secrets 이름 / 비노출

| Secret 이름 | 상태 | 비고 |
|---|---|---|
| `TOSS_PAYMENTS_CLIENT_KEY` | **미등록** (gh secret list 미존재) | 사용자 등록 필요. prefix 권장 `test_ck_****`/`live_ck_****` |
| `TOSS_PAYMENTS_SECRET_KEY` | **미등록** | 사용자 등록 필요. prefix `test_sk_****`/`live_sk_****` |

- repo 전체 secret 20개(SMTP/GCP_DB/GEMINI 등) 정상, **TOSS 매칭 0** (gh secret list 이름 조회).
- **literal key 하드코딩 0** — `grep test_ck_|live_ck_|test_sk_|live_sk_ deploy-api.yml` 무매칭. workflow/CHECK/.env 어디에도 실키 미기록.

## 6. 안전성 (빈 secret 무회귀)

- secret 미등록 상태로 본 workflow 배포 시 `${{ secrets.X }}` → 빈 문자열 → `--set-env-vars="TOSS_PAYMENTS_CLIENT_KEY="`(빈 값). adapter 가 `|| placeholder` 로 fallback → **현 상태와 동일(placeholder), 회귀/장애 없음**. 즉 secret 등록 전 배포해도 안전.

## 7. 검증 상태

| 완료 기준(§12) | 결과 |
|---|---|
| 1. deploy-api.yml 에 TOSS_PAYMENTS_CLIENT_KEY | ✅ |
| 2. deploy-api.yml 에 TOSS_PAYMENTS_SECRET_KEY | ✅ |
| 3. GitHub Secrets 주입 | ⏳ **secret 미등록 — 사용자 액션 대기** |
| 4. repo 실키 미기록 | ✅ |
| 5. 새 리비전 env present | ⏳ secret 등록 + 재배포 후 |
| 6. prepare clientKey ≠ test_ck_test_key | ⏳ secret 등록 + 재배포 후 |
| 7. 실결제 미수행 | ✅ (0건) |
| 8. confirm 호출 0 | ✅ |
| 9. PaymentCore/adapter 무변경 | ✅ |
| 10. DB/migration 무변경 | ✅ |
| 11. CHECK 작성 | ✅ |

## 8. 사용자 액션 (CRITICAL blocker) — secret 등록

다음 2개를 GitHub repo secret 으로 등록해야 §3·5·6 완성:

```bash
gh secret set TOSS_PAYMENTS_CLIENT_KEY   # 입력: test_ck_... (또는 live_ck_...)
gh secret set TOSS_PAYMENTS_SECRET_KEY   # 입력: test_sk_... (또는 live_sk_...)
```
(또는 GitHub UI → Settings → Secrets and variables → Actions → New repository secret.)

등록 후:
```text
1) deploy-api.yml 재배포(코드 푸시 또는 gh workflow run deploy-api.yml --ref main)
2) gcloud run services describe o4o-core-api → env 에 TOSS_PAYMENTS_* present 확인(값 미노출, prefix 만)
3) prepare smoke: clientKey != test_ck_test_key, prefix=test_ck_/live_ck_ (confirm·실결제 금지)
```

## 9. 무변경 / 무수행 확인

- 실결제·confirm **0건**. PaymentCore/TossPaymentProviderAdapter/store-entitlement/foreign-visitor partner·QR·scan/Neture B2B/STORE_SALE_PAYMENT(410)/DB/migration/pnpm-lock **미접촉**. 워크플로 1 + CHECK 1 만. 다른 세션 WIP 미접촉.

## 10. 후속 WO

```text
(선행) 사용자 secret 등록 → 재배포 → env present + clientKey 검증
WO-O4O-TOSS-WIDGET-VISUAL-SMOKE-V1                       ← 실브라우저 결제창 99,000원 표시(실결제 금지)
WO-O4O-STORE-SERVICE-SUBSCRIPTION-SANDBOX-CONFIRM-V1     ← sandbox confirm + entitlement ACTIVE
WO-O4O-FOREIGN-VISITOR-CORE-OPERABILITY-SMOKE-V1         ← 다국어 안내 + 구독 상태 + QR/URL/태블릿 운영
```

---

*Date: 2026-06-23 · CHECK · deploy-api.yml 에 TOSS_PAYMENTS_CLIENT_KEY/SECRET_KEY 영속(secret 참조, 실키 하드코딩 0) · YAML OK · 빈 secret 무회귀 · GitHub Secrets 미등록=사용자 액션 blocker · env-present/clientKey 검증 secret 등록 후 · 실결제/confirm 0 · 코드/DB 무변경.*
