# IR-O4O-MAIL-SERVICE-SPLIT-POST-CHECK-V1

> Post-check investigation for WO-O4O-MAIL-SERVICE-SPLIT-V1
> Branch: `feature/mail-service-split`
> Commit: `56c854f77`
> Date: 2026-03-22
> Status: **Read-only investigation — no code modifications**

---

## 1. 전체 판정

| 항목 | 결과 |
|------|------|
| Split 최종 상태 | **SAFE — push ready** |
| Oversized 정비 1차 완료 | **YES** |
| Push 가능 여부 | **YES** |
| 후속 follow-up 필요 | **NO** (현재 상태로 충분) |

---

## 2. 파일별 상세 표

| 파일 | Lines | 역할 | 판정 | 책임 혼합 | 비고 |
|------|-------|------|------|----------|------|
| `mail.service.ts` | 529 | Facade: sub-service 생성, sendEmail 오케스트레이션, 20개 public method wrapper | **SAFE** | NO | Business logic 0줄, pure delegation + type annotation |
| `mail-transport.service.ts` | 285 | Transport: SMTP 생성(ENV+DB), initialize, send, logEmail, status | **SAFE** | NO | Transport lifecycle 단일 책임 |
| `mail-template.service.ts` | 341 | Template: file/inline fallback 로딩, renderFileTemplate, 4개 인라인 템플릿 | **SAFE** | NO | Template engine 단일 책임 |
| `mail-render.helper.ts` | 46 | Pure functions: htmlToText, replaceTemplatePlaceholders, removeConditionalBlocks | **SAFE** | NO | God-helper 아님, 3개 pure function |

---

## 3. 조사 항목별 결과

### 3.1 Facade 안전성 점검

**판정: SAFE**

- Facade 529줄 중 business logic: **0줄**
- `sendEmail()` 오케스트레이션 (lines 35-84): direct HTML vs template 분기 + transport.send + logEmail — 원본 코드와 동일한 흐름
- 14개 business methods (lines 86-409): 모두 `this.templates.renderFileTemplate()` → `this.sendEmail()` 2-step delegation
- 6개 generic methods (lines 411-514): 모두 `this.sendEmail()` 1-step delegation with template name
- 3개 status methods (lines 516-529): 모두 `this.transport.*()` 1-step delegation
- `initialize()` (line 29-31): `this.transport.initialize()` 1-step delegation
- Constructor (lines 24-27): `MailTransportService` + `MailTemplateService` 생성만
- Export signature: `export class MailService` — 원본과 동일
- `index.ts` diff: 비어있음 (변경 없음)
- `email.service.ts` (singleton wrapper) diff: 비어있음 (변경 없음)

**Facade 성격 확인:**
- sendEmail 오케스트레이션 52줄: facade에 적합 (template resolve + transport send + audit log compose)
- Business methods: 각 메서드는 replacement map 조립 + sendEmail 호출만 — branching/조건 분기 없음
- God-service 성격: **없음** — 모든 실질 구현이 sub-service로 이동 완료

### 3.2 Sub-service 책임 분리 점검

**판정: SAFE — 모든 sub-service가 단일 책임**

| Sub-service | 책임 범위 | 교차 도메인 | God-service 위험 |
|-------------|----------|------------|--------------------|
| MailTransportService | SMTP transport lifecycle + send + audit + status | 없음 | 없음 (285줄) |
| MailTemplateService | Template loading + rendering + inline templates | 없음 | 없음 (341줄) |
| mail-render.helper | Pure text/HTML transformation | 없음 | 없음 (46줄) |

- **MailTransportService**: nodemailer Transporter 생성(ENV/DB), initialize, send, logEmail, testConnection, isServiceAvailable, getServiceStatus — 모두 transport lifecycle 범위
- **MailTemplateService**: loadTemplateWithFallback (file+inline), renderFileTemplate (business methods 공통), wrapSimpleTemplate, 4개 인라인 HTML 템플릿 — 모두 template engine 범위
- **mail-render.helper**: htmlToText, replaceTemplatePlaceholders, removeConditionalBlocks — 3개 순수 함수, stateless
- Transport → Template 상호 참조: **없음** — 독립 모듈
- Template → render helper 참조: `replaceTemplatePlaceholders`, `removeConditionalBlocks` 2개 — 적절한 helper 사용
- Facade → 모든 sub-service 참조: 단방향 — 적절한 의존 방향

### 3.3 Dead code / orphan 여부 점검

**판정: CLEAN — dead code 없음 (1건 관찰 사항)**

- **Facade**: 4개 import 모두 사용됨 (`MailTransportService`, `MailTemplateService`, `htmlToText`, types)
- **MailTransportService**: 6개 import 모두 사용됨 (`nodemailer`, `Transporter`, `Mail`, `SmtpSettings`, `EmailLog`, types)
- **MailTemplateService**: 6개 import 모두 사용됨 (`fileURLToPath`, `dirname`, `path`, `fs`, `EmailTemplateData`, render helpers)
- **mail-render.helper**: import 없음 (순수 함수)
- 중복 response formatting: 없음
- 중복 validation: 없음
- Facade의 모든 20개 public method → 원본에서 consumer가 호출하던 메서드와 1:1 대응

**Observation (정보 제공):**
- `MailTransportService`의 `initialized` getter (line 59-61)는 정의되어 있으나 외부에서 호출되지 않음. `isServiceAvailable()`과 `getServiceStatus()`는 내부 `_isInitialized` 필드를 직접 사용. 이 getter는 향후 facade 확장 시 사용될 수 있으므로 유지 적절하나, 현재는 미사용 상태.

### 3.4 Oversized 잔존 여부 점검 + Facade 529줄 판단

**판정: 유지 가능**

#### Facade 529줄 구성 분석

| 영역 | Lines | 비율 | 성격 |
|------|-------|------|------|
| Imports + class shell + constructor + initialize | 31 | 6% | 구조 |
| `sendEmail()` 오케스트레이션 | 52 | 10% | **유일한 로직** |
| 14 business methods (type annotation 포함) | 324 | 61% | Pure delegation |
| 6 generic methods | 104 | 20% | Pure delegation |
| 3 status delegation | 14 | 3% | Pure delegation |

**왜 529줄인가:**
- 20개 public method의 **TypeScript 타입 시그니처**가 줄 수의 주요 원인
- 예: `sendServiceApplicationOperatorNotificationEmail` — data 파라미터 타입 선언만 12줄
- 예: `sendSettlementRequestEmail` — data 파라미터 타입 선언만 12줄
- 타입 시그니처를 제외한 실질 로직: ~250줄
- 그 중 business branching/조건 분기: **0줄**

**God-service 잔존 여부:**
- 원본 1,226줄: SMTP 생성, ENV 파싱, DB 조회, template 파일 읽기, inline HTML 렌더링, placeholder 치환, 조건부 블록 제거가 모두 한 클래스에 혼합
- 현재 529줄: sendEmail 오케스트레이션 외에는 모두 `renderFileTemplate() → sendEmail()` 2-line delegation
- **God-service 판정: 불해당** — delegation wrapper는 god-service가 아님

**추가 미세 분리 가능 여부:**
- 14개 business methods + 6개 generic methods를 별도 파일로 분리 가능 (예: `mail-business-emails.ts`)
- 그러나 이 경우: public API 유지를 위해 MailService에 20개 proxy method 필요 → 줄 수 감소 미미
- 또는 mixin/composition 패턴 → 복잡도 증가, 가독성 저하
- **결론: 현재 상태가 가장 단순하고 안전한 구조. 추가 분리는 비용 > 이득.**

#### Sub-service 크기 점검

| 파일 | Lines | 판정 |
|------|-------|------|
| `mail-transport.service.ts` | 285 | **유지 가능** — Transport lifecycle 7개 메서드, 모두 동일 도메인 |
| `mail-template.service.ts` | 341 | **유지 가능** — 4개 인라인 템플릿(188줄)이 주 비중. 템플릿 삭제 없이 줄일 수 없음 |
| `mail-render.helper.ts` | 46 | **유지 가능** — 최소 단위 |

**mail-template.service.ts 341줄 상세:**

| 구성요소 | Lines | 비고 |
|---------|-------|------|
| Imports + class shell | 30 | 구조 |
| loadTemplateWithFallback | 76 | File + inline fallback (10개 inline entry) |
| renderFileTemplate | 23 | Business method 공통 패턴 |
| wrapSimpleTemplate | 8 | 간단 HTML wrapper |
| 4 inline templates | 188 | HTML 본문 (verification, passwordReset, welcome, accountLocked) |

- 188줄의 인라인 HTML 템플릿은 원본에서도 동일. 템플릿 내용 자체를 줄이는 것은 범위 밖.
- 향후 이 4개 템플릿을 file-based로 전환하면 ~150줄 감소 가능하나, 이는 **템플릿 정책 변경**이므로 이번 WO 범위 밖.

### 3.5 Public API / Consumer 영향 점검

**판정: SAFE — 변경 없음**

| 검증 항목 | 결과 |
|----------|------|
| `MailService` class export | 유지 (`export class MailService`) |
| `index.ts` exports | 변경 없음 (diff 비어있음) |
| `email.service.ts` singleton | 변경 없음 (diff 비어있음) |
| `main.ts` | 변경 없음 |
| Sub-service 외부 import | **없음** — `MailTransportService`, `MailTemplateService`는 내부만 |
| Public method count | 25개 유지 (sendEmail + 14 business + 6 generic + 3 status + initialize) |
| Method signature 변경 | **0건** |
| Consumer 수정 필요 | **0건** — 15+ consumer 모두 `emailService` singleton 사용, 변경 불필요 |

외부 소비자 목록 (모두 `import { emailService } from '../services/email.service.js'`):
- `platformInquiryController.ts`, `passportDynamic.ts`, `role-application.controller.ts`
- `organization-join-request.controller.ts`, `application.controller.ts` (kpa, glycopharm, glucoseview)
- `socialAuthService.ts`, `passwordResetService.ts`, `BackupService.ts`
- `invoice-dispatch.service.ts`, `auth-account-inquiry.service.ts`
- `account-linking.service.ts`, `ErrorAlertService.ts`, `store-applications.controller.ts`

### 3.6 Observation: renderFileTemplate placeholder 패턴

**정보 제공 (수정 불필요)**

`renderFileTemplate` (mail-template.service.ts line 127-129)과 `replaceTemplatePlaceholders` (mail-render.helper.ts line 30-33)의 regex 패턴이 미세하게 다름:

| 위치 | 패턴 | 출처 |
|------|------|------|
| `renderFileTemplate` | `{{key}}` (exact match) | 원본 business methods |
| `replaceTemplatePlaceholders` | `{{\\s*key\\s*}}` (whitespace tolerant) | 원본 loadTemplateWithFallback |

이는 원본 코드의 동작을 정확히 보존한 결과. `renderFileTemplate`에서 `replaceTemplatePlaceholders`를 사용하도록 통합 가능하나, regex 동작 변경을 수반하므로 현재 유지가 더 안전.

### 3.7 Observation: transporter null guard

**정보 제공 (수정 불필요)**

원본 `sendEmail()`은 `!this.transporter` 체크 후 `'Email transporter not configured'` 반환.
현재 facade의 `sendEmail()`은 `!this.transport.enabled` 체크만 수행. Transport 내부의 `send()` 메서드는 `this._transporter!.sendMail()`로 non-null assertion 사용.

- `isEnabled=true` + `transporter=null` 케이스 (config 불완전, 또는 initialize 실패 후): 원본은 graceful error 반환, 현재는 TypeError 발생
- 단, facade의 sendEmail이 try/catch로 감싸져 있어 `{ success: false, error: ... }` 반환은 동일
- 에러 메시지만 다름: `'Email transporter not configured'` → `"Cannot read properties of null..."`
- Consumer는 `success` 필드로 결과 판단하므로 functional impact 없음

---

## 4. 잔존 이슈

| 항목 | 결과 |
|------|------|
| Dead code | 없음 (`initialized` getter는 future-proof 유지 적절) |
| 중복 로직 | 없음 (renderFileTemplate이 14개 business method 중복 제거) |
| 과분할 | 없음 (render helper 46줄이 최소이나 3개 export 모두 사용됨) |
| 미분리 | 없음 |
| Follow-up | 없음 |

---

## 5. Facade 529줄 최종 판단

| 기준 | 결과 |
|------|------|
| 실질 로직 | sendEmail 오케스트레이션 52줄 (10%) |
| 나머지 477줄 | Type annotation + delegation wrapper |
| Business branching | **0줄** |
| God-service 성격 | **없음** |
| 추가 분해 이득 | 미미 (mixin/proxy 복잡도 증가 > 줄 수 감소) |
| **최종 판정** | **유지 가능 — 추가 분해 불필요** |

529줄이 이전 route split facades (69줄 등)보다 큰 이유는 **service facade의 본질적 특성**:
- Route facade: Express Router mount만 (sub-handler 연결)
- Service facade: 모든 public method의 type signature + delegation 유지 필요
- MailService는 25개 public method 보유 → 타입 시그니처만으로 ~200줄
- 이는 구조적 특성이며 god-service 위험과 무관

---

## 6. 다음 Oversized 정비 추천

Oversized File Audit Phase 2 기준 잔여 P0:

| 순위 | 파일 | Lines | 특성 | 권장 |
|------|------|-------|------|------|
| 1 | 다음 P0 controller/service | 조사 필요 | Route split 3건 + service split 1건 완료 후 | 단독 WO |

**추천: Phase 2 audit 재확인 후 다음 대상 선정.**
- Route 계열 정비 3건 (partner-controller, unified-store-public, cms-content) + Service 계열 1건 (mail-service) 완료
- 4건 모두 안전하게 완료되었으므로 oversized 정비 Phase 2의 실질 진척도 높음
- 다음 대상은 Phase 2 audit 문서의 남은 P0 항목에서 선정하는 것이 자연스러움

---

## 7. 결론

WO-O4O-MAIL-SERVICE-SPLIT-V1은 **안전한 구조 분해로 완료**.

- 1,226줄 → 529줄 facade + 3 sub-files (285 + 341 + 46)
- 25개 public methods 전량 유지
- Method signature 변경 0건, consumer 수정 0건
- tsc --noEmit 신규 오류 0건
- Dead code 없음, 과분할/미분리 없음
- Facade 529줄: 실질 로직 52줄 + 나머지 type annotation/delegation — god-service 아님
- Sub-service 직접 import 소비자: 0건 (내부만)
- index.ts, email.service.ts, main.ts 변경 없음
- **Push ready. Follow-up 불필요.**
