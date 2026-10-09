# WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1

> 작성일: 2026-10-09 · 상태: ACTIVE
> 근거: 사용자 명시 지시 — Pharmacy Hub의 경로·서버·도메인·인증서를 모두 제거한다.
> 착수 main: `0f8535d6b1` · 검증 결합 main: `8fa26f9293`(PR #375) · 전용 branch `wo/pharmacy-hub-full-retirement-v1`

## 1. 확정 범위

PH는 퇴역한다. `pharmacy.neture.co.kr`은 **O4O 약국 경영지원** 사업이며 PH의 새 이름이나 호환 호스트가 아니다. 매장 실행 업무는 `store.neture.co.kr`, 독립 약사 커뮤니티와 사업 회원 포럼은 `community.neture.co.kr`이다.

PH 웹 앱·API·가입·운영자 지정·내 매장 PH 문맥·공급자 PH 제공 설정·재배포 경로를 제거한다. PH의 도메인·인증서·인쇄 QR 주소도 제거 대상이며, 302/301 리다이렉트나 인쇄 QR 보존 경로를 만들지 않는다.

기존 주문·결제·회원·콘텐츠의 DB 원장과 과거 migration은 삭제하거나 키를 바꾸지 않는다. 기존 공급자 주문 처리와 독립 커뮤니티의 포럼 저장 코드는 기능 이전 후에도 보존하는 데이터 식별자다. PH 전용 신규 주문이나 결제 경로를 유지하는 근거로 삼지 않는다. 상품의 PH 공급 키만 지워 기본 공급으로 새로 노출시키는 변경도 하지 않는다.

## 2. 코드·문서 대조 후 ToDo

| ID | 작업 | 방법·완료 조건 |
|---|---|---|
| R01 | PH 웹·API 제거 | `web-pharmacy-hub`, 전용 라우터·컨트롤러·scope·생성 코드 삭제; `/api/v1/pharmacy-hub` 미등록 |
| R02 | 내 매장 PH 문맥 제거 | PH route·API adapter·메뉴·공개 origin·서비스 선택 분기 제거; 현재 약국 원장과 KPA 공통 구현은 유지 |
| R03 | 신규 PH 진입·공통 쓰기 제거 | catalog·CORS·Local Agent origin·운영자 부여·공급자 PH 설정 제거; Store·이용권·QR·CMS·모집·Offer 신규 쓰기와 PH 가입 승인/재활성화·공통 역할 부여 차단. 공개 PH slug의 관심 요청·PH 전용 조직의 QR 스캔도 기록 전에 차단. PH 약관은 현재 동의 요구에서 제외. 독립 약사 포럼 저장 코드·기존 주문 후속 처리 보존 |
| R04 | PH 재배포 제거 | CD registry·workflow job·lockfile importer 정리; 다른 웹·API·병원약국 배포 유지 |
| R05 | 운영 인프라 제거 준비·실행 | 실제 PH host rule·NEG·backend·Cloud Run·DNS·인증서 조사 후 PH 전용 자원만 제거; 공유 LB·IP·인증서의 다른 호스트 보호 |
| R06 | 회귀 검증 | 변경 소비처 type-check/build, API focused tests, CD detector tests; PH 원장 조회·Store·공급자·커뮤니티 권한 보호 |
| R07 | 문서 정합·인계 | 현행 DESIGN의 PH 도메인/QR 보존 계획 정정; CHECK에 코드 제거와 실제 운영 제거 상태를 구분해 기록 |

## 3. 조사에서 확인한 의존성

- PH 웹 165파일, PH 컨트롤러 23파일, PH 라우터 2파일과 전용 서비스가 남아 있다.
- 내 매장은 아직 PH 공통 API 문맥을 선택할 수 있고, PH 결제 복귀 화면도 별도로 남아 있다. 이 참조부터 함께 제거한다.
- 공급자 공통 주문 목록은 `pharmacy-hub` 원장 키를 조회해 기존 주문을 처리한다. 이 조회 집합에서 키를 빼면 기존 주문이 사라지므로 유지한다.
- 독립 약사 커뮤니티는 `pharmacy-hub` 저장 코드의 글도 읽는다. 저장 코드는 유지하고 PH 웹 진입 metadata만 제거한다.
- 공통 이용권 결제·외국인 파트너·QR과 CMS가 과거 PH 역할/가입으로 신규 쓰기를 허용하고 있었다. 공통 Store owner/member 접근과 PH 역할 발급, PH 이용권 결제·활성화·자산 생성·CMS 생성/수정/상태 전이/슬롯 쓰기를 차단한다. 기존 이용권·CMS GET과 공급자 주문 원장 조회는 유지한다. 현재 매장에 PH 과거 linkage가 함께 남아도 PH 역할은 발급하지 않으며 PH 전용 초대는 활성화하지 않는다.
- Local Agent의 loopback pairing origin도 PH root/www를 신뢰하고 있었다. 두 origin을 제거하고 실제 HTTP health/preflight/pair가 403으로 끝나는지 검증한다. 이미 설치된 Agent에는 자동 업데이트가 없어 도메인 등록 종료 전에 로컬 코드 갱신·재시작이 필요하다.
- 공통 모집은 PH 생성·재개·노출 승인·신규 신청·참여 승인을 거부하고 public/Store 참여 목록에서 제외한다. 과거 공급자/운영자 조회·마감·노출 반려·신청 반려/철회/해지는 유지한다. 과거 알림의 후속 경로도 현재 Store 신청 내역으로 향한다.
- 과거 PH membership과 약관이 남아 있으면 현재 서비스까지 428 동의 게이트에 걸렸다. PH 이용약관·경영자 계약은 pending에서 제외하고 PH 신규 승낙 쓰기는 거부한다. 현재 서비스 약관 동의 요구와 과거 동의 원장은 유지한다.
- 공통 역할 선택 목록과 부여 API는 전체 관리자에게도 PH prefix와 PH catalog 항목의 신규 부여를 거부한다. 기존 할당·역할 식별 조회와 회수는 유지한다. PH 가입의 승인·재활성화·active 전이는 거부하고, 전체 복구의 PH 원장은 제외해 현재 서비스 가입만 복구한다. 가입 거부·정지·탈퇴·회수는 유지한다.
- 공통 `products/from-master` 생성도 PH 공급 키가 있으면 혼합 서비스 요청 전체를 거부한다. 기존 Offer의 PH 키와 후속 처리 원장은 그대로 둔다. 신규 입력에서 키를 지워 기본 공급으로 전환하지 않는다.
- 공개 Store 조회도 PH slug와 PH로 향하는 과거 slug 리다이렉트를 404로 종료한다. PH 전용 조직의 공개 QR은 스캔 이벤트를 기록하기 전에 종료한다. 같은 조직에 현재 서비스 주소가 있으면 PH 주소를 제외하고 현재 Store 관심 요청·QR을 처리한다. active/inactive PH 주소와 혼합 원장을 실제 HTTP 회귀로 검증한다.
- DB 기반 공개 `platform-services` 목록도 active PH 행을 제외한다. 익명·로그인 사용자 모두 현재 서비스와 가입 상태만 보며 PH catalog 원장과 관리자 이력 조회는 보존한다. DB 갱신으로 숨기지 않는다.
- 현행 DESIGN §16은 인쇄 QR·옛 도메인·인증서 보존을 요구해 사용자 확정 지시와 충돌한다. 현행 설계 절만 정정하고 과거 WO/CHECK는 당시 기록으로 보존한다.
- 현재 환경에는 `gcloud`가 없고 GCP 작업용 credential이 제공된 사실도 확인되지 않았다. 실제 운영 자원 삭제를 코드 삭제나 초안 준비로 완료 처리하지 않는다. 운영 인프라 상태는 read-only 조회가 가능한 접근 경로부터 확인한다.

## 4. 완료 경계

DB write·schema 변경 없음. PH 이외의 서비스를 삭제하지 않는다. 검증 결과를 첨부해 PR로 준비하고 main 통합은 저장소 `AGENTS.md` §4-1(e)의 사용자 승인 절차를 따른다. 실제 배포와 PH 운영 인프라 삭제 여부는 각각 별도 결과로 기록한다.

검토 중 PR #375가 PH 웹·API·배포 경로의 1차 제거를 main에 반영했다. 이 작업 branch는 그 main과 결합해 공통 신규 쓰기·진입·원장 후속 처리와 운영 삭제 인계를 보완한다. main이나 다른 작업 branch의 이력은 바꾸지 않는다. PH 모델 상태 줄은 표준 SUPERSEDED 형식을 쓰고, canonical index 상태 변경은 별도 [문서 WO](https://github.com/Renagang21/o4o-platform/blob/c988cf53380eff25e5587a4fc79db247aa03aa48/docs/work-orders/WO-O4O-PHARMACY-HUB-CANONICAL-INDEX-ALIGNMENT-V1.md)·PR #380으로 준비한다. #373 후 #380 순서로 main에 반영한다.

## 5. 운영 인프라 제거 절차

아래 이름은 과거 `CHECK-O4O-PHARMACY-HUB-OFFICIAL-DOMAIN-CONNECTION-V1`에서 확인한 후보이며, 현재 운영 조회로 확정한 목록이 아니다. GCP/Gabia 작업 권한이 있는 실행자가 현재 연결과 공유 여부를 조회한 뒤 수행한다. 사용자 지시는 PH 자원 제거를 포함한다. 자격증명을 저장소에 넣지 않는다.

| 종류 | 과거 이름 | 삭제 전 확인 |
|---|---|---|
| PH Cloud Run | `pharmacy-hub-web` | 프로젝트 `netureyoutube`, 리전 `asia-northeast3`; 다른 도메인·NEG가 이 서비스를 쓰지 않음 |
| Serverless NEG | `neg-pharmacy-hub-web` | PH Cloud Run만 가리킴; 다른 backend 참조 없음 |
| Global backend | `backend-pharmacy-hub-web` | 모든 URL map에서 PH 외 참조 없음 |
| Host rule·path matcher | `path-matcher-pharmacy-hub` | 공유 URL map `o4o-global-lb`의 PH 호스트만 제거; 다른 matcher·default backend 유지 |
| 인증서 map entry | `cm-entry-pharmacyhub-root`, `cm-entry-pharmacyhub-www` | 공유 map `o4o-main-cert-map`에서 hostname이 PH root/www와 일치 |
| 인증서 | `cm-cert-pharmacyhub` | SAN이 PH 도메인만 포함; 다른 map entry 참조 없음 |
| DNS authorization | `dns-auth-pharmacyhub-root`, `dns-auth-pharmacyhub-www` | 다른 인증서 참조 없음 |
| Gabia DNS·도메인 | PH root/www A 및 PH 인증용 CNAME | 권한 DNS를 재확인; 다른 도메인·공유 IP·DNS zone은 유지. PH 등록·갱신 종료도 registrar에서 처리 |

1. API·Store·공급자 변경을 운영 반영하고 현재 Store QR·주문·공급자 후속 처리가 정상인지 확인한다. PH 신규 API·가입·설정이 없어야 한다. 운영 DB 원장 삭제는 포함하지 않는다.

   **도메인 등록 종료 전 Local Agent 갱신:** Agent가 설치된 PC마다 이 PR이 반영된 main 코드로 실제 실행 사본을 갱신하고 기존 프로세스를 종료한 뒤 재시작한다. [Local Agent README](../../tools/o4o-local-agent/README.md)의 수동 업데이트 방식과 저장소 `AGENTS.md` §4-1(g)(h)의 실 PC 작업 직렬화를 따른다. `local.db`·credential·pairing을 삭제하거나 재발급하지 않는다. 이번 origin 수정은 버전 문자열만으로 구분되지 않으므로 적용 main SHA·실행 사본과 시작 경로를 기록한다. 실행 중인 서버가 두 PH origin에 모두 403, Neture origin에는 200을 반환하는지 확인한다. Windows의 read-only 예시는 다음과 같다.

   ```powershell
   curl.exe --silent --output NUL --write-out "%{http_code}\n" --header "Origin: https://pharmacyhub.co.kr" http://127.0.0.1:47821/health
   curl.exe --silent --output NUL --write-out "%{http_code}\n" --header "Origin: https://www.pharmacyhub.co.kr" http://127.0.0.1:47821/health
   curl.exe --silent --output NUL --write-out "%{http_code}\n" --header "Origin: https://neture.co.kr" http://127.0.0.1:47821/health
   ```

   기존 사본의 origin 신뢰를 제거하기 전에 도메인 등록을 종료하면 제3자 재등록 후 pairing에 악용될 수 있다. 업데이트하지 않은 실행 사본이 남거나 설치 현황을 확인하지 못하면 등록 종료 단계는 수행하지 않고 잔여 작업으로 보고한다. 이 환경에서 설치 PC를 갱신하거나 실 PC Agent를 실행한 결과는 없다.
2. URL map·backend·NEG·Cloud Run·인증서 map/entry·certificate·DNS authorization의 현재 JSON을 비공개 작업 폴더에 저장한다. 과거 표와 다르면 현재 참조를 기준으로 목록을 수정한다. 새 URL map 초안은 다음으로 준비한다.

   ```bash
   gcloud compute url-maps describe o4o-global-lb --global --project netureyoutube --format=json > /tmp/ph-retirement-map.original.json
   node scripts/deployment/pharmacy-hub-retirement.mjs /tmp/ph-retirement-map.original.json /tmp/ph-retirement-map.review.json
   ```

   스크립트는 PH 호스트와 해당 호스트의 URL map 검증 테스트를 제외하고 PH에만 쓰이던 matcher를 지운다. 다른 호스트의 검증 테스트와 공유 matcher·backend는 보존한다. `removedTestHosts`로 제거한 검증 대상도 확인한다. 검증 테스트의 기대 backend는 실제 라우팅 참조로 세지 않는다. GCP를 호출하거나 삭제하지 않으며 출력 파일을 덮어쓰지 않는다. `unreferencedBackendCandidates`는 이 URL map 안에서만 미참조인 후보이므로 전체 프로젝트 참조를 다시 확인한다. import는 남은 URL map 검증 테스트를 실행하므로 실패하면 해당 구성을 적용하지 않는다.
3. 원본/초안의 diff에서 PH 외 변화가 없고 리다이렉트가 없음을 확인한다. 적용 직전 URL map을 다시 조회해 원본 fingerprint와 비교한다. 다른 실행자의 변경이 있으면 적용하지 않고 새 원본으로 초안을 다시 만든다.
4. PH DNS A·인증용 CNAME 및 PH certificate map entry를 제거한다. 도메인 등록·갱신도 Gabia 계정에서 종료한다. 다른 서비스의 인증서 map이나 공용 IP를 지우지 않는다. DNS cache가 남아도 PH를 다른 서비스로 호환 이동시키지 않는다.
5. 검토한 URL map을 적용한다. PH 외 호스트와 path matcher, default backend가 그대로인지 확인한다.

   ```bash
   gcloud compute url-maps import o4o-global-lb --global --project netureyoutube --source=/tmp/ph-retirement-map.review.json
   ```

6. 전체 참조가 0인 PH backend → NEG → Cloud Run을 제거한다. PH 전용 certificate → DNS authorization도 참조가 0일 때 제거한다. 현재 이름이 표와 일치할 때 사용하는 명령은 다음과 같다. 각 명령 사이에 실제 참조와 결과를 확인하며 한꺼번에 실행하지 않는다.

   ```bash
   gcloud certificate-manager maps entries delete cm-entry-pharmacyhub-root --map=o4o-main-cert-map --location=global --project=netureyoutube
   gcloud certificate-manager maps entries delete cm-entry-pharmacyhub-www --map=o4o-main-cert-map --location=global --project=netureyoutube
   gcloud compute backend-services delete backend-pharmacy-hub-web --global --project=netureyoutube
   gcloud compute network-endpoint-groups delete neg-pharmacy-hub-web --region=asia-northeast3 --project=netureyoutube
   gcloud run services delete pharmacy-hub-web --region=asia-northeast3 --project=netureyoutube
   gcloud certificate-manager certificates delete cm-cert-pharmacyhub --location=global --project=netureyoutube
   gcloud certificate-manager dns-authorizations delete dns-auth-pharmacyhub-root --location=global --project=netureyoutube
   gcloud certificate-manager dns-authorizations delete dns-auth-pharmacyhub-www --location=global --project=netureyoutube
   ```

   앞의 map entry 2개는 4단계에서 이미 제거했다면 다시 실행하지 않는다. 삭제 명령은 실행 결과가 아니며 현재 환경에서는 수행하지 않았다.
7. PH 서비스·NEG·backend·host rule·인증서/entry/auth·권한 DNS가 제거됐음을 각각 조회한다. 다른 Neture 서브도메인의 HTTPS와 Store QR·태블릿·사이니지·공급자 주문을 재검증한 뒤 CHECK에 실제 결과를 기록한다. 접근 권한이 없거나 공유 참조가 남은 항목은 완료로 표시하지 않는다.

## 6. 로컬 운영 작업자에게 전달할 내용

2026-10-09 사용자가 실제 인프라 삭제는 로컬에서 진행한다고 결정했다. 이 클라우드 작업의 인계 대상은 아래이며, §5 명령을 실행한 결과는 아니다.

```text
Pharmacy Hub 완전 퇴역의 운영 삭제를 수행한다.
먼저 PR #373의 main 반영·통제 배포와 Store/공급자/독립 약사 커뮤니티 정상 동작을 확인한다.
정본 색인 정합 PR #380은 #373 후 main에 반영한다(문서-only, 별도 runtime 배포 없음).
설치된 모든 Local Agent의 실제 실행 사본도 최신 코드로 갱신·재시작한다.
PH root/www Origin의 /health 403과 Neture Origin 200을 확인하고 적용 SHA를 기록한다.
설치 Agent의 PH origin 신뢰 제거를 확인하기 전에는 PH 도메인 등록을 종료하지 않는다.
다른 실행자의 배포·LB/DNS 변경과 겹치지 않는 시간에 GCP/Gabia에서 작업한다.
프로젝트 netureyoutube / 리전 asia-northeast3의 현재 PH 자원과 모든 참조를 조회한다.
WO §5의 과거 이름은 후보이며, 실제 이름·PH 전용 여부·공유 참조를 재확인한다.
PH root/www DNS와 인증서 entry, PH host rule/matcher, 전용 backend/NEG/Cloud Run,
PH 전용 인증서/DNS authorization을 제거하고 Gabia 등록·갱신도 종료한다.
302/301·인쇄 QR 보존은 만들지 않는다. 기존 PH 도메인은 연결 유지 대상이 아니다.
공유 o4o-global-lb, 공용 IP, o4o-main-cert-map, 다른 호스트·인증서·서버는 보존한다.
운영 DB의 주문·결제·회원·콘텐츠·공급 키는 삭제하거나 바꾸지 않는다.
각 자원의 실제 삭제와 다른 서비스 HTTPS/Store QR/공급자 후속 처리 결과를 기록한다.
전체 삭제·검증 후 CHECK에 실제 완료를 기록하고, 미완료 항목이 있으면 구분해 보고한다.
```

필수 보고는 `main/배포 SHA`, `Local Agent 갱신·origin 차단 결과`, `삭제한 자원 이름`, `PH DNS/인증서/서버 조회 결과`, `다른 서비스 검증 결과`, `남은 항목`이다. 인증 정보·운영 snapshot·DNS IP를 공개 저장소에 올리지 않는다.
