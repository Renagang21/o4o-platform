# 🚀 O4O Platform - 빠른 시작 가이드

## ⚡ 빠른 실행 (Quick Start)

### 1단계: 의존성 설치
```bash
npm install
```

### 2단계: 환경설정 확인
- `.env` 파일이 생성되어 있는지 확인
- MongoDB가 실행 중인지 확인

### 3단계: 관리자 계정 생성
```bash
npm run create-admin
```

### 4단계: 서버 실행
```bash
npm run dev
```

### 5단계: 브라우저에서 접속
```
http://localhost:3000
```

## 🧪 테스트 계정

### 관리자 계정
- **이메일:** admin@neture.co.kr
- **비밀번호:** Admin123!
- **접속:** http://localhost:3000/admin/dashboard

### 테스트 사용자 (직접 가입)
1. http://localhost:3000/register 에서 회원가입
2. 관리자 계정으로 로그인하여 승인
3. 승인된 계정으로 로그인

## 📍 주요 URL

| 페이지 | URL | 설명 |
|--------|-----|------|
| 홈페이지 | http://localhost:3000 | 메인 랜딩 페이지 |
| 회원가입 | http://localhost:3000/register | 신규 사용자 등록 |
| 로그인 | http://localhost:3000/login | 사용자/관리자 로그인 |
| 사용자 대시보드 | http://localhost:3000/dashboard | 승인된 사용자 대시보드 |
| 관리자 대시보드 | http://localhost:3000/admin/dashboard | 관리자 전용 페이지 |
| AI 서비스 | http://localhost:3000/services/ai | AI 서비스 페이지 |

## 🔧 개발 명령어

```bash
# 개발 서버 실행 (자동 재시작)
npm run dev

# TypeScript 컴파일
npm run build

# 프로덕션 서버 실행
npm start

# 관리자 계정 생성
npm run create-admin

# 타입 체크
npm run type-check
```

## ✅ 완성된 기능들

### 🔐 인증 시스템
- [x] 사용자 회원가입
- [x] 이메일/비밀번호 로그인
- [x] JWT 토큰 인증
- [x] 비밀번호 해싱 (bcrypt)

### 👥 사용자 관리
- [x] 사용자 상태 관리 (대기/승인/거부/정지)
- [x] 사업체 정보 관리
- [x] 업종별 분류 (약국, 건강식품점, 로컬 식품점, 소형 리테일 숍)

### 👨‍💼 관리자 기능
- [x] 사용자 승인/거부 시스템
- [x] 사용자 정지/재활성화
- [x] 실시간 통계 대시보드
- [x] 사용자 검색 및 필터링
- [x] 페이지네이션

### 🎨 UI/UX
- [x] 반응형 웹 디자인
- [x] 모던한 그라데이션 디자인
- [x] 사용자 친화적 인터페이스
- [x] 실시간 피드백 (성공/오류 메시지)

### 🛡️ 보안
- [x] Rate Limiting (API 요청 제한)
- [x] Helmet.js 보안 헤더
- [x] CORS 설정
- [x] 입력값 검증 (express-validator)

### 🌐 서비스 아키텍처
- [x] RESTful API 설계
- [x] 모듈화된 라우트 구조
- [x] MongoDB 데이터 모델링
- [x] Socket.IO 실시간 통신 준비

## 🎯 다음 개발 단계

### Phase 1: 서비스 기능 구현
- [ ] AI 서비스 상세 기능
- [ ] RPA 자동화 도구
- [ ] 전자상거래 플랫폼
- [ ] 크라우드펀딩 시스템
- [ ] 커뮤니티 포럼
- [ ] 디지털 사이니지

### Phase 2: 고급 기능
- [ ] 이메일 알림 시스템
- [ ] 파일 업로드 기능
- [ ] 결제 시스템 연동
- [ ] 모바일 앱 API
- [ ] 실시간 알림

### Phase 3: 운영 최적화
- [ ] 성능 모니터링
- [ ] 로깅 시스템
- [ ] 백업 자동화
- [ ] CI/CD 파이프라인
- [ ] Docker 컨테이너화

## 🐛 문제 해결

### MongoDB 연결 오류
```bash
# MongoDB 서비스 시작
net start MongoDB

# 또는 수동 실행
mongod --dbpath C:\data\db
```

### 포트 이미 사용 중
```bash
# .env 파일에서 포트 변경
PORT=3001
```

### 관리자 계정 재생성
```bash
# MongoDB에서 기존 관리자 삭제
mongo o4o-platform --eval "db.users.deleteOne({email: 'admin@neture.co.kr'})"

# 새 관리자 생성
npm run create-admin
```

## 📞 지원

문제가 발생하면 다음을 확인해주세요:

1. **Node.js 버전**: 18.0.0 이상
2. **MongoDB 실행 상태**: `net start MongoDB`
3. **포트 충돌**: 3000번 포트가 사용 가능한지 확인
4. **환경변수**: `.env` 파일 설정 확인

---

🎉 **축하합니다!** O4O Platform의 기본 테스트 환경이 준비되었습니다!

이제 회원가입부터 관리자 승인, 서비스 이용까지 전체 플로우를 테스트해보세요.