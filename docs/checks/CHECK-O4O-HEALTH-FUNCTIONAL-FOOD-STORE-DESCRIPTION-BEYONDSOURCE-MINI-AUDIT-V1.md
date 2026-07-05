# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BEYONDSOURCE-MINI-AUDIT-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BEYONDSOURCE-MINI-AUDIT-V1`
> 성격: `FAIL_BEYOND_SOURCE` 표본 규명 — 실제 원문 밖 확장 vs guard 과민 판별. measurement-only, DB write 0, bulk apply 미실행.
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용
> 선행: `LIVE-GATE-RERUN-WITH-BILLED-KEY`(GO_WITH_LIMIT, beyondSource 18% 규명 요청)

> ⚠️ **면책**: secret/API key 원문 미출력·미커밋. raw prompt/output 전체 본문 미커밋(gitignored scratch).

---

## 1. 결론 — beyondSource 는 **100% guard 과민(false positive)**. 실제 원문 밖 확장 **0건**. guard 보정으로 해소.

- 계층 표본 **80건 생성**(실제 `AiPolicyExecutorService.execute` gemini-2.5-flash) → 성공 59, **beyondSource 16건(27.1%)** 캡처 + PASS 4건 대조.
- **16건 전수 육안 판정 + raw seed/draft/미매치 토큰 비교 결과: 16/16 전부 guard 오탐**. draft 는 원문 기능성을 충실히 재작성(+식약처 인정 어미)했을 뿐, **원문에 없는 효능·원료·질병 문구를 만든 사례 0건**.
- 오탐 근본 원인 = `sourceFidelityGuard` 의 **공백-토큰 exact 겹침** 방식이 한국어 **조사·띄어쓰기**에 취약:
  1. **띄어쓰기**: 원문 붙여쓰기 `"식후혈당상승억제"` ↔ draft 자연 띄어쓰기 `"식후 혈당 상승 억제"` → 토큰 매칭 0 (overlap 0.00).
  2. **조사**: 원문 `"억제"`·`"보충"`·`"필요"` ↔ draft `"억제에"`·`"보충에"`·`"필요합니다"` → 조사/어미가 붙어 미매치.
  3. **승인 어미**: draft 가 `"에 도움을 줄 수 있습니다"`(인정 어미) 부가 — 정상 동작인데 `"도움을"`/`"있습니다"` 를 미매치 content 로 카운트.
- **guard 보정 완료**(조사/어미 stem + 공백제거 substring 매칭). 캡처 16건 재판정 → **잔여 flag 0**. 적대 테스트(`혈당 조절과 다이어트 효과` 확장)는 **계속 beyondSource=true**(진짜 확장 포착 유지).
- **DB write 0**, `product_candidate_description_drafts` **0** 불변, bulk 미실행.

**한 줄 결론:** beyondSource 18~27% 는 gemini 의 원문 밖 확장이 아니라 **guard 휴리스틱이 한국어 조사·띄어쓰기를 오탐한 것**이다(16/16). guard 를 조사/어미 stem + 공백제거 substring 매칭으로 보정하니 캡처 전수 오탐이 사라지고 진짜 확장 검출력은 유지된다 → **프롬프트 tighten 불필요, guard tune 완료**. bulk 예상 reject(beyondSource 사유)율은 ~27% → **≈0** 로 낮아진다.

---

## 2. 범위와 비범위

- 수행: 80 계층 표본 생성, 16 FAIL_BEYOND_SOURCE + 4 PASS 캡처, 전수 판정, guard 보정 + 회귀 test, 캡처 재판정, reject율 재산정.
- 미수행(비범위): bulk apply, draft 저장, approved/노출, master 승격, prompt 본문 수정(불필요 판정), timeout/policy 조정(별도 BULK-APPLY-RUN), provider 변경.

---

## 3. 표본 캡처 방법

- 실제 `AiPolicyExecutorService.execute(HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION, system, user, {responseMode:'json'})` — 최소 DataSource[`AiLlmPolicy`] + Cloud SQL Auth Proxy(방화벽 무변경). key=env `GEMINI_API_KEY`(원문 미출력, 실행 후 삭제). CONC 3.
- 계층 stratified 80건(TERSE/MISSING/MULTI/정상 혼합) → 성공 59 / 실패 21(전부 timeout, 429 0).
- 캡처 필드: `product, flags, seedMain(원문), claimCount, draftMain(생성 라인), reasons(guard 미매치 토큰)`. **repo 밖 gitignored scratch** 에만 저장(raw 미커밋).

| 지표 | 값 |
|---|---|
| 생성 시도 | 80 |
| 성공 | 59 |
| timeout(429 아님) | 21 |
| **beyondSource(guard flag)** | **16 (성공분 27.1%)** |
| 캡처 | BEYOND 16 + PASS 4 |

---

## 4. 전수 판정 — 16/16 guard 과민

| # | 제품 | 원문(발췌) | draft | guard 미매치 | 판정 |
|---|------|-----------|-------|-------------|------|
| 1 | 대마종자유 | 필수 지방산의 보충 | 필수 지방산 보충에 도움을… | 우리/몸에/필요한/지방산 | 과민(조사+틀) |
| 2 | ATOMY VIT C | 결합조직 형성과 기능유지에 필요 | 결합조직 형성과 기능 유지에 필요합니다 | 기능/유지에/필요합니다 | 과민(조사) |
| 3 | ATP-P | 유해균 억제…배변활동 원활 | 유해균 억제에…/배변 활동 원활에… | 억제에/도움을/배변/활동 | 과민(띄어+조사) |
| 4 | SS스킨솔루션 | 피부보습…결합조직 형성 | 피부 보습에…/결합조직 형성과 기능 유지에… | 피부/보습에/기능/유지에 | 과민(띄어+조사) |
| 5 | BABELAC-S | 유익한 유산균…유해균 억제 | 유해균 억제에 도움을 주거나… | 억제에/도움을/주거나/배변활동을 | 과민 |
| 6 | BF식이섬유 | 식후혈당상승억제에 도움 | 식후 혈당 상승 억제에… | 식후/혈당/상승/억제에 | 과민(**띄어쓰기**) |
| 7 | 365 홍삼발효 | 결합조직 형성과 기능유지에 필요 | 결합조직 형성과 기능 유지에 필요합니다 | 기능/유지에/필요합니다 | 과민(조사) |
| 8 | Biovine Restore | 유익한 유산균…유해균 억제 | 유해균 억제에…/배변 활동을 원활하게… | 억제에/도움을/배변/활동을 | 과민 |
| 9 | D-10식이섬유 | 식후혈당상승억제에 도움 | 식후 혈당 상승 억제에… | 식후/혈당/상승/억제에 | 과민(**띄어쓰기**) |
| 10 | 마더스케어 철분 | 철:체내 산소운반과 혈액생성에 필요 | 철은 체내 산소 운반과 혈액 생성에 필요하며… | 철은/산소/혈액/필요하며 | 과민(조사+띄어) |
| 11 | D-10프로폴리스 | 항산화 작용/구강 항균작용 | 항산화 작용에…/구강에서의 항균 작용에… | 작용에/도움을/항균 | 과민(조사) |
| 12 | D-포뮬러28 | 식이섬유 보충 | 식이섬유 보충에 도움을… | 보충에/도움을 | 과민(조사) |
| 13 | Duolac 7 stick | 유해균 억제 또는 배변활동 원활 | 유해균 억제 또는 배변 활동 원활에… | 배변/활동/원활에/도움을 | 과민(띄어+조사) |
| 14 | Duolac 7SP | 유해균 억제…배변활동 원활 | 유해균 억제에…/배변활동 원활에… | 억제에/도움을/원활에 | 과민(조사) |
| 15 | Aloe Tox | 정상적인 면역기능에 필요 | 정상적인 면역 기능에 필요합니다 | 면역/기능에/필요합니다 | 과민(조사+띄어) |
| 16 | Duolac Yam Yam | 유해균 억제…배변활동 원활 | 유해균 억제에…/배변활동 원활에… | 억제에/도움을/원활에 | 과민(조사) |

**공통 결론**: 미매치로 잡힌 토큰은 전부 (a) 원문에 붙여쓰기로 존재(`식후혈당상승억제`), (b) 조사만 다름(`억제`↔`억제에`), (c) 인정 어미 틀(`도움을`/`필요합니다`)이다. **원문에 없는 새 기능성·원료·질병 어휘를 만든 사례는 단 1건도 없다.**

- 대조 PASS 4건(당케어/6년근홍삼×2/유산균)은 원문과 띄어쓰기·조사까지 거의 일치 → guard 미탐. 즉 오탐은 **AI 가 자연스럽게 재작성할수록(띄어쓰기 교정·조사 부착) 더 잘 발생**하는 구조적 편향.

---

## 5. 판정: prompt tighten vs guard tune

| 후보 | 필요? | 근거 |
|---|:---:|------|
| **프롬프트 tighten** | ❌ 불필요 | draft 가 원문 밖으로 나간 사례 0. 오히려 AI 는 이미 원문 충실. tighten 하면 정상 재작성만 위축. |
| **guard stopword/framing 보정** | ✅ 완료 | 조사변형 framing(`도움을`/`필요합니다`)이 오탐 주범 → stem 후 stopword 매칭으로 흡수. |
| **guard 매칭 알고리즘 보정** | ✅ 완료 | 공백-토큰 exact → **조사/어미 stem + 공백제거 substring** 로 교체(띄어쓰기·조사 강건). |

### 적용한 guard 보정 (`health-functional-food-description-guards.ts`)

1. **`stem()` 추가** — 한국어 조사/어미(`에/을/를/은/는/의/과/와/로/…/합니다/습니다/하는/하며/…`) 최대 2회 절삭. `억제에→억제`, `필요합니다→필요`, `운반과→운반`.
2. **원문 근거를 공백제거 blob 의 substring 매칭으로 변경** — `sourceCompact = (mainFunction+claims).replace(/\s+/g,'')`. draft 어간이 원문 붙여쓰기 문자열에 substring 존재하면 매칭. `식후`·`혈당`·`상승`·`억제` 전부 `"식후혈당상승억제"` 의 substring → 매칭.
3. **stem 후 framing stopword 재검사** — `도움을→도움`, `필요합니다→필요` 를 framing 으로 흡수. 1자 어간은 노이즈로 판정 제외.
- 판정 임계는 **불변**(`overlap<0.5 && 미매치≥2`) — 진짜 확장 검출 로직/민감도는 유지, 매칭 정확도만 개선.

### 회귀·안전 검증

- guard jest **25/25 PASS**(신규 회귀 3건 추가: 식이섬유 띄어쓰기 / 프로바이오틱스 조사+어미 / 다원료 연결어 재작성 → 전부 통과).
- **적대 케이스 유지**: 기존 `"혈당 조절과 다이어트 효과가 뛰어남"`(원문=피로 개선) → 여전히 **beyondSource=true**. `체지방/다이어트/혈당` 은 원문 substring 아님 → 미탐 방지 확인.
- **캡처 16건 전수 재판정**(실제 보정 guard 로 replay): **STILL_FLAGGED_AFTER_FIX = 0** → 오탐 완전 해소.

---

## 6. bulk apply 예상 reject율 재산정

| 사유 | 보정 전 | 보정 후 |
|---|---|---|
| beyondSource → `rejected` | 성공분 18%(50-gate) ~ 27%(80-run) — **전부 오탐** | **≈0%**(캡처 16/16 해소, 잔여는 진짜 확장에 한정) |
| medicineLike → `rejected` | 0 (관측) | 0 |
| **총 rejected(격리) 예상** | ~18–27% | **≈0–2%**(진짜 확장 잔여만) |
| needs_review(기본) | HOLD_TERSE/MISSING 등 | 동일(품질 flag, reject 아님) |

- **핵심**: 보정 전 bulk 를 돌렸다면 정상 draft 의 ~1/4 가 오탐으로 `rejected` 격리되어 **yield 손실**이 컸다. 보정 후 이 손실이 사라진다(노출 안전망은 그대로 — 진짜 확장/의약품 단정은 계속 `rejected`).
- 남은 bulk blocker 는 **품질(beyondSource) 아님 → 실행(timeout 22%)** 뿐. timeout 은 config(policy `timeout_ms` 30s→60s + 저 concurrency)로 해소(별도 BULK-APPLY-RUN).

---

## 7. DB 불변 검증

| 항목 | 값 |
|---|---|
| 이번 WO DB write | **0** (measurement-only) |
| `product_candidate_description_drafts` | **0** |
| HFF candidate | 44,885 불변 |
| approved/exposure | 0 |
| master/identifier/shared | 이번 WO 무변경(내 scope) |
| AIUsageLog | 최소 DataSource 미등록 → write 없음 |

secret 미노출: key 원문 미출력·미커밋, 게이트 후 키 파일·임시 스크립트 삭제, 프록시 종료. raw seed/draft 캡처는 gitignored scratch 한정(미커밋).

---

## 8. 다음 WO

**beyondSource 규명·해소 완료** → LIVE-GATE §12 조건 중 **품질(beyondSource) 항목 clear**. 남은 것은 timeout(config) 뿐.

→ `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-RUN-V1` 로 진행 가능. 반영 필수:
1. HFF policy `timeout_ms` **30s→60s** (p95 41.7s 근거).
2. 낮은 concurrency **1~2** + backoff.
3. batch checkpoint / resume(offset).
4. timeout row → retry queue/failed list 분리(needs_review 와 구분).
5. 긴 mainFunction(멀티정제) 별도 batch.
6. 저장 기본 `needs_review`, guard FAIL(beyondSource/medicineLike) → `rejected`. **보정된 guard 사용 → 오탐 격리 제거.**
7. raw/OEM/export 제외 유지, approved/exposure 0.
8. (권장) BULK-APPLY-RUN 직전 소규모 재게이트로 보정 guard 의 실측 beyondSource율(≈0) 재확인 후 대량 착수.

---

## 부록. 필수 기록

| 항목 | 값 |
|---|---|
| scope | `HEALTH_FUNCTIONAL_FOOD_STORE_DESCRIPTION` |
| provider / model | gemini / gemini-2.5-flash |
| 표본 / 성공 / beyondSource | 80 / 59 / 16(27.1%) |
| 판정 | **16/16 guard 과민(false positive), 실제 확장 0** |
| 조치 | guard tune(조사/어미 stem + 공백제거 substring), prompt 무변경 |
| 회귀 test | guard jest **25/25 PASS**, 적대 케이스 유지, 캡처 16 재판정 잔여 flag **0** |
| 예상 reject율(beyondSource) | ~27% → **≈0** |
| DB write / drafts | **0 / 0** |
| secret 미노출 | ✅ (raw 캡처 gitignored scratch, 미커밋) |
| 커밋 | 하단 |

**최종:** `FAIL_BEYOND_SOURCE` 16건 전수 규명 → **전부 한국어 조사·띄어쓰기로 인한 guard 오탐**(실제 원문 밖 확장 0). guard 를 조사/어미 stem + 공백제거 substring 매칭으로 보정하여 캡처 전수 오탐을 제거하고 진짜 확장 검출력은 유지(적대 테스트 통과). bulk 예상 reject율(beyondSource)은 ~27%→≈0. 프롬프트는 수정 불필요. DB write 0, drafts 0. 남은 bulk blocker 는 timeout(config)뿐.
