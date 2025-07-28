# Database Setup Guide - 서버 작업 안내서

이 문서는 O4O Platform의 데이터베이스 설정 및 마이그레이션을 위한 서버 작업 가이드입니다.

## 📋 개요

O4O Platform은 PostgreSQL을 메인 데이터베이스로 사용합니다. 로컬 개발 환경에서는 데이터베이스 연결이 필요하지 않은 작업들이 있지만, 실제 서버 환경에서는 반드시 PostgreSQL 설정이 필요합니다.

## 🔧 PostgreSQL 호환성 수정 사항

### 1. 데이터 타입 변경
- **문제**: MySQL의 `datetime` 타입은 PostgreSQL에서 지원하지 않음
- **해결**: 모든 `datetime` → `timestamp`로 변경 완료

#### 수정된 엔티티:
```typescript
// MediaFile.ts
@Column({ type: 'timestamp', nullable: true })  // datetime → timestamp
lastAccessed!: Date

// Page.ts  
@Column({ type: 'timestamp', nullable: true })  // datetime → timestamp
publishedAt!: Date

@Column({ type: 'timestamp', nullable: true })  // datetime → timestamp
scheduledAt!: Date
```

## 🚀 서버 데이터베이스 설정

### API 서버 (43.202.242.215)

#### 1. PostgreSQL 상태 확인
```bash
# PostgreSQL 서비스 상태
sudo systemctl status postgresql

# PostgreSQL 버전 확인
psql --version

# 데이터베이스 접속 테스트
sudo -u postgres psql
```

#### 2. 데이터베이스 생성 (최초 1회)
```bash
# postgres 사용자로 전환
sudo -u postgres psql

# 데이터베이스 생성
CREATE DATABASE o4o_platform;

# 사용자 생성 (비밀번호는 .env에 설정된 값 사용)
CREATE USER o4o_user WITH ENCRYPTED PASSWORD 'your_secure_password';

# 권한 부여
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;

# 확장 기능 활성화
\c o4o_platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# 종료
\q
```

#### 3. 환경 변수 설정
```bash
# .env.production 파일 확인/수정
cd /home/ubuntu/o4o-platform/apps/api-server
nano .env.production

# 필수 환경 변수
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=your_secure_password
DB_NAME=o4o_platform
NODE_ENV=production
```

#### 4. 마이그레이션 실행
```bash
cd /home/ubuntu/o4o-platform/apps/api-server

# 의존성 설치 (package.json 변경 시)
npm install

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 상태 확인
npm run migration:show
```

#### 5. PM2 재시작
```bash
# 환경 변수 반영을 위한 재시작
pm2 restart api-server

# 로그 확인
pm2 logs api-server --lines 50
```

## 🔍 문제 해결

### 1. 마이그레이션 실패 시

#### TypeORM 데이터 타입 오류
```
DataTypeNotSupportedError: Data type "datetime" in "MediaFile.lastAccessed" is not supported by "postgres" database.
```
**해결**: 해당 엔티티의 `datetime` → `timestamp` 변경

#### 연결 오류
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**해결**: 
- PostgreSQL 서비스 실행 확인: `sudo systemctl start postgresql`
- 방화벽 설정 확인: `sudo ufw status`
- pg_hba.conf 설정 확인

### 2. 권한 문제
```
permission denied for database o4o_platform
```
**해결**:
```bash
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;
GRANT ALL ON SCHEMA public TO o4o_user;
```

### 3. 인코딩 문제
```bash
# 데이터베이스 인코딩 확인
sudo -u postgres psql -c "SELECT datname, encoding FROM pg_database WHERE datname = 'o4o_platform';"

# UTF8로 재생성 필요 시
DROP DATABASE o4o_platform;
CREATE DATABASE o4o_platform WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';
```

## 📊 데이터베이스 백업

### 자동 백업 스크립트 설정
```bash
# 백업 스크립트 생성
sudo nano /home/ubuntu/backup_o4o_db.sh

#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/postgres"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U o4o_user -h localhost o4o_platform | gzip > $BACKUP_DIR/o4o_platform_$DATE.sql.gz

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# 실행 권한 부여
sudo chmod +x /home/ubuntu/backup_o4o_db.sh

# Cron 설정 (매일 새벽 3시)
crontab -e
0 3 * * * /home/ubuntu/backup_o4o_db.sh
```

## 🔐 보안 설정

### 1. PostgreSQL 보안 설정
```bash
# pg_hba.conf 편집
sudo nano /etc/postgresql/14/main/pg_hba.conf

# 로컬 연결만 허용
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# 설정 반영
sudo systemctl restart postgresql
```

### 2. 환경 변수 보안
```bash
# .env 파일 권한 설정
chmod 600 .env.production

# 소유자만 읽기/쓰기 가능
chown ubuntu:ubuntu .env.production
```

## 📈 모니터링

### 데이터베이스 상태 확인
```bash
# 연결 수 확인
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'o4o_platform';"

# 테이블 크기 확인
sudo -u postgres psql -d o4o_platform -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# 슬로우 쿼리 확인
sudo -u postgres psql -d o4o_platform -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

## 🚨 긴급 대응

### 데이터베이스 복구
```bash
# 최신 백업에서 복구
gunzip -c /home/ubuntu/backups/postgres/o4o_platform_YYYYMMDD_HHMMSS.sql.gz | psql -U o4o_user -h localhost o4o_platform
```

### 연결 풀 리셋
```bash
# 모든 연결 종료
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'o4o_platform' AND pid <> pg_backend_pid();"

# PM2 재시작
pm2 restart api-server
```

## 📝 체크리스트

서버 데이터베이스 설정 시 확인 사항:

- [ ] PostgreSQL 14+ 설치 및 실행 중
- [ ] o4o_platform 데이터베이스 생성
- [ ] o4o_user 사용자 생성 및 권한 부여
- [ ] .env.production 파일 설정 완료
- [ ] 모든 datetime → timestamp 변경 확인
- [ ] 마이그레이션 성공적으로 실행
- [ ] PM2 프로세스 정상 작동
- [ ] 백업 스크립트 설정
- [ ] 모니터링 설정 완료

## 📞 문제 발생 시

1. PM2 로그 확인: `pm2 logs api-server`
2. PostgreSQL 로그 확인: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`
3. 시스템 로그 확인: `sudo journalctl -u postgresql -f`

---

**마지막 업데이트**: 2025-07-27
**작성자**: Claude Code
**문서 버전**: 1.0