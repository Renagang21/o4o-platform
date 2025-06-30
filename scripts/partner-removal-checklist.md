# src/partner/ 제거 전후 확인 체크리스트

## 제거 전 체크리스트 (Pre-Removal)

### ✅ 환경 준비
- [ ] Git 워킹 디렉토리 상태 확인 (`git status`)
- [ ] 현재 브랜치 확인 (`git branch`)
- [ ] 최신 커밋 상태 확인 (`git log --oneline -5`)
- [ ] 백업 디렉토리 공간 확인 (최소 100MB)

### ✅ 의존성 확인
```bash
# 1. src/partner 직접 참조 확인
grep -r "src/partner" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist

# 2. partner.db 파일 참조 확인  
grep -r "partner\.db" . --exclude-dir=node_modules --exclude-dir=.git

# 3. SQLite 관련 import 확인
grep -r "sqlite" . --exclude-dir=node_modules --exclude-dir=.git | grep -v package-lock.json
```
**예상 결과**: 모든 검색에서 결과 없음 또는 무해한 결과만

### ✅ 기능 테스트 (제거 전)
- [ ] API 서버 시작 테스트 (`npm run dev:api`)
- [ ] 메인 사이트 시작 테스트 (`npm run dev:web`)
- [ ] 기본 API 엔드포인트 테스트
  ```bash
  curl http://localhost:4000/api/health || echo "API 서버가 실행되지 않음"
  ```
- [ ] 타입 검사 통과 (`npm run type-check:all`)
- [ ] 린트 검사 통과 (`npm run lint:all`)

### ✅ 데이터 확인
- [ ] SQLite 파일 존재 여부 확인
  ```bash
  find . -name "*.db" -path "*/partner/*"
  ```
- [ ] 중요한 데이터가 있는지 확인 (있다면 별도 백업)

---

## 제거 후 체크리스트 (Post-Removal)

### ✅ 제거 확인
- [ ] `src/partner/` 폴더 없음 확인
- [ ] `dist/partner/` 폴더 없음 확인 (있었다면)
- [ ] 백업 폴더 생성 확인
- [ ] 롤백 스크립트 생성 확인

### ✅ 기능 검증
- [ ] API 서버 정상 시작 (`npm run dev:api`)
  ```bash
  cd services/api-server && npm run dev
  # 예상: 정상 시작, 에러 없음
  ```

- [ ] 메인 사이트 정상 시작 (`npm run dev:web`)
  ```bash
  cd services/main-site && npm run dev  
  # 예상: 정상 시작, 브라우저에서 접속 가능
  ```

- [ ] 타입 검사 통과
  ```bash
  npm run type-check:all
  # 예상: 에러 없음
  ```

- [ ] 린트 검사 통과
  ```bash
  npm run lint:all
  # 예상: 에러 없음
  ```

- [ ] 빌드 테스트
  ```bash
  npm run build:all
  # 예상: 성공적으로 빌드 완료
  ```

### ✅ API 엔드포인트 테스트
```bash
# 기본 헬스 체크
curl -f http://localhost:4000/api/health

# 사용자 관련 API (인증 제외)
curl -f http://localhost:4000/api/user/test

# 제품 관련 API  
curl -f http://localhost:4000/api/ecommerce/products
```

### ✅ 브라우저 테스트
- [ ] 메인 페이지 로드 (http://localhost:3000)
- [ ] 관리자 로그인 페이지 접속
- [ ] 이커머스 페이지 접속
- [ ] 콘솔 에러 없음 확인

### ✅ 파트너 관련 기능 확인
- [ ] `services/ecommerce/web/src/pages/partner/` 파일들 정상 작동
- [ ] 파트너 스토어 (`partnerStore.ts`) 정상 작동
- [ ] 파트너 관련 컴포넌트 렌더링 확인

---

## 문제 발생 시 대응 방안

### 🚨 일반적인 문제들

#### 1. API 서버 시작 실패
```bash
# 로그 확인
cd services/api-server && npm run dev

# 일반적인 해결책
- 포트 충돌 확인 (4000번 포트)
- 환경 변수 확인 (.env 파일)
- PostgreSQL 연결 확인
```

#### 2. 타입 에러 발생  
```bash
# 타입 확인
npm run type-check:all

# 일반적인 해결책
- TypeScript 캐시 정리: rm -rf node_modules/.cache
- 재설치: npm run install:all
```

#### 3. 빌드 실패
```bash
# 빌드 로그 확인
npm run build:all

# 일반적인 해결책  
- dist 폴더 정리: npm run clean
- 종속성 재설치: npm run install:all
```

### 🔄 롤백 절차
만약 문제가 해결되지 않으면:

```bash
# 1. 백업 폴더로 이동
cd backup/partner-removal-YYYYMMDD-HHMMSS

# 2. 롤백 실행
./rollback.sh

# 3. 상태 확인
cd ../..
git status
npm run dev:api
```

---

## 성공 기준

### ✅ 모든 테스트 통과
- API 서버 정상 시작 ✓
- 메인 사이트 정상 시작 ✓  
- 타입 검사 통과 ✓
- 린트 검사 통과 ✓
- 빌드 성공 ✓
- 기능 테스트 성공 ✓

### ✅ 정리 작업
제거 성공 후 다음 작업 수행:

1. **백업 폴더 정리** (7일 후)
   ```bash
   # 7일 후 백업 정리
   find backup/ -name "partner-removal-*" -mtime +7 -exec rm -rf {} \;
   ```

2. **Git 커밋** (선택사항)
   ```bash
   git add .
   git commit -m "remove: src/partner/ 폴더 제거

   - SQLite 기반 독립 파트너 시스템 제거
   - services/api-server/ 통합 준비
   - 백업: backup/partner-removal-YYYYMMDD-HHMMSS/"
   ```

3. **다음 단계 계획**
   - [ ] services/api-server/에 파트너 엔티티 생성
   - [ ] 파트너 API 엔드포인트 구현  
   - [ ] 프론트엔드 연동 테스트

---

## 체크리스트 실행 명령어

```bash
# 체크리스트 실행 헬퍼
cat > check-removal.sh << 'EOF'
#!/bin/bash

echo "=== 제거 후 기능 검증 시작 ==="

# API 서버 테스트
echo "1. API 서버 시작 테스트..."
cd services/api-server
timeout 10s npm run dev > /dev/null 2>&1 && echo "✓ API 서버 OK" || echo "✗ API 서버 실패"

# 메인 사이트 테스트  
echo "2. 메인 사이트 빌드 테스트..."
cd ../main-site
npm run build > /dev/null 2>&1 && echo "✓ 메인 사이트 빌드 OK" || echo "✗ 메인 사이트 빌드 실패"

# 타입 검사
echo "3. 타입 검사..."
cd ../..
npm run type-check:all > /dev/null 2>&1 && echo "✓ 타입 검사 OK" || echo "✗ 타입 검사 실패"

echo "=== 검증 완료 ==="
EOF

chmod +x check-removal.sh
```