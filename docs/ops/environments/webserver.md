# 🌐 웹서버 필수 환경변수 목록

## 📋 환경변수 현황

### ✅ 생성된 파일
- `.env.webserver` - 웹서버 전용 환경변수 (chmod 600)
- `.env.webserver.example` - 예제 파일

### ❌ 제거된 파일
- `apps/api-server/.env` - API서버 파일 (웹서버에 불필요)
- `apps/api-server/.env.production` - API서버 프로덕션 파일

## 🔑 필수 환경변수

### 1. 서버 기본 설정
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `NODE_ENV` | 실행 환경 | `production` |
| `SERVER_TYPE` | 서버 타입 | `webserver` |
| `PORT` | 웹서버 포트 | `3000` |

### 2. API 서버 연결
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `VITE_API_URL` | Vite용 API URL | `http://43.202.242.215:3001` |
| `API_BASE_URL` | 기본 API URL | `http://43.202.242.215:3001` |

### 3. 정적 파일 서빙
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `STATIC_FILES_PATH` | 정적 파일 경로 | `/home/ubuntu/o4o-platform/public` |
| `UPLOAD_DIR` | 업로드 디렉토리 | `/home/ubuntu/o4o-platform/uploads` |

### 4. PM2 설정
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `PM2_APP_NAME` | PM2 앱 이름 | `o4o-webserver` |
| `PM2_INSTANCES` | PM2 인스턴스 수 | `2` |

### 5. 로그 설정
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `LOG_LEVEL` | 로그 레벨 | `info` |
| `LOG_DIR` | 로그 디렉토리 | `/home/ubuntu/o4o-platform/logs` |

### 6. 보안 설정
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `CORS_ORIGIN` | CORS 허용 도메인 | `https://neture.co.kr` |
| `SESSION_SECRET` | 세션 시크릿 | `[보안값-변경필요]` |

### 7. 캐시 설정
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `CACHE_ENABLED` | 캐시 활성화 | `true` |
| `CACHE_TTL` | 캐시 TTL (초) | `3600` |

### 8. 모니터링
| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `MONITORING_ENABLED` | 모니터링 활성화 | `false` |
| `HEALTH_CHECK_PATH` | 헬스체크 경로 | `/health` |

## 🔒 보안 권한

```bash
# 모든 .env 파일 권한 설정
chmod 600 .env.webserver

# 확인
ls -la .env*
```

## ⚠️ 주의사항

1. `.env.webserver` 파일은 Git에 포함되지 않음
2. 실제 운영 시 `SESSION_SECRET` 변경 필수
3. API 서버 주소 변경 시 `VITE_API_URL` 업데이트 필요
4. PM2 재시작 시 환경변수 재로드 필요

## 📝 사용 방법

```bash
# 환경변수 로드 후 PM2 시작
source .env.webserver
pm2 start ecosystem.config.webserver.cjs

# 또는 PM2 설정에서 직접 참조
pm2 start ecosystem.config.webserver.cjs --env-file .env.webserver
```