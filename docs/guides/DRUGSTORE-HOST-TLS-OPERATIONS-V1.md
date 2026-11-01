# 드럭스토어형 약국 호스트·TLS 운영 준비

> **상태**: ACTIVE — 소유자 운영 안내; 권한 부여·호스트 전환 완료를 의미하지 않음
> **작성일**: 2026-11-01
> **관련 작업**: [WO](../work-orders/WO-O4O-DRUGSTORE-BRAND-DOMAIN-TRANSITION-V1.md) · [CHECK](../checks/CHECK-O4O-DRUGSTORE-BRAND-DOMAIN-TRANSITION-V1.md)

공식 호스트는 `drugstore.neture.co.kr`, 표시 이름은 **드럭스토어형 약국**이다. Codex 인터넷 허용·프로젝트/리전 변수는 Google Cloud IAM 권한을 대신하지 않는다. 운영 도구는 기존 GitHub Actions WIF 계정을 사용하며, 새 키·시크릿·로컬 GCP 로그인은 필요하지 않다.

## 소유자가 확인할 권한

현재 plan은 GCP GET 403으로 중단됐다. 인증·네트워크가 정상이라는 사실만으로 모든 GCP API 권한을 갖췄다고 판단하지 않는다. 아래는 해당 도구가 새로 사용하는 권한 집합이며 정확한 누락 항목은 소유자가 IAM·감사 로그에서 확인한다.

| 권한 | 목적 |
|---|---|
| `compute.targetHttpsProxies.list` | 고정 URL map을 사용하는 HTTPS proxy·인증서 map 연결 확인 |
| `certificatemanager.certmapentries.list` | 기존 새 호스트/wildcard 항목 확인 |
| `certificatemanager.certs.get` | 관리형 인증서 도메인·상태 확인 |
| `certificatemanager.certs.create` | 필요 시 고정 새 호스트 인증서 생성 |
| `certificatemanager.certs.use` | 생성한 인증서를 map entry에 연결 |
| `certificatemanager.certmapentries.create` | 필요 시 고정 새 호스트 map entry 생성 |
| `certificatemanager.operations.get` | 생성 작업 완료 확인 |

[공식 Certificate Manager 권한 문서](https://docs.cloud.google.com/certificate-manager/docs/permissions)의 map entry 생성에는 `certmapentries.create`와 연결할 인증서의 `certs.use`가 함께 필요하다. 기존 URL-map 조회/검증/수정·Run 조회 권한은 유지한다. 이 추가 역할에는 IAM·DNS 변경, 기존 인증서 수정·삭제 권한을 넣지 않는다. 역할 자체는 프로젝트 범위이며, 실행 코드의 고정 호스트·소유 marker·충돌 검사와 보호된 main/owner/CI/freeze/digest gate가 변경 대상을 제한한다.

## Cloud Shell 명령

프로젝트 IAM 소유자 계정으로 Google Cloud Console 오른쪽 위 `>_` Cloud Shell에서 실행한다. 역할이 이미 존재하면 권한이 위 집합과 같은지 먼저 확인한다. 같은 역할을 다시 만들거나 임의로 더 넓게 갱신하지 않는다. 아래 `&&`는 역할 생성이 실패했을 때 기존의 다른 역할을 곧바로 계정에 연결하지 않도록 한다.

```bash
gcloud iam roles create o4oDrugstoreHostTlsOperator \
  --project=netureyoutube \
  --title='O4O Drugstore host TLS operation' \
  --description='TLS inventory and managed certificate/map entry creation; no delete, update, IAM or DNS permissions.' \
  --permissions=compute.targetHttpsProxies.list,certificatemanager.certmapentries.list,certificatemanager.certs.get,certificatemanager.certs.create,certificatemanager.certs.use,certificatemanager.certmapentries.create,certificatemanager.operations.get \
  --stage=GA --format=none &&

gcloud projects add-iam-policy-binding netureyoutube \
  --member=serviceAccount:github-actions@netureyoutube.iam.gserviceaccount.com \
  --role=projects/netureyoutube/roles/o4oDrugstoreHostTlsOperator \
  --condition=None --format=none
```

기존 안내의 6개 권한으로 역할을 이미 만들고 연결했다면, 소유자가 해당 역할 정의를 확인한 후 누락된 사용 권한만 다음처럼 추가한다. 기존 권한을 통째로 교체하지 않는다.

```bash
gcloud iam roles update o4oDrugstoreHostTlsOperator \
  --project=netureyoutube \
  --add-permissions=certificatemanager.certs.use \
  --format=none
```

`--format=none`은 프로젝트 IAM 정책·계정 목록을 출력하지 않기 위한 것이다. 키·인증 토큰을 채팅·문서·커밋에 붙이지 않는다.

## 통합 담당의 후속 실행

최신 main HEAD·green CI와 다른 production 작업 종료를 확인한 뒤 기존 workflow의 `service=kpa-society`, `pharmacy_preparation=drugstore-plan`을 실행한다. 실제 plan digest·TLS 준비/생성 대상·대상 Run revision을 검토하고 같은 상태에서만 `drugstore-cutover`와 정확한 digest를 사용한다. TLS ACTIVE·공개 HTML/JS hash 확인 후 약국 공통 앱의 선택 promote와 네 사업 회귀를 마무리한다.

인증서 발급이 작업 예산을 초과하면 도구는 늦은 라우팅 쓰기를 시작하지 않는다. 생성한 고정 TLS 자원은 남겨 두고 새 plan으로 재개한다. 타인의 변경을 덮어쓰거나 보호된 gate·TLS 검증을 우회하지 않는다.
