# 📋 VS Code SFTP 배포 가이드

## 1️⃣ VS Code 확장 프로그램 설치

1. VS Code 열기
2. 확장 프로그램 (Ctrl+Shift+X) 열기
3. "SFTP" 검색
4. **"SFTP" by Natizyskunk** 설치 (가장 인기 있는 것)
   - 또는 **"SFTP/FTP sync" by liximomo** 설치

## 2️⃣ SSH 키 설정 (Windows/Mac/Linux)

### Windows (PowerShell)
```powershell
# SSH 키 생성
ssh-keygen -t rsa -b 4096 -f C:\Users\%USERNAME%\.ssh\id_rsa

# 공개키 확인
type C:\Users\%USERNAME%\.ssh\id_rsa.pub
```

### Mac/Linux
```bash
# SSH 키 생성
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

# 공개키 확인
cat ~/.ssh/id_rsa.pub
```

## 3️⃣ 서버에 SSH 키 등록

공개키를 복사한 후 서버에 등록:
```bash
# 서버 접속 (비밀번호 사용)
ssh ubuntu@admin.neture.co.kr

# authorized_keys에 추가
echo "복사한_공개키_내용" >> ~/.ssh/authorized_keys
```

## 4️⃣ SFTP 사용법

### 빌드 후 배포
1. 로컬에서 빌드:
   ```bash
   pnpm run build:packages
   pnpm run build:admin
   ```

2. VS Code에서:
   - `Ctrl+Shift+P` → "SFTP: Upload Folder"
   - `apps/admin-dashboard/dist` 선택
   - 업로드 대상: `/var/www/admin.neture.co.kr`

### 단축키 설정
- `Ctrl+Alt+U`: 현재 파일 업로드
- `Ctrl+Alt+D`: 현재 파일 다운로드
- `Ctrl+Alt+S`: 폴더 동기화

## 5️⃣ 자동 배포 스크립트

`.vscode/sftp.json` 설정 완료 후 사용:

```bash
# 로컬에서 실행
npm run build:admin && echo "Build complete. Use SFTP to upload dist folder"
```

## 6️⃣ 주의사항

1. **절대 업로드하지 말아야 할 것들**:
   - `node_modules/` 폴더
   - `.env` 파일들
   - `package-lock.json`, `pnpm-lock.yaml`
   - 소스코드 (`.ts`, `.tsx` 파일)

2. **업로드해야 하는 것**:
   - `apps/admin-dashboard/dist/*` 내용만
   - 빌드된 정적 파일들만

3. **배포 순서**:
   1. 로컬에서 빌드
   2. 빌드 성공 확인
   3. SFTP로 dist 폴더 내용만 업로드
   4. 브라우저에서 확인

## 7️⃣ 문제 해결

### SFTP 연결 실패
- SSH 포트가 22번이 맞는지 확인
- 방화벽 확인
- SSH 키 권한 확인 (600)

### 파일 업로드 실패
- 서버 디스크 공간 확인
- 파일 권한 확인
- sudo 권한 필요한 경우

### 빌드 파일이 반영되지 않음
- 브라우저 캐시 강제 새로고침 (Ctrl+F5)
- Nginx 재시작 필요할 수 있음

## 8️⃣ 추천 워크플로우

1. **개발**: 로컬에서 `pnpm run dev:admin`
2. **테스트**: 로컬에서 충분히 테스트
3. **빌드**: `pnpm run build:admin`
4. **배포**: VS Code SFTP로 dist 폴더 업로드
5. **확인**: https://admin.neture.co.kr 접속 확인

---

💡 **팁**: 
- SFTP 확장의 "Upload on Save" 기능은 빌드 파일에는 사용하지 마세요
- 수동으로 빌드 후 의도적으로 업로드하는 것이 안전합니다
- 백업을 위해 기존 파일을 먼저 다운로드하는 것도 좋습니다