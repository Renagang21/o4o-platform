# 📄 **Step 25 – Phase B-2 AUTH Module Pilot Migration Work Order**

## API Server V2 — AUTH Module Restructuring (Reference Implementation)

**Version:** 2025-12-03
**Author:** ChatGPT PM
**Status:** In Progress

---

# 🎯 목표 (Purpose)

AUTH 모듈을 NextGen Backend V2 구조에 맞게
**Controller → Service → Entity → DTO → Routes**
전체 계층을 통일 패턴으로 리팩토링하고,
향후 모든 모듈이 따를 "표준 템플릿"을 완성한다.

이 작업은 Step 25 전체의 품질을 결정하는 핵심 단계이다.

---

# 📦 AUTH 모듈 전체 파일 (31개)

Inventory 기준 AUTH 관련 주요 파일:

### Entities

* User.ts
* Permission.ts
* Role.ts
* RoleAssignment.ts
* RefreshToken.ts
* UserSession.ts
* LoginAttempt.ts

### Services

* AuthService
* AuthServiceV2
* LoginSecurityService
* PermissionService
* UserService
* RefreshTokenService
* AuthorizationGateService

### Controllers

* AuthController
* UserController
* UserActivityController
* UserRoleController
* PermissionController
* UserRoleSwitchController
* LoginSecurityController

### Routes

* routes/auth.ts
* routes/auth-v2.ts
* routes/user.ts
* routes/users.routes.ts
* routes/v1/* (일부 AUTH 관련)

---

# 🟩 Phase B-2 작업 단계 (총 7단계)

---

## **1️⃣ Step 1 — AUTH 모듈 디렉토리 생성**

경로:

```
apps/api-server/src/modules/auth/
```

하위 폴더 생성:

```
controllers/
services/
entities/
dto/
routes/
interfaces/
middleware/
tests/
index.ts
```

**Status**: ⏳ Pending

---

## **2️⃣ Step 2 — AUTH Entities 이동 (7개)**

아래 파일들을 `modules/auth/entities/` 로 이동:

```
User.ts
Permission.ts
Role.ts
RoleAssignment.ts
RefreshToken.ts
UserSession.ts
LoginAttempt.ts
```

### 적용 규칙

* snake_case table name 유지
* 관계(Entity Relations) forwardRef 또는 type import 적용
* naming standard: PascalCase entity, snake_case table

앞으로 모든 모듈은 동일 방식으로 이동됨.

**Status**: ⏳ Pending

---

## **3️⃣ Step 3 — AUTH Services 마이그레이션 및 통합**

서비스를 `modules/auth/services/` 로 이동 후 다음 작업 수행:

### A) AuthService & AuthServiceV2 → **AuthService (하나로 통합)**

통합내용:

* 로그인
* refresh token
* access token
* 소셜 로그인 (optional)
* session sync

### B) UserService → 그대로 사용, BaseService 상속 적용

### C) PermissionService → RoleService와 통합 또는 분리 유지

### D) LoginSecurityService → validation middleware로 이관 가능

### E) RefreshTokenService → AuthService로 통합

### F) AuthorizationGateService → auth middleware로 대체

### 공통 규칙:

* **모든 서비스는 BaseService 상속**
* repository 직접 접근 금지
* service 간 circular import 금지

**Status**: ⏳ Pending

---

## **4️⃣ Step 4 — AUTH Controllers 재작성 (7개)**

다음 컨트롤러들을 `modules/auth/controllers/` 로 이동 후
모두 **BaseController** 상속 & static method 패턴으로 통일:

```
AuthController
UserController
PermissionController
UserRoleController
UserActivityController
LoginSecurityController
UserRoleSwitchController
```

### Controller 패턴 규칙:

```ts
export class AuthController extends BaseController {
  static async login(req, res) {
    const data = await AuthService.login(req.body);
    return this.ok(res, data);
  }
}
```

**직접 DB 접근 코드 전면 제거.**
Service 호출 구조로 통일.

**Status**: ⏳ Pending

---

## **5️⃣ Step 5 — AUTH DTO 전체 생성**

아래 DTO 파일 생성:

```
dto/login.dto.ts
dto/signup.dto.ts
dto/refresh-token.dto.ts
dto/update-user.dto.ts
dto/create-permission.dto.ts
dto/login-security.dto.ts
dto/role-assign.dto.ts
```

### DTO 규칙:

* class-validator
* class-transformer
* Swagger-like response 타입 포함

예:

```ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

**Status**: ⏳ Pending

---

## **6️⃣ Step 6 — AUTH Routes 재정의**

`modules/auth/routes/auth.routes.ts` 생성:

```typescript
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateDto } from "../../../common/middleware/validation.middleware";

const router = Router();

router.post("/login", validateDto(LoginDto), AuthController.login);
router.post("/refresh", validateDto(RefreshTokenDto), AuthController.refresh);
router.post("/signup", validateDto(SignupDto), AuthController.signup);
router.get("/me", AuthMiddleware.requireAuth, AuthController.me);

export default router;
```

### 그 외 routes:

* `modules/auth/routes/user.routes.ts`
* `modules/auth/routes/permission.routes.ts`

### PREFIX 규칙:

```
/api/auth/*
/api/users/*
/api/permissions/*
```

**Status**: ⏳ Pending

---

## **7️⃣ Step 7 — Tests 구성 (Pilot Module)**

`modules/auth/tests/` 생성 후 다음 테스트 포함:

* login.test.ts
* signup.test.ts
* permissions.test.ts
* user-profile.test.ts

목표 테스트 커버리지: **80%**

**Status**: ⏳ Pending

---

# 🟥 Critical Fix Tasks (Pilot 단계에서 반드시 해결해야 함)

### 1) Circular Dependency #1

`services/app-registry.service.ts` ↔ `services/google-ai.service.ts`

→ AUTH 작업 중에 우선 분리 시작
→ google-ai.service.ts → modules/shared/services/google-ai.service.ts 로 이동

### 2) Circular Dependency #2

`middleware/metrics.middleware.ts` ↔ `queues/webhook.queue.ts`

→ AUTH 단계에서 구조 도입 후
→ Phase B-3에서 최종 해결

---

# 🟦 Pilot Completion 기준 (Definition of Done)

AUTH 모듈 마이그레이션 완료 시:

* [ ] AUTH entities 전체 이동
* [ ] AUTH controllers 전체 BaseController 패턴 적용
* [ ] AUTH services 전체 BaseService 패턴 적용
* [ ] DTO 100% 적용
* [ ] routes/* → modules/auth/routes/* 로 완전 이동
* [ ] circular dependency 2건 중 1건 해결
* [ ] build 정상
* [ ] 테스트 커버리지 80%

이 기준이 충족되면
**AUTH 모듈이 API Server V2 전체의 기준(Reference Implementation)이 됨.**

---

**Phase B-2 AUTH Module Migration**: ⏳ In Progress
**Next Phase**: B-3 (Commerce & Dropshipping Migration)
