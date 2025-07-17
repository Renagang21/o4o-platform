# SSH 및 배포 권한 문제 해결 가이드

## 🔒 SSH 권한 문제

### 에러 메시지
```
ubuntu@***: Permission denied (publickey).
Error: Process completed with exit code 255.
```

### 해결 방법

#### 1. GitHub Secrets 설정 확인
GitHub 리포지토리에서 다음 시크릿들이 올바르게 설정되어 있는지 확인:

```
Settings → Secrets and variables → Actions
```

필요한 시크릿:
- `APISERVER_SSH_KEY`: 서버의 SSH 개인키 (전체 내용)
- `APISERVER_HOST`: 서버 IP 주소
- `APISERVER_USER`: SSH 사용자명 (예: ubuntu)

#### 2. SSH 키 생성 및 등록
서버에서 SSH 키를 생성하고 authorized_keys에 등록:

```bash
# 서버에서 실행
ssh-keygen -t rsa -b 4096 -C "github-actions@o4o-platform"

# 공개키를 authorized_keys에 추가
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

# 권한 설정
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# 개인키 내용 복사 (이걸 GitHub Secret에 등록)
cat ~/.ssh/id_rsa
```

## 📁 디렉토리 권한 문제

### 에러 메시지
```
mkdir: cannot create directory '/var/www/admin.neture.co.kr': Permission denied
```

### 해결 방법

#### 1. 디렉토리 생성 및 권한 설정 (서버에서 실행)

```bash
# root 또는 sudo 권한으로 실행
sudo mkdir -p /var/www/admin.neture.co.kr
sudo mkdir -p /var/www/main.neture.co.kr
sudo mkdir -p /var/www/api.neture.co.kr

# 소유자를 배포 사용자로 변경
sudo chown -R ubuntu:ubuntu /var/www/admin.neture.co.kr
sudo chown -R ubuntu:ubuntu /var/www/main.neture.co.kr
sudo chown -R ubuntu:ubuntu /var/www/api.neture.co.kr

# 권한 설정
sudo chmod -R 755 /var/www/admin.neture.co.kr
sudo chmod -R 755 /var/www/main.neture.co.kr
sudo chmod -R 755 /var/www/api.neture.co.kr
```

#### 2. Nginx 설정 확인

```bash
# Nginx 설정 파일 확인
sudo nano /etc/nginx/sites-available/admin.neture.co.kr

# 예시 설정
server {
    listen 80;
    server_name admin.neture.co.kr;
    root /var/www/admin.neture.co.kr;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/admin.neture.co.kr /etc/nginx/sites-enabled/

# Nginx 재시작
sudo nginx -t
sudo systemctl restart nginx
```

## 🔧 GitHub Actions 워크플로우 수정

### deploy-admin-dashboard.yml 수정 예시

```yaml
- name: Deploy to server
  uses: appleboy/ssh-action@v1.2.0
  with:
    host: ${{ secrets.APISERVER_HOST }}
    username: ${{ secrets.APISERVER_USER }}
    key: ${{ secrets.APISERVER_SSH_KEY }}
    script: |
      # 디렉토리가 없으면 생성 (sudo 없이)
      mkdir -p /var/www/admin.neture.co.kr
      
      # 파일 복사
      scp -r ./dist/* /var/www/admin.neture.co.kr/
      
      # 권한 설정
      chmod -R 755 /var/www/admin.neture.co.kr
```

## 📝 체크리스트

- [ ] SSH 개인키가 GitHub Secrets에 올바르게 등록됨
- [ ] 서버의 authorized_keys에 공개키가 등록됨
- [ ] 배포 디렉토리가 생성되고 올바른 권한이 설정됨
- [ ] 배포 사용자(ubuntu)가 디렉토리 소유자임
- [ ] Nginx 설정이 올바르게 구성됨
- [ ] 방화벽에서 필요한 포트(80, 443)가 열려있음

## 🚀 테스트 방법

로컬에서 SSH 연결 테스트:

```bash
# GitHub Actions와 동일한 방식으로 테스트
ssh -o StrictHostKeyChecking=no ubuntu@YOUR_SERVER_IP "echo 'SSH 연결 성공!'"
```

성공하면 GitHub Actions도 동작할 것입니다.