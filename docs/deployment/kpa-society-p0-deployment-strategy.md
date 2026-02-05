# P0 긴급 배포 전략 가이드

## WO-KPA-SOCIETY-AUTH-REFINE-PHASE1-V1 (P0 Only)

**작성일**: 2026-02-05
**대상**: kpa-society.co.kr 승인 로직 + 서비스별 데이터 분리
**목표**: 치명적 보안 이슈 해결 (최소 리스크 배포)

---

## 1. 배포 개요

### 1.1. 배포 대상

**P0-T1: 승인 로직 정상화**
- 회원가입 즉시 ACTIVE 우회 제거
- PENDING 상태 유지 → 운영자 승인 필수

**P0-T2: 서비스별 데이터 분리**
- User 테이블에 serviceKey 추가
- kpa-society 데이터 격리

**P0-T3: 기존 데이터 안정화**
- 기존 사용자 데이터 점검
- 필요 시 백필

### 1.2. 배포 우선순위

```
높음: P0-T1 (승인 로직) - 보안 치명적
높음: P0-T2 (데이터 분리) - 운영 치명적
중간: P0-T3 (데이터 점검) - 안정성
```

---

## 2. 리스크 분석

### 2.1. P0-T1 (승인 로직) 리스크

| 리스크 | 영향도 | 발생 가능성 | 대응 |
|--------|--------|-------------|------|
| 기존 PENDING 사용자 로그인 불가 | 높음 | 높음 | 배포 전 상태 전환 |
| 신규 가입 후 대기 시간 증가 | 중간 | 확실 | 운영자 알림 강화 |
| 테스트 계정 영향 | 낮음 | 중간 | 사전 승인 처리 |

### 2.2. P0-T2 (데이터 분리) 리스크

| 리스크 | 영향도 | 발생 가능성 | 대응 |
|--------|--------|-------------|------|
| 기존 사용자 serviceKey NULL | 높음 | 확실 | 마이그레이션 스크립트 |
| 조회 쿼리 성능 저하 | 낮음 | 낮음 | 인덱스 추가 |
| 크로스 서비스 로그인 차단 | 중간 | 낮음 | 의도된 동작 |

---

## 3. 배포 전 준비

### 3.1. 데이터베이스 백업

```bash
# 프로덕션 DB 백업
gcloud sql backups create \
  --instance=o4o-platform-db \
  --description="Pre-P0-deployment-20260205"
```

### 3.2. 기존 사용자 상태 확인

```sql
-- 현재 사용자 상태 분포 확인
SELECT status, COUNT(*)
FROM users
GROUP BY status;

-- PENDING 상태 사용자 확인 (승인 필요)
SELECT id, email, name, created_at
FROM users
WHERE status = 'PENDING'
ORDER BY created_at DESC;
```

### 3.3. 테스트 계정 사전 승인

```sql
-- 테스트 계정을 ACTIVE로 전환
UPDATE users
SET
  status = 'ACTIVE',
  approved_at = NOW(),
  approved_by = 'system-pre-deployment'
WHERE email IN (
  'district-admin@kpa-test.kr',
  'branch-admin@kpa-test.kr',
  'pharmacist@kpa-test.kr'
);
```

---

## 4. 배포 순서 (Step-by-Step)

### Step 1: 데이터베이스 마이그레이션 (P0-T2)

**목적**: serviceKey 컬럼 추가 + 기존 데이터 백필

```sql
-- 1. serviceKey 컬럼 추가 (nullable로 먼저)
ALTER TABLE users
ADD COLUMN service_key VARCHAR(100) NULL;

-- 2. 인덱스 추가 (성능 보장)
CREATE INDEX idx_users_service_key ON users(service_key);

-- 3. 기존 kpa-society 사용자 백필
-- (이메일 도메인 또는 수동 판단 기준)
UPDATE users
SET service_key = 'kpa-society'
WHERE email LIKE '%@kpa-%'
   OR id IN (
     -- 수동으로 확인된 kpa-society 사용자 ID
     'user-id-1', 'user-id-2'
   );

-- 4. NULL 체크 (백필 누락 확인)
SELECT id, email, name, service_key
FROM users
WHERE service_key IS NULL;

-- 5. 마이그레이션 완료 후 NOT NULL 제약 추가 (선택)
-- ALTER TABLE users
-- ALTER COLUMN service_key SET NOT NULL;
```

**검증**:
```sql
-- serviceKey 분포 확인
SELECT service_key, COUNT(*)
FROM users
GROUP BY service_key;
```

---

### Step 2: 애플리케이션 코드 배포 (P0-T1 + P0-T2)

**배포 대상 파일**:
- `apps/api-server/src/modules/auth/controllers/auth.controller.ts`
- `apps/api-server/src/modules/auth/entities/User.ts`
- `services/web-kpa-society/src/contexts/AuthContext.tsx`

**배포 방법**:
```bash
# feature 브랜치 생성
git checkout -b feature/kpa-auth-p0-fix

# 코드 수정 (P0-T1, P0-T2)
# ...

# 커밋
git add .
git commit -m "fix(kpa): normalize approval logic and add service isolation

P0-T1: Remove immediate ACTIVE status on registration
P0-T2: Add serviceKey column for data isolation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# main에 머지
git checkout main
git merge feature/kpa-auth-p0-fix
git push origin main
```

**자동 배포**:
- GitHub Actions가 자동으로 Cloud Run에 배포
- 배포 완료까지 약 5-10분

---

### Step 3: 배포 후 검증

#### 3.1. 신규 가입 테스트

```bash
# 신규 가입 시도
curl -X POST https://api.neture.co.kr/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-pending@example.com",
    "password": "Test1234!@#$",
    "passwordConfirm": "Test1234!@#$",
    "name": "테스트",
    "tos": true,
    "service": "kpa-society"
  }'

# 예상 결과: 201 Created
# DB 확인: status = 'PENDING', service_key = 'kpa-society'
```

#### 3.2. 승인 전 로그인 차단 확인

```bash
# PENDING 사용자로 로그인 시도
curl -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-pending@example.com",
    "password": "Test1234!@#$"
  }'

# 예상 결과: 403 Forbidden (ACCOUNT_NOT_ACTIVE)
```

#### 3.3. 서비스별 데이터 분리 확인

```sql
-- kpa-society 외 serviceKey로 로그인 불가 확인
SELECT * FROM users
WHERE email = 'test-pending@example.com';

-- service_key가 'kpa-society'인지 확인
```

---

## 5. 롤백 계획

### 5.1. 애플리케이션 롤백

**트리거 조건**:
- 기존 사용자 대량 로그인 실패
- 신규 가입 실패율 급증
- 운영자 승인 프로세스 장애

**롤백 방법**:
```bash
# 이전 커밋으로 롤백
git revert <commit-hash>
git push origin main

# 또는 Cloud Run 이전 리비전으로 롤백
gcloud run services update-traffic o4o-core-api \
  --to-revisions=<previous-revision>=100 \
  --region=asia-northeast3
```

### 5.2. 데이터베이스 롤백

**주의**: DB 롤백은 최후의 수단

```sql
-- serviceKey 컬럼 제거 (필요 시)
ALTER TABLE users DROP COLUMN service_key;

-- 백업에서 복구 (극단적 케이스)
-- gcloud sql backups restore ...
```

---

## 6. 모니터링 체크리스트

배포 후 24시간 동안 모니터링:

### 6.1. 즉시 확인 (배포 후 10분)

- [ ] 신규 가입 성공률 (PENDING 상태 확인)
- [ ] 기존 사용자 로그인 성공률
- [ ] API 서버 에러 로그 확인
- [ ] 데이터베이스 연결 정상

### 6.2. 1시간 후 확인

- [ ] 운영자 승인 프로세스 정상 작동
- [ ] 승인된 사용자 로그인 정상
- [ ] serviceKey 필터링 정상 작동

### 6.3. 24시간 후 확인

- [ ] 가입 → 승인 → 로그인 전체 흐름 정상
- [ ] 크로스 서비스 데이터 격리 확인
- [ ] 성능 저하 없음

---

## 7. 운영자 안내사항

### 7.1. 승인 프로세스 변경 안내

**배포 후 운영자에게 공지**:

```
[중요] 회원 승인 프로세스 변경 안내

배포 일시: 2026-02-05
변경 사항: 신규 가입 시 즉시 활성화 → 운영자 승인 필수

1. 신규 가입자는 PENDING 상태로 생성됩니다
2. 운영자가 수동으로 승인해야 로그인 가능합니다
3. 승인 방법: [관리자 대시보드] → [회원 관리] → [승인 대기]

문의: [담당자 연락처]
```

### 7.2. 긴급 승인 방법

**SQL로 즉시 승인** (긴급 시):

```sql
-- 특정 사용자 즉시 승인
UPDATE users
SET
  status = 'ACTIVE',
  approved_at = NOW(),
  approved_by = 'admin-manual'
WHERE email = 'urgent-user@example.com';
```

---

## 8. 성공 기준

### 8.1. 기술적 성공

- [ ] 신규 가입자 status = 'PENDING'
- [ ] 승인 전 로그인 차단
- [ ] serviceKey 기반 데이터 격리
- [ ] 기존 사용자 로그인 정상
- [ ] API 에러율 5% 미만 유지

### 8.2. 운영적 성공

- [ ] 운영자 승인 프로세스 정상 작동
- [ ] 사용자 문의 급증 없음
- [ ] 가입 → 승인 평균 시간 < 24시간

---

## 9. 다음 단계

P0 배포 완료 후:

1. **P1 배포 계획** (lastName/firstName, nickname, 역할 DB 저장)
2. **P2 설계** (역할 변경 요청, 약사/약대생 세분화)

---

## 부록: 체크리스트 요약

### 배포 전
- [ ] DB 백업 완료
- [ ] 기존 사용자 상태 확인
- [ ] 테스트 계정 사전 승인
- [ ] 롤백 계획 숙지

### 배포 중
- [ ] Step 1: DB 마이그레이션 (serviceKey)
- [ ] Step 2: 애플리케이션 배포 (코드 수정)
- [ ] Step 3: 즉시 검증 (신규 가입, 로그인)

### 배포 후
- [ ] 10분: 즉시 검증 완료
- [ ] 1시간: 승인 프로세스 확인
- [ ] 24시간: 전체 흐름 모니터링
- [ ] 운영자 공지 완료

---

**작성자**: Claude Sonnet 4.5
**최종 검토**: 2026-02-05
**다음 문서**: P1 배포 전략 가이드 (TBD)
