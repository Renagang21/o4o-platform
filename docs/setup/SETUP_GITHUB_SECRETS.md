# GitHub Secrets 설정 가이드

## 🔐 GitHub Actions 자동 배포를 위한 SSH 키 설정

### 현재 상황
- ✅ GitHub Actions 워크플로우 생성 완료
- ❌ SSH 키가 GitHub Secrets에 설정되지 않음
- ❌ 자동 배포 실패: "can't connect without a private SSH key"

### 필요한 GitHub Secrets

1. **API_SERVER_SSH_KEY**
   - API 서버 (43.202.242.215) 접속용 SSH 개인키
   - 현재 위치: `~/.ssh/o4o_api_key`

2. **WEB_SERVER_SSH_KEY**
   - 웹 서버 (13.125.144.8) 접속용 SSH 개인키
   - 현재 위치: `~/.ssh/o4o_web_key_correct`

### 설정 방법

#### 1단계: SSH 키 내용 복사
```bash
# API 서버 키 내용 확인
cat ~/.ssh/o4o_api_key

# 웹 서버 키 내용 확인
cat ~/.ssh/o4o_web_key_correct
```

#### 2단계: GitHub에서 Secrets 추가

1. GitHub 리포지토리 접속
   https://github.com/Renagang21/o4o-platform

2. Settings 탭 클릭

3. 왼쪽 메뉴에서 "Secrets and variables" → "Actions" 클릭

4. "New repository secret" 버튼 클릭

5. API 서버 키 추가:
   - Name: `API_SERVER_SSH_KEY`
   - Secret: (API 서버 SSH 개인키 전체 내용 붙여넣기)
   - "Add secret" 클릭

6. 웹 서버 키 추가:
   - Name: `WEB_SERVER_SSH_KEY`
   - Secret: (웹 서버 SSH 개인키 전체 내용 붙여넣기)
   - "Add secret" 클릭

### 중요 사항

⚠️ **주의**: 
- SSH 키의 전체 내용을 복사해야 합니다 (-----BEGIN RSA PRIVATE KEY----- 부터 -----END RSA PRIVATE KEY-----까지)
- 줄바꿈도 그대로 유지되어야 합니다
- Secret은 한 번 저장하면 내용을 다시 볼 수 없습니다
- 키를 잘못 입력한 경우, Secret을 삭제하고 다시 생성해야 합니다

### 설정 완료 후

1. GitHub Actions 페이지에서 실패한 워크플로우 재실행:
   https://github.com/Renagang21/o4o-platform/actions

2. 또는 새로운 커밋을 푸시하면 자동으로 배포가 시작됩니다

### 현재 제공된 SSH 키

이미 로컬에 저장된 SSH 키가 있습니다:
- API 서버: `~/.ssh/o4o_api_key`
- 웹 서버: `~/.ssh/o4o_web_key_correct`

이 키들을 GitHub Secrets에 등록하면 자동 배포가 작동합니다.