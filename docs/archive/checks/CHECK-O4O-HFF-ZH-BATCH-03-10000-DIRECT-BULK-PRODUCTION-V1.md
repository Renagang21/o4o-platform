# CHECK — WO-O4O-HFF-ZH-BATCH-03-10000-DIRECT-BULK-PRODUCTION-V1

- 대상: 건강기능식품(HFF) 매장 설명서 **중국어(zh) canonical**, Batch 03 신규 10,000건
- 기준 commit: `122866ff9` (조상 관계 Git 직접 확인 = true) · 착수 HEAD: `2deeb8e73` (branch `main`)
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 **포트 5463** (이번 세션 기동분만 종료)
- 착수 시 작업 트리는 이번 트랙 산출물 외에는 clean, 타 세션 WIP 없음

---

## 1. Batch 03 모집단 (§3)

| 항목 | 값 |
|---|---:|
| KO STORE canonical 존재 · ZH STORE canonical 부재 | **20,918** |
| Batch 01·02 대상 20,000 중복 | 0 (ZH 존재로 자동 제외) |
| 기존 중국어 문제 큐(421) 제외 | −397 |
| KO 영구 HOLD 제외 | −0 (KO canonical 부재로 이미 제외됨) |
| sd-fn `RENDER_FAILURE` 12건 재검증 대상 복귀 (§6) | +12 (풀에 포함) |
| **후보 풀** | **20,521** |
| ProductMaster 중복 / koCanonicalId 중복 | 0 / 0 |
| 생산 가능 후보(build 기준) | 10,170 |
| **고정 모집단** | **10,000** (master_id 오름차순 결정적 선정) |

생산 가능 후보가 10,000 이상임을 확인한 뒤에만 Apply 로 진행했다(§3 하드 게이트). 저장 계약은 기존과 동일(`zh` / `STORE` / `canonical` / `o4o_hff_generated`).

---

## 2. 생산 (§4)

KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만** 중국어로 치환한다. 구조(태그·class·순서)를 변경하지 않으므로 renderer family 가 그대로 승계된다. **EN canonical 은 기준본으로 사용하지 않았다.**

```
b03-extract(슬롯 문구 추출) → b03-plan/measure2(build 기준 미해소 조각 산정)
→ 저작 라운드 z1~z5 → b03-render(생성+렌더검증+모집단 고정) → apply → verify
```

| 라운드 | 신규 문구 | 누적 생산 가능 문서 |
|---|---:|---:|
| 시작(Batch 01·02 사전 승계) | — | 8,600 대 |
| z1 | 260 | 9,329 |
| z2 + z3 | 278 | 9,884 |
| (수치 토큰 교정) + z4 | 129 | 10,058 |
| z5 | 99 | **10,170** |
| **합계** | **766** | |

Batch 01·02 에서 승인된 ZH 자산·용어집을 그대로 재사용하고, 사전에 없는 문구만 제품 문맥에 맞춰 신규 번역했다. 기능성·섭취방법·주의사항·기준규격은 원문 순서대로 옮겼으며, 원료 귀속·개별인정번호·수치·단위·괄호 용량은 슬롯 치환 구조상 그대로 승계된다.

금지 HOLD 사유(`ASSET_MISSING` / `NO_ENTRY` / `TEMPLATE_UNSUPPORTED` / `LOW_EFFICIENCY` / `PENDING_DIRECT_TRANSLATION`)는 최종 원장에 **한 건도 없다**.

### 2-1. 생산 중 확정한 교정

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | z2·z3 저작 직후 `NUMBER_DRIFT: 41` | 저작 ZH 가 `포`를 `包`, `매`를 `片`, `캡슐`을 `粒软胶囊` 로 옮겨 단위 환원표(`canonUnit`)의 대응축에서 이탈 | 저작 자산을 `袋` / `张` / `粒胶囊（软胶囊）` 로 교정 |
| 2 | 위 일괄 치환의 부수 손상 (`4片包衣片剂` → `4片袋衣片剂`) | `包`→`袋` 일괄 치환이 `包衣`(코팅)를 함께 바꿈 | 해당 항목 복원, 이후 치환은 단위 문맥에서만 수행 |
| 3 | `1일2회, 1회캡슐을…` 1건이 교정 불가 | `회` 뒤에 곧바로 한글이 붙어 빈도 토큰 경로를 벗어나 `1회` 가 대응 없는 단독 용량 토큰이 됨 | 해당 문구를 사전에서 제외(문서 1건 미생산, 큐 유지) |

전 저작 자산(z2~z5 총 506쌍)에 대해 `lostNums(ko, zh)` 를 전수 실행해 **수치 유실 0** 을 확인한 뒤 렌더로 진행했다.

### 2-2. sd-fn 12건 (§6)

Batch 02 문제 큐의 `RENDER_FAILURE` 12건은 공유 렌더러 `ContentRenderer.tsx` 의 `storeDescriptionCss` 에 `sd-fn` 정의가 없어 무스타일로 렌더되던 건이다.

- 기존 디자인 family 를 확인해 `sd-fn` 을 **이미 존재하는 `sd-why` / `sd-who` 선택자 그룹에 합류**시키는 최소 복원만 수행했다(기본 블록 + `@container (min-width:640px)` 블록).
- 다른 family 의 선택자·값은 변경하지 않았다.
- 재검증 결과 **12건 중 11건이 렌더 PASS 후 중국어 canonical 생산**, 1건은 번역 미해소로 생산되지 않아 큐에 유지된다.

---

## 3. 핵심 검증 (§5)

- 수치 검증은 **번역 슬롯별로** 수행한다. 슬롯 하나라도 원문 수치·단위·빈도 토큰이 유실되면 그 문서 전체를 생산에서 제외한다.
- 단위 대응: 정↔片 / 캡슐↔粒胶囊 / 포↔袋 / 병↔瓶 / 스푼↔勺 / 알↔粒 / 매↔张 / 개↔个, 빈도는 `1일 N회`↔`每日N次` 축으로 환원해 비교.
- 확정 규칙 유지: `1회당·1회에 → 횟수 표현`, `1.0·3.0 등 소수점 → 마커로 제거 금지`, `PUA·제로폭 → 조회 키에서만 제거`, `&lt;원료명&gt; → [Ingredient] 귀속 보존`.
- 제조사 법인명은 원문 표기를 유지한다(Batch 01·02 동일 계약).
- 기능성 추가·삭제·병합, 제품·원료 간 번역 혼입, 슬롯 내 한국어 잔존, 광고 문구·구매 CTA는 없다.

---

## 4. 렌더·Apply (§7·§8)

렌더 감사: 430 / 820 / 1280px, `.store-desc-content` 스코프, 6,709 문서 × 3 폭 = **20,127 렌더** (구조 시그니처 464종 전수 + 고위험 문서 전수).

| 항목 | 결과 |
|---|---|
| structureParity / pageOverflow / elementOverflow / clipped | 0 / 0 / 0 / 0 |
| emptyH2 / emptyUl / emptyLi | 0 / 0 / 0 |
| undefinedClass / rawHtml / markerVisible | 0 / 0 / 0 |
| hangulVisible (번역 슬롯 한국어) | 0 |
| labelLost / licenseNoLost | 0 / 0 |
| canonicalDup | 0 |
| **verdict** | **PASS** |

Apply (이중 게이트: `--apply` + `HFF_ZH_B02_APPLY_CONFIRM=YES`, 렌더 PASS 전제):

| 항목 | 결과 |
|---|---|
| expected INSERT / actual INSERT | 10,000 / **10,000** |
| UPDATE / SKIP / 실패 shard | 0 / 0 / 0 |
| ZH canonical | 20,000 → **30,000** (Δ 10,000) |
| spd 전체 | 166,816 → 176,816 (Δ 10,000) |
| KO / EN / ProductMaster | 불변 (`koUnchanged`·`enUnchanged`·`pmUnchanged` = true) |
| rollback manifest | apply 전 기록 (`hff-zh-b03-rollback-v1.json`, soft delete 계약) |

shard(500) 단위 낙관적 잠금(KO hash 재확인) + master 별 ZH 중복 가드를 트랜잭션 안에서 수행했다.

---

## 5. 독립검증 (§8)

apply 산출물을 신뢰하지 않고 **DB 현재 상태만** 읽어 재계산했다 (read-only, dbWrites 0).

| 항목 | 결과 |
|---|---|
| Batch 03 상태 합계 10,000 | ✅ |
| 저장 계약(zh/canonical/STORE/o4o_hff_generated) 위반 | 0 |
| 저장 본문 = 렌더 통과 본문 (byte 동일) | 0 mismatch |
| KO canonical hash drift | 0 |
| ProductMaster 변경 | 0 |
| ZH canonical 증가량 일치 | ✅ (30,000, Δ 10,000) |
| canonicalDup | 0 |
| 번역 슬롯 한국어 | 0 |
| 기능성·수치·단위 drift (문서 단위 재대조) | 0 |
| Batch 밖 write | 0 |
| 문제 큐 누락·중복·필드 결손 | 0 / 0 / 0 |
| **verdict** | **PASS** |

---

## 6. 문제 큐 (§7)

| 구분 | 건수 |
|---|---:|
| Batch 02 까지 승계 | 421 |
| sd-fn 재검증 해소 | −11 |
| Batch 03 신규 | +107 |
| **통합 큐 합계** | **517** |

| issueType | 건수 |
|---|---:|
| `NUMBER_STRUCTURE_AMBIGUOUS` | 356 |
| `TRANSLATION_AMBIGUOUS` | 160 |
| `RENDER_FAILURE` | 1 |

- 중복 0 / 필드 결손 0 / 금지 사유 0 / uniqueProductMasters 517
- Batch 03 신규 107건은 전부 `TRANSLATION_AMBIGUOUS` — 슬롯은 모두 옮겼으나 본문에 한국어 구간이 남는 문서다.
- 잔존 `RENDER_FAILURE` 1건은 렌더러 복원 후에도 번역이 미해소되어 생산되지 않은 건이다.
- 각 행에 `batch / productMasterId / koCanonicalId / productName / issueType / problematicSourceText / requiredNextAction / retryCondition` 을 기록했다.
- **이번 작업에서 KO canonical 은 한 건도 수정하지 않았다.**

---

## 7. 누적 현황

| 항목 | 값 |
|---|---:|
| HFF KO canonical | **40,918** (불변) |
| HFF EN canonical | 40,902 (불변) |
| HFF ZH canonical | 20,000 → **30,000** |
| 중국어 누적 완료 | **30,000** (Batch 01·02·03 각 10,000) |
| 통합 문제 큐 누적 | **517** |
| **남은 중국어 미생산** | **10,918** |

---

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `data/hff-zh-b03-phrases-v1.json` | 슬롯 문구 추출 |
| `data/hff-zh-b03-z1..z5-translations-v1.json` | 라운드별 직접 번역 자산 (766 문구) |
| `data/hff-zh-b03-safe-targets-v1.json` | 안전 대상 10,000 |
| `data/hff-zh-b03-render-audit-v1.json` | 렌더 감사 PASS |
| `data/hff-zh-b03-rollback-v1.json` / `-apply-result-v1.json` | 롤백 계약 / Apply 결과 |
| `data/hff-zh-b03-verify-v1.json` | 독립 검증 PASS |
| `data/hff-zh-deferred-issue-queue-through-batch03-v1.jsonl` / `-summary-v1.json` | 통합 문제 큐 517 |

스크립트: `hff-zh-b03-{extract,measure,measure2,plan,render,apply,verify,sdfn-scan}.mjs`
엔진: `hff-zh-b01-{translate,build,render-worker}.mjs` (b03 저작 라운드 로더 추가)
공유 렌더러: `packages/content-editor/src/components/ContentRenderer.tsx` (`sd-fn` 최소 복원)

---

## 9. 안전 계약 준수

| 항목 | 상태 |
|---|---|
| 분석·dry-run·독립검증 read-only (`SET default_transaction_read_only = on`) | 적용 |
| KO canonical / EN / 다른 언어 / ProductMaster / candidate 수정 | 없음 |
| Batch 03 밖 write | 0 |
| 기존 ZH 삭제 | 없음 (전량 신규 INSERT) |
| 자격증명 노출 (코드/JSON/JSONL/CHECK/로그/Git diff/명령 인자) | 없음 (env 인라인 주입 후 즉시 해제) |
| 프록시 | 이번 세션이 기동한 포트 5463 만 종료 |
| 임시·디버그 파일 | 종료 전 삭제 |
| Git | 경로 지정 commit, `git add .` 미사용, 타 세션 WIP·`pnpm-lock.yaml` 미포함 |
