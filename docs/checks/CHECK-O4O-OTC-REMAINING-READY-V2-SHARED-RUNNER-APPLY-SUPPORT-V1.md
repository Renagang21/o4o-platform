# CHECK-O4O-OTC-REMAINING-READY-V2-SHARED-RUNNER-APPLY-SUPPORT-V1 — 공용 러너 apply 경로 추가 + 가 shard 준비 완료 (에이전트 다)

WO: `WO-O4O-OTC-REMAINING-READY-V2-SHARED-RUNNER-APPLY-SUPPORT-V1`
기준: census/SSOT `81b39da72` · 공용 러너 `3447b2323` · 가 dry-run `85101e77e` · 나 dry-run `c377a97d0` · 다 dry-run 기존 PASS
상태: **PASS — apply 경로 구현 완료 · dry-run 결과 byte-identical 불변 · 가 shard READY. 본 WO 에서 LIVE apply 미실행, DB write 0.**

## 0. 결론

> 공용 러너에 LIVE apply 경로를 추가했다. **fingerprint 산식·route 템플릿·dry-run 결과는 변경 없음**(다 shard manifest md5 `7ad773f1…` 동일).
> 가 shard apply 준비 검증 **게이트 10/10 PASS · 237 fp / 837 master · KO 3,348 + EN 1,674 = 5,022T** — WO 확정 예상치와 정확히 일치.
> apply 순서 게이트가 나·다를 실제로 차단함을 실측 확인. **이번 WO 에서 실제 write 0.**

## 1. 구현 내용

### write 계약 (WO 명시 순서 그대로)

**KO 4T / master** — `applyKoGroup()`

1. 기존 `mfds_easy_drug` STORE ko canonical → `deprecated` (canonical 정확히 1건·source 확인 후)
2. authored STORE ko **INSERT** (`status='needs_review'`, `source_ref_id=fpToUuidV2(fp)`)
3. authored ko → `canonical` 전환
4. `shared_product_description_audit_logs` 에 `canonical_replaced` 기록

**EN 2T / master** — `applyEnGroup()`

1. authored STORE en **INSERT** (`needs_review`)
2. authored en → `canonical` 전환

대상 = 본 앵커의 KO canonical 보유 master (KO apply 선행 강제).

### 필수 원칙 준수

| 원칙 | 구현 |
|---|---|
| sourceRef = `fpToUuidV2` 산출값만 | 앵커 계산은 러너 내부 1곳. 세션별 인자·오버라이드 **없음** |
| 세션별 별도 앵커 금지 | `--shard` 는 대상 선택만 하고 앵커에 개입하지 않음 |
| V1 러너·V1 앵커 사용 금지 | V1 파일 **0 byte 변경**, 앵커 네임스페이스 `otc-v2-leaflet:` 로 분리(selftest 가 V1 앵커와 불일치 검증) |
| 기존 canonical UPDATE 재사용 금지 | 기존 행은 **상태만** `deprecated` 로 바꾸고, 본문은 항상 신규 INSERT |
| INSERT 중심 | KO·EN 모두 신규 행 생성 |
| master별 canonical ko/en 각 1개 | 트랜잭션 내 사후검증 `canonical1 == EXP`, `dup == 0` |
| HOLD_SOURCE 그룹 write 0 | anomalies 보유 그룹은 `eligible` 에서 제외되어 apply 루프에 진입하지 않음 |

### 안전장치

- **그룹 단위 트랜잭션** — 어느 단계든 실패 시 `rollbackTransaction()`. 사후검증도 **커밋 전** 트랜잭션 내에서 수행하여 실패 시 rollback.
- **이중 게이트** — `--apply` + `OTC_V2_LEAFLET_KO_CONFIRM=YES` / `OTC_V2_LEAFLET_EN_CONFIRM=YES`. 하나라도 없으면 write 0으로 종료.
- **write 수 검증** — 그룹별 `실제 T == size×4(KO) / ×2(EN)` 불일치 시 rollback, 전체 종료 시 `writeActual == writePlan` 재확인.
- **apply 순서 원장** `otc-v2-apply-order.json` — 선행 shard 의 KO·EN apply + 독립검증이 모두 완료여야 다음 shard 해제. 독립검증 표기는 `--mark-verified=<shard>` 로만 가능하며, KO/EN apply 완료 전에는 표기 자체가 거부된다.

### 검증 경로 단일화 (중요)

apply 를 별도 검증 경로로 구현하면 **V1→V2 에서 겪은 산식 drift 가 재발**한다. 따라서 `fetchTargetState()` · `verifyGroupMasters()` · `buildGroupKo()` 를 추출해 **dry-run 과 apply 가 동일 함수를 호출**하도록 했다. dry-run 이 통과시킨 것과 apply 가 쓰는 것이 정의상 같다.

## 2. dry-run 불변 검증 (회귀)

추출 리팩터가 dry-run 결과를 바꾸지 않았음을 **byte 단위로** 증명했다.

| 항목 | 값 |
|---|---|
| 리팩터 전 정본 manifest md5 | `7ad773f185ba0d7fa3f725d5ce703b57` |
| 리팩터 후 재실행 md5 | `7ad773f185ba0d7fa3f725d5ce703b57` |
| `cmp` | **IDENTICAL** |
| 다 dry-run 수치 | fp 238/238 · master 839/839 · fp 재현 839 · 이상 그룹 1 · canonicalDup 0 · writePlan 3332+1666 — **전부 동일** |

fingerprint 산식·route 템플릿·composer 는 **한 줄도 변경하지 않았다**.

## 3. type-check · selftest

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (러너 관련) | **오류 0** |
| selftest | **PASS** |

selftest 신규 항목 (8)(9):

- apply 순서 게이트 — `ga` 는 선행 없음(통과), `na`/`da` 는 선행 미완료 시 차단, `ga` 완료 후 `na` 해제, `da` 는 여전히 차단, **KO/EN apply 만 되고 독립검증 미완료면 차단**.
- 예상 write 계약 — 가 837m/3,348/1,674/5,022 · 나 839m/3,356/1,678/5,034 · 다 833m/3,332/1,666/4,998, 그리고 `ko==m×4 · en==m×2 · total==m×6` 산식 정합.

## 4. 가 shard apply 준비 검증 (DB write 0)

```
--shard=ga --lang=ko --apply-readiness
```

**적격 237 fp / 837 master · HOLD 1 fp / 2 master**

| # | 게이트 | 판정 |
|---|---|:---:|
| 1 | target fp/master == dry-run manifest | PASS |
| 2 | HOLD 대상 제외 | PASS |
| 3 | fingerprint 재현 100% | PASS |
| 4 | shard 밖 master 0 | PASS |
| 5 | 기존 완료분 교집합 0 | PASS |
| 6 | CLQ/CDS/CSI 651 혼입 0 | PASS |
| 7 | 빅콘에스600정 혼입 0 | PASS |
| 8 | pre-apply canonicalDup 0 | PASS |
| 9 | 예상 write == 실측 계획 | PASS |
| 10 | apply 순서 충족 | PASS |

**writePlan KO 3,348 · EN 1,674 · total 5,022** — WO 확정 예상치와 **정확히 일치**.

→ `READY — ga ko apply 진행 가능 (실행: --apply + OTC_V2_LEAFLET_KO_CONFIRM=YES)`

### 순서 게이트 실측 차단 확인

| shard | 결과 |
|---|---|
| 나 | **NOT READY** — 차단 4건 (선행 `ga` KO/EN apply·독립검증 미완료). 적격 240 fp/839 m · writePlan 3,356+1,678=5,034 은 정상 산출 |
| 다 | **NOT READY** — 차단 7건 (선행 `ga`·`na` 각 3건). 적격 237 fp/833 m · writePlan 3,332+1,666=4,998 |

### 이중 게이트 실측 확인

`--apply` 만 주고 env 확인을 주지 않은 실행 → `이중 게이트 미충족 — apply 하지 않았다. dbWrite 0.` 로 종료.
apply 원장 파일 **미생성** = 이번 WO 에서 apply 실행 0.

## 5. 본 WO 준수

- **LIVE apply 미실행** · **DB write 0** — 원장 미생성으로 교차 확인
- fingerprint 산식 **변경 0** · route 템플릿 **변경 0** · dry-run 결과 **byte-identical**
- V1 러너 **수정 0** · 라 census/SSOT **수정 0** · 가·나 산출물(`otc-v2-dryrun-manifest.ga/na.json`) **수정 0**
- `apps/api-server/.env` **보존**(삭제 금지 준수) · 자격증명 값 **출력·수정 0** · 루트 `.env` **미사용**
- `git add .` 미사용 · reset/clean/stash 미사용
- 커밋 범위 = **공용 러너 + 본 CHECK 만**. preflight 산출물(`otc-v2-apply-preflight.*.json`)은 실행 시 재생성되는 파생물이라 커밋하지 않았다.

## 6. 가 세션 실행 절차

```bash
cd apps/api-server

# 1) 준비 확인 (DB write 0)
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts \
    --shard=ga --lang=ko --apply-readiness

# 2) KO LIVE apply — 이중 게이트
OTC_V2_LEAFLET_KO_CONFIRM=YES ../../node_modules/.bin/tsx \
    src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=ga --lang=ko --apply

# 3) EN LIVE apply — 그룹별 저작 EN 페이로드 필요
OTC_V2_LEAFLET_EN_CONFIRM=YES ../../node_modules/.bin/tsx \
    src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=ga --lang=en --apply \
    --en-config=src/scripts/data/otc-v2-leaflet-config-batch1.ga.json

# 4) 독립검증 완료 후 — 나 shard 해제
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts \
    --mark-verified=ga --note="독립검증 GREEN"
```

EN `--en-config` 형식: `{ "groups": [{ fp, title, efficacy, usage, caution, summaryTable }] }`.
`usageLabel` 은 **저작 페이로드에서 받지 않고 경로에서 주입**한다(경구 라벨 오용 차단). 렌더 시 한글 잔존·경구 동사·수량 누락 게이트를 통과하지 못하면 그 그룹에서 즉시 중지한다.

**가·나 세션은 이 러너 파일을 수정하지 않는다.** 변경이 필요하면 다 세션에 요청한다(3 shard 동시 영향 — 단일 작성자 유지).

## 7. Git

- 자기 산출물 2개(공용 러너 · 본 CHECK)만 path-specific stage·commit·push
- 타 세션 변경(`AGENTS.md` · KPA 페이지 · 네처 CHECK · 가/나 preflight) **미접촉**
