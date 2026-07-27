# CHECK-O4O-HFF-KO-FIRST-10000-INTAKE-HINT-AND-DESIGN-TARGETED-BACKFILL-V1

> **WO**: WO-O4O-HFF-KO-FIRST-10000-INTAKE-HINT-AND-DESIGN-TARGETED-BACKFILL-V1
> **성격**: 제한적 보정(UPDATE 전용). 신규 INSERT 0 / DELETE 0 / canonical 재생성 0 / 전면 재작성 0.
> **판정**: **PASS — 5,669 / 5,669 UPDATE 완료, 독립검증 17/17 PASS**
> **일자**: 2026-07-27
> **선행**: [CHECK-O4O-HFF-KO-FIRST-10000-CONTENT-AND-DESIGN-AUDIT-V1](CHECK-O4O-HFF-KO-FIRST-10000-CONTENT-AND-DESIGN-AUDIT-V1.md) (판정 PAUSE_AND_FIX)

---

## §1. 기준으로 사용한 문서

| 문서 | 역할 | 반영 |
|---|---|---|
| `CHECK-O4O-HFF-KO-FIRST-10000-CONTENT-AND-DESIGN-AUDIT-V1` | 결함 #1(주의사항 소스 오류)·#4(무스타일 클래스)·기능성 중복 확정 | 본 WO 범위 = #1·#4·중복 |
| `docs/guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md` (CR-020 V1.2) | sd-* 클래스 어휘 계약 | 어휘 밖 클래스 전량 제거, 계약 내 클래스만 사용 |
| `packages/content-editor/src/components/ContentRenderer.tsx` `storeDescriptionCss` | 실제 CSS SSOT | 렌더 검증 시 **사본 없이 실 CSS 추출** 사용 |
| `docs/guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md` | HFF 내용 기준(R08 안전정보) | 공식 주의사항 복원 |
| `CLAUDE.md` 콘텐츠 작성 불변 원칙 | 원문 밖 의료사실 생성 금지 / 질환·증상명 방어적 약화 금지 | 전건 grounding 검증 |
| `docs/checks/CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-{5000,05001-10000}-V1` | 생산 스킴 이력 | 대상 격리 시그니처 재사용 |

**범위에서 제외(WO 명시)**: 구매지원 내러티브 · "이런 분께" · 구매 CTA · 영문 설명서 · 광고성 권유 · **주의사항의 강한 경고 카드화**.

> **CR-020 `sd-warn` 미사용 근거**: CR-020 §2-1 은 주의사항 전용 클래스로 `sd-warn`(적색 삼각 마커 + 좌측 굵은 선 + 경고 박스)을 정의하나, 본 WO 는 "주의사항을 가장 강한 색상이나 대형 경고 박스로 만들지 않는다 / 기능성보다 강하게 보이지 않게 한다 / 강한 경고형 스타일 사용 0" 을 명시 요구했다. 또한 HFF 정본 composer 계열(`hff-nutrient-compose.ts`, `hff-combo-compose.ts` 등)의 기존 관행도 주의사항을 `sd-foot` 저강조 라인으로 다룬다. → **계약 내 보조 정보 카드(`sd-core > sd-item`)** 를 채택했다. 어휘 밖 클래스 신설 0, CSS 변경 0.

---

## §2. 대상 확정 (manifest 고정)

- 격리 조건 = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND content LIKE '%식약처에 신고된 건강기능식품입니다%'`
- **대상 = 5,669건** (감사 CHECK 실측과 일치)
- manifest: `apps/api-server/src/scripts/data/hff-ko-first-10000-targeted-backfill-manifest.json`
  필드 = candidateId · statementNo · productMasterId · descriptionId · productName · mainFnctn · srvUse · intakeHint1 · beforeBodyHash (+ afterBodyHash · hintStatus · hintBlocks · hintItems)
- **재파생 mismatch**: `onlyFrozen 0 / onlyNow 0 / beforeHashDiff 0`

### v1 결정적 재현 게이트 (본 WO 의 핵심 안전장치)

보정 전에 기존 driver 의 `composeKo` 를 그대로 복제해 **저장 content 를 재생성**하고 전건 대조했다.

| 지표 | 결과 |
|---|---|
| `composeKoV1(원문) == 저장 content` | **5,669 / 5,669 일치 (mismatch 0)** |

→ 원문 drift·타 스킴 혼입이 배제되고, v1↔v2 차이가 **전부 본 WO 의 의도된 보정에만 귀속**됨이 증명된다.

---

## §3. 실제 수정 경로

| 구분 | 경로 | 내용 |
|---|---|---|
| 전용 backfill driver (신규) | `apps/api-server/src/scripts/hff-ko-first-10000-targeted-backfill.mjs` | v1 재현 · INTAKE_HINT1 파서 · v2 합성 · 전건 검증 · guarded UPDATE · 결정적 rollback |
| 표본 산출기 (신규) | `apps/api-server/src/scripts/hff-ko-first-10000-targeted-backfill-samples.mjs` | WO 8유형 20표본 결정적 선별 + 실 CSS 주입 렌더 HTML |
| 사후 독립검증 (신규) | `apps/api-server/src/scripts/hff-ko-first-10000-targeted-backfill-verify.mjs` | DB 실측 전용(READ-ONLY) 17항목 판정 |
| 생산 driver (수정) | `apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs` | 주의사항 소스 `IFTKN_ATNT_MATR_CN` → `INTAKE_HINT1`, v2 구조 반영 (WO 보정 A: "기존 driver … 최소 변경") |

**렌더러·CSS 수정 = 0.** `ContentRenderer.tsx` / `storeDescriptionCss` / 전역 CSS 변경 없음 — 보정은 **콘텐츠 측 클래스 정비만**으로 달성했다. 공용 parser/registry/composer 수정 0.

---

## §4. 보정 내용 (v1 → v2)

| # | 항목 | v1 (LIVE) | v2 (보정) |
|---|---|---|---|
| A | 주의사항 소스 | `IFTKN_ATNT_MATR_CN` (전량 공란) → generic fallback | **`INTAKE_HINT1`** 공식 원문 |
| B | 주의사항 표현 | `<h2>섭취 시 주의사항</h2><div class="sd-note">…</div>` (무스타일) | `<h2>섭취 시 참고사항</h2>` + `sd-core > sd-item`(원료별 `sd-tag` + `ul>li`) — 저강조 보조 카드 |
| B | 원문 공란 시 | generic 경고문 강제 노출 | **섹션 자체 미렌더** (빈 카드 0, 일괄 경고 삽입 0) |
| B | footer 중복 | `sd-foot` 이 주의사항 문장 반복 | `sd-foot` = `제품 표시사항을 함께 확인하십시오.` (중복 제거) |
| C | 전문가 문의 | `<p class="sd-who">` (목록 클래스를 `p` 에 오용 → 무스타일) | `<div class="sd-cta"><p>…</p></div>` — **문구 무변경** |
| C | 다기능성 상위 목록 | `<ul class="sd-func">`(어휘 밖·무스타일) | `sd-core > sd-item` (원료별 카드) |
| C | 기능성 중복 | `주요 기능성` 과 `기능성 상세` 가 **동일 문장 집합** 반복 | 1회만 표시(`기능성 상세` 섹션 제거) — 문장 손실 0 |
| — | 제품명·hero·intro·섭취방법·규격 | — | **바이트 단위 무변경** |

### 참고사항 파서 (원문 보존 규칙)

- `[원료]` 그룹 헤더 인식 → 원료별 카드. 헤더 앞 서문은 헤더 없는 카드로 보존.
- 항목 분리 마커: `①…⑳` / `⑴…⑽` / `(가)…(하)` / `1) 1.` / 줄바꿈. **마커만 제거**하고 문장은 verbatim.
- 완전 동일 문장 반복(원료별 "이상사례 발생 시 …")만 1회로 정리. 의미 손실 0.
- **반날조 불변식**: 모든 항목·헤더가 `flat(INTAKE_HINT1)` 의 부분문자열이어야 한다.
- **과소추출 가드**: dedupe 이전 기준 문자 커버리지 < 0.9 이면 HOLD (파서가 원문을 흘리는 사고 차단).
- 무의미 값(`-`, `\n`, `없음`)은 공란으로 판정 → 섹션 미렌더.

---

## §5. 표본 20건 사전 검증 — **20 / 20 PASS**

산출물: `apps/api-server/src/scripts/data/hff-ko-first-10000-targeted-backfill-samples-20.json`

| 유형 | 요구 | 선별 |
|---|:--:|:--:|
| INTAKE_HINT1 긴 제품 | 4 | 4 |
| 약물 복용 관련 | 3 | 3 |
| 임신·수유 관련 | 2 | 2 |
| 알레르기 관련 | 2 | 2 |
| 특정 질환·증상 관련 | 3 | 3 |
| INTAKE_HINT1 공란 | 2 | 2 |
| 기능성 중복 | 2 | 2 |
| 긴 MAIN_FNCTN·SRV_USE | 2 | 2 |

| 확인 항목 | 결과 |
|---|---|
| 공식 주의사항 의미 보존 (**원문 완전 소진 검사**: 렌더 항목·원료명을 원문에서 제거하면 마커·구두점만 남아야 함) | **잔여 0 / 20건** |
| 원문보다 강한 표현 추가 | **0** |
| 방어적 기능성 축소 | **0** (기능성 문장 집합 동일) |
| 강한 경고 카드화 | **0** (`sd-warn` 미사용, 기능성과 동일 accent) |
| 빈 주의사항 카드 | **0** |
| sd-card 스타일 정상 | **PASS** (브라우저 실측, 무스타일 sd-* 0) |
| 기능성·섭취방법 변화 | **0** |
| 전문가 문의 footer 정상 | **PASS** |
| 모바일 430 / 태블릿 820 / 데스크톱 1280 줄바꿈 | **PASS** (overflow 0, 문서 가로스크롤 0) |

---

## §6. 전체 dry-run + 게이트

```json
{ "target": 5669, "ok": 5669, "hold": 0,
  "hintPresent": 5453, "hintAbsent": 216,
  "duplicateFunctionSectionRemoved": 5669, "sdNoteFixed": 5669, "sdFuncFixed": 2431,
  "sdWhoOnPFixed": 5669, "footDedup": 5669, "genericFallbackRemoved": 5669 }
```

`sdFuncFixed 2431` = 감사 CHECK §6 의 `sd-func 2,431` 과 정확히 일치.

### 전 범위 독립 검증 (러너 산출물이 아닌 별도 검사기, 5,669 전건)

| 지표 | 결과 |
|---|---|
| hero / intro / 섭취 / 규격 섹션 변경 | **0 / 0 / 0 / 0** |
| 기능성 문장 손실 | **0** |
| 참고사항 항목이 원문 밖 | **0** |
| 원문 완전 소진(잔여 있는 제품) | **0 / 5,453** |
| 원문보다 강한 표현 추가 | **0** |
| 무스타일 클래스 / generic fallback / 중복 기능성 섹션 | **0 / 0 / 0** |
| sd-cta·sd-foot 누락 / 빈 카드 / `<style>`·인라인 style / 태그 불균형 | **0 / 0 / 0 / 0** |

### Apply 게이트 (WO §"Dry-run 게이트") — 전 조건 충족

manifest 재파생 mismatch 0 · 표본 20 PASS · INTAKE_HINT1 연결 PASS · 강한 표현 추가 0 · 기능성/섭취 drift 0 · expected update == 대상 수 · canonicalDup 0 · manifest 밖 변경 0 · rollback 가능 · 독립검증 PASS → **추가 승인 질문 없이 apply**(WO 명시 + HFF 자동승인 계약).

---

## §7. Apply 결과

```json
{ "mode": "apply", "target": 5669, "applied": 5669,
  "hold": 0, "driftHold": 0, "unchanged": 0, "elapsedMs": 50871 }
```

- UPDATE 조건 = `id AND master_id AND source_ref_id AND STORE AND canonical AND ko AND deleted_at IS NULL AND content = before` 전체 일치. 0행이면 `HOLD_CONCURRENT_DRIFT` — **발생 0**.
- **신규 INSERT 0 / DELETE 0 / canonical 재생성 0** (기존 description ID·canonical 유지, content 만 UPDATE).

### 수량 요약 (WO 완료 보고 항목)

| 항목 | 수 |
|---|---:|
| 대상 manifest | 5,669 |
| INTAKE_HINT1 존재 대상 | 5,453 |
| INTAKE_HINT1 공란 대상 | 216 |
| 실제 UPDATE | **5,669** |
| 신규 INSERT / 삭제 | **0 / 0** |
| 기능성 내용 변경 / 섭취방법 내용 변경 | **0 / 0** |
| 공식 참고사항 반영 | **5,453** (렌더 항목·원료명 23,614개 전건 grounding PASS) |
| 원문보다 강한 경고 추가 | **0** |
| generic fallback 제거 | **5,669** |
| 빈 참고사항 카드 | **0** |
| 기능성 중복 제거(`기능성 상세` 섹션) | **5,669** |
| 디자인 클래스 보정 | sd-note **5,669** · sd-func **2,431** · `p.sd-who`→`sd-cta` **5,669** · sd-foot 중복 제거 **5,669** |

---

## §8. 사후 독립검증 (DB 실측, READ-ONLY) — **17 / 17 PASS**

`hff-ko-first-10000-targeted-backfill-verify.mjs`

| 검증 | 결과 |
|---|---|
| 대상 행 수 == manifest | 5,669 == 5,669 |
| master_id·source_ref_id drift / candidate 링크 drift | **0 / 0** |
| canonicalDup / statementNo 중복 | **0 / 0** |
| sd-note / sd-func / `p.sd-who` | **0 / 0 / 0** |
| generic fallback / `기능성 상세` 섹션 | **0 / 0** |
| 참고사항 섹션 수 == INTAKE_HINT1 유효 수 | 5,453 == 5,453 |
| sd-cta / sd-foot 전건 | 5,669 / 5,669 |
| `<style>`·인라인 style / 빈 카드 / 본문 과소 | **0 / 0 / 0** |
| 참고사항 항목·원료명 grounding (23,614개) | 원문 밖 **0**, 섹션 불일치 **0** |
| **manifest 밖 write** (apply 창 04:11:45.507Z ~ 04:12:36.226Z 실측 자기유도) | **0** |
| 소프트 삭제 / 스킴 전체 행 수 | 0 / 5,669 (불변) |

> **참고 — 같은 날 타 세션 write**: `mfds_drug_otc` 540 · `mfds_easy_drug` 270 (OTC 트랙, apply 창 **밖**). 본 WO 대상·범위와 무관하며 손대지 않았다.

---

## §9. 실제 렌더 재점검 (LIVE DB 본문)

- 러너 산출물이 아니라 **apply 후 DB 실 content** 를 다시 읽어 렌더. 표본 20건 `LIVE == AFTER` **20/20 일치**.
- CSS 는 `ContentRenderer.tsx` 의 `storeDescriptionCss` 를 **추출해 그대로 주입**(사본 작성 0, 신규 화면·라우트 0).
- 폭 3종 실측:

| 폭 | 무스타일 sd-* | 요소 overflow | 문서 가로 스크롤 |
|---|:--:|:--:|:--:|
| mobile 430 | **0** | **0** | 없음 |
| tablet 820 | **0** | **0** | 없음 |
| desktop 1280 | **0** | **0** | 없음 |

- 사용 클래스 전량이 CR-020 어휘 내: `sd-card / sd-theme-green / sd-hero / sd-badges / sd-badge / sd-meta / sd-body / sd-intro / sd-why / sd-core / sd-item / sd-tag / sd-intake / sd-chips / sd-spec / sd-cta / sd-foot`.
- 육안 확인: 참고사항 카드가 기능성 카드와 **동일 강도**(테마 green accent)로 렌더되어 경고문 편향 없음. 질환명·증상명(고칼슘혈증·당뇨병·신장질환·손발 따끔거림·설사·위통·복부팽만 등)은 **원문 그대로 보존**.

---

## §10. Rollback 계약

- `hff-ko-first-10000-targeted-backfill-rollback-manifest.json` (5,669건: descriptionId · candidateId · productMasterId · beforeBodyHash · afterBodyHash)
- `--rollback` 은 **원문에서 v1 을 결정적으로 재생성** → `sha256 == beforeBodyHash` 확인 → 현재 본문이 `afterBodyHash` 와 일치할 때만 `content` 를 복원한다. 불일치 행은 건너뛴다.
- 재현 가능성 근거 = §2 의 `composeKoV1 == 저장 content` **5,669/5,669**.
- 추가 안전망: 보정 전 본문 전문을 세션 로컬(`C:/tmp/hff-bf-before-bodies.jsonl`, 비커밋)에 백업.

---

## §11. 다음 5,000개(10,001~) 생산 재개 가능 여부 — **가능**

생산 driver `hff-ko-agent-01-individual.mjs` 를 보정본과 동일 출력으로 정렬했고, **파리티 실측**으로 확인했다.

| 검사 | 결과 |
|---|---|
| 수정된 driver `composeKo` 출력 == apply 된 LIVE 본문 (5,669 전건) | **match 5,669 / diff 0 / hold 0** |

→ 10,001 이후 신규 생산분은 **처음부터** 공식 `INTAKE_HINT1` 반영 + 계약 내 클래스 + 기능성 중복 없음 상태로 생성된다. 동일 결함 재발 경로 차단.

---

## §12. 범위 밖으로 남긴 항목 (의도적)

| 항목 | 사유 |
|---|---|
| 감사 결함 #2 (구매지원 내러티브·"이런 분께"·CTA) | WO 명시 제외 |
| 감사 결함 #3 (영문 설명서) | WO 명시 제외 |
| 감사 결함 #5 (`class="sd-card sd-theme-green"` → `hasStoreDescriptionMarkup` 자동판별 실패) | WO 범위 밖 + **HFF/OTC 정본 composer 전 계열이 동일 형태**이므로 본 5,669건만 바꾸면 오히려 불일치가 생긴다. 해소는 렌더러 판별 로직(prefix 매칭) 측 별도 WO 사안 |
| `sd-spec > sd-item` 구조 이탈 | 감사 판정 "경미"·**스타일 정상 적용**(무스타일 아님). WO 디자인 점검 대상 6영역에 미포함 |
| `기능성` 항목의 `(가)(나)` 마커·`<원료>` 라벨 잔존 | v1 기능성 렌더 결과 그대로 — WO "기능성 내용 변경 0" 준수를 위해 미변경 |

---

## §13. 준수 확인

- DB 변경 = 대상 5,669행 `content`/`updated_at` **UPDATE 만**. INSERT·DELETE·DDL·마이그레이션 0.
- 자격증명 하드코딩 0 (`apps/api-server/.env` 에서만 읽어 Cloud SQL Auth Proxy 에 주입). 보고서에 비밀 값 0.
- 원문 밖 의료사실 생성 0 / 외부 LLM 호출 0 / 질환·증상명 약화 0.
- 공용 parser·registry·composer·렌더러·CSS 수정 0. 타 세션 작업물(OTC 트랙, KPA/Neture 프론트 WIP) 미접촉.
- 커밋 = 본 CHECK + 전용 러너 3종 + 생산 driver 1건 + data 산출물 5종 (pathspec 지정, `git add .` 미사용).
