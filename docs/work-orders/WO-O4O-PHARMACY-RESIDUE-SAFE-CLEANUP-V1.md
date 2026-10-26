# 약국 앱 잔재의 안전한 정리와 GCP 전환 준비

> **상태**: ACTIVE
> **작성일**: 2026-10-26 · **최종 갱신**: 2026-10-26
> **근거 WO/IR**: 사용자 제거 진행·환경 보완 요청, WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 단계 6

## 범위·TODO

- [x] 최신 main `59abadb4b2`에서 Docker COPY와 실제 workspace 의존 closure 대조.
- [x] 약국 앱의 hub-core/utils, Neture의 operator-core 미사용 manifest/source COPY 총 6줄 제거.
- [x] 두 앱의 필수 workspace package 복사 누락 0·초과 0 확인(각 18개·21개).
- [x] 기존 CI·배포 판정 회귀: 282 PASS.
- [x] Docker 이미지 빌드 시도·실패 원인 확인·이번 빌드 캐시 정리.
- [x] 프로젝트·리전·인증·CLI·네트워크·빌드 환경 준비 조건 문서화.
- [x] 기존 GitHub Actions GCP WIF 읽기 인증 검증: run 40257349330 SUCCESS.
- [ ] Cloud Run/LB 전체 연결 조사·이름 전환: 현재 셸의 직접 GCP 접근과 기존 GitHub Actions 인증 경로를 구분하고 필요한 자원별 권한을 확인한다.
- [ ] 디렉터리·패키지·Cloud Run 새 기술 이름 확정과 소비처 일괄 전환.
- [ ] 서비스 키 정리: 공통 계정(neture)·사업 원장 경계에 맞춘 별도 데이터/세션 전환 검토.

## 구현 경계

기존 #817은 선언 의존성과 불필요 배포 경로를 수정했다. 이번 작업은 기존 CHECK가 남긴 Docker 복사 잔재를 제거한다. manifest·lockfile·역할·route·권한·서비스 키는 바꾸지 않는다. 운영 중인 pharmacy·megapharm 앱을 삭제하지 않는다.

Dockerfile 변경은 기존 deploy-risk의 LEVEL_3 대상이다. 이번 결과는 개발 branch에 검증·push하며, 운영 배포·리소스 삭제는 미실행이다. 소스 변경이 없어도 실제 이미지 빌드가 완료되기 전에는 이미지 검증 완료로 보고하지 않는다.

## Shared Module Change Verification

| 소비처 | 변경 | 검증 결과 |
|---|---|---|
| web-kpa-society(현행 약국 앱) | closure 밖 hub-core·utils COPY 제거 | 필수 workspace package 18개 복사 유지, 초과 0 |
| web-neture | closure 밖 operator-core COPY 제거 | 필수 workspace package 21개 복사 유지, 초과 0 |
| Lecture·Store·KPA 분회 | 소스·manifest·이미지 설정 변경 없음 | 기존 배포 판정·freeze·SHA·CI gate 회귀 포함 |
| CI workflow·raw-source 계약 | Dockerfile 경로 유지 | 파일 경로 literal-consumer 조사; 기존 deploy 계열 테스트 |

- `node --test` 기존 detect-affected/deploy-risk/deploy-orchestrate/deploy-workflow-diff/deploy-workflow-gates: **282 PASS**.
- 실제 dependencyClosure와 Docker COPY 비교: 두 앱 모두 누락 0·초과 0.
- Neture Docker 빌드: **환경 한계로 실패**. 의존 설치는 통과했으나 vfs 레이어 복제 중 inode 2,097,152개가 소진됐다. 빌드 중 필요한 package가 없다는 오류가 아니었다.
- 기본 Buildx 설정 경로가 읽기 전용이어서 `BUILDX_CONFIG=/tmp/pharmacy-residue-buildx`로 보완했고 기존 Docker registry 설정·TLS 검증은 유지했다.
- 이번 빌드에서 생성된 미사용·비공유 캐시 57개를 ID로 한정해 정리했다. inode 사용률 100% → 6%로 복구. 저장소·컨테이너·볼륨·다른 작업의 캐시는 삭제하지 않았다. daemon 재시작·storage driver 변경도 하지 않았다.
- 앱 코드·UI·DB 변경 없음. 새 브라우저/DB 테스트는 미실행이며 이미지 빌드는 적절한 빌드 환경에서 재검증해야 한다.

## 환경·운영 잔여

[GCP 준비 안내](../guides/PHARMACY-RESIDUE-GCP-PREPARATION.md)에 설정표, 초기 읽기 권한, 실제 접근 확인 명령, Cloud Run/LB 전환·복구 순서를 기록한다. 기존 CHECK의 과거 시점 기록은 유지한다. 환경 준비만으로 사업 식별·데이터 전환 문제가 해결되는 것은 아니다.


## 통합 진행

사용자의 직접 진행 지시에 따라 기존 GitHub Actions 인증·배포 경로로 PR 검증·main 통합·통제 배포를 진행한다. 현재 셸의 gcloud/identity 부재가 기존 GitHub Actions 배포 경로의 부재를 뜻하지 않는다. 최신 main의 Partner 변경을 정상 merge하고 기존 배포 판정 282개를 다시 통과했다. 동시에 실행 중인 다른 작업의 운영 배포가 끝난 뒤 해당 SHA의 실제 서비스별 영향을 확인해 순차 배포한다. 새로운 운영 DB 변경·IAM/LB 변경이나 현재 서비스 삭제를 이 기록만으로 실행하지 않는다.


## 운영 인벤토리 선택 실행

기존 `gcp-wif-auth-smoke.yml`에 기본 false인 `pharmacy_inventory` 입력을 추가했다. owner·production ref·기존 WIF 주체는 그대로다. 명시 실행 시 약국 앱의 서비스/이미지/트래픽, URL map→backend→serverless NEG 연결 메타데이터만 조회한다. env 값·secret version·DB·IAM 주체 목록은 조회하지 않는다. 조회 오류를 숨기지 않으며 새 IAM 권한을 스스로 부여하지 않는다. 실제 인벤토리 결과는 main 반영 후 이 입력으로 검증한다.

## 실제 운영 인벤토리 조회 보완

- 동일 WO의 연속 Phase로 기존 작업 branch를 유지한다. PR #826은 main `7e9c1c99d6`에 반영됐다.
- 실행 40260257433은 인증과 Cloud Run/LB/NEG의 읽기 조회에 성공했다. Cloud Run은 `kpa-society-web-02290-keq`에 트래픽100%를 확인했다.
- 다만 gcloud의 반복 필드에 대한 최초 projection은 URL map/backend의 하위 연결을 반환하지 않고 이름만 반환했다. 이를 전체 연결 확인 완료로 취급하지 않는다.
- 후속 수정은 URL map/backend의 상위 필드를 받아 표준 Python formatter에서 필요한 routing/group 필드만 whitelist 출력한다. description·header 값 등의 자유문은 제외하고, 대상 LB/backend의 필수 하위 필드가 없으면 실패한다.
- formatter 5 tests PASS: 하위 연결·weighted backend 참조 보존, 불필요한 필드 제외, 불완전 응답 거절, notice round-trip/크기 제한, 입력 형태 검증. 실제 연결 재확인은 main 반영 후 같은 선택 입력으로 실행한다.

- 추가 사전 점검은 기존 WIF ADC를 Google-auth SDK로 사용해 프로젝트 `testIamPermissions`만 호출한다. 토큰 출력·IAM policy 주체 목록 조회·역할 부여는 하지 않는다. 신규 서비스·LB 전환에 필요한 project 범위 권한의 확인/미확인 목록을 출력한다. 이 결과는 resource 조건부·개별 리소스 권한 검증을 대체하지 않는다. formatter5개와 권한 응답 검증2개, 총7개 Python 테스트가 통과했다.


## 연속 Phase: 앱 디렉터리·패키지 이름 전환

이 절은 앞 절의 실행 당시 기록을 대체하지 않고 이후 결과를 추가한다. 같은 WO의 연속 Phase로 기존 branch를 유지한다.

- PR #826은 main `7e9c1c99d6`에 병합했고 Promote 40261699942에서 Neture와 약국 앱의 이미지 빌드·smoke·트래픽 전환이 성공했다. 두 공개 도메인의 HTML과 주 JS asset은 200이다. 전체 production 상태의 Partner LEVEL_3 hold는 별개이며 해제하지 않았다.
- PR #828은 main `792b3d0f6e`에 병합했고 main CI 40262900391이 통과했다. 읽기 전용 인벤토리 40262910814에서 실제 연결을 확인했다: `pharmacy.neture.co.kr` 및 `megapharm.neture.co.kr` → `o4o-global-lb` → `backend-kpa-society-web` → `neg-kpa-society-web` → `kpa-society-web`. 기존 서비스는 삭제 가능한 미사용 자원이 아니다.
- 기술 이름을 `services/web-pharmacy-business`, `@o4o/web-pharmacy-business`로 정한다. 119개 tracked 앱 파일을 이동하고 Docker·pnpm importer·CI matrix·영향도 detector·테스트의 실제 파일 경로와 현행 안내 링크를 함께 전환한다. 신규 사업 서비스 키를 만드는 변경이 아니다.
- 소비처 0인 workflow `VITE_KPA_URL`을 제거한다. Cloud Run/이미지/배포 선택 키와 API serviceKey·JWT·membership·역할은 이번 단계에서 유지한다. 일반 소스의 과거 출처 주석과 과거 WO/CHECK는 사실 기록으로 남기므로 KPA literal 전체 0건을 완료 기준으로 삼지 않는다.
- lockfile은 pnpm으로 재생성한 뒤 무관한 peer snapshot 변경을 제외했다. YAML 구조 비교로 importer 키 이동 외 dependency·snapshot 변경 0을 확인했고 frozen 설치를 다시 통과했다.
- 권한 사전 점검은 regional serverless NEG에 맞게 `compute.regionNetworkEndpointGroups.*`를 사용한다. zonal `compute.networkEndpointGroups.*` 결과로 regional 권한을 판정하지 않는다. global/regional operation 조회도 확인한다.

### Shared Module Change Verification — 경로 소비처

- shared runtime의 동작·export를 바꾸지 않는다. comment-only 공통 런타임 파일 14개는 원문 유지했다. 변경된 공통 패키지 테스트와 다른 프런트의 상대 import는 이동한 파일의 실제 경로를 가리킨다.
- 관련 workspace package 빌드와 약국 앱 `tsc + vite build`: PASS. frozen 설치: PASS.
- 약국 앱 Vitest: 20 files / 148 tests PASS. 변경 경로 소비 API Jest: 21 suites / 505 tests PASS.
- 변경된 공통 패키지(auth-client/auth-react/operator-core-ui/shared-space-ui) 및 Neture 경로 소비 테스트: 모두 PASS.
- CI/deploy Node 회귀: 283 PASS. 인벤토리 formatter·권한 응답·regional NEG 계약 Python: 8 PASS.
- DB 접속·migration·seed·IAM 부여·LB 변경·기존 서비스 삭제는 수행하지 않았다. 새 경로의 CI 이미지 빌드·정상 통합·통제 배포는 아래 후속 실행 결과로 확인한다.

### 남은 운영 기술명 전환

프로젝트 `netureyoutube`, 리전 `asia-northeast3`의 기존 WIF로 읽기와 기존 서비스 배포는 가능하다. 프로젝트 범위 사전 조회에서 신규 backend create/get/update 및 Cloud Run setIamPolicy는 확인되지 않았다. 조건부 리소스 권한 여부는 별도 확인해야 한다. regional NEG 권한은 수정된 점검을 main 반영 후 재조회한다. 신규 서비스·NEG/backend 준비와 최초 공개 invoker 설정, LB 전환·복구 검증을 완료하기 전 기존 활성 자원을 삭제하지 않는다. 기존 WIF에 Owner/Editor를 부여하는 방식으로 해결하지 않는다.


### 배포 범위 재검증 보완

이동 diff의 옛 경로가 workspace에 없어서 전체 서비스 unknown fallback을 만드는 것을 발견했다. 옛 디렉터리는 모든 현행 Docker/빌드 소비처에서 제거됐으므로 기존 퇴역 경로 목록에 정확한 prefix로 등록한다. 새 `web-pharmacy-business` 경로는 현행 registry와 dependency graph에서 계속 배포 판정하며, 새 경로·옛 경로가 함께 있는 이동도 약국 앱만 영향받는다. 미지의 workspace fallback, 실제 API 변경과 LEVEL_3 auth 통제는 유지한다. 경로 소비처 0·옛 manifest 부재 및 위 경계를 회귀 시험으로 확인한다. 이는 약국 앱을 배포 대상에서 제외하는 예외가 아니다.
