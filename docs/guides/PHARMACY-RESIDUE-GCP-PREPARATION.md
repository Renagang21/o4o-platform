# 약국 앱 잔재 정리를 위한 GCP 환경 준비

> **상태**: ACTIVE
> **작성일**: 2026-10-26 · **최종 갱신**: 2026-10-26
> **근거 WO/IR**: [WO-O4O-PHARMACY-RESIDUE-SAFE-CLEANUP-V1](../work-orders/WO-O4O-PHARMACY-RESIDUE-SAFE-CLEANUP-V1.md)

## 설정표 입력값

| 변수 | 값 | 근거 |
|---|---|---|
| GOOGLE_CLOUD_PROJECT | netureyoutube | deploy-web-services.yml PROJECT_ID |
| GOOGLE_CLOUD_REGION | asia-northeast3 | deploy-web-services.yml REGION |

일반 환경변수이며 자격증명이 아니다. 명령에는 `--project`·`--region`을 명시한다. GOOGLE_CLOUD_REGION은 이 작업의 설정 이름이며 모든 SDK가 자동으로 읽는 공통 리전 설정은 아니다.

## 현재 확인 상태

관리 환경의 명시적인 GCP outbound identity 연결과 OIC manifest의 connections는 비어 있었고 gcloud CLI는 없었다. GOOGLE_APPLICATION_CREDENTIALS 변수는 있지만 의도한 GCP 계정의 인증·권한은 확인되지 않았다. 자격증명 파일 내용은 읽지 않았다.

프로젝트·리전 제안값과 아래 API 도메인은 환경 설정 초안에 저장했다. 초안 저장은 현재 실행 환경 적용·인증 연결·게시 완료를 뜻하지 않는다. 기존 install_script/start_skill·GitHub·패키지 레지스트리 허용 목록은 보존했다.

## 기존 GitHub Actions 경로

`gcp-wif-auth-smoke.yml`의 읽기 전용 실행 40257349330이 성공했다. 기존 GitHub Actions는 WIF로 GCP를 인증하며 Cloud SDK를 제공한다. 이 경로를 사용하는 배포 작업은 현재 셸의 직접 GCP 인증 연결 없이도 진행할 수 있다. LB 전환·새 서비스 IAM 등의 권한은 기존 배포 권한과 별도로 확인해야 한다. 아래 환경 보완은 현재 셸에서 직접 조회·작업하려는 경우에 적용한다.

## 보완 순서

1. 환경 설정에서 Google Cloud outbound identity를 연결한다. 지원되는 Workload Identity Federation 또는 지정 서비스 계정 impersonation을 사용하고 연결 alias·프로젝트를 명확히 한다.
2. 먼저 읽기 전용 조사 권한을 구성한다. 프로젝트 범위 `roles/run.viewer`·`roles/compute.viewer`, 이미지 조회 시 `roles/artifactregistry.reader`를 기준으로 실제 조회에 필요한 권한만 부여한다. 프로젝트 메타데이터·할당량 프로젝트·impersonation 권한은 실제 방식과 대상 서비스 계정에 맞춰 별도로 확인한다. Owner/Editor를 기본 권한으로 부여하지 않는다.
3. Google 공식 설치 절차로 gcloud CLI를 설치하고 `gcloud version`을 확인한다. 서명/체크섬·TLS 검증을 유지한다. 이미 제공되는 SDK가 생기면 우선 사용한다.
4. 환경 설정에서 프로젝트·리전·네트워크 변경을 검토·저장하고 환경을 게시한다. 새 환경에서 최신 environment_status와 실제 OIC_MANIFEST_PATH manifest를 다시 확인한다.
5. 해당 GCP connection의 manifest에서 config_dir·configuration_name·credentials_file을 선택해 명령에 CLOUDSDK_CONFIG·CLOUDSDK_ACTIVE_CONFIG_NAME·GOOGLE_APPLICATION_CREDENTIALS를 적용한다. alias를 추측하거나 다른 provider의 기본 identity를 사용하지 않는다. 토큰·자격증명 내용을 출력하지 않는다.
6. 다음 읽기 명령으로 실제 접근을 검증한다. 단순 변수 등록·계정 목록 존재만으로 준비 완료라 하지 않는다.

```sh
gcloud version
gcloud run services describe kpa-society-web \
  --project=netureyoutube --region=asia-northeast3 \
  --format='value(metadata.name,status.latestReadyRevisionName)'
gcloud compute url-maps list --project=netureyoutube --format='value(name)'
```

운영 조회 원문·비밀정보를 공개 문서에 복사하지 않고 연결 관계·검증 결과만 요약한다.

### 네트워크 대상

- `run.googleapis.com`, `asia-northeast3-run.googleapis.com`
- `compute.googleapis.com`, `cloudresourcemanager.googleapis.com`
- `serviceusage.googleapis.com`, `artifactregistry.googleapis.com`
- `iam.googleapis.com`, `iamcredentials.googleapis.com`
- `sts.googleapis.com`, `oauth2.googleapis.com`

기존 `dl.google.com`·패키지 설치·GitHub 접근을 유지한다. 도메인 허용은 IAM 권한 부여와 별개다. 실제 endpoint 거부는 필요한 호스트를 확인해 설정에 반영한다.

### GCP Cloud Shell 또는 전용 VM을 사용하는 경우

Cloud Shell에는 gcloud CLI가 제공된다. 프로젝트를 위 값으로 지정하고 해당 로그인 계정의 실제 읽기 권한을 확인한 뒤 같은 조회 명령을 사용할 수 있다. 전용 VM에서는 의도한 서비스 계정과 ADC를 구성하고 권한을 검증한다. 이 경우 Codex 관리 환경 전용 OIC manifest 선택 단계를 그대로 요구하지 않는다. 이미지 빌드는 Cloud Build 등 별도 빌드 환경에서 수행한다. Cloud Build 실행·배포 권한은 읽기 조사 권한과 분리해 실제 필요한 시점에 구성한다.

## Docker 빌드 환경

현재 관리 환경의 Docker vfs driver는 레이어마다 파일을 복제한다. Neture의 의존 설치 후 COPY 단계에서 filesystem inode 한도 2,097,152개를 소진했다. 빌드는 실패했고 해당 빌드 캐시를 정리해 복구했다.

전체 이미지 재검증은 기존 GitHub Actions 빌드 환경 또는 별도로 준비한 Cloud Build/빌드 머신에서 수행한다. 별도 머신은 Docker가 지원하는 효율적인 snapshotter와 충분한 디스크·inode 용량을 갖춰야 한다. 현재 공유 daemon의 driver를 바꾸거나 재시작해 복구하지 않는다. 환경의 실제 용량·driver·가용 inode를 먼저 확인하고 같은 vfs 조건에서 동일 빌드를 반복하지 않는다.

## GCP 연결 후 조사·전환

- 실제 pharmacy·megapharm 등 사용 중인 host → URL map → backend → serverless NEG → Cloud Run·revision·이미지 연결과 현재 트래픽을 조사한다.
- Cloud Run은 제자리 rename이 되지 않는다. 새 기술 이름과 소비처를 확정하고 같은 검증 SHA로 새 서비스를 만든 뒤 LB를 전환하는 계획을 작성한다.
- runtime service account·ingress·env/secret 참조·invoker IAM·최소 인스턴스·label을 검토한다. 기존 GitHub 배포 계정은 새 서비스의 최초 IAM 설정 권한이 없을 수 있다.
- 디렉터리·package·이미지·CI matrix·rollout registry·CORS·run.app 참조와 raw-source 테스트를 함께 갱신한다. 무조건 배포를 제외하는 예외는 넣지 않는다.
- 신규 readiness·호스트·JS asset·실제 로그인·390/1440px 검증과 옛 경로 트래픽 0 확인 뒤 정리한다. 문제 시 이전 LB backend로 복구한다.
- 정확한 변경·삭제 대상과 복구 조건을 확정하고 승인 범위를 확인한 뒤 옛 Cloud Run·이미지·NEG를 삭제한다.

## 환경 준비만으로 해결되지 않는 것

`kpa-society` 키는 DB·JWT·membership·역할·콘텐츠 범위에 연결돼 있다. 사업 이름으로 일괄 치환하거나 새 사업별 서비스 키를 만들지 않는다. 기존 약국 사업 독립 WO의 D1/D5에 따라 공통 계정 `neture`와 `semi_franchises` 사업 원장으로 정렬하는 전환 설계가 먼저 필요하다. 데이터 건수·법적 보존·기존 세션·API 소비처를 조사해 migration/데이터 정리 대상을 구체화하고 승인 범위를 확인한다.
