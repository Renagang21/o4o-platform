# CHECK-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1

> **WO**: WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1
> **선행 CHECK**: [CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1](./CHECK-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1.md) §6 (발견 출처)
> **판정**: **ROLLOUT_COMPLETE · 재암호화 대상 0건** — 전수조사 결과 운영 DB에 이 키로 만들어진 암호문이 **한 건도 없었다**
> **일자**: 2026-08-18

## 0. 요약

| WO 단계 | 결과 |
|---|---|
| §2 전수조사 (코드 + 운영 DB) | **완료** — 소비처 4곳 · 암호문 셀 **0건** |
| §4 교체 러너 | **작성 완료** — dry-run 기본 · 멱등 · HOLD · 행 단위 rollback. 프로덕션 dry-run 실행 결과 대상 0 |
| §5 crypto 헬퍼 하드닝 | **완료** — 소스 하드코딩 기본 키 제거 · fail-closed |
| §6 Secret Manager · Cloud Run 주입 | **완료** — `o4o-encryption-key` → revision `o4o-core-api-03367-krb` |
| §7 독립 검증 | **완료** — 단위 23건 + 프로덕션 dry-run(러너 경로) + revision env 확인 |
| §6 dual-read | **불필요** — 기존 암호문 0건이라 legacy fallback 자체를 만들지 않았다 |

**운영 DB write 0** · **credential 값 미기록** · **평문 로그 0**.

---

## 1. §2 전수조사 — 결론이 작업 전체를 바꿨다

WO 는 "기존 암호문 재암호화까지 포함한 일괄 전환"을 전제했다. 전수조사 결과 **그 전제가 성립하지 않았다.**

### 1-1. 코드 소비처 (전수)

`utils/crypto.ts` import 는 **3곳뿐**이고, `ENCRYPTION_KEY` 를 직접 읽는 곳이 **1곳 더** 있었다.
`packages/**`, `services/**` 에는 `ENCRYPTION_KEY` · `createCipheriv` · `createDecipheriv` 사용이 **0건**이다.

| # | 소비처 | 사용 | 저장 위치 |
|---|---|---|---|
| 1 | `routes/platform/store-policy.routes.ts` | encrypt + decrypt | `platform_store_payment_configs.api_key` / `.api_secret` |
| 2 | `config/passportDynamic.ts` | decrypt only | `settings.value` (key=`oauth_settings`) 의 `{google,kakao,naver}.clientSecret` |
| 3 | `modules/cafe24/services/cafe24-connection.service.ts` | encrypt + decrypt | `cafe24_connections.access_token_enc` / `.refresh_token_enc` |
| 4 | `modules/foreign-visitor-partner/foreign-visitor-partner-qr-scan-event.service.ts` | **hash salt** (암호화 아님) | `foreign_visitor_partner_qr_scan_events.ip_hash` / `.user_agent_hash` |

**4번이 이번 조사의 핵심 발견이다.** 이 값은 단방향 sha256 의 salt 라 **복호화→재암호화가 원리적으로 불가능**하다.
키를 바꾸면 기존 hash 와 조용히 연속성이 끊기고(중복 제거·집계가 어긋난다) 되돌릴 방법도 없다.
암호화 키 rotation 이 hash 축을 건드리지 않도록 **전용 env `FV_QR_SCAN_HASH_SALT` 로 축을 분리**했다(미설정 시 기존 동작 유지).
전환 시점 해당 테이블은 **0행**이라 실제 연속성 손실은 발생하지 않았다.

범위 밖으로 확인만 한 것: `contact.controller.ts` · `public-contact-inquiry.controller.ts` 의 IP hash 는 **salt 없는 sha256** 이라 키와 무관하다.
`TOSS_PAYMENTS_SECRET_KEY` 등은 저장 암호화가 아니라 환경 secret 이므로 대상이 아니다.

### 1-2. 운영 DB 실측 (2026-08-18, read-only SELECT)

| 대상 | 행/셀 | 암호문 | 비고 |
|---|---:|---:|---|
| `platform_store_payment_configs` | **0행** | 0 | 결제 credential 이 아직 한 건도 저장된 적 없다 |
| `settings` key=`oauth_settings` | **행 자체 없음** | 0 | 존재하는 key 는 email/general/reading/theme 4개뿐 → passportDynamic 은 env fallback 으로 동작 중 |
| `cafe24_connections` | 0행 | 0 | migration 은 배포됨. 연결 0 |
| `foreign_visitor_partner_qr_scan_events` | 0행 | — | hash salt 축 (위 §1-1) |

`settings.email.smtpPassword` 는 길이 0(빈 값)이며 암호문 포맷이 아니다 — 암호화 경로와 무관하다.

> **따라서 재암호화 모집단은 0건이다.** WO 가 우려한 "새 키를 넣으면 기존 암호문이 깨진다"는 상황은 실제로 존재하지 않았다.
> 추정으로 모집단을 좁힌 것이 아니라, **코드 전수 + 운영 DB 실측 양쪽에서 0** 을 확인했다.

---

## 2. §5 crypto 헬퍼 하드닝 (`apps/api-server/src/utils/crypto.ts`)

| 이전 | 이후 |
|---|---|
| `ENCRYPTION_KEY` 없으면 소스에 박힌 `default-32-char-encryption-key!!` 로 **조용히 대체** | 기본 키 제거. 미설정이면 `ENCRYPTION_KEY_NOT_CONFIGURED` 로 **던진다** |
| 짧은 키를 padding 해서 통과 | 32바이트 미만 **거부** |
| 은퇴 기본 키를 그대로 쓰면 통과 | 그 값이면 "미설정"으로 판정 |

- 암호문 포맷은 `ivHex:cipherHex` 그대로다 — **포맷 변경 없음**(기존 데이터가 있었다면 그대로 읽혔을 것).
- `encryptWithKey` / `decryptWithKey` 를 추가했다. 키를 인자로 받으며 **교체 러너 전용**이다. 런타임 경로는 canonical 키만 쓴다.
- `RETIRED_DEFAULT_ENCRYPTION_KEY` 는 상수로 남겼다. 이유는 하나 — **그 키로 만들어진 값을 러너가 읽어내기 위함**이다. 유효 키로는 취급하지 않는다.
- `cafe24-token-crypto.ts` 는 자체 기본 키 상수를 버리고 `isEncryptionKeyConfigured()` 에 위임한다. 판정 기준이 두 곳에 갈라지지 않게 했다.
- `store-policy.routes.ts` PUT 은 키 미설정 상태에서 credential 을 받으면 **503 `ENCRYPTION_KEY_NOT_CONFIGURED`** 로 거절한다. 약한 키로 저장하지 않는다.

---

## 3. §4 교체 러너 — `apps/api-server/src/scripts/encryption-key-rotation.ts`

```bash
cd apps/api-server
npx tsx src/scripts/encryption-key-rotation.ts                          # dry-run (기본)
npx tsx src/scripts/encryption-key-rotation.ts --apply                  # 실제 UPDATE
npx tsx src/scripts/encryption-key-rotation.ts --legacy-key-env OLD_KEY # 다른 legacy 키
```

WO §3 안전 원칙을 코드 계약으로 구현했다.

| 원칙 | 구현 |
|---|---|
| 기존 암호문을 먼저 깨뜨리지 않는다 | 새 키 주입 → **읽어서 재암호화** 순서. 러너는 canonical 키가 갖춰져야만 시작한다 |
| 삭제 금지 | 어느 키로도 못 읽으면 `HOLD_UNREADABLE` 로 남기고 **손대지 않는다** |
| 복호화 불가 값 임의 재생성 금지 | 위와 동일. 새 값을 만들어 넣는 경로가 없다 |
| 멱등 | 이미 canonical 키로 읽히면 `SKIPPED_ALREADY_CANONICAL` — 재실행해도 안전 |
| 검증 + rollback | 저장 후 **저장소에서 다시 읽어** 복호화 검증. 실패하면 그 행만 원래 값으로 되돌리고 `ROLLED_BACK` 집계 (종료코드 5) |
| credential 미노출 | 리포트에 위치 식별자(`table:id:column`)와 개수만 남는다. 평문·암호문 값을 출력하지 않는다 |

`AppDataSource` 대신 **entity 를 로드하지 않는 자체 DataSource + raw SQL** 을 쓴다(무관한 entity 의 decorator metadata 문제를 끌고 들어오지 않기 위함).

### 3-1. 프로덕션 dry-run 결과 (2026-08-18)

```json
{ "mode": "DRY_RUN",
  "total": { "cells": 0, "rotated": 0, "skipped": 0, "hold": 0, "empty": 0, "rolledBack": 0 } }
```

3개 대상 모두 셀 0 → `--apply` 를 실행할 이유가 없어 **실행하지 않았다**(운영 DB write 0).
러너는 지금부터 "0건 확인 도구"이자, 향후 키 재교체 시의 정본 경로로 남는다.

---

## 4. §6 프로덕션 반영

| 항목 | 값 |
|---|---|
| Secret | Secret Manager `o4o-encryption-key` (version 1, automatic replication) |
| 키 재료 | `openssl rand -base64 48` — 로컬·로그·문서 어디에도 값을 남기지 않고 stdin 으로 직접 주입 |
| IAM | `roles/secretmanager.secretAccessor` → `117791934476-compute@developer.gserviceaccount.com` (Cloud Run 런타임 SA) |
| 주입 | `gcloud run services update o4o-core-api --update-secrets ENCRYPTION_KEY=o4o-encryption-key:latest` |
| revision | `o4o-core-api-03367-krb` — 트래픽 100% 서빙 |

이 프로젝트의 다른 env 는 전부 평문 value 다. **ENCRYPTION_KEY 는 Secret Manager 참조로 넣은 첫 항목**이다(WO §6).

**순서에 대해**: 키를 먼저 주입하고 하드닝 코드를 나중에 배포한다. 기존 암호문이 0건이므로 구버전 이미지가 새 키를 쓰기 시작해도 깨질 값이 없다. 반대 순서였다면 하드닝된 코드가 키 없는 환경에서 결제 credential 저장을 거절했을 것이다.

**dual-read 는 만들지 않았다.** 읽어야 할 legacy 암호문이 0건이므로 필요 없다 — WO §6 의 "영구 dual-read 금지" 를 충족하는 가장 확실한 형태다.

---

## 5. §7 검증

| 항목 | 결과 |
|---|---|
| typecheck (`tsc --noEmit`) | **PASS** (exit 0) |
| 단위 테스트 3 suite | **PASS 23/23** |
| ├ `encryption-key-canonical-rollout.spec.ts` | 키 미설정/은퇴키/짧은키 거부 · 왕복 · IV 무작위성 · legacy→canonical 재암호화 (9건) |
| ├ `encryption-key-rotation-runner.spec.ts` | dry-run write 0 · 멱등 SKIP · HOLD 2종 · **저장 검증 실패 시 rollback** (7건) |
| └ `cafe24-oauth-state-and-token-crypto.spec.ts` | 위임 후 회귀 없음 (8건) |
| 프로덕션 dry-run (러너 실경로) | **PASS** — 대상 0, write 0 |
| Cloud Run revision env | **PASS** — `ENCRYPTION_KEY` ← `secretKeyRef: o4o-encryption-key/latest` |
| 배포 후 로그 | ERROR severity 0 · 200 응답 확인 |
| 브라우저 smoke | **미실행** — 화면 동작 변경이 없다(결제 credential 저장은 대상 매장 0건). 정직하게 적으면 store-policy PUT 의 새 503 경로는 **실호출로 검증되지 않았다** |

---

## 6. 남은 것 / 후속

1. **하드닝 코드 배포** — 이 커밋이 main 에 올라가면 CI/CD 로 배포된다. 배포 전까지는 구버전 이미지가 새 키로 동작한다(암호문 0건이라 무해).
2. **키 회수 계획 없음** — 향후 키 재교체가 필요하면 러너에 `--legacy-key-env` 로 이전 키를 주면 된다. 그 시점에는 모집단이 0이 아닐 수 있다.
3. **Cafe24 는 이제 막히지 않는다** — `CAFE24_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED` 전제가 해소됐다. 다음은 Cafe24 앱 자격정보 확보 → OAuth 연결 → Census.
4. `cafe24_connections` 에 `organization_id` / `supplier_id` / `service_key` 를 **넣지 않은 판단은 유지**한다 (매칭률 확인 전 소유권 축 설계 금지).

---

## 7. Git · 문서 정합

- 변경: `utils/crypto.ts` · `cafe24-token-crypto.ts` · `store-policy.routes.ts` · `foreign-visitor-partner-qr-scan-event.service.ts` · `.env.example`
- 신규: `scripts/encryption-key-rotation.ts` · 테스트 2건 · 본 CHECK
- 동시 작업 중인 다른 세션의 LMS/education 변경은 접촉하지 않았다 (path-specific stage).
- **문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
