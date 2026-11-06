# 계정 완전삭제 활성화 검증

- 기준일: 2026-11-04 한국 시각
- 기준 main: 74e509a2022cb4776e3329cff9c46fee3e9154dc
- 사용자 지시: 조사·정비하여 실제 사용할 수 있게 한다. 기존 통합·배포 담당 공간에서 수행한다.
- 상태: 코드·로컬 검증 완료, 운영 audit와 실제 활성화 전. 아래 실행 결과를 별도로 기록한다.
- [TODO](../work-orders/TODO-O4O-ACCOUNT-ERASURE-ACTIVATION-V1.md)

## 원인과 정비

현재 HTTP adapter는 MODE=apply, FILE_INVENTORY_REVIEW=confirmed, SYSTEM_YEARS=1/2, SYSTEM_POLICY_BASIS 및 실제 schema/fence 준비를 모두 요구한다. 기존 API 배포의 전체 env 교체에는 이 네 값 전달이 없었다. 다음 배포가 설정을 지우지 않도록 기존 optional-env helper에 opt-in serving-only 조회를 추가했다. 실제 serving revision의 값만 사용하므로 실패한 no-traffic apply 후보의 값이 carry되지 않는다. 다른 기존 소비처는 기본 동작을 유지한다.

runtime capabilities와 운영 audit는 같은 schema 준비 SQL을 사용한다. 운영 DB는 read-only transaction·timeout 및 집계 출력으로만 조사한다. 회원·문서·파일 경로·credential 값은 보고하지 않는다. 현재 실행 API digest·runtime identity·Cloud SQL 대상과 secret 참조를 고정한 별도 job만 사용한다. 기존 다른 job을 덮어쓰지 않는다.

## 소유·공유 조사 기준

| producer·소유 | 현재 처리 및 활성화 시 보호 |
| --- | --- |
| 개인 avatar·명시적 개인 root 50개 및 자식 | 기존 개인 manifest·공유 DB 참조·owner/purpose metadata·generation/metageneration 검증을 유지 |
| KYC·매장 사업자등록증 | 실제 조직 문서 참조가 소유 기준. 업로더만 보고 삭제하지 않으며 매도 후 새 경영자 자료를 유지 |
| 공급자 개인 증빙 | canonical 조직 owner 및 domain의 문서·typed prefix 증명을 사용. 제품·거래·공유/규제 증빙은 임의 삭제하지 않음 |
| 개인 메일·로그 사본·일반 첨부 | 고정 domain manifest 및 identity 잔여 검사를 유지. 타인·공용 참조는 review |
| legacy 미표식·미분류 파일 | 이번 작업에서 임의 소유 추정·전역 backfill하지 않는다. 해당 계정 실행에서 review/실패로 남으며 completed로 표시하지 않음 |
| 실제 저장소 조사 | 버킷 전체 metadata 집계와 IAM list/get/create/delete 확인. 기존 object에는 쓰지 않고 무작위 dedicated probe의 생성 세대·metadata 세대를 pin하여 roundtrip·잔여0 검증 |

`inventory confirmed`는 이 producer·실행 보호 경계와 운영 조사 증거를 검토했다는 뜻이다. 모든 legacy object가 개인 소유이며 즉시 삭제 가능하다는 뜻으로 사용하지 않는다. 개별 계정의 추가 review 조건을 우회하지 않는다.

## 보존 정책·자동 관리

현행 개인정보 보존 정본 §6의 기본 달력1년을 명시적 근거로 사용한다. 기존 2년 설정은 단축하지 않는다. 5만 명 이상인데 1년 설정인 경우 활성화를 거절한다. 법정2년 대상의 별도 시스템 분류·정책은 원래 정본을 따른다. 기존 생성·발송 clock과 보존 예외를 변경하지 않는다.

부팅·24시간 간격의 기존 개인정보 보존 job에 최소 기록 정리를 연결했다. 수동 maintenance도 같은 기존 `retentionReport`의 만료일·hold 처리를 재사용해 만료된 최소 증빙·감사와 완료 처리 내역만 정리한다. 계정 request/resume을 호출하지 않는다. erasure가 OFF면 skip한다. 이것은 실제 운영 회원의 삭제 시험이 아니다.

## 운영 절차

`Account erasure operations`는 인증이 허용된 기존 `deploy-api.yml` reusable job을 호출한다. WIF provider 허용 목록을 넓히지 않는다. 외부 schedule 이벤트 대신 기존 in-app 보존 job을 재사용한다. owner·main ref·정확한 SHA·green CI·freeze false를 검사한다. audit → 집계와 source 검토(필요 시 prepare-storage로 같은 project의 private document bucket만 비공개 생성·runtime storage.objectUser 바인딩 후 재조사) → compatible serving API 확인 → no-traffic 설정 후보 → 후보 env/schema/storage 검사 → 100% 전환 → 공개 health·enabled 재검증 순서다. 실패한 후보는 노출하지 않고, 전환 후 실패는 이 실행의 후보가 여전히 serving일 때만 이전 revision으로 복구한다. 동시 운영 변경을 덮어쓰지 않는다. disable도 OFF 후보로 실제 pinned traffic을 전환한다.

## 로컬 증거

- 운영 증거·config 검증/CLI 실행·복구·serving-env 및 기존 env/배포 helper: Node 118 PASS.
- 기존 보존 job의 OFF/dry-run/apply/오류 비노출 및 storage 회귀 19 PASS.
- 저장소 probe·충돌·실패 정리·교체 세대·권한 부족·불완전 inventory: 6 PASS.
- 정식 PostgreSQL15 bootstrap/57 incremental, native 계정 삭제/파일/보존/fence 회귀 83 PASS.
- 기존 supplier/Google권한/canonical migration source guard 79 PASS.
- API production build·운영 bundle 문법·YAML·변경 lint·diff 검사 PASS. Node22.18.0·pnpm10.25.0, package/lock 변경 없음.
- 이 단계의 시험은 전용 loopback 55469 tmpfs DB·합성 storage/fake gcloud를 사용했다. native afterAll의 전체 fixture truncate가 통과했고 전용 tmpfs 컨테이너 제거를 확인했다. 별도 임시 cleanup script가 없어 독립 row count는 재실행하지 않았으며 전체 tmpfs 저장소 제거로 잔여를 없앴다. 운영 audit·IAM·활성화 성공으로 확대하지 않는다. 실제 결과는 후속으로 추가한다.

## 실제 운영 결과

대기. 운영 audit 집계·probe 잔여0·현재 설정·활성화 enabled·정확한 serving·공개 권한 차단·최소 기록 maintenance·후속 설정 보존 결과를 분리해 기록한다.

문서 정합: 기존 회원 관리의 배포 성공과 이번 완전삭제 활성화를 구분한다. 사용자 삭제 테스트 금지라는 해석을 되살리지 않는다. 기간·법정 분류·타인/사업체 소유 보호를 변경하지 않는다.

권한 조사 근거: 기존 runtime 최소 권한 CHECK는 media/video 두 bucket만 열거한다. 새 private 문서 bucket 권한이 실제로 부족하면 같은 project 소유를 확인한 뒤 그 bucket 하나의 objectUser만 준비한다. 프로젝트 전체 권한·WIF 신뢰 목록은 넓히지 않는다. prepare-storage는 audit 완료나 활성화를 대신하지 않는다.
