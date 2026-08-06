# CHECK — WO-O4O-HFF-ZH-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1

- 대상: 건강기능식품(HFF) 매장 설명서 **중국어(zh) canonical**, Batch 02 신규 10,000건
- 기준 commit: `b27fecbd2` (조상 확인 완료) · 착수 HEAD: `9efba8fca`
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 포트 5631 → 토큰 만료 후 5641 (둘 다 이번 세션 기동분만 종료)
- 선행 조건: 편집기 선택 공유 없음(`ide_selection` 미첨부 상태에서 착수)

착수 시 작업 트리에 타 세션 WIP(`otc-zh-batch01-verify.ga.json`)이 있었고 이번 경로와 겹치지 않으므로, `git checkout` / `pull` 없이 자기 산출물만 사용해 진행했다.

---

## 1. Batch 02 모집단 (§3)

| 항목 | 값 |
|---|---:|
| KO STORE canonical 존재 · ZH STORE canonical 부재 | **30,918** |
| Batch 01 대상 10,000 중복 | 0 (ZH 존재로 자동 제외) |
| 기존 중국어 문제 큐(379) 제외 | −367 |
| KO 영구 HOLD 제외 | −0 (KO canonical 부재로 이미 제외됨) |
| **후보 풀** | **30,551** |
| ProductMaster 중복 / koCanonicalId 중복 | 0 / 0 |
| 생산 가능 후보(build 기준) | 10,014 |
| **고정 모집단** | **10,000** (master_id 오름차순 결정적 선정) |

기존 중국어 언어 코드(`zh` 단일)와 canonical 저장 계약(`STORE`/`canonical`/`o4o_hff_generated`)을 그대로 사용했다.

---

## 2. 생산 (§4)

KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만** 중국어로 치환한다. 구조(태그·class·순서)를 손대지 않으므로 renderer family 가 그대로 승계된다. **EN canonical 은 기준본으로 사용하지 않았다.**

```
b02-pool(read-only 덤프) → b02-plan(build 기준 미해소 조각 산정)
→ 저작 라운드 z1~z15 → b02-render(생성+렌더검증+모집단 고정) → apply → verify
```

| 라운드 | 누적 생산 가능 문서 | 라운드 | 누적 생산 가능 문서 |
|---|---:|---|---:|
| 시작(Batch 01 사전) | 933 | z8 | 7,410 |
| z1 | 2,075 | z9 | 7,985 |
| z2 | 2,942 | z10 | 8,533 |
| z3 | 3,974 | z11 | 8,767 |
| z4 | 4,796 | z12 (+토큰 교정) | 9,175 |
| z5 | 5,519 | z13 | 9,143 |
| z6 | 6,311 | (키 충돌 교정) | 9,452 |
| z7 | 6,838 | z14 / z15 | 9,750 / **10,026** |

**신규 저작 문구**: z1~z15 합계 약 **3,500 문구** (any 슬롯 공용 등록). 기능성·섭취방법·주의사항·기준규격을 원문 순서대로 옮겼고, 원료 귀속·개별인정번호·수치·단위·괄호 용량은 슬롯 치환 구조상 그대로 승계된다.

금지 HOLD 사유(`ASSET_MISSING`/`NO_ENTRY`/`TEMPLATE_UNSUPPORTED`/`LOW_EFFICIENCY`/`PENDING_DIRECT_TRANSLATION`)는 최종 원장에 **한 건도 없다**.

### 2-1. 생산 중 확정한 엔진 교정 3건

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | `1회당`·`1회에`·`1회시` 가 들어간 섭취 문구가 라운드마다 계속 NUMBER_DRIFT | 빈도 표기 정규식이 `회` 뒤 조사(당/에/시/씩)를 허용하지 않아 `1회` 를 **가짜 용량 토큰**으로 셈 | `hff-zh-b01-translate.mjs` 빈도 토큰/스트립 정규식에 조사 허용 |
| 2 | `납 : 1.0 mg/kg 이하` ↔ `③납 : 3.0mg/kg이하` 가 **같은 사전 키**로 붕괴 → 수치 뒤바뀜 | 공용 `key()` 의 마커 제거 패턴 `\s\d\s*[).]` 이 소수점 `1.` 을 마커로 오인해 삭제 | `hff-en-batch-01-translate.mjs` 의 `MARK` 에 `(?!\d)` 가드 추가 |
| 3 | 열거 마커가 값에 섞여 KO `④` → ZH `3)` 로 출력 | 마커 포함 사전 값이 그대로 방출 | 해당 항목 값에서 선행 마커 제거(키는 마커 무시 계약 유지) |

②는 공용 모듈(`hff-en-batch-01-translate.mjs`) 수정이다. 소비처는 HFF EN/ZH 생산 스크립트뿐이며, EN 트랙은 이미 생산 완료되어 재생성 대상이 아니다. 키 생성과 조회가 모두 같은 함수를 통과하므로 사전 정합성은 유지되고, 변경 효과는 **소수점 수치가 키에서 붕괴되던 충돌 제거**에 한정된다.

---

## 3. 핵심 검증 (§5)

- 수치 검증은 **번역 슬롯별로** 수행한다. 슬롯 하나라도 원문 수치·단위·빈도 토큰이 유실되면 그 문서 전체를 생산에서 제외한다.
- 단위 대응: 정↔片 / 캡슐↔粒胶囊 / 포↔袋 / 병↔瓶 / 스푼↔勺 / 알↔粒 / 매↔张 / 개↔个, 빈도는 `1일 N회`↔`每日N次` 축으로 환원해 비교.
- 제조사 법인명은 원문 표기를 유지한다(Batch 01 동일 계약).
- 기능성 추가·삭제·병합, 치료·예방 표현 강화, 제품·원료 간 혼입, 슬롯 내 한국어 잔존, 광고 문구·구매 CTA는 없다.

---

## 4. 렌더·Apply (§7)

렌더 감사: 430 / 820 / 1280px, `.store-desc-content` 스코프, 5,182 문서 × 3 폭 = **15,546 렌더**.

| 항목 | 결과 |
|---|---|
| structureParity / pageOverflow / elementOverflow / clipped | 0 / 0 / 0 / 0 |
| emptyH2 / emptyUl / emptyLi | 0 / 0 / 0 |
| undefinedClass / rawHtml / markerVisible | 0 / 0 / 0 |
| hangulVisible (번역 슬롯 한국어) | 0 |
| labelLost / licenseNoLost | 0 / 0 |
| **verdict** | **PASS** |

최초 렌더에서 `undefinedClass: 36` (`sd-fn`)이 나왔다. 공유 렌더러 `ContentRenderer.tsx` 의 `storeDescriptionCss` 에 `sd-fn` 정의가 없어 해당 문서는 **무스타일로 렌더**된다. 공용 패키지 수정은 이번 WO 범위 밖이므로, 정의 없는 `sd-*` 클래스를 쓰는 문서 **12건을 생산에서 제외하고 `RENDER_FAILURE` 로 큐에 남긴 뒤** 모집단을 다시 10,000 으로 고정했다. 재렌더 결과 `undefinedClass: 0 / verdict PASS`.

Apply:

| 항목 | 결과 |
|---|---|
| expected INSERT / actual INSERT | 10,000 / **10,000** |
| UPDATE / SKIP / 실패 shard | 0 / 0 / 0 |
| ZH canonical | 10,000 → **20,000** (Δ 10,000) |
| spd 전체 | 156,816 → 166,816 (Δ 10,000) |
| KO / EN / ProductMaster | 불변 (`koUnchanged`·`enUnchanged`·`pmUnchanged` = true) |
| rollback manifest | apply 전 기록 (`hff-zh-b02-rollback-v1.json`, soft delete 계약) |

shard(500) 단위 낙관적 잠금(KO hash 재확인) + master 별 ZH 중복 가드를 트랜잭션 안에서 수행했다.

---

## 5. 독립검증 (§7)

apply 산출물을 신뢰하지 않고 **DB 현재 상태만** 읽어 재계산했다 (read-only, dbWrites 0).

| 항목 | 결과 |
|---|---|
| Batch 02 상태 합계 10,000 | ✅ |
| 저장 계약(zh/canonical/STORE/o4o_hff_generated) 위반 | 0 |
| 저장 본문 = 렌더 통과 본문 (byte 동일) | 0 mismatch |
| KO canonical hash drift | 0 |
| ProductMaster 변경 | 0 |
| ZH canonical 증가량 일치 | ✅ (20,000, Δ 10,000) |
| canonicalDup | 0 |
| 번역 슬롯 한국어 | 0 |
| 기능성·수치·단위 drift (문서 단위 재대조) | 0 |
| Batch 밖 write | 0 |
| 문제 큐 누락·중복·필드 결손 | 0 / 0 / 0 |
| **verdict** | **PASS** |

---

## 6. 문제 큐 (§6)

| 구분 | 건수 |
|---|---:|
| Batch 01 승계 | 379 |
| Batch 02 신규 | 42 |
| **통합 큐 합계** | **421** |

| issueType | 건수 |
|---|---:|
| `NUMBER_STRUCTURE_AMBIGUOUS` | 356 |
| `TRANSLATION_AMBIGUOUS` | 53 |
| `RENDER_FAILURE` | 12 |

- 중복 0 / 필드 결손 0 / 금지 사유 0
- Batch 02 신규 42건 = TRANSLATION_AMBIGUOUS 25 (슬롯은 모두 옮겼으나 본문에 한국어가 남는 구간) + RENDER_FAILURE 12 (`sd-fn` 미정의) + NUMBER_STRUCTURE_AMBIGUOUS 5
- 각 행에 `batch / productMasterId / koCanonicalId / productName / issueType / problematicSourceText / requiredNextAction / retryCondition` 을 기록했다.
- **이번 작업에서 KO canonical 은 한 건도 수정하지 않았다.**

---

## 7. 누적 현황

| 항목 | 값 |
|---|---:|
| HFF KO canonical | **40,918** |
| HFF EN canonical | 40,902 (불변) |
| HFF ZH canonical | 10,000 → **20,000** |
| 중국어 누적 완료 | **20,000** (Batch 01 10,000 + Batch 02 10,000) |
| 통합 문제 큐 누적 | **421** |
| **남은 중국어 미생산** | **20,918** |

---

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `data/hff-zh-b02-population-v1.json` | 모집단 게이트 (후보 풀 30,551) |
| `data/hff-zh-b02-phrases-v1.json` / `-plan-v1.json` | 슬롯 문구 추출 · 저작 규모 산정 |
| `data/hff-zh-b02-z1..z15-translations-v1.json` | 라운드별 직접 번역 자산 |
| `data/hff-zh-b02-safe-targets-v1.json` | 안전 대상 10,000 |
| `data/hff-zh-b02-render-audit-v1.json` | 렌더 감사 PASS |
| `data/hff-zh-b02-rollback-v1.json` / `-apply-result-v1.json` | 롤백 계약 / Apply 결과 |
| `data/hff-zh-b02-verify-v1.json` | 독립 검증 PASS |
| `data/hff-zh-deferred-issue-queue-through-batch02-v1.jsonl` / `-summary-v1.json` | 통합 문제 큐 421 |

스크립트: `hff-zh-b02-{pool,extract,measure,measure2,plan,render,apply,verify}.mjs`
엔진: `hff-zh-b01-{translate,build,render-worker}.mjs` (b02 저작 라운드 로더 + 빈도 토큰 교정), 공용 `hff-en-batch-01-translate.mjs` (`MARK` 소수점 가드)

---

## 9. 안전 계약 준수

| 항목 | 상태 |
|---|---|
| 분석·dry-run·독립검증 read-only (`SET default_transaction_read_only = on`) | 적용 |
| KO canonical / EN / 다른 언어 / ProductMaster / candidate 수정 | 없음 |
| Batch 02 밖 write | 0 |
| 기존 ZH 삭제 | 없음 (전량 신규 INSERT) |
| 자격증명 노출 (코드/JSON/CHECK/로그/명령 인자) | 없음 (env 주입) |
| 프록시 | 이번 세션이 기동한 포트 5631·5641 만 종료 |
| 임시·디버그 파일 | 종료 전 삭제 |
| Git | 경로 지정 commit, `git add .` 미사용, 타 세션 WIP·`pnpm-lock.yaml` 미포함 |
