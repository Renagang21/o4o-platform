# 📋 O4O Platform 환경변수 설계 문서

## 🔍 현재 상황 분석

### 파일 분포 (총 18개)
#### 루트 디렉토리 (5개)
- `.env` (600 권한) - 메인 설정
- `.env.example` - 템플릿
- `.env.webserver.example` - 웹서버용 템플릿
- `.env.apiserver.example` - API서버용 템플릿
- `.env.production.example` - 프로덕션 템플릿

#### Apps 디렉토리 (12개)
- **admin-dashboard**: .env, .env.local, .env.example
- **api-server**: .env, .env.local, .env.development, .env.production, .env.example
- **main-site**: .env, .env.example
- **api-gateway**: .env.example
- **ecommerce**: .env.example

### 권한 문제
- ❌ 루트 .env만 600 권한 (보안)
- ⚠️ 나머지 모두 644 권한 (읽기 가능)

---

## 🎯 환경별 분리 설계

### 1. 로컬 개발 환경 (.env.local)
```
용도: 로컬 개발 및 테스트
특징: Mock 데이터, 디버그 모드, 로컬 DB
보안: chmod 600
```

#### 필수 환경변수
| 카테고리 | 변수명 | 기본값 | 설명 |
|---------|--------|--------|------|
| **서버** | NODE_ENV | development | 환경 모드 |
| | PORT | 3001 | API 서버 포트 |
| | API_URL | http://localhost:3001 | API 기본 URL |
| **DB** | DATABASE_HOST | localhost | DB 호스트 |
| | DATABASE_NAME | o4o_dev | 개발 DB명 |
| **Redis** | REDIS_HOST | localhost | Redis 호스트 |
| **JWT** | JWT_SECRET | dev-jwt-secret... | 개발용 시크릿 |
| **Frontend** | VITE_API_URL | http://localhost:3001/api | 프론트 API URL |
| | VITE_USE_MOCK | false | Mock 모드 |

### 2. 웹서버 환경 (.env.webserver)
```
용도: 프론트엔드 전용 서버
특징: 정적 파일 서빙, API 프록시
보안: chmod 600
```

#### 필수 환경변수
| 카테고리 | 변수명 | 설명 |
|---------|--------|------|
| **서버** | NODE_ENV | production |
| | PORT | 5173 (Admin), 5174 (Main) |
| **API** | VITE_API_URL | API 서버 주소 |
| | VITE_AUTH_URL | 인증 서버 주소 |
| **도메인** | VITE_MAIN_SITE_URL | 메인 사이트 URL |

### 3. API서버 환경 (.env.apiserver)
```
용도: REST API 서버
특징: DB 연결, 비즈니스 로직
보안: chmod 600
```

#### 필수 환경변수
| 카테고리 | 변수명 | 설명 |
|---------|--------|------|
| **서버** | NODE_ENV | production |
| | PORT | 3001 |
| **DB** | DATABASE_URL | 프로덕션 DB URL |
| | DATABASE_PASSWORD | 암호화 필수 |
| **Redis** | REDIS_PASSWORD | 프로덕션 Redis 암호 |
| **JWT** | JWT_SECRET | 프로덕션 시크릿 (강력) |
| **Payment** | TOSS_SECRET_KEY | 실제 결제 키 |

---

## 🔒 보안 강화 방안

### 1. 권한 설정
```bash
# 모든 실제 .env 파일에 600 권한 적용
chmod 600 .env
chmod 600 .env.local
chmod 600 .env.webserver
chmod 600 .env.apiserver
```

### 2. 민감 정보 분리
#### 높은 보안 (절대 노출 금지)
- DATABASE_PASSWORD
- JWT_SECRET, JWT_REFRESH_SECRET
- TOSS_SECRET_KEY
- AWS_SECRET_ACCESS_KEY
- SMTP_PASS

#### 중간 보안
- DATABASE_USER
- REDIS_PASSWORD
- TOSS_CLIENT_KEY

#### 낮은 보안 (예제 포함 가능)
- PORT
- NODE_ENV
- API_URL (내부망)

### 3. 파일 구조 개선
```
루트/
├── .env.local (600) - 로컬 개발
├── .env.webserver (600) - 웹서버용
├── .env.apiserver (600) - API서버용
├── .env.local.template - 로컬 템플릿
├── .env.webserver.template - 웹서버 템플릿
├── .env.apiserver.template - API서버 템플릿
└── apps/
    ├── admin-dashboard/
    │   └── (환경변수는 루트에서 상속)
    ├── api-server/
    │   └── (환경변수는 루트에서 상속)
    └── main-site/
        └── (환경변수는 루트에서 상속)
```

---

## 📝 마이그레이션 계획

### Phase 1: 템플릿 생성
- [x] .env.local.template 생성
- [ ] .env.webserver.template 개선
- [ ] .env.apiserver.template 개선

### Phase 2: 환경별 파일 생성
- [ ] 현재 .env → .env.local 변환
- [ ] 웹서버용 .env.webserver 생성
- [ ] API서버용 .env.apiserver 생성

### Phase 3: 권한 및 보안
- [ ] 모든 .env 파일 600 권한 설정
- [ ] 민감 정보 암호화 검토
- [ ] .gitignore 확인

### Phase 4: 정리
- [ ] 중복 .env 파일 제거
- [ ] apps 내부 .env 통합
- [ ] 문서화 완료

---

## ⚠️ 주의사항

1. **절대 커밋 금지**: 실제 .env 파일
2. **템플릿만 커밋**: .env.*.template 파일
3. **권한 확인**: 배포 시 600 권한 필수
4. **환경 분리**: 로컬/웹서버/API서버 명확히 구분
5. **정기 로테이션**: JWT_SECRET 등 주기적 변경

---

*작성일: 2025-08-17*
*환경: 로컬 개발*