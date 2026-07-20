# WO — HFF MX(4+원료) 복합형 확장 파일럿

- WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1`
- 상태: **OPEN (파일럿 착수)** — M2/M3 순수 라인 종결(296 LIVE) 후속. 상위: `WO-O4O-HFF-LARGE-FUNCTION-GROUPS-...-V1`.
- 성격: 4+ 기능성 원료(MX) 설명서 생산 가능성 파일럿 검증. apply는 파일럿 검증 후 결정.

---

## 1. 목적·범위

- 4개 이상 기능성 원료 제품(MX, 인벤토리 ≈3,122)의 설명서 생산 가능성을 **20건 파일럿**으로 검증.
- 기존 M2/M3 composer·G-MULTI를 **억지로 확장하지 않는다** — N-원료 카드 렌더·귀속·수치분리가 깨지지 않는지 먼저 확인 후 최소 확장.
- 신규 LIVE apply는 파일럿 PASS 후 별도 승인.

## 2. 착수 관찰 (M2/M3에서 도출)

- mg-zn-ca grounding-held 60의 47건이 "부원료/미귀속 기능성 = 비타민D 기능성" → 실제 **mg+zn+ca+비타민D 4원료**(뼈건강 멀티미네랄+D). MX의 대표·최다 패턴으로 유력.
- combo-select는 원료 수 제한 없음(TARGET=정렬 N-set) → 4-원료 선정은 read-only로 즉시 가능. **막히는 곳은 compose(카드 렌더)·runComboGuard(N 확장)뿐**.

## 3. 작업 순서

```text
1. 4+원료 대표 조합 sizing (read-only) — mg+zn+ca+비타민D 우선, 이어 상위 MX
2. 원료별 amount·unit·basis·기능성 ko/en 분리 (N=4+ 에서 혼입 0 확인)
3. composeCombo 가 4+원료에서 카드 렌더 정상인지 (badge·표시량·기능성 분리)
4. runComboGuard(G-MULTI) 를 N=4+ 로 확장 (INGREDIENT-COUNT·AMOUNT-SOURCE·BILINGUAL 등)
5. 5개 뷰포트 반응형(카드 4+ 세로 스택) 검증
6. generate → guard → dry-run(ROLLBACK)
7. COMMIT 직전에만 승인 요청
```

## 4. 중지 조건

```text
- 원료 attribution 불명확
- 표시량 basis 혼입 (원료 간 수치 이동)
- 기능성 누락/중복
- 기존 M2/M3 회귀 (composer/guard 공통 변경이 M2/M3 결과를 바꿈)
- 공통 가드 구조 변경이 예상보다 커짐 → 설계 체크포인트
- DB·proxy·.env 이상
```

## 5. 진행 기록

- **파일럿 PASS + 첫 MX 배치 LIVE**: mg+zn+ca+비타민D(4원료) ELIGIBLE 69.
  - 20-파일럿 → 전량 69 generate PASS 58·REVIEW 11(코팅정제·basis 재파싱 known-safe)·BLOCKED 0·G-MULTI HOLD 0.
  - **composer 무변경 검증**: composeCombo/runComboGuard N-루프가 4-원료 카드(마그네슘·아연·칼슘·비타민D) 독립 렌더(표시량 혼입 0)·ko/en 정합. G-MULTI(AMOUNT-SOURCE·BILINGUAL 등) 4-원료 정상.
  - 반응형 PASS(CSS 구조): sd-badges flex-wrap + sd-card max-width 860/overflow-hidden → 360~1440 가로스크롤 0. 동일 구조 후속 MX 재확인 불필요.
  - dry-run 276=276 → apply COMMIT → 독립검증(새 연결) PASS. tag `batch:single-nutrient-combo-mg-zn-ca-vd`. 복합형 누적 296→**365**. 기존 무변경.
- **MX 인벤토리(DB-source, read-only)**: `hff-combo-mx-inventory.ts` 신설. scanned 41,261 · MX(≥4) 조합 1,384종 · byN 4:724·5:545·6:454·7:301·8:239…. **주의**: 고-N 조합의 인벤토리 카운트는 과대(인벤토리 SPEC이 일부 스펙 누락 → select의 엄격 추출에서 추가원료 검출로 HOLD_MULTI). 예: 8원료 후보 45건 → select ELIGIBLE 0. **4원료 조합이 가장 신뢰성 높음**.
- **MX 4-원료 3조합 LIVE (규모순, 47건)**:
  - 마그네슘+비타민D+비타민K+칼슘 26 · 마그네슘+망간+비타민D+칼슘 12 · 비타민C+비타민D+셀레늄+아연 9.
  - 각 generate PASS·BLOCKED 0·G-MULTI HOLD 0. REVIEW 6(코팅정제·basis known-safe). dry-run 188=188 → apply COMMIT → 독립검증 3조합 PASS(canonicalDup 0·links 47·SPD sourceRef 94).
  - tag `batch:single-nutrient-combo-{mg-vd-vk-ca,mg-mn-vd-ca,vc-vd-se-zn}`. 복합형 누적 365→**412**. 기존 무변경.
- **MX 4-원료 추가 배치**: 밀크씨슬+비타민B1+B2+B6(간건강+B군) 9건 LIVE. generate PASS 7·REVIEW 2(코팅정제 known-safe)·BLOCKED 0·G-MULTI HOLD 0. dry-run 36=36 → apply COMMIT → 독립검증 PASS(canonicalDup 0·links 9·SPD sourceRef 18). tag `batch:single-nutrient-combo-ms-b126`. 복합형 누적 412→**421**.

## 6. 라인 정리 및 다음 단계 (결정: b)

- **MX 4-원료 클린 조합 종료**: 대형 미네랄 조합(mg+zn+ca+vd 69·mg+vd+vk+ca 26·mg+mn+vd+ca 12·vc+vd+se+zn 9·밀크씨슬+B 9)은 완료(복합형 421 LIVE). 남은 4-원료는 전부 단자릿수 B군(제품이 대개 5+종 종합비타민이라 "정확히 4"가 드묾) → **반복 스윕 종료**(수확체감).
- **다음(별도 준비)**: ① ADC 기반 durable proxy 안정화(WO-...-PROXY-SERVICE-AND-ENV-PRESERVATION-V1) ② higher-N 5~8종 종합비타민 후보군 정확 인벤토리(select 엄격추출 기준 실제 full-set) → 그룹화 → 신규 배치. `--token` 프록시 상태에서는 대량 probe 미진행.
- composeCombo/G-MULTI는 N-원료 무변경 처리 확인(4원료 실증) → higher-N도 구조 변경 없이 가능 전망(단, 카드 5+ 렌더·selection full-set 확정 필요).

### higher-N(5~8) STRICT 인벤토리 완료 (read-only, DB write 0) — `CHECK-O4O-HFF-HIGHER-N-5-8-STRICT-INVENTORY-V1`

- 도구 `hff-combo-mx-inventory-strict.ts` 신설: select 엄격 SPEC+CLS 이식으로 실제 full-set 예측(mx-inventory loose 과대집계 회피).
- scanned 41,261 · strict clean 후보 **1,351**(609조합): N5 431·N6 393·N7 283·N8 244. attribution 불명확(unknown>0 제외) 960. 상위40 조합 전부 basis 100%(shelfOnly 0).
- 최다 그룹: **비타민B 컴플렉스 완전형(N8) 49** · 나이아신+밀크씨슬 B군(N6) 42 · **미네랄 멀티 mg+mn+vd+zn+ca(N5) 22**(LIVE 4원료 확장). 기존 LIVE(전량 N≤4)와 제품 중복 0.
- compose N-제너릭·G-MULTI(카드수/순서) 강제 → 5~8 카드 구조 변경 불요, 최고 N 시각 스모크 1회만 권장.
- **권장 첫 배치 = mg+mn+vd+zn+ca(N5, 22)**(전 원료 attribution/basis 기 실증, 신규표면 0) → 이후 헤드라인 B-complex N8 49. generate/dry-run/apply 미실행 · COMMIT 직전 승인.

### higher-N 첫 배치 LIVE (Agent B) — mg+mn+vd+zn+ca(N5) 20건

- **대상 정제**: Agent A 인벤토리 예측 22(상한) → `hff-combo-select` 실측 mention 142 · **ELIGIBLE 20** · HOLD 제외 122(HOLD_MULTI 119 · 벌크 1 · grounding 2). 그룹 일치, 예측-실측 차 2 = 문서화된 grounding HOLD 정제분. 신규 원료 0 · 제형 tablet 18·chewable 2(→'정' 카운터, 구조 신규 0).
- **generate**: 작성 20 · PASS 18 · REVIEW 2(`D-CLAIM-GROUNDED-002` 코팅정제 known-safe, 미차단) · BLOCKED 0 · **G-MULTI HOLD 0**. composeCombo/G-MULTI N=5 무변경 처리(5-카드 렌더·ko/en 정합).
- **dry-run(exec+ROLLBACK, DB write 0)**: preload 전 PASS(candidate missing/ambiguous 0 · 사전승격 0 · masterDup 0 · canonicalSpdDup 0 · sanitizeEmpty 0 · 연결 20/20). 예상 write 80 = postVerify 80(masters 20·candidate UPDATE 20·SPD ko20+en20) · canonicalDup 0 · postVerifyPass true.
- **apply(COMMIT, 사용자 승인)** → **독립검증(새 연결)** PASS: appliedProducts 20 · totalWrites 80 · canonicalDup 0 · candidateLinks 20 · spdSourceRefLinks 40. 기존 복합형 baseline **421 무변경**(lu-va 7 PAUSED 포함) → **복합형 누적 421 → 441**.
- tag `batch:single-nutrient-mg-mn-vd-zn-ca`. rollback manifest 저장(20 master + 40 SPD + 20 candidate snapshot). 산출: `docs/checks/data/product-description-guard/hff-combo-mg-mn-vd-zn-ca.json` + drafts `docs/guides/products/health-functional-food/production-combo/mg-mn-vd-zn-ca/drafts/`.
- **다음**: 헤드라인 B-complex 완전형 N8(49) — Agent A 확정 후 착수(8-카드 세로 스택 시각 스모크 동반). lut-va(lu-va) `PAUSED_GROUP_DEFECT` 유지.

### higher-N 헤드라인 LIVE (Agent B) — 비타민B 컴플렉스 N8 43건 + Guard 버그수정

- 기준·검수: Agent A `CHECK-O4O-HFF-HIGHER-N-TOP3-REVIEW-A-V1`(`ecd484c31`), READY_WITH_HOLD 43/6.
- **대상 정제**: select 실측 mention 558 · **ELIGIBLE 43**(Agent A와 정확 일치) · grounding HOLD 6 + HOLD_MULTI 509. HOLD∩target 교차검증 overlap 0. 신규 원료/basis/제형 0(tablet 34·capsule 6·powder 2·softgel 1).
- **공통 Guard 버그수정(승인)**: generate 초회 3건이 `G-MULTI-AMOUNT-SOURCE` 오탐 HOLD → 원인 = 라벨 정규식 `비타민B1`(`/비타민\s?B\s?1/`)이 `비타민B12`에 오매칭(단어경계 부재). B1+B12 **최초 공존 배치**라 잠복버그 표면화. `\b` 추가(`/비타민\s?B\s?1\b/`, select CLS와 정합)로 **43/43 통과**. 회귀: B 함유 유일 기존배치 ms-b126(B12無) 재generate 불변(PASS 7·G-MULTI HOLD 0). 커밋 `8b100389a`. B1 단독·타 로직 무변경(CLAUDE.md Freeze 예외=정규식 오탐 한정).
- **generate(수정 후)**: 작성 43 · PASS 37 · REVIEW 6(코팅정제 known-safe) · BLOCKED 0 · **G-MULTI HOLD 0**.
- **8-카드 시각 스모크**: self-contained(store-desc-content CSS) 렌더, 360/768/1440 **가로 오버플로 0**, 8원료 세로 스택·표시량 자기귀속 정확(B1 24mg / B12 96μg 분리).
- **dry-run → apply(COMMIT, 승인)** → **독립검증(새 연결)** PASS: appliedProducts 43 · totalWrites 172(masters 43·candidate UPDATE 43·SPD ko43+en43) · canonicalDup 0 · candidateLinks 43 · spdRefLinks 86. tag `batch:single-nutrient-b-complex-n8`. rollback manifest 저장.
- **복합형 누적 441 → 484** (직접 카운트 검증: combo14 원본 421 + N5 20 + N8 43). ⚠️ `hff-combo-verify-committed` 의 `totalComboLive` 는 baseline 패턴 `batch:single-nutrient-combo-%` 만 집계 → N5/N8(비-`combo-` slug 태그) 누락으로 464 로 과소표시. 실제 총계는 484(직접 태그 카운트 SSOT). 후속 검증 시 실제 총계 = 직접 카운트 기준.
- **다음**: 2순위 N6 간건강+B군(밀크씨슬+나이아신+B1+B2+B6+판토텐산, READY_WITH_HOLD 28/14) — Agent A 확정분, Agent B 착수 대기.

### higher-N 2순위 LIVE (Agent B) — 간건강+B군 N6 28건

- 기준·검수: Agent A `CHECK-O4O-HFF-HIGHER-N-TOP3-REVIEW-A-V1` ②, READY_WITH_HOLD 28/14.
- **대상 정제**: select 실측 mention 242 · **ELIGIBLE 28**(Agent A와 정확 일치) · grounding HOLD 14 + HOLD_MULTI 200. HOLD∩target overlap 0. 신규 원료/basis/제형 0(tablet 21·capsule 4·softgel 3). B12 부재 → Guard(B1 `\b`) 무충돌.
- **generate**: 작성 28 · PASS 26 · REVIEW 2(코팅정제 known-safe) · BLOCKED 0 · **G-MULTI HOLD 0**. (N6=6카드 ⊂ 검증완료 N8=8카드 범위 → 시각 스모크 생략)
- **dry-run → apply(COMMIT, 승인)** → **독립검증(새 연결)** PASS: appliedProducts 28 · totalWrites 112(masters 28·candidate UPDATE 28·SPD ko28+en28) · canonicalDup 0 · candidateLinks 28 · spdRefLinks 56. tag `batch:single-nutrient-ms-niacin-b126-panto`. rollback manifest 저장.
- **복합형 누적 484 → 512** (직접 카운트: combo14 421 + N5 20 + N8 43 + N6 28). verify 도구 totalComboLive 는 여전히 비-`combo-` slug 누락 과소표시 → 실계는 직접 카운트 SSOT.
- **다음**: Agent A 인벤토리 상위 후속(B-complex 계열 top40 잔여 · 미네랄 확장 등) 또는 신규 higher-N 그룹 검수 확정분 대기. lut-va(lu-va) `PAUSED_GROUP_DEFECT` 유지.
