# CHECK-O4O-HERBAL-OTC-SOURCE-GAP-AUDIT-AND-MFDS-ETL-DESIGN-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-HERBAL-OTC-SOURCE-GAP-AUDIT-AND-MFDS-ETL-DESIGN-V1`

이번 CHECK는 **한방 OTC SOURCE 부재 원인 규명 + MFDS 원문 확보 경로·ETL·SOURCE 저장·Registry 설계**다(설계·조사 중심). **DB write 0 · 코드 변경 0 · 설명서 작성 0 · Canonical 생성 0.**

> 목적은 설명서 작성이 아니라, 향후 수천 개 한방 OTC 설명서를 안정적으로 생성할 **SOURCE 기반 설계 확정**이다.

## 2. 사용한 기준 문서

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md (§7 MFDS 원문 우선 · §8.1 HOLD 철학)
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md (§3.11 SOURCE GAP)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HERBAL-OTC-DRAFT-V1.md (원문 부재 실측 선행)
```

## 3. DB read-only 조사 (SOURCE 부족 원인 규명)

- 접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db`(127.0.0.1:5434, ADC) + `psql` user `o4o_api`. **SELECT 전용**.

### 3.1 현재 SOURCE 저장 위치

| 테이블 | 역할 | 한방 원문 |
|---|---|---|
| `shared_product_descriptions`(source_type=`mfds_easy_drug`) | e약은요 소비자 원문 | **한방 23건만** |
| `product_candidates`(source_type=`external_api`, `raw_payload` jsonb) | 원천 import payload | **효능 원문 없음** |
| `product_drug_extensions`(efficacy/dosage/caution_text) | 임상 텍스트 필드 | **전량 NULL** |

### 3.2 근본 원인 — e약은요 데이터셋 커버리지 gap

- `product_candidates` source_type: `csv_import` 305,522 · `external_api` 88,967 · `operator_import` 2.
- **external_api candidate = MFDS `의약품개요정보(e약은요)` 데이터셋**(raw_payload `sourceDatasetName`=`의약품개요정보(e약은요)`, `sourceAgency`=`MFDS`).
- 한방 candidate 3,259건 raw_payload: **효능키 0 · 용법키 4 · 주의키 4**(= grounded 4처방만). `mainFunction` 필드도 한방은 **null**.
- **결론**: **e약은요(의약품개요정보)는 소비자용 요약 데이터셋으로 생약제제 대부분을 수록하지 않는다.** 기존 import는 제품 목록 메타만 가져왔고 **허가사항 상세 원문(효능효과·용법용량·사용상주의)은 처음부터 수집 대상이 아니었다.** → 별도 데이터셋에서 신규 확보 필요.

## 4. MFDS 원문 확보 경로 조사 (WO §3.1)

| # | 데이터셋/경로 | 원문(효능·용법·주의) | 생약 커버 | 형식 | 채택 |
|:-:|---|:-:|:-:|---|:-:|
| ① | **의약품 제품 허가정보 상세**(`DrugPrdtPrmsnInfoService` / 허가상세) | **EE_DOC_DATA(효능효과)·UD_DOC_DATA(용법용량)·NB_DOC_DATA(사용상주의) 보유** | **전 품목(생약 포함)** | Open API(XML, 문서형 필드) | **★ 1순위** |
| ② | 의약품개요정보 e약은요(`DrbEasyDrugInfoService`) | 소비자 요약(효능/용법 요약) | **낮음(생약 대부분 미수록)** | Open API(XML/JSON) | 보조(현행) |
| ③ | 기존 raw_payload(`product_candidates`) | 없음(메타만) | — | jsonb | 재사용 불가(원문 없음) |
| ④ | 식약처 의약품 허가 전체 목록(다운로드) | 목록·허가번호(원문 부분) | 전 품목 | CSV/Excel | 매칭 보조 |
| ⑤ | 민간 사이트(약학정보원 등) | 있음 | 높음 | HTML | **조사만(채택 대상 아님, WO §3.3)** |

**핵심**: e약은요(②)로는 생약제제 원문을 채울 수 없다. **①의약품제품허가정보 상세 API의 EE/UD/NB DOC_DATA** 가 한방 원문 확보의 유일한 공식 대량 경로다. 공공데이터포털(data.go.kr)·MFDS OpenAPI 서비스키가 운영 선결(별도 ops).

## 5. 확보해야 하는 정보 (WO §4)

| 항목 | 필수/선택 | MFDS 필드(허가상세) |
|---|:-:|---|
| 효능효과 | **필수** | EE_DOC_DATA |
| 용법용량 | **필수** | UD_DOC_DATA |
| 사용상의 주의 | **필수** | NB_DOC_DATA |
| 금기(사용하지 말 것) | **필수**(주의에서 파싱) | NB_DOC_DATA §다음 환자 금지 |
| 소아 | 선택 | NB_DOC_DATA 파싱 |
| 임부·수유부 | 선택 | NB_DOC_DATA 파싱 |
| 고령자 | 선택 | NB_DOC_DATA 파싱 |
| 상호작용 | 선택 | NB_DOC_DATA / 상호작용 항 |
| 보관 방법 | 선택 | STORAGE_METHOD |
| 허가번호 | **필수**(매칭키) | ITEM_SEQ / 품목허가번호 |
| 허가일 | 선택 | ITEM_PERMIT_DATE |

- **필수 3종(효능·용법·주의)이 없으면 SOURCE 미확보 = HOLD_SOURCE**(§10).
- 매칭키: 품목허가번호/ITEM_SEQ ↔ 기존 `product_masters` identifier(표준코드/mfds_code).

## 6. ETL 파이프라인 설계 (WO §5)

```
MFDS 허가상세 API (EE/UD/NB DOC_DATA)
        ↓  [Collector]  품목허가번호 단위 수집
Raw Source            (허가상세 원문 XML/HTML 원형 보존)
        ↓  [Parser]    문서형 필드 → 항목 분해(효능/용법/주의/금기/소아/임부/고령/상호작용/보관)
Normalized Source     (구조화·태그 정규화·매칭키 부여)
        ↓  [Loader]    master_id 매칭 → 설명 원문 소스로 적재
Shared Description Source (source_type 신규, 예: mfds_prdt_prmsn)
        ↓  [AI Draft]  적응증 중심 대표 초안 (설계표준 Template)
AI Draft
        ↓  [Curate]    약사 검토 → 승격
Canonical
```

| 단계 | 역할 |
|---|---|
| Collector | 허가번호 단위 API 수집·재시도·수집이력 |
| Parser | EE/UD/NB 문서형 → 항목 분해(HTML strip·항목 태깅) |
| Loader | master 매칭(허가번호)·중복 제거·원문 무결성 |
| AI Draft | 원문 grounding 기반 적응증 대표 초안(창작 0) |
| Curate | 약사 검토 후 canonical 승격(별도 WO) |

- 본 WO는 **설계만**. 실제 Collector/Parser 구현·API 호출·적재는 후속 구현 WO.

## 7. SOURCE 저장 정책 (WO §6)

**설명서는 저장하지 않는다. SOURCE만 저장한다.**

| 구분 | 저장 대상 | 역할 | 성격 |
|---|---|---|---|
| **Raw** | 허가상세 원문(XML/HTML 원형) | 원천 보존·재파싱 근거 | 불변(수집 시점 스냅샷) |
| **Normalized** | 항목 분해·정규화 텍스트 + 매칭키 | 설명서 grounding 소스 | 파서 버전별 재생성 가능 |
| **Generated** | AI Draft·Canonical(별도 트랙) | 소비자 설명서 | **본 SOURCE 정책 범위 밖**(설명서) |

- Raw는 삭제하지 않고 보존(재파싱). Normalized는 `shared_product_descriptions`의 신규 source_type으로 적재하되 **기존 `mfds_easy_drug`와 분리**.
- Generated(설명서)는 SOURCE가 아니므로 이 정책에서 저장 대상이 아니다(설계표준 §7 SoT: 원문 > 생성물).

## 8. 적응증 Registry 설계 (WO §7)

적응증 중심 설명서를 위해 **적응증 ↔ 대표 처방 연결 Registry**를 문서 registry로 설계(DB 아님, 상태 중앙 관리).

| 컬럼 | 의미 |
|---|---|
| `indication_key` | 적응증 키(감기·목감기·기침·가래·소화불량·위장허약·설사·변비·생리통·피로회복·자양강장·신경안정·수면·비염·축농증·근육경련) |
| `representative_formulas` | 대표 처방 목록(예: 감기→갈근탕·보감탕) |
| `source_status` | `source_ready`(원문 확보) / `hold_source`(원문 부재) |
| `master_count` | 연결 master 수 |
| `notes` | 분리 근거(WO §4 감기↔기침↔가래 별도 등) |

- 연결 방식: 적응증 = 소비자 진입(설계표준 §2·§3), 처방 = 하위 canonical 단위. 1 적응증 ↔ N 처방.
- 현재 상태: 감기·목감기·피로회복·근육경련 = 일부 `source_ready`(grounded 4), 그 외 전부 `hold_source`.

## 9. 처방 Registry 설계 (WO §8)

| 컬럼 | 의미 |
|---|---|
| `formula_key` | 처방명(갈근탕·소청룡탕·은교산·쌍화탕·평위산·반하사심탕·맥문동탕·보중익기탕·십전대보탕·경옥고·우황청심원 …) |
| `primary_indication` | 주 적응증 |
| `master_count` | 연결 master 수(예: 소청룡탕 370·평위산 452) |
| `source_status` | `source_ready` / `hold_source` |
| `safety_tags` | 생약 안전성 태그 참조(§10, 구조만) |

- 현재 `source_ready` = 갈근탕·은교산·쌍화탕·작약감초탕 극소수. 나머지(소청룡탕·반하사심탕·평위산·우황청심·경옥고·보중익기탕·십전대보탕 등) = `hold_source`.

## 10. 안전성 Registry 구조 (WO §9) — 구조만, 내용 작성 금지

> **이번 WO에서 안전성 내용은 작성하지 않는다.** 향후 SOURCE 확보 후 원문 근거로 채울 **구조만** 정의한다.

| 컬럼 | 의미 |
|---|---|
| `herb_key` | 생약(감초·마황·대황·부자·천오·반하·세신 …) |
| `safety_axis` | 안전성 축(**빈칸 — SOURCE 확보 후 원문 근거로 작성**) |
| `counseling_points` | 복약상담 포인트(**빈칸 — 추정 금지**) |
| `source_ref` | 근거 허가상세 위치 |

- **금지(WO §9)**: 안전성 내용 작성·추정. 예: 감초→위알도스테론증, 마황→혈압상승 등은 **원문 확보 후에만** 채운다. 현재는 컬럼만 존재.

## 11. SOURCE GAP 판정 기준 확정 (WO §10) — 설계표준 §8.1 정합

```
필수 3종(효능·용법·주의) SOURCE 존재  →  설명서 작성 가능
필수 SOURCE 없음                     →  설명서 작성 금지 → HOLD_SOURCE
```

- 판정 단위 = 처방(formula) / 적응증(indication). 필수 3종 중 하나라도 없으면 HOLD.
- 설계표준 §8.1("설명서를 만드는 것이 안전하지 않은 상태") 및 §7(MFDS 원문 우선)과 **정합**. 추정 채움 금지.

## 12. 기존 표준과 정합성 (WO §11)

| 표준 | 정합성 | 비고 |
|---|:-:|---|
| CANONICAL-STANDARD §7 MFDS 우선 | ✅ | 허가상세(①)를 SoT로 채택, 민간 사이트 배제 |
| CANONICAL-STANDARD §8.1 HOLD 철학 | ✅ | 필수 SOURCE 없으면 HOLD, 추정 금지 |
| CANONICAL-STANDARD §2 계층 | ✅ | 적응증→처방 Registry 2계층 |
| WRITING-GUIDE §3.11 SOURCE GAP | ✅ | 대표 허용 게이트·ETL 분리 원칙 재확인 |
| **새 규칙 창작** | ✅ 없음 | 기존 표준 적용·경로/구조 설계만 |

## 13. 변경 없음 확인

- DB write 0 (SELECT 전용) · 코드 변경 0 · 설명서 작성 0 · Canonical 0 · MFDS API 호출 0
- 변경 파일: 본 CHECK 1건 (문서만)

## 14. 완료 기준 대비 (WO §13)

| 기준 | 상태 |
|---|---|
| MFDS 원문 확보 경로 조사 | ✅ 의약품제품허가정보 상세(EE/UD/NB) 1순위 |
| 현재 SOURCE 부족 원인 규명 | ✅ e약은요 데이터셋이 생약 미수록·기존 import 원문 미수집 |
| ETL 파이프라인 설계 | ✅ Collector→Parser→Loader→Draft→Canonical |
| SOURCE 저장 구조 설계 | ✅ Raw/Normalized/Generated |
| 적응증 Registry 설계 | ✅ |
| 처방 Registry 설계 | ✅ |
| SOURCE GAP 기준 확정 | ✅ 필수3종 없으면 HOLD |
| HOLD 정책 확인 | ✅ 설계표준 §8.1 정합 |
| 기존 표준과 정합성 확인 | ✅ 충돌·창작 없음 |
| CHECK 문서 작성 | ✅ 본 문서 |

## 15. 후속 WO 후보

- `WO-O4O-HERBAL-OTC-MFDS-PRDT-PRMSN-ETL-IMPLEMENT-V1` — 허가상세 API Collector/Parser/Loader 구현(서비스키·수집·적재)
- `WO-O4O-HERBAL-OTC-INDICATION-REGISTRY-POPULATE-V1` — 적응증·처방 Registry 파일 생성
- (SOURCE 확보 후) `WO-O4O-DRUG-OTC-DESCRIPTION-HERBAL-{적응증}-DRAFT-V1` — 적응증별 대표 초안 재개
