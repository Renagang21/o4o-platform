# QR 공개 자료의 매장 소유 경계 수정

> 상태: ACTIVE
> 작성일: 2026-10-11 · 최종 갱신: 2026-10-11
> 근거: [잔여 업무 TODO](WO-O4O-STORE-REMAINING-WORKFLOW-VERIFICATION-V1.md)
> 범위: 공개 QR 자료 조회 경계 수정·회귀 검증·main 통합·운영 API 배포

## 문제와 변경

`resolvePublicQrLanding`의 `store_execution_assets` LEFT JOIN은 자료 ID와 활성 여부만 확인한다. 주석은 동일 매장 자료만 JOIN한다고 설명하지만 실제 SQL에 조직 일치 조건이 없어, 잘못된 논리 참조가 있으면 다른 매장의 제목·HTML·이미지 URL을 공개 QR 응답에 포함할 수 있다. 운영에서 잘못 연결된 행이나 실제 노출 사례를 조사·확인했다는 뜻은 아니다.

JOIN에 `li.organization_id = qr.organization_id`를 추가한다. QR과 동일 매장의 활성 자료만 반환하고 다른 매장의 자료는 LEFT JOIN 미일치로 null이 된다. QR 자체의 응답 및 정상 자료 표시·기존 비활성 차단·HEAD의 스캔 미기록은 유지한다. schema/migration·Core·권한/role 신설·route·API envelope·dependency·배포 workflow 변경은 없다. 기존 매장 소유 경계를 구현하는 최소 보정이다.

## TODO와 검증

- [x] 관련 canonical·현재 소스·TODO 조사
- [x] 회귀 테스트가 기존 SQL에서 실패하는지 확인 (1 FAIL/26 PASS)
- [x] 매장 소유 JOIN 조건 수정
- [x] QR·태블릿 focused 회귀: 6개 suite / 65개 PASS
- [x] 격리 PostgreSQL에서 현재 소스의 실제 공개 SELECT 검증: 4개 PASS
- [x] 현재 resolver/Core의 격리 원본·사본 독립성: 6개 PASS
- [x] 별도 CMS 계정 전제 수정 및 미실행 운영·기기 TODO 명시
- [x] 필수 PR CI·미해결 리뷰 확인·main 통합
- [x] main 사후 CI·CodeQL 확인
- [ ] Delivery WIF 인증 차단 해소 후 정상 배포·서빙 확인
- [ ] 배포 후 공개 read-only smoke·결과 문서 정합·자기 worktree 정리

실제 SQL 4개는 수정 전 조회의 타 매장 제목·본문·이미지 노출 재현, 수정 후 해당 필드 모두 차단, 같은 매장 활성 자료 표시, 비활성 자료 제외다. 현재 서비스 소스의 첫 SELECT를 그대로 추출해 임의 이름의 자기 로컬 DB에서 실행했으며 SQL을 별도로 복제한 fixture 조회로 검증하지 않았다. DDL 전에 control system identifier·backend/postmaster·socket/port를 검증했고 종료 시 자기 DB를 삭제했다. 운영 DB 쓰기는 없고 fixture 식별자는 비공개 실행 기록에만 보관한다.

회귀 명령:

```sh
pnpm --filter api-server exec jest --runInBand --runTestsByPath \
  src/services/store/__tests__/store-qr.service.test.ts \
  src/routes/o4o-store/controllers/__tests__/store-qr-landing.head.test.ts \
  src/__tests__/store-tablet-location-content-runtime.spec.ts \
  src/__tests__/kpa-my-store-tablet-runtime-contract.spec.ts \
  src/routes/platform/store-public/__tests__/store-public-tablet-content-resolve.test.ts \
  src/routes/platform/store-public/__tests__/store-public-tablet-screen.test.ts
```

원본·사본 도구는 `scripts/verification/store-copy-independence.local.mjs`이며 소스/서버 검증 경계는 부모 WO를 따른다. QR 실제 SQL 실행의 private helper·결과는 checkout 밖 `.o4o-tools/store-remaining-workflow`에 보관한다. 공개 문서에 실제 조직·계정·자료 ID·운영 응답을 넣지 않는다.

## 실행 환경과 열린 운영 조건

전용 worktree `/workspace/o4o-wt/store-remaining-workflow-closure`, branch `wo/store-remaining-workflow-closure`, base `cb85731ca940b5957068cfb46ab239ecbcd680d8`에서 작업한다. 기준 checkout 및 타 세션 worktree/branch는 변경하지 않는다. Node/pnpm은 SETUP의 pin을 사용하고 frozen lockfile 설치를 수행했다. 설치 cache/data 경로를 checkout 밖 workspace로 지정했으며 dependency/lockfile은 변경하지 않았다. 스크립트 설치 hook은 실행하지 않았고 이번 검증은 실제 TypeScript source를 사용했다.

사용자는 별도 CMS 운영자 계정이 없음을 확인했다. 현재 CMS mutation은 기존 `platform:super_admin` 또는 같은 서비스 `admin`/`operator` 권한을 사용하며 계정 종류를 새로 만들지 않는다. 현재 `docs/local/TEST-ACCOUNT.txt`가 작업·기준 checkout 및 이 환경의 타 worktree에 없으므로 운영 원본 편집 인증 검증은 실행하지 않았다. 사용자의 유지 매장 A 한 곳 조건은 그대로이며 두 번째 정상 업무 매장·연결된 물리 기기는 확인되지 않았다. 부모의 운영·기기 TODO는 유지한다.

## 배포

DEPLOYMENT = REQUIRED: API runtime 조회가 바뀌므로 main 통합만으로 완료하지 않는다. 현재 Delivery의 target·필수 CI·freeze·서빙 SHA 판정을 확인하고 정상 경로를 사용한다. 새 migration은 추가하지 않는다. LEVEL 3/HOLD 또는 새 누적 migration이 확인되면 현재 gate와 사용자 승인 범위를 대조하며 우회하지 않는다. 배포 완료·revision/health 확인은 실제 실행 결과로 갱신한다.

## main 통합과 결과 기록 Phase

PR [#483](https://github.com/Renagang21/o4o-platform/pull/483)의 head `8d07bb9462c15ae3435dbfbd46f90e3dac252d51`에서 필수 CI Pipeline 38141045320·CodeQL 38141045406이 성공했다. 자동 Codex review는 완료됐으며 finding·미해결 스레드 0을 확인했다. 실제 main ruleset의 CI Gate PASS·PR 필수 조건을 만족한 뒤 admin bypass 없이 normal merge했다. main commit은 `b4d428d606a6a9c29804b08c046a209b8880d843`다.

본 WO의 연속 결과 기록 Phase는 동일 worktree/branch를 사용한다. 통합 후 main 사후 CI 38141731196 및 실제 Delivery·서빙 결과를 확인하고 아래 기록을 갱신한다. code merge를 운영 배포 완료로 해석하지 않는다.

## 배포 실행과 확인된 차단

main 사후 CI 38141731196과 CodeQL 38141731191은 성공했다. 자동 Delivery [38142342005](https://github.com/Renagang21/o4o-platform/actions/runs/38142342005)는 같은 main commit에서 실행됐으나 Classify의 `Authenticate to Google Cloud` 단계에서 `unauthorized_client / rejected by the attribute condition`으로 실패했다. API build·migration·revision 배포·traffic 전환·Report는 모두 skip이다. production commit status는 만들어지지 않았으며 **운영 배포는 미완료**다.

이 작업은 WIF provider·OIDC 설정·배포 workflow를 변경하지 않았다. 같은 Delivery의 이전 run 38138235844는 2026-10-11 12:11 UTC에 WIF 인증이 성공했으며, 별도 read-only GCP WIF Auth Smoke 38141409234도 현재 같은 신원 조건 거절로 실패했다. 어떤 provider 조건이 달라졌는지는 현재 GCP 측 metadata를 읽지 못했으므로 확정하지 않는다. main에 해당 workflow 변경이 없다는 사실만으로 원인을 GitHub/GCP 중 하나로 단정하지 않는다.

GitHub OIDC subject 설정은 기본 subject이고 executor의 outbound identity manifest에는 connection이 0개다. inherited Google credential 변수와 경로의 존재는 관리자 접근 증거가 아니다. 실제 credential 파일 값은 읽거나 출력하지 않았다. 현재 provider metadata를 조회할 관리자 연결을 확인한 뒤 정확한 조건 불일치를 해결해야 하며, 다른 허용 workflow/새 키/완화된 조건으로 인증 경계를 우회하지 않는다. 설정 변경 없이 동일 인증 재실행도 하지 않았다.

배포 실패 후 TLS 검증을 유지한 무인증 HEAD smoke 3개는 PASS다: `/health/ready` 200, slug 없는 QR namespace 404 + read-only HEAD marker, 존재하지 않는 임의 QR slug 404 + marker/no-store. HEAD body는 모두 0 bytes이며 QR scan 쓰기를 요청하지 않았다. 이 결과는 기존 운영 서비스의 준비 상태·HEAD 계약 확인이지 새 QR 수정이 운영에 반영됐다는 증거가 아니다.

환경의 기존 install 설정은 유지하고, 사용한 workspace 내 pnpm cache/data 설정 및 이 차단·계정 기준을 start_skill draft에 저장했다. draft 저장은 환경 게시나 GCP provider 변경이 아니다. 이 WO는 배포 TODO 때문에 ACTIVE이며 자체 worktree/branch 판정은 KEEP이다. parent의 운영 원본 편집·두 업무 매장·물리 기기 TODO도 미완료다.
