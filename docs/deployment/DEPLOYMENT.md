# 🚀 O4O Platform - 자동 배포 시스템

## 📋 개요
완전 자동화된 CI/CD 파이프라인으로 `git push`만으로 배포가 완료됩니다.

## 🔄 배포 프로세스

### 자동 배포 흐름
```
1. 로컬 개발 & 테스트
   ↓
2. git push origin main
   ↓
3. GitHub Actions 트리거
   ↓
4. Actions에서 빌드 (안정적인 환경)
   ↓
5. 빌드된 파일 압축 & 서버 전송
   ↓
6. 서버에서 자동 배포
   ↓
7. 사이트 업데이트 완료 ✅
```

## 🎯 사용 방법

### 배포하기
```bash
# 변경사항 커밋
git add .
git commit -m "feat: 새 기능 추가"

# 배포 (이것만 하면 끝!)
git push origin main
```

### 배포 상태 확인
- **GitHub Actions**: https://github.com/Renagang21/o4o-platform/actions
- **사이트 버전**: https://admin.neture.co.kr/version.json
- **라이브 사이트**: https://admin.neture.co.kr

## ⚙️ 시스템 구성

### GitHub Actions (`build-and-deploy.yml`)
- **빌드 환경**: Ubuntu Latest, Node.js 22.18.0
- **패키지 매니저**: pnpm v10
- **빌드 최적화**:
  - 의존성 캐싱
  - 4GB 메모리 할당
  - Source map 비활성화

### 서버 구성
- **웹서버**: admin.neture.co.kr
- **웹 서버**: Nginx
- **배포 경로**: `/var/www/admin.neture.co.kr`
- **백업**: 최근 3개 버전 자동 유지

## 🔍 문제 해결

### 배포가 안 될 때
1. GitHub Actions 로그 확인
2. 빌드 에러가 있는지 확인
3. SSH 키가 올바른지 확인 (GitHub Secrets)

### 변경사항이 안 보일 때
1. 브라우저 캐시 클리어 (Ctrl+F5)
2. `/version.json` 확인하여 최신 버전인지 체크
3. CloudFlare 캐시 purge (필요시)

## 📊 모니터링

### 배포 성공 확인
```bash
# 버전 정보 확인
curl https://admin.neture.co.kr/version.json

# 응답 예시
{
  "version": "1756961257",
  "commit": "abc1234",
  "build": "123456789"
}
```

### 성능 지표
- **평균 빌드 시간**: 2-3분
- **평균 배포 시간**: 30초
- **다운타임**: 0 (무중단 배포)

## 🔐 보안

### GitHub Secrets 설정
- `WEB_HOST`: 서버 호스트명
- `WEB_USER`: SSH 사용자명
- `WEB_SSH_KEY`: SSH 프라이빗 키

### 서버 권한
- 배포 사용자: `ubuntu`
- 웹 서버 사용자: `www-data`
- 자동 권한 설정 적용

## 📈 개선 사항

### 현재 시스템의 장점
✅ **완전 자동화**: 수동 작업 불필요
✅ **안정적 빌드**: GitHub Actions 환경
✅ **빠른 배포**: 빌드된 파일만 전송
✅ **자동 백업**: 롤백 가능
✅ **무중단 배포**: 다운타임 없음

### 향후 개선 계획
- [ ] Blue-Green 배포
- [ ] 자동 롤백 기능
- [ ] Slack 알림 통합
- [ ] 성능 테스트 자동화

## 📝 주의사항

1. **main 브랜치만 자동 배포됨**
2. **빌드 실패시 배포 중단**
3. **서버 디스크 공간 확인 필요**
4. **환경변수는 GitHub Actions에서 관리**

---

**Last Updated**: 2025-09-04
**Version**: 2.0.0 (Fully Automated)