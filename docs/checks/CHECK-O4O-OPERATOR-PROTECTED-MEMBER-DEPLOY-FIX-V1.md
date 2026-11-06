# Operator 회원 보호 배포 보완 CHECK V1

2026-11-06 · 원 PR #950 · 최초 main `dd83d30d29688dcd79f5532bdf4317c738b04a91`.

Promote `42150033748`는 API·admin·Neture·파트너·약국 사업·강의·매장 배포를 완료했으나 분회 Docker build에서 실패했다. 분회 manifest가 요구하는 `@o4o/operator-ux-core`의 manifest와 source가 Docker의 선별 COPY에서 빠져 있었다. 기존 types/ui는 이미 복사·빌드하며 해당 패키지는 source-mode이므로 두 COPY만 추가한다. frozen lockfile·무결성 검증·Node 22.23.4·기존 proxy CA secret·TLS 검증을 유지한다.

## 문서 정합

새 기능이나 정책을 추가하는 작업이 아니라 PR #950의 누락된 production build 소비처를 보완한다. 기존 회원 보호·단일 검토·조직 경계 정본은 유지한다. 데이터 migration·seed·IAM·배포 방식 변경은 없다. 이미 성공한 서비스는 재배포하지 않고 serving→target 판정에서 분회만 선택한다. 최종 실행·서빙 증거는 통합 기록에 보존한다.

## 검증

Node 22.23.4의 실제 production Docker build PASS. 빌드 secret으로 CA를 전달하고 frozen lockfile·store integrity·TLS 검증을 유지했다. 완성 이미지를 격리 기동해 `/`, `/kpa/`, HTML이 참조하는 `/kpa/assets/*.js` 200과 JS content-type을 확인했다. 테스트 컨테이너는 종료·제거했다. manifest·lockfile·버전·UI/API 소스 변경은 없다. 다른 세션의 작업공간은 보존한다.
