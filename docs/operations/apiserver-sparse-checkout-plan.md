# 🔗 O4O-APIServer Sparse-Checkout 및 GitHub 동기화 정비 계획

**작성일**: 2025-06-19
**대상 환경**: o4o-apiserver (Ubuntu Server)
**목표**: API 서버에 최적화된 sparse-checkout 및 GitHub 동기화 체계 구축

---

## 🎯 개요

- **목적**: o4o-apiserver 서버에서 불필요한 폴더/파일 동기화 방지 및 GitHub와의 효율적 연동
- **핵심 목표**:
  - services/api-server만 동기화 (main-site, ecommerce 등 제외)
  - scripts, 배포/운영에 필요한 설정 파일만 포함
  - node_modules 등 불필요한 산출물 제외
  - GitHub 원격 저장소와의 안전한 동기화 및 롤백 체계 마련

---

## 🛠️ 추진 방향 (개요)

1. **현황 진단**
   - 기존 sparse-checkout/동기화 설정 점검
   - 불필요 폴더/파일 동기화 여부 확인

2. **최적화 패턴 설계**
   - API 서버 전용 sparse-checkout 패턴 정의
   - 예시: services/api-server, scripts, package.json 등만 포함

3. **자동화 스크립트 준비**
   - health-check, selective-sync, auto-setup-server 등 활용
   - 서버별 자동화 적용 방안 수립

4. **GitHub 동기화 체계 강화**
   - 안전한 pull/push, 충돌/롤백 대응 프로세스 정립
   - GitHub Actions 등 자동화 연계 검토

5. **문서화 및 팀 공유**
   - 적용 절차, 복구 방법, 체크리스트 등 문서화
   - 팀원 대상 공유 및 피드백 수렴

---

## 📋 다음 단계 (예시)

- [ ] 1. 서버 현황 점검 및 백업
- [ ] 2. sparse-checkout 최적 패턴 적용
- [ ] 3. 자동화 스크립트 테스트 및 개선
- [ ] 4. GitHub 동기화 프로세스 검증
- [ ] 5. 문서화 및 팀 공유

---

*이 문서는 o4o-apiserver 동기화 정비의 개요 계획서입니다. 실제 적용 및 결과는 추후 업데이트 예정입니다.* 