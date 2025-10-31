# Architecture Decisions and Design Patterns

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Architectural Principles](#architectural-principles)
3. [Major Architecture Decisions](#major-architecture-decisions)
4. [Design Patterns Implemented](#design-patterns-implemented)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Security Architecture](#security-architecture)
7. [Scalability Considerations](#scalability-considerations)
8. [Architecture Evolution](#architecture-evolution)

---

## System Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Web    │  │  Mobile  │  │  Admin   │  │   API    │  │
│  │  (Main)  │  │   (PWA)  │  │Dashboard │  │ Clients  │  │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘  │
│        │             │             │             │         │
└────────┼─────────────┼─────────────┼─────────────┼─────────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Nginx Proxy    │
                    │   (Load Balancer) │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │  Main   │        │  Admin  │        │   API   │
    │  Site   │        │Dashboard│        │ Server  │
    │ (Vite)  │        │ (React) │        │(Express)│
    └─────────┘        └─────────┘        └────┬────┘
                                                │
                                    ┌───────────┴──────────┐
                                    │                      │
                            ┌───────▼────────┐    ┌───────▼──────┐
                            │   TypeORM      │    │    Redis     │
                            │   (MySQL)      │    │   (Cache)    │
                            └────────────────┘    └──────────────┘
```

### Monorepo Structure Design
```
o4o-platform/
├── apps/                     # Deployable applications
│   ├── admin-dashboard/      # Admin interface
│   ├── main-site/           # Customer-facing site
│   ├── api-server/          # Backend API
│   └── api-gateway/         # API gateway (future)
│
├── packages/                 # Shared packages
│   ├── types/               # TypeScript definitions
│   ├── ui/                  # UI component library
│   ├── utils/               # Utility functions
│   ├── auth-client/         # Authentication client
│   ├── auth-context/        # Auth React context
│   └── shortcodes/          # Shortcode system
│
├── scripts/                  # Build and deployment scripts
├── config/                   # Configuration files
└── docs/                     # Documentation
```

---

## Architectural Principles

### 1. Separation of Concerns
Each layer has distinct responsibilities:
- **Presentation Layer**: UI rendering, user interaction
- **Business Logic Layer**: Application rules, workflows
- **Data Access Layer**: Database operations, ORM
- **Infrastructure Layer**: Deployment, monitoring

### 2. Domain-Driven Design (DDD)
```typescript
// Domain entities
interface User {
  id: string;
  email: string;
  profile: UserProfile;
  roles: Role[];
}

// Domain services
class UserService {
  async createUser(data: CreateUserDTO): Promise<User>
  async assignRole(userId: string, roleId: string): Promise<void>
}

// Domain events
class UserCreatedEvent {
  constructor(public readonly user: User) {}
}
```

### 3. SOLID Principles

#### Single Responsibility
```typescript
// Bad ❌
class UserController {
  validateEmail(email: string) {}
  hashPassword(password: string) {}
  sendEmail(to: string, subject: string) {}
  createUser(data: any) {}
}

// Good ✅
class UserController {
  constructor(
    private userService: UserService,
    private emailService: EmailService,
    private validationService: ValidationService
  ) {}
  
  async createUser(data: any) {
    const validated = this.validationService.validate(data);
    const user = await this.userService.create(validated);
    await this.emailService.sendWelcome(user);
    return user;
  }
}
```

#### Open/Closed Principle
```typescript
// Extensible through interfaces
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

class StripeProcessor implements PaymentProcessor {}
class PayPalProcessor implements PaymentProcessor {}
class CryptoProcessor implements PaymentProcessor {}
```

#### Dependency Inversion
```typescript
// Depend on abstractions, not concretions
interface UserRepository {
  findById(id: string): Promise<User>;
  save(user: User): Promise<User>;
}

class UserService {
  constructor(private repository: UserRepository) {}
  // Service doesn't know if it's MySQL, MongoDB, etc.
}
```

---

## Major Architecture Decisions

### Decision 1: Monorepo with pnpm Workspaces
**Context**: Need to share code between multiple applications
**Decision**: Use pnpm workspaces for monorepo management
**Consequences**:
- ✅ Single source of truth for shared code
- ✅ Atomic commits across projects
- ✅ Consistent versioning
- ❌ Complex initial setup
- ❌ Larger repository size

**Implementation**:
```json
// pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Decision 2: TypeScript Everywhere
**Context**: Need type safety across full stack
**Decision**: Use TypeScript for all JavaScript code
**Consequences**:
- ✅ Compile-time error detection
- ✅ Better IDE support
- ✅ Self-documenting code
- ❌ Learning curve for team
- ❌ Additional build step

**Shared Types Strategy**:
```typescript
// packages/types/src/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Used in both frontend and backend
import { ApiResponse } from '@o4o/types';
```

### Decision 3: JWT with Refresh Tokens
**Context**: Need stateless authentication that scales
**Decision**: JWT access tokens + refresh token rotation
**Implementation**:
```typescript
// Token structure
interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

// Refresh token rotation
async function refreshToken(refreshToken: string) {
  const decoded = verifyRefreshToken(refreshToken);
  await blacklistToken(refreshToken); // Invalidate old
  const newTokens = generateTokenPair(decoded.userId);
  return newTokens;
}
```

### Decision 4: Event-Driven Communication
**Context**: Need loose coupling between services
**Decision**: Event bus for inter-service communication
**Implementation**:
```typescript
class EventBus {
  private handlers = new Map<string, Handler[]>();
  
  on(event: string, handler: Handler) {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);
  }
  
  emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(h => h(data));
  }
}

// Usage
eventBus.on('user.created', async (user) => {
  await sendWelcomeEmail(user);
  await createDefaultSettings(user);
  await notifyAdmins(user);
});
```

### Decision 5: Repository Pattern for Data Access
**Context**: Need abstraction over data persistence
**Decision**: Repository pattern with TypeORM
**Implementation**:
```typescript
// Generic repository
abstract class BaseRepository<T> {
  constructor(protected entity: EntityTarget<T>) {}
  
  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } });
  }
  
  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }
}

// Specific repository
class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }
}
```

---

## Design Patterns Implemented

### 1. Factory Pattern
```typescript
// Component factory
class ComponentFactory {
  private components = new Map<string, ComponentConstructor>();
  
  register(type: string, component: ComponentConstructor) {
    this.components.set(type, component);
  }
  
  create(type: string, props: any): Component {
    const Constructor = this.components.get(type);
    if (!Constructor) {
      throw new Error(`Unknown component type: ${type}`);
    }
    return new Constructor(props);
  }
}

// Usage
factory.register('button', Button);
factory.register('input', Input);
const component = factory.create('button', { label: 'Click me' });
```

### 2. Strategy Pattern
```typescript
// Payment strategies
interface PaymentStrategy {
  pay(amount: number): Promise<PaymentResult>;
}

class CreditCardStrategy implements PaymentStrategy {
  async pay(amount: number) {
    // Credit card payment logic
  }
}

class PayPalStrategy implements PaymentStrategy {
  async pay(amount: number) {
    // PayPal payment logic
  }
}

class PaymentContext {
  constructor(private strategy: PaymentStrategy) {}
  
  async executePayment(amount: number) {
    return this.strategy.pay(amount);
  }
}
```

### 3. Observer Pattern
```typescript
// State management with observers
class ObservableState<T> {
  private observers: Observer<T>[] = [];
  private state: T;
  
  subscribe(observer: Observer<T>) {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter(o => o !== observer);
    };
  }
  
  setState(newState: T) {
    this.state = newState;
    this.observers.forEach(o => o(newState));
  }
}
```

### 4. Decorator Pattern
```typescript
// API endpoint decorators
function RequireAuth(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    const [req, res, next] = args;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return originalMethod.apply(this, args);
  };
}

class UserController {
  @RequireAuth
  @RequireRole('admin')
  @RateLimit(100)
  async deleteUser(req: Request, res: Response) {
    // Protected endpoint
  }
}
```

### 5. Singleton Pattern
```typescript
// Database connection singleton
class Database {
  private static instance: Database;
  private connection: Connection;
  
  private constructor() {
    this.connection = createConnection(config);
  }
  
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  getConnection(): Connection {
    return this.connection;
  }
}
```

### 6. Adapter Pattern
```typescript
// Storage adapter for different providers
interface StorageAdapter {
  upload(file: File): Promise<string>;
  delete(url: string): Promise<void>;
}

class S3Adapter implements StorageAdapter {
  async upload(file: File) {
    // S3 upload logic
    return s3Url;
  }
}

class LocalAdapter implements StorageAdapter {
  async upload(file: File) {
    // Local filesystem logic
    return localPath;
  }
}

// Usage
const storage: StorageAdapter = 
  process.env.NODE_ENV === 'production' 
    ? new S3Adapter() 
    : new LocalAdapter();
```

---

## Data Flow Architecture

### Unidirectional Data Flow
```
User Action → Action Creator → Dispatcher → Store → View Update
     ↑                                                    ↓
     └────────────────────────────────────────────────────┘
```

### API Data Flow
```typescript
// 1. Client Request
const response = await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify(userData)
});

// 2. API Gateway (future)
// - Rate limiting
// - Authentication
// - Request routing

// 3. Controller Layer
@Post('/users')
async createUser(@Body() data: CreateUserDTO) {
  return this.userService.create(data);
}

// 4. Service Layer
async create(data: CreateUserDTO) {
  const validated = this.validator.validate(data);
  const user = await this.repository.save(validated);
  await this.eventBus.emit('user.created', user);
  return user;
}

// 5. Repository Layer
async save(user: User) {
  return this.dataSource.manager.save(User, user);
}

// 6. Database
INSERT INTO users (...) VALUES (...);
```

### State Management Flow
```typescript
// Global state (Zustand)
const useAuthStore = create((set) => ({
  user: null,
  login: async (credentials) => {
    const user = await authService.login(credentials);
    set({ user });
  },
  logout: () => set({ user: null })
}));

// Server state (React Query)
const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Local state (React)
const [formData, setFormData] = useState(initialValues);
```

---

## Security Architecture

### Defense in Depth
```
Layer 1: Network Security
├── Firewall rules
├── DDoS protection (Cloudflare)
└── SSL/TLS encryption

Layer 2: Application Security
├── Input validation (Zod)
├── SQL injection prevention (parameterized queries)
├── XSS protection (content sanitization)
└── CSRF tokens

Layer 3: Authentication & Authorization
├── JWT with short expiry
├── Refresh token rotation
├── Role-based access control
└── API key management

Layer 4: Data Security
├── Encryption at rest
├── Encryption in transit
├── PII data masking
└── Audit logging
```

### Security Implementation
```typescript
// Input validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  age: z.number().min(13).max(120)
});

// SQL injection prevention
const user = await db.query(
  'SELECT * FROM users WHERE email = ? AND active = ?',
  [email, true]
);

// XSS protection
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(userInput);

// CSRF protection
app.use(csrf({ cookie: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
```

---

## Scalability Considerations

### Horizontal Scaling Strategy
```
                 Load Balancer
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    Server 1      Server 2      Server 3
        │             │             │
        └─────────────┼─────────────┘
                      │
                Shared Database
                   (MySQL)
```

### Caching Strategy
```typescript
// Multi-level caching
// Level 1: Browser cache
Cache-Control: public, max-age=3600

// Level 2: CDN cache (CloudFlare)
cf-cache-status: HIT

// Level 3: Application cache (Redis)
const cached = await redis.get(key);
if (cached) return cached;

// Level 4: Database query cache
SELECT SQL_CACHE * FROM products WHERE category_id = ?;
```

### Database Optimization
```typescript
// Connection pooling
const pool = mysql.createPool({
  connectionLimit: 100,
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'o4o_platform'
});

// Query optimization
@Index(['email', 'active'])
@Index(['createdAt'])
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ unique: true })
  @Index()
  email: string;
}

// Pagination
async function getUsers(page: number, limit: number) {
  return this.repository.find({
    skip: (page - 1) * limit,
    take: limit
  });
}
```

### Microservices Migration Path
```
Phase 1: Monolithic
[Monolithic App] → [Database]

Phase 2: Service Extraction
[API Gateway] → [User Service] → [User DB]
              → [Product Service] → [Product DB]
              → [Order Service] → [Order DB]

Phase 3: Event-Driven
[Services] ← → [Message Queue] ← → [Services]
```

---

## Architecture Evolution

### Phase 1: MVP Architecture (Month 1-2)
- Simple client-server architecture
- Monolithic backend
- Direct database queries
- Session-based auth

### Phase 2: Modular Architecture (Month 3-4)
- Separated concerns into modules
- Introduced service layer
- Added caching layer
- JWT authentication

### Phase 3: Scalable Architecture (Month 5-6)
- Microservices preparation
- Event-driven patterns
- Advanced caching strategies
- Performance optimizations

### Future Architecture Plans
1. **Microservices**: Extract services gradually
2. **GraphQL**: Add GraphQL layer for flexible queries
3. **Event Sourcing**: Implement for audit trail
4. **CQRS**: Separate read/write models
5. **Service Mesh**: Implement Istio for service communication

---

## Architecture Documentation Standards

### ADR (Architecture Decision Record) Template
```markdown
# ADR-001: Use React for Frontend

## Status
Accepted

## Context
Need to choose a frontend framework for the admin dashboard.

## Decision
We will use React with TypeScript.

## Consequences
- Positive: Large ecosystem, good TypeScript support
- Negative: Learning curve for team members new to React
```

### C4 Model Documentation
1. **Context**: System in environment
2. **Container**: High-level technology choices
3. **Component**: Components within containers
4. **Code**: Class diagrams when needed

---

## Monitoring and Observability

### Logging Architecture
```typescript
// Structured logging
logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
  duration: endTime - startTime
});

// Log levels
logger.error('Database connection failed', error);
logger.warn('Rate limit approaching', { ip, count });
logger.info('Request processed', { path, method, status });
logger.debug('Cache hit', { key, value });
```

### Metrics Collection
```typescript
// Performance metrics
const histogram = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// Business metrics
const counter = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations'
});
```

---

*Document Version: 1.0.0*
*Last Updated: January 30, 2025*