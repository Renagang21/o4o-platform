# GitHub Actions 자동 배포 가이드

## 🎯 **개요**

o4o-platform에서 GitHub 중심의 완전 자동화된 개발 워크플로우를 구축했습니다.

### **📋 구성된 워크플로우들**

1. **🚀 deploy-api-server.yml** - API 서버 자동 배포
2. **🔍 api-server-quality.yml** - 코드 품질 검사  
3. **🏥 server-health-check.yml** - 서버 상태 모니터링

---

## 🔧 **설정 완료 체크리스트**

### ✅ **GitHub Secrets 설정** (필수)
```
Repository Settings → Secrets and variables → Actions

- APISERVER_HOST: 43.202.242.215
- APISERVER_USER: ubuntu  
- APISERVER_SSH_KEY: [SSH 개인키 전체 내용]
```

### ✅ **워크플로우 파일 생성** (완료)
```
.github/workflows/
├── deploy-api-server.yml      # 메인 배포 워크플로우
├── api-server-quality.yml     # 품질 검사
└── server-health-check.yml    # 헬스체크
```

---

## 🚀 **사용 방법**

### **자동 배포 트리거**

#### **1. 코드 변경 시 자동 배포**
```bash
# 다음 경로의 파일 변경 시 자동 실행:
services/api-server/**     # API 서버 코드
scripts/**                # 스크립트 파일
package.json              # 의존성 변경
.env.example              # 환경 설정 예시
ecosystem.config.js       # PM2 설정
```

#### **2. 수동 배포 실행**
```
1. GitHub → Actions 탭
2. "Deploy API Server to o4o-apiserver" 선택
3. "Run workflow" 클릭
4. 배포 이유 입력 (선택사항)
5. "Run workflow" 실행
```

### **품질 검사**
```
- Pull Request 생성 시 자동 실행
- main 브랜치 푸시 시 자동 실행
- TypeScript 타입 검사
- 테스트 실행
- 빌드 검증
```

### **서버 헬스체크**
```
- 6시간마다 자동 실행
- 수동 실행 가능
- 시스템 리소스 모니터링
- Git 상태 확인
- 서비스 상태 점검
```

---

## 🔄 **개발 워크플로우**

### **일반적인 개발 과정**
```
1. 로컬에서 코드 수정
   ↓
2. GitHub에 푸시
   ↓
3. 품질 검사 자동 실행
   ↓
4. 통과 시 자동 배포 실행
   ↓
5. 서버에 변경사항 자동 적용
```

### **sparse-checkout 자동 관리**
```
- 서버에서 api-server 폴더만 동기화
- 불필요한 폴더들(main-site, ecommerce) 제외
- 최초 배포 시 자동으로 설정됨
```

---

## 🔍 **배포 로그 확인**

### **GitHub Actions 로그**
```
1. GitHub → Actions 탭
2. 실행 중이거나 완료된 워크플로우 클릭
3. 단계별 로그 확인 가능
```

### **로그에서 확인할 내용**
```
✅ sparse-checkout 설정 상태
✅ Git 동기화 결과
✅ npm install 결과  
✅ PM2 재시작 상태
✅ 최종 배포 상태
```

---

## ⚠️ **문제 해결**

### **배포 실패 시**
```
1. Actions 탭에서 실패한 단계 확인
2. 에러 로그 분석
3. SSH 키 또는 Secrets 설정 재확인
4. 수동으로 다시 실행
```

### **서버 접속 실패**
```
- APISERVER_SSH_KEY 재확인
- AWS 보안 그룹 설정 확인
- 서버 상태 확인 (AWS Console)
```

### **의존성 설치 실패**
```
- package.json 구문 오류 확인
- npm 레지스트리 접근 가능 여부 확인
- Node.js 버전 호환성 확인
```

---

## 🎯 **다음 개선 사항**

### **향후 추가할 기능들**
- [ ] Slack/Discord 배포 알림
- [ ] 롤백 자동화
- [ ] 스테이징 환경 추가
- [ ] 데이터베이스 마이그레이션 자동화
- [ ] medusa 연동 워크플로우

---

**마지막 업데이트**: 2025-06-19  
**환경**: GitHub Actions → o4o-apiserver  
**목표**: 완전 자동화된 CI/CD 파이프라인