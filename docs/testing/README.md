# O4O Platform 테스트 가이드

> 🧪 테스트 전략 및 체크리스트

---

## 📋 테스트 문서

### 일반 테스트
- **[테스트 가이드](./test-guide.md)** - 전체 테스트 전략 및 방법론

### 기능별 테스트
- **[드롭쉬핑 테스트 체크리스트](./dropshipping-test-checklist.md)** - 드롭쉬핑 기능 QA
- **[SlideApp QA 체크리스트](./m5-slideapp-qa-checklist.md)** - 슬라이드 앱 품질 검증

---

## 🎯 테스트 레벨

### 1. 단위 테스트 (Unit Tests)
```bash
# 전체 단위 테스트 실행
pnpm test

# 특정 패키지 테스트
pnpm test --filter @o4o/auth-client
```

### 2. 통합 테스트 (Integration Tests)
```bash
# API 통합 테스트
pnpm test:integration
```

### 3. E2E 테스트 (End-to-End)
```bash
# Playwright E2E 테스트
pnpm test:e2e
```

---

## ✅ 배포 전 체크리스트

### 코드 품질
- [ ] 린트 통과 (`pnpm run lint`)
- [ ] 타입 체크 통과 (`pnpm run type-check`)
- [ ] 단위 테스트 통과 (`pnpm test`)
- [ ] 코드 리뷰 완료

### 기능 테스트
- [ ] 주요 사용자 플로우 테스트
- [ ] 새 기능 동작 확인
- [ ] 회귀 테스트 (기존 기능 정상 작동)
- [ ] 브라우저 호환성 확인

### 성능 테스트
- [ ] Lighthouse 점수 확인 (>90점)
- [ ] 번들 크기 확인
- [ ] API 응답 시간 확인

### 보안 테스트
- [ ] 인증/인가 테스트
- [ ] XSS/CSRF 방어 확인
- [ ] 환경 변수 보안 확인

---

## 🔗 관련 문서

- **개발 문서**: [../development/README.md](../development/README.md)
- **배포 가이드**: [../deployment/README.md](../deployment/README.md)
- **문제 해결**: [../troubleshooting/README.md](../troubleshooting/README.md)

---

**마지막 업데이트**: 2025-10-31
