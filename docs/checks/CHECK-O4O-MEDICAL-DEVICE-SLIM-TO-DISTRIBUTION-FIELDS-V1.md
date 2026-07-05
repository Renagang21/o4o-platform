# CHECK-O4O-MEDICAL-DEVICE-SLIM-TO-DISTRIBUTION-FIELDS-V1

> 의료기기 상품 데이터를 O4O 유통 구조로 슬림화 — 규제/허가 정보 제거, 상품(행)은 보존.
> 상태: **구현 + 트랜잭션 dry-run 검증 완료 · 실제 적용은 CI/CD 대기.** 실행 2026-07-05.
> 원칙: [`O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1`](../baseline/O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1.md)

---

## 0. 배경 (사용자 확정)

O4O 는 유통/실행 자산 플랫폼 — 상품은 **유통 정보**로 구성한다. 규제 존재(허가/표준코드)는 유통 정보가 아니다.
**"상품 자체는 지우지 않는다. 한 상품 안에서 유통에 안 쓰는 규제 정보만 지운다."** (2026-07-05)
가져온 MFDS 규격이 기준이 아니라, **O4O 상품 구조**가 기준이고 거기에 채울 정보만 원천에서 가져온다.

O4O 상품 구조(바코드로 구분): **상품명 · 제조사 · 제조국 · 포장단위 · 바코드(이후).** 카테고리·식별자 미사용.
"원천에 없으면 비워둔다."

---

## 1. 적용 migration

`20261211000000-SlimMedicalDeviceToDistributionFields` (DML, 의료기기만).
락: UPDATE ROW EXCLUSIVE. 행 삭제 없음. 타 트랙 무영향.

### candidate (source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE', 19,996)
| 필드 | 처리 |
|---|---|
| candidate_name (상품명) | **유지** |
| candidate_manufacturer (제조사) | **유지** |
| candidate_unit (포장단위) | **← 모델명 FOML(candidate_spec) 이동** |
| candidate_spec | → NULL |
| candidate_category | → NULL (O4O 미사용) |
| identifier_type/value/normalized (UDIDI) | → NULL (유통 식별자 아님 — import dedup 전용, 재import HOLD 로 매칭 대상 없음) |
| raw_payload | → `{sourceKind}` 최소 (28.3MB 규제 블롭 제거) |

### master (regulatory_type='MEDICAL_DEVICE', 3,826)
| 필드 | 처리 |
|---|---|
| name / manufacturer_name / specification / barcode | **유지** (유통 정보) |
| regulatory_type / mfds_product_id | **유지** (identity·routing 키) |
| origin_country (제조국) | **← 허가번호 '제'(제조) 접두어면 '대한민국', 그 외 비움** |
| mfds_permit_number | → NULL |
| medical_device_grade | → NULL |

---

## 2. 트랜잭션 dry-run (실 프로덕션 BEGIN…ROLLBACK, 미영속)

| 항목 | before | after |
|---|---|---|
| candidate identifier / category / spec | 19,996 / 19,996 / 19,996 | **0 / 0 / 0** |
| candidate 포장단위(unit) | 0 | **19,996** (모델명 이동) |
| candidate 상품명 / 제조사 (유지) | — | 19,996 / 19,990 |
| candidate raw_payload | 28.3 MB (avg 1,483B) | `{"sourceKind":"medical_device_standard_code"}` (~96% 감소) |
| master permit / grade | 3,826 / 3,826 | **0 / 0** |
| master 제조국 대한민국 / 비움 | 0 / 3,826 | **1,450 / 2,376** |

허가 접두어 분포(제조국 파생 근거): 제 14,438 / 수 5,388 / 체 170 (candidate) · 제 1,450 / 그 외 2,376 (master).
슬림 후 candidate 샘플: `손 부목 | 벨퓨메디트레이드 유한회사 | VP0910-LL` (상품명 | 제조사 | 포장단위).
ROLLBACK 후 원상 복원 확인.

> 제조사 19,990(6건 결측)은 원천 MANUFACTURER_MISSING — "없으면 비워둔다"에 따라 그대로.

---

## 3. 안전성 / 복구

- **상품(행) 삭제 0.** 유통 필드(상품명·제조사·포장단위·제조국)는 보존, 규제 필드만 제거.
- raw_payload 규제 블롭은 DB 에서만 제거 — **원본 raw 는 G: 드라이브에 보존**(`full-fetch/.../raw.jsonl`, repo 밖). 필요 시 재import 로 복원 가능 → DB 스냅샷 불필요.
- down() 은 복구 불가(규제정보 제거는 의도된 결과). 복원=G: 원본.

---

## 4. 범위 / 후속

- **이번 범위 = 의료기기만.** 타 트랙(의약품·의약외품·건기식) 슬림은 별도 판단.
- import mapper 슬림화(향후 import 가 이 구조만 담도록)는 **보류** — 의료기기 재import 가 HOLD 라 즉효 없음 + 오늘 커밋한 streaming/import 서비스·테스트 churn 회피. 실제 재import 스코프 시 함께 정렬.
- 실제 적용: main 배포 → CI/CD 자동 migration. 적용 후 §2 after 수치로 검증.
