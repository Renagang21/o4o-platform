# 🔒 보안 정책 및 가이드

> **O4O Platform의 포괄적인 보안 프레임워크**
> 
> **기준일**: 2025-06-25  
> **적용**: 전체 시스템 보안 강화

---

## 🎯 **보안 전략 개요**

### **보안 원칙**
- **최소 권한**: 필요한 최소한의 권한만 부여
- **심층 방어**: 다중 보안 계층 구축
- **제로 트러스트**: 모든 요청을 검증
- **보안 바이 디자인**: 설계 단계부터 보안 고려

### **보안 계층**
```
🔴 비즈니스 로직    - 역할 기반 접근 제어, 데이터 검증
🟡 애플리케이션     - 인증, 인가, 세션 관리
🟢 네트워크        - HTTPS, 방화벽, DDoS 방어
🔵 인프라          - 서버 보안, 데이터베이스 암호화
```

---

## 🔐 **인증 및 인가**

### **JWT 기반 인증 시스템**
```typescript
// src/auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      algorithms: ['HS256']
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findById(payload.sub);
    
    if (!user || user.status !== UserStatus.APPROVED) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    // 토큰 만료 확인
    if (payload.exp < Date.now() / 1000) {
      throw new UnauthorizedException('토큰이 만료되었습니다.');
    }

    return user;
  }
}
```

### **역할 기반 접근 제어 (RBAC)**
```typescript
// src/auth/roles.decorator.ts
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

// src/auth/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### **비밀번호 보안**
```typescript
// src/auth/password.service.ts
@Service()
export class PasswordService {
  private readonly saltRounds = 12;
  
  async hashPassword(plainPassword: string): Promise<string> {
    // bcrypt를 사용한 안전한 해싱
    return await bcrypt.hash(plainPassword, this.saltRounds);
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  validatePasswordStrength(password: string): boolean {
    // 비밀번호 강도 검증
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
  }
}
```

### **세션 관리**
```typescript
// 토큰 블랙리스트 관리
@Service()
export class TokenBlacklistService {
  private blacklistedTokens = new Set<string>();

  async revokeToken(token: string): Promise<void> {
    this.blacklistedTokens.add(token);
    
    // Redis에 저장 (토큰 만료시간까지)
    const decoded = jwt.decode(token) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    await this.redisClient.setex(`blacklist:${token}`, expiresIn, '1');
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return await this.redisClient.exists(`blacklist:${token}`) === 1;
  }
}
```

---

## 🛡️ **입력 검증 및 데이터 보안**

### **입력 데이터 검증**
```typescript
// src/dto/create-user.dto.ts
export class CreateUserDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력하세요.' })
  @IsNotEmpty({ message: '이메일은 필수입니다.' })
  email: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다.'
  })
  password: string;

  @IsEnum(UserRole, { message: '유효한 역할을 선택하세요.' })
  role: UserRole;
}
```

### **SQL 인젝션 방지**
```typescript
// TypeORM을 사용한 안전한 쿼리
@Repository()
export class UserRepository extends Repository<User> {
  // ✅ 안전한 방법: 파라미터화된 쿼리
  async findByEmailSafe(email: string): Promise<User | null> {
    return await this.findOne({
      where: { email },  // TypeORM이 자동으로 이스케이프
      select: ['id', 'email', 'role', 'status']  // 민감한 정보 제외
    });
  }

  // ✅ 안전한 방법: QueryBuilder 사용
  async searchUsersSafe(searchTerm: string): Promise<User[]> {
    return await this.createQueryBuilder('user')
      .where('user.email LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .select(['user.id', 'user.email', 'user.role'])
      .getMany();
  }

  // ❌ 위험한 방법: 직접 문자열 결합 (절대 사용 금지)
  async findByEmailUnsafe(email: string): Promise<User | null> {
    // return await this.query(`SELECT * FROM users WHERE email = '${email}'`);
    // 이런 방식은 절대 사용하지 마세요!
  }
}
```

### **XSS(크로스 사이트 스크립팅) 방지**
```typescript
// src/middleware/security.middleware.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityMiddleware = [
  // Helmet으로 기본 보안 헤더 설정
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // 레이트 리미팅
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 최대 100개 요청
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도하세요.',
    standardHeaders: true,
    legacyHeaders: false,
  })
];

// HTML 이스케이프 함수
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
```

---

## 🔐 **데이터 암호화**

### **민감한 데이터 암호화**
```typescript
// src/utils/encryption.service.ts
import crypto from 'crypto';

@Service()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    cipher.setAAD(Buffer.from('O4O-Platform', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipherGCM(this.algorithm, this.secretKey);
    decipher.setIV(iv);
    decipher.setAAD(Buffer.from('O4O-Platform', 'utf8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### **개인정보 보호**
```typescript
// src/entities/user.entity.ts
@Entity('users')
export class User {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  // 민감한 정보는 별도 암호화
  @Column({ type: 'text', nullable: true })
  @Transform(({ value }) => value ? encryptionService.encrypt(value) : null)
  encryptedPersonalInfo?: string;

  @Column({ type: 'json', nullable: true })
  @Transform(({ value }) => value ? this.encryptPaymentInfo(value) : null)
  paymentMethods?: EncryptedPaymentMethod[];

  // 개인정보 마스킹
  toSafeObject(): Partial<User> {
    return {
      id: this.id,
      email: this.maskEmail(this.email),
      role: this.role,
      status: this.status,
      createdAt: this.createdAt
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? local.substring(0, 2) + '*'.repeat(local.length - 2)
      : local;
    return `${maskedLocal}@${domain}`;
  }
}
```

---

## 🔑 **환경 변수 및 시크릿 관리**

### **환경 변수 보안 원칙**
```bash
# .env.example (공개 가능한 예시 파일)
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://username:password@localhost:5432/database
JWT_SECRET=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-encryption-key-32-chars-long

# 실제 .env 파일은 절대 버전 관리에 포함하지 않음
# .gitignore에 반드시 추가
```

### **환경 변수 검증**
```typescript
// src/config/env.validation.ts
import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
    
  PORT: Joi.number().port().default(4000),
  
  DATABASE_URL: Joi.string().uri().required(),
  
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'JWT_SECRET은 최소 32자 이상이어야 합니다.',
      'any.required': 'JWT_SECRET은 필수입니다.'
    }),
    
  ENCRYPTION_KEY: Joi.string()
    .length(32)
    .required()
    .messages({
      'string.length': 'ENCRYPTION_KEY는 정확히 32자여야 합니다.'
    }),

  // 프로덕션 환경에서는 HTTPS 필수
  FORCE_HTTPS: Joi.boolean()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
});
```

### **HTTPS 강제 설정**
```typescript
// src/middleware/https.middleware.ts
export const httpsRedirectMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    // X-Forwarded-Proto 헤더 확인 (로드 밸런서 뒤에 있을 때)
    const forwardedProto = req.headers['x-forwarded-proto'];
    
    if (forwardedProto !== 'https') {
      const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
      return res.redirect(301, httpsUrl);
    }
  }
  
  next();
};

// HSTS (HTTP Strict Transport Security) 헤더 설정
export const hstsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  next();
};
```

---

## 📊 **보안 모니터링 및 로깅**

### **보안 이벤트 로깅**
```typescript
// src/services/security-logger.service.ts
@Service()
export class SecurityLoggerService {
  async logAuthenticationAttempt(
    email: string, 
    success: boolean, 
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const logData = {
      event: 'authentication_attempt',
      email: this.maskEmail(email),
      success,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      severity: success ? 'info' : 'warning'
    };

    if (!success) {
      // 실패한 로그인 시도 추적
      await this.trackFailedLogin(email, ipAddress);
    }

    logger.log(logData.severity, 'Authentication attempt', logData);
  }

  async logSuspiciousActivity(
    userId: number,
    activity: string,
    details: any,
    riskLevel: 'low' | 'medium' | 'high'
  ): Promise<void> {
    const logData = {
      event: 'suspicious_activity',
      userId,
      activity,
      details,
      riskLevel,
      timestamp: new Date(),
      severity: riskLevel === 'high' ? 'error' : 'warning'
    };

    logger.log(logData.severity, 'Suspicious activity detected', logData);

    // 고위험 활동은 즉시 알림
    if (riskLevel === 'high') {
      await this.alertService.sendSecurityAlert(logData);
    }
  }

  private async trackFailedLogin(email: string, ipAddress: string): Promise<void> {
    const key = `failed_login:${ipAddress}`;
    const attempts = await this.redisClient.incr(key);
    
    if (attempts === 1) {
      // 첫 번째 실패 시 15분 TTL 설정
      await this.redisClient.expire(key, 900);
    }

    // 5회 실패 시 IP 차단
    if (attempts >= 5) {
      await this.blockIpAddress(ipAddress, '15 minutes');
      logger.error('IP blocked due to multiple failed login attempts', {
        ipAddress,
        attempts,
        email: this.maskEmail(email)
      });
    }
  }
}
```

### **실시간 위협 탐지**
```typescript
// src/services/threat-detection.service.ts
@Service()
export class ThreatDetectionService {
  async analyzeRequest(req: Request): Promise<ThreatAssessment> {
    const riskFactors = [];
    let riskScore = 0;

    // 1. IP 평판 확인
    if (await this.isKnownBadIp(req.ip)) {
      riskFactors.push('known_bad_ip');
      riskScore += 50;
    }

    // 2. 비정상적인 요청 패턴 확인
    if (await this.hasAbnormalRequestPattern(req.ip)) {
      riskFactors.push('abnormal_request_pattern');
      riskScore += 30;
    }

    // 3. 사용자 에이전트 검증
    if (this.isSuspiciousUserAgent(req.headers['user-agent'])) {
      riskFactors.push('suspicious_user_agent');
      riskScore += 20;
    }

    // 4. 지리적 위치 확인 (VPN/Proxy 탐지)
    if (await this.isFromSuspiciousLocation(req.ip)) {
      riskFactors.push('suspicious_location');
      riskScore += 25;
    }

    return {
      riskScore,
      riskLevel: this.calculateRiskLevel(riskScore),
      riskFactors,
      action: this.determineAction(riskScore)
    };
  }

  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private determineAction(score: number): SecurityAction {
    if (score >= 80) return SecurityAction.BLOCK;
    if (score >= 60) return SecurityAction.CHALLENGE;
    if (score >= 40) return SecurityAction.MONITOR;
    return SecurityAction.ALLOW;
  }
}
```

---

## 🗄️ **데이터베이스 보안**

### **PostgreSQL 보안 설정**
```sql
-- 데이터베이스 사용자별 권한 분리
CREATE USER app_user WITH PASSWORD 'secure_password_here';
CREATE USER readonly_user WITH PASSWORD 'readonly_password_here';
CREATE USER backup_user WITH PASSWORD 'backup_password_here';

-- 최소 권한 원칙 적용
GRANT CONNECT ON DATABASE o4o_platform TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 읽기 전용 사용자
GRANT CONNECT ON DATABASE o4o_platform TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- 백업 전용 사용자
GRANT CONNECT ON DATABASE o4o_platform TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### **데이터베이스 연결 보안**
```typescript
// src/config/database.config.ts
export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.DB_SSL_CA_PATH),
    key: fs.readFileSync(process.env.DB_SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.DB_SSL_CERT_PATH)
  } : false,
  
  // 연결 풀 보안 설정
  extra: {
    connectionLimit: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    
    // 연결 검증
    testOnBorrow: true,
    validationQuery: 'SELECT 1',
    
    // SSL 강제 (프로덕션)
    ...(process.env.NODE_ENV === 'production' && {
      ssl: { rejectUnauthorized: true }
    })
  },
  
  // 민감한 로그 비활성화
  logging: process.env.NODE_ENV === 'development' ? ['error'] : false
};
```

### **민감한 데이터 컬럼 암호화**
```typescript
// src/entities/encrypted-field.transformer.ts
export class EncryptedTransformer implements ValueTransformer {
  constructor(private encryptionService: EncryptionService) {}

  to(value: any): any {
    return value ? this.encryptionService.encrypt(JSON.stringify(value)) : null;
  }

  from(value: any): any {
    if (!value) return null;
    try {
      const decrypted = this.encryptionService.decrypt(value);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt field', { error: error.message });
      return null;
    }
  }
}

// 사용 예시
@Entity('users')
export class User {
  @Column({
    type: 'text',
    nullable: true,
    transformer: new EncryptedTransformer(encryptionService)
  })
  personalInfo?: PersonalInfo;

  @Column({
    type: 'text',
    nullable: true,
    transformer: new EncryptedTransformer(encryptionService)
  })
  paymentMethods?: PaymentMethod[];
}
```

---

## 🛡️ **API 보안**

### **API 레이트 리미팅**
```typescript
// src/middleware/rate-limiting.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// 일반 API 제한
export const generalRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }),
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100개 요청
  message: {
    error: 'Too many requests',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 인증 API 제한 (더 엄격)
export const authRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 15분에 5회만 허용
  skipSuccessfulRequests: true, // 성공한 요청은 카운트에서 제외
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 15 * 60
  }
});

// 결제 API 제한 (가장 엄격)
export const paymentRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:payment:'
  }),
  windowMs: 60 * 60 * 1000, // 1시간
  max: 10, // 1시간에 10회만 허용
  message: {
    error: 'Payment rate limit exceeded',
    retryAfter: 60 * 60
  }
});
```

### **API 입력 검증 미들웨어**
```typescript
// src/middleware/validation.middleware.ts
export const strictValidationPipe = new ValidationPipe({
  whitelist: true,          // DTO에 없는 속성 제거
  forbidNonWhitelisted: true, // 허용되지 않은 속성이 있으면 에러
  transform: true,          // 타입 변환 활성화
  disableErrorMessages: process.env.NODE_ENV === 'production', // 프로덕션에서 상세 에러 숨김
  validationError: {
    target: false,          // 검증 실패 시 원본 객체 숨김
    value: false           // 검증 실패 시 입력값 숨김
  }
});

// XSS 방지 미들웨어
export const xssProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
};
```

### **CORS 보안 설정**
```typescript
// src/config/cors.config.ts
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://neture.co.kr',
      'https://www.neture.co.kr'
    ];

    // 개발 환경에서는 모든 localhost 허용
    if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS violation attempt', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  credentials: true, // 쿠키 포함 요청 허용
  optionsSuccessStatus: 200,
  
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key'
  ],
  
  // 보안 헤더 노출
  exposedHeaders: [
    'X-Total-Count',
    'X-Rate-Limit-Remaining'
  ]
};
```

---

## 🚨 **보안 인시던트 대응**

### **인시던트 분류 및 대응 절차**
```typescript
// src/services/incident-response.service.ts
export enum IncidentSeverity {
  CRITICAL = 'critical',    // 시스템 완전 중단, 데이터 유출
  HIGH = 'high',           // 주요 기능 영향, 보안 침해
  MEDIUM = 'medium',       // 일부 기능 영향
  LOW = 'low'             // 경미한 문제
}

export enum IncidentType {
  DATA_BREACH = 'data_breach',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALWARE = 'malware',
  DDOS_ATTACK = 'ddos_attack',
  SYSTEM_COMPROMISE = 'system_compromise',
  INSIDER_THREAT = 'insider_threat'
}

@Service()
export class IncidentResponseService {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // 1. 초기 평가 및 분류
    const severity = await this.assessIncidentSeverity(incident);
    
    // 2. 즉시 대응 조치
    await this.immediateResponse(incident, severity);
    
    // 3. 알림 발송
    await this.notifyIncidentTeam(incident, severity);
    
    // 4. 조사 시작
    await this.initiateInvestigation(incident);
    
    // 5. 복구 절차 시작
    if (severity === IncidentSeverity.CRITICAL) {
      await this.activateDisasterRecovery(incident);
    }
  }

  private async immediateResponse(
    incident: SecurityIncident, 
    severity: IncidentSeverity
  ): Promise<void> {
    switch (incident.type) {
      case IncidentType.DATA_BREACH:
        // 관련 시스템 즉시 격리
        await this.isolateAffectedSystems(incident.affectedSystems);
        // 관련 사용자 계정 잠금
        await this.lockAffectedAccounts(incident.affectedUsers);
        break;
        
      case IncidentType.DDOS_ATTACK:
        // DDoS 방어 시스템 활성화
        await this.activateDdosProtection();
        // 트래픽 패턴 분석
        await this.analyzeAttackPattern(incident);
        break;
        
      case IncidentType.UNAUTHORIZED_ACCESS:
        // 관련 세션 즉시 종료
        await this.terminateUnauthorizedSessions(incident);
        // 접근 로그 수집
        await this.collectAccessLogs(incident);
        break;
    }
  }

  private async notifyIncidentTeam(
    incident: SecurityIncident, 
    severity: IncidentSeverity
  ): Promise<void> {
    const notificationChannels = this.getNotificationChannels(severity);
    
    const alertMessage = {
      title: `🚨 Security Incident Detected - ${severity.toUpperCase()}`,
      incident: {
        id: incident.id,
        type: incident.type,
        severity,
        detectedAt: incident.detectedAt,
        description: incident.description,
        affectedSystems: incident.affectedSystems
      }
    };

    // 심각도에 따른 알림 채널 선택
    for (const channel of notificationChannels) {
      switch (channel) {
        case 'slack':
          await this.slackService.sendUrgentAlert(alertMessage);
          break;
        case 'email':
          await this.emailService.sendSecurityAlert(alertMessage);
          break;
        case 'sms':
          await this.smsService.sendEmergencyAlert(alertMessage);
          break;
        case 'phone':
          await this.phoneService.makeEmergencyCall(alertMessage);
          break;
      }
    }
  }
}
```

---

## ✅ **보안 체크리스트**

### **일일 보안 체크리스트**
```markdown
#### 인프라 보안
- [ ] 서버 리소스 사용률 확인 (CPU, 메모리, 디스크)
- [ ] 비정상적인 네트워크 트래픽 패턴 확인
- [ ] 실패한 로그인 시도 횟수 확인
- [ ] 데이터베이스 연결 상태 및 성능 확인

#### 애플리케이션 보안
- [ ] API 에러율 및 응답시간 확인
- [ ] 새로운 보안 알림 확인
- [ ] 사용자 계정 상태 확인 (잠금, 정지된 계정)
- [ ] 백업 상태 확인

#### 비즈니스 보안
- [ ] 비정상적인 주문 패턴 확인
- [ ] 대량 결제 실패 확인
- [ ] 새로운 관리자 권한 부여 검토
```

### **주간 보안 체크리스트**
```markdown
#### 취약점 관리
- [ ] 보안 패치 업데이트 확인
- [ ] 의존성 라이브러리 취약점 스캔
- [ ] SSL 인증서 만료일 확인
- [ ] 방화벽 규칙 검토

#### 접근 제어 검토
- [ ] 사용자 권한 변경 사항 검토
- [ ] 미사용 계정 비활성화
- [ ] API 키 로테이션 확인
- [ ] 관리자 활동 로그 검토

#### 데이터 보안
- [ ] 백업 무결성 검증
- [ ] 암호화 키 상태 확인
- [ ] 개인정보 접근 로그 검토
- [ ] 데이터 삭제 요청 처리 확인
```

### **월간 보안 체크리스트**
```markdown
#### 종합 보안 감사
- [ ] 전체 시스템 취약점 스캔
- [ ] 보안 정책 준수 여부 확인
- [ ] 인시던트 대응 훈련 실시
- [ ] 보안 메트릭 분석 및 보고서 작성

#### 규정 준수 확인
- [ ] GDPR 준수 상태 확인
- [ ] 개인정보보호법 준수 확인
- [ ] 보안 교육 이수 현황 확인
- [ ] 외부 보안 감사 준비
```

---

## 📋 **컴플라이언스 및 규정 준수**

### **GDPR (일반 데이터 보호 규정) 준수**
```typescript
// src/services/gdpr-compliance.service.ts
@Service()
export class GdprComplianceService {
  // 개인정보 처리 동의 관리
  async recordConsent(
    userId: number, 
    consentType: ConsentType, 
    granted: boolean
  ): Promise<void> {
    await this.consentRepository.save({
      userId,
      consentType,
      granted,
      recordedAt: new Date(),
      ipAddress: this.getCurrentRequestIp(),
      userAgent: this.getCurrentUserAgent()
    });

    // 동의 철회 시 관련 데이터 처리
    if (!granted && consentType === ConsentType.MARKETING) {
      await this.removeMarketingData(userId);
    }
  }

  // 개인정보 처리 현황 제공 (열람권)
  async generateDataExport(userId: number): Promise<PersonalDataExport> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['orders', 'orders.items', 'paymentMethods']
    });

    return {
      personalInfo: {
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address
      },
      orderHistory: user.orders.map(order => ({
        orderNumber: order.orderNumber,
        date: order.createdAt,
        amount: order.finalAmount,
        items: order.items.map(item => ({
          productName: item.productSnapshot.name,
          quantity: item.quantity,
          price: item.unitPrice
        }))
      })),
      consentHistory: await this.getConsentHistory(userId),
      dataProcessingPurposes: this.getProcessingPurposes(),
      exportedAt: new Date()
    };
  }

  // 개인정보 삭제권 (잊혀질 권리)
  async processDataDeletionRequest(userId: number): Promise<void> {
    await this.dataSource.transaction(async manager => {
      // 1. 사용자 개인정보 익명화
      await manager.update(User, { id: userId }, {
        email: `deleted_${userId}@anonymized.local`,
        name: null,
        phone: null,
        address: null,
        personalInfo: null,
        deletedAt: new Date(),
        status: UserStatus.DELETED
      });

      // 2. 주문 기록은 보존하되 개인식별정보만 제거
      await manager.update(Order, { userId }, {
        shippingAddress: null,
        billingAddress: null,
        notes: 'Personal information removed per GDPR request'
      });

      // 3. 삭제 기록 보존 (법적 요구사항)
      await manager.save(DataDeletionRecord, {
        userId,
        requestedAt: new Date(),
        processedAt: new Date(),
        reason: 'GDPR Article 17 - Right to erasure'
      });
    });
  }
}
```

### **개인정보보호법 준수**
```typescript
// 국내 개인정보보호법 대응
export class PersonalInfoProtectionService {
  // 개인정보 수집·이용 내역 통지
  async notifyDataProcessing(userId: number): Promise<void> {
    const processingDetails = {
      collectedItems: [
        '이메일, 비밀번호, 이름, 전화번호',
        '주문 정보, 결제 정보, 배송 주소'
      ],
      purposes: [
        '서비스 제공 및 계약 이행',
        '고객 상담 및 문의 처리',
        '법적 의무 이행'
      ],
      retentionPeriod: '회원 탈퇴 시까지 (단, 관련 법령에 따라 일정 기간 보관)',
      thirdPartySharing: '원칙적으로 제공하지 않음 (법적 요구 시 예외)'
    };

    await this.emailService.sendDataProcessingNotice(userId, processingDetails);
  }

  // 개인정보 파기 절차
  async scheduleDataDestruction(): Promise<void> {
    // 탈퇴 후 1년 경과 데이터 파기
    const dataToDestroy = await this.userRepository.find({
      where: {
        status: UserStatus.DELETED,
        deletedAt: LessThan(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
      }
    });

    for (const user of dataToDestroy) {
      await this.permanentlyDeleteUserData(user.id);
    }
  }
}
```

---

## 🎓 **보안 교육 및 인식**

### **개발팀 보안 교육**
```typescript
// src/services/security-training.service.ts
@Service()
export class SecurityTrainingService {
  private securityTopics = [
    {
      topic: 'OWASP Top 10',
      frequency: 'quarterly',
      mandatory: true,
      description: '웹 애플리케이션 보안 취약점 상위 10개'
    },
    {
      topic: 'Secure Coding Practices',
      frequency: 'monthly',
      mandatory: true,
      description: '안전한 코딩 기법 및 베스트 프랙티스'
    },
    {
      topic: 'Data Privacy & GDPR',
      frequency: 'biannually',
      mandatory: true,
      description: '개인정보 보호 및 GDPR 준수'
    },
    {
      topic: 'Incident Response',
      frequency: 'quarterly',
      mandatory: false,
      description: '보안 인시던트 대응 절차'
    }
  ];

  async trackTrainingCompletion(
    employeeId: number, 
    topic: string, 
    completedAt: Date
  ): Promise<void> {
    await this.trainingRecordRepository.save({
      employeeId,
      topic,
      completedAt,
      validUntil: this.calculateExpiryDate(topic),
      certificateId: this.generateCertificateId()
    });
  }

  async getTrainingStatus(): Promise<TrainingStatus[]> {
    // 팀원별 교육 이수 현황 반환
    return await this.trainingRecordRepository
      .createQueryBuilder('training')
      .select(['employee.name', 'training.topic', 'training.completedAt', 'training.validUntil'])
      .leftJoin('training.employee', 'employee')
      .where('training.validUntil > :now', { now: new Date() })
      .getMany();
  }
}
```

### **보안 의식 향상 프로그램**
```markdown
#### 월간 보안 뉴스레터
- 최신 보안 위협 동향
- 내부 보안 모범 사례 공유
- 보안 툴 사용법 가이드
- 인시던트 사례 분석 (익명화)

#### 분기별 보안 워크샵
- 피싱 시뮬레이션 훈련
- 소셜 엔지니어링 대응 훈련
- 보안 도구 실습
- 보안 인시던트 대응 시뮬레이션

#### 연간 보안 평가
- 개인별 보안 인식 수준 평가
- 팀별 보안 성숙도 측정
- 보안 개선 계획 수립
- 외부 전문가 초청 세미나
```

---

## 🔍 **정기 보안 감사**

### **내부 보안 감사**
```typescript
// src/services/security-audit.service.ts
@Service()
export class SecurityAuditService {
  async performMonthlyAudit(): Promise<SecurityAuditReport> {
    const auditResults = {
      accessControlAudit: await this.auditAccessControls(),
      dataSecurityAudit: await this.auditDataSecurity(),
      networkSecurityAudit: await this.auditNetworkSecurity(),
      applicationSecurityAudit: await this.auditApplicationSecurity(),
      complianceAudit: await this.auditCompliance()
    };

    const overallScore = this.calculateSecurityScore(auditResults);
    const recommendations = this.generateRecommendations(auditResults);

    return {
      auditDate: new Date(),
      overallScore,
      results: auditResults,
      recommendations,
      nextAuditDate: this.getNextAuditDate()
    };
  }

  private async auditAccessControls(): Promise<AccessControlAuditResult> {
    // 1. 권한 과다 부여 확인
    const overPrivilegedUsers = await this.findOverPrivilegedUsers();
    
    // 2. 미사용 계정 확인
    const inactiveAccounts = await this.findInactiveAccounts();
    
    // 3. 비밀번호 정책 준수 확인
    const passwordPolicyViolations = await this.checkPasswordPolicy();
    
    // 4. MFA 활성화 상태 확인
    const mfaStatus = await this.checkMfaStatus();

    return {
      overPrivilegedUsers,
      inactiveAccounts,
      passwordPolicyViolations,
      mfaStatus,
      score: this.calculateAccessControlScore({
        overPrivilegedUsers,
        inactiveAccounts,
        passwordPolicyViolations,
        mfaStatus
      })
    };
  }

  private async auditDataSecurity(): Promise<DataSecurityAuditResult> {
    // 1. 암호화 상태 확인
    const encryptionStatus = await this.checkEncryptionStatus();
    
    // 2. 데이터 분류 및 라벨링 확인
    const dataClassification = await this.checkDataClassification();
    
    // 3. 백업 무결성 확인
    const backupIntegrity = await this.verifyBackupIntegrity();
    
    // 4. 데이터 접근 로그 분석
    const accessLogAnalysis = await this.analyzeDataAccessLogs();

    return {
      encryptionStatus,
      dataClassification,
      backupIntegrity,
      accessLogAnalysis,
      score: this.calculateDataSecurityScore({
        encryptionStatus,
        dataClassification,
        backupIntegrity,
        accessLogAnalysis
      })
    };
  }
}
```

### **외부 보안 감사 준비**
```markdown
#### 연간 외부 보안 감사 준비사항

**1. 문서 준비**
- [ ] 보안 정책 및 절차 문서
- [ ] 위험 평가 보고서
- [ ] 인시던트 대응 기록
- [ ] 직원 보안 교육 이수 증명
- [ ] 백업 및 복구 절차 문서

**2. 기술적 준비**
- [ ] 취약점 스캔 결과 정리
- [ ] 침투 테스트 보고서 준비
- [ ] 보안 로그 분석 결과
- [ ] 암호화 구현 현황
- [ ] 접근 제어 매트릭스

**3. 규정 준수 증빙**
- [ ] GDPR 준수 증빙 자료
- [ ] 개인정보보호법 준수 증빙
- [ ] 데이터 처리 동의서 관리 현황
- [ ] 개인정보 파기 기록
```

---

## 🎯 **보안 성숙도 로드맵**

### **단계별 보안 강화 계획**

#### **Level 1: 기본 보안 (현재)**
- ✅ 기본 인증 및 인가
- ✅ HTTPS 적용
- ✅ 기본 입력 검증
- ✅ 비밀번호 해싱

#### **Level 2: 강화된 보안 (3개월 내)**
- 🔄 다중 인증(MFA) 도입
- 🔄 고급 레이트 리미팅
- 🔄 실시간 위협 탐지
- 🔄 보안 모니터링 대시보드

#### **Level 3: 고급 보안 (6개월 내)**
- 📅 제로 트러스트 아키텍처
- 📅 AI 기반 이상 탐지
- 📅 자동화된 인시던트 대응
- 📅 블록체인 기반 감사 추적

#### **Level 4: 최고 수준 보안 (1년 내)**
- 📅 양자 내성 암호화
- 📅 완전 자동화된 보안 운영
- 📅 예측적 위협 분석
- 📅 국제 보안 인증 획득

---

<div align="center">

**🔒 포괄적인 보안으로 신뢰할 수 있는 플랫폼! 🔒**

[📊 모니터링](monitoring.md) • [🗄️ DB 설정](postgresql-setup.md) • [🛍️ API 명세서](../03-api-reference/README.md)

**보안은 선택이 아닌 필수! 지속적인 보안 강화로 사용자 신뢰 확보! 🛡️**

</div>
