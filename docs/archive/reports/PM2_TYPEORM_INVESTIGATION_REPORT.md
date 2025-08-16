# 🔍 PM2 설정 및 TypeORM 초기화 문제 조사 보고서

## 📊 현재 상황 분석

### 1. PM2 설정 문제
- **ecosystem.config.js 설정**:
  - 프로세스명: `api-server` ✅ (최근 통일 완료)
  - 실행 모드: `cluster` (2개 인스턴스)
  - 스크립트: `dist/main.js`
  - 작업 디렉토리: `/home/ubuntu/o4o-platform/apps/api-server`

### 2. TypeORM 초기화 이중 실행 문제
**근본 원인**: `connection.ts` 파일에서 두 번 초기화 시도
```typescript
// 151번 줄: 파일 로드 시 자동 실행
AppDataSource.initialize()
  .then(() => { ... })
  .catch((error) => { ... });

// 283번 줄: main.ts에서 호출
await AppDataSource.initialize();
```

### 3. PM2 클러스터 모드 문제
- 클러스터 모드에서 각 워커가 독립적으로 DB 연결 시도
- 2개 인스턴스 × 2번 초기화 = 4번 연결 시도
- TypeORM이 이미 초기화된 상태에서 재초기화 시도로 에러 발생

## 🛠️ 해결 방안

### 1. TypeORM 초기화 코드 수정
```typescript
// connection.ts에서 자동 초기화 제거
// 151-164번 줄 삭제 또는 주석 처리
```

### 2. PM2 시작 옵션 (3가지 방법)

#### 방법 1: 단일 인스턴스 (권장) ✅
```bash
cd /home/ubuntu/o4o-platform
pm2 start ecosystem.config.js --only api-server --instances 1
```

#### 방법 2: Fork 모드로 변경
```bash
pm2 start apps/api-server/dist/main.js --name api-server --exec-mode fork
```

#### 방법 3: ecosystem.config.js 수정
```javascript
{
  name: 'api-server',
  script: 'dist/main.js',
  cwd: '/home/ubuntu/o4o-platform/apps/api-server',
  instances: 1,  // 2 → 1로 변경
  exec_mode: 'fork',  // cluster → fork로 변경
}
```

## 📝 즉시 실행 가능한 명령어

### 서버에서 실행:
```bash
# 1. 디렉토리 이동
cd /home/ubuntu/o4o-platform

# 2. 환경변수 확인
source apps/api-server/.env.production

# 3. PM2 시작 (단일 인스턴스)
pm2 start apps/api-server/dist/main.js \
  --name api-server \
  --instances 1 \
  --exec-mode fork \
  --max-memory-restart 1G \
  --error /home/ubuntu/logs/api-error.log \
  --output /home/ubuntu/logs/api-out.log \
  --merge-logs \
  --time

# 4. 상태 확인
pm2 list
pm2 logs api-server --lines 50

# 5. 헬스체크
curl http://localhost:4000/api/health
```

## ⚠️ 주의사항

1. **데이터베이스 연결 풀**:
   - 현재 설정: min 5, max 20 연결
   - 클러스터 모드 시 인스턴스당 20개씩 = 총 40개 연결
   - PostgreSQL max_connections 확인 필요

2. **로그 디렉토리**:
   - `/home/ubuntu/logs/` 디렉토리 존재 확인
   - 쓰기 권한 확인

3. **환경변수**:
   - `.env.production` 파일 로드 확인
   - DB_PASSWORD가 문자열로 처리되는지 확인

## 🎯 권장 사항

1. **즉시**: Fork 모드로 단일 인스턴스 실행
2. **단기**: connection.ts의 중복 초기화 코드 제거
3. **장기**: PM2 클러스터 모드 대신 Nginx/HAProxy로 로드 밸런싱

## 📊 예상 결과
- TypeORM 초기화 에러 해결
- 안정적인 데이터베이스 연결
- PM2 프로세스 정상 실행
- 헬스체크 응답 정상화