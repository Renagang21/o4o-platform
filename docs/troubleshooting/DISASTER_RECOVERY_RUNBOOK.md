# O4O Platform 재해 복구 실행 계획 (Runbook)

## 🚨 비상 상황 대응 절차

### 1단계: 상황 평가 (5분)

#### 체크리스트
- [ ] 영향 범위 확인
  - [ ] API 서버 (api.neture.co.kr)
  - [ ] 관리자 대시보드 (admin.neture.co.kr)
  - [ ] 메인 사이트 (www.neture.co.kr)
  - [ ] 데이터베이스
- [ ] 장애 유형 파악
  - [ ] 서버 다운
  - [ ] 데이터베이스 손상
  - [ ] 네트워크 장애
  - [ ] 보안 침해
  - [ ] 데이터 손실

#### 즉시 실행 명령
```bash
# 시스템 상태 확인
ssh ubuntu@43.202.242.215 "pm2 status && systemctl status postgresql"
ssh ubuntu@13.125.144.8 "systemctl status nginx"

# 로그 확인
ssh ubuntu@43.202.242.215 "tail -f /home/ubuntu/o4o-platform/apps/api-server/logs/error.log"
```

### 2단계: 초기 대응 (10분)

#### 서비스별 복구 절차

##### API 서버 장애
```bash
# API 서버 접속
ssh ubuntu@43.202.242.215

# 서비스 재시작 시도
cd /home/ubuntu/o4o-platform/apps/api-server
pm2 restart api-server

# 재시작 실패 시
pm2 delete api-server
pnpm install
npm run build
pm2 start ecosystem.config.js

# 헬스체크
curl http://localhost:4000/api/health
```

##### 데이터베이스 장애
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 재시작 시도
sudo systemctl restart postgresql

# 로그 확인
sudo tail -f /var/log/postgresql/postgresql-*.log

# 연결 테스트
psql -U postgres -d o4o_platform -c "SELECT 1;"
```

##### 웹 서버 장애
```bash
# 웹 서버 접속
ssh ubuntu@13.125.144.8

# Nginx 재시작
sudo systemctl restart nginx

# 설정 검증
sudo nginx -t

# 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### 3단계: 백업에서 복구 (30분)

#### 최신 백업 확인
```bash
# API 서버에서
ls -la /backup/o4o-platform/
```

#### 전체 시스템 복구
```bash
# 1. 최신 백업 파일 확인
LATEST_BACKUP=$(ls -t /backup/o4o-platform/o4o_backup_*.tar.gz | head -1)

# 2. 복구 스크립트 실행
cd /home/ubuntu/o4o-platform
./scripts/restore.sh $LATEST_BACKUP

# 3. 서비스 확인
pm2 list
curl http://localhost:4000/api/health
```

#### 데이터베이스만 복구
```bash
# 백업에서 DB 파일 추출
cd /tmp
tar -xzf $LATEST_BACKUP
gunzip db/o4o_db_*.sql.gz

# DB 복구
psql -U postgres -c "CREATE DATABASE o4o_platform_restore;"
psql -U postgres -d o4o_platform_restore -f o4o_db_*.sql

# DB 교체
psql -U postgres << EOF
ALTER DATABASE o4o_platform RENAME TO o4o_platform_broken;
ALTER DATABASE o4o_platform_restore RENAME TO o4o_platform;
EOF
```

### 4단계: 서비스 검증 (15분)

#### 기능 테스트
```bash
# API 엔드포인트 테스트
curl -X GET https://api.neture.co.kr/api/health
curl -X GET https://api.neture.co.kr/api/v1/products
curl -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# 관리자 대시보드 접근
curl -I https://admin.neture.co.kr

# 메인 사이트 접근
curl -I https://www.neture.co.kr
```

#### 성능 확인
```bash
# 응답 시간 측정
for i in {1..10}; do
  curl -w "\nTotal time: %{time_total}s\n" -o /dev/null -s https://api.neture.co.kr/api/health
done
```

### 5단계: 모니터링 활성화 (10분)

```bash
# AutoRecovery 시스템 시작
curl -X POST http://localhost:4000/api/v1/auto-recovery/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 모니터링 대시보드 확인
open https://admin.neture.co.kr/monitoring

# 알림 설정 확인
./scripts/backup-monitoring.sh
```

## 📋 시나리오별 복구 절차

### 시나리오 1: 데이터베이스 손상

**증상**: 
- API 응답에서 database error
- 로그에 "could not connect to database" 메시지

**복구 절차**:
1. PostgreSQL 서비스 상태 확인
2. 데이터베이스 파일 시스템 확인
3. 백업에서 데이터베이스 복구
4. 트랜잭션 로그 적용 (가능한 경우)

### 시나리오 2: 랜섬웨어 공격

**증상**:
- 파일 암호화됨
- 랜섬 노트 발견

**복구 절차**:
1. 즉시 네트워크 격리
2. 깨끗한 백업 날짜 확인
3. 전체 시스템 재설치
4. 백업에서 전체 복구
5. 보안 패치 적용

### 시나리오 3: 하드웨어 장애

**증상**:
- 서버 접속 불가
- 물리적 하드웨어 경고

**복구 절차**:
1. 대체 서버 준비
2. OS 및 의존성 설치
3. 백업에서 전체 시스템 복구
4. DNS 변경 또는 로드밸런서 설정

### 시나리오 4: 배포 실패

**증상**:
- 최근 배포 후 서비스 장애
- 500 에러 다수 발생

**복구 절차**:
```bash
# 자동 롤백
cd /home/ubuntu/o4o-platform
git log --oneline -10
git checkout [이전_안정_커밋]

# 재빌드 및 배포
pnpm install
npm run build:packages
cd apps/api-server
npm run build
pm2 restart api-server
```

## 🔄 복구 후 조치

### 필수 확인 사항
1. **데이터 무결성**
   ```sql
   -- 주요 테이블 레코드 수 확인
   SELECT 
     (SELECT COUNT(*) FROM users) as users,
     (SELECT COUNT(*) FROM products) as products,
     (SELECT COUNT(*) FROM orders) as orders;
   ```

2. **보안 점검**
   ```bash
   # 비정상 로그인 시도 확인
   grep "Failed login" /var/log/auth.log | tail -50
   
   # 파일 변경 확인
   find /home/ubuntu/o4o-platform -type f -mtime -1
   ```

3. **성능 벤치마크**
   ```bash
   # API 부하 테스트
   ab -n 1000 -c 10 https://api.neture.co.kr/api/health
   ```

### 사후 분석 (Post-Mortem)

**문서화 항목**:
- 장애 발생 시각
- 영향 범위 및 지속 시간
- 근본 원인 (Root Cause)
- 대응 타임라인
- 개선 조치 사항

**템플릿**:
```markdown
## 장애 보고서

**날짜**: 2025-01-29
**장애 시간**: 14:00 - 15:30 (1시간 30분)
**영향**: API 서버 50% 성능 저하

### 타임라인
- 14:00 - 첫 알림 수신
- 14:05 - 원인 조사 시작
- 14:20 - 메모리 부족 확인
- 14:30 - 서비스 재시작
- 15:00 - 정상 복구
- 15:30 - 모니터링 확인

### 근본 원인
메모리 누수로 인한 OOM (Out of Memory)

### 조치 사항
1. 메모리 누수 패치 적용
2. 메모리 모니터링 임계값 조정
3. Auto-scaling 정책 개선
```

## 📞 비상 연락망

### 에스컬레이션 매트릭스

| 레벨 | 담당자 | 연락처 | 대응 시간 |
|------|--------|--------|----------|
| L1 | DevOps 엔지니어 | +82-10-XXXX-XXXX | 15분 |
| L2 | 개발팀 리드 | +82-10-XXXX-XXXX | 30분 |
| L3 | CTO | +82-10-XXXX-XXXX | 1시간 |
| L4 | CEO | +82-10-XXXX-XXXX | 2시간 |

### 외부 벤더 연락처

- **AWS Support**: [AWS Support Center](https://console.aws.amazon.com/support/)
- **데이터베이스 컨설턴트**: consultant@example.com
- **보안 전문가**: security@example.com

## 🛠️ 도구 및 리소스

### 필수 도구
- SSH 클라이언트
- PostgreSQL 클라이언트
- 텍스트 에디터 (vim/nano)
- 네트워크 진단 도구 (curl, netstat, tcpdump)

### 유용한 명령어 모음
```bash
# 프로세스 모니터링
htop
pm2 monit

# 네트워크 연결 확인
netstat -tuln
ss -tuln

# 디스크 사용량
df -h
du -sh /home/ubuntu/o4o-platform/*

# 로그 검색
grep -r "ERROR" /home/ubuntu/o4o-platform/apps/api-server/logs/
journalctl -u postgresql -n 100
```

## ⚡ 빠른 참조

### 서버 정보
```
API Server: 43.202.242.215
Web Server: 13.125.144.8
DB Port: 5432
API Port: 4000
```

### 중요 경로
```
앱 경로: /home/ubuntu/o4o-platform
백업 경로: /backup/o4o-platform
로그 경로: /home/ubuntu/o4o-platform/apps/api-server/logs
Nginx 설정: /etc/nginx/sites-available/
```

### 환경 변수
```
DB_NAME=o4o_platform
DB_USER=postgres
DB_HOST=localhost
```

---

**최종 업데이트**: 2025-01-29
**다음 검토**: 2025-02-29