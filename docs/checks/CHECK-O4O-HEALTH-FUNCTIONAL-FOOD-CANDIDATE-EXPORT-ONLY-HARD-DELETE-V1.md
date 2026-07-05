# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-EXPORT-ONLY-HARD-DELETE-V1

> 성격: 건강기능식품 ProductCandidate **확실군(전량수출용) 프로덕션 hard delete 실행**. 사용자 직접 지시(작업요청서 생략).
> 작성일: 2026-07-05 · 트랙: 건강기능식품 전용
> 선행: `CHECK-...-CANDIDATE-SAMPLE-MARKET-TEST-...-V2`(전량삭제 부적절 → 확실군 우선 정리 권장)

> ⚠️ **프로덕션 데이터 삭제 기록.** 복구 경로 명시(§6).

---

## 1. 결론 — 전량수출용 HFF candidate **2,835건 hard delete 완료**(오탐 0 검증 + 전량 snapshot).

- 사용자 지시: "확실군 우선 정리 — 작업요청서 없이 식약처 open 데이터 조사해 모두 삭제".
- **확실군 = 전량수출용**(국내 O4O 유통 대상 아님). MFDS 제품명(PRDUCT) 표기 기반 = 식약처 open 데이터 신호.
- predicate 오탐 0 검증: 30 무작위 샘플 + 13 무괄호 변형 전부 진짜 수출전용, 함정(수출명 병기/수출겸용/단독(수출)) 제외.
- 원자적 트랜잭션(스냅샷+삭제 카운트 assertion `=2835`, 불일치 시 자동 rollback) 실행 → snapshot 2,835 = delete 2,835.
- **HFF candidate 44,885 → 42,050**. 전체 candidate 398,115 → 395,280.
- **복구 가능**: 전체 row jsonb 를 `product_candidate_cleanup_audits` 에 보존.

**한 줄 결론:** 표본조사(과반 실판매 → 전량삭제 부적절)에 따라, 오탐 위험이 없는 **확실군(전량수출용) 2,835건만** 선별해 전량 snapshot 후 hard delete 했다. 국내 미유통 제품이므로 O4O 후보풀에서 제거해도 안전하며, 필요 시 snapshot 으로 전량 복구 가능하다.

---

## 2. 실행 환경

- 프로덕션 `o4o_platform` / Cloud SQL Auth Proxy v2(127.0.0.1:5434, 방화벽 무변경).
- 실행 계정: DB `postgres`(env). 방식: psql `-f`(UTF-8 파일), 단일 원자적 트랜잭션(DO 블록 + assertion).
- read-only 검증 → snapshot → hard delete 순.

---

## 3. 대상 판별 (확실군 predicate)

```sql
deleted_at IS NULL
AND candidate_status = 'pending'
AND source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'
AND ( candidate_name ILIKE '%수출용%'  OR candidate_name ILIKE '%수출전용%'
   OR candidate_name ILIKE '%수출 전용%' OR candidate_name ILIKE '%전량수출%'
   OR candidate_name ILIKE '%전량 수출%' )
AND NOT ( candidate_name ILIKE '%수출명%' OR candidate_name ILIKE '%수출겸용%' )
```

- 포함: "(전량수출용)", "(수출전용)", "(수출용)", "홍콩/멕시코/태국 수출용", "- 전량수출용", "[전량수출용]" 등.
- **제외(오탐 방지)**: `수출명:...`(국내판매+수출명 병기), `수출겸용`(국내+수출), 단독 `(수출)`(모호). → 국내 유통 가능분 보존.
- 보수적 잔류 1건: "소야바이오진(수출명:...)(전량수출용)"(실제 수출전용이나 함정 제외로 잔류 — 무해, 후속 정리).

---

## 4. 오탐 검증 (삭제 전 read-only)

| 검증 | 결과 |
|---|---|
| 무작위 30 샘플 | 전부 진짜 전량수출용(오탐 0) |
| 무괄호 '수출용' 변형 13건 | 전부 "…전량수출용"(오탐 0) |
| 함정(수출명/수출겸용) predicate 포함 | 1건 → **제외 처리** |
| `수출용기` 등 비수출 오탐 | 없음 |

---

## 5. 실행 결과

| 항목 | 값 |
|---|---:|
| snapshot 건수 | **2,835** |
| delete 건수 | **2,835** (assertion 일치) |
| 삭제 전 HFF candidate(pending, not-deleted) | 44,885 |
| **삭제 후 HFF candidate** | **42,050** |
| 삭제 전 전체 candidate | 398,115 |
| 삭제 후 전체 candidate | 395,280 |
| FK 안전(설명 draft 참조) | 0 (사전 assertion) |
| ProductMaster | 무변경(HFF 0 유지) |

---

## 6. 복구 경로

- 스냅샷 테이블: `product_candidate_cleanup_audits`
  - `cleanup_key = 'hff_export_only_hard_delete_20260705'`
  - 컬럼: `candidate_id, source_label, candidate_name, candidate_manufacturer, full_snapshot(jsonb 전체 row), action='hard_delete', created_at`
  - 건수: 2,835
- **복구**: `full_snapshot` 을 `product_candidates` 로 재삽입(INSERT ... SELECT jsonb_populate_record). id 포함 원본 보존이라 완전 복원 가능.

---

## 7. 후속 실행 — 균주(strain) 그룹 A hard delete (2026-07-05)

전량수출용 삭제 후 잔여 42,050 을 제품명 정규식으로 read-only 4버킷 분류(A 균주학명 699 / B 원료형태 97 / C 광의성분어 1,660 / D 보존 39,594). 각 버킷 샘플 검증:
- **A(균주 학명) 699**: 전부 순수 배양 균주 원료(락토바실러스/비피도박테리움/… + strain code), 소비자 SKU 아님, 오탐 0 → **삭제**.
- B(원료형태) 97: 대부분 추출/농축 분말 원료이나 제형/브랜드 접미사(캅셀/로얄) 경계 소수 → **보류**(정제필터 후).
- C(광의성분어) 1,660: 소비자 제품 혼입(고려은단 비타민C 스틱, 징코플러스, 홍삼농축액 계열) → **review 유지, 자동삭제 금지**.

**A 실행(사용자 승인, snapshot+원자적 assertion=699)**:

| 항목 | 값 |
|---|---:|
| cleanup_key | `hff_strain_hard_delete_20260705` |
| snapshot / delete | 699 / 699 |
| HFF candidate | 42,050 → **41,351** |
| 복구 | 동 audit 테이블(full_snapshot jsonb) |

> gotcha: 1차 실행 시 프록시 OAuth 토큰 만료로 연결 끊김 → DO 블록 **전체 롤백**(strain_snap 0, HFF 42,050 불변 확인) → 새 토큰 재기동 후 재실행 성공. 원자성으로 부분삭제 없음.

## 8. 범위 밖 / 남은 후속

- **B 원료형태(97)**: 제형/브랜드 마커 제외 정제 후 삭제 검토.
- **C review(1,660)**: 소비자 혼입 → 자동삭제 금지, 개별 검토/규칙 보강.
- dead-permit(폐업/취소/취하): 현재 데이터에 원천 없음 → 별도 MFDS 원천 수집 후.
- `keep_candidate`(표본 50.8%): listable 플래그+배지 노출(별도 write WO).
- 잔여 HFF 41,351 은 표본 기준 다수가 실판매 후보 → 전량삭제 금지 유지.

---

## 부록. 필수 기록

| 항목 | 값 |
|---|---|
| 대상 | product_candidates HFF 전량수출용 |
| predicate | §3 (오탐 0 검증) |
| snapshot / delete | 2,835 / 2,835 (원자적, assertion) |
| HFF 44,885 → 42,050 · 전체 398,115 → 395,280 | ✅ |
| 복구 | `product_candidate_cleanup_audits` cleanup_key=hff_export_only_hard_delete_20260705 |
| ProductMaster / 설명 draft | 무변경 / 0 |
| 커밋 | 하단 |

**최종:** 확실군(전량수출용) 2,835건을 오탐 0 검증 + 전량 snapshot 후 hard delete. HFF candidate 44,885→42,050. 복구 가능. 원료/균주·dead-permit·keep 노출은 별도 후속.
