# 약국 앱 잔재의 안전한 정리와 GCP 전환 준비

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

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

기존 #817은 선언 의존성과 불필요 배포 경로를 수정했다. 이번 작업은 기존 CHECK가 남긴 Docker 복사 잔재를 제거한다. manifest·lockfile·역할·route·권한·서비스 키는 바꾸지 않는다. 운영 중인 pharmacy·drugstore 앱을 삭제하지 않는다.

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
- PR #828은 main `792b3d0f6e`에 병합했고 main CI 40262900391이 통과했다. 읽기 전용 인벤토리 40262910814에서 실제 연결을 확인했다: `pharmacy.neture.co.kr` 및 `drugstore.neture.co.kr` → `o4o-global-lb` → `backend-kpa-society-web` → `neg-kpa-society-web` → `kpa-society-web`. 기존 서비스는 삭제 가능한 미사용 자원이 아니다.
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


## PR #829 Sonar 중복 해소 — 동일 WO 연속 Phase

사용자가 전달한 Sonar 신규 코드 목록에서 2,358행이 모두 이동한 약국 앱 아래에 있었다. 주요 대상은 web-store와 복제된 API 클라이언트 6개, theme/Tailwind, LoadingSpinner, 영상·블록 변환이었다. 단순 이름 이동으로 기존 사본이 신규 코드 중복으로 드러났다. 단, 분석기가 과거 이력을 어떤 방식으로 처리했는지는 단정하지 않는다.

### TODO·구현

- [x] 두 앱의 동일 구현과 서비스별 차이를 TypeScript 선언 단위로 대조.
- [x] 동일 API 타입·메서드를 store-ui-core의 subpath client factory로 옮기고 두 앱 모두 채택. asset library의 franchise 필터·부가 응답, 다국어 콘텐츠의 Store 응답 검증, 화면 저장 시 조직 헤더 캡처 등 차이는 각 어댑터에 유지.
- [x] 서비스 주소·인증·요청을 앱에서 주입. PH의 기존 401 1회 refresh JSON transport는 공통 구현 하나로 사용하고, Store의 별도 인증·응답 검증은 그대로 둔다. 공개 kiosk의 Store credentials=omit/cache=no-store와 약국의 기존 fetch 옵션을 각각 유지.
- [x] 두 앱의 테마·spinner·Tailwind 토큰·블록 변환을 공통화. 앱별 Tailwind content 배열은 보존. 영상 변환은 tablet-kiosk-core로 옮기고 idle 변환에서도 같은 ID 추출을 사용하되 공개/idle URL 옵션은 분리 유지.
- [x] 공통화로 역방향 서비스 import나 새 서비스 키를 만들지 않음. store-ui-core에 이미 세 소비 앱의 closure에 있던 tablet-kiosk-core 타입 의존 하나만 명시. 새 외부 의존 버전·snapshot 변경 없음. block-renderer/API/Admin에는 이번 공통화 runtime 변경 없음.
- [ ] PR #829 최종 HEAD의 CI·Codex·Sonar 재확인 후 정상 병합·main CI·현재 Delivery 정책에 따른 배포 및 실제 serving SHA 확인.

### Shared Module Change Verification

| 소비처 | 검증 |
|---|---|
| 약국 앱 | tsc+Vite build PASS, Vitest 148 PASS |
| Store | tsc build+Vite build PASS, Vitest 77 files / 851 PASS |
| Neture | tsc+Vite build PASS, Vitest 151 files / 1,313 PASS |
| store-ui-core | Vitest 9 files / 145 PASS(새 동작 계약 21개) |
| API raw-source·서비스 경계 소비 계약 | Jest 35 suites / 903 PASS |

새 계약은 refresh 1회/재거절/403/네트워크 오류, 조직·기기 헤더와 쓰기 payload, 요청 시점 서비스 전환, 공개 kiosk 쿠키 정책, API 오류 전달·localProducts 보존, 영상 공개/idle 옵션, 블록 왕복과 attributes fallback을 실제 함수로 확인한다. 패키지 소스만 바꿨다는 이유로 한 앱의 테스트로 끝내지 않았다.

Sonar 제외 범위·중복률 기준·merge gate는 변경하지 않는다. 상세 조회의 기존 CloudFront 403과 별개로 GitHub Checks의 새 실제 결과로 통과 여부를 판정한다. 운영 DB·IAM·LB·기존 Cloud Run 삭제는 이 단계에서 수행하지 않는다.


### main #830 통합 시 공통 클라이언트 계약 보존

main `68268d19f6`의 Store 콘텐츠 저장 보완과 assetSnapshot 경로가 겹쳤다. 이동 전 파일로 되돌리지 않고 공통 `DirectContentItem.revision` 및 `directContentApi.update.expectedRevision`에 upstream의 선택 필드를 반영한다. 어댑터는 공통 구현을 계속 사용한다. revision payload 전달·응답 보존 회귀를 추가하고 최신 main 기준 Store 빌드·테스트와 리뷰를 다시 확인한다. upstream API 변경의 배포 상태는 자신의 변경과 구분하고 공유 운영 배포는 직렬화한다.

최신 main 병합 후 재검증: Store build PASS · Vitest 79 files/863 PASS, store-ui-core 146 PASS(추가 revision 계약1개 포함). 로컬 실제 빌드의 로그인 화면 390/1440px × 약국/Store 4건은 JS 예외0·가로 넘침0이다. API를 모두 가로챈 anonymous 화면 smoke이며 운영 로그인·OAuth 성공으로 보고하지 않는다.


### Sonar 잔여 4.5% 후속 정리

Sonar check 121412078613(HEAD 741c1ba241)은 19.7% → 4.5%로 감소했으나 기준3%에는 미달했다. 사용자 추가 목록의 잔여614행을 기준으로 QR export/landing 타입·메서드, 자료함 feed 타입·메서드, 상품 빠른 편집의 동일 field section, 공개/인쇄 콘텐츠 파서를 추가 공통화한다.

- QR은 앱별 base/token provider를 주입하며 요청마다 읽는다. PH 상품 요약 타입은 base interface 확장으로 남기고, 파일 내보내기의 blob·UTF-8 filename·fallback·오류·다운로드 정리는 공통 구현을 쓴다.
- 자료함은 기본 source 타입을 유지하고 Store의 franchise/business 필터와 부가 응답 타입만 확장한다. PH가 business 필터를 보내도록 바꾸지 않는다.
- 상품 편집의 공유 범위는 동일 section 두 개뿐이다. Store의 read/write 경합 방지·저장 잠금·취소 정책·재시도 및 각 앱의 grid/fieldset은 wrapper에 유지한다.
- 공개/인쇄 콘텐츠는 동일 순수 파서만 공유한다. 페이지별 조회 effect, CTA, 인쇄, QR 크기(200/160)는 그대로다.
- 재검증: PH build/148 tests PASS · Store build/863 tests PASS · store-ui-core150 tests PASS · API 계약35 suites/903 tests PASS · 변경 파일 ESLint 오류0. 추가 계약4개가 QR 동적 문맥/토큰·파일명/실패, business filter 확장, 공개 파서/QR 규격을 검증한다. 최종 Sonar 통과는 새 HEAD의 실제 결과를 기다린다.


### Sonar 3.1% 마무리 · 타 공간 삭제 보존

HEAD `847c4a7640`의 CI Gate는 PASS였으나 Sonar는 신규 중복3.1%(기준3%)로 실패했다. 공개/인쇄 페이지의 중복된 asset 조회 상태를 공통 `usePublishedAsset` 훅으로 추출한다. 식별자/응답/오류 메시지 및 공개 화면의 reload 로딩 표시와 인쇄 화면의 기존 표시 차이를 유지하고, 인쇄 effect·렌더·QR 규격은 페이지에 남긴다.

사용자가 타 공간에서 수행했다고 확인한 약국 앱 파일100개 삭제는 복구·stage·commit 하지 않는다. 이번 단계 전후 삭제 경로 목록이 동일한 것을 확인했다. 해당 로컬 checkout에는 앱 전체 build 입력이 없으므로 전체 앱 빌드 재실행으로 PASS를 주장하지 않는다. 새 훅6개 계약 테스트·isolated strict type-check·변경 파일 ESLint는 PASS이며, 전체 빌드/회귀는 의도적 로컬 삭제를 포함하지 않은 GitHub clean checkout의 CI로 확인한다.
