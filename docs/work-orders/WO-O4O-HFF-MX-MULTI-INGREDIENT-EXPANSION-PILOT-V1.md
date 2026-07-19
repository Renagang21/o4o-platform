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

- (착수) mg+zn+ca+비타민D 4-원료 read-only sizing 예정.
