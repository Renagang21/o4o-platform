# 웹서버 .gitignore 검토 결과

## 🔍 현재 .gitignore 분석

### ⚠️ 문제점 발견

1. **논리적 오류**: 132-140번 라인
   - 제목: "API서버 전용 제외 항목"
   - 내용: 프론트엔드 앱들 (main-site, admin-dashboard 등)
   - **문제**: API서버가 아닌 **프론트엔드 앱들을 제외**하고 있음
   - **영향**: 웹서버에서 필요한 프론트엔드 앱들이 Git에서 제외됨

2. **웹서버 관련 파일 제외** (142-145번 라인)
   - `*.webserver.*` 패턴으로 웹서버 파일 제외
   - `ecosystem.config.webserver.cjs` 제외
   - **문제**: 웹서버 설정 파일들이 Git 추적에서 제외됨

## 🛠️ 수정 필요 사항

### 1. 132-140번 라인 수정
```gitignore
# API서버 관련 앱 제외 (웹서버에서 불필요)
apps/api-server/
apps/api-gateway/
```

### 2. 142-145번 라인 제거 또는 수정
- 웹서버 설정 파일들은 Git에서 추적되어야 함
- `.rsyncignore.webserver`는 Git에 포함되어야 함
- `ecosystem.config.webserver.cjs`도 Git에 포함되어야 함

## 📝 권장 .gitignore 구조 (웹서버용)

```gitignore
# === 환경별 제외 항목 ===

# API 서버 관련 (웹서버에서 불필요)
apps/api-server/.env
apps/api-server/.env.*
apps/api-gateway/.env
apps/api-gateway/.env.*

# 로컬 환경 파일 (서버별로 다름)
.env
.env.local
.env.production

# === 유지해야 할 파일 (제외하지 않음) ===
# !.rsyncignore.webserver
# !ecosystem.config.webserver.cjs
# !.env.webserver.example
```

## ⚠️ 주의사항

현재 .gitignore가 **잘못 설정**되어 있어:
1. 프론트엔드 앱들이 Git에서 제외됨
2. 웹서버 설정 파일들이 Git에서 제외됨

이는 **Git 동기화 시 심각한 문제**를 일으킬 수 있습니다.

## 🎯 즉시 조치 필요

1. .gitignore 132-145번 라인 수정
2. Git 상태 확인 (`git status`)
3. 제외된 파일들 다시 추가 필요 시 처리