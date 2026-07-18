# WO — 단일 영양소 라인 다중원료 오분류 감사 + 루테인 교정

- WO: `WO-O4O-HFF-SINGLE-NUTRIENT-MULTI-INGREDIENT-MISCLASSIFICATION-AUDIT-AND-LUTEIN-CORRECTION-V1`
- 상태: **OPEN (조사 대기)** — 별도 트랙. 현재 복합형 생산(PART B)은 계속 진행.
- 발견: `WO-O4O-HFF-LARGE-FUNCTION-GROUPS-...-V1` PART B, 루테인+비타민A(lut-va) 조합 처리 중.
- 성격: 기존 LIVE 데이터 오분류(read-only 조사 → 교정은 승인·이중게이트 후). LIVE UPDATE 포함 가능.

---

## 1. 발견 사실 (2026-07-18, read-only)

루테인+비타민A 복합형 생산을 위해 `combo-select`로 20건(정확히 {루테인, 비타민A} 2 기능성 스펙)을 선정했으나, dry-run에서 **ALREADY_PROMOTED 13** — 20건 중 13건이 이미 `batch:single-nutrient-lutein`(단일 루테인 라인, PART A)으로 LIVE 승격돼 있었다.

- 13건은 제품명·원문상 **실제 루테인+비타민A 2원료 제품**("루테인 & 비타민A", "눈 건강엔 포커스 루테인 A+", "밝고 환하게 프리미엄 루테인 플러스" 등).
- 표본 3건 현행 LIVE ko STORE SPD 확인: 2건은 **비타민A 기능성 완전 누락**(루테인만 게시), 1건은 비타민A가 제품명 문자열로만 등장(기능성 카드 아님).
- 원인 추정: 단일 루테인 셀렉터가 "정확히 1개 기능성 스펙"을 요구하나, 당시 비타민A 스펙을 인식하지 못해 2원료 제품을 단일 루테인으로 오분류 → 비타민A 기능성이 빠진 채 게시.

## 2. 최소 조사 범위 (read-only 우선)

```text
- batch:single-nutrient-lutein 전체 (LIVE 203) 재검
- raw_payload.source.BASE_STANDARD 기능성 스펙 수가 실제로 ≥2 인 LIVE 제품 색출
- 단일 라벨(tag) vs raw 기능성 원료 수 불일치 목록
- 비타민A 외 다른 숨은 기능성 원료(칼슘·아연·오메가3 등) 포함 여부
- 다른 단일 영양소 배치(single-nutrient-zinc/magnesium/vitamin-d/...)에서 동일 다중원료 흡수 패턴 존재 여부 (공통 결함 여부 확정)
```

## 3. 교정 설계 (승인 후)

```text
1. 단일 루테인 LIVE 13건(및 감사로 추가 확인분)의 실제 기능성 원료 수 재확인
2. 비타민A 누락 범위 전수 확정
3. 단일 루테인 SPD 은퇴/대체 방식 설계 (canonical 교체 vs 신규 재게시)
4. lut-va 2원료 SPD 재게시 및 태그 정합화 (batch:single-nutrient-combo-lut-va)
5. rollback·중복·QR/참조(source_ref_id) 영향 검토
6. 이중 게이트(dry-run→독립검증) 후 apply
```

## 4. 보존된 lut-va 산출물 (미적용)

- `docs/checks/data/product-description-guard/hff-combo-lut-va.json` (20 guard-input) + `production-combo/lut-va/drafts/` (40 draft).
- **상태 고정**: apply 금지 · 기존 LIVE 수정 금지 · 7건 부분 apply 금지 · 임의 삭제 금지.
- 20건 = 이미 LIVE(단일, 결함) 13 + 미승격 클린 7. 교정 WO에서 통합 처리.

## 5. 현재 생산 영향

없음 — 복합형 PART B는 lut-va만 `PAUSED_GROUP_DEFECT`로 격리하고 다음 독립 조합(식이섬유+아연 → 오메가3+비타민E → 철+엽산)으로 계속 진행. 기존 복합형 LIVE 287 무변경, DB write 0.
