# Cloud Run Deployment Guide

## Problem Solved
Windows 환경에서 `gcloud run deploy --source .` 실행 시 발생하는 ZIP 타임스탬프 오류를 회피하기 위해,
최소한의 파일만 포함한 독립적인 배포 폴더를 구성.

## 배포 구조

```
cloud-deploy/
└── cosmetics-api/
    ├── Dockerfile          # Cloud Run 빌드용
    ├── .dockerignore       # 불필요 파일 제외
    ├── .env.example        # 환경변수 예시
    ├── package.json        # 의존성 정의
    ├── package-lock.json   # 의존성 잠금 (npm install로 생성됨)
    ├── README.md           # 문서
    └── src/
        └── main.js         # 서버 엔트리포인트
```

## 배포 순서

### 1. 배포 폴더로 이동
```powershell
cd C:\Users\sohae\o4o-platform\cloud-deploy\cosmetics-api
```

### 2. node_modules 삭제 (배포 전 필수)
```powershell
# PowerShell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# 또는 CMD
rmdir /s /q node_modules
```

### 3. Cloud Run 배포 (기본)
```powershell
gcloud run deploy cosmetics-api `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated
```

### 4. Cloud SQL 연결 포함 배포
```powershell
gcloud run deploy cosmetics-api `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --add-cloudsql-instances neture-services:asia-northeast3:neture-db `
  --set-env-vars "DB_HOST=/cloudsql/neture-services:asia-northeast3:neture-db,DB_NAME=neture,DB_USER=neture_admin"
```

### 5. DB 비밀번호 설정 (Secret Manager 사용)

#### Secret 생성
```powershell
# 비밀번호를 Secret Manager에 저장
echo YOUR_DB_PASSWORD | gcloud secrets create cosmetics-db-password --data-file=-

# 또는 파일에서 읽기
gcloud secrets create cosmetics-db-password --data-file=password.txt
```

#### Service에 Secret 연결
```powershell
gcloud run services update cosmetics-api `
  --region asia-northeast3 `
  --set-secrets "DB_PASSWORD=cosmetics-db-password:latest"
```

## Cloud SQL 연결 정보

| 항목 | 값 |
|------|-----|
| 프로젝트 | neture-services |
| 인스턴스 | neture-db |
| 리전 | asia-northeast3 |
| Unix Socket | /cloudsql/neture-services:asia-northeast3:neture-db |
| 데이터베이스 | neture |
| 사용자 | neture_admin |

## 환경변수

| 변수 | 설명 | 예시값 |
|------|------|--------|
| NODE_ENV | 실행 환경 | production |
| PORT | 서버 포트 | 8080 (Cloud Run 기본) |
| DB_HOST | DB 호스트 | /cloudsql/neture-services:asia-northeast3:neture-db |
| DB_NAME | DB 이름 | neture |
| DB_USER | DB 사용자 | neture_admin |
| DB_PASSWORD | DB 비밀번호 | (Secret Manager에서 주입) |

## 필수 GCP 설정

### Cloud SQL Admin API 활성화
```powershell
gcloud services enable sqladmin.googleapis.com
```

### Service Account 권한 확인
Cloud Run 서비스 계정에 다음 역할 필요:
- `Cloud SQL Client` (roles/cloudsql.client)

```powershell
# 기본 서비스 계정 확인
gcloud iam service-accounts list

# 권한 부여 (PROJECT_NUMBER@appspot.gserviceaccount.com 형식)
gcloud projects add-iam-policy-binding neture-services `
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" `
  --role="roles/cloudsql.client"
```

## 배포 확인

### 서비스 URL 확인
```powershell
gcloud run services describe cosmetics-api --region asia-northeast3 --format="value(status.url)"
```

### 로그 확인
```powershell
gcloud run services logs read cosmetics-api --region asia-northeast3 --limit=50
```

### 헬스체크
```powershell
curl https://YOUR_SERVICE_URL/health
```

## 문제 해결

### ZIP 타임스탬프 오류
- 반드시 `cloud-deploy/cosmetics-api` 폴더에서만 배포
- `node_modules` 폴더 삭제 후 배포
- 불필요한 파일이 없는지 확인

### Cloud SQL 연결 실패
1. Cloud SQL Admin API 활성화 확인
2. 인스턴스명 정확히 확인: `neture-services:asia-northeast3:neture-db`
3. 서비스 계정 권한 확인 (Cloud SQL Client)
4. DB 사용자/비밀번호 확인

### 배포 타임아웃
```powershell
gcloud run deploy cosmetics-api `
  --source . `
  --region asia-northeast3 `
  --timeout=600 `
  ...
```

## 확장

다른 서비스 추가 시:
1. `cloud-deploy/` 아래 새 폴더 생성
2. 동일 구조로 Dockerfile, package.json, src/ 구성
3. 서비스별 독립 배포
