# O4O Platform Reset Execution Plan V1

> **WO-O4O-PLATFORM-RESET-DRYRUN-SCRIPT-V1**
> 작성일: 2026-05-14
> 상태: DRY-RUN COMPLETE — 실제 실행 전 사용자 승인 필수

---

## 개요

이 문서는 O4O Platform 운영 데이터 전체 초기화(Reset) 절차를 정의한다.
채택 전략: **Option B — 선택적 TRUNCATE + bootstrap seed 재실행**

| 항목 | 내용 |
|------|------|
| 목표 | 운영 데이터 삭제, schema/migration 유지, bootstrap 계정 자동 복구 |
| 전제 | typeorm_migrations 절대 보존, bootstrap UUID 패턴으로 계정 식별 |
| 복구 | CI/CD main 배포 → BootstrapCanonicalSeedAccounts migration 자동 실행 |
| SQL | `scripts/reset/O4O-RESET-DRYRUN-V1.sql` |

---

## Reset 결정 기준

### READY ✅ (초기화 가능)
- Commerce: orders, payments, order_items, carts
- Auth: refresh_tokens, linking_sessions
- KPA: kpa_members (non-bootstrap), kpa_pharmacist_profiles, kpa_store_contents
- Neture: neture_orders, supplier_product_offers, product_masters, neture_suppliers, credit_balances
- GlycoPharm: glycopharm_members, glycopharm_products, glyco_pharmacy_products
- K-Cosmetics: cosmetics.* (별도 schema)
- LMS: lms_courses, lms_lessons, lms_enrollments, lms_lesson_progress
- Forum: forum_posts, forum_category_requests
- Signage: signage_playlists, signage_playlist_items, signage_schedules, signage_schedule_items, signage_displays
- Market Trial: market_trials, market_trial_participants
- Care: care_plans, care_records
- Partner: partner_contracts, partner_commissions
- RBAC: role_assignments (bootstrap 계정 제외)
- Membership: service_memberships (bootstrap 계정 제외)
- Users: users (bootstrap UUID 제외)

### PARTIAL ⚠️ (조건부 초기화)
- forum_categories: `is_system = true` 레코드 보존 권장
- content_hubs: 템플릿 역할 여부 운영 판단 필요
- guide_blocks / guide_pages: 시스템 콘텐츠 (원칙적 보존, custom만 삭제 가능)
- action_logs: 감사 로그 보존 정책 적용 여부 결정 필요
- ai_usage_logs: 분석 데이터 보존 필요성 판단

### BLOCKED ❌ (절대 삭제 금지)
- `typeorm_migrations` — migration 이력 SSOT, 삭제 시 재배포 불가
- Schema 구조 (DDL) — 테이블/컬럼 자체는 삭제 대상 아님
- GCS 파일 — 별도 처리 필요 (이 스크립트 범위 외)

---

## Bootstrap 계정 식별 기준

리셋 후 자동 복구되는 계정은 deterministic UUID로 식별된다:

| UUID 패턴 | 대상 |
|-----------|------|
| `b0000000-b000-4000-b000-00000000000*` | Bootstrap canonical 사용자 8명 |
| `a0000000-0a00-4000-a000-00000000000*` | KPA 기준 조직 레코드 |

리셋 SQL의 모든 DELETE에 아래 조건을 반드시 포함:
```sql
WHERE user_id NOT IN (
  SELECT id FROM users WHERE id LIKE 'b0000000-b000-4000-b000-%'
)
```

---

## 사전 준비 체크리스트

실제 리셋 실행 전 아래 항목 전부 확인:

- [ ] GCP Cloud SQL 백업 생성 및 확인
- [ ] migration history COUNT 기록 (SELECT COUNT(*) FROM typeorm_migrations)
- [ ] bootstrap 계정 8개 UUID 존재 확인
- [ ] 활성 사용자 세션 없음 확인 (또는 서비스 점검 공지)
- [ ] 유효한 네트워크 접근 방법 확보 (gcloud sql connect 또는 Admin API)
- [ ] dry-run SELECT COUNT(*) 전체 실행 및 결과 기록
- [ ] `WO-O4O-KPA-MEMBER-BACKFILL-V1` 완료 여부 확인 (권장 — 17개 orphan SM 정리)

---

## 7단계 실행 절차

### STEP 0: 환경 확인 및 접속

```bash
# API 서버 상태 확인
gcloud run services describe o4o-core-api --region asia-northeast3

# Cloud SQL 접속
gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform
```

### STEP 1: 백업 생성

```bash
# Cloud SQL 온디맨드 백업
gcloud sql backups create --instance=o4o-platform-db
```

백업 완료 확인:
```bash
gcloud sql backups list --instance=o4o-platform-db --limit=3
```

### STEP 2: 사전 검증 SELECT 실행

`scripts/reset/O4O-RESET-DRYRUN-V1.sql` STEP 0, STEP 2 블록의 SELECT를 실행한다.
모든 카운트 결과를 기록하고 보관한다.

주요 확인 포인트:
- typeorm_migrations 개수 (리셋 후 동일해야 함)
- bootstrap 계정 8개 UUID 존재
- neture_suppliers → supplier_product_offers RESTRICT 관계 영향 파악

### STEP 3: 트랜잭션 내 실행

`O4O-RESET-DRYRUN-V1.sql` STEP 3 블록의 주석을 순서대로 해제하여 실행한다.

**반드시 트랜잭션 내에서 실행:**
```sql
BEGIN;

-- GROUP 1~16 실행 (SQL 파일 참조)

-- 중간 검증
SELECT COUNT(*) FROM users;  -- bootstrap 8명만 남아야 함

COMMIT;  -- 또는 ROLLBACK
```

**실행 순서 (FK 안전 순서):**
1. Commerce leaf → orders → carts
2. Auth sessions (refresh_tokens, linking_sessions)
3. KPA domain leaves (profiles, store_contents, kpa_members)
4. Neture domain (offers 먼저 → masters → suppliers)
5. GlycoPharm domain
6. K-Cosmetics (cosmetics schema)
7. LMS (leaf → courses)
8. Forum
9. Signage (leaf → playlists)
10. Content / CMS
11. Market Trial
12. Care
13. Partner
14. RBAC & Membership (bootstrap 제외)
15. Users (bootstrap 제외, CASCADE 발생)

### STEP 4: 리셋 후 즉시 검증

`O4O-RESET-DRYRUN-V1.sql` STEP 4 SELECT 실행:

```sql
-- bootstrap 8계정 복구 상태
SELECT u.email, sm.service_key, ra.role
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra ON ra.user_id = u.id
WHERE u.id LIKE 'b0000000-b000-4000-b000-%';

-- 전체 user 수: 8명이어야 함
SELECT COUNT(*) FROM users;

-- migration 이력 무결성
SELECT COUNT(*) FROM typeorm_migrations;
```

### STEP 5: Bootstrap Seed 자동 복구 트리거

main 브랜치에 공백 커밋 또는 배포 트리거:
```bash
git commit --allow-empty -m "chore: trigger post-reset migration run"
git push origin main
```

CI/CD가 `BootstrapCanonicalSeedAccounts` migration을 자동 실행한다.
이미 실행된 경우 `typeorm_migrations`에서 스킵되므로 안전하다.

```bash
# 배포 완료 확인
gcloud run revisions list --service=o4o-core-api --region=asia-northeast3 --limit=3

# migration 로그 확인
gcloud logging read \
  'resource.type=cloud_run_revision AND textPayload=~"BootstrapCanonical"' \
  --project=o4o-platform \
  --limit=20
```

### STEP 6: 서비스 smoke test

아래 계정으로 로그인 테스트 수행 (`docs/local/TEST-ACCOUNTS.local.md` 참조):

| 계정 | 목적 |
|------|------|
| super-admin@o4o.com | /admin 접근 |
| kpa-admin@o4o.com | /admin/members 접근 |
| kpa-operator@o4o.com | /operator/members 접근 |
| phamacy1@o4o.com | KPA 포털 접근 |
| neture-operator@o4o.com | Neture 운영자 대시보드 |
| kcos-admin@o4o.com | K-Cosmetics 관리자 |

smoke test 체크리스트:
- [ ] 각 계정 로그인 성공
- [ ] JWT 토큰 발급 확인
- [ ] 역할별 대시보드 접근 가능
- [ ] `/health/detailed` 엔드포인트 정상 응답
- [ ] `/api/v1/auth/status` 역할 반환 확인

### STEP 7: 완료 보고

완료 후 아래 내용 기록:
- 리셋 전/후 테이블별 카운트 비교
- bootstrap 계정 복구 확인 결과
- smoke test 결과
- 후속 WO 목록 (아래 참조)

---

## 후속 WO 목록 (리셋 완료 후)

| WO | 우선순위 | 내용 |
|----|----------|------|
| WO-O4O-KPA-MEMBER-BACKFILL-V1 | P1 (리셋 전 완료 권장) | 기존 17개 service_memberships 중 kpa_members 누락 레코드 생성 |
| WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1 | P2 | service_memberships 기반 로그인 게이트 구현 |
| WO-O4O-KPA-LEGACY-APPROVAL-PATH-SYNC-V1 | P3 | PATCH /kpa/members/:id/status 경로 SM 동기화 |
| WO-O4O-GCS-ORPHAN-CLEANUP-V1 | P3 | 리셋 후 GCS 미디어 파일 고아 정리 |

---

## 롤백 전략

트랜잭션 내 실행 시 ROLLBACK으로 즉시 취소 가능.
COMMIT 후 문제 발생 시:

1. Cloud SQL 백업에서 특정 시점 복구 (PITR)
2. 백업 복구 후 migration 재실행

```bash
# 백업 목록
gcloud sql backups list --instance=o4o-platform-db

# 특정 백업으로 복구 (주의: 서비스 중단 필요)
# gcloud sql instances clone o4o-platform-db o4o-platform-db-restored \
#   --backup-id=BACKUP_ID
```

---

## FK 의존성 요약

```
users
├── role_assignments          (ON DELETE CASCADE)
├── refresh_tokens            (ON DELETE CASCADE)
├── linking_sessions          (ON DELETE CASCADE)
├── service_memberships       (FK, no cascade → 선행 삭제 필요)
├── kpa_members               (FK, no cascade → 선행 삭제 필요)
├── kpa_pharmacist_profiles   (FK, no cascade → 선행 삭제 필요)
└── neture_suppliers.user_id  (weak FK, no constraint → 선행 삭제 필요)

supplier_product_offers
└── product_masters (ON DELETE RESTRICT → offers 먼저 삭제 필수)

store_products
└── catalog_product_id (ON DELETE RESTRICT → store_products 먼저 삭제 필수)

orders
└── order_items (CASCADE)
└── payments    (FK)

lms_courses
└── lms_lessons (CASCADE)
   └── lms_enrollments     (CASCADE)
   └── lms_lesson_progress (CASCADE)

signage_playlists
└── signage_playlist_items (CASCADE)
signage_schedules
└── signage_schedule_items (CASCADE)
```

---

*문서 버전: V1*
*관련 스크립트: `scripts/reset/O4O-RESET-DRYRUN-V1.sql`*
*참조: `docs/local/TEST-ACCOUNTS.local.md`*
