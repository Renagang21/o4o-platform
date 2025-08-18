# O4O Platform 백업 및 복구 시스템

## 📋 개요

O4O Platform은 자동화된 백업 및 복구 시스템을 제공하여 데이터 안전성과 비즈니스 연속성을 보장합니다.

## 🔄 백업 시스템

### 백업 구성 요소
1. **데이터베이스 백업**
   - PostgreSQL 전체 데이터베이스 덤프
   - 트랜잭션 일관성 보장
   - 압축 저장 (gzip)

2. **파일 백업**
   - 환경 설정 파일 (.env)
   - 업로드된 미디어 파일
   - 빌드된 애플리케이션 파일
   - 로그 파일

3. **자동 복구 설정**
   - AutoRecoveryService 구성
   - 복구 액션 정의
   - 에스컬레이션 규칙

### 백업 스크립트 사용

#### 수동 백업 실행
```bash
cd /home/ubuntu/o4o-platform
./scripts/backup.sh
```

#### 자동 백업 설정 (Cron)
```bash
# 매일 새벽 2시에 백업 실행
0 2 * * * cd /home/ubuntu/o4o-platform && ./scripts/backup.sh >> /var/log/o4o-backup.log 2>&1
```

#### 환경 변수 설정
```bash
export BACKUP_DIR=/backup/o4o-platform  # 백업 저장 위치
export RETENTION_DAYS=7                 # 백업 보관 기간
export DB_PASSWORD=your_password        # 데이터베이스 비밀번호
```

## 🔧 복구 시스템

### 복구 스크립트 사용

#### 백업에서 복구
```bash
# 최신 백업에서 복구
./scripts/restore.sh /backup/o4o-platform/o4o_backup_20250129_120000.tar.gz

# 특정 날짜 백업에서 복구
./scripts/restore.sh /backup/o4o-platform/o4o_backup_20250128_020000.tar.gz
```

### 복구 프로세스
1. 백업 파일 검증
2. 서비스 중단
3. 데이터베이스 복구
4. 파일 복구
5. 서비스 재시작
6. 헬스체크 수행

### 롤백 절차
복구 실패 시 이전 상태로 롤백:
```bash
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "ALTER DATABASE o4o_platform RENAME TO o4o_platform_failed; ALTER DATABASE o4o_platform_old RENAME TO o4o_platform;"
```

## 📊 백업 모니터링

### 모니터링 스크립트 실행
```bash
./scripts/backup-monitoring.sh
```

### 모니터링 항목
- 최신 백업 시간
- 백업 파일 크기
- 백업 무결성
- 디스크 공간
- 백업 보관 정책

### 알림 설정
```bash
export ALERT_EMAIL=admin@neture.co.kr
export SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 🚨 자동 복구 시스템

### AutoRecoveryService 기능
1. **실시간 모니터링**
   - 시스템 메트릭 감시
   - 임계값 기반 알림
   - 자동 복구 트리거

2. **복구 액션**
   - 서비스 재시작
   - 캐시 정리
   - 연결 재설정
   - 리소스 스케일링
   - 배포 롤백

3. **에스컬레이션**
   - 자동 복구 실패 시 수동 개입 요청
   - 팀 알림 발송
   - 인시던트 티켓 생성

### 복구 액션 설정 예시
```typescript
{
  id: 'high-memory-usage',
  name: 'High Memory Usage Recovery',
  severity: AlertSeverity.HIGH,
  conditions: {
    metricThresholds: { memory_usage: 85 },
    duration: 5
  },
  actions: {
    immediate: [
      { type: 'clear_cache', target: 'application' },
      { type: 'execute_script', target: '/scripts/memory-cleanup.sh' }
    ],
    fallback: [
      { type: 'restart_service', target: 'api-server' }
    ]
  }
}
```

## 📅 백업 정책

### 권장 백업 일정
- **전체 백업**: 매일 1회 (새벽 2시)
- **증분 백업**: 4시간마다 (선택사항)
- **트랜잭션 로그**: 실시간 복제

### 보관 정책
- **일일 백업**: 7일 보관
- **주간 백업**: 4주 보관
- **월간 백업**: 12개월 보관

### 저장소 권장사항
- **로컬 스토리지**: 빠른 복구용
- **원격 스토리지**: 재해 복구용 (S3, Google Cloud Storage)
- **오프사이트 백업**: 물리적 재해 대비

## 🔒 보안 고려사항

1. **백업 암호화**
   ```bash
   # 백업 파일 암호화
   openssl enc -aes-256-cbc -salt -in backup.tar.gz -out backup.tar.gz.enc
   ```

2. **접근 권한**
   - 백업 디렉토리: 700 (소유자만)
   - 백업 파일: 600 (소유자 읽기/쓰기)
   - 스크립트: 700 (소유자 실행)

3. **민감 정보 보호**
   - 환경 변수 파일 암호화
   - 데이터베이스 비밀번호 안전 관리
   - 백업 위치 접근 제한

## 🧪 복구 테스트

### 정기 복구 테스트
매월 복구 테스트 수행:
```bash
# 테스트 환경에서 복구 검증
./scripts/restore.sh --test /backup/o4o-platform/latest.tar.gz
```

### 테스트 체크리스트
- [ ] 백업 파일 무결성 확인
- [ ] 데이터베이스 복구 검증
- [ ] 파일 시스템 복구 확인
- [ ] 애플리케이션 기능 테스트
- [ ] 성능 벤치마크 수행

## 📞 비상 연락처

### 장애 발생 시
1. **1차 대응팀**: DevOps 팀
2. **2차 대응팀**: 개발팀 리드
3. **3차 에스컬레이션**: CTO

### 복구 우선순위
1. **Critical**: 데이터베이스, 인증 시스템
2. **High**: API 서버, 결제 시스템
3. **Medium**: 웹 애플리케이션, 관리자 대시보드
4. **Low**: 분석 시스템, 리포팅

## 📚 참고 문서

- [PostgreSQL 백업 가이드](https://www.postgresql.org/docs/current/backup.html)
- [PM2 프로세스 관리](https://pm2.keymetrics.io/docs/usage/startup/)
- [재해 복구 계획](./DISASTER_RECOVERY.md)