# WO-O4O-QUASI-DRUG-PUBLIC-XML-DESCRIPTION-PARSER-DRYRUN-V1

> 작업 성격: **의약외품 EE/UD/NB XML 공식 설명 파서 구현 + 전량 dry-run + Gate C 가능성 판단.** DB write 0, apply 0, migration 0. 파서는 순수 함수(테스트 포함).
> 작성일: 2026-07-04
> 선행: `WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1`(§9 Gate A apply 완료, product_candidates 22,953)
> 참조: `CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1`(e약은요 Gate C 선례)
> 범위 고정: **의약외품 트랙 전용.** 의료기기/건강기능식품 혼입 금지. 병렬 세션 파일 무수정.

---

## 0. 한 줄 결론

**의약외품 EE/UD/NB XML 은 파서로 99.8% 평문 추출 가능하지만, Gate C(SharedProductDescription 파생)는 지금 대상이 없다.** SPD 는 `master_id` 가 필요한데, 의약외품 22,953 품목 중 기존 ProductMaster(MFDS_CODE)와 매칭되는 것은 **단 1건**(우연한 코드 충돌)뿐이다. 의약외품은 HIRA 의약품 ProductMaster 집합에 없으므로, **파서 산출물은 candidate 레벨에 스테이징**하고 SPD 파생은 **Gate B(ProductMaster 승격) 이후**로 미룬다.

---

## 1. 대상 XML 구조 (실측)

```xml
<DOC title="효능효과" type="EE">
  <SECTION title="">
    <ARTICLE title="">
      <PARAGRAPH tagName="p" textIndent="0"><![CDATA[구중청량, 구취제거]]></PARAGRAPH>
    </ARTICLE>
  </SECTION>
</DOC>
```

- type: `EE`(효능효과) / `UD`(용법용량) / `NB`(사용상주의사항)
- 본문은 `PARAGRAPH` 내부 **CDATA**(99.9%). 일부 `<TABLE><TR><TD>`, `<BR>`, `<IMG>`, HTML entity(~20%) 포함.
- 태그 인벤토리(3000 표본): PARAGRAPH 20,343 / ARTICLE 13,506 / DOC·SECTION 각 8,933 / TD 177 / BR 51 / IMG 38 / TABLE 4.

---

## 2. 구현 (순수 파서 + 테스트)

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/drug-import/quasi-drug-permit-official-text.parser.ts` | 순수 함수. `xmlDocToPlainText()` + `parseQuasiDrugOfficialText(ee,ud,nb)` → {efficacyText,dosageText,cautionText,isEmpty,flags} |
| `apps/api-server/src/modules/neture/drug-import/__tests__/quasi-drug-permit-official-text.parser.test.ts` | unit test **9건 PASS** |

파싱 규칙: CDATA 언랩 → PARAGRAPH/ARTICLE/TR 줄바꿈, TD 탭, BR 줄바꿈 → 나머지 태그 제거(IMG 는 flags 로 존재 기록) → HTML entity 디코드(amp 이중디코드 방지) → 공백 정리. **원문 XML 은 candidate `raw_payload.officialRegulatoryText` 에 계속 무손실 보존**(파서는 파생 평문만 생성).

테스트 커버: CDATA 언랩 / null·빈문자 / 다중 PARAGRAPH 줄바꿈 / BR·TABLE·TD / entity 디코드 / IMG 제거 / 3섹션 구조화 / isEmpty / table·img·entity flags.

---

## 3. 전량 파싱 dry-run (실제 파서, 22,953)

| 지표 | 값 |
|---|---:|
| total rows | 22,953 |
| EE/UD/NB 최소 1개 보유 | 22,952 (100.00%) |
| **XML 보유했으나 파싱 후 빈 텍스트(loss)** | **46 (0.20%)** → `OFFICIAL_TEXT_PARSE_EMPTY` review flag 대상 |
| EE 평문 non-empty | 22,617 (98.54%) |
| UD 평문 non-empty | 22,206 (96.75%) |
| NB 평문 non-empty | 12,553 (54.69%) — "없음"/결측 다수 |
| CDATA 포함 | 22,928 (99.89%) |
| TABLE 포함 | 2 (0.01%) |
| IMG 포함 | 77 (0.34%) — 이미지는 Gate C 별도(외부 URL 직참조 금지) |
| HTML entity 포함 | 4,592 (20.01%) |
| 평균 결합 텍스트 길이 | 225자 |
| 최대 결합 텍스트 길이 | 17,445자 |

**→ 파싱 신뢰도 높음(99.8%).** loss 46건만 review flag 로 격리하면 된다. 표 2건은 무시 가능, IMG 77건은 텍스트에서 분리됨.

샘플: `[196000044] EE="구중청량, 구취제거" UD="1회 6-10환을 수회 복용" NB="없음"`.

---

## 4. Gate C(SharedProductDescription 파생) 가능성 — **현재 불가(대상 없음)**

> read-only DB 확인(2026-07-04, 임시 authorized-network → psql → 원복).

| 확인 | 결과 |
|---|---:|
| 의약외품 candidate `normalized_identifier_value` ∩ 기존 `product_identifiers(MFDS_CODE)` | **1** / 22,953 |
| shared_product_descriptions 전체 | 19,431 (전부 e약은요, 불변) |

**해석 (e약은요와의 결정적 차이):**

| 항목 | e약은요(Gate C 완료) | 의약외품 |
|---|---|---|
| itemSeq/ITEM_SEQ 성격 | **의약품** 품목기준코드 = HIRA master 의 MFDS_CODE | **의약외품** 품목기준코드(별도 registry) |
| 기존 master 매칭 | 4,757/4,757 (100%) → 19,431 파생 | **1/22,953** (우연한 코드 충돌) |
| SPD 파생 대상 | 있음 | **사실상 없음** |

- SharedProductDescription 은 `master_id` 필수(dedup=(master_id, source_type, source_ref_id)). 의약외품은 붙일 master 가 없다.
- 매칭 1건조차 **의약외품↔의약품 오매칭 위험**(MFDS_CODE 공유 네임스페이스 caveat). 자동 파생 금지.
- 따라서 **Gate C 는 Gate B(ProductMaster 승격) 이후**에만 의미가 있고, Gate B 는 barcode/SKU 축 부재로 계속 보류.

---

## 5. 판단 및 권장

**파서는 준비 완료(tested, 99.8%). 하지만 SPD 파생(Gate C)은 대상 부재로 진행 불가.** 파서 산출물의 안전한 활용처는 다음 중 하나다(별도 WO, apply 시 승인 필요):

1. **candidate 레벨 스테이징(권장)** — 파싱 평문을 candidate `raw_payload.derivedOfficialText`(efficacy/dosage/caution)로 보존. master 불필요, 운영자 검토·검색·향후 파생에 재사용. 원문 XML 은 그대로 유지.
2. **Gate B 대기** — 의약외품 ProductMaster 가 생기면(SKU/barcode 원천 확보 후) 그때 SPD 파생.

**이번 WO 는 파싱 dry-run + 파서 구현까지.** DB write/apply 없음.

---

## 6. read-only / 준수 확인

| 항목 | 결과 |
|---|---|
| DB write / apply | 0 (read-only 확인 SQL만) |
| ProductMaster/ProductIdentifier/SPD 생성 | 0 |
| StoreLocalProduct/Listing/Offer 생성 | 0 |
| raw 대용량 파일 커밋 | 0 |
| serviceKey/DB secret 기록 | 0 (변수명만, 방화벽 임시오픈→원복) |
| 범위 확장(의료기기/건기식) | 0 |
| 병렬 세션 파일 수정 | 0 |

이번 커밋 = 순수 파서 1 + test 1 + 본 WO 문서 1.

---

## 7. 다음 단계 (의약외품 트랙, 순서)

1. **(선택) candidate 파생 텍스트 스테이징 WO** — §5-1. 파서 평문을 `raw_payload.derivedOfficialText` 로 보존(apply, 승인 필요). SPD 아님.
2. **SKU/barcode 원천 audit WO** — 의약외품 포장단위/표준코드 공공 원천 조사.
3. **Gate B(ProductMaster 승격) 재판정** — 2 결과에 종속. 승격되면 그때 SPD 파생(Gate C) 재개.

**최종: 의약외품 공식 설명 XML 파서는 구현·검증 완료(99.8% 파싱, test 9 PASS). SharedProductDescription 파생은 매칭 master 부재(1/22,953)로 현 단계 불가 — Gate B 이후로 이연하고, 그 전까지 파서 산출물은 candidate 레벨 스테이징이 안전하다.**
