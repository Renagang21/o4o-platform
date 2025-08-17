# 📋 API서버 필수 환경변수 목록

## 🔐 필수 환경변수 (Required)

### 1. 서버 기본 설정
- `NODE_ENV`: 실행 환경 (development/production/test)
- `SERVER_TYPE`: 서버 타입 (apiserver 고정)
- `PORT`: API 서버 포트 (기본: 3001)

### 2. 데이터베이스 (PostgreSQL)
- `DB_HOST`: 데이터베이스 호스트
- `DB_PORT`: 데이터베이스 포트
- `DB_USERNAME`: 데이터베이스 사용자명
- `DB_PASSWORD`: 데이터베이스 비밀번호 ⚠️
- `DB_NAME`: 데이터베이스 이름

### 3. 보안 및 인증
- `JWT_SECRET`: JWT 토큰 서명 키 ⚠️
- `JWT_REFRESH_SECRET`: 리프레시 토큰 서명 키 ⚠️
- `SESSION_SECRET`: 세션 암호화 키 ⚠️

### 4. CORS 설정
- `CORS_ORIGIN`: 허용된 오리진 (콤마 구분)

## 📌 선택적 환경변수 (Optional)

### 5. 이메일 서비스
- `EMAIL_HOST`: SMTP 서버 주소
- `EMAIL_PORT`: SMTP 포트
- `EMAIL_USER`: 이메일 계정
- `EMAIL_PASS`: 이메일 비밀번호 ⚠️

### 6. 소셜 로그인 (OAuth)
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 시크릿 ⚠️
- `FACEBOOK_APP_ID`: Facebook 앱 ID
- `FACEBOOK_APP_SECRET`: Facebook 앱 시크릿 ⚠️
- `KAKAO_CLIENT_ID`: 카카오 클라이언트 ID
- `KAKAO_CLIENT_SECRET`: 카카오 시크릿 ⚠️
- `NAVER_CLIENT_ID`: 네이버 클라이언트 ID
- `NAVER_CLIENT_SECRET`: 네이버 시크릿 ⚠️

### 7. Redis 캐시
- `REDIS_HOST`: Redis 호스트
- `REDIS_PORT`: Redis 포트
- `REDIS_PASSWORD`: Redis 비밀번호 ⚠️

### 8. 파일 업로드
- `UPLOAD_MAX_SIZE`: 최대 업로드 크기 (bytes)
- `UPLOAD_ALLOWED_TYPES`: 허용 파일 타입
- `UPLOAD_DIR`: 업로드 디렉토리 경로

### 9. 로깅
- `LOG_LEVEL`: 로그 레벨 (debug/info/warn/error)
- `LOG_DIR`: 로그 파일 저장 경로

### 10. 모니터링
- `MONITORING_ENABLED`: 모니터링 활성화 여부
- `HEALTH_CHECK_PATH`: 헬스체크 엔드포인트

## 🚫 제거된 환경변수 (웹서버 관련)

다음 환경변수들은 API서버에서 제거되었습니다:
- `VITE_*`: Vite 빌드 관련
- `NEXT_PUBLIC_*`: Next.js 관련
- `STATIC_FILES_PATH`: 정적 파일 경로
- `NGINX_*`: Nginx 설정 관련

## 📝 사용 예시

```bash
# .env.apiserver 파일 생성
cp apps/api-server/.env.apiserver.example apps/api-server/.env.apiserver

# 권한 설정 (중요!)
chmod 600 apps/api-server/.env.apiserver

# 환경변수 편집
nano apps/api-server/.env.apiserver
```

## ⚠️ 보안 주의사항

1. **권한 설정**: 모든 .env 파일은 반드시 600 권한
2. **Git 제외**: .gitignore에서 확인
3. **백업**: 중요 환경변수는 별도 보관
4. **주기적 변경**: 시크릿 키는 주기적으로 변경

---

*최종 업데이트: 2025-08-17*
*환경: API Server (43.202.242.215)*