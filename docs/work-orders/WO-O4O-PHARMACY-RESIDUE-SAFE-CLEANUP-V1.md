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
- [ ] GCP 실제 연결 조사와 Cloud Run/LB 전환: 명시적인 GCP identity 연결·CLI·운영 인벤토리 필요.
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
