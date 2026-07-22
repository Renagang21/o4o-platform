# CHECK — HFF 단일 기능성 최대 풀 통합 + 공용 정본 확장 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-SINGLE-FUNCTIONAL-MAX-POOL-INTEGRATION-B-V1`. 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md). 정본 파이프라인 `1156fa293`.
- 성격: **read-only 조사·정본화 · DB write 0 · generate/apply 0 · 임의 기능성/EN 생성 0.**
- 시작 `2026-07-22 22:12 +0900` · 종료 단일 세션. 채널 Proxy 5435(자체 토큰). 공용 코드 단독 소유자 = Agent B.

## 0. 결론

> **전체 HFF 단일 기능성 미생산 원료 전수 발굴(57 group · EN-hit producible 200) → 명료·표준영문명 7원료 정본 통합.**
> 신규 READY **124**(generate PASS ~107): 뮤코다당·단백 54·인삼 28·키토산 12·알로에전잎 10·홍국 9·로즈힙 8·키토올리고당 3.
> 기존 5원료 79 LIVE·프로바이오틱스·복합형 4,526 **무변경**(canonicalDup 0·stmtDup 0). A/B/C stmt-shard 직접주입 배정표 산출. **DB write 0.**

## 1. 기준선 (새 연결)

| 지표 | 값 |
|---|---|
| 단일 기능성 LIVE(tag `batch:single-functional-%`) | **79** (A shard0 26 + B shard1 30 + C shard2 23) |
| 프로바이오틱스 LIVE | 767 |
| 복합형 LIVE (tag-agnostic 카드≥2) | 4,526 |
| canonicalDup / statementNo 중복 master | **0 / 0** |

## 2. 전체 인벤토리 (전수 발굴)

`hff-sf-discovery.ts` — pure-single([원료] 브래킷 1종) · 고형 · 미승격 · not-taken 후보를 브래킷 라벨로 히스토그램(등재원료·프로바이오틱스·기존 5종 제외, 중점/인정번호 변이 정규화).

- 스캔 41,261 · **57 group · EN-hit producible 200**(제품 전 기능성이 `mapFunctionEn` 매핑되는 건).
- 산출물: `docs/checks/data/product-description-guard/hff-sf-maxpool/sf-discovery-inventory.json`.
- ⚠️ 파서 버그 교정: 초기 페이지네이션이 `id` 미선택으로 3,000행에서 중단 → `id` 추가 후 전량 스캔.

## 3. A/C 통합

- A/C 커밋 origin 반영 확인: A shard0(f51cfc3b4, 26) · C shard2(34a436705, 23) — **내 정본 `hff-sf-apply` 사용**(원료별 composer 복제 0). 소유권 충돌 0.
- 통합 검증: 동일 statementNo 중복 0 · 원료 중복조사 0 · 기능성 귀속 충돌 0 · shard 교집합 0(신규 배정 stmt 전건 unique).
- 기존 5원료 fresh 풀은 A/B/C 생산으로 소진(exclude-taken 정상 작동) — 79 LIVE 불변.

## 4. 신규 정본화 원료 (7종) — KO/EN grounded

`hff-sf-registry.ts` `SF_INGREDIENTS` 확장. **displayEn = 표준 영문명 정적 lookup(계약 §3)**, 기능성 EN = `mapFunctionEn` 재사용(**임의생성 0**). labelRe = 브래킷 유일식별(교차귀속 방지, 인삼은 홍/흑/산/수삼 negative-lookbehind).

| 원료 | displayEn | 기능성(대표) EN | READY | shard 0/1/2 |
|---|---|---|---:|---|
| 뮤코다당·단백 | Mucopolysaccharide-protein | joint and cartilage health | **54** | 24/19/11 |
| 인삼 | Korean ginseng | supporting immune function 외 | **28** | 7/8/13 |
| 키토산 | Chitosan | improving blood cholesterol | **12** | 2/5/5 |
| 알로에 전잎 | Aloe whole leaf | smooth bowel movements | **10** | 3/2/5 |
| 홍국 | Red yeast rice | improving blood cholesterol | **9** | 2/4/3 |
| 로즈힙 | Rosehip | joint and cartilage health | **8** | 2/3/3 |
| 키토올리고당 | Chitooligosaccharide | body-fat reduction | **3** | 0/1/2 |
| **합계** | | | **124** | **40/42/42** |

- 제품별 EN 완전성은 `resolveFunctions`가 검증 → 미충족(예: 인삼 '면역력 증진' 등 미매핑 기능성 포함 제품)은 **REVIEW_LATER/PENDING**(자동 제외). 인삼 pure-single 98 중 EN-complete 28.

### 4-1. 미통합(PENDING) — 발굴됐으나 이번 미반영
- **오메가류**(`오메가-3지방산함유유지` 16 등): 기존 registry `오메가3`와 중복 → combo/nutrient 라인 대상, sf 제외.
- **표준 영문명 미확정/고유명**: 오비엑스Ob-X 10·콜레우스포스콜리 9·돌외잎 5·알콕시글리세롤함유상어간유 7·스피루리나·클로렐라·공액리놀레산(CLA)·크레아틴·칼륨·단백질 등 — 공식 영문명 확정(계약 §3-4 "모호하면 REVIEW_LATER") 또는 기능성 EN 부재. **임의 확정 금지** → 후속 WO(사람검수).

## 5. 회귀검증

| 항목 | 결과 |
|---|---|
| 공용 파일(source-parse·nutrient-registry·combo/probiotics composer) 수정 | **0** |
| 기존 single-functional 79 LIVE | 무변경(§1 실측) |
| 프로바이오틱스·복합형 LIVE | 무변경(767 / 4,526) |
| canonicalDup / stmtDup | 0 / 0 |
| 원료 교차 귀속 | 0 (pure-single 브래킷 1 + labelRe 유일식별, 인삼 negative-lookbehind) |
| 액상·BULK·복합기능성 | 자동 제외(LIQUID·pure-single) |
| deterministic rerun | 파서·hash 결정적, 실시간 LLM 0 |
| shard 0/1/2 교집합 | **0** |

- `hff-sf-registry` 확장은 신규 key 추가만 → 기존 5원료 config 불변(banaba select 로직 동일, 결과는 exclude-taken로 fresh 축소).

## 6. 최대 생산 manifest + 직접주입 파일

`docs/checks/data/product-description-guard/hff-sf-maxpool/` — `_maxpool-assignment-manifest.json` + 원료별 `<slug>-shard-0|1|2.json`(stmt 직접주입) · `<slug>-ready.json`(compose 입력) · `<slug>-review-later.json` · `sf-discovery-inventory.json`.

| shard | producible(READY) | 담당 |
|---|---:|---|
| 0 | **40** | Agent A |
| 1 | **42** | Agent B |
| 2 | **42** | Agent C |
| **계** | **124** (generate PASS ~107) | |

- **예상 DB write**: READY 124 전량 생산 시 124×4 = **496**(내부 라운드 300~800 권장 단위 내 1라운드). 본 WO 미실행.
- 재개 지점: 각 shard 파일 → `hff-sf-generate --shard N` → `hff-sf-apply`(자동승인 계약). 기존 5원료 잔여(shard1 5 등)와 별개.

## 7. 보고 요약

```text
시작 2026-07-22 22:12 +0900 · 종료 단일 세션
전수 발굴: 57 group · EN-hit producible 200 (스캔 41,261)
A/C 통합: 5원료 79 LIVE(A26·B30·C23) 확인, 내 정본 apply 사용, 교집합 0
신규 정본 7원료: 뮤코다당·단백54·인삼28·키토산12·알로에전잎10·홍국9·로즈힙8·키토올리고당3 = READY 124
KO=MAIN_FNCTN grounded · EN=mapFunctionEn(임의생성 0) · displayEn=표준영문명 lookup
미통합 PENDING: 오메가류(중복)·고유명/영문명 미확정(오비엑스·콜레우스·돌외잎·CLA·크레아틴 등) → 후속 사람검수
회귀: 기존 79/767/4,526 LIVE 무변경 · canonicalDup 0 · stmtDup 0 · 교차귀속 0 · shard 교집합 0
shard producible: 0(A)40 · 1(B)42 · 2(C)42 · 계 124 (PASS~107)
배정표: docs/checks/data/product-description-guard/hff-sf-maxpool/
예상 write(전량): 496 · DB write 0(본 WO) · 공용 registry/parser 외부 수정 0
```

## 8. 후속

- 즉시 생산: 7원료 READY 124를 A/B/C 각 shard 파일로 완결(자동승인 계약). 내부 라운드 300~800 권장(단일 라운드 수용 가능).
- PENDING 해소: 고유명 원료 공식 영문명 + 미매핑 기능성 EN 확보 → `mapFunctionEn`/displayEn 확장 WO(사람검수). 확보 전 생산 금지.

---

*read-only 조사·정본화 · DB write 0 · generate/apply 0 · 공용 parser/combo/probiotics 수정 0 · 임의 EN 생성 0.*
