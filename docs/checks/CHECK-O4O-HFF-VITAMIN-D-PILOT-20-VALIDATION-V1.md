# CHECK — 비타민 D 단일형 파일럿 20건 검증

- 일자: 2026-07-17
- 대상: 비타민 D 단일 영양기능 **20건** (`hff-vitamin-d-20`)
- 성격: **작성·검증 완료 산출물 보존 — DB 적재/canonical 아님** (적재는 별도 승인 게이트).
- 작성 Agent B + **오케스트레이터 독립 검수 통과**.

---

## 그룹 선택 근거

| 그룹 | 소비자 완제품(파싱) | 제조사 | 선택 |
|---|:---:|:---:|:---:|
| **비타민 D** | 236 | 31 | ✅ (완제품 풀 3.5배·다양성 우세) |
| 아연 | 66 | 28 | 후속 |

## 판정: PASS 20/20

| 차원 | 결과(독립 재검) |
|---|---|
| 최신 Guard 전수 | **PASS 17 · REVIEW 3 · BLOCKED 0** |
| **골다공증 공식표현** | 20/20 "발생 위험 감소에 도움"(질병발생위험감소기능 verbatim) · **예방/치료 단정 0** |
| 효능 = 인정 기능성만 | 칼슘·인 흡수/이용 · 뼈 형성·유지 · 골다공증 발생위험감소 (비-D 기능 누출 0) |
| 함량 정합 | 표시량 X(μg/IU) 초안 미등장 **0/20** · calc=false 20/20(함량≠총중량) |
| 물 규칙 양방향 | 근거없는 물 0 · 원문 물 누락 0 |
| 질병 단정 · 과장 | 0 · 0 (암=암갈색 성상 색상, 질병 아님) |
| grounding · 렌더러 · 중복 | 결손 0 · style/script 0 · sd-card 40/40 · 중복 0 · 파편(Q-SPEC-ITEMNO) 0 |

## REVIEW 3 — 알려진 가드 사각지대 (수용)

`PRE-SRC-CFU/BASIS-UNVERIFIABLE-003`: 닥터썬데이D 베이비·다나음 베이비 D-드롭·위드바인. 드롭(액상) 제품의 **미생물 한도 CFU/ml·mL 기준량**을 파서가 효능 CFU/중량 기준으로 오인 → REVIEW. **초안엔 CFU·파생수치 0**(비타민 D는 CFU 효능 없음), 콘텐츠 위험 없음. 비타민 C 100(ATOMY)에서도 동일 성격. **가드 정정(비-프로바이오틱 제품 CFU 교차검증 제외)은 별도 WO** — 공통 코드라 즉시 수정 아님.

## 키즈/베이비 드롭 3건

굿키즈·닥터썬데이 베이비·다나음 베이비 — F-KIDS 준수: 제품명은 h1에만, "어린이 적합" 주장 배제("액상 드롭 형태를 선호하는 분").

## 산출물

- `docs/checks/data/product-description-guard/hff-vitamin-d-20.json` (+ `-hold.json` heldOut 0)
- `docs/guides/products/health-functional-food/pilot-vitamin-d/drafts/` (40 HTML)
- 스캔: `apps/api-server/src/scripts/hff-vd-guard-scan.ts`

## 후속

- 추가 30 → 100 확대(비타민 C 패턴). DB 적재는 별도 승인. 가드 CFU 오탐 정정 WO 검토.
