# 프로덕션 빌드 전환 Pending Issues & Alternatives

**생성일**: 2025-01-03
**작업**: 프로덕션 빌드 전환

## 🔍 예상 이슈들

### **1. 번들 크기 문제**
- **문제**: 프로덕션 빌드 시 번들 크기 과다
- **대안**: Code splitting, Tree shaking 최적화
- **롤백**: chunk 크기 임계치 설정으로 점진적 적용

### **2. 환경 변수 이슈**
- **문제**: dev 모드 전용 환경 변수 문제
- **대안**: .env.production 파일 별도 생성
- **롤백**: .env 파일 우선순위 조정

### **3. API 연결 문제**
- **문제**: 프로덕션 빌드에서 API 경로 이슈
- **대안**: BASE_URL 환경별 분리
- **롤백**: proxy 설정으로 우회

### **4. 정적 파일 서빙**
- **문제**: 빌드된 파일 서빙 방식 변경 필요
- **대안**: nginx 설정 또는 serve 패키지 활용
- **롤백**: Vite preview 모드로 임시 대응

### **5. 현재 환경 특이사항**
- **TypeScript Strict 모드**: admin-dashboard에서 활성화 완료
- **React 19**: 모든 서비스에서 버전 통일 완료
- **Custom Fields/Pages 모듈**: TypeScript 에러로 인해 일시 비활성화됨

## 📋 대안책 우선순위
1. **High**: 환경 변수 및 API 연결 문제
2. **Medium**: 번들 크기 최적화
3. **Low**: 정적 파일 서빙 최적화

## 🚨 롤백 전략
```bash
# 심각한 문제 발생 시 즉시 실행
git checkout main
git branch -D feat/production-build-conversion

# 또는 특정 서비스만 롤백
cd services/main-site
mv vite.config.ts.backup vite.config.ts
rm .env.production
```