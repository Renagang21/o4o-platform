# 📋 [로컬] PM2 설정 최적화 리포트

## 🔍 현재 상황 분석

### PM2 설정 파일 현황 (4개)
| 파일명 | 크기 | 용도 | 상태 |
|--------|------|------|------|
| ecosystem.config.cjs | 671B | 기본 (프로덕션) | ✅ |
| ecosystem.config.local.cjs | 2.5KB → 3.2KB | 로컬 개발 | **🔄 개선됨** |
| ecosystem.config.webserver.cjs | 495B | 웹서버 전용 | ✅ |
| ecosystem.config.apiserver.cjs | 641B | API서버 전용 | ✅ |

---

## 🎯 로컬 환경 최적화 내역

### 1. 환경변수 통합
```javascript
// 이전: 하드코딩된 값
env: {
  NODE_ENV: 'development',
  PORT: 3001
}

// 이후: .env.local에서 로드
require('dotenv').config({ path: '.env.local' });
env: {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET
}
```

### 2. 메모리 최적화 (개발 환경)
| 설정 | 이전 | 이후 | 이유 |
|------|------|------|------|
| max_memory_restart | 없음 | 300M (API), 500M (Frontend) | 메모리 누수 방지 |
| node_args | 없음 | --max-old-space-size=256 | 힙 메모리 제한 |
| exec_mode | 없음 | fork | 로컬은 단일 프로세스 |
| instances | 없음 | 1 | 개발용 단일 인스턴스 |

### 3. 개발 편의 기능
```javascript
// Watch 모드 (API 서버만)
watch: process.env.NODE_ENV === 'development' ? ['./dist'] : false,
ignore_watch: ['node_modules', 'logs', '*.log'],

// 로그 통합
merge_logs: true,
time: true,  // 타임스탬프 추가

// 빠른 재시작
max_restarts: 3,  // 프로덕션(5) → 개발(3)
min_uptime: 5000,  // 프로덕션(10000) → 개발(5000)
kill_timeout: 5000  // 프로덕션(30000) → 개발(5000)
```

### 4. 앱 구성 수정
| 변경 사항 | 이유 |
|-----------|------|
| storefront → main-site | 실제 디렉토리명과 일치 |
| start:dev → ./dist/main.js | 빌드된 파일 직접 실행 |
| 로그 파일 경로 정리 | ./logs/ 디렉토리로 통일 |

---

## 📊 개선 효과

### 장점
1. ✅ **환경변수 중앙화**: .env.local 파일 하나로 관리
2. ✅ **메모리 효율**: 개발 환경에 맞는 낮은 메모리 설정
3. ✅ **개발 편의성**: Watch 모드, 빠른 재시작
4. ✅ **로그 관리**: 통합 로그, 타임스탬프
5. ✅ **유지보수**: 명확한 주석과 구조

### 비교표
| 항목 | 이전 | 이후 |
|------|------|------|
| 코드 라인 | 35줄 | 94줄 |
| 환경변수 관리 | 하드코딩 | .env.local 연동 |
| 메모리 관리 | 없음 | 최적화됨 |
| 개발 기능 | 기본 | Watch, 로그 등 |
| 문서화 | 최소 | 상세 주석 |

---

## 🚀 사용 방법

### 1. 환경변수 설정
```bash
# .env.local 파일 생성 (템플릿에서 복사)
cp .env.local.template .env.local
# 필요한 값 수정
vim .env.local
```

### 2. PM2 시작
```bash
# 로컬 개발 환경 시작
pm2 start ecosystem.config.local.cjs

# 또는 npm 스크립트 사용
npm run pm2:start:local
```

### 3. 관리 명령어
```bash
# 상태 확인
pm2 status

# 로그 보기
pm2 logs

# 재시작
pm2 restart o4o-api-local

# 중지
pm2 stop ecosystem.config.local.cjs
```

---

## ⚠️ 주의사항

1. **빌드 필요**: API 서버는 `npm run build:api` 후 실행
2. **포트 충돌**: 3001(API), 5173(Admin), 5174(Main) 확인
3. **로그 디렉토리**: `logs/` 디렉토리 자동 생성됨
4. **메모리 제한**: 개발 PC 사양에 따라 조정 필요

---

## 📝 추후 개선 사항

1. **개발/프로덕션 모드 전환**: NODE_ENV에 따른 자동 설정
2. **클러스터 모드**: 필요시 멀티 코어 활용
3. **모니터링**: PM2 Plus 연동 고려
4. **Docker 통합**: 컨테이너 환경 지원

---

*최적화 완료: 2025-08-17*
*환경: 로컬 개발*
*백업: ecosystem.config.local.cjs.backup*