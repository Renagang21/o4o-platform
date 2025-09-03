# 🚨 복구 절차 문서

## 목차
1. [긴급 연락처](#긴급-연락처)
2. [일반적인 문제 해결](#일반적인-문제-해결)
3. [서비스 다운 복구](#서비스-다운-복구)
4. [데이터베이스 복구](#데이터베이스-복구)
5. [배포 실패 복구](#배포-실패-복구)
6. [보안 사고 대응](#보안-사고-대응)

---

## 긴급 연락처

- **시스템 관리자**: [연락처 입력]
- **데이터베이스 관리자**: [연락처 입력]
- **보안 담당자**: [연락처 입력]
- **AWS Support**: [계정 정보]

---

## 일반적인 문제 해결

### 1. 서비스 응답 없음

**증상**: API가 응답하지 않거나 매우 느림

**복구 절차**:
```bash
# 1. PM2 프로세스 상태 확인
pm2 status

# 2. 프로세스가 죽었다면 재시작
pm2 restart api-server

# 3. 로그 확인
pm2 logs api-server --lines 100

# 4. 메모리 부족인 경우
pm2 restart api-server --max-memory-restart 500M

# 5. 헬스체크
curl http://localhost:3001/health
```

### 2. 높은 CPU/메모리 사용률

**복구 절차**:
```bash
# 1. 프로세스별 리소스 확인
pm2 monit

# 2. 메모리 누수가 의심되면 재시작
pm2 restart api-server

# 3. 스케일 조정
pm2 scale api-server 2  # 인스턴스 늘리기
```

### 3. 디스크 공간 부족

**복구 절차**:
```bash
# 1. 디스크 사용량 확인
df -h

# 2. 큰 파일 찾기
du -h --max-depth=1 / | sort -hr | head -20

# 3. 로그 정리
pm2 flush  # PM2 로그 정리
find /home/ubuntu/o4o-platform/logs -name "*.log" -mtime +7 -delete

# 4. Docker 정리 (사용 시)
docker system prune -a
```

---

## 서비스 다운 복구

### 완전 복구 절차

1. **상태 파악**
```bash
# 시스템 상태 확인
systemctl status
pm2 status
netstat -tlnp

# 로그 확인
journalctl -xe
pm2 logs --lines 200
```

2. **서비스 재시작**
```bash
# PM2 재시작
pm2 kill
pm2 resurrect

# 또는 ecosystem 파일로 시작
cd /home/ubuntu/o4o-platform
pm2 start ecosystem.config.js
```

3. **의존성 서비스 확인**
```bash
# Redis 확인
redis-cli ping

# MongoDB 확인 (사용 시)
mongosh --eval "db.adminCommand('ping')"

# MySQL 확인 (사용 시)
mysql -u root -p -e "SELECT 1"
```

4. **빠른 롤백**
```bash
# 이전 버전으로 롤백
./scripts/rollback.sh quick
```

---

## 데이터베이스 복구

### MySQL 복구

1. **연결 문제**
```bash
# MySQL 서비스 확인
sudo systemctl status mysql

# 재시작
sudo systemctl restart mysql

# 연결 테스트
mysql -h localhost -u root -p -e "SHOW STATUS"
```

2. **백업에서 복구**
```bash
# 최신 백업 찾기
ls -lt /backup/mysql/

# 복구
mysql -u root -p < /backup/mysql/backup_20240115.sql
```

3. **복제 재구성** (슬레이브 문제)
```bash
# 슬레이브 상태 확인
mysql -e "SHOW SLAVE STATUS\G"

# 복제 재시작
mysql -e "STOP SLAVE; START SLAVE;"
```

### MongoDB 복구

```bash
# 백업에서 복구
mongorestore --db mydb /backup/mongodb/dump/

# 복제셋 재구성
mongosh --eval "rs.status()"
mongosh --eval "rs.reconfig(cfg)"
```

### Redis 복구

```bash
# Redis 재시작
sudo systemctl restart redis

# 메모리 정리
redis-cli FLUSHDB

# 백업에서 복구 (RDB 파일)
sudo cp /backup/redis/dump.rdb /var/lib/redis/
sudo systemctl restart redis
```

---

## 배포 실패 복구

### 자동 롤백

```bash
# 가장 최근 백업으로 롤백
./scripts/rollback.sh quick

# 특정 버전으로 롤백
./scripts/rollback.sh rollback backup_20240115_143000
```

### 수동 복구

1. **Git으로 이전 커밋 복구**
```bash
cd /home/ubuntu/o4o-platform

# 이전 커밋으로 되돌리기
git log --oneline -10
git reset --hard [커밋해시]

# 의존성 재설치
npm ci

# PM2 재시작
pm2 restart all
```

2. **빌드 문제 해결**
```bash
# 캐시 정리
npm cache clean --force
rm -rf node_modules package-lock.json

# 재설치
pnpm install

# 빌드
npm run build

# 테스트
npm test
```

---

## 보안 사고 대응

### 1. 즉시 조치

```bash
# 1. 의심스러운 연결 차단
sudo iptables -A INPUT -s [악성IP] -j DROP

# 2. 서비스 격리
pm2 stop all

# 3. 로그 보존
tar -czf incident_logs_$(date +%Y%m%d).tar.gz /var/log /home/ubuntu/.pm2/logs
```

### 2. 조사

```bash
# 최근 로그인 확인
last -n 50

# 실행 중인 프로세스 확인
ps aux | grep -v "ps aux"

# 네트워크 연결 확인
netstat -antp

# 파일 변경 확인
find / -mtime -1 -type f
```

### 3. 복구

```bash
# 1. 시스템 업데이트
sudo apt update && sudo apt upgrade

# 2. 비밀번호 변경
passwd

# 3. SSH 키 재생성
ssh-keygen -t rsa -b 4096

# 4. 애플리케이션 재배포
git pull origin main
npm ci
pm2 restart all
```

---

## 모니터링 복구

### 모니터링 시스템 재시작

```bash
# PM2 모니터링 재설정
pm2 install pm2-server-monit
pm2 install pm2-logrotate

# 알림 시스템 재시작
node /home/ubuntu/o4o-platform/monitoring/alert-system.js &

# 로그 수집기 재시작
node /home/ubuntu/o4o-platform/monitoring/log-aggregator.js &
```

---

## 체크리스트

### 📋 일일 체크리스트
- [ ] PM2 프로세스 상태 확인
- [ ] 디스크 사용량 확인 (< 80%)
- [ ] 에러 로그 확인
- [ ] 백업 상태 확인

### 📋 주간 체크리스트
- [ ] 전체 백업 실행
- [ ] 보안 업데이트 확인
- [ ] 성능 메트릭 리뷰
- [ ] 로그 로테이션 확인

### 📋 월간 체크리스트
- [ ] 복구 절차 테스트
- [ ] 백업 복원 테스트
- [ ] 보안 감사
- [ ] 용량 계획 검토

---

## 유용한 명령어 모음

```bash
# 프로세스 관리
pm2 status              # 상태 확인
pm2 restart all         # 전체 재시작
pm2 logs --lines 100    # 로그 확인
pm2 monit              # 실시간 모니터링

# 시스템 상태
htop                   # CPU/메모리 모니터링
df -h                  # 디스크 사용량
netstat -tlnp          # 네트워크 포트
journalctl -xe         # 시스템 로그

# 로그 분석
tail -f /var/log/syslog                    # 시스템 로그
grep -i error /home/ubuntu/.pm2/logs/*.log # 에러 검색
./monitoring/error-analyzer.sh             # 에러 분석

# 백업/복구
./scripts/rollback.sh list    # 백업 목록
./scripts/rollback.sh quick   # 빠른 롤백
./scripts/rollback.sh backup  # 현재 백업
```

---

## 문서 업데이트 기록

- 2024-01-15: 초기 문서 작성
- [업데이트 날짜]: [변경 내용]

---

**중요**: 이 문서는 정기적으로 업데이트되어야 합니다. 새로운 문제나 해결 방법을 발견하면 즉시 문서를 업데이트하세요.