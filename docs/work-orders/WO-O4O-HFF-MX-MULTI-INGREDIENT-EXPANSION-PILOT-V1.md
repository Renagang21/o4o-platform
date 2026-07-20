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
