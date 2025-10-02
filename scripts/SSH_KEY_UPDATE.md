# SSH 키 업데이트 가이드

## 다른 작업 환경에서 SSH 키 업데이트하기

Web 서버의 SSH 키가 변경되었을 때 다른 작업 환경에서 업데이트하는 방법입니다.

### 방법 1: 자동 업데이트 스크립트 사용

```bash
# 1. 저장소 pull (최신 스크립트 받기)
git pull origin main

# 2. 업데이트 스크립트 실행
./scripts/update-ssh-keys.sh

# 3. 프롬프트에 따라 새 키 파일 설치
```

### 방법 2: 수동 업데이트

1. **기존 키 백업**
```bash
mv ~/.ssh/o4o_web_key ~/.ssh/o4o_web_key.backup
```

2. **새 SSH 키 설치**
```bash
# 새로운 web 키를 ~/.ssh/o4o_web_key에 복사
cp /path/to/new/web/key ~/.ssh/o4o_web_key
chmod 600 ~/.ssh/o4o_web_key
```

3. **SSH config 확인**
```bash
# ~/.ssh/config 파일에서 Web Server 섹션 확인
Host o4o-web web-server
    HostName 13.125.144.8
    User ubuntu
    IdentityFile ~/.ssh/o4o_web_key  # 이 경로가 맞는지 확인
```

4. **연결 테스트**
```bash
ssh o4o-web "echo 'Connection successful'"
```

### GitHub Actions 업데이트

GitHub Actions에서도 키를 업데이트해야 한다면:

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `WEB_SSH_KEY` secret 찾기
3. 새로운 키 내용으로 업데이트

### 문제 해결

**연결 실패 시:**
```bash
# 권한 확인
ls -la ~/.ssh/o4o_web_key
# 출력이 -rw------- 이어야 함

# 권한 수정
chmod 600 ~/.ssh/o4o_web_key

# 상세 디버그
ssh -vvv o4o-web
```

**Permission denied 오류:**
- 키 파일 권한이 600인지 확인
- 올바른 키 파일을 사용하는지 확인
- 서버에서 해당 키가 authorized_keys에 등록되어 있는지 확인

### 현재 키 정보

- **API Server**: `~/.ssh/o4o_api_key` (변경 없음)
- **Web Server**: `~/.ssh/o4o_web_key` (새로 변경됨)

변경 일자: 2025-10-02
