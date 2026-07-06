# CHECK-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-DRYRUN-V1

Status: DRY-RUN DONE — write 0. apply는 승인 대기
Date: 2026-07-06
Scope: `WO-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-V1` §5 Step 1 dry-run. DRUG master 177,413에 ProductDrugExtension 생성 시 wouldCreate 수·drug_category 분포·identifier mirror 커버리지/ambiguity를 read-only로 실측한다.

Related:

- `docs/work-orders/WO-O4O-DRUG-PRODUCT-DRUG-EXTENSION-CREATION-V1.md`
- `docs/checks/CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1.md`

---

## 1. 결과 (2026-07-06 · read-only)

### DR-1 wouldCreate

| 항목 | 값 |
| --- | --- |
| DRUG master | 177,413 |
| **wouldCreate** (extension 미보유) | **177,413** |
| already_has | 0 |

→ 전건 신규 create. 기존 extension 0.

### DR-2 drug_category 분포 (NOT NULL 요건)

| drug_category | n |
| --- | --- |
| rx | 119,548 |
| otc | 57,572 |
| drug_unspecified | 293 |
| **NULL** | **0** |

→ `drug_category`(Extension NOT NULL) mirror 전건 충족. 차단 없음. (잔여 unspecified 293 포함 — 정책 보수값이라 안전.)

### DR-3 identifier mirror 커버리지 / ambiguity

| 항목 | 값 | 판단 |
| --- | --- | --- |
| missing KOREA_DRUG_CODE | **0** | 정상 (primary mirror 100%) |
| missing MFDS_CODE | **0** | 정상 |
| missing KOREA_INSURANCE_CODE | 112,721 (63%) | 정상 — 부분 코드, mirror null |
| missing ATC_CODE | 451 (0.25%) | 정상 — mirror null |
| **dup KOREA_DRUG_CODE** | **0** | ambiguity 없음 |
| **dup MFDS_CODE** | **0** | ambiguity 없음 |
| **dup KOREA_INSURANCE_CODE** | **0** | ambiguity 없음 |
| **dup ATC_CODE** | **0** | ambiguity 없음 |

→ **어떤 master도 동일 타입 identifier를 2개 이상 갖지 않음.** 코드 mirror 값이 결정적(deterministic). mirror 로직이 애매해지는 케이스 0.

### DR-4 기타 mirror 소스

| 항목 | 값 |
| --- | --- |
| manufacturer_name 결측 | 0 |
| mfds_synced_at 보유(→ source_updated_at) | 177,413 (100%) |

---

## 2. 판단

- **차단 이상(anomaly) 0.** wouldCreate 177,413 전건 생성 가능.
- `drug_category` NOT NULL 요건 충족(NULL 0).
- 코드 mirror **결정적**(dup 0). KOREA_DRUG_CODE/MFDS_CODE 100%, insurance/ATC 부분은 null 허용 필드라 무해.
- manufacturer/source_updated_at mirror 소스 100% 가용.
- 정책값은 전건 보수 기본(WO §3): pharmacy_only=true / customer_display_allowed=false / online_sale_allowed=false / advertising_review_status=needs_review / public_display_policy=blocked / tablet_display_allowed=limited.

**결론: apply 준비 완료.** 승인 + 백업 후 177,413건 create 진행 가능. (rx/otc 정책 차등은 1차에서 두지 않고 전건 보수값 통일 권장 — 완화는 후속 판단.)

---

## 3. read-only 준수

| 항목 | 결과 |
| --- | --- |
| DB write / migration | **0** (전부 SELECT) |
| extension 생성 | 0 (승인 대기) |
