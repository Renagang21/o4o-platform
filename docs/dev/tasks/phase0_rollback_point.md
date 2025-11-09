# Phase 0: 롤백 포인트 기록

**작성일**: 2025-11-09
**작업 브랜치**: stabilize/customizer-save

---

## 🔖 롤백 포인트 (main 브랜치)

### Git 정보
- **커밋 해시**: `e597024d61254af936bef3816c2abd3b214c2550`
- **커밋 메시지**: docs(customizer): Add refactor/reset plan and execution templates
- **브랜치**: main
- **작성일**: 2025-11-09

### 롤백 명령어
```bash
# 로컬 롤백
git checkout main
git reset --hard e597024d

# 또는 태그로 롤백 (v1 실패 시)
git checkout customizer-save-v0  # 작업 전 상태

# 배포 롤백
./scripts/deploy-admin-manual.sh  # Admin
ssh o4o-web "cd /home/ubuntu/o4o-platform && ./scripts/deploy-main-site.sh"  # Main Site
```

---

## 📊 현재 배포 상태

### Admin Dashboard
- **버전**: 2025.11.09-1710
- **빌드 시간**: 2025-11-09 08:10:19 UTC
- **URL**: https://admin.neture.co.kr
- **커밋**: c3a09e01 (sanitizeSettings 포함)

### Main Site
- **버전**: 1762676722
- **배포 시간**: 2025-11-09 08:25:22 UTC
- **URL**: https://neture.co.kr
- **커밋**: 9bbcb0de (Stage 1 Hotfix 포함)

### API Server
- **서버**: 43.202.242.215:4000
- **상태**: Running (PM2: o4o-api-server)
- **최근 커밋**: 5cc524bf (Media filter 포함)

---

## 🔧 배포 동결 범위

### 동결 대상 (48시간)
- ✋ Customizer 관련 코드 (`apps/admin-dashboard/src/pages/appearance/**`)
- ✋ 인증 관련 코드 (`**/AuthContext.tsx`, `@o4o/auth-client`)
- ✋ 프리뷰 관련 코드 (`SimpleCustomizer.tsx`, iframe 통신)

### 예외 (핫픽스 승인 시에만)
- 🆘 심각한 보안 취약점
- 🆘 서비스 중단 이슈
- 🆘 데이터 손실 위험

### 허용 작업
- ✅ 다른 기능 개발 (위젯, 대시보드 등)
- ✅ 문서 업데이트
- ✅ 테스트 코드 작성

---

## 📈 지표 베이스라인

### 현재 측정값 (Phase 0 시점)
- `/me` 호출 실패율: **측정 필요**
- 페이지 리로드 발생: **측정 필요**
- `customizer.save.success`: **측정 필요**
- `customizer.save.fail`: **측정 필요**
- Console 에러 건수: **측정 필요**

### 목표값 (v1 완료 시)
- `/me` 호출 실패율: 0% (상위창 기준)
- 페이지 리로드 발생: 0회
- `customizer.save.success`: 100%
- TypeError 발생: 0건

---

## 🗂️ 백업 자료

### DB 백업
- **경로**: (수동 백업 필요)
- **명령어**:
  ```bash
  # 설정 테이블 백업
  ssh o4o-api "pg_dump -t settings -U postgres o4o_platform > /tmp/settings_backup_20251109.sql"
  ```

### 로그 백업
- **Chrome DevTools Network 로그**: (Phase 1에서 수집)
- **Console 에러 로그**: (Phase 1에서 수집)
- **서버 로그**: (필요 시 수집)

---

## ✅ Phase 0 완료 기준

- [x] 브랜치 생성: stabilize/customizer-save
- [ ] 롤백 포인트 기록 완료
- [ ] 배포 동결 범위 문서화
- [ ] 베이스라인 지표 측정
- [ ] DB 백업 완료

---

**다음 단계**: Phase 1 - 인벤토리 작성
