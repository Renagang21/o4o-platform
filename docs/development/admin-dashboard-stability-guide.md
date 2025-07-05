# Admin Dashboard 안정성 가이드

## 🎯 목적
Claude Code 등 자동화 도구와 함께 작업할 때 admin-dashboard 환경의 안정성을 보장하기 위한 종합 가이드입니다.

## 🚨 핵심 원칙

### 1. 작업 전 환경 고정
```bash
# 자동화 작업 시작 전 반드시 실행
./scripts/pre-automation-check.sh
```

### 2. 작업 후 환경 복구
```bash
# 자동화 작업 완료 후 반드시 실행
./scripts/post-automation-restore.sh
```

### 3. 정기적 안정성 점검
```bash
# 주기적으로 환경 상태 종합 점검
node scripts/admin-dashboard-stabilizer.js
```

## 🔧 문제 해결 플레이북

### A. 브라우저 접속 불가 (ERR_CONNECTION_REFUSED)

**증상:** localhost:3001 접속 시 연결 거부

**진단 순서:**
1. **포트 충돌 확인**
   ```bash
   lsof -i :3001
   netstat -tlnp | grep 3001
   ```

2. **설정 파일 검증**
   ```bash
   grep -n "port.*3001" apps/admin-dashboard/package.json
   grep -n "port.*3001" apps/admin-dashboard/vite.config.ts
   ```

3. **프로세스 정리 및 재시작**
   ```bash
   pkill -f "vite.*3001"
   cd apps/admin-dashboard
   npm run dev
   ```

### B. 빌드 실패 (Module not found)

**증상:** 로컬 패키지 import 에러

**해결책:**
```bash
# 1. 로컬 패키지 존재 확인
ls -la packages/auth-client packages/auth-context

# 2. 의존성 재연결
cd apps/admin-dashboard
npm install --no-save

# 3. 빌드 테스트
npm run build
```

### C. 자동화 도구 작업 후 환경 깨짐

**증상:** 이전에 잘 되던 것이 갑자기 안 됨

**복구 절차:**
1. **충돌 파일 제거**
   ```bash
   cd apps/admin-dashboard
   rm -f server.js express-server.js proxy-server.js
   rm -f vite.config.js  # TypeScript 버전과 충돌
   ```

2. **설정 백업에서 복구**
   ```bash
   # 최신 백업 찾기
   ls -t *.backup-* | head -5
   
   # 복구 (예시)
   cp package.json.backup-20250704-143000 package.json
   ```

3. **전체 환경 복구**
   ```bash
   ./scripts/post-automation-restore.sh
   ```

## 🛡️ 예방적 모니터링

### 실시간 상태 모니터링
```bash
# 개발 서버 상태 지속 모니터링
watch -n 5 'curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001 || echo "DOWN"'
```

### 설정 파일 변화 감지
```bash
# 중요 설정 파일 변화 감지
cd apps/admin-dashboard
find . -name "package.json" -o -name "vite.config.ts" | entr -p echo "Config file changed"
```

## 📋 체크리스트

### 개발 시작 전
- [ ] `./scripts/pre-automation-check.sh` 실행
- [ ] 포트 3001 정리 확인
- [ ] 로컬 패키지 연결 상태 확인

### 자동화 작업 후
- [ ] `./scripts/post-automation-restore.sh` 실행
- [ ] 빌드 성공 확인
- [ ] 브라우저 접속 테스트

### 주간 점검
- [ ] `node scripts/admin-dashboard-stabilizer.js` 실행
- [ ] 백업 파일 정리 (1주일 이상 된 것)
- [ ] 로그 파일 정리

## 🚀 성능 최적화 팁

### WSL2 환경 최적화
```bash
# WSL2 메모리 최적화
echo '[wsl2]
memory=8GB
processors=4' > ~/.wslconfig

# Windows 재시작 후 적용
```

### Vite 개발 서버 최적화
```typescript
// vite.config.ts 권장 설정
export default defineConfig({
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
    watch: {
      usePolling: true,  // WSL2 안정성 향상
      interval: 1000
    }
  }
})
```

## 🔍 트러블슈팅 FAQ

**Q: 포트 3001이 이미 사용 중이라고 나타남**
A: `lsof -ti:3001 | xargs kill -9` 실행 후 재시도

**Q: 로컬 패키지 import 에러**  
A: `npm install --no-save` 실행하여 symlink 재생성

**Q: 빌드는 성공하는데 브라우저에서 접속 안 됨**
A: WSL2 IP 확인 및 Windows 방화벽 설정 점검

**Q: 자동화 도구가 설정을 계속 변경함**
A: 백업에서 복구 후 파일 권한을 읽기 전용으로 변경

## 📞 긴급 복구

모든 방법이 실패할 경우:
```bash
# 완전 초기화 (주의: 모든 로컬 변경사항 삭제됨)
cd apps/admin-dashboard
rm -rf node_modules package-lock.json
npm install
npm run build
npm run dev
```