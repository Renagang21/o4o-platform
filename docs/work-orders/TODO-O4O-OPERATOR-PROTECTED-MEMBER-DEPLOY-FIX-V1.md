# Operator 회원 보호 배포 보완 TODO V1

- 원 작업: PR #950, main `dd83d30d29688dcd79f5532bdf4317c738b04a91`
- 근거: Promote `42150033748`에서 API와 6개 웹은 성공, kpa-branch 이미지 빌드는 실패했다.
- 원인: 새 `@o4o/operator-ux-core` workspace 의존성이 분회 manifest·lockfile에는 있으나 Docker의 선택 복사 목록에 빠졌다.
- 범위: Docker manifest/source 복사만 보완. Node 22·frozen install·TLS·배포 gate·IAM·DB·애플리케이션 정책 유지.

## 작업

- [x] 실패 단계·의존성 closure·Docker 복사 목록 대조
- [x] operator-ux-core manifest/source COPY 추가 (types/ui 기존 closure 재사용, 별도 build 불필요한 source-mode)
- [x] 실제 production Docker 빌드·정적 이미지 기동/asset 경로 확인
- [ ] PR CI·Codex·Sonar 확인 후 main 병합
- [ ] 분회만 표준 Promote로 재배포·서빙 검증
- [ ] 원 작업의 약국협업체 frontend-only 배포 및 최종 HTTP 점검 마무리
