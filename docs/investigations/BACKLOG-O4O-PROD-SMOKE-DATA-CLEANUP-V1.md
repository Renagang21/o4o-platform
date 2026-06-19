# BACKLOG-O4O-PROD-SMOKE-DATA-CLEANUP-V1

> **유형:** 운영 정리 backlog — 배포 검증(smoke) 중 프로덕션에 생성된 테스트 데이터 정리.
> **상태:** OPEN — Cloud Console SQL Editor 실행 대기.
> **작성일:** 2026-06-19

## 1. 대상

| 항목 | 값 |
|------|------|
| email | `smoke-regprofile-1781833640@example.com` |
| userId | `086f898f-4177-474c-91f5-c867472a76c3` |
| org code | `neture-supplier-086f898f` |
| 생성물 | neture `service_memberships`(pending) + `neture_suppliers`(PENDING) + `organizations`(supplier) |
| 출처 | WO-O4O-NETURE-SUPPLIER-REGISTRATION-PROFILE-CREATION-V1 가입-시점-생성 라이브 smoke (가입 경로는 read-only 검증 불가라 1건 생성) |

## 2. 영향

- `/operator/suppliers` count 가 실제보다 **+1**(현재 6, 정상은 5). 기능 영향 없음(PENDING — 노출/거래 게이트됨).
- 이후 공급자 수 기반 검증 시 "smoke 1건 포함" 감안 필요.

## 3. 정리 방식 (확정)

**Cloud Console SQL Editor (o4o_platform) 에서 명시적 트랜잭션 삭제만 허용.**

```sql
BEGIN;
-- 삭제 전 대상 확인
SELECT id, email, status FROM users WHERE id='086f898f-4177-474c-91f5-c867472a76c3';
SELECT id, user_id, status, "contactEmail" FROM neture_suppliers WHERE user_id='086f898f-4177-474c-91f5-c867472a76c3';
SELECT id, code, name FROM organizations WHERE code='neture-supplier-086f898f';
-- 삭제 (순서: neture_suppliers → organizations → service_memberships → role_assignments)
DELETE FROM neture_suppliers    WHERE user_id='086f898f-4177-474c-91f5-c867472a76c3';
DELETE FROM organizations       WHERE code='neture-supplier-086f898f';
DELETE FROM service_memberships WHERE user_id='086f898f-4177-474c-91f5-c867472a76c3' AND service_key='neture';
DELETE FROM role_assignments    WHERE user_id='086f898f-4177-474c-91f5-c867472a76c3' AND role LIKE 'neture:%';
COMMIT;
-- 검증
SELECT count(*) FROM neture_suppliers;  -- 6→5 기대
```
- `users` row 는 공통 Identity — 삭제 금지(필요 시 비활성만, 본 정리 필수 아님).

## 4. 금지 사항 (실측 근거)

- ❌ **admin hard-delete API** (`DELETE /operator/members/:id?mode=hard`) — `neture_suppliers`/`organizations` 미삭제 → orphan 잔존(count 6 유지). 검증됨.
- ❌ **`gcloud sql connect` 비대화식 재시도** — 본 환경에서 IP allowlist 후 psql 연결 단계 **hang(150s timeout, exit 124)** 실측. DELETE 전 SELECT 단계라 데이터 변경 없었음. 재시도 금지.
- ❌ 브라우저 운영자 화면 거절/탈퇴 — supplier row 미삭제(orphan).

## 5. 진행 메모

- 비대화식 시도 시 데이터 변경 **0**(읽기 단계 timeout). 불확실 상태 없음.
- 사용자가 Cloud Console SQL Editor 실행 가능해지면 §3 으로 처리 후 본 backlog CLOSE.

---

*Date: 2026-06-19 · OPEN · smoke supplier 086f898f 잔존(/operator/suppliers +1) · Cloud Console SQL Editor 트랜잭션 삭제만 허용 · admin API/gcloud sql connect 재시도 금지.*
