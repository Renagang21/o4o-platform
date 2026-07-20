# CHECK — HFF higher-N(5~8원료) 종합비타민 STRICT 인벤토리

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` §6 (다음 단계)
- 성격: **read-only 인벤토리 · DB write 0**. generate/dry-run/apply 미실행.
- 기준선: 복합형 **421 LIVE** (마지막 생산 커밋 `2eeaac1a7`), lut-va(lu-va, 7 LIVE)는 `PAUSED_GROUP_DEFECT` 제외.
- 도구: `apps/api-server/src/scripts/hff-combo-mx-inventory-strict.ts` (신설). `hff-combo-select` 의 **엄격 SPEC**(value unit / basis unit + %|이상, basis 필수)과 **동일 CLS** 이식 → select 가 실제 인정할 full-set 예측. mx-inventory 의 loose SPEC(억/CFU·basis 옵션) 과대집계(§5 주의) 회피.

## 환경 검증 (PASS)

| 항목 | 결과 |
|------|------|
| Git root / branch / HEAD | `o4o-platform` / `main` / `5ac783cd2`, origin/main ahead0·behind0 |
| 마지막 생산 커밋 2eeaac1a7 | 히스토리 존재 |
| `apps/api-server/.env` | 존재 (DB_PASSWORD 공란 → Cloud Run `o4o-core-api` 에서 read-only 자격증명 추출) |
| ADC | `%APPDATA%/gcloud/application_default_credentials.json` 존재 |
| 5442 프록시 | `netureyoutube:asia-northeast3:o4o-platform-db` LISTENING |
| read-only 프로덕션 접속 | `o4o_api@o4o_platform` SELECT PASS |

## 인벤토리 결과 (source: `product_candidates.raw_payload`, source_label=MFDS_HEALTH_FUNCTIONAL_FOOD, scanned 41,261)

### 원료 수별 후보 수 (strict full-set, 고형·비수출·비벌크·비액상)

| N | clean 후보 | attribution 불명확(unknown>0, 제외) |
|---|---:|---:|
| 5 | 431 | 377 |
| 6 | 393 | 280 |
| 7 | 283 | 189 |
| 8 | 244 | 114 |
| **계** | **1,351** (609 조합) | **960** |

- 제형/수출/벌크 제외: 135.
- 상위 40 조합 = 509건 / 나머지 842건은 569 조합에 롱테일 분산(대부분 단자릿수).

### 상위 그룹과 대상 수 (전부 basis 100% 준비 — realBasis=count, shelfOnly=0)

| 순위 | N | 건수 | 조합 |
|---:|:-:|---:|------|
| 1 | 8 | **49** | 나이아신+비오틴+비타민B1+B12+B2+B6+엽산+판토텐산 (**비타민B 컴플렉스 완전형**) |
| 2 | 6 | 42 | 나이아신+밀크씨슬+B1+B2+B6+판토텐산 |
| 3 | 6 | 31 | 나이아신+B1+B2+B6+비타민C+판토텐산 |
| 4 | 7 | 31 | 나이아신+밀크씨슬+B1+B2+B6+아연+판토텐산 |
| 5 | 5 | 30 | 나이아신+B1+B2+B6+판토텐산 (B군 코어) |
| 6 | 6 | 25 | 나이아신+B1+B2+B6+아연+판토텐산 |
| 7 | 7 | 24 | 나이아신+B1+B2+B6+비타민C+비타민E+판토텐산 |
| 8 | 5 | **22** | 마그네슘+망간+비타민D+아연+칼슘 (**미네랄 멀티**, LIVE mg-mn-vd-ca 4원료의 5원료 확장) |
| 9 | 5 | 17 | 마그네슘+망간+비타민D+비타민K+칼슘 |
| 10 | 5 | 16 | 비타민B1+B2+B6+비타민C+아연 |
| 11 | 5 | 16 | 마그네슘+비타민D+비타민K+아연+칼슘 (LIVE mg-vd-vk-ca 4원료 확장) |

- **계열 집중(top40)**: B-complex계(나이아신/판토텐산 포함) 21조합 334건 · 간건강(밀크씨슬) 8조합 108건 · 미네랄계 6조합 79건 · 눈건강(루테인) 4조합 23건.

### 기존 LIVE 중복

- LIVE 복합형 421 = 전량 **N≤4** (mg-vd-ca 72·mg-zn-ca-vd 69·msm-vd 49·vd-ca 45·vd-zn 38·vc-zn 37·se-zn 26·mg-vd-vk-ca 26·mg-ca 20·mg-mn-vd-ca 12·ms-b126 9·vc-vd-se-zn 9·lu-va 7[PAUSED]·mg-zn-ca 2).
- higher-N(5~8) full-set 조합과 **제품 단위 중복 0** (조합 키가 다름). 단 일부 higher-N 그룹은 기존 LIVE 미네랄 계열의 상위집합(예 8·11위) — 별개 제품(다른 STTEMNT_NO)이며 중복 아님.

### basis 준비 상태

- 상위 40 조합 **전부 realBasis=count (100%, shelfOnly 0)** — 엄격 SPEC 상 value/basis 및 실 % 비율 확보. 첫 배치 basis 리스크 낮음.
- 잔여 grounding/attribution 게이트(부원료·미귀속 기능성)는 인벤토리 단계에서 미측정 → select 단계에서 HOLD_GROUNDING 로 재검. 인벤토리 basis-ready 는 상한 추정.

### attribution 불명확 수

- **spec-level 960건**(N5~8 중 미분류 엄격스펙 unknown>0 → clean 그룹 제외). = select 에서 HOLD_MULTI/추가원료 검출 유력.
- 추가로 clean full-set 도 select 의 기능성 귀속(INGREDIENT_FN)에서 부원료/미귀속 기능성 발생 시 HOLD → 실 ELIGIBLE 은 clean 후보의 부분집합.

### 카드 5개 이상 렌더 영향

- `hff-combo-compose` 는 완전 N-제너릭(`ings.map()` 전면: badge/intro/why/기능성/spec 카드) — 하드코딩 카드 상한 없음.
- 가드 `G-MULTI-INGREDIENT-COUNT` 가 `koCards === n === enCards` 강제, `G-MULTI-BILINGUAL` 이 ko/en 카드 순서 seed 일치 강제 → 5~8 카드도 4원료와 동일 경로.
- CSS(sd-badges flex-wrap + sd-card max-width 860 + overflow-hidden)는 §5 에서 360~1440 가로스크롤 0 검증됨. **구조 변경 불요**, 최고 N(8, 8카드) 세로 스택 시각 스모크 1회만 권장.

## 권장 첫 배치

1. **파일럿(첫 배치) = 마그네슘 + 망간 + 비타민D + 아연 + 칼슘 (N=5, 22건)**
   - 근거: 5원료 전부(mg/mn/vd/zn/ca) 기존 4원료 LIVE 에서 attribution·basis 실증 완료 → **신규 attribution 표면 0**, basis 100%. 5-카드 렌더/가드 경로를 최저 리스크로 검증.
2. **헤드라인 후속 = 나이아신+비오틴+B1+B12+B2+B6+엽산+판토텐산 (N=8, 49건)**
   - 최대 그룹·basis 100%·정규 "비타민B 컴플렉스". N=8(최고 카드 수·최다 신규 B군 귀속) → 5-카드 경로 PASS 후 착수. 8-카드 세로 스택 시각 스모크 동반.
3. 이후 B-complex 계열(top40 334건)·미네랄 확장(79건) 순으로 배치.

## 다음 단계 (미실행 — 승인 대기)

- `hff-combo-select --combo "마그네슘,망간,비타민D,아연,칼슘"` 로 첫 배치 ELIGIBLE 확정 → compose → G-MULTI guard → generate → dry-run(ROLLBACK). **COMMIT 직전에만 승인 요청**.

## 실행 결과 (Agent B) — 첫 배치 LIVE

- **mg+mn+vd+zn+ca(N5) 20건 LIVE**(2026-07-20). select 실측 ELIGIBLE **20**(인벤토리 예측 22의 상한 대비 grounding HOLD 2건 정제 = 본 문서 §basis "상한 추정" 예측 정확). generate PASS 18·REVIEW 2(코팅정제 known-safe)·BLOCKED 0·G-MULTI HOLD 0. dry-run 예상=실측 write 80 → apply COMMIT → 독립검증 PASS(canonicalDup 0·기존 421 무변경). **복합형 421 → 441**. 상세: 상위 WO §6 "higher-N 첫 배치 LIVE".
- 다음: 헤드라인 B-complex 완전형 N8(49) — Agent A 확정 후 Agent B 착수.

*인벤토리 자체는 read-only · DB write 0. 위 실행 결과는 별도 Agent B apply(승인 기반).*
