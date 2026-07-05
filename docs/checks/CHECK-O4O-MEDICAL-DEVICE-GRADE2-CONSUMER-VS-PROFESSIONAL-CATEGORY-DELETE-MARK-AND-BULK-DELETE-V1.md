# CHECK-O4O-MEDICAL-DEVICE-GRADE2-CONSUMER-VS-PROFESSIONAL-CATEGORY-DELETE-MARK-AND-BULK-DELETE-V1

> WO: `WO-O4O-MEDICAL-DEVICE-GRADE2-CONSUMER-VS-PROFESSIONAL-CATEGORY-DELETE-MARK-AND-BULK-DELETE-V1`
> 상태: **완료 — 사용자 승인 + CI/CD 배포 migration 으로 프로덕션 실삭제·검증 완료 (2026-07-05)**

---

## 0. 실행 환경 / 메타

| 항목 | 값 |
|---|---|
| 실행 환경 | 프로덕션 `o4o_platform` (Cloud SQL `o4o-platform-db`) |
| 검증 채널 | Cloud SQL Auth Proxy v2 (localhost:5433, read/verify only) |
| dry-run 일시 | 2026-07-05 (KST) |
| 실제 삭제 방식 | main 배포 → CI/CD 자동 migration (Deploy API Server, run 28738004521 success) |
| 실행 커밋 | `0ed42819e` |
| 실제 삭제 일시 | 2026-07-05 (KST) · 배포 성공 후 프록시 read-only 검증 |
| 상세설명서 생성 | 0건 |

선행 완료: 4등급(755), 3등급(1,664) hard delete. 현재 의료기기 17,183 (등급1 4,632 / 2 12,533 / 3 18).

---

## 1. 적용 migration

| migration | 역할 |
|---|---|
| `20261208000000-MarkMedicalDeviceGrade2ByCategory` | 2등급 카테고리 정확일치 → product_data_status 3분류 (DML) |
| `20261208010000-DeleteMedicalDeviceGrade2DeleteMarked` | delete_marked snapshot → hard delete (DML) |

락: 두 migration 모두 DML(ROW EXCLUSIVE) — 동시 읽기/쓰기 무영향. 컬럼/인덱스/audit 는 grade-4 WO
에서 생성됨. 삭제 캐스케이드는 `idx_pc_matched_identifier_id` 로 가속(실측 12,125건 삭제 22s).

---

## 2. 분류 방법

2등급 의료기기 `name`(=`regulatory_name`) = 식약처 품목분류명, **159개 distinct 카테고리**로 수렴
(12,533 master). 카테고리 **정확일치**로 전수 판정(키워드 부분매칭 금지). 소비자/약국 취급 가능
카테고리 = `active`, 애매 = `review_required`, 나머지 전문/기관용 = `delete_marked`.

reason 값:
- `medical_device_grade2_professional_category_delete_marked`
- `medical_device_grade2_consumer_category_active`
- `medical_device_grade2_ambiguous_category_review_required`

**발견:** 2등급은 소비자 제품 소수, 전문/기관용(치과기공재료·전기수술기전극·카테터·내시경·
검사시약·영상장비·멸균기)이 압도적 → 삭제표시 96.74%. 소비자 계열은 전량 active 보존.

---

## 3. Preflight (삭제 전 · 실측)

| 항목 | 값 |
|---|---:|
| 전체 ProductMaster | 248,026 |
| 의료기기 ProductMaster | 17,183 |
| 2등급 의료기기 | 12,533 |
| 2등급 distinct 카테고리 | 159 |

---

## 4. 카테고리 전수 판정표

### 4.1 active — 유지 (21 카테고리 / 122) — 소비자·약국·개인용

| 카테고리 | 수 |
|---|---:|
| 기도형 보청기 | 55 |
| 점착성 투명 창상피복재 | 13 |
| 국소 폼제 창상피복재 | 9 |
| 일회용 채혈침 | 8 |
| 의료용 산소 발생기 | 5 |
| 개인용 온열기 | 5 |
| 피부 적외선 체온계 | 4 |
| 생리식염수 창상피복재 | 3 |
| 자동 전자 혈압계 / 의치 부착재 / 개인용 전위 발생기 / 전동식 모유 착유기 / 저주파 자극기 / 개인용 저주파 자극기 / 개인용임신내분비물질검사지 | 각 2 |
| 질 세정기 / 전자 체온계 / 전동식 코 세정기 / 알칼리 이온수 생성기 / 매일착용 하드 콘택트렌즈 / 개인용단백질·지질검사지 | 각 1 |

### 4.2 review_required — 조사대상 (27 카테고리 / 286) — 삭제 안 함

| 카테고리 | 수 |
|---|---:|
| 멸균 주사침 | 99 |
| 의약품 직접 주입 기구 | 99 |
| 멸균침 | 36 |
| 채혈세트 | 11 |
| 유아 가온장치 | 6 |
| 전동식 정형용 운동장치 | 4 |
| 국소 지혈용 드레싱 / 안압계 / 분사식 주사기 / 카트리지형 주사기 | 각 3 |
| 일회용 범용 수동식 의료용 핀셋 / 수동식 의약품 주입 펌프 | 각 2 |
| 지각 과민 처치제 / 청력 검사기 / 호흡 보조기 / 수면 평가장치 / 양압 지속유지기(CPAP) / 의료용 이온 도입기 / 의료용 자기 발생기 / 의료용 전자기 발생기 / 레이저 진료기 / 전동식 의약품 주입 펌프 / 전동식 의료용 세정기 / 수동식 의약품 혼합용 기구 / 수동식 심폐소생술 보조기구 / 사지압박 순환장치 / 2등급 의료용 조합 자극기 | 각 1 |

사유: 병원·가정 겸용 또는 소비자 판매 흔적 조사 필요.

### 4.3 delete_marked — 삭제 (111 카테고리 / 12,125) — 전문/기관용

주요(count 상위):

| 카테고리 | 수 |
|---|---:|
| 절삭 가공용 치과도재 | 4,980 |
| 치과용 임플란트 상부구조물 | 2,822 |
| 일회용 발조절식 전기 수술기용 전극 | 1,888 |
| 경피 카테터 | 728 |
| 카테터 삽입기 | 680 |
| 장관 카테터 안내선 | 159 |
| 금속도재 시스템용 치과도재 | 135 |
| 임시 레진계 치관 | 63 |
| 재사용가능 발조절식 전기 수술기용 전극 | 52 |
| 일반용 치과도재 | 35 |
| 일회용 천자침 / 일회용 안과용 겸자 | 각 31 |
| 일회용 내시경 투관침 | 30 |
| 수액세트 | 29 |
| 비디오 연성 방광경 | 28 |
| 혈중임신·출산호르몬및단백질검사시약 | 23 |
| 일회용 안과용 가위 | 21 |
| 범용 주입-배액용 튜브카테터 / 갑상선기능호르몬검사시약 | 각 20 |
| 공기 압축식 치과용 핸드피스 | 19 |
| 풍선 확장기 / 전동식 의료용 핸드피스 / 일회용 수술용 스태플용 기구 | 각 18 |
| 생체 검사용 도구 / 치과 교정장치용 레진 | 각 17 |
| (그 외 88 카테고리, 각 1~13) | 합계 잔여 |

성격군: 치과기공 재료/핸드피스/치과 엑스선·CT, 전기수술기 전극, 카테터·튜브·안내선,
내시경(방광경/대장경/복강경/소장경/십이지장경 등), 수술기구(겸자/가위/봉합기/스태플/생검침/
천자침/천공기), 검사시약(호르몬·면역·화학·염색 IVD), 영상장비(초음파/엑스선/유방촬영/CT),
멸균기(고압증기/EtO), 환자감시장치, 근전도계 등. **소비자·약국 제품 없음(111 전수 확인).**

전체 판정: `delete_marked` 12,125 + `review_required` 286 + `active` 122 = 12,533 (reconcile ✓).

---

## 5. 삭제표시 검증 (WO §9.3)

트랜잭션 dry-run marking 후 2등급 status 분포:

| status | count | 검증 |
|---|---:|---|
| delete_marked | 12,125 | 소비자/약국 카테고리 미포함(전수 확인) |
| review_required | 286 | 삭제 제외 |
| active | 122 | 삭제 제외 (보청기·체온계·혈압계·창상피복재·채혈침·콘택트렌즈·검사지 등) |
| 합계 | 12,533 | 2등급 전체와 일치 |

전 카테고리(159) 전수 판정으로 100건 샘플 기준 상회. 소비자 후보 보존 확인.

---

## 6. Count Report (트랜잭션 dry-run · 실 프로덕션 BEGIN…ROLLBACK, 미영속)

| 항목 | 값 |
|---|---:|
| 삭제 전 전체 ProductMaster | 248,026 |
| 삭제 전 의료기기 ProductMaster | 17,183 |
| 삭제 전 2등급 의료기기 ProductMaster | 12,533 |
| 2등급 distinct 카테고리 수 | 159 |
| 2등급 중 삭제표시 수 | 12,125 |
| 2등급 중 조사대상 수 | 286 |
| 2등급 중 유지 수 | 122 |
| 실제 삭제 수 | 12,125 |
| 삭제 후 2등급 의료기기 ProductMaster | 408 |
| 삭제 후 의료기기 ProductMaster | 5,058 |
| 삭제 후 전체 ProductMaster | 235,901 |
| 2등급 중 삭제 비율 | 12,125 / 12,533 = **96.74%** |
| 의료기기 전체 중 삭제 비율 | 12,125 / 17,183 = **70.56%** |

타이밍: marking UPDATE 12,533 / 3.3s, snapshot 12,125 / 2.4s, hard delete 12,125 / 22.0s.
ROLLBACK 후 2등급 12,533 복원 확인(미영속).

---

## 7. CI/CD 실제 실행 후 확정 기록 (프로덕션 검증 완료)

배포(run 28738004521, success) 후 Cloud SQL Auth Proxy read-only 실측:

| 항목 | dry-run 예측 | **실제(CI/CD 후)** |
|---|---:|---:|
| 삭제 감사 로그 hard_delete 수 | 12,125 | **12,125** ✅ |
| 삭제 후 2등급 delete_marked 잔존 | 0 | **0** ✅ |
| 삭제 후 2등급 의료기기 | 408 | **408** ✅ |
| 삭제 후 의료기기 | 5,058 | **5,058** ✅ |
| 삭제 후 전체 | 235,901 | **235,901** ✅ |
| review_required 잔존 | 286 | **286** ✅ |
| active 잔존 | 122 | **122** ✅ |

예측과 실측 100% 일치. 두 migration(typeorm_migrations 등록) 적용 확인.
확인 SQL: `cleanup_key='medical_device_grade2_category_based_hard_delete_20260705'`.

---

## 8. Acceptance Criteria 대응

| 기준 | 상태 |
|---|---|
| 2등급 전체 count | ✅ 12,533 |
| distinct 카테고리 전수 판정표 | ✅ 159 (§4) |
| 삭제표시/조사대상/유지 count | ✅ 12,125 / 286 / 122 |
| 삭제표시 샘플 100건 검증 | ✅ 전 카테고리(159) 전수 판정 |
| 소비자 제품 delete 미혼입 | ✅ 111 delete 카테고리 전수 확인 |
| review_required 삭제 제외 | ✅ 조건 status='delete_marked' 한정 |
| hard delete 전 snapshot | ✅ dry-run 12,125 |
| 삭제 수·비율 기록 | ✅ §6 |
| 상세설명서 0건 | ✅ |
| 운영 DB 적용 후 count 확정 | ✅ §7 (실측 = 예측 일치) |

---

## 9. 실패/보류 사유

- 없음. 마킹·삭제·검증 전 항목 완료(실제 삭제 12,125, 2등급 delete_marked 잔존 0).
- WO 후속(§13): 2등급 review_required(286) 소비자 흔적 조사 → 1등급 정리 판단 → 건기식/의약외품.
