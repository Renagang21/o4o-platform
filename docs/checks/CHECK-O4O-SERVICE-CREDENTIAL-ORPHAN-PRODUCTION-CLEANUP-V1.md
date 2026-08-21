# CHECK — Orphan service_credentials Production Cleanup V1

- **WO**: `WO-O4O-SERVICE-CREDENTIAL-ORPHAN-PRODUCTION-CLEANUP-V1`
- **선행 WO**: `WO-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1` (판정 B · 코드 수정 `6ce7c84bb`)
- **선행 CHECK**: [CHECK-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1.md](CHECK-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1.md)
- **실행일**: 2026-08-21
- **대상 DB**: production `o4o_platform` (Cloud SQL `o4o-platform-db`, Auth Proxy 경유)
- **상태**: **DONE** — orphan `service_credentials` 28행 DELETE 완료 · `NO_MEMBERSHIP = 0`
- **기록 규칙**: 본 문서에는 건수 / `user_id` / `service_key` / status / timestamp / affected count 만 기록한다.
  평문 비밀번호 · password hash · reset token · session cookie · access/refresh token 은 기록하지 않는다.

---

## 1. 실행 전 전제 재확인 (§13 / §14)

| 항목 | 결과 |
|---|---|
| lifecycle fix 가 현재 main 에 존재 | ✅ `6ce7c84bb` — `MembershipApprovalService.deleteMember(hard)` STEP H1b (같은 serviceKey credential 폐기) |
| fix 프로덕션 배포 | ✅ workflow `Deploy API Server (Cloud Run)` @ `6ce7c84bb` success → revision `o4o-core-api-03423-rxk` (traffic 100%) |
| fix 배포 이후 신규 orphan | ✅ 0건 (orphan 최신 `created_at` = 2026-08-06 01:30, 배포 = 2026-08-21) |
| 최근 credential 생성 활동 | 2026-08-06 이후 생성 22행 · 모두 membership 보유 (orphan 아님) |
| CI Pipeline 실패 | frontend `date-fns` 모듈 해석 실패 등 **선행 커밋에서도 동일 실패** — 본 트랙 무관 (별도 부채) |

> 과거 숫자(28)를 신뢰하지 않고 실행 직전 production 에서 다시 census 했다.

## 2. 실행 직전 census (§5)

| 지표 | 값 |
|---|---:|
| TOTAL_CREDENTIALS | 58 |
| NO_MEMBERSHIP (pair 기준: 같은 `user_id`+`service_key` membership 없음) | 28 |
| NO_MEMBERSHIP (user 기준: membership 전무) | 28 |
| membership 보유 credential | 30 |
| DUPLICATE (user_id, service_key) | 0 |
| UNKNOWN_SERVICE_KEY | 0 |

pair 기준 28 = user 기준 28 → "다른 서비스 membership 은 있는데 해당 서비스만 없는" 행은 **0건**.

### 2-1. orphan 28행 서비스 분포

| service_key | 건수 |
|---|---:|
| pharmacy-hub | 7 |
| kpa-society | 7 |
| glycopharm | 6 |
| neture | 6 |
| k-cosmetics | 2 |

### 2-2. orphan 28행 개별 상태

전 행 공통: `users.status = 'deleted'` · `users."isActive" = false` · membership 수 = 0.

| user_id | service_key | credential created_at (UTC) |
|---|---|---|
| 8eefe5a4-9346-45b5-94df-8516dddd4f80 | glycopharm | 2026-05-23 03:22 |
| f0ba48fa-8ada-41d4-ba5b-f64f4c50f51f | glycopharm | 2026-05-23 03:49 |
| c12c1f59-1708-4346-a341-2657e0f45e6e | glycopharm | 2026-05-23 05:54 |
| c94fab79-2dbe-4fb9-8f7a-a1e22e24b995 | glycopharm | 2026-05-28 05:17 |
| 044d2328-6a4a-490d-8c8e-3815cbb03c68 | glycopharm | 2026-05-28 12:05 |
| 4a3902c5-7f2f-4e63-9891-921c952041a8 | glycopharm | 2026-05-28 12:15 |
| 982a5c4a-df4d-4eed-9648-d0df03a5393d | k-cosmetics | 2026-05-27 03:14 |
| 5196c1f8-23e1-40ea-a9cb-40762951ce73 | k-cosmetics | 2026-06-11 05:05 |
| 8eefe5a4-9346-45b5-94df-8516dddd4f80 | kpa-society | 2026-05-23 03:22 |
| f0ba48fa-8ada-41d4-ba5b-f64f4c50f51f | kpa-society | 2026-05-23 03:49 |
| c12c1f59-1708-4346-a341-2657e0f45e6e | kpa-society | 2026-05-23 05:54 |
| ffd921b4-fddf-4684-a82e-01e3f6fb9753 | kpa-society | 2026-05-23 06:32 |
| 68ec1071-f88d-4f5d-afd3-f01770133acd | kpa-society | 2026-05-23 06:39 |
| 15ab2939-2d01-4aab-9767-46dc848fe54d | kpa-society | 2026-05-23 08:39 |
| 34bd2682-3c19-40c5-ae31-37159ffaf30b | kpa-society | 2026-05-24 00:45 |
| 52a4c1e6-6fba-4a41-a020-a47637e8ca3a | neture | 2026-05-24 06:08 |
| d5284f7c-52a4-489e-aa6b-cd251349865b | neture | 2026-05-28 04:53 |
| 5196c1f8-23e1-40ea-a9cb-40762951ce73 | neture | 2026-06-11 05:02 |
| 6ab2e8a0-e14e-46e0-bc5a-cac008c3a2b7 | neture | 2026-06-11 11:09 |
| 20e1ebc2-ef8b-47e7-be28-d6a1a4effeb3 | neture | 2026-06-18 05:08 |
| 086f898f-4177-474c-91f5-c867472a76c3 | neture | 2026-06-19 01:48 |
| 52a4c1e6-6fba-4a41-a020-a47637e8ca3a | pharmacy-hub | 2026-07-30 11:27 |
| 5ee37566-2a51-4929-8b3d-ccc58ce9e014 | pharmacy-hub | 2026-07-31 03:34 |
| 0d028c2e-d2f9-4bbe-bf54-eaa99162e611 | pharmacy-hub | 2026-07-31 03:34 |
| 2b06dc6b-f7c8-48c6-9584-fc880dbc1ca4 | pharmacy-hub | 2026-08-05 07:12 |
| 71b0ad60-986d-448b-9acc-004af4087a5f | pharmacy-hub | 2026-08-06 01:28 |
| 88a71161-000b-41a8-b778-4ce7ffc88b6e | pharmacy-hub | 2026-08-06 01:29 |
| cdb7b2c9-4c2b-424b-9203-2c52d3e2f7bf | pharmacy-hub | 2026-08-06 01:30 |

## 3. SAFE_DELETE 재검증 (§6)

| 조건 | 결과 |
|---|---|
| 같은 `(user_id, service_key)` membership 부재 | 28/28 ✅ |
| unknown service_key 아님 | 28/28 ✅ (전부 canonical 5키) |
| duplicate 아님 | 28/28 ✅ (중복 pair 0) |
| 새 membership 이 방금 생성된 계정 아님 | 28/28 ✅ (membership 수 0 · 최근 생성 membership 20건은 전부 다른 user) |
| 직전 감사의 REVIEW/KEEP 대상 아님 | ✅ (KEEP 0 / REVIEW 0) |
| 직전 감사 안전 조건(`users.status='deleted'` · membership 전무) 유지 | 28/28 ✅ |

집합 동일성: 직전 감사 28행 = 이번 census 28행 (증감 0 · §8 "동일 → 진행").

## 4. DELETE 실행 (§7 / §9 / §10)

단일 transaction 안에서 조건을 **다시 평가**하고 삭제했다 (TOCTOU 방지).
`(user_id, service_key)` 대응 조건을 유지했으며 `service_key` 단독 · `user_id` 단독 조건은 사용하지 않았다.

```sql
BEGIN;
-- PRE snapshot: total / orphan / with_membership

DELETE FROM service_credentials c
WHERE NOT EXISTS (SELECT 1 FROM service_memberships m
                  WHERE m.user_id = c.user_id AND m.service_key = c.service_key)
  AND NOT EXISTS (SELECT 1 FROM service_memberships m2 WHERE m2.user_id = c.user_id)
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id AND u.status = 'deleted')
RETURNING user_id, service_key;

-- COMMIT 전 검증(불일치 시 RAISE EXCEPTION → 자동 ROLLBACK)
--   deleted = PRE orphan · 삭제행 중 membership 생성분 = 0
--   잔여 NO_MEMBERSHIP = 0 · membership 보유 credential 수 transaction 전후 동일
COMMIT;
```

| transaction 내 검증 | 기대 | 실측 |
|---|---:|---:|
| PRE total / orphan / with_membership | — | 58 / 28 / 30 |
| DELETE affected | 28 | **28** ✅ |
| 삭제 대상 중 membership 이 생긴 행 | 0 | **0** ✅ |
| 잔여 NO_MEMBERSHIP credential | 0 | **0** ✅ |
| membership 보유 credential 수 (전 → 후) | 30 → 30 | **30 → 30** ✅ |

`COMMIT` 완료. ROLLBACK 없음.

## 5. Post-cleanup census (§11)

| 지표 | 실행 전 | 실행 후 |
|---|---:|---:|
| TOTAL_CREDENTIALS | 58 | **30** |
| NO_MEMBERSHIP | 28 | **0** |
| membership 보유 credential | 30 | **30** |
| DUPLICATE (user_id, service_key) | 0 | **0** |
| UNKNOWN_SERVICE_KEY | 0 | **0** |

### 5-1. 실행 후 service 별 분포

| service_key | credential | 그중 membership `active` |
|---|---:|---:|
| pharmacy-hub | 9 | 8 |
| neture | 7 | 7 |
| k-cosmetics | 5 | 5 |
| kpa-society | 5 | 5 |
| glycopharm | 4 | 4 |

(pharmacy-hub 1행은 membership 이 존재하되 상태가 `active` 가 아닌 정상 케이스 — 삭제 대상 아님.)

## 6. 로그인 회귀 (§12)

정상 active membership 보유 대표 계정으로 5개 서비스 login smoke (프로덕션 `api.neture.co.kr`). 비밀번호는 env 인라인 주입으로만 사용했고 어디에도 기록하지 않는다.

| serviceKey | 계정 | 결과 |
|---|---|---|
| kpa-society | 운영자 계정 | 200 SUCCESS |
| kpa-society | 약국 경영자 계정 | 200 SUCCESS |
| glycopharm | 운영자 계정 | 200 SUCCESS |
| k-cosmetics | 운영자 계정 | 200 SUCCESS |
| neture | 운영자 계정 | 200 SUCCESS |
| pharmacy-hub | 운영자 계정 | 200 SUCCESS |
| pharmacy-hub | 매장 계정 | 200 SUCCESS |

신규 `INVALID_CREDENTIALS` 0건. 삭제 대상 계정(`users.status='deleted'`)은 로그인 대상이 아니므로 시도하지 않았다.

## 7. 코드 변경 (§16)

- **코드 변경 0건.** cleanup 은 임시 SQL 로 1회 실행했고 repo 에 스크립트를 남기지 않았다.
- 재발 방지는 `6ce7c84bb` 의 lifecycle fix 가 담당한다 (hard delete 시 같은 serviceKey credential 폐기).
- 반복 운영 필요성은 현재 없음 — 신규 orphan 발생 경로가 코드에서 닫혔고, 다음 점검은 정기 census(아래 §8)로 충분하다.

## 8. 잔여 부채 / 후속 제안

1. `service_credentials` orphan 정기 census (분기 1회 권장) — 신규 write-path 추가 시 회귀 감지용.
2. `users.status='deleted'` 인 사용자에 대한 잔여 side-table 정리는 별도 범위(본 WO 승인 범위 밖).
3. CI Pipeline frontend `date-fns` 타입 실패 — 본 트랙 무관 선행 부채, 별도 WO 필요.

---

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(CI frontend type-check 부채)
