# 🚀 원클릭 자동 배포 설정 가이드

## 한 번만 설정하면 끝!

### 1️⃣ 웹서버에서 SSH 키 생성 (1회만)
```bash
ssh ubuntu@admin.neture.co.kr
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_deploy  # 이 내용을 복사
```

### 2️⃣ GitHub에 SSH 키 등록 (1회만)
1. https://github.com/Renagang21/o4o-platform/settings/secrets/actions
2. "New repository secret" 클릭
3. Name: `SSH_PRIVATE_KEY`
4. Value: 위에서 복사한 키 내용 붙여넣기
5. "Add secret" 클릭

### 3️⃣ 완료! 

이제 `git push origin main` 하면:
- ✅ 자동으로 빌드
- ✅ 자동으로 배포
- ✅ 자동으로 백업
- ✅ 자동으로 Nginx 재시작

## 📊 작동 방식
```
[로컬 개발] 
    ↓ git push
[GitHub] 
    ↓ Actions 트리거
[자동 빌드 & 배포]
    ↓ 
[사이트 업데이트 완료]
```

## 🔍 배포 상태 확인
- GitHub Actions: https://github.com/Renagang21/o4o-platform/actions
- 사이트: https://admin.neture.co.kr

## ⏱️ 소요 시간
- 전체 프로세스: 약 2-3분
- Push 후 사이트 반영까지: 3분 이내

---
**더 이상 수동 배포는 없습니다!** 그냥 push만 하세요 🎉