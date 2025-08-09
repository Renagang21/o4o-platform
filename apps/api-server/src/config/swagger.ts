import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'O4O Platform API',
      version: '1.0.0',
      description: `
        O4O Platform REST API Documentation
        
        ## Overview
        This API provides endpoints for managing the O4O platform including:
        - Content Management (Posts, Pages, Media)
        - E-commerce (Products, Orders, Customers)
        - User Management & Authentication
        - Platform Settings & Configuration
        - Forum & Community Features
        - Crowdfunding Campaigns
        
        ## Authentication
        Most endpoints require authentication using JWT tokens.
        Include the token in the Authorization header:
        \`Authorization: Bearer <token>\`
        
        ## API Versioning
        All endpoints are versioned with \`/api/v1\` prefix.
      `,
      contact: {
        name: 'O4O Platform Support',
        email: 'support@neture.co.kr',
        url: 'https://neture.co.kr'
      },
      license: {
        name: 'Proprietary',
        url: 'https://neture.co.kr/license'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.neture.co.kr/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            },
            message: {
              type: 'string'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                current: {
                  type: 'number',
                  example: 1
                },
                total: {
                  type: 'number',
                  example: 10
                },
                count: {
                  type: 'number',
                  example: 20
                },
                totalItems: {
                  type: 'number',
                  example: 200
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user', 'vendor'] },
            status: { type: 'string', enum: ['active', 'pending', 'suspended'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            slug: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            author: { $ref: '#/components/schemas/User' },
            categories: {
              type: 'array',
              items: { $ref: '#/components/schemas/Category' }
            },
            tags: {
              type: 'array',
              items: { $ref: '#/components/schemas/Tag' }
            },
            featuredImage: { type: 'string' },
            publishedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            parentId: { type: 'string' },
            count: { type: 'number' }
          }
        },
        Tag: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            count: { type: 'number' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            salePrice: { type: 'number' },
            sku: { type: 'string' },
            stock: { type: 'number' },
            status: { type: 'string', enum: ['active', 'draft', 'archived'] },
            images: {
              type: 'array',
              items: { type: 'string' }
            },
            categories: {
              type: 'array',
              items: { type: 'string' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            customer: { $ref: '#/components/schemas/User' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { $ref: '#/components/schemas/Product' },
                  quantity: { type: 'number' },
                  price: { type: 'number' }
                }
              }
            },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] 
            },
            total: { type: 'number' },
            shippingAddress: { type: 'object' },
            paymentMethod: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Content',
        description: 'Content management endpoints (posts, pages, media)'
      },
      {
        name: 'E-commerce',
        description: 'E-commerce endpoints (products, orders, customers)'
      },
      {
        name: 'Platform',
        description: 'Platform management endpoints'
      },
      {
        name: 'Forum',
        description: 'Forum and community endpoints'
      },
      {
        name: 'Settings',
        description: 'System settings endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './src/controllers/*.ts',
    './src/controllers/**/*.ts'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application) => {
  // Serve API docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'O4O Platform API Documentation'
  }));

  // Serve OpenAPI JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default swaggerSpec;