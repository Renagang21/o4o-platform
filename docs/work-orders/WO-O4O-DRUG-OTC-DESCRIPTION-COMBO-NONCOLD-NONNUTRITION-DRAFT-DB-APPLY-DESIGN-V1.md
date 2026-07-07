# WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1

> **성격:** 설계 + dry-run only. **실제 DB write 금지.** apply 는 별도 승인 WO 로 분리.
> **선행:** [`CHECK-...-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-GROUNDING-DRAFT-V1.md) (drafted 27) · SINGLE 선례 [`DRAFT-DB-APPLY-DESIGN-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-DESIGN-V1.md) / [`DRAFT-DB-APPLY-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1.md)
> **결과 CHECK:** [`CHECK-...-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1.md)

## 1. 목적

GROUNDING-DRAFT-V1 에서 **drafted 로 재분류된 27그룹**(비-감기·비-영양 복합제)을 `product_candidate_description_drafts` 에 안전하게 적재하기 위한 **매핑 설계 + dry-run 검증**. 실제 write 는 하지 않는다.

## 2. 범위

**대상:** GROUNDING-DRAFT-V1 §7 의 drafted 27그룹 (6 ATC 계열):

| ATC7 | 계열 | registry 행 |
|---|---|-:|
| A06AB52 | 변비(자극성 완하제 복합) | 14 |
| A06AC51 | 변비(팽창성, 아락실) | 1 |
| M03BB53 | 근이완(클로르족사존 복합) | 3 |
| M09AB52 | 소염효소 복합 | 2 |
| A02BA53 | 파모티딘+제산(위장약) | 2 |
| M01AE51 | 이부프로펜 진통 복합 | 5 |
| **계** | | **27** |

**제외:** needs_review 2(프라본정 정맥치질·캐롤에프정) · 감기약(코감기·비염·진해거담·종합감기) · 영양제/비타민/미네랄 · 멀미약 A04AD51.

## 3. 해야 할 것

1. GROUNDING-DRAFT-V1 에서 drafted 27그룹 목록 추출
2. 각 그룹의 group_key / ATC 계열 / 대표 product_master / grounding SPD id 확인 (read-only)
3. 기존 `product_candidate_description_drafts`(SINGLE 66행) 중복/충돌 확인
4. insert 대상 seed_json 구조 설계
5. description body 저장 필드(content_json) 와 status 설계
6. dry-run count 산출
7. apply 전 검증 SQL 작성
8. rollback/backup 필요 여부 정리
9. 실제 apply 는 **별도 승인 WO 로 분리**

## 4. 금지사항

- DB write 0 (SELECT/COUNT read-only 만)
- `product_candidate_description_drafts` 실제 insert/update 금지
- `shared_product_descriptions` 변경 금지
- `product_drug_extensions` 변경 금지
- canonical 승격 금지
- ProductMaster / ProductCandidate 상태 변경 금지
- registry 파일 직접 변경 금지
- 매장 콘텐츠 연결 금지
- apply SQL/script 는 작성 가능하나 **실행 금지**

## 5. 완료 기준

- drafted 27그룹 적재 대상 확정 (그룹 → draft 행 매핑 모델 확정)
- 기존 draft 중복/충돌 확인 (0 확인)
- dry-run insert/update 예상 count 확정
- seed_json / content_json(body) / review_status 구조 확정
- 실제 apply 는 별도 승인 WO(`...-DRAFT-DB-APPLY-V1`)로 분리

## 6. 산출물

- 본 WO
- `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-DESIGN-V1.md` (설계 + dry-run 결과)

---

*V1 · 2026-07-07 · 설계+dry-run only · DB write 0 · apply 별도 승인 WO*
