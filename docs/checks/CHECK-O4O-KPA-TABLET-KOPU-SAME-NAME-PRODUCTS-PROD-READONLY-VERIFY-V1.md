# CHECK-O4O-KPA-TABLET-KOPU-SAME-NAME-PRODUCTS-PROD-READONLY-VERIFY-V1

> 상위 IR: [CHECK-O4O-KPA-TABLET-ADDITIONAL-CONTENT-DUPLICATE-NAME-AND-MODAL-ALIGNMENT-AUDIT-V1](CHECK-O4O-KPA-TABLET-ADDITIONAL-CONTENT-DUPLICATE-NAME-AND-MODAL-ALIGNMENT-AUDIT-V1.md) §2.5 / §3
> 성격: **프로덕션 read-only SELECT 검증**. 코드·DB write·migration·배포 0.
> 실행: 프로덕션 `o4o_platform`, `gcloud sql connect`(사용자 대화식 실행), SELECT only. write 0.

---

## 1. 판정 — **B (정상 별도 SKU + 동일 설명서 공유)**

화면의 "코푸시럽에스" 결과 = **(주)유한양행 동일 품목(품목기준코드 `196900058`)의 포장단위 다른 6개 ProductMaster**. 6개가 **동일한 STORE 설명서 1개를 공유**한다.

### 1.1 마스터·규격 (검증 쿼리 1)
| 표준코드(barcode) | 품목기준코드(MFDS) | 제조사 | specification (약품규격/총수량/제형/포장) | 분류 | ATC | store_canonical |
|---|---|---|---|---|---|---|
| 8806421022902 | 196900058 | (주)유한양행 | 500밀리리터 / 0 | otc | R05FA | 1 |
| 8806421022919 | 196900058 | (주)유한양행 | 500밀리리터 / 1 / 개 / 병 | otc | R05FA | 1 |
| 8806421055207 | 196900058 | (주)유한양행 | 20밀리리터 / 0 | otc | R05FA | 1 |
| 8806421055214 | 196900058 | (주)유한양행 | 20밀리리터 / 1 / 시럽 / 포 | otc | R05FA | 1 |
| 8806421055221 | 196900058 | (주)유한양행 | 20밀리리터 / 6 / 시럽 / 포 | otc | R05FA | 1 |
| 8806421055238 | 196900058 | (주)유한양행 | 20밀리리터 / 12 / 시럽 / 포 | otc | R05FA | 1 |

- 6개 모두 **동일 품목기준코드(196900058)·동일 제조사·동일 ATC(R05FA)**, **표준코드(바코드)·용량·포장수량만 상이** → 정상 별도 SKU(포장단위 차이). (군납용 `8806421022926`, 12정 `…238`은 화면 5행 밖.)
- `product_drug_extensions`의 dosage_form/strength/ingredient_summary/package_unit/package_quantity = **전부 NULL**(구조화 컬럼 미채움 실증).
- 구분 가능한 실 데이터: `pm.specification`(용량·수량·제형·포장 결합), `pm.manufacturer_name`, 품목기준코드(`product_identifiers.MFDS_CODE`), ATC.

### 1.2 설명서 내용 동일성 (검증 쿼리 3·4)
| master_id | source_ref_id | content_norm_md5 | len |
|---|---|---|---|
| 3b62c4bd / 554b6f7f / 212303df / e4227c5c / 22014e2e / 92dc5de0 (코푸시럽에스 6종) | **e1632a24-…-9f2ab57c3f06 (동일)** | **c650f5ba…873b3baa (동일)** | 1268 |

- 6개 코푸시럽에스 설명서 = **source_ref_id 동일 + 정규화 content md5 동일 + 길이 동일** → **내용 완전 동일**.
- 참고: `distinct_norm_content = 2`(전체 12 STORE 설명서 중) — 코푸시럽에스 그룹(6, 동일) + 휴로코푸시럽(아이비엽) 그룹(6, 서로 동일한 다른 내용). 즉 "코푸시럽"류는 **품목별로 설명서가 그룹화**되어 있고, 같은 품목의 SKU들은 설명서를 공유한다.

### 1.3 결론
- **C(검색 JOIN 중복) 아님**(상위 IR에서 구조로 확정) / **D(실중복) 아님**(정상 SKU) → **B**.
- 이 화면은 "매장용 상세설명서"를 고르는 곳인데, **동일 설명서 1개가 SKU 6개로 6번 노출**되고, 5개 선택 시 **태블릿/QR에 동일 설명 5중 노출**된다(실증). 상위 IR §2.4의 중복 가능성이 실데이터로 확인됨.

---

## 2. 후속 설계 방향 (실데이터 반영)

### 2.1 표시 단위 = 설명서 (source_ref_id / content 그룹)
이 화면의 선택 대상이 상품이 아니라 **매장용 상세설명서**이고, 같은 품목의 SKU들이 **동일 설명서를 공유**하므로:
- 검색 결과를 **설명서 단위(동일 `source_ref_id` 또는 동일 content)로 1회 표시**한다.
- 표시 예:
  ```
  코푸시럽에스 매장용 상세설명서   ·  (주)유한양행 · 시럽제 · 일반의약품
  연결 상품 6종 (포장단위 차이)
    500mL 병 / 20mL 포(1·6·12) …
  ```
- 저장 시 **대표 master 1개만** content_list에 추가(그룹 내 어느 masterId든 `resolveO4oItem`이 동일 설명서를 resolve → 태블릿 중복 0). 대표 선정은 임의 첫 코너 금지 원칙과 무관(설명서가 동일하므로 어느 것이든 동일 결과) — 다만 **명시적 규칙**(예: 가장 일반적 포장/최소 표준코드)로 결정.

### 2.2 구분정보 표시 (무-migration)
검색 projection에 **이미 채워진 직접 컬럼**을 추가:
- `pm.specification`(용량·수량·제형·포장 결합 문자열), `pm.manufacturer_name`, `품목기준코드`(product_identifiers MFDS_CODE 서브쿼리), 필요 시 `regulatory_name`/ATC.
- 카드 표기 우선순위: `제조사 · 제형(specification에서) · 규격/포장`, **바코드는 최후 보조**.
- 개별 구조화(성분/함량/제형 별도 컬럼)·투여경로는 `product_drug_extensions` 미채움 → **별도 데이터 보강 WO**(보류). 현 단계는 `specification` 문자열 그대로 노출로 충분.

### 2.3 병합 금지 가드
- 같은 이름/같은 품목기준코드라도 **성분·함량·제형·안전정보가 다르면 절대 병합 금지**. 본 케이스는 품목기준코드·설명서가 동일해 안전하나, 그룹화 키는 **설명서 동일성(source_ref_id/content)** 기준으로만 묶고 `DISTINCT product_name` 같은 이름 기준 병합은 쓰지 않는다.

---

## 3. 후속 최소 WO (권장)

**WO-O4O-KPA-TABLET-CONTENT-PICKER-ALIGNMENT-AND-PRODUCT-DISAMBIGUATION-V1** (UI + 검색 projection, 무 migration):
1. 모달 정렬: 결과 컨테이너 `scrollbar-gutter: stable` + 탭 `gap-1.5→gap-2` (상위 IR §1).
2. `o4o-descriptions` 검색 SELECT에 `pm.specification`·`pm.manufacturer_name`·품목기준코드(+`source_ref_id`) 추가.
3. **설명서 단위 그룹화**: 동일 `source_ref_id`(또는 content) 결과를 1회 표시 + 연결 SKU 요약(포장단위). 선택 저장은 대표 master 1개.
4. 카드 구분정보(제조사·제형·규격/포장) 표시, 바코드는 최후 보조.
5. 성분·함량·제형이 다른 그룹은 병합하지 않음(가드).

**보류(별도 데이터 WO)**: `product_drug_extensions` 성분/함량/제형/포장 개별 컬럼 population + 투여경로 저장처 설계 — 상품검색·QR·POP 공통 기반. IR 설계안만 제시, migration/백필 미실행.

---

## 4. 완료 보고

```text
IR-O4O-KPA-TABLET-KOPU-SAME-NAME-PRODUCTS-PROD-READONLY-VERIFY-V1 완료

- 검색어/대상: 코푸시럽에스 (품목 196900058)
- ProductMaster: 6종(화면 5행 + 12정 1) / 품목기준코드 1개(196900058) / 제조사 1개(유한양행)
- 규격 차이: 용량(500mL·20mL) + 포장수량(0·1·6·12) — 포장단위 차이의 정상 SKU
- 설명서: 6종 모두 source_ref_id·content md5 동일(내용 완전 동일)
- 판정: B (정상 별도 SKU + 동일 설명서 공유). C/D 아님.
- 중복 노출: 5개 선택 시 태블릿/QR 동일 설명 5중 — 실증됨
- 구분정보(무 migration): specification/manufacturer/품목기준코드/ATC 채워짐, drug_ext 개별필드 NULL
- 후속: WO-...-CONTENT-PICKER-ALIGNMENT-AND-PRODUCT-DISAMBIGUATION-V1 (설명서 단위 그룹 + 구분정보 표시 + 모달 정렬)
- 코드 변경 0 / DB write 0 / migration 0 / 배포 0
```
