# CHECK-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-MISMATCH-FIX-V1

- WO: WO-O4O-DRUG-OTC-DESCRIPTION-NUTRITION-COMBO-MISMATCH-FIX-V1
- 일자: 2026-07-07
- 모드: **조사·보정안 확정 (read-only)** — DB write 0
- 선행: MEMBERSHIP-PERSIST(18 저장/2 mismatch) / CANONICAL-PROMOTION APPLY(18그룹 1,890 canonical, `d661d0fa6`)

## 1. 필수 표 — mismatch 2건 판정

| group | declared | reproduced | corrected_target | action | reason |
|-------|---:|---:|---:|---|---|
| 비타민C 1000mg (A11GA01/tab) | 31 | 38 | **38** | **fix_ready** | groupScope.masterTotal 31 = stale 스냅샷. 1000mg급 = spec 1000/1030/1030.9/1031밀리그램(염 보정 규격 포함) **38건 정확 재현**. |
| Mg·B2·B6 액제 (A11JB/liquid) | 101 | 97~115 | **미확정** | **hold** | 재현 축 3중 결함(아래 §3). 이름/e약은요 휴리스틱으로 101 재현 불가 → 성분코드 기반 분류 필요. |

## 2. 비타민C 1000mg — fix_ready (corrected_target 38)

### 근거
- 1000mg급 spec 분포: `1000밀리그램` 23 / `1031밀리그램` 9 / `1030밀리그램` 3 / `1030.9밀리그램` 3 = **38** (전부 A11GA01 OTC 정제).
- 1030/1030.9/1031밀리그램 = 아스코르빈산 **염 보정 규격**(≈비타민C 1000mg 상당) → 동일 1000급 버킷 타당.
- e약은요 grounded 13 / 기존 canonical 13. (STRENGTH-SPLIT-V1 §3.1 도 `a11ga01::1000mg::tablet = 38 use_existing_draft` 로 확정)
- draft 31은 어느 부분집합(grounded 13·특정 spec 조합)과도 불일치 → 과거 product_masters 스냅샷 기반 stale 로 판단. 현재 authoritative = **38**.

### 후속 경로
1. groupScope.masterTotal **31→38 보정** (MISMATCH-FIX-APPLY 또는 MEMBERSHIP-PERSIST 재실행 대상 편입).
2. 보정 후 membership-persist 게이트(reproduced 38 == masterTotal 38) 통과 → masterIds 저장.
3. promotion 재실행 시 신규 canonical 예상 = 38 − 기존 canonical 13 = **25**. (기존 canonical 보존, 재실행 idempotent)
- 승격 그룹(18)과 master 중복 없음(A11GA01 vitamin C single, 18그룹 미포함).

## 3. Mg·B2·B6 액제 — hold (재현 불가)

A11JB 액제 그룹은 이름/e약은요 휴리스틱으로 정확 멤버십(declared 101) 재현이 불가하다. 3중 결함:

1. **form(액제) name-match 오탐** — `name LIKE '%액%'` 이 **정제**를 포착: `비타액티브제트정`(비타**액**티브, 실제 tablet)이 액제로 오분류. → 115 에 비-액제 포함.
2. **Mg salt 제품명 변형 미검출** — Mg 함유 액제인데 '마그'·content '마그네슘' 필터 회피: `마이엠지더블케어액`(**엠지**=MG), `동아제약칼마비타에프액`(**칼마**=Cal-Mag). → Mg 검출 97 은 과소.
3. **active_ingredients 비-UTF8 손상** — 성분코드 기반 Mg 검출 경로 불가.

### 재현 시도값
| 방식 | 수 |
|------|---:|
| A11JB 액제(name '액'/'시럽') 전체 | 115 (오탐 포함) |
| Mg 검출(content '마그네슘' ∪ name '마그') | 97 |
| declared(draft) | 101 |

→ 어느 것도 상호 일치하지 않고, form·Mg 축 모두 신뢰 불가. **hold**.

### 후속 경로(보정 조건)
- (a) **성분코드 기반 Mg 검출** — active_ingredients 인코딩 복구 또는 clean 성분 원천 확보 후 Mg 함유 판정.
- (b) **liquid form 신뢰 신호** — name '액' 부분매칭 대신 접미('…액'/'…시럽'/'…내용액제')·비-정/비-캡슐 제외로 오탐 제거.
- (c) 위 확보 후 target 재산출 → declared 101 검증/보정 → persist/promote.
- 현 단계 승격 부적합 (틀린 master 에 canonical 위험).

## 4. 금지사항 준수
- [x] DB write 0 (SELECT only)
- [x] seed_json / shared_product_descriptions / ProductMaster·ProductIdentifier 미변경
- [x] canonical 승격 없음 / 매장 연결 없음

## 5. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| mismatch 2건 원인 확정 | ✅ (비타민C=masterTotal stale / Mg액제=form오탐+Mg salt변형+인코딩) |
| 보정 후 target 확정 or hold 사유 | ✅ (비타민C 38 fix_ready / Mg액제 hold) |
| 후속 persist/apply 가능 여부 | ✅ (비타민C 가능·신규 25 예상 / Mg액제 불가·성분코드 선행) |
| DB write 0 | ✅ |

## 6. 다음 단계
1. **비타민C**: groupScope.masterTotal 31→38 보정 WO(seed_json write) → persist → promotion 재실행(신규 canonical 25).
2. **Mg 액제**: 성분코드 기반 Mg 검출 + liquid form 정제 선행 WO → 재현 후 재판정.
