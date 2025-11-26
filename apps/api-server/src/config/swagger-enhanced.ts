import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Enhanced Swagger/OpenAPI Configuration
 * 완전한 API 문서화 시스템
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { schemas } from '../swagger/schemas/index.js';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

// API 에러 코드 정의
const errorCodes = {
  // Authentication Errors (AUTH_*)
  AUTH_INVALID_CREDENTIALS: '잘못된 인증 정보',
  AUTH_TOKEN_EXPIRED: '토큰이 만료되었습니다',
  AUTH_TOKEN_INVALID: '유효하지 않은 토큰',
  AUTH_INSUFFICIENT_PERMISSIONS: '권한이 부족합니다',
  AUTH_ACCOUNT_SUSPENDED: '계정이 정지되었습니다',
  
  // Validation Errors (VAL_*)
  VAL_REQUIRED_FIELD: '필수 필드가 누락되었습니다',
  VAL_INVALID_FORMAT: '잘못된 형식입니다',
  VAL_DUPLICATE_ENTRY: '중복된 항목입니다',
  VAL_INVALID_RANGE: '유효하지 않은 범위입니다',
  
  // Business Logic Errors (BIZ_*)
  BIZ_OUT_OF_STOCK: '재고가 부족합니다',
  BIZ_ORDER_CANCELLED: '주문이 취소되었습니다',
  BIZ_PAYMENT_FAILED: '결제에 실패했습니다',
  BIZ_COUPON_EXPIRED: '쿠폰이 만료되었습니다',
  
  // System Errors (SYS_*)
  SYS_DATABASE_ERROR: '데이터베이스 오류',
  SYS_EXTERNAL_SERVICE_ERROR: '외부 서비스 오류',
  SYS_FILE_UPLOAD_ERROR: '파일 업로드 오류',
  SYS_RATE_LIMIT_EXCEEDED: '요청 제한 초과',
  
  // Not Found Errors (404_*)
  '404_USER_NOT_FOUND': '사용자를 찾을 수 없습니다',
  '404_RESOURCE_NOT_FOUND': '리소스를 찾을 수 없습니다',
  '404_PAGE_NOT_FOUND': '페이지를 찾을 수 없습니다'
};

// API 응답 예제
const examples = {
  loginSuccess: {
    success: true,
    data: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        status: 'active'
      }
    }
  },
  
  validationError: {
    success: false,
    error: 'Validation failed',
    code: 'VAL_REQUIRED_FIELD',
    details: [
      {
        field: 'email',
        message: '이메일은 필수 항목입니다'
      },
      {
        field: 'password',
        message: '비밀번호는 8자 이상이어야 합니다'
      }
    ]
  },
  
  paginatedProducts: {
    data: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Sample Product',
        price: 29900,
        stock: 100
      }
    ],
    pagination: {
      current: 1,
      total: 10,
      count: 20,
      totalItems: 200
    }
  }
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'O4O Platform API',
      version: '2.0.0',
      description: `
# O4O Platform REST API Documentation

## 개요
O4O(Online for Offline) 플랫폼의 완전한 REST API 문서입니다.

## 주요 기능
- 🔐 **인증 및 권한 관리**: JWT 기반 인증, 역할 기반 접근 제어
- 📝 **콘텐츠 관리**: 포스트, 페이지, 미디어 관리
- 🛍️ **이커머스**: 상품, 주문, 장바구니, 결제 처리
- 👥 **사용자 관리**: 회원 관리, 프로필, 권한 설정
- 📦 **드랍쉬핑**: 공급자 연동, 자동 주문 처리
- ⚙️ **시스템 설정**: 플랫폼 설정, 이메일, 보안 설정

## 인증 방식
대부분의 엔드포인트는 JWT 토큰 인증이 필요합니다.

### Bearer Token
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### 토큰 획득
1. \`/auth/login\` 엔드포인트로 로그인
2. 응답에서 \`token\` 획득
3. 모든 요청 헤더에 포함

## API 버전 관리
- 현재 버전: v1
- 기본 경로: \`/api/v1\`
- 하위 호환성 보장

## 요청/응답 형식
- Content-Type: \`application/json\`
- 문자 인코딩: UTF-8
- 날짜 형식: ISO 8601

## 에러 처리
표준화된 에러 응답 형식:
\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": []
}
\`\`\`

## Rate Limiting
- 인증된 요청: 분당 100회
- 공개 요청: 분당 300회
- 초과 시 429 응답

## 페이지네이션
목록 조회 시 페이지네이션 파라미터:
- \`page\`: 페이지 번호 (기본: 1)
- \`limit\`: 페이지당 항목 수 (기본: 20, 최대: 100)
- \`sort\`: 정렬 필드
- \`order\`: 정렬 방향 (asc/desc)
      `,
      contact: {
        name: 'O4O Platform Support',
        email: 'support@neture.co.kr',
        url: 'https://neture.co.kr'
      },
      license: {
        name: 'Proprietary',
        url: 'https://neture.co.kr/license'
      },
      'x-logo': {
        url: 'https://neture.co.kr/logo.png',
        altText: 'O4O Platform'
      }
    },
    
    externalDocs: {
      description: '개발자 가이드',
      url: 'https://docs.neture.co.kr'
    },
    
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: 'Local Development',
        variables: {
          port: {
            default: '4000',
            description: 'Server port'
          }
        }
      },
      {
        url: 'https://api-staging.neture.co.kr/api',
        description: 'Staging Environment'
      },
      {
        url: 'https://api.neture.co.kr/api',
        description: 'Production Environment'
      }
    ],
    
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 토큰을 사용한 인증'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API 키를 사용한 인증'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: '쿠키 기반 세션 인증'
        }
      },
      
      schemas: schemas,
      
      parameters: {
        pageParam: {
          name: 'page',
          in: 'query',
          description: '페이지 번호',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        limitParam: {
          name: 'limit',
          in: 'query',
          description: '페이지당 항목 수',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        sortParam: {
          name: 'sort',
          in: 'query',
          description: '정렬 필드',
          schema: {
            type: 'string'
          }
        },
        orderParam: {
          name: 'order',
          in: 'query',
          description: '정렬 방향',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        },
        searchParam: {
          name: 'search',
          in: 'query',
          description: '검색 키워드',
          schema: {
            type: 'string'
          }
        },
        idParam: {
          name: 'id',
          in: 'path',
          required: true,
          description: '리소스 ID',
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      },
      
      responses: {
        UnauthorizedError: {
          description: '인증 필요',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '인증이 필요합니다',
                code: 'AUTH_TOKEN_INVALID'
              }
            }
          }
        },
        ForbiddenError: {
          description: '권한 부족',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '이 작업을 수행할 권한이 없습니다',
                code: 'AUTH_INSUFFICIENT_PERMISSIONS'
              }
            }
          }
        },
        NotFoundError: {
          description: '리소스를 찾을 수 없음',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '요청한 리소스를 찾을 수 없습니다',
                code: '404_RESOURCE_NOT_FOUND'
              }
            }
          }
        },
        ValidationError: {
          description: '유효성 검사 실패',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              },
              example: examples.validationError
            }
          }
        },
        RateLimitError: {
          description: '요청 제한 초과',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요',
                code: 'SYS_RATE_LIMIT_EXCEEDED'
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': {
              description: '요청 제한 수',
              schema: {
                type: 'integer'
              }
            },
            'X-RateLimit-Remaining': {
              description: '남은 요청 수',
              schema: {
                type: 'integer'
              }
            },
            'X-RateLimit-Reset': {
              description: '제한 리셋 시간',
              schema: {
                type: 'integer'
              }
            }
          }
        },
        ServerError: {
          description: '서버 오류',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '서버 오류가 발생했습니다',
                code: 'SYS_DATABASE_ERROR'
              }
            }
          }
        }
      },
      
      examples: examples
    },
    
    security: [
      {
        bearerAuth: []
      }
    ],
    
    tags: [
      {
        name: 'Auth',
        description: '인증 및 권한 관리',
        'x-displayName': '🔐 인증'
      },
      {
        name: 'Users',
        description: '사용자 관리',
        'x-displayName': '👥 사용자'
      },
      {
        name: 'Content',
        description: '콘텐츠 관리 (포스트, 페이지, 미디어)',
        'x-displayName': '📝 콘텐츠'
      },
      {
        name: 'E-commerce',
        description: '이커머스 기능 (상품, 주문, 장바구니)',
        'x-displayName': '🛍️ 이커머스'
      },
      {
        name: 'Dropshipping',
        description: '드랍쉬핑 관리',
        'x-displayName': '📦 드랍쉬핑'
      },
      {
        name: 'Platform',
        description: '플랫폼 관리',
        'x-displayName': '⚙️ 플랫폼'
      },
      {
        name: 'Settings',
        description: '시스템 설정',
        'x-displayName': '⚙️ 설정'
      },
      {
        name: 'Monitoring',
        description: '모니터링 및 분석',
        'x-displayName': '📊 모니터링'
      }
    ],
    
    'x-tagGroups': [
      {
        name: '핵심 기능',
        tags: ['Auth', 'Users', 'Content']
      },
      {
        name: '비즈니스',
        tags: ['E-commerce', 'Dropshipping']
      },
      {
        name: '시스템',
        tags: ['Platform', 'Settings', 'Monitoring']
      }
    ]
  },
  
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './src/controllers/*.ts',
    './src/controllers/**/*.ts',
    './src/swagger/paths/*.yaml'
  ]
};

// Load additional YAML documentation files
const loadYamlDocs = () => {
  const yamlDir = path.join(__dirname, '../swagger/paths');
  if (fs.existsSync(yamlDir)) {
    const files = fs.readdirSync(yamlDir).filter(file => file.endsWith('.yaml'));
    files.forEach(file => {
      const content = fs.readFileSync(path.join(yamlDir, file), 'utf8');
      const doc = yaml.load(content);
      // Merge YAML documentation
      Object.assign(options.definition.paths || {}, doc);
    });
  }
};

// Custom Swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 50px }
    .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; border-radius: 5px; }
    .swagger-ui .btn.authorize { background-color: #4CAF50; }
    .swagger-ui .btn.authorize:hover { background-color: #45a049; }
  `,
  customSiteTitle: 'O4O Platform API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    displayOperationId: false,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha'
  }
};

// Initialize Swagger specification
let swaggerSpec: any;

export const setupSwagger = (app: Application) => {
  try {
    // Load YAML documentation
    loadYamlDocs();
    
    // Generate Swagger specification
    swaggerSpec = swaggerJsdoc(options);
    
    // Add error codes documentation
    swaggerSpec['x-error-codes'] = errorCodes;
    
    // Serve Swagger UI
    app.use('/api-docs', 
      ...(swaggerUi.serve as any[]), 
      swaggerUi.setup(swaggerSpec, swaggerUiOptions) as any
    );
    
    // Serve OpenAPI JSON spec
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
    
    // Serve OpenAPI YAML spec
    app.get('/api-docs.yaml', (req, res) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(yaml.dump(swaggerSpec));
    });
    
    // Postman collection export
    app.get('/api-docs/postman', (req, res) => {
      const postmanCollection = convertToPostman(swaggerSpec);
      res.json(postmanCollection);
    });
    
    
  } catch (error) {
    // Error log removed
  }
};

// Convert OpenAPI to Postman Collection
const convertToPostman = (spec: any) => {
  return {
    info: {
      name: spec.info.title,
      description: spec.info.description,
      version: spec.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: Object.entries(spec.tags || {}).map((tag: any) => ({
      name: tag.name,
      description: tag.description,
      item: [] // Endpoints would be added here
    })),
    variable: [
      {
        key: 'baseUrl',
        value: spec.servers[0].url,
        type: 'string'
      },
      {
        key: 'token',
        value: '',
        type: 'string'
      }
    ]
  };
};

export { swaggerSpec, errorCodes };
export default setupSwagger;