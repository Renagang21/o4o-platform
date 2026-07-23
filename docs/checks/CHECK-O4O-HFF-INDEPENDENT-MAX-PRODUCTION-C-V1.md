# CHECK — WO-O4O-HFF-INDEPENDENT-MAX-PRODUCTION-C-V1 (Agent C: 눈·혈행·인지·항산화)

- **일자**: 2026-07-23
- **에이전트**: C (독립 소유 도메인 = 눈·혈행·인지·항산화 HFF 단일 기능성)
- **자동 승인 계약**: `WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1` (조사·최소보완·generate·dry-run·apply·독립검증·CHECK·commit·push 사전승인)
- **채널**: cloud-sql-proxy 5456 · o4o_platform · DB write = apply(이중게이트 `HFF_SF_APPLY_CONFIRM=YES`)만

---

## 1. 결과 요약

| 지표 | 값 |
|------|---:|
| **도메인 신규 LIVE (canonical)** | **42** |
| DB write (master + candidate + SPD ko + SPD en = ×4) | **168** |
| canonicalDup / stmtDupMasters (전 태그) | **0 / 0** |
| 독립검증 (hff-sf-verify) | **8/8 태그 independentVerifyPass=true** |
| 전체 sf LIVE census (전 에이전트) | 545 |
| HFF STORE ko canonical 총 | 9,144 |

**전체 중지 조건 해당 없음** — ProductMaster 오연결 0 / A·B 소유 성분 침범 0 / canonical·rollback 실패 0 / write 불일치 0 / 기존 LIVE drift 0 / 독립검증 실패 0.

---

## 2. 성분별 실적

### 생산 완료 (LIVE)

| # | 성분 (KO) | slug / 태그 접미 | 도메인 | 후보 READY | 신규 LIVE | BLOCKED |
|---|-----------|------------------|--------|----:|----:|----:|
| C-01 | 은행잎추출물 | ginkgo-leaf-c | 인지·혈행 (기억력 개선·혈행 개선) | 17 | **17** | – |
| C-02 | 마리골드꽃추출물 | marigold-flower-c | 눈 (황반색소밀도 유지·눈건강) | 10 | **10** | – |
| C-03 | 감마리놀렌산 | gamma-linolenic-acid-c | 혈행 계열 | 5 | **5** | – |
| C-07 | 스피루리나 | spirulina-c | 항산화 | 2 | **2** | – |
| C-07 | 클로렐라 | chlorella-c | 항산화 | 2 | **2** | – |
| C-08 | 토마토추출물 | tomato-c | 항산화 | 4 | **3** | 1 |
| C-08 | 스쿠알렌 | squalene-c | 항산화 | 2 | **2** | – |
| C-08 | 천마등복합추출물(HX106) | gastrodia-hx106-c | 인지 (기억력 개선) | 2 | **1** | 1 |
| | **합계** | | | | **42** | 2 |

BLOCKED 2건(토마토 1·천마HX106 1)은 Guard(임베디드 클레임/미접지 클레임)의 **정상 차단** — DB 미반영. WO상 Guard 차단은 전체 중지 사유 아님.

### GROUNDING_PENDING / HOLD (생산 0 — 정당한 보류)

| 성분 | slug | READY | reviewLater | pending(EN) | 사유 |
|------|------|----:|----:|----:|------|
| 헤마토코쿠스추출물 | haematococcus | 3(위양성) | 12 | 12 | select가 24자 브래킷 캡으로 pure-single 오인한 **마리골드+헤마토코쿠스 2-기능성 combo** 3건 → Guard `D-CLAIM-UNGROUNDED-001` 전량 차단(오귀속 방지). 순수 헤마토코쿠스 눈피로도 EN 정본 미확정. |
| 포스파티딜세린 | phosphatidylserine | 0 | 46 | 45 | 인지력 개선·자외선 피부건강 EN 정본 미확정(mapFunctionEn 미커버) → WO상 GROUNDING_PENDING 보류 |
| 빌베리추출물 | bilberry | 0 | 8 | 8 | 눈의 피로도 개선 EN 정본 미확정 → GROUNDING_PENDING 보류 |
| 마늘 | garlic | 0 | 4 | 2 | serving 파싱 실패 2 + EN pending 2 |

> 위 보류는 WO의 명시 지침("EN 정본 미확정이면 해당 문구가 필요한 제품만 GROUNDING_PENDING, 다른 확정 제품은 계속 생산")에 따른 것으로, **공용 mapFunctionEn(shared) 임의 편집 없이** 도메인 확정분 42건만 생산했다. EN 정본 확정 시 후속 WO에서 재개 가능.

---

## 3. 라운드별 실적

1. **라운드 1 (명명 성분)**: 은행잎·마리골드·감마리놀렌산·스피루리나·클로렐라 → select→generate(36 PASS)→dry-run(canonicalDup 0)→apply→verify **36 LIVE**
2. **라운드 2 (C-08 discovery)**: hff-sf-discovery 전수(scanned 41,261 / 54그룹 / EN-hit 71) → 도메인+EN확보 4후보 필터 → 토마토·스쿠알렌·천마HX106 생산 **6 LIVE** (마늘 0 READY)
3. **라운드 3 (PENDING 실측)**: 헤마토코쿠스·포스파티딜세린·빌베리 select → 확정분 0(전량 EN-pending 또는 combo 위양성 Guard 차단) → 보류 기록

---

## 4. 독립검증 (hff-sf-verify, 새 연결 read-only)

전 8태그: `masters = spdKo = spdEn = candidatesLinked = EXPECT`, `spdRefLinked = EXPECT×2`, `canonicalDup = 0`, `stmtDupMasters = 0`, `independentVerifyPass = true`.

| 태그 | expect | pass |
|------|---:|:---:|
| ginkgo-leaf-c | 17 | ✅ |
| marigold-flower-c | 10 | ✅ |
| gamma-linolenic-acid-c | 5 | ✅ |
| spirulina-c | 2 | ✅ |
| chlorella-c | 2 | ✅ |
| tomato-c | 3 | ✅ |
| squalene-c | 2 | ✅ |
| gastrodia-hx106-c | 1 | ✅ |

---

## 5. 코드 변경 (path-specific)

- `apps/api-server/src/scripts/hff-sf-registry.ts` — 도메인 성분 config 추가(은행잎·마리골드·감마리놀렌산은 `allowClassified` pure-single 소유 / 토마토·스쿠알렌·마늘·천마HX106 discovery HIT). composer 복제 0.
- `apps/api-server/src/scripts/hff-sf-c-blocked-diag.ts` — BLOCKED ruleId 진단 도구(신규).
- **공용 코드 미접촉**: `hff-source-parse.ts`(classify) / `hff-nutrient-registry.ts`(mapFunctionEn) 무수정 — 타 세션 WIP·pnpm-lock 미접촉.

## 6. 산출물

- `docs/checks/data/product-description-guard/hff-sf-c-domain/*.json` — ready / target / review-later / shard
- `docs/checks/data/product-description-guard/hff-sf-c-domain/rollback-manifests/` — 8배치 rollback manifest(각 apply 대상 master/candidate/spd id)

## 7. 매장용 설명서 원칙 준수

- 공식 MAIN_FNCTN 원문 기능성 그대로 보존(기억력 개선·혈행 개선·황반색소밀도 유지 눈건강·항산화·혈중 콜레스테롤 개선 등) — 방어적 삭제·순화·일반건강정보화 0.
- 원문 근거 밖 의학적 사실 추가 0(EN = 공용 mapFunctionEn grounded 재사용, 미매핑은 GROUNDING_PENDING).
- 하단 매장 내 전문가 문의 안내 유지.
