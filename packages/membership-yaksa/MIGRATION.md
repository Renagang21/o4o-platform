# Membership-Yaksa Migration Guide

## Migration 파일

**위치**: `apps/api-server/src/database/migrations/1733458800000-CreateMembershipYaksaTables.ts`

## 생성되는 테이블

1. **yaksa_member_categories** - 회원 분류
2. **yaksa_members** - 회원 정보
3. **yaksa_member_affiliations** - 조직 소속
4. **yaksa_membership_roles** - 역할 할당
5. **yaksa_membership_years** - 연회비 납부 이력
6. **yaksa_member_verifications** - 자격 검증

## Migration 실행 방법

### 로컬 개발 환경

```bash
# 1. API 서버 디렉토리로 이동
cd apps/api-server

# 2. Migration 실행
pnpm migration:run

# 3. Migration 상태 확인
pnpm migration:show
```

### SSH 접속 환경 (프로덕션)

```bash
# API 서버에 SSH 접속
ssh o4o-api

# 프로젝트 디렉토리로 이동
cd /home/ubuntu/o4o-platform/apps/api-server

# Migration 실행
NODE_ENV=production pnpm migration:run:prod
```

## 기본 데이터 (Seeding)

Migration 실행 시 자동으로 4개의 기본 회원 분류가 생성됩니다:

| 이름     | 설명                 | 연회비 필요 | 금액   |
|---------|---------------------|-----------|--------|
| 정회원   | 정규 면허 소지 및 활동 중인 약사 | ✓         | 50,000원 |
| 준회원   | 면허 소지 약사 (비활동)  | ✓         | 30,000원 |
| 휴업약사 | 휴업 중인 약사        | ✗         | -      |
| 명예회원 | 명예 회원            | ✗         | -      |

## 검증 방법

### 1. 테이블 생성 확인

```sql
-- PostgreSQL
\dt yaksa_*

-- 또는
SELECT tablename FROM pg_tables WHERE tablename LIKE 'yaksa_%';
```

### 2. 기본 데이터 확인

```sql
SELECT * FROM yaksa_member_categories ORDER BY "sortOrder";
```

예상 결과: 4개의 행이 반환되어야 함

### 3. API 테스트

```bash
# 회원 분류 조회
curl http://localhost:4000/api/membership/categories

# 회원 목록 조회 (빈 배열)
curl http://localhost:4000/api/membership/members
```

## Rollback 방법

Migration을 되돌리려면:

```bash
pnpm migration:revert
```

**주의**: 이미 데이터가 있는 경우 데이터 손실이 발생할 수 있습니다.

## 트러블슈팅

### 오류: "relation already exists"

이미 테이블이 존재하는 경우:

```bash
# Migration 상태 확인
pnpm migration:show

# 필요시 테이블 수동 삭제 (주의!)
psql o4o -c "DROP TABLE IF EXISTS yaksa_member_verifications CASCADE;"
# ... (다른 테이블들도 삭제)
```

### 오류: "uuid_generate_v4 function does not exist"

PostgreSQL에서 UUID 확장이 활성화되지 않은 경우:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 다음 단계

Migration 실행 후:

1. API 서버 재시작
2. API 엔드포인트 테스트
3. 프론트엔드 연동 준비

---

**작성일**: 2024-12-06
**버전**: 1.0.0
