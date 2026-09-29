# CHECK-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1

> **WO**: WO-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1 (전달본이 §27 「디자인 방향」 중간에서 끊겼다 — §1~§26 과 §27 에 보이는 원칙까지 따랐다)
> **선행**: [IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1](../investigations/IR-O4O-NETURE-HOME-CURRENT-STATE-AND-IA-REDESIGN-V1.md) 안 2 · WO-O4O-NETURE-REGISTER-AUTHENTICATED-LOOP-FIX-V1(`3f94c685c`)
> **작성일**: 2026-09-29
> **판정**: **CODE_COMPLETE · PRODUCTION_SMOKE_PENDING_DEPLOY** (배포는 이 WO 범위 밖)

---

## 1. 결과 요약

| 구분 | 이전 | 이후 |
|---|---|---|
| 로그인 전 첫 화면 | 워드마크 → 「무엇을 도와드릴까요?」 → 첫 사용 안내 → AI 입력 → 소개문 → 로그인/회원가입 → pill 4개 → 소식(0건이어도 표시) | **O4O 소개 + [Google로 시작] → 주요 서비스(설명형 3) → O4O AI(같은 Composer) → 참여 · 학습(보조 3) → 소식(글이 있을 때만)** |
| 로그인 후 | 워드마크 → 「무엇을 도와드릴까요?」 → 첫 사용 안내 → AI → HomeEntryPanel | **그대로**(구조 · 순서 · 계약 불변) |
| 우상단(로그인 전) | 로그인 · 회원가입 | **로그인 하나**(같은 Google 흐름) |
| 본문 CTA | 로그인 · 회원가입 | **Google로 시작** 하나 |
| 첫 사용 안내 | 로그인 전후 모두 첫 화면을 차지 | **로그인 후에만**(localStorage 키 `neture:automation:intro-seen:v1` 불변) |
| 서비스 소식(로그인 전) | 0건이어도 섹션 · 바로가기 · "아직 등록된 소식이 없습니다." | 글이 있을 때만 · 첫 로딩 중 비표시 · **오류는 그대로(재시도)** |
| 로그인 모달 | 「Neture 로그인 · 공급자 연결 서비스」 (모든 호스트) | 「**O4O 로그인**」 + 호스트별 보조 문구(대표 = O4O 서비스 통합 로그인 · supplier = 공급자 서비스 · funding = 유통참여형 펀딩 · community = 커뮤니티) |

## 2. 로그인 전 정보구조 (구현)

```text
[우상단] 로그인
① O4O
   온라인의 정보와 콘텐츠를 / 오프라인 매장의 활동으로 연결합니다.
   약국 · 전문매장 · 공급자가 정보와 콘텐츠를 실제 매장 업무에 활용할 수 있도록 연결합니다.
   [Google로 시작]                      ← 세션 복구 중에는 숨김
② 서비스를 찾으세요 (nav "주요 서비스")
   약국    약사와 약국을 위한 커뮤니티와 매장 지원 서비스         → https://pharmacy.neture.co.kr/
   리테일  전문매장을 위한 매장 콘텐츠와 운영 지원 서비스         → https://retail.neture.co.kr/
   공급자  제품과 콘텐츠를 등록해 매장에 공급하는 공급자 업무 공간 → https://supplier.neture.co.kr
③ O4O AI
   O4O AI로 질문하고 업무를 시작할 수 있습니다. 로그인하면 질문 · 파일 분석과 지원되는 업무 기능을 이용할 수 있습니다.
   [Composer — 비로그인 제출은 실행하지 않고 로그인 모달]
④ 참여 · 학습 (nav "참여 · 학습" · 카드 없는 보조 진입)
   커뮤니티         → https://community.neture.co.kr
   O4O 강의         → https://study.neture.co.kr
   유통참여형 펀딩  → https://funding.neture.co.kr
⑤ O4O 서비스 소식 — 글이 있을 때만
Footer (이용약관 · 개인정보처리방침 · Contact · 법정정보 — 불변)
```

- 모바일: 주요 서비스 1열 · 참여 · 학습 1열, sm(640px) 이상 3열. 한글 단어 중간 줄바꿈 방지(`word-break: keep-all`).
- 서비스 링크는 종전과 같이 새 탭(`noopener`). URL 은 기존 정본 재사용(`HOST_ORIGIN` · 서브도메인) — 새 route · URL config 없음. 강의 주소는 web-neture 에 상수가 없어 리터럴(`study.neture.co.kr` — catalog `lecture.domain` 과 동일).
- 제외: **내 매장**(로그인 후 업무 공간 · HomeEntryPanel 이 진입을 만든다) · **병원약국**(`/hospital`) · 구 호스트 3개 · 「약국 경영」.
- 분류명: 「화장품」 → **「리테일」**(대표 홈 표시만 · 서비스 내부 브랜드 불변).
- 문구: 모집 여부 · 강좌 수 같은 동적 사실을 정적으로 쓰지 않았다(「지금 참여 · 모집 중 · 지금 학습 · 수강하세요」 금지를 테스트로 고정).

## 3. AI Composer

- **하나의 JSX(`composerArea`)를 위치만 바꿔 배치**한다 — 복제 0. 로그인 전 = ③ O4O AI 섹션 안 / 로그인 후 = 워드마크 · 「무엇을 도와드릴까요?」 아래(종전 위치).
- 요청 · 첨부 · confirm · work · browser 로그인 완료 · 세대 카운터 · 로그아웃 초기화 로직은 **한 줄도 바꾸지 않았다**(줄 이동은 스크립트로 들여쓰기만 조정).
- 비로그인 제출 = `openLoginModal()` · 입력 유지(종전 계약 그대로).

## 4. 보존한 계약 (변경 0)

| 대상 | 확인 |
|---|---|
| `HomeEntryPanel` · `lib/home-entry.ts` · `GET /communities` · `/neture/home/entry` · `/work-scope/operator-services` · `/auth/services` · `POST /auth/handoff` | 파일 무변경 |
| `/register` 수정(`3f94c685c`) — 비로그인 모달 / 로그인 모달 없이 `/` / 복구 중 대기 · Neture 가입 항목 비노출 | `RegisterRedirect` · `home-entry` 무변경, 해당 테스트 통과 |
| Google 인증 — `GoogleContinue` · `loginWithGoogle` · `signupWithGoogle` · 약관 동의 후 계정 생성 | LoginModal 은 제목 · 보조 문구 2줄만 변경 |
| `service_memberships('neture')` · `service-catalog.ts` · `joinEnabled` | 무변경 |
| 소식 API · 포럼 데이터 모델 | 무변경(`hideWhenEmpty` 는 표시 옵션) — 로그인 후 newsSlot 은 종전 표시(0건 안내) 유지 |
| 법정 Footer | 무변경 |

## 5. 변경 파일

| 파일 | 내용 |
|---|---|
| `services/web-neture/src/pages/O4OHomePage.tsx` | 로그인 전/후 분기 · 소개 · 주요 서비스 · 참여 · 학습 · Composer 위치 · CTA 단일화 |
| `services/web-neture/src/components/home/HomeServiceNews.tsx` | `hideWhenEmpty` (첫 로딩 · 0건 비표시, 오류 표시) |
| `services/web-neture/src/components/LoginModal.tsx` | 제목 「O4O 로그인」 · 호스트별 보조 문구(`hostProfile.CURRENT_HOST_PROFILE`) |
| `services/web-neture/src/pages/__tests__/O4OHomePage.entry-pills.test.tsx` | 새 구조로 재작성(로그인 전 9 · 로그인 후 3) |
| `services/web-neture/src/components/home/__tests__/HomeServiceNews.hide-when-empty.test.tsx` | 신규 5 |
| `services/web-neture/src/components/__tests__/LoginModal.host-subtitle.test.tsx` | 신규 4 |

## 6. 검증

| 항목 | 결과 |
|---|---|
| 신규 · 재작성 테스트 | 21/21 PASS |
| web-neture 전체 vitest | 32 files / 281 tests PASS |
| `tsc --noEmit` (web-neture) | 0 |
| eslint (변경 파일) | error 0 · warning 1 = `O4OHomePage` 의 기존 `eslint-disable` 미사용 경고(origin/main 원본에도 동일 — 이 WO 가 만든 것 아님) |
| `vite build` (web-neture) | 성공 |
| 이 파일들을 텍스트로 읽는 API spec · e2e | 없음(검색 0) |
| **로컬 렌더 확인** (vite preview · Chromium 1280×900 / 390×844) | 순서 · 위계 의도대로 · 페이지 오류 0 · 가로 스크롤 0. 로컬은 API 미연결이라 소식이 "불러오지 못했습니다 + 다시 시도" 로 보임 = 오류 표시 계약대로(운영에서는 글 유무로 판정) |

- 로그인 후 화면 · 실제 Google 로그인 · 실제 소식 데이터는 로컬에서 보지 않았다(운영 인증 · API 필요) → 아래 §7.

## 7. 운영 확인 (배포 후 · PENDING)

1. `neture.co.kr` 비로그인: 순서 ① ~ ⑤ · 주요 서비스 3 · 참여 · 학습 3 링크가 각 서브도메인으로 열림 · 「회원가입」 버튼 없음
2. [Google로 시작] · 우상단 [로그인] → 모달 제목 「O4O 로그인」 · 「O4O 서비스 통합 로그인」 · 신규 Google 계정 약관 동의 → 가입
3. 비로그인 AI 입력 → 제출 시 로그인 모달(요청 실행 0)
4. 소식: 운영 소식 포럼 글 유무에 따라 표시/비표시
5. 로그인 후: 종전과 같은 AI → HomeEntryPanel · 첫 사용 안내(미열람자) · `/register` 루프 없음
6. `supplier` · `funding` · `community` 호스트 로그인 모달 보조 문구

## 8. 잔여 · 범위 밖

| # | 항목 |
|---|---|
| R1 | 시각 자산(이미지 · 배너)은 이 화면을 기준으로 필요 시 별도 판단(WO §26) |
| R2 | 로그인 모달의 미가입 안내 문구(「Neture 서비스 이용 권한이 없습니다 … Neture 이용 신청하기」)는 인증 흐름 문구라 손대지 않았다 |
| R3 | WO 원문 §27 이후(끊긴 부분)에 추가 요구가 있었다면 반영되지 않았다 — 원문 확인 필요 |

## 9. 문서 정합

해당 없음 (기준 문서 변경 0 · IR 의 L5 「로그인 모달 명칭 불일치」 는 이 CHECK 로 처리 기록)
