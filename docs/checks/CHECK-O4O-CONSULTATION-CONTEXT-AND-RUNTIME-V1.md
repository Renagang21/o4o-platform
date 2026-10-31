# 상담 맥락·상품 근거·실행 수단 통합 검증 V1

> **상태**: 로컬 검증·PR 갱신 진행 · main 미병합·운영 미배포
> **확인일**: 2026-10-31
> **대상**: PR #910 · `wo/consultation-improvement-todo`
> **계획/절차**: [통합 TODO](../work-orders/TODO-O4O-CONSULTATION-CONTEXT-PRODUCT-AND-PROVIDER-IMPROVEMENT-V1.md) · [실행 안내](../guides/products/O4O-CONSULTATION-CONTEXT-AND-RUNTIME-V1.md)

## 범위·검증 경계

고객 맥락에서 필요한 경우에만 현재 매장 상품→공통 B2B 근거를 읽도록 연결했다. 관리자 STT/번역/TTS 선택, 문자 자동 감지와 Google 음성 후보 언어, 권한/빈 목록·자료 확보 상태, 현재 근거 버전·상담 세대·음성 정리를 함께 보완했다. 상담 원문 영구 이력·Task·Memory·자동 학습은 추가하지 않았다.

운영 로그인·계정 자격/권한·상품·자료·게시·pairing·환경 설정·GCP·유료 API는 이번 구현 검증에서 변경/호출하지 않았다. TODO §2의 운영 조회 수치는 앞선 읽기 전용 관측이며 이번 합성 검증으로 새 운영 상태를 주장하지 않는다. 과거 배포 CHECK도 수정하지 않았다.

## 코드·문서 대조

| 요구 | 구현 근거 | 검증 |
|---|---|---|
| 거절과 빈 목록 구분 | `store-product-access.ts`, `store-handled-products.routes.ts`, 접근 안내 | 자격 거절 보존·승인 직원 일반 접근·인증/조직 guard |
| 맥락·필요성 판단 | `consultation-context.ts`, `ConsultationSupportPanel.tsx` | 일반 대화/확인 질문/엄격 계약/false 접근 거절·상품 확인 후 선택 |
| 현재 매장부터 검색 | 조직 범위 CTE·활성 master/listing·DISTINCT ON | 실제 PostgreSQL에서 외부/비활성/중복 연결 제외 |
| 분류·인용·수치 보호 | `consultation-evidence.ts`, 기존 support Extension | 미분류 제외·상담 보조 보존·늦은 주의사항·소수 용량/부정 문장·전체 예산 |
| 초안→고객 버전 확인 | support sourceVersion·번역·station 공유 proof | 실제 JSONB 왕복·원천 수정 후 공유/고객 조회/음성 거절·새 안내 복구 |
| 중앙 자료·엑셀 | lookup content/type/language 대조·readiness endpoint | 정확한 언어 B2B·고유 master/연결 수·legacy/미분류/부재·조회 실패 ≠ 0 |
| 게시 자료 연결 경고 | 선택 필드 `StoreMlcGroup.targetActive` | 미연결 경고와 기존 편집 동선 유지, 자동 삭제/게시 변경 없음 |
| 관리자 설정 재사용 | model-control 문서·revision lock·pharmacy.support | 충돌/미지원 차단·번역과 지원 모델 독립성·기본값 보존 |
| Google adapter·가격·한도 | 고정 host ADC·native 기존 예약/정산 | 합성 응답·실제 WAV 길이·문자/초 단위·가격/한도 거절 시 provider 미호출 |
| 음성/언어 수명 | useConsultationAudio·자동 감지·station 원자 변경 | 수동 언어 변경·다음 고객·접근 회수·늦은 결과·7개 언어 전달 계약 |
| 원문 없는 자료 개선 | 기존 편집 동선과 비식별 검토 안내 | 기존 중앙 접수·승인 경로 유지, 평가 표본/미측정 구분 |

공통 소비처 조사: native 가격 kind/unit은 기존 pricing/readiness/accounting 소비처를 함께 확인했다. model-control은 관리자 API/UI와 정책 실행·기본 모델 보호를 확인했다. `StoreMlcGroup` 변경은 optional 응답 필드이며 store-ui-core API의 Store·Neture·Pharmacy Business 소비처에 기존 필드 제거/변경이 없다. 런타임 표시 변경은 Store 내 매장 다국어 콘텐츠 목록에 한정한다. 다른 서비스에 같은 메뉴/경고를 일괄 노출하지 않는다.

## 실행 검증

- shared packages 빌드, API 빌드, Store production 빌드, 관리자 TypeScript 검사가 통과했다. 최신 main 통합 후 필요한 검사를 다시 확인한다.
- 서버 focused Jest: 17 suites / 176 tests 통과 후 추가한 언어·모델·공유 보호 검증을 재실행한다. 최종 건수는 아래 후속 기록에서 확정한다.
- Store focused Vitest: 10 files / 112 tests 통과 후 추가한 source proof·녹음 취소·연결 경고 검증을 재실행한다.
- `node scripts/dev/run-store-consultation-fixture.mjs`: 실제 격리 PostgreSQL 15, baseline·전체 incremental schema·상담/상품/권한/공유 경계 **23 checks PASS**, **Fixture cleanup PASS: database count 0**.
- 설명 접수 PostgreSQL integration: 별도 로컬 `description_intake_review`에서 **10 tests PASS**. 실제 XLSX→구조화 승인→일반 본문 수정 후 legacy 전환과 공통 STORE/QR 불변을 확인했다. fixture schema 삭제를 확인한 뒤 전용 DB를 제거한다.
- ESLint 변경 TypeScript 파일: 오류 0, 기존 미사용 변수 경고 2개. 문서 민감정보 패턴 0건(5개 문서), 로컬 문서 링크 누락 0건, diff whitespace 검사 통과.
- 상담 fixture의 ‘populated down’은 마지막 migration을 상담 migration으로 오인하던 문제를 상담 migration 명시 참조로 고쳤다. 운영 migration·schema는 수정하지 않았다.
- `node scripts/checks/consultation-context.browser.mjs`: 실제 Chromium, 합성 API, **1440/820/390px 모두 PASS**. 자동 언어 감지→맥락 검색→후보 확인→다음 고객 초기화→관리자 revision 저장→권한 회수와 현황 표시를 확인했다. 실제 Tailwind 설정·콘솔 pageerror·외부 요청 0·가로 넘침 없음도 검사했다. 실제 마이크와 Google는 사용하지 않았다.
- 캡처는 `/tmp/o4o-consultation-context-{1440,820,390}.png`의 로컬 증거다. 캡처/합성 결과를 운영 업무 데이터로 저장하지 않는다.

## 미확인·운영 인계

- 실제 Google 프로젝트/API·ADC·가격/할당량/비용 상한·후보 언어와 현장 음성/번역 품질은 미검증이다. 선택을 저장할 수 있다는 사실을 연결·실행 완료로 보고하지 않는다.
- 중앙 B2B 구조화 자료 확보·실제 정기 갱신 주기/담당과 기존 미연결 게시 자료의 처리는 운영에서 확정한다.
- 실제 약사 자격/매장 업무/직원 기능 허용·환경 직원 계정 정상화는 별도 운영 준비다. 개발이 권한을 자동 부여하지 않는다.
- 실제 태블릿·약사 언어 검수·원천 제공자 지연/비용·실계정 접근 회수는 기존 보류 범위를 유지한다. 테스트 계정이라고 업무 데이터/유료 호출 승인을 추정하지 않는다.
- 이 개발 공간은 main 병합·auto-merge·배포를 수행하지 않는다. 같은 PR의 최종 HEAD·CI·리뷰·최신 main 대비 위치를 확인해 인계한다.

문서 정합: 통합 TODO를 개발 지시와 실제 구현 상태로 갱신했고 상담 데이터 범위·상품 AI 자료 안내·실행 수단/평가 안내를 대조했다. 과거 배포/관측 기록은 보존한다.
