# CHECK — WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1

건강기능식품(HFF) EN 생산 트랙의 **통합 문제 큐 663건 전량 정리**.

| 항목 | 값 |
|---|---|
| 시작 HEAD | `68c131365` |
| 기준 commit | `fc3825029` (origin/main 조상 확인) |
| 실행 일자 | 2026-08-03 |
| DB write | EN canonical INSERT 647건 (그 외 0) |

---

## 1. 모집단 재현 (§2)

`hff-en-q663-population.mjs` (read-only) 로 큐 원본이 아니라 **현재 DB · 현재 사전**으로 재판정했다.

| 구분 | 기준값 | 재현값 |
|---|---:|---:|
| KO canonical | 40,918 | 40,918 |
| EN canonical | 40,255 | 40,255 |
| 통합 문제 큐 | 663 | 663 |
| KO_SOURCE_DAMAGED | 369 | 369 |
| NUMBER_STRUCTURE_AMBIGUOUS | 289 | 289 |
| TRANSLATION_AMBIGUOUS | 5 | 5 |

중복 candidate / master / canonical 0건. 합계 663 정확히 재현.

재현 결과 드러난 사실:
- `KO_SOURCE_DAMAGED 369` 의 대부분은 **실제 KO 손상이 아니라 분류기 과대판정**이었다
  (`TRAILING_LABEL_SEPARATOR 324`, `LEADING_MARKER 152`, `ENUM_MARKER_PREFIX 109`, `TOO_SHORT 18`, `ALREADY_ENGLISH 10`).
  진성 손상은 슬롯 기준 10종에 불과했다.
- `NUMBER_STRUCTURE_AMBIGUOUS 289` 에는 실제 용량 유실과 **추출기 오탐**(`1/2만` 조사, `2 grade`, 범위 끝값)이 섞여 있었다.

## 2. Track A / B / C 처리 (§5~§7)

- **Track A (KO_SOURCE_DAMAGED 369)** — 마커 잔재(`*`/`※` 접두), 라벨 구분자(`:` 접미), 열거 마커(`(가)`), 영문 잔존은
  **KO 를 고치지 않고** 해석 규칙(조합 전용)으로 해소했다. 진성 손상만 HOLD 로 남겼다.
- **Track B (NUMBER_STRUCTURE_AMBIGUOUS 289)** — 수치 추출기를 정정했다.
  `억/만/천` ↔ `hundred million / ten thousand / billion / million` 배수 접미사를 **값으로 접어서** 비교한다
  (`100억CFU` = `10 billion CFU`). **단위 환산(mg↔g 등)은 하지 않는다** — 수치 보존 계약을 완화하지 않기 위함.
  소수점 쉼표 표기(`53,6g`)는 원문 표기를 그대로 보존했다.
- **Track C (TRANSLATION_AMBIGUOUS 5)** — 3건은 공식 영문 문구(원문 `(영문)` 면)로 해소, 2건은 근거 부족으로 HOLD 유지.

**승인 자산 저작 라운드** `t1`~`t4` (clause / meta / label) 를 추가했다.
모든 항목은 공식 원문(MFDS 기능성·섭취방법·주의사항) 의미를 그대로 옮긴 것이며, 원문에 없는 사실은 만들지 않았다.

### KO canonical write 를 하지 않은 근거 (명시적 판단)

잔여 진성 손상 10종(영향 14행)은 잘린 라벨(`원료성`), 언어 마커 잔재(`(국문) (`), 직렬화 잔재(`null…`),
고아 기호(`[`, `` ` ``, `"`, `(시행일:`), 오탈자(`* 홈삼`) 이다.
WO §5 는 **기계적으로 안전한 정비만** 허용하고 `사람 판단 없이는 내용 보정 금지` 를 명시한다.
위 항목은 모두 내용 보정이 필요하고 영향 행이 663 중 14행이므로,
KO write 경로를 새로 여는 대신 `FINAL_HOLD_KO_SOURCE_DAMAGED` 로 남겼다. **KO write 0건.**

## 3. Apply (§8)

| 게이트 | 결과 |
|---|---|
| 렌더 감사 verdict | PASS (필수 선행 조건) |
| 이중 게이트 | `--apply` + `HFF_EN_Q663_APPLY_CONFIRM=YES` |
| rollback manifest | apply **이전** 기록 (`hff-en-q663-rollback-v1.json`) |
| 트랜잭션 | 500행 샤드, 실패 시 샤드 ROLLBACK |
| 낙관적 잠금 | KO content sha256 재확인 후 INSERT |
| 중복 가드 | master 별 EN canonical 존재 검사 |

결과: targets 647 → **inserted 647 / skipped 0 / failed 0**.

| 전역 지표 | before | after |
|---|---:|---:|
| SPD 전체 | 146,169 | 146,816 |
| KO canonical | 40,918 | **40,918 (불변)** |
| EN canonical | 40,255 | **40,902 (+647)** |
| ProductMaster (건기식) | 40,948 | **40,948 (불변)** |

## 4. 렌더 검증 (§9-2)

`hff-en-q663-render.mjs` — 실제 `storeDescriptionCss` + `.store-desc-content` 래퍼, JSDOM computed style.
구조 시그니처 전수(182) + 고위험 전량 = 262 문서 × 430/820/1280 = **789 렌더**.

overflow 0 · clipped 0 · rawHtml 0 · undefinedClass 0 · empty h2/ul/li 0 ·
**번역 슬롯 한국어 0** · 라벨 유실 0 · 개별인정번호 유실 0 · 구조 패리티 위반 0 → **verdict PASS**.

> 1차 렌더에서 개별인정번호 유실 3건(`2019-14`)이 검출됐다. 원인은 `officialEnglishFace` 규칙이
> 공식 영문 면만 취하면서 앞의 원료명·인정번호를 버린 것. 해당 문구를 `t4` 승인 자산으로 명시 저작해
> 라벨과 인정번호를 보존하도록 고쳤다(임의 번역 아님 — 공식 원료 영문명 + 공식 영문 기능성 문구 결합).

## 5. 독립 검증 (§9-3)

`hff-en-q663-verify.mjs` — apply 산출을 신뢰하지 않고 DB 를 다시 읽어 검증.

| 항목 | 결과 |
|---|---|
| KO hash drift | 0 |
| EN structure drift (KO 대비 태그 패리티) | 0 |
| canonical 중복 | 0 |
| EN 누락 / content 불일치 | 0 / 0 |
| 번역 슬롯 한국어 | 0 |
| 대상 밖 write | **0** |
| KO 행 갱신 | **0** |
| 전역 카운트 정합 | KO 40,918 · EN 40,902(=40,255+647) · PM 40,948 |
| verdict | **PASS** |

## 6. 663 최종 분류 (§9-1 / §11)

| 최종 상태 | 건수 |
|---|---:|
| `RESOLVED_UPDATED` | **647** |
| `RESOLVED_NO_CHANGE` | 0 |
| `FINAL_HOLD_KO_SOURCE_DAMAGED` | **14** |
| `FINAL_HOLD_NUMBER_STRUCTURE_AMBIGUOUS` | **0** |
| `FINAL_HOLD_TRANSLATION_AMBIGUOUS` | **2** |
| `FAILED_SYSTEM` | 0 |
| 합계 | **663** |

### 최종 HOLD 큐 (16건 · 중복 0)

`data/hff-en-q663-final-hold-queue-v1.json`

| 사유 | 건수 | 재시도 조건 |
|---|---:|---|
| KO 원문 손상 — 잘린 라벨 `원료성` | 5 | MFDS 원천 재수집으로 라벨 복구 시 |
| KO 원문 손상 — 고아 기호 / 언어 마커 / 직렬화 잔재 | 9 | 동일 |
| 공식 영문 근거 부족 (번역 슬롯 한국어 잔존) | 2 | 공식 영문 기능성 문구 또는 승인 EN 번역 자산 확보 시 |

## 7. 산출물

- `apps/api-server/src/scripts/hff-en-q663-population.mjs` — 모집단 재현 (read-only)
- `apps/api-server/src/scripts/hff-en-q663-resolver.mjs` — 조합 전용 해석기 (새 문장 생성 없음)
- `apps/api-server/src/scripts/hff-en-q663-measure.mjs` — 오프라인 해소율 측정
- `apps/api-server/src/scripts/hff-en-q663-render.mjs` — EN 생성 + 렌더 감사
- `apps/api-server/src/scripts/hff-en-q663-apply.mjs` — 이중 게이트 INSERT
- `apps/api-server/src/scripts/hff-en-q663-verify.mjs` — 독립 검증 + 최종 분류
- `data/hff-en-q663-{population,blocking-phrases,remaining-phrases,safe-targets,blocked,render-audit,rollback,apply-result,verify,final-hold-queue}-v1.json`
- `data/hff-en-q663-t{1,2,3,4}-translations-v1.json` — 승인 번역 자산

## 8. 트랙 상태

HFF EN 통합 문제 큐 **663 → 16**. 잔여 16건은 전부 **원천 자료 재수집 또는 공식 영문 근거 확보**가
선행돼야 하는 항목이며, 현재 코드·현재 자산으로 추가 생산 가능한 대상은 **0**이다.

KO canonical 40,918 / EN canonical 40,902 — 커버리지 **99.96%**.
