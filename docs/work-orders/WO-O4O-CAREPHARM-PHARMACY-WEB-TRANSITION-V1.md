# WO-O4O-CAREPHARM-PHARMACY-WEB-TRANSITION-V1

> **상태**: COMPLETED · **작성일**: 2026-10-29
> **사용자 승인**: CarePharm을 약국 협업체 공통 웹으로 이전하고 기존 약국 자원을 제거하는 조사 결과에 대해 판단하여 진행. 개발·검증·main 통합·배포·CarePharm 연결 전환·옛 Run/backend/NEG 제거 및 검증까지.
> **경계**: 기존 사업·회원·자료·세션·권한 유지. DB/migration·IAM 변경·다른 사업 데이터 변경 없음.

## TODO

- [x] 현행 코드·GCP 연결·CarePharm 경로·홈 자료 계약 및 옛 자원 삭제 조건 조사
- [x] 기존 CarePharm 표시 컴포넌트 재사용과 약국 웹의 호스트·라우트·공개/회원/운영 기능 연결
- [x] CarePharm만 분리하는 계획/digest·참조 보존·검증 실패 복구를 기존 운영 CLI에 연결
- [x] Pharmacy/MegaPharm·Neture·공통 소비처 회귀와 desktop/mobile fixture 검증
- [x] 동일 PR의 CI·리뷰 지적 보완 후 main 통합 및 웹 배포
- [x] 새 계획 검토 후 CarePharm host만 pharmacy-business-web으로 전환·공개 검증
- [x] 옛 자원 요청 0·완전한 참조 검사 후 kpa-society-web/backend/NEG 제거
- [x] 현재 구조 문서와 실제 결과 정합·종료 정리

## 보존 계약

CarePharm은 `semi_franchises.key=carepharm`·약국 조직 가입·기존 scoped 운영 권한·neture 계정 세션을 유지한다. 기존 `/home-presentation/carepharm` 공개 공지/광고 자료와 `/communities/business:carepharm/forum` 진입을 보존한다. 플랫폼 관리·다른 사업·공급자 기능을 CarePharm에 노출하지 않는다.

기존 Neture의 CarePharm 어댑터는 전환 실패 시 복구할 수 있도록 공통 표시 컴포넌트의 소비처로 유지한다. 정상 도메인 연결은 약국 웹으로 전환하며, 동일 표시 구현을 복제하지 않는다. 기존 [공통 변경 정본](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)·[역할 구조 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md)·[서브도메인 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md)를 따른다.

## 개발 검증 (운영 전환 전)

- Pharmacy build·169 tests PASS. 기존 Neture 전체 172 files/1,464 tests, CarePharm 집중 57 tests PASS.
- shared-space-ui 23 files/212 tests PASS. Neture·Pharmcoop build PASS.
- 운영 Python 50 tests 및 workflow gate/diff tests PASS. 전환은 CarePharm host만 분리하고 기존 pharmacy/megapharm 삭제 검사 topology를 유지한다. drift 시 쓰기 거부, 공개 검증 실패 시 이전 연결 복구, 동시 변경 시 타인의 설정 덮어쓰기 금지를 검증했다.
- 실제 빌드 산출물의 익명 desktop/mobile fixture browser 경로 검사를 수행했다. production API·로그인·업무 데이터 write는 사용하지 않았다. 실제 계정 파일은 이 checkout과 기준 checkout에 없어 실계정 로그인·역할별 운영 검증을 완료로 주장하지 않는다.
- ESLint 오류 0. App의 기존 hook dependency warning 2건은 이번 변경 밖이며 그대로 유지한다. 기존 번들 크기 warning은 build 실패가 아니다.

CI·리뷰·통합·운영 전환·삭제 결과는 후속 실행 뒤 갱신한다. 이전 조사에서 old_request_count=0이었어도 삭제 실행 직전에 새 retire-plan을 다시 검토한다.

### 병합 후 법정 문서 URL 호환 보완

PR #875/main `089e3156a3` 통합 뒤 기존 CarePharm의 `/terms`와 약국 웹의 `/policy` 경로 차이를 추가 확인했다. CarePharm 호스트에서 `/terms`를 기존 약국 법정 문서 컴포넌트의 alias로 연결해 동일한 `carepharm` 사업 약관 원장을 읽고 URL의 query/hash를 보존한다. 운영 전환 전에 같은 WO의 후속 검증·통합으로 반영한다. 기존 Neture 어댑터는 계속 서비스·복구 가능하므로 그 사이 CarePharm 연결은 바꾸지 않는다.

### 운영 공개 검증 실패·자동 복구와 관측 보완

당시 main `41c56441e4` CI·Delivery는 성공했다. plan 40815953975/40816900946은 동일한 약국 이미지·리비전을 확인했다. cutover 40816164897/40817043556은 공개 검증 실패 후 이전 라우팅으로 자동 복구했다. 첫 복구 뒤 읽기 인벤토리 40816769118에서 모든 host→backend가 전환 전과 동일함을 확인했다. 이 두 전환 시도 시점에는 옛 Run/backend/NEG를 삭제하지 않았다.

기존 오류는 공개 HTTP·번들·리비전 중 어느 조건의 실패인지 숨겼으므로 원인을 확정하지 않는다. 원문·credential·redirect URL 없이 검사 단계·HTTP status·공개 JS 경로/hash만 기록하도록 보완한다. 새 matcher의 반영 지연을 관측할 시간을 최대 약 3분으로 늘리되 정상 URL의 번들 일치 조건과 실패 복구·동시 변경 거부는 유지한다. 캐시 우회 결과로 정상 URL 검증을 대체하지 않는다. 이 보완 main의 CI 뒤 기존 owner/main/CI/freeze를 거치는 약국 웹 verified 정비 재배포로 정확한 main 이미지 조건을 맞춘 후 새 plan을 검토한다.

### 최종 운영 실행

- PR #875·#876·#877을 main에 통합했다. 최종 코드 main `cdfaf4f63bc5dd80de5b0128a69b792ee8ed8452`의 CI 40819515358·CodeQL 40819515324·Delivery 40820627468 성공. 약국 웹 verified 정비 배포 40819656787 성공, `pharmacy-business-web-00038-wuq` 확인.
- 옛 자원은 CarePharm 복구 대상인 Neture와 독립이다. 새 retire-plan 40818421465에서 요청 0·참조 검사를 확인하고 retire 40818605154로 `kpa-society-web`·`backend-kpa-society-web`·`neg-kpa-society-web`을 제거했다. old_resource_count=0, IAM/DB 쓰기 없음. 독립 인벤토리 40818963586에서 backend/NEG 부재와 다른 host 연결 보존을 확인했다.
- 새 carepharm-plan 40820925905의 digest `018da90d11d50caf66bb9aa38cfe70625fcac29ff1ccfd1c86cbb74777b90f5d`를 검토하고 cutover 40821072947을 실행했다. **SUCCESS·applied=true**, 목표 리비전 `pharmacy-business-web-00038-wuq`, IAM/DB 쓰기 없음.
- 최종 전환의 첫 공개 관측은 HTML/JS 200이지만 기존 Neture bundle이었다. 이후 정상 CarePharm URL의 bundle이 목표 약국 앱 hash와 일치해 성공했다. 이는 이번 실행에서 전환 직후 응답 반영 지연이 있었음을 보여주며, 앞선 두 실패의 원인을 소급 확정하지 않는다.
- 운영 결과·서비스 구분·검증 한계는 [CHECK](../checks/CHECK-O4O-CAREPHARM-PHARMACY-WEB-TRANSITION-V1.md)에 기록한다. 운영 스크립트 최종 로컬 검증은 53 tests PASS.
- 독립 읽기 인벤토리 40821484252 성공. 전환 전 전체 host→backend와 비교해 **CarePharm 한 host만** `backend-neture-web-http`에서 `backend-pharmacy-business-web`으로 변경됐고, 옛 backend/NEG 부재와 새 리비전 100% traffic을 확인했다.
