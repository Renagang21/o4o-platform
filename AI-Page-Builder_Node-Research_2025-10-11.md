AI-Page-Builder — Node.js 기반 최신 구조·보안·신뢰성 조사 (2024–2025)

환경 기준
- 런타임: Node.js 20.x 이상
- 프런트엔드: React 19
- 백엔드: Express / NestJS / Fastify / Medusa
- 데이터베이스: PostgreSQL (보조: Redis 권장)
- 제약: 코드 수정·실행 금지(읽기 전용), 비공개 키·토큰 요청 금지

1) AI 호출 아키텍처 — 보안·프록시·비밀관리
핵심 요약
- 브라우저 직접 LLM 호출은 API 키 노출·남용·과금 위험이 크므로 서버 프록시로 전환해야 한다.
- 프록시에서는 키 보관(Vault/KMS/환경변수), 키 회전, 모델·엔드포인트 화이트리스트, 입력·크기 제한, 레이트리밋·감사로그를 적용한다.
- Node 20+ 표준 fetch/AbortController로 타임아웃·취소를 강제하고, 429/503 재시도 정책을 프록시에서 일원화한다.
- Express/Nest/Fastify는 미들웨어/가드/플러그인으로 인증·권한·검증 체인을 표준화할 수 있다.
- 현재 레포는 프런트에서 직접 호출과 키 입력 방식이므로, 서버 사이드 프록시 + 관리자 설정 저장(암호화/비공개)로 교체 권장.

인용(출처·발행일·링크)
- OpenAI Help Center: Best Practices for API Key Safety, accessed 2025-10-11 — https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
- MDN: AbortSignal.timeout() static method, Last-Modified: 2024-12-31 — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
- Helmet Official Site, Last-Modified: 2025-08-24 — https://helmetjs.github.io/

체크리스트
- 서버 프록시 도입: 클라이언트에서 모델·프롬프트·설정만 전달, 키는 서버에서 주입
- 키 보관: KMS/Vault/환경변수, 최소권한, 접근감사, 정기 롤테이션(비상 회수 경로 포함)
- 화이트리스트: 허용 모델/엔드포인트·파라미터 상한(토큰/문자 수/파일 크기)·비허용 옵션 차단
- 유효성 검증: JSON 스키마/DTO로 요청 검증, 프롬프트 길이·배열 크기 제한
- 레이트리밋: 사용자·세션·IP·테넌트 차등 한도, 429 헤더 표준화
- 로깅·감사: 호출 ID, 사용자/세션, 모델/버전, 비용 추정, 장애지표 포함

리스크·완화책
- 키 탈취(DevTools/소스맵/Extensions): 키의 클라이언트 배포 금지→서버 보관, 단기 키·스코프 제한·회전
- 프록시 남용: 인증·권한 필수(세션/JWT), 모델·토큰 상한, 비용 한도 및 알림
- CORS 오개방: Origin 제한·Credentials 정책·사전검사 캐시
- 메모리 누수·대응지연: 스트리밍/백프레셔·AbortSignal로 취소·타임아웃 기본값(예: 15s)

레포 매핑 제안
- 클라이언트 직접 호출 제거: apps/admin-dashboard/src/services/ai/SimpleAIGenerator.ts
  - OpenAI 직접 호출 증거: L120–L126 ‘https://api.openai.com/v1/chat/completions’ + Authorization 헤더
  - Gemini 직접 호출 증거: L174–L176 ‘generativelanguage.googleapis.com’ + key=쿼리
  - Claude 직접 호출 증거: L239–L247 ‘https://api.anthropic.com/v1/messages’ + x-api-key
- 서버 프록시 신설: apps/api-server/src/routes/ai.proxy.ts(신규) 또는 /api/ai/generate
  - 인증(쿠키/JWT)→입력 검증→모델 화이트리스트→키 주입→호출→비용/지표 로깅→429/503 재시도 헤더 전달
  - 요청 크기 제한: express.json({limit}) + 업로드 제한
  - RateLimit: express-rate-limit 인스턴스 전용(모델별/사용자별)
- 관리자 키 저장: apps/api-server/src/controllers/v1/ai-settings.controller.ts
  - 현재 saveSettings는 DB에 평문 저장(증거: get/save/delete 로직, 암호화 언급 없음). 키 암호화(예: KMS envelope) 및 마스킹 응답 권장.

2) 미리보기(Preview) 보호 — 토큰·만료·서버 검증
핵심 요약
- 프리뷰는 초안·비공개 콘텐츠 접근 경로이므로, 임시 토큰/쿠키 기반 인증과 짧은 TTL, 서버 검증이 필요하다.
- Next.js Draft/Preview Mode는 서버에서 프리뷰 쿠키를 설정하고 브라우저 요청을 동적으로 처리하는 패턴을 제시한다.
- URL 토큰은 서명(JWT/UUID+서명), 단기 만료(TTL 분 단위), 1회성·무효화(서버 저장/블랙리스트)가 필요하다.
- CORS·X-Frame-Options/CSP는 최소 원점만 허용하고, 캐시 무효화 헤더를 명시한다.
- 현재 /api/preview는 공개 접근과 만료 검증 부재가 관찰되어 보호 레이어 도입이 필요하다.

인용(출처·발행일·링크)
- Next.js Guides: Draft Mode, accessed 2025-10-11 — https://nextjs.org/docs/app/guides/draft-mode

체크리스트
- 토큰 설계: JWT(iss, sub, scope, exp≤10m, jti), 또는 UUID+서명+서버 저장(TTL)
- 검증 플로우: 인증→토큰검증(exp/nbf/iss/scope)→원점검사(Referer/Origin)→리소스 스코프 제한→로깅
- 무효화: 서버 저장소(예: Redis SETEX)와 사용 후 즉시 만료(1회성) 또는 블랙리스트
- 응답 헤더: Cache-Control: no-store, CSP frame-ancestors 허용 도메인만, X-Frame-Options: DENY/SAMEORIGIN(필요 시 frame-ancestors로 대체)
- 프리뷰 채널: WS/SSE는 세션 인증 필수, 액션별 레이트리밋

리스크·완화책
- 링크 유출/브루트포싱: 토큰 고엔트로피·짧은 TTL·1회성·IP 고정/사용자정보 바인딩
- Clickjacking/Embedding: frame-ancestors 최소화, 전용 도메인 사용, 이벤트 브릿지 최소화
- 캐시 오염: no-store/no-cache, 프록시 캐시 우회 파라미터 금지

레포 매핑 제안
- 공개 접근 증거: apps/api-server/src/routes/preview.ts
  - GET /api/preview 핸들러는 인증 미적용(L37–L45), Access-Control-Allow-Origin: * (L116)
  - ‘/ws’만 authenticateToken 적용(L18–L20)
  - generate에서 previewToken 생성하나 저장/검증 없음(L146–L159 주변)
- 권장 구현
  - POST /api/preview/token: 인증 필요, JWT(jti, exp≤10m) 발급·Redis 저장
  - GET /api/preview?token=…: 미들웨어에서 토큰 검증·소비(1회성)·원점검사·no-store
  - Helmet: frameguard 복구, CSP frame-ancestors 화이트리스트만 허용(현재 main.ts에서 frameguard false)

3) 비동기 신뢰성 — 타임아웃·취소·재시도·백오프·큐잉
핵심 요약
- Node 20+의 AbortSignal.timeout()으로 호출 타임아웃과 취소를 표준화한다.
- 429/503는 Retry-After를 우선 해석하고, 지터 포함 지수 백오프로 재시도한다.
- axios-retry/p-retry는 재시도 정책을 캡슐화하고, 서버 측 큐(BullMQ)로 긴 작업을 워커에 위임한다.
- SSE/웹소켓으로 진행 상황을 스트리밍해 UX와 타임아웃 충돌을 최소화한다.
- 현재 LLM 호출·게시 파이프라인에 표준 타임아웃/취소/재시도/큐 연동이 부재.

인용(출처·발행일·링크)
- MDN: AbortSignal.timeout() static method, Last-Modified: 2024-12-31 — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
- axios-retry GitHub Releases, accessed 2025-10-11 — https://github.com/softonic/axios-retry/releases
- BullMQ Docs, accessed 2025-10-11 — https://docs.bullmq.io/

체크리스트
- 타임아웃 기본값: 10–15s(외부 LLM), 서버 상한 30–60s, 사용자 취소 버튼 연결
- 재시도: 최대 3–5회, 지터 포함 exponential backoff(base 500–1500ms, factor 2, cap 20–30s), Retry-After 존중
- 큐잉: BullMQ로 작업 enqueue, 전용 워커(동시성·재시도·데드레터), 결과/상태 저장
- 스트리밍: SSE/WS로 진행률, 중간 결과, 취소·재시도 제어 이벤트
- 관측성: 시도 횟수, 대기·실행 시간, 에러 코드, 비용/토큰 로깅

리스크·완화책
- 폭주 재시도/서빙 폭주: 전역 리밋·circuit breaker·서킷 열림 시 폴백 응답
- 장기 작업 타임아웃: 큐로 비동기화·결과 조회 API·프런트 폴링/스트리밍
- 비용 폭증: 모델·토큰 상한, 일일 한도, 경보/차단

레포 매핑 제안
- 프런트 LLM 호출에 AbortSignal 사용 추가 및 프록시 단일화(현재 SimpleAIGenerator에 타임아웃·취소 처리 없음; validateBlocks만 존재 L394–L405)
- 서버 큐: apps/api-server/src/services 하위에 bullmq 작업큐 도입, 프리뷰/게시/대용량 변환을 워커로 분리
- SSE/WS: apps/admin-dashboard/src/services/previewWebSocket.ts는 연결·핑·재연결 로직 존재(증거: ping 30s, L260+). 서버측 /api/preview/ws 인증 강제 유지

4) 저장/게시의 멱등성 — Idempotency-Key 패턴
핵심 요약
- 동일 요청의 중복 전송·중복 클릭·네트워크 재시도를 서버가 안전하게 흡수하려면 Idempotency-Key가 필요하다.
- 키는 UUID를 권장하고, TTL과 결과·에러 캐싱, 트랜잭션 경계 내 단일 실행을 강제한다.
- 분산/재시작 환경에서 Redis/DB 내구 저장과 해시된 요청 바디 비교가 필요하다.
- Stripe 레퍼런스는 키 헤더, 보존 기간, 응답 재사용을 명확히 규정한다.
- 현재 /api/posts, /api/pages 계열에 멱등키 적용 흔적이 없다.

인용(출처·발행일·링크)
- Stripe Docs: Idempotent requests, accessed 2025-10-11 — https://docs.stripe.com/api/idempotent_requests

체크리스트
- 키 수신: 헤더(예: Idempotency-Key) 또는 POST 바디 필드, UUID 형식 검사
- 요청 해시: 메서드+경로+바디 해시 저장, TTL(예: 24h) 설정
- 실행 보장: 첫 실행 시 트랜잭션 내 기록+결과 저장, 재시도 시 저장된 결과 반환(상태코드·헤더 동일)
- 경합 방지: 키 기반 락(SET NX PX), 동일 키 중복 실행 차단
- 운영: 키 충돌 모니터링, 리플레이 공격 감지(사용자/세션 바인딩)

리스크·완화책
- 키 재사용/충돌: 키 네임스페이스(사용자/리소스/액션), TTL·소비 정책
- 결과 캐시 오염: 요청 바디 해시 비교, 모델 버전/인자 포함

레포 매핑 제안
- 적용 위치: apps/api-server/src/routes/api/posts.ts, pages.ts, content/posts.ts
- 키 저장소: Redis 우선(SET NX PX + 해시/결과 JSON), PostgreSQL 보조(내구성)
- 트랜잭션 경계: TypeORM 트랜잭션으로 단일 삽입·상태 변경 보장
- 증거: 현재 전역 검색에서 Idempotency 미도입(‘Idempotency-Key’/‘idempotenc’ 미검출)

5) 권한·보안 표준 — Authorization·CORS·CSRF·보안 헤더
핵심 요약
- 최소 권한 원칙을 엔드포인트×역할/권한 매트릭스로 구체화하고, 서버에서 권한 검증을 강제한다.
- CORS는 Origin 화이트리스트, 자격증명 설정, 사전검사 캐시를 신중하게 구성해야 한다.
- CSRF는 쿠키 기반 세션에 대해 토큰 이중제출/헤더 전략(csurf)로 보호한다.
- 보안 헤더는 Helmet으로 CSP(frame-ancestors), HSTS, X-Frame-Options(필요 시 CSP로 대체), Referrer-Policy를 정비한다.
- 현재 helmet에서 contentSecurityPolicy/frameguard 비활성, 일부 경로 CORS * 허용 등 허술한 구간 존재.

인용(출처·발행일·링크)
- OWASP API Security Top 10 (current listing; project page), accessed 2025-10-11 — https://owasp.org/API-Security/
- Helmet Official Site, Last-Modified: 2025-08-24 — https://helmetjs.github.io/
- csurf (Express CSRF middleware) GitHub repo, accessed 2025-10-11 — https://github.com/expressjs/csurf

체크리스트
- 권한 매트릭스: 리소스별(Posts/Pages/Media/Settings) CRUD×역할(admin/manager/editor/author)
- 서버 권한 검사: 라우트 미들웨어(requireRole/hasPermission), 객체 수준 접근 검증(ID 소유/테넌트)
- CORS: Origin 제한, Credentials 필요 시 정확한 설정, preflight maxAge 합리화
- CSRF: 쿠키 세션에 한해 토큰 도입, 읽기 전용 GET 예외, SameSite/HttpOnly/Secure 설정
- 헤더: CSP(frame-ancestors 최소), HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

리스크·완화책
- 권한 상승/수평권한: 서버측 RBAC/ABAC, 엔티티 소유 검증, 감사로그
- Clickjacking/Embed: frame-ancestors 엄격화, 예외 경로만 화이트리스트
- CORS 오개방: 특정 라우트만 * 허용(정적 이미지 등), 민감 API는 화이트리스트만

레포 매핑 제안(증거 캡처)
- AdminProtectedRoute(프론트) — packages/auth-context/src/AdminProtectedRoute.tsx
  - requiredRoles 체크 존재, requiredPermissions는 ‘admin’이면 통과로 축약(L200–L208)
- CookieAuthProvider 권한 함수 — packages/auth-context/src/CookieAuthProvider.tsx
  - hasPermission: admin은 전권, 그 외 user.permissions 포함 여부(L201–L206)
- Helmet 설정 — apps/api-server/src/main.ts
  - contentSecurityPolicy: false, frameguard: false, /uploads 및 preview 경로에서 CORS * 허용
- 개선: 서버 측 미들웨어로 권한 매트릭스 적용(requireRole/requirePermission), CSP/Frameguard 재활성, preview 전용 frame-ancestors만 허용

권한 매트릭스(예시)
- /api/posts: reader(view), editor(create/update), admin(delete)
- /api/pages: reader(view), editor(create/update), admin(delete)
- /api/v1/ai-settings: admin only(키 조회/저장/삭제)
- /api/preview: 인증자 토큰 보유자만, 토큰 스코프(page:read:preview)

6) 콘텐츠 스키마·레지스트리 — 버전·마이그레이션·Structured Output
핵심 요약
- 블록/템플릿 스키마에 version/migrations/deprecations 필드를 도입해 변경을 추적한다.
- LLM 출력은 JSON Schema로 강제 검증(Ajv/Zod)하고, 버전업 시 마이그레이션을 통해 하위 호환을 보장한다.
- “Page vs Post” 모델은 분리 유지, API·UI에서도 별도 워크플로(초안→검수→승인→게시) 분리를 권장한다.
- 현재 AI 응답 파서는 최소 검증만 수행(배열 여부), 스키마 라이브러리 검증 부재.
- 블록/숏코드 레퍼런스 동기화 구조는 존재(장점)하나 버전·Deprecated 관리 필드 없음.

인용(출처·발행일·링크)
- MDN: AbortSignal.timeout() static method, Last-Modified: 2024-12-31 — 스키마 검증과는 별개이나 비동기 표준 근거로 재사용 — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static
- OpenTelemetry JS(Node) Getting Started, accessed 2025-10-11 — 관측성 스키마/버전 관리 참고 — https://opentelemetry.io/docs/languages/js/getting-started/nodejs/

체크리스트
- 스키마 레지스트리: { version, migrations[], deprecations[], fields } 구조 확립
- JSON Schema: Ajv/Zod로 요청·응답·LLM 출력 검증, 실패 시 상세 에러·재시도·폴백
- 마이그레이션: 버전별 업/다운 함수, 자동/반자동 변환, deprecation 경고
- 모델 분리: Page vs Post 별도 엔드포인트/권한/상태기계(초안/검수/승인/게시)
- 관측성: 스키마 버전 태그로 로그/메트릭 상관분석

리스크·완화책
- 스키마 드리프트: 레지스트리 단일 출처, CI에서 스키마 호환성 검사
- 파싱 실패/무효 출력: 스키마 검증→자동 수정(마이그레이션)→재시도/폴백 템플릿

레포 매핑 제안(증거 캡처)
- AI 응답 파서: apps/admin-dashboard/src/services/ai/SimpleAIGenerator.ts
  - validateBlocks는 배열 여부만 확인(L394–L405), Ajv/Zod 검증 없음
  - OpenAI/Gemini/Claude 응답 파싱 실패 시 단순 Error throw(L153–L158, L223–L226, L278–L283)
- Page vs Post 혼합 지점
  - 프론트 프리뷰: apps/admin-dashboard/src/App.tsx — PostPreview 컴포넌트를 posts/pages 경로 모두에 사용
  - 서버 프리뷰: apps/api-server/src/routes/preview.ts — pageId 조회에 Post 리포지토리 사용(L58–L66)로 모델 혼동 가능
- 개선
  - AI 출력 스키마 정의(schema/ai-page.json) + Ajv 검증, 실패 시 자동마이그레이션 경고 UX
  - Page/ Post 전용 프리뷰 핸들러 분리 또는 공통 추상화 계층에 타입 필드 검증 추가

부록 — 공통 운영 체크리스트
- 비밀관리: .env 배포 경로 제한, 런타임 주입, 서버측 마스킹, 키 사용 감사
- 보안 미들웨어: Helmet(CSP/HSTS/XFO), cors(Origin 제한), csurf(쿠키 세션 시)
- 네트워킹: Nginx 프록시에서 업로드 크기/시간 제한, 백엔드 동일 제한
- 관측성: OpenTelemetry(Trace+Metrics+Logs), 레이트 리밋/백오프 지표, 비용 대시보드
- 테스트: 프록시 경로 E2E, 프리뷰 토큰 만료·무효화·도메인 검증, 멱등성 재실행 테스트

참고: 조사 일자 2025-10-11, 링크 접근 일자 동일. 일부 공식 문서의 정확한 발행/수정일이 노출되지 않는 경우 ‘accessed’ 기준을 병기했습니다.

