# CHECK · HFF 유산균 매장 설명서 프로덕션 Batch 003 완주 (C-CP01~C-CP12)

- WO: `WO-O4O-HFF-DESCRIPTION-PROBIOTICS-PRODUCTION-BATCH-003-COMPLETE-V1`
- 일자: 2026-07-17
- 담당: Agent A (연속 완주)
- 기능성: 프로바이오틱스 **단일 기능성** (유산균 증식·유해균 억제·배변활동 원활·장 건강)
- mainFunction canonical: `유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음`
- DB write: **0** (ProductMaster/candidate/SPD/canonical/QR 모두 미변경 — 생성·검증·적재후보 확정까지만)

---

## 1. 종합 결과

| 구분 | 값 |
|---|---|
| Batch 003 총 작성(누적) | **226** (C-CP01 20 + C-CP02 20 + C-CP03~12 **186**) |
| 신규 작성(C-CP03~12) | **186** (ko/en 각) |
| HOLD(선정 제외/격리) | **8** |
| 선정 합계(C-CP03~12) | 194 = 작성 186 + HOLD 8 |
| BLOCKED(작성분) | **0** |
| REVIEW(작성분) | 5제품 / 10건 — 전부 `D-CLAIM-GROUNDED-002`(코팅 성상 중립인용 확인 플래그) |
| 물/음용수 근거위반 | 0 |
| 신고번호 유일 | 186/186 (프리코퍼스 603건과 교집합 0) |
| 렌더러 위반(`<style>`/`<script>`/sd-card 결손) | 0 |
| 반응형(5뷰포트) | PASS (전 186건 @360px + 특수형·최장 39건 ×5뷰포트, 문제 0) |

풀 한계로 총량은 226에서 마감(잔여 clean 단일기능성 소진). **숫자를 맞추기 위한 타 기능성/보충 없음** — 검증된 범위 안에서 정확히 생산(HOLD 레지스트리 §종합집계 규칙 준수).

## 2. 체크포인트별

```
CP03: 작성 19 · HOLD 1(KIDS)          · BLOCKED 0 · REVIEW 1
CP04: 작성 19 · HOLD 1(INFANT)        · BLOCKED 0 · REVIEW 1
CP05: 작성 20 · HOLD 0                 · BLOCKED 0 · REVIEW 3
CP06: 작성 20 · HOLD 0                 · BLOCKED 0 · REVIEW 0
CP07: 작성 20 · HOLD 0                 · BLOCKED 0 · REVIEW 0
CP08: 작성 19 · HOLD 1(WOMENS)        · BLOCKED 0 · REVIEW 0
CP09: 작성 20 · HOLD 0                 · BLOCKED 0 · REVIEW 0
CP10: 작성 20 · HOLD 0                 · BLOCKED 0 · REVIEW 0
CP11: 작성 19 · HOLD 1(NAME_CLAIM)    · BLOCKED 0 · REVIEW 0
CP12: 작성 10 · HOLD 4(KIDS3+WOMENS1) · BLOCKED 0 · REVIEW 0
```

## 3. HOLD 8건 — 유형별

| holdCode | 수 | 성격 | 해소 경로 |
|---|---|---|---|
| `HOLD_OUT_OF_SCOPE_KIDS` | 4 | 아동/캐릭터 대상 | 선정 KIDS 필터 갭 교정 후 아동 라인 별도 검증 |
| `HOLD_OUT_OF_SCOPE_WOMENS` | 2 | 여성 인티메이트 소구 | 선정 WOMENS 필터 갭 교정 |
| `HOLD_OUT_OF_SCOPE_INFANT` | 1 | 영유아/수출(분유 혼합) | 영유아 보호자 톤 별도 검증 |
| `HOLD_NAME_UNGROUNDED_CLAIM` | 1 | 제품명에 근거 없는 '특허' 주장 | 특허 효능 grounding 확보 |

**scope 제외 7건**은 데이터·grounding 정상이나, 선정 필터(KIDS/WOMENS/INFANT)가 **철자 갭**으로 놓친 제품이 결정론 원장(frozen selection)에 유입된 것이다. 원장 재생성은 커밋된 C-CP01/02 permit 재배치 위험이 있어 in-place 격리했다.

- KIDS: 리웰키드업(키드업, 우유/요구르트 혼합) / 바이오스타임…포 칠드런(For Children) / 코알라팔스 포도맛·딸기맛(캐릭터+과일맛). 선정 필터 `키즈`만 있고 `키드`·`포 칠드런`·`코알라팔스` 미포함.
- WOMENS: 닥터에디션 페미퓨어(페미=Femi) / 시크릿 프로바이오틱스(시크릿). 선정 필터 Latin `femi`만 잡아 한글 `페미`/`시크릿` 단독 미검출.
- INFANT: 活性益生菌粉(중국어 단독명 + '분유 또는 우유에 타서' 섭취) — 영유아/수출 성격.

### 신규 HOLD 서브타입 (오케스트레이터 판단 대상)
`HOLD_NAME_UNGROUNDED_CLAIM` — C-CP11 「특허받은 듀얼액션 유산균」. 데이터·grounding 정상이나 **공식 제품명 자체에 근거 없는 '특허' 주장**이 포함돼, H1에 이름을 렌더하면 `D-CLAIM-UNGROUNDED-001` BLOCKED. 공식 제품명 임의 변경 금지 원칙상 격리. grounding-family(근거 확보 시 해소)로 분류했으나 **레지스트리 V1 4코드 밖 신규 서브타입**이므로 등재 여부는 오케스트레이터가 결정. 규칙 「특허문구 효능 배제」 준수.

## 4. 방법론 (제품별 흐름 준수)

공식원문 → 수기 grounding(독립 regex 추출, 공유 파서 미사용) → pre guard(공유 파서 독립 대조, 순환검증 아님) → ko → post guard → en → bilingual → 반응형 자동검사 → 위험제품·표본 실화면 검수 → PASS/HOLD.

- **수치**: 표시기준량≠1단위중량 / 1회총량≠1일총량 구분. 근거 없으면 역산 금지(단위중량 미표기 시 단위당 균수 계산 안 함 — 명시). 과학표기(`N.N x 10^k`, `N*10^k`)는 억/만 우선 후 sci 판독, 표본 전수 대조로 CFU 일치 확인.
- **다회/다단위**: 1일 2~3회 / 1회 2캡슐 케이스(CreNeuroS 4캡슐/일, LactoCell 4캡슐/일, 디노보 3포/일, Hyzen 2포/일 등)에서 표시량과 1회량을 **동일시하지 않고** 단위당 계산을 생략 — 실화면 검수로 확인.
- **섭취**: 물/음용수 양방향(원문 있을 때만·원문 그대로). '직접/그대로'만이면 물 미부착(G-WATER-UNGROUNDED-003). 씹기/입안녹임/물에 타서 각각 원문 근거대로.
- **표현**: 원문 없는 이상/보장 부착 금지, 제품명 대상성 유도 금지, 코팅=성상 중립인용(전달효능 확장 금지 → REVIEW로 확인). bare 항목번호·파편·조사결합 잔존 0(Q-SPEC-ITEMNO-006 / 파편감사 0).

## 5. 검증

- **가드 전수**: `runGuard(phase:'all')` 186건 — BLOCKED 0, REVIEW 5(코팅 중립인용), 물-근거 0.
- **반응형**: 실제 렌더러 CSS(`ContentRenderer.tsx` storeDescriptionCss, 10,299자)에서 추출 → 360×800·390×844·768×1024·1024×768·1440×900. 가로 overflow/요소 이탈/h1↔badges 겹침 0.
- **실화면**: CreNeuroS(1일2회×2캡슐)·디노보(1일3회)·일양(장용성 코팅 REVIEW) 등 위험제품 캡처 검수 — 섭취량 표기 정확, 단위당 계산 생략 문구 정상, 코팅은 성상 인용에 국한(효능 확장 없음), 레이아웃 정상.
- **유일성**: 186 전건 유일 + 커밋 프리코퍼스(prod-a/b, C-CP01/02, 파일럿, HOLD 등 603건) 교집합 0 + 작성∩HOLD 0.

## 6. 적재 후보 / 프리로드

- **DB write 0** — 본 완주는 생성·검증까지. 프로덕션 적재는 별도 승인·이중게이트 후.
- 프리로드용 고정 대상목록·매니페스트: `docs/guides/products/health-functional-food/batch-probiotics-prod-003/BATCH-003-PRELOAD-MANIFEST.json` (총 226건, statementNo/slug/제품명/제조사/데이터파일 매핑, 유일 226).
- SPD 대상: `SharedProductDescription` STORE canonical(`source_type=o4o_hff_generated`), ko+en, 기존 유산균 192 적재 파이프라인(`hff-store-description-canonical-apply.ts`) 계약과 동형. 프리로드 가능.

## 7. 산출 파일

- 입력 JSON: `docs/checks/data/product-description-guard/hff-probiotics-prod-c-cp{03..12}.json` (+`-hold.json`)
- 초안: `docs/guides/products/health-functional-food/batch-probiotics-prod-003/C-CP{03..12}/drafts/*.{ko,en}.html`
- 매니페스트: 위 §6
- 본 CHECK 문서
