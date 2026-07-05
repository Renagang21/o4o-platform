# CHECK-O4O-MEDICAL-DEVICE-GRADE3-NAME-BASED-DELETE-MARK-AND-BULK-DELETE-V1

> WO: `WO-O4O-MEDICAL-DEVICE-GRADE3-NAME-BASED-DELETE-MARK-AND-BULK-DELETE-V1`
> 상태: **완료 — 사용자 승인 + CI/CD 배포 migration 으로 프로덕션 실삭제·검증 완료 (2026-07-05)**

---

## 0. 실행 환경 / 메타

| 항목 | 값 |
|---|---|
| 실행 환경 | 프로덕션 `o4o_platform` (Cloud SQL `o4o-platform-db`, `netureyoutube:asia-northeast3`) |
| 검증 채널 | Cloud SQL Auth Proxy v2 (localhost:5433, read/verify only) |
| dry-run 일시 | 2026-07-05 (KST) |
| 실제 삭제 방식 | main 배포 → CI/CD 자동 migration (Deploy API Server, run 28735708237 success) |
| 실행 커밋 | `25adaa901` |
| 실제 삭제 일시 | 2026-07-05 (KST) · 배포 성공 후 프록시 read-only 검증 |
| 상세설명서 생성 | **0건** (WO 범위 외) |

선행 조건 충족: 4등급 hard delete 완료(의료기기 18,847), `medical_device_grade` /
`product_data_status` 컬럼 · `product_master_cleanup_audits` 테이블 존재.

---

## 1. 적용 migration

| migration | 역할 |
|---|---|
| `20261207000000-MarkMedicalDeviceGrade3ByCategory` | 3등급 카테고리 정확일치 → product_data_status 3분류 표시 (DML) |
| `20261207010000-DeleteMedicalDeviceGrade3DeleteMarked` | delete_marked snapshot → hard delete (DML) |

**락:** 두 migration 모두 DML(UPDATE/DELETE, ROW EXCLUSIVE) — 동시 읽기/쓰기 무영향.
컬럼/인덱스/audit 는 grade-4 WO 에서 이미 생성됨(신규 DDL 없음). 삭제 캐스케이드는 기존
`idx_pc_matched_identifier_id` 로 가속(실측 1,664건 삭제 7.9s).

---

## 2. 분류 방법 (키워드 부분매칭 → 카테고리 정확일치)

3등급 의료기기의 `name`(=`regulatory_name`)은 식약처 **품목분류명(카테고리)**이며,
grade-3 은 **33개 distinct 카테고리**로 수렴(1,682 master). WO §6 은 키워드 예시를 제시하나,
카테고리가 소수로 수렴하므로 **키워드 ILIKE 부분매칭 대신 카테고리명 정확일치**로 분류하여
오탐(소비자 제품 오삭제)을 원천 차단했다. 미분류(신규 카테고리 유입)는 안전측 `review_required`.

### 2.1 blacklist — delete_marked (26 카테고리 / 1,664)

| 카테고리 | 수 |
|---|---:|
| 치과용 임플란트 고정체 | 760 |
| 추간체 고정재 | 558 |
| 치과 교정용 고정장치 | 123 |
| 골절 합용 판 | 79 |
| 추간체 유합 보형재 | 56 |
| 인공 신장기용 혈액 여과기 | 36 |
| 연조직 고정용 장치 | 12 |
| 고위험성감염체유전자검사시약 | 10 |
| 치과용 임플란트 시스템 | 8 |
| 심혈관및중추신경계치료약물농도감시검사시약 | 3 |
| 안과용 엔디야그 레이저 수술기 | 2 |
| 비흡수성 봉합사 의료용 봉합기 | 2 |
| 집속형 초음파 자극 시스템 | 2 |
| 골 시멘트 / 범용 전기 수술기 / 인공 측두 하악골 관절 / 혈액 관류장치 / 의료용 열 소작기 / 치과용 전기 수술기 / 초음파 수술기 / 자동화 시스템 로봇 수술기 / 비흡수성 이식용 클립 / 엔디야그 레이저 수술기 / 탄산가스 레이저 수술기 / 동반진단용면역검사시약 / HIV·HBV·HCV·HTLV혈청형·아형검사시약 | 각 1 (13종) |

성격: 치과 임플란트/교정, 척추·정형 이식·고정, 수술기(레이저/전기/초음파/로봇), 이식·보형,
투석 여과기, 검사실 진단시약(IVD) — 명백한 기관/전문가용.

### 2.2 whitelist — active 유지 (3 카테고리 / 5)

| 카테고리 | 수 | 근거 |
|---|---:|---|
| 개인용혈당측정기 | 3 | 소비자·약국 (WO 혈당 whitelist) |
| 개인용 체내 연속혈당 측정 시스템 | 1 | 개인용 CGM |
| 연속착용 하드 콘택트렌즈 | 1 | 소비자·안경원 취급 |

### 2.3 review_required — 조사대상 (4 카테고리 / 13)

| 카테고리 | 수 | 사유 |
|---|---:|---|
| 정형 용품 | 6 | 일반명·성격 불명확 |
| 저출력 심장 충격기 | 3 | AED 인접(준공공/기관) |
| 펄스 광선 조사기 | 2 | 미용/피부 가능 |
| 3등급 의료용 조합 자극기 | 2 | 물리치료/소비자 가능 |

---

## 3. Preflight (삭제 전 · 실측)

| 항목 | 값 |
|---|---:|
| 전체 ProductMaster | 249,690 |
| 의료기기 ProductMaster | 18,847 |
| 의료기기 등급 분포 | 1등급 4,632 / 2등급 12,533 / **3등급 1,682** |
| 3등급 distinct 카테고리 | 33 |

---

## 4. 삭제표시 검증 (WO §8.2)

트랜잭션 dry-run 에서 marking 후 3등급 status 분포:

| status | count | 검증 |
|---|---:|---|
| delete_marked | 1,664 | 소비자/개인용 계열 미포함 확인 |
| review_required | 13 | 삭제 제외 |
| active | 5 | 삭제 제외 (혈당·CGM·콘택트렌즈) |
| UNCLASSIFIED | 0 | 전 카테고리 분류 완료 |

**샘플 검증:** 33개 카테고리 전수 분류(부분 샘플이 아닌 전량 카테고리 판정)이므로
delete_marked 100건 샘플 기준을 상회. 혈당·CGM·콘택트렌즈 등 소비자 제품이 delete_marked 에
섞이지 않음을 카테고리 단위로 확정.

---

## 5. Count Report (트랜잭션 dry-run · 실 프로덕션 BEGIN…ROLLBACK, 미영속)

| 항목 | 값 |
|---|---:|
| 삭제 전 전체 ProductMaster | 249,690 |
| 삭제 전 의료기기 ProductMaster | 18,847 |
| 삭제 전 3등급 의료기기 ProductMaster | 1,682 |
| 3등급 중 삭제표시 수 | 1,664 |
| 3등급 중 조사대상 수 | 13 |
| 3등급 중 유지 수 | 5 |
| 실제 삭제 수 | 1,664 |
| 삭제 후 3등급 의료기기 ProductMaster | 18 |
| 삭제 후 의료기기 ProductMaster | 17,183 |
| 삭제 후 전체 ProductMaster | 248,026 |
| 3등급 중 삭제 비율 | 1,664 / 1,682 = **98.93%** |
| 의료기기 전체 중 삭제 비율 | 1,664 / 18,847 = **8.83%** |

타이밍: marking UPDATE 1,682 / 0.95s, snapshot 1,664 / 0.39s, hard delete 1,664 / 7.9s.
ROLLBACK 후 3등급 1,682 복원 확인(미영속).

---

## 6. CI/CD 실제 실행 후 확정 기록 (프로덕션 검증 완료)

배포(run 28735708237, success) 후 Cloud SQL Auth Proxy read-only 실측:

| 항목 | dry-run 예측 | **실제(CI/CD 후)** |
|---|---:|---:|
| 삭제 감사 로그 hard_delete 수 | 1,664 | **1,664** ✅ |
| 삭제 후 3등급 delete_marked 잔존 | 0 | **0** ✅ |
| 삭제 후 3등급 의료기기 | 18 | **18** ✅ |
| 삭제 후 의료기기 | 17,183 | **17,183** ✅ |
| 삭제 후 전체 | 248,026 | **248,026** ✅ |
| review_required 잔존 | 13 | **13** ✅ |
| active 잔존 | 5 | **5** ✅ |

예측과 실측 100% 일치. 두 migration(typeorm_migrations 등록) 적용 확인.
확인 SQL: `cleanup_key='medical_device_grade3_name_based_hard_delete_20260705'`.

---

## 7. Acceptance Criteria 대응

| 기준 | 상태 |
|---|---|
| 3등급 전체 count 기록 | ✅ 1,682 |
| 삭제표시/조사대상/유지 count | ✅ 1,664 / 13 / 5 |
| 삭제표시 샘플 검증 | ✅ 전 카테고리(33) 전수 판정 |
| 소비자 제품 delete_marked 미혼입 | ✅ 카테고리 단위 확정 |
| review_required 삭제 제외 | ✅ 조건 `product_data_status='delete_marked'` 한정 |
| hard delete 전 snapshot | ✅ dry-run 1,664 |
| 삭제 수·비율 기록 | ✅ §5 |
| 상세설명서 생성 0건 | ✅ |
| 운영 DB 적용 후 count 확정 | ✅ §6 (실측 = 예측 일치) |

---

## 8. 실패/보류 사유

- 없음. 마킹·삭제·검증 전 항목 완료(실제 삭제 1,664, 3등급 delete_marked 잔존 0).
- WO 후속(§12): review_required 3등급(13) 쿠팡/네이버 조사 → 2등급 정리 → 건기식/의약외품 → 상세설명서.
