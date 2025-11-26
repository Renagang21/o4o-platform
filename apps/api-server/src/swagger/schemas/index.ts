/**
 * OpenAPI Schema Definitions
 * 모든 API 스키마 정의를 중앙화
 */

export const schemas = {
  // Error Responses
  Error: {
    type: 'object',
    required: ['success', 'error'],
    properties: {
      success: {
        type: 'boolean',
        example: false,
        description: '요청 성공 여부'
      },
      error: {
        type: 'string',
        example: 'Error message',
        description: '에러 메시지'
      },
      code: {
        type: 'string',
        example: 'ERROR_CODE',
        description: '에러 코드'
      },
      details: {
        type: 'array',
        items: {
          type: 'object'
        },
        description: '상세 에러 정보'
      }
    }
  },

  ValidationError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string' },
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      details: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  },

  // Success Responses
  SuccessResponse: {
    type: 'object',
    required: ['success'],
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      data: {
        type: 'object',
        description: '응답 데이터'
      },
      message: {
        type: 'string',
        description: '성공 메시지'
      }
    }
  },

  PaginatedResponse: {
    type: 'object',
    required: ['data', 'pagination'],
    properties: {
      data: {
        type: 'array',
        items: {},
        description: '페이지 데이터'
      },
      pagination: {
        type: 'object',
        required: ['current', 'total', 'count', 'totalItems'],
        properties: {
          current: {
            type: 'integer',
            example: 1,
            description: '현재 페이지'
          },
          total: {
            type: 'integer',
            example: 10,
            description: '전체 페이지 수'
          },
          count: {
            type: 'integer',
            example: 20,
            description: '페이지당 항목 수'
          },
          totalItems: {
            type: 'integer',
            example: 200,
            description: '전체 항목 수'
          }
        }
      }
    }
  },

  // Authentication
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'user@example.com',
        description: '사용자 이메일'
      },
      password: {
        type: 'string',
        format: 'password',
        example: 'password123',
        description: '사용자 비밀번호'
      }
    }
  },

  LoginResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT 액세스 토큰'
          },
          refreshToken: {
            type: 'string',
            description: 'JWT 리프레시 토큰'
          },
          user: {
            $ref: '#/components/schemas/User'
          }
        }
      }
    }
  },

  RegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'newuser@example.com'
      },
      password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        example: 'StrongPassword123!'
      },
      name: {
        type: 'string',
        example: 'John Doe'
      },
      role: {
        type: 'string',
        enum: ['user', 'vendor', 'business'],
        default: 'user'
      },
      businessInfo: {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          businessNumber: { type: 'string' },
          businessType: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' }
        }
      }
    }
  },

  // User Management
  User: {
    type: 'object',
    properties: {
      id: { 
        type: 'string',
        format: 'uuid',
        description: '사용자 고유 ID'
      },
      email: { 
        type: 'string',
        format: 'email',
        description: '이메일 주소'
      },
      name: { 
        type: 'string',
        description: '사용자 이름'
      },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      avatar: { 
        type: 'string',
        format: 'uri',
        description: '프로필 이미지 URL'
      },
      role: {
        type: 'string',
        enum: ['super_admin', 'admin', 'vendor', 'seller', 'user', 'business'],
        description: '사용자 역할'
      },
      status: { 
        type: 'string',
        enum: ['active', 'inactive', 'pending', 'approved', 'suspended'],
        description: '계정 상태'
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
        description: '사용자 권한 목록'
      },
      businessInfo: {
        type: 'object',
        nullable: true,
        properties: {
          companyName: { type: 'string' },
          businessNumber: { type: 'string' },
          businessType: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' }
        }
      },
      createdAt: { 
        type: 'string',
        format: 'date-time'
      },
      updatedAt: { 
        type: 'string',
        format: 'date-time'
      },
      lastLoginAt: {
        type: 'string',
        format: 'date-time',
        nullable: true
      }
    }
  },

  // Content Management
  Post: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { 
        type: 'string',
        description: '포스트 제목'
      },
      slug: { 
        type: 'string',
        description: 'URL 슬러그'
      },
      content: { 
        type: 'string',
        description: '포스트 내용 (HTML)'
      },
      excerpt: {
        type: 'string',
        description: '포스트 요약'
      },
      status: { 
        type: 'string',
        enum: ['draft', 'publish', 'scheduled', 'archived'],
        description: '발행 상태'
      },
      visibility: {
        type: 'string',
        enum: ['public', 'private', 'password'],
        default: 'public'
      },
      password: {
        type: 'string',
        nullable: true,
        description: '비밀번호 보호 게시물용'
      },
      author: { 
        $ref: '#/components/schemas/User'
      },
      categories: {
        type: 'array',
        items: { $ref: '#/components/schemas/Category' }
      },
      tags: {
        type: 'array',
        items: { $ref: '#/components/schemas/Tag' }
      },
      featuredImage: { 
        type: 'string',
        format: 'uri',
        nullable: true
      },
      meta: {
        type: 'object',
        properties: {
          seoTitle: { type: 'string' },
          seoDescription: { type: 'string' },
          seoKeywords: { type: 'string' },
          ogImage: { type: 'string' }
        }
      },
      publishedAt: { 
        type: 'string',
        format: 'date-time',
        nullable: true
      },
      createdAt: { 
        type: 'string',
        format: 'date-time'
      },
      updatedAt: { 
        type: 'string',
        format: 'date-time'
      }
    }
  },

  Page: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      slug: { type: 'string' },
      content: { type: 'string' },
      status: { 
        type: 'string',
        enum: ['draft', 'publish', 'archived']
      },
      template: {
        type: 'string',
        description: '페이지 템플릿'
      },
      parentId: {
        type: 'string',
        nullable: true,
        description: '부모 페이지 ID'
      },
      order: {
        type: 'integer',
        description: '정렬 순서'
      },
      author: { $ref: '#/components/schemas/User' },
      featuredImage: { type: 'string', nullable: true },
      meta: {
        type: 'object',
        properties: {
          seoTitle: { type: 'string' },
          seoDescription: { type: 'string' }
        }
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  Media: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      filename: { type: 'string' },
      originalName: { type: 'string' },
      mimeType: { type: 'string' },
      size: { type: 'integer' },
      url: { type: 'string', format: 'uri' },
      thumbnailUrl: { type: 'string', format: 'uri', nullable: true },
      alt: { type: 'string', nullable: true },
      caption: { type: 'string', nullable: true },
      dimensions: {
        type: 'object',
        properties: {
          width: { type: 'integer' },
          height: { type: 'integer' }
        }
      },
      uploadedBy: { $ref: '#/components/schemas/User' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },

  Category: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      parentId: { type: 'string', nullable: true },
      count: { 
        type: 'integer',
        description: '카테고리 내 항목 수'
      },
      image: { type: 'string', nullable: true },
      order: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  Tag: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string', nullable: true },
      count: { type: 'integer' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },

  // E-commerce
  Product: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      slug: { type: 'string' },
      description: { type: 'string' },
      shortDescription: { type: 'string', nullable: true },
      sku: { type: 'string' },
      barcode: { type: 'string', nullable: true },
      type: {
        type: 'string',
        enum: ['physical', 'digital', 'service']
      },
      status: {
        type: 'string',
        enum: ['draft', 'active', 'inactive', 'out_of_stock']
      },
      price: {
        type: 'object',
        properties: {
          regular: { type: 'number' },
          sale: { type: 'number', nullable: true },
          wholesale: { type: 'number', nullable: true },
          affiliate: { type: 'number', nullable: true }
        }
      },
      stock: {
        type: 'object',
        properties: {
          quantity: { type: 'integer' },
          manageStock: { type: 'boolean' },
          stockStatus: {
            type: 'string',
            enum: ['in_stock', 'out_of_stock', 'on_backorder']
          },
          lowStockThreshold: { type: 'integer', nullable: true }
        }
      },
      shipping: {
        type: 'object',
        properties: {
          weight: { type: 'number', nullable: true },
          dimensions: {
            type: 'object',
            properties: {
              length: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' }
            }
          },
          shippingClass: { type: 'string', nullable: true }
        }
      },
      images: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            alt: { type: 'string', nullable: true },
            position: { type: 'integer' }
          }
        }
      },
      categories: {
        type: 'array',
        items: { $ref: '#/components/schemas/Category' }
      },
      tags: {
        type: 'array',
        items: { $ref: '#/components/schemas/Tag' }
      },
      attributes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'string' },
            visible: { type: 'boolean' }
          }
        }
      },
      variations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sku: { type: 'string' },
            price: { type: 'number' },
            stock: { type: 'integer' },
            attributes: { type: 'object' }
          }
        }
      },
      supplier: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          sku: { type: 'string' }
        }
      },
      seo: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          keywords: { type: 'string' }
        }
      },
      createdBy: { $ref: '#/components/schemas/User' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  Order: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      orderNumber: { 
        type: 'string',
        description: '주문 번호'
      },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        description: '주문 상태'
      },
      customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' }
        }
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            product: { $ref: '#/components/schemas/Product' },
            quantity: { type: 'integer' },
            price: { type: 'number' },
            subtotal: { type: 'number' }
          }
        }
      },
      billing: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          company: { type: 'string', nullable: true },
          address1: { type: 'string' },
          address2: { type: 'string', nullable: true },
          city: { type: 'string' },
          state: { type: 'string' },
          postcode: { type: 'string' },
          country: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' }
        }
      },
      shipping: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          company: { type: 'string', nullable: true },
          address1: { type: 'string' },
          address2: { type: 'string', nullable: true },
          city: { type: 'string' },
          state: { type: 'string' },
          postcode: { type: 'string' },
          country: { type: 'string' },
          method: { type: 'string' },
          cost: { type: 'number' }
        }
      },
      payment: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          transactionId: { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
          }
        }
      },
      totals: {
        type: 'object',
        properties: {
          subtotal: { type: 'number' },
          shipping: { type: 'number' },
          tax: { type: 'number' },
          discount: { type: 'number' },
          total: { type: 'number' }
        }
      },
      coupon: {
        type: 'object',
        nullable: true,
        properties: {
          code: { type: 'string' },
          discount: { type: 'number' }
        }
      },
      notes: { type: 'string', nullable: true },
      metadata: { type: 'object', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  Cart: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      userId: { type: 'string', nullable: true },
      sessionId: { type: 'string', nullable: true },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            product: { $ref: '#/components/schemas/Product' },
            quantity: { type: 'integer' },
            price: { type: 'number' },
            subtotal: { type: 'number' }
          }
        }
      },
      coupon: {
        type: 'object',
        nullable: true,
        properties: {
          code: { type: 'string' },
          discount: { type: 'number' }
        }
      },
      totals: {
        type: 'object',
        properties: {
          subtotal: { type: 'number' },
          discount: { type: 'number' },
          shipping: { type: 'number' },
          tax: { type: 'number' },
          total: { type: 'number' }
        }
      },
      expiresAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  // Dropshipping
  DropshippingSettings: {
    type: 'object',
    properties: {
      autoOrderRouting: { 
        type: 'boolean',
        description: '자동 주문 라우팅 활성화'
      },
      defaultMarginPolicy: {
        type: 'object',
        properties: {
          platformCommission: { 
            type: 'number',
            description: '플랫폼 수수료 (%)'
          },
          affiliateCommission: { 
            type: 'number',
            description: '제휴 수수료 (%)'
          },
          minimumMargin: { 
            type: 'number',
            description: '최소 마진 (%)'
          }
        }
      },
      automationRules: {
        type: 'object',
        properties: {
          autoApproveOrders: { type: 'boolean' },
          autoForwardToSupplier: { type: 'boolean' },
          stockSyncInterval: { type: 'integer' },
          priceUpdateInterval: { type: 'integer' }
        }
      }
    }
  },

  SupplierConnector: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      type: {
        type: 'string',
        enum: ['api', 'csv', 'ftp']
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'error']
      },
      lastSync: { 
        type: 'string',
        format: 'date-time',
        nullable: true
      },
      productsCount: { type: 'integer' },
      ordersCount: { type: 'integer' },
      config: { type: 'object' }
    }
  },

  // Settings
  Settings: {
    type: 'object',
    properties: {
      general: {
        type: 'object',
        properties: {
          siteName: { type: 'string' },
          siteDescription: { type: 'string' },
          siteUrl: { type: 'string' },
          adminEmail: { type: 'string' },
          timezone: { type: 'string' },
          dateFormat: { type: 'string' },
          timeFormat: { type: 'string' }
        }
      },
      email: {
        type: 'object',
        properties: {
          smtpHost: { type: 'string' },
          smtpPort: { type: 'integer' },
          smtpUser: { type: 'string' },
          smtpSecure: { type: 'boolean' },
          fromEmail: { type: 'string' },
          fromName: { type: 'string' }
        }
      },
      security: {
        type: 'object',
        properties: {
          twoFactorAuth: { type: 'boolean' },
          passwordPolicy: {
            type: 'object',
            properties: {
              minLength: { type: 'integer' },
              requireUppercase: { type: 'boolean' },
              requireLowercase: { type: 'boolean' },
              requireNumbers: { type: 'boolean' },
              requireSpecialChars: { type: 'boolean' }
            }
          },
          sessionTimeout: { type: 'integer' },
          maxLoginAttempts: { type: 'integer' }
        }
      }
    }
  }
};