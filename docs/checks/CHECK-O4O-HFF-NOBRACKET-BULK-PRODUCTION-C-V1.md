# CHECK-O4O-HFF-NOBRACKET-BULK-PRODUCTION-C-V1

> WO: **WO-O4O-HFF-NOBRACKET-BULK-PRODUCTION-C-V1** (에이전트 다 / Agent C)
> 대상: `noBracket` × shard `stableHash(STTEMNT_NO) % 3 = 2` × STORE canonical 미생산
> 상태: **CLOSED — 안전 후보 소진** · 신규 LIVE **118** · 독립검증 PASS

---

## 1. 문제 — noBracket 이 전 파이프라인에서 배제된 이유

기존 HFF 생산 파이프라인(`hff-sf-select.ts`)은 원료↔기능성 귀속 앵커로 `MAIN_FNCTN` 의 `[원료]`
대괄호 라벨을 사용하며, `brackets.length !== 1` 이면 **무조건 skip** 한다.
`normalizeSpecText(MAIN_FNCTN)` 에 대괄호가 **0개**인 제품(= noBracket)은 이 조건에 의해 전량 제외되어
shard 2 에서만 **7,903 제품**이 한 번도 후보로 진입하지 못했다.

## 2. 해결 — 공식 기준·규격(BASE_STANDARD)을 귀속 앵커로 사용

공용 파일 무편집 원칙을 지키기 위해 **C 소유 빌드 파일**(`hff-nb-c-build.ts`)만 신규 작성했다.
귀속 계약은 원문 밖 추정 0 이다.

1. `parseSpecs(BASE_STANDARD)` → 기능성 원료 키 집합. `unknownLabels` 는 SF `labelRe`/`indicatorRe` 로 2차 해소.
2. 키가 **정확히 1종**일 때만 진행 → 공식 `MAIN_FNCTN` 의 모든 기능성이 그 1종에 귀속. **오귀속이 구조적으로 불가능**.
   키 0 = `NO_FUNCTIONAL_KEY`, 2종 이상 = `MULTI_INGREDIENT` → HOLD.
3. **foreign-fn 차단** — 추출된 KO 기능성 중 *우리 키에 귀속되지 않으면서 다른 등록 원료에 귀속되는* 문장이
   하나라도 있으면 HOLD. 규격 미기재 부원료(영양성분)의 기능정보가 주원료로 끌려오는 것을 차단하며,
   항산화 등 공용 기능성은 통과한다.
4. 이후 게이트는 검증된 SF 계약과 1:1 — 고형(액상 제외) · 미승격 · exclude-taken · 섭취량 파싱 · EN 전량 매핑 · Guard.

### C 측 추가 HOLD 게이트 2종 (공용 수정 대신)

| 게이트 | 사유 |
|---|---|
| `LIQUID` | 공용 `composeSf` 는 고형 전제. 검증된 `hff-sf-select` 와 동일한 액상 정규식을 적용해 계약 밖 생산을 차단(1,623 HOLD) |
| `SPEC_APPEARANCE_DIRTY` | 공용 `composeSf` 의 private `appearance()` 정규식이 `총(-)-HCA :`(비한글)·`납 :`(1자) 라벨을 종결로 인식하지 못해 납 기준값을 성상으로 과포획. 공용 파일 수정 금지이므로 오염 초안을 C 측에서 HOLD(5건). 출고분 오염 0 |

## 3. 결과

### 배치 1 (`--shard 2 --limit 1000 --chunk 250`)

| 단계 | 값 |
|---|---|
| scanned / inShard / noBracket | 41,261 / 13,767 / **7,903** |
| 이미 승격(promoted) | 1,891 |
| eligible = target | **118** |

`distKey`: 오메가3 44 · 가르시니아 21 · 포스파티딜세린 8 · 히알루론산 7 · 감마리놀렌산 7 · 비타민C 6 ·
은행잎 4 · 비타민A 4 · 비타민E 4 · 테아닌 3 · 헤마토코쿠스추출물 2 · 비타민B6 2 · 프로폴리스 2 ·
루테인 1 · 셀레늄 1 · 비타민D 1 · 코엔자임Q10 1

**dry-run** — candMatch 118 (missing 0 / ambiguous 0) · masterDup 0 · expectedWrites 472 ·
postVerify masters 118 / spdKo 118 / spdEn 118 · canonicalDup 0 · `postVerifyPass true` → ROLLBACK (DB write 0)
**apply** (`HFF_SF_APPLY_CONFIRM=YES` + `--apply`) — 동일 수치 · `"result": "COMMIT 완료"` · **DB write 472**

rollback manifest: `apps/api-server/docs/checks/data/product-description-guard/hff-nobracket-c/manifests/hff-sf-batch-nobracket-c-shard2-b1-rollback-manifest.json`

### 독립검증 (`hff-nb-c-verify.ts` — 별도 커넥션·별도 쿼리·매니페스트 master ID 기준, READ-ONLY)

```json
{ "expect":118, "masters":118, "withPermit":118, "spdKo":118, "spdEn":118,
  "nonCanonical":0, "badSourceType":0, "noSourceRef":0, "emptyBody":0,
  "candLinked":118, "canonicalDup":0, "stmtDupMasters":0, "independentVerifyPass": true }
```

### 배치 2 — 소진 확인

동일 조건 재실행 결과 `promoted` 1,891 → **2,009**(= +118, 내 배치가 정확히 승격으로 이동),
`eligible 0 / target 0`. **본 계약하의 shard 2 안전 후보는 118 로 소진**되었다.
(WO 는 1,000건 배치를 지시했으나 안전 후보 총량이 118 이므로 배치는 채워지지 않는다.)

## 4. HOLD 상위 원인 (배치 2 기준, 전량 shard 2 noBracket)

| 원인 | 건수 | 성격 |
|---|---:|---|
| `UNKNOWN_SPEC_LABEL` | 2,075 | 규격 라인 미파싱 → 성분 집합 불완전 가능 → 정당 HOLD |
| `LIQUID` | 1,623 | 고형 전제 composer 계약 밖 |
| `NO_FUNCTIONAL_KEY` | 1,113 | 공식 규격에 기능성 원료 선언 없음 |
| `MULTI_INGREDIENT` | 736 | 복합형 — 단일 귀속 앵커 부적용 |
| `FOREIGN_FN` | 133 | 타 원료 귀속 기능성 혼입 |
| `GROUNDING_PENDING_EN` | 132 | EN 미매핑(임의 영문 생성 0) |
| `GUARD_REVIEW` / `GUARD_BLOCKED` | 43 / 9 | Guard 정당 차단 |
| `NO_FUNCTION` / `COMPOSE_SERVING_*` / `SPEC_APPEARANCE_DIRTY` | 17 / 8 / 5 | 개별 HOLD |

**최소 보완 검토 결과 — 보완 없음.** WO 는 *"같은 원인 100건 이상일 때만 최소 보완을 검토"* 를 허용하나,
`UNKNOWN_SPEC_LABEL` 을 실제 미파싱 라벨 단위로 분해하면 최다가 `Rg3의 합` 56 · `)` 49 · `철` 47 ·
`식이섬유` 43 으로 **단일 원인 100건 이상이 없다**. 또한 이들은 전부 공용 `hff-source-parse` / `hff-sf-compose`
계약 문제이며, 공용 parser 수정은 WO 금지 사항이자 타 에이전트 lane(A/B) 에 동시 영향을 준다.
→ 기록만 남기고 미수정. `식이섬유` 는 Agent B 트랙에서 이미 `PENDING_SHARED` 로 확정된 항목과 동일 원인이다.

## 5. 품질 — 콘텐츠 불변 원칙 준수

- KO 기능성 문장은 공식 `MAIN_FNCTN` 원문 그대로. 삭제·순화·완화 0.
- 원문 밖 치료·예방 주장 추가 0. EN 은 매핑된 정본만 사용하고 미매핑은 전량 HOLD(임의 영문 생성 0).
- 전문가 상담 footer 유지. 성상 오염 출고 0(§2 게이트).

## 6. 산출물

| 경로 | 내용 |
|---|---|
| `apps/api-server/src/scripts/hff-nb-c-build.ts` | C 소유 noBracket 빌드(shard 파라미터화 · foreign-fn · LIQUID · appearanceDirty) |
| `apps/api-server/src/scripts/hff-nb-c-verify.ts` | 매니페스트 ID 기준 독립검증(READ-ONLY) |
| `apps/api-server/src/scripts/hff-nobracket-c-select.ts` | 1차 시도(SF 전용 매칭) — census 근거로 보존, 생산 미사용 |
| `apps/api-server/docs/checks/data/product-description-guard/hff-nobracket-c/{b1,b2,sel,manifests}` | target · pool · hold · selfcheck · rollback manifest |

공용 파일(`hff-source-parse` · `hff-sf-registry` · `hff-sf-compose` · `hff-nutrient-registry` · `hff-sf-apply`) **편집 0**.
