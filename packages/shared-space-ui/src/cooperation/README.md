# 약국 협업 사업 Core + Extension

네 사업의 공통 화면 계약과 사업별 표시·경로·자료 작성 도움을 분리한다. 서버의 가입·권한·정책 원장을 대체하는 plugin 시스템은 아니다.

```text
core.ts                         순수 계약, 설정 검증, 불변 registry 생성
extensions/pharmacy.ts          전체 약국 경영협업
extensions/megapharm.ts          창고형 약국 협업
extensions/carepharm.ts          만성질환관리 자료·작성 도움
extensions/pharmcoop.ts          협동조합 개인 가입·조합 선택
extensions/index.ts             네 extension 조합
models.ts                       기존 handoff 계약과 공개 호스트 이동 adapter
CooperationMemberSpace.tsx       약국 조직 회원용 공통 화면
BusinessHomeShowcase.tsx         서버가 허용한 사업 자료·제품 전시
```

의존 방향은 extension → core다. core는 특정 사업을 import하지 않으며, 조합 지점인 `extensions/index.ts`가 각 설정을 등록한다. 공유 회원 화면은 자료 안내·태그를 props로 받고 사업 키 조건문으로 CarePharm을 선택하지 않는다. 공통 운영 콘텐츠 편집기는 조합 지점의 registry에서 자료 작성 도움을 선택한다.

| 사업 | 앱 | 가입 단위 | 기존 인증 이동 |
|---|---|---|---|
| pharmacy | web-kpa-society | 약국 조직 | kpa-society transport alias → neture 세션 |
| megapharm | web-kpa-society | 약국 조직 | 자기 호스트의 공통 계정 로그인 |
| carepharm | web-neture | 약국 조직 | carepharm transport alias → neture 세션 |
| pharmcoop | web-pharmacy-coop | 조합별 개인 | 자기 호스트 로그인·조합 선택 |

`COOPERATION_EXTENSIONS`는 네 사업의 표현 설정이다. 기존 `COOPERATION_MODELS`는 지원되는 두 handoff transport의 호환 목록이므로 이 둘의 key 개수는 다르다. extension 등록만으로 handoff alias·가입·역할·제공 기능을 생성하지 않는다.

공통 backend는 기존 `modules/neture-pharmacy`의 사업·콘텐츠·공급·정책 API를 재사용한다. 개별 조합은 기존 cooperative services와 personal membership adapter를 유지한다. 조합 개인 가입을 `CooperationMemberSpace`의 약국 조직 가입으로 대체하지 않는다. 사업 이름·주소·태그는 자격 증거가 아니며 요청마다 서버가 현재 사용자·사업·약국/조합 범위를 검사한다.

새 사업별 표시를 추가할 때는 extension과 조합 지점만 변경하고, 회원/권한 API는 기존 서버 계약을 먼저 확인한다. 공개 경로는 해당 origin 내부 경로만 등록한다. registry는 입력을 복사·동결하므로 한 화면이 다른 사업 설정을 덮어쓰지 않는다.

검증: 저장소 루트에서 `pnpm exec vitest run --config packages/shared-space-ui/vitest.config.mjs`. 영향 소비 앱과 운영 UI 테스트·빌드를 함께 실행한다. 이번 범위와 결과는 [WO](../../../../docs/work-orders/WO-O4O-COOPERATION-CORE-EXTENSIONS-CONSOLIDATION-V1.md), [CHECK](../../../../docs/checks/CHECK-O4O-COOPERATION-CORE-EXTENSIONS-CONSOLIDATION-V1.md)를 따른다.
