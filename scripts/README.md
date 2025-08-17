# 📦 O4O Platform Scripts - 중앙집중화 스크립트 시스템

## 🎯 개요
3개 환경(로컬, 웹서버, API서버)을 위한 통합 스크립트 시스템입니다.
Phase 4.2의 일환으로 환경별 특화된 스크립트를 중앙에서 개발하여 동기화로 배포합니다.

## 🏗️ 구조
```
scripts/
├── common/                  # 공통 유틸리티
│   ├── detectEnvironment.cjs  # 환경 자동 감지
│   ├── workspaceConfig.cjs    # 워크스페이스 설정
│   └── logger.cjs             # 통합 로거
├── environments/            # 환경별 스크립트
│   ├── build.cjs           # 빌드 스크립트
│   ├── start.cjs           # 시작 스크립트
│   └── deploy.cjs          # 배포 스크립트
└── README.md               # 이 문서
```

## 🚀 사용법

### 환경 감지
```bash
# 현재 환경 확인
node scripts/common/detectEnvironment.cjs

# 워크스페이스 구성 확인
node scripts/common/workspaceConfig.cjs
```

### 빌드
```bash
# 현재 환경에 맞게 자동 빌드
node scripts/environments/build.cjs

# 특정 환경으로 빌드
BUILD_ENV=webserver node scripts/environments/build.cjs

# 클린 빌드
node scripts/environments/build.cjs --clean
```

### 시작
```bash
# PM2로 시작 (프로덕션)
node scripts/environments/start.cjs

# 개발 모드로 시작
node scripts/environments/start.cjs --dev

# 상태 확인
node scripts/environments/start.cjs --status
```

### 배포
```bash
# 기본 배포
node scripts/environments/deploy.cjs

# 강제 배포 (검사 무시)
node scripts/environments/deploy.cjs --force

# 자동 롤백 활성화
node scripts/environments/deploy.cjs --auto-rollback
```

## 🌐 환경별 특징

### 로컬 (local)
- **워크스페이스**: 13개 (전체)
- **역할**: 개발 및 소스 제공자
- **최적화**: 없음 (전체 스택)

### 웹서버 (webserver)
- **워크스페이스**: 9개
- **역할**: 프론트엔드 전용
- **최적화**: 31% 절감

### API서버 (apiserver)
- **워크스페이스**: 2개
- **역할**: 백엔드 전용
- **최적화**: 85% 절감

## 📝 주의사항

1. **package.json 분리 유지**: 환경별 package.json은 독립적으로 유지
2. **scripts/ 폴더만 동기화**: 스크립트만 중앙 관리
3. **환경 검증**: 배포 전 항상 환경 확인
4. **백업 필수**: 중요 변경 시 백업 생성

---

*Phase 4.2 Scripts Centralization*
*작성일: 2025년 8월*
