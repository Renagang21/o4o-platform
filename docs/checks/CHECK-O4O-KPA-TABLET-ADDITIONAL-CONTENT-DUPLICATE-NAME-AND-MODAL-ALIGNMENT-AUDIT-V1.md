# CHECK-O4O-KPA-TABLET-ADDITIONAL-CONTENT-DUPLICATE-NAME-AND-MODAL-ALIGNMENT-AUDIT-V1

> IR: `IR-O4O-KPA-TABLET-ADDITIONAL-CONTENT-DUPLICATE-NAME-AND-MODAL-ALIGNMENT-AUDIT-V1`
> 성격: **조사 전용(read-only)**. 코드 수정·DB write·병합·API 변경·CSS 수정 없음.
> 대상: 태블릿 콘텐츠 제작기 `추가 정보 → 추가 정보 고르기 → 상품 매장용 상세설명서` 모달

---

## 0. 조사 방식

- 검색 API·선택 계약·모달 DOM·데이터 모델은 **코드 정적 분석**으로 확정(파일:라인 근거).
- 실제 5행(코푸시럽에스)의 데이터 정체(설명서 내용 동일 여부·제조사·규격 실값)는 **프로덕션 DB read 필요**. 본 IR에서는 **라이브 조회를 실행하지 않았다** — read-only 채널 제약 + 본 IR 범위에 라이브 로그인 명시 승인 없음. 실행할 정확한 쿼리를 §3에 제공한다.

---

## 1. 조사 B — 모달 줄맞춤 (원인 확정)

**대상**: `ContentPickerModal` — [TabletScreenSetManager.tsx:510-635](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)

| 영역 | 요소(라인) | 좌우 padding/gap | 좌측선 | 우측선 |
|------|-----------|-----------------|:-----:|:-----:|
| 헤더 | 562 | `px-4 py-3` | px-4 | px-4 |
| 탭 컨테이너 | 567 | `px-4 pt-3 grid grid-cols-3 gap-1.5` | px-4 | px-4 |
| 검색 행 | 572 | `px-4 py-2 flex gap-2` | px-4 | px-4 |
| 검색 입력 | 575 | `flex-1 min-h-[44px] px-3` | — | (버튼 좌측) |
| 검색 버튼 | 576 | `min-h-[44px] px-4` | — | px-4 |
| 결과 목록 | 578 | `flex-1 overflow-y-auto px-4 pb-2` | px-4 | **px-4 − 스크롤바** |
| 결과 카드 | 588/611 | `w-full p-3` | px-4 | px-4 − 스크롤바 |
| footer | 625 | `px-4 py-3 flex gap-2` | px-4 | px-4 |

**원인 (가설과 달리 padding 값 divergence 아님)**:
1. **결과 목록만 `overflow-y-auto`(유일 스크롤 영역, 나머지는 `flex-shrink-0`)** → 결과가 넘칠 때 세로 스크롤바가 `px-4` 안쪽에 렌더되어 **우측 ~15px(Windows 클래식 스크롤바)를 잠식**. 카드 우측선이 헤더/탭/검색/footer보다 왼쪽으로 밀리고, 스크롤바는 목록이 넘칠 때만 생겨 **로드 시점에 우측 기준선이 흔들림**. `scrollbar-gutter: stable` 미적용. → 사용자가 본 "좌우 기준선·폭 불일치"의 주원인.
2. **gap 불일치**: 탭 `gap-1.5` vs 검색 행·footer `gap-2`(인접 행 리듬 차이, 좌우선 자체는 아님).
3. **세로 padding 비대칭**(탭 `pt-3` 상단만 등) — 미관, 가로 정렬 무관.
4. 검색 버튼(576)에 `flex-shrink-0` 없음 — 라벨 "검색" 2자라 실사용 줄바꿈 없음(기여 아님).

**권장(코드 미변경)**: 좌우 공통선은 이미 `px-4`로 일치 → 재-padding 불필요. 결과 스크롤 컨테이너(578)에 `scrollbar-gutter: stable`(또는 overlay 스크롤바)로 우측 gutter 예약, 또는 스크롤 wrapper를 full-bleed(px-0)로 두고 내부 리스트에 px-4. 탭 `gap-1.5→gap-2` 통일(선택).

---

## 2. 조사 A — 동일 이름 결과의 정체 (구조 확정)

### 2.1 검색 API 반환 단위 — **ProductMaster 단위 (JOIN 증식 아님)**
[store-tablet.routes.ts:1524-1548](../../apps/api-server/src/routes/platform/store-tablet.routes.ts) `GET /api/v1/store/tablet-content-sources/o4o-descriptions?q=`:

```sql
SELECT pm.id AS "masterId", pm.name, pm.barcode,
       (SELECT d.summary FROM shared_product_descriptions d
         WHERE d.master_id = pm.id AND d.description_type='STORE'
           AND d.status='canonical' AND d.deleted_at IS NULL
         ORDER BY (d.language='ko') DESC, d.updated_at DESC LIMIT 1) AS summary,
       ARRAY(SELECT DISTINCT d.language FROM shared_product_descriptions d
              WHERE d.master_id=pm.id AND d.description_type='STORE'
                AND d.status='canonical' AND d.deleted_at IS NULL) AS languages
  FROM product_masters pm
 WHERE EXISTS(SELECT 1 FROM shared_product_descriptions d
               WHERE d.master_id=pm.id AND d.description_type='STORE'
                 AND d.status='canonical' AND d.deleted_at IS NULL)
   AND (pm.name ILIKE $1 OR pm.barcode = $2)
 ORDER BY pm.name ASC LIMIT 30
```

- `FROM product_masters` + 설명서는 **상관 서브쿼리(summary=LIMIT 1, languages=배열 집계)** → **1행 = 1 ProductMaster**. 설명서 JOIN에 의한 행 증식 없음 → **조사 §4.3 확정, §5-C(JOIN 중복) 배제**.
- 즉 "코푸시럽에스" 5행 = **실제 product_masters 5개** (이름 동일, barcode 상이, 각자 STORE canonical 설명서 보유).
- **응답 필드 = `masterId / name / barcode / summary / languages` 뿐** → 성분·함량·제형·제조사·규격·포장 없음 → **화면에서 이름이 동일하게 보이는 근본 원인**.

### 2.2 화면 표시 (구분정보 부재 확인)
결과 카드([TabletScreenSetManager.tsx:583-598](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx))는 1행 `{r.name}`, 2행 `O4O 표준 설명서 · {barcode} · {summary 30자}` 만 표시. 5행이 이름·배지 동일, **바코드로만 구분**됨(사용자가 의약품을 구분하기에 부적절).

### 2.3 선택·저장 계약 — **masterId 참조, 설명서 스냅샷 아님** (§4.4)
- 선택 상태는 `selO4o[r.masterId]`로 키잉([:587](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)).
- `선택한 콘텐츠 추가`([:540-554](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)) → 선택 마스터마다 `content_list` config item `{ sourceType:'o4o_product_description', masterId, language:'ko' }` push. 저장되는 것은 **상품(ProductMaster) 참조 + 언어**이며, 상품·설명서 본문을 복사·스냅샷하지 않는다(공개 시 [store-public-tablet-content-resolve.ts](../../apps/api-server/src/routes/platform/store-public/store-public-tablet-content-resolve.ts) `resolveO4oItem`이 masterId→STORE canonical 설명서 resolve).
- **화면 제목은 "추가 정보(콘텐츠) 고르기"인데 실제 선택 단위는 상품(ProductMaster)** — 데이터 계약과 화면 표현이 어긋남(상품 SKU를 콘텐츠처럼 반복 노출).

### 2.4 동시 선택 시 중복 (§4.5) — **중복 발생 가능**
- dedup 키 `key2 = o4o:${masterId}:${language}`([:504](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)), `existingKeys`로 **동일 key 재추가만 차단**([:584](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)).
- 5개 마스터는 masterId가 달라 **key가 5개 → 모두 추가됨**. 설명서 내용이 동일하면 **태블릿·QR 추가 정보에 같은 설명이 5번 반복**된다. (설명서 ID 기준 dedup 아님 → 내용 중복 방지 못 함.)

### 2.5 A/B/C/D 판정
- **C(검색 JOIN 중복) — 배제 확정** (§2.1, 반환 단위=ProductMaster, 증식 없음).
- **A(정상 별도 SKU) vs B(정상 SKU·동일 설명서 공유) vs D(마스터/설명서 실중복)** — **실데이터 필요**. 구조적 정황상 **A 유력**: 의약품 코퍼스는 MFDS 표준코드(=barcode) 기준으로 마스터가 승격되며([drug-master-promotion](../../apps/api-server/src/modules/neture)), 제시된 5 바코드(8806421055214/022919/055207/022902/055221)는 서로 다른 표준코드 = **포장단위 등이 다른 별도 SKU**일 개연성이 높다. 다만 **이 화면의 선택 대상은 "매장용 상세설명서"**이므로, 5 마스터의 설명서 본문이 동일/유사하면 화면 표현은 **B(설명서 단위로 1회 표시 + 연결 상품 요약)**가 목적에 부합. 최종 확정은 §3 쿼리로 설명서 내용 동일 여부를 확인해야 한다.

---

## 3. 실데이터 확정용 쿼리 (미실행 — DB read 필요)

프로덕션 `o4o_platform`에서 아래를 실행하면 A/B/D를 확정할 수 있다(read-only SELECT, `gcloud sql connect`/Admin API/Console 채널).

```sql
-- (1) 동일 이름 마스터·구분정보·설명서 개수
SELECT pm.id AS master_id, pm.name, pm.barcode, pm.manufacturer_name,
       pm.specification, pm.drug_category,
       (SELECT count(*) FROM shared_product_descriptions d
         WHERE d.master_id=pm.id AND d.description_type='STORE'
           AND d.status='canonical' AND d.deleted_at IS NULL) AS store_canonical_cnt
  FROM product_masters pm
 WHERE pm.name ILIKE '%코푸시럽%'
 ORDER BY pm.name, pm.barcode;

-- (2) 5 마스터의 STORE canonical 설명서 내용 동일 여부(해시 비교)
SELECT d.master_id, d.language, d.source_ref_id,
       md5(d.content) AS content_md5, length(d.content) AS len, left(d.summary,40) AS summary
  FROM shared_product_descriptions d
  JOIN product_masters pm ON pm.id=d.master_id
 WHERE pm.name ILIKE '%코푸시럽%' AND d.description_type='STORE'
   AND d.status='canonical' AND d.deleted_at IS NULL
 ORDER BY d.master_id, d.language;

-- (3) 품목기준코드/표준코드(구분 보조)
SELECT i.product_master_id, i.identifier_type, i.identifier_value, i.is_primary
  FROM product_identifiers i
  JOIN product_masters pm ON pm.id=i.product_master_id
 WHERE pm.name ILIKE '%코푸시럽%' AND i.deleted_at IS NULL
 ORDER BY i.product_master_id, i.identifier_type;
```

판정 기준: (2)의 `content_md5`가 5개 모두 동일 → **B**(동일 설명서 공유, 설명서 단위 표시 권장). 서로 다름 → **A**(별도 SKU·별도 설명서). (1)에서 name·barcode 외 규격/제조사/성분이 모두 동일하고 설명서도 동일하면 **D(실중복)** 의심 → 별도 정합화 WO.

---

## 4. 상품 구분정보 수용성 조사 (데이터 모델)

같은 이름 구분에 필요한 필드의 **저장 위치·도달성·채움 여부**:

| 정보 | 저장 위치 | product_masters에서 도달 | 채움(코퍼스) |
|------|----------|------------------------|:---:|
| 바코드/GTIN | `product_masters.barcode` (=표준코드) | **직접 컬럼** | **O** |
| 규격·제형·포장·수량(결합) | `product_masters.specification` (약품규격+총수량+제형구분+포장형태 결합 문자열) | **직접 컬럼**([ProductMaster.entity.ts:93](../../apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts)) | **O** |
| 제조사 | `product_masters.manufacturer_name` | **직접 컬럼**([:105](../../apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts)) | **O** |
| 품목기준코드(MFDS) | `product_identifiers` type `MFDS_CODE` | `product_master_id` join(서브쿼리) | **O**(승격 시 생성) |
| MFDS 공식명 | `product_masters.regulatory_name` | 직접 컬럼 | O |
| 성분명(개별) | `product_drug_extensions.ingredient_summary/active_ingredients`; 후보 `raw_payload.일반명코드`(코드만) | drug_ext 1:1 | **X/미상**(ext 상세 대부분 미채움) |
| 함량(개별 컬럼) | `product_drug_extensions.strength` (+ specification에 결합됨) | drug_ext | **X**(결합 문자열엔 O) |
| 제형(개별 컬럼) | `product_drug_extensions.dosage_form` (+ specification 결합) | drug_ext | **X**(결합 문자열엔 O) |
| 포장단위(개별 컬럼) | `product_drug_extensions.package_unit/package_quantity` (+ specification 결합) | drug_ext | **X**(결합 문자열엔 O) |
| 투여경로 | **없음**(어느 테이블에도 컬럼 없음; 제형으로 간접 추정) | 불가 | **X** |

> 근거: 데이터 모델 정밀 조사(ProductMaster / ProductIdentifier / SharedProductDescription / **ProductDrugExtension** 엔티티). 대량 승격 경로는 Master+Identifier만 생성하고 `product_drug_extensions` 상세 컬럼은 policy-only shell(대부분 NULL) — 개별 구조화 필드는 별도 population 필요.

### 정보 부족 시 해결 순서 판정
- **1~2단계로 즉시 가능(무 migration)**: `barcode`, `specification`(결합 규격/제형/포장), `manufacturer_name`은 **product_masters 직접 컬럼이고 채워져 있다** → o4o-descriptions 검색 SELECT에 컬럼만 추가하면 화면 구분정보로 사용 가능. `품목기준코드`는 `product_identifiers` MFDS_CODE 서브쿼리로 추가(무 migration).
- **3~5단계(구조화·모델 보강) 필요**: 성분명·함량·제형·포장단위를 **개별 필드**로 쓰려면 `product_drug_extensions` population(또는 `specification`/`raw_payload` 파싱) 필요. 투여경로는 저장처 자체가 없음 → 모델 보강 대상. 이는 태블릿뿐 아니라 상품검색·QR·POP 공통 기반이므로 **별도 데이터 보강 WO**로 분리 판단.

---

## 5. 판정 요약 & 후속 최소 WO 제안

| 문제 | 판정 | 후속 |
|------|------|------|
| 모달 줄맞춤 | 원인 확정(스크롤바 gutter + gap) | **WO-1 (UI, 무 DB)** |
| 동일 이름 5행 | ProductMaster 5개, JOIN 증식 아님(C 배제) | 데이터로 A/B/D 확정 후 표현 결정 |
| 구분정보 부재 | 검색이 name+barcode만 반환 | **WO-2 (검색 projection 보강, 무 migration)** |
| 동일 설명서 5중 노출 가능 | masterId 기준 dedup만 → 내용 중복 방지 못 함 | WO-2/WO-3에서 표현 정책 결정 |

**WO-1 (모달 정렬, UI only)**: `ContentPickerModal` 결과 컨테이너([:578](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx))에 `scrollbar-gutter: stable`(또는 스크롤 wrapper full-bleed + 내부 px-4). 탭 `gap-1.5→gap-2` 통일. DB/API 무변경.

**WO-2 (검색 결과 구분정보 노출, 무 migration)**: `o4o-descriptions` 라우트 SELECT에 `pm.specification`, `pm.manufacturer_name`(직접 컬럼) 추가(+선택적으로 `product_identifiers` MFDS_CODE 서브쿼리). 결과 카드 2행을 우선순위 `제형·규격 · 포장 · 제조사`로 표기, **바코드는 모든 실무 정보가 없을 때만 보조값**. `specification`은 결합 문자열이므로 그대로 노출(파싱은 후속). ProductMaster SSOT 의미 변경 없음(표시용 projection).

**WO-3 (표현 단위 결정, 데이터 확인 후)**: §3 쿼리로 5 설명서 내용 동일 여부 확인 →
- 동일(B): 이 화면 목적이 "매장용 상세설명서 선택"이므로 **설명서 단위로 1회 표시 + 연결 상품(규격·포장·제조사) 요약**, dedup 키를 설명서 내용/그룹 기준으로 강화(태블릿 5중 노출 방지).
- 상이(A): 각 행 유지하되 WO-2의 구분정보로 식별 가능하게. 성분·함량·제형·안전정보가 다르면 **임의 병합 금지**.

**보류(별도 데이터 WO)**: 성분/함량/제형/포장단위 **개별 구조화** 및 투여경로 — `product_drug_extensions` population/모델 보강 필요. IR에서는 설계안·영향만 제시(migration·백필 미실행).

---

## 6. 완료 보고 (§10 형식)

```text
IR-O4O-KPA-TABLET-ADDITIONAL-CONTENT-DUPLICATE-NAME-AND-MODAL-ALIGNMENT-AUDIT-V1 완료

1. 동일 이름 결과
- 검색어: 코푸시럽 (재현 화면: 코푸시럽에스 5행)
- 결과 수 / ProductMaster 수 / 바코드 수: 5 / 5 / 5 (반환 단위=ProductMaster, JOIN 증식 아님)
- 품목기준코드 수 / 제조사 / 규격·포장 차이: 실데이터 필요(§3 쿼리) — 미실행(read-only 채널·미승인)

2. 설명서 관계
- description ID 수 / source_ref_id / canonical / 내용 동일 여부 / 그룹 수: 실데이터 필요(§3 (2) md5 비교)
- 구조: 마스터당 STORE canonical 1개(EXISTS), 5 마스터 = 최소 5 설명서 row

3. 검색·선택 계약
- API: GET /api/v1/store/tablet-content-sources/o4o-descriptions
- 반환 단위: ProductMaster (상관 서브쿼리, 증식 없음)
- JOIN 증식: 없음
- 체크박스 고유키: masterId (dedup key = o4o:{masterId}:{lang})
- 저장 참조 대상: content_list item {o4o_product_description, masterId, language} (상품 참조, 스냅샷 아님)
- 동시 선택 시 중복: 가능(내용 동일 설명서가 masterId별 5중 노출)

4. 판정
- A/B/C/D: C 배제 확정 / A 유력(별도 MFDS 표준코드 SKU) / 설명서 동일 시 화면은 B 권장 / D는 §3로 배제
- 근거: 반환 단위·선택 계약·MFDS 승격 구조
- 삭제·병합 필요: 이번 IR 범위 아님(데이터 확인 후 별도 WO)
- UI에서 묶어야 하는 단위: 선택 대상이 '매장용 상세설명서'이므로 설명서 단위 우선(내용 동일 시)

5. 줄맞춤
- 대상 컴포넌트: ContentPickerModal (TabletScreenSetManager.tsx:510-635)
- 현재 padding/gap: 전 영역 px-4 통일 / 탭 gap-1.5, 검색·footer gap-2
- 불일치 원인: 결과 목록 overflow-y-auto 스크롤바 gutter가 우측 폭 잠식(주) + gap 불일치
- 권장 공통 기준선: px-4 유지 + scrollbar-gutter:stable, gap-2 통일
- 반응형 영향: 좁은 화면 풀스크린 전환(sm:) 정상, 검색 버튼 줄바꿈 없음

6. 후속 작업
- 최소 코드 변경: WO-1(모달 CSS), WO-2(검색 SELECT + 카드 표기, 무 migration)
- API 변경: WO-2에서 o4o-descriptions 응답에 specification/manufacturerName(+품목기준코드) 추가
- DB 변경 / migration: 없음(WO-1/2). 성분·함량 개별 구조화는 별도 데이터 WO(보류)
- 보호 대상 영향: 없음(보호 샘플·공개 QR 무관)

7. 산출물
- CHECK: 본 문서
- commit / push: 완료(docs-only)
- 코드 변경: 0
- DB write: 0
```
