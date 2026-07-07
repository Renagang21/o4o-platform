# CHECK-O4O-DRUG-OTC-ORAL-SINGLE-DRAFT-BATCH-03-V1

> **WO:** WO-O4O-DRUG-OTC-ORAL-SINGLE-DRAFT-BATCH-03-V1 (HANDOFF)
> **성격:** 단일제 경구 OTC 설명서 **3차 batch**. e약은요 원문 실조회 grounding. DB write 0 · registry 직접 변경 0 · 복합제/비경구 0 · DB 상태 버킷 신설 0.
> **결과:** batch-02 이후 남은 clean 단일 len7 후보를 전수 재검토 → **grounded 신규 draft_written 1**(콜레칼시페롤 1000IU 정). 나머지는 복합/감기/route/probiotic 혼재로 미작성(사유 CHECK 기록). **len7 clean 단일 경구 grounded 모수는 사실상 소진** → 다음은 coarse ATC 분해·probiotic 기준·복합/비경구 batch(별도 작업방).

---

## 1. 작업 일시 / 채널

| 항목 | 값 |
|---|---|
| 작업 일시 | 2026-07-07 |
| 접속 | Cloud SQL Auth Proxy(127.0.0.1:15477) → psql SELECT (read-only) |
| 인스턴스 / DB | `netureyoutube:asia-northeast3:o4o-platform-db` / `o4o_platform` |
| 인증 | gcloud ADC(sohae2100@gmail.com) + DB 계정 `o4o_api`(Cloud Run env) |
| write | **0** (SELECT/COUNT만) |
| grounding 원천 | `shared_product_descriptions.content`(`source_type='mfds_easy_drug'`) 원문 실조회 |

## 2. 사용한 선행 문서

| 문서 | 활용 |
|---|---|
| `CHECK-...-ORAL-SINGLE-DRAFT-BATCH-02-V1.md` | clean 단일 86패밀리·DONE 44·batch-02 16·미작성군 |
| `CHECK-...-ORAL-SINGLE-TOTAL-INVENTORY-AUDIT-V1.md` | 단일 경구 모수·정합 이슈 |
| `CHECK-...-BATCH-ORAL-SINGLE-DRAFT-V1.md` | batch-01(콜레칼시페롤 blocked·세인트존스워트 manual) |
| `docs/registries/...GROUP-REGISTRY-V1.md` | imported 중복 제거 |
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` | 템플릿·문체·§3.5 함량축·§3.8 grounding |

## 3. 대상 선정 기준

- OTC(`drug_category='otc'`) + ATC7(len7) clean 단일 + 경구(비경구 name/ATC 배제) + 복합 배제(ATC 숫자접미≥50·R05X, name 종합/멀티/자양강장/외용 배제).
- **handled 63 ATC7 제외**(imported/batch-01/batch-02 처리분).
- 남은 후보에서 **e약은요 원문 실조회로 단일·경구·grounding·함량 확정된 그룹만** 작성.

## 4. Batch-02 이후 잔여 후보 추출 방식

- 쿼리: handled 63 ATC7 제외, len7 clean 단일, `mfr≥2 & grounded≥1` → **잔여 25 패밀리**.
- grounded 상위 25 전수 육안 판정 + 경계 4건(R05CB10·A02AD01·A11CC05·A07FA01) 원문 실조회.
- 결과: 신규 grounded 단일 = **1**(콜레칼시페롤 1000IU 정). 나머지 24 = 복합/감기/route/probiotic/영양복합/OTC-RX(§9).

## 5. Batch-03 대상 목록

| No | group_key | title | ingredient | strength | dosage_form | basis | decision |
|-:|---|---|---|---|---|---|---|
| 1 | drug_otc::single::oral::콜레칼시페롤::1000iu::tablet | 콜레칼시페롤(비타민D3) 1000IU 정 | 콜레칼시페롤(농축과립) | 1000IU | tablet | e약은요 | draft_written |

## 6. 기존 imported/batch-01/batch-02/canonical 중복 확인

- 콜레칼시페롤 **1000IU 정**은 imported/batch-01/batch-02와 **exact 중복 0**.
- **batch-01 관계:** batch-01은 `콜레칼시페롤과립 10mg 정`을 **blocked(함량 단위 불명확)** 처리했다. 이번 원문 조회로 **10mg은 과립 중량, 역가표기 제품은 1000IU**임이 확인됨 → 역가 명확한 **1000IU 정**은 별개의 명확한 그룹으로 신규 작성, `10mg 과립` 변형은 여전히 함량 모호로 미작성(§9, batch-01 blocked 유지).
- 단일 비타민 계열(비타민C·E·니아신아미드·비오틴·엽산)은 batch-01/imported에서 완료 → 단일 비타민D3는 정합적 신규.

## 7. grounding 근거 (e약은요 원문 발췌)

| No | 효능·효과(원문) | 용법(원문) | 핵심 주의(원문) |
|-:|---|---|---|
| 1 콜레칼시페롤 1000IU | 골다공증 치료 보조, 흡수장애 없는 건강인의 비타민D 결핍질환 예방, 구루병 예방 | 골다공증 보조 1정(1000IU) 1일1회, 예방 1/2정(500IU) 1일1회, 물과 함께 | 고칼슘혈증·고칼슘뇨증·신장결석·3개월 미만 영아·과민 금지; 신장결석 경험·유육종증·거동제한 상담 |

## 8. 설명서 초안

> 하단 §6 공통 문구: *"의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다. 같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다. 제품명보다 성분·함량을 기준으로 약사에게 확인하세요."*

### 8.1 콜레칼시페롤(비타민D3) 1000IU 정

| 항목 | 내용 |
|---|---|
| 성분 | 콜레칼시페롤(비타민D3) 1000IU |
| 분류 | 일반의약품 |
| 작용 | 비타민D 보급, 칼슘 대사 보조 |
| 주요 증상 | 골다공증 치료 보조, 비타민D 결핍 예방, 구루병 예방 |
| 선택 포인트 | 역가(1000IU)가 표기된 단일 비타민D3 제제 |
| 주의 대상 | 고칼슘혈증·고칼슘뇨증·신장결석, 3개월 미만 영아 |

**효능·효과**
골다공증 치료 보조, 흡수장애가 없는 건강한 사람에서 비타민D 결핍질환 위험 예방, 구루병 예방에 사용합니다.

**복용 안내**
허가된 용법·용량에 따라 복용합니다(골다공증 보조 1정 1000IU 1일 1회, 예방 목적은 1/2정 500IU 1일 1회). 충분한 물과 함께 복용하며, 삼키기 어려운 유아는 물에 붕해시켜 식사와 함께 복용합니다.

**주의 대상**
이 약 과민, 고칼슘혈증·고칼슘뇨증·신장결석, 3개월 미만 영아는 복용하지 않습니다. 신장결석 경험자·유육종증·거동이 제한된 환자는 복용 전 상담하세요. 다른 비타민D 함유 제품과 중복되지 않도록 확인합니다.

**성분 기준 선택** (§6 공통 문구)

## 9. 작성하지 않은 그룹과 사유 (CHECK 내부 판단 — DB 상태 아님)

잔여 25 패밀리(§4) 판정:

| group(성분/대표) | atc7 | reason | note |
|---|---|---|---|
| 정장 생균(락토웰 2균 / 안티비오 단일균) | A07FA01 | not_written_probiotic_unclear | **단일균+2균 복합이 한 ATC에 혼재**. 단일 락토바실루스아시도필루스는 imported에 이미 존재 → 균주 단위 분리 WO 필요 |
| 콜레칼시페롤 **10mg 과립** 변형(플러스디·애드민포르테) | A11CC05 | not_written_group_unclear | "10mg"은 과립 중량(역가 아님). batch-01 blocked 유지. 역가 표기분(1000IU)만 §8 작성 |
| 세브론에이시럽(진해거담+항콜린) | R05CB10 | not_written_combo_suspected | R05CB10=거담 복합. 원문에 감기·기침+녹내장/전립선 주의(항콜린 동반)→복합·감기 |
| 위앤정(제산) | A02AD01 | not_written_combo_suspected | A02AD=제산제 복합 클래스, 단일 성분 미확인 |
| 훼로모아·헤모렌·푸마훼린·훼럼포유 | B03AE01·B03AE10·B03AE02·B03AD04 | not_written_combo_suspected | 철+엽산/비타민 복합 |
| 판크레아틴(노자임) | A09AA02 | not_written_combo_suspected | 다효소 복합 가능성 |
| 핑큐린(완하) | A06AB20 | not_written_combo_suspected | 자극/팽창성 복합 |
| 부스코판플러스 | A03DB04 | not_written_combo_suspected | 스코폴라민+진통 복합 |
| 티라노골드·고운자임맘·셀렌비타 | A11AA03·A11AA01·A11DA01 | not_written_combo_suspected | 멀티비타민/미네랄 복합 |
| 콜락·챔프코프에스·콜그린에이 | R05FA02·R05FB02·R05DA20 | not_written_combo_suspected | 감기/진해거담 복합 |
| 세비안관류제(염화나트륨) | B05CB01 | not_written_route_uncertain | 관류제(비경구) |
| 니코에이껌(니코틴) | N07BA01 | not_written_route_uncertain | 구강 저작(oral_local)·금연보조 |
| 둘코락스(비사코딜) | A06AB02 | not_written_route_uncertain | 경구정+좌약 route 혼재(§11) |
| 베베락스액 | A06AG20 | not_written_route_uncertain | 관장(직장) |
| 케로팝경고제·조아팝(케토프로펜·플루르비프로펜) | M02AA10·M02AA19 | not_written_route_uncertain | 외용 경고제/팝 |
| 그린큐액(돔페리돈) | A03FA03 | not_written_otc_rx_mixed | OTC/RX 혼재·심장(QT) |
| 마인트롤정(세인트존스워트) | N06AX25 | not_written_group_unclear | 단일이나 CYP 유도·다수 상호작용(batch-01 manual). 안전 프레이밍 복잡 → 보류 |

> D-tail(제조사=1 또는 grounded=0, 3,779그룹/20,106 masters)은 이번 batch 대상 제외(WO §6).

## 10. 정장 생균류/probiotic 판단

- **A07FA01은 단일/복합이 한 ATC에 혼재** 확정: `안티비오과립(락토바실루스아시도필루스균)` = **단일균**, `락토웰장용캡슐(바실루스서브틸리스균·엔테로코쿠스페슘균배양물)` = **2균 복합**.
- 단일 락토바실루스아시도필루스·바실루스리케니포르미스·사카로마이세스보울라르디 등은 **imported에 이미 개별 존재**(registry).
- 따라서 A07FA01을 ATC7 단위로 단일 그룹화 불가 → **probiotic 균주 단위 그룹핑 WO 별도 필요**(가이드 §3.7 과병합 예외 A07FA와 연계). 이번 Batch-03 작성 제외.

## 11. 비사코딜 route 혼재 판단

- `A06AB02` 대표 grounded 제품이 `둘코락스좌약(비사코딜)` = **좌약(직장)**. 동 ATC에 경구 장용정도 존재.
- 원문 grounding 대표가 좌약이라 경구정 전용 근거 분리가 불확실 → **route_mixed로 미작성**.
- 경구 비사코딜 장용정만 분리해 별도 grounding 확인 시 후속 작성 가능(코멘트).

## 12. coarse ATC 미세분해 필요 목록

- 이번 batch는 len7만 사용. 인벤토리 감사(§7-2) 기준 **len 3~5 성분군(제산·정장·소화 등)은 성분 미세분해 필요** → 별도 `coarse ATC 분해 WO`로 이관.
- 예: A02A/A05B/A06A 계열의 len<7 코드에 다성분이 묶일 수 있음.

## 13. 데이터 정합 이슈

1. **콜레칼시페롤 함량 표기 이원화:** 역가(IU) 표기 제품 vs 과립 중량(mg) 표기 제품이 혼재 → 그룹 키는 **역가(IU) 기준**으로 통일 권장. 과립 중량 표기분은 역가 매핑 없이는 함량축 불명확.
2. **probiotic ATC 과병합:** A07FA01에 단일균·다균이 혼재(§10).
3. **비사코딜 route 혼재:** A06AB02 경구+좌약 동거(§11).
4. **A02AD 제산 복합 클래스:** 단일 제산제도 A02AD에 섞일 수 있어 성분 확인 없이 단일 확정 불가.

## 14. 다음 단일 경구 batch 또는 별도 WO 제안

1. **coarse ATC 분해 WO** — len 3~5 단일 성분군을 hybrid(ATC7 또는 성분명 정규화)로 분해 후 단일 여부 판정·grounding.
2. **probiotic 균주 단위 그룹핑 WO** — A07FA 정장 생균의 단일/복합·균주 기준 확정(과병합 방지).
3. **경구 비사코딜 분리 확인** — A06AB02 경구 장용정 전용 grounding 확인 후 작성.
4. 위 소진 후에만 복합제(BATCH-ORAL-COMBO)·비경구 route batch로 이동(별도 작업방).
5. **결론:** len7 clean 단일 경구 grounded 모수는 batch-01~03으로 **사실상 소진**. 추가 단일 경구 확보는 coarse ATC 분해·probiotic 균주 분리 없이는 산술적으로 제한적.

## 15. 금지사항 준수 확인

| 항목 | 준수 |
|---|:-:|
| DB write | ✅ 0 (SELECT만) |
| registry 직접 변경 | ✅ 0 |
| product_candidate_description_drafts insert/update | ✅ 0 |
| SharedProductDescription 변경 | ✅ 0 (원문 읽기만) |
| ProductDrugExtension 변경 | ✅ 0 |
| canonical 승격 | ✅ 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | ✅ 0 |
| 복합제/비경구/감기복합/영양복합/probiotic 애매군 작성 | ✅ 0 |
| coarse ATC 미세분해 작업 | ✅ 0 (목록만) |
| DB 상태 버킷 신설 | ✅ 0 (판단은 CHECK 내부 기록만) |
| 근거 없는 용법 창작(§3.8) | ✅ 0 (초안 e약은요 원문 grounding) |

---

*V1 · 2026-07-07 · 단일 경구 3차 batch · draft_written 1(콜레칼시페롤 1000IU) · len7 clean 단일 소진 확인 · DB write 0*
