"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUi = exports.specs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerUi = swagger_ui_express_1.default;
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'O4O Platform B2B API',
            version: '1.0.0',
            description: 'Complete B2B vendor/supplier management system with commission processing',
            contact: {
                name: 'O4O Platform Team',
                email: 'support@o4o-platform.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:4000/api',
                description: 'Development server',
            },
            {
                url: 'https://api.o4o-platform.com/api',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    required: ['success', 'errorCode', 'message', 'timestamp'],
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        errorCode: {
                            type: 'string',
                            example: 'VALIDATION_ERROR',
                        },
                        message: {
                            type: 'string',
                            example: 'Invalid input data',
                        },
                        details: {
                            type: 'object',
                            description: 'Additional error details',
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T12:00:00.000Z',
                        },
                        path: {
                            type: 'string',
                            example: '/api/vendors',
                        },
                        method: {
                            type: 'string',
                            example: 'GET',
                        },
                        requestId: {
                            type: 'string',
                            example: '12345-67890-abcde',
                        },
                    },
                },
                Vendor: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000',
                        },
                        vendorName: {
                            type: 'string',
                            example: 'Tech Vendor Inc.',
                        },
                        vendorType: {
                            type: 'string',
                            enum: ['individual', 'company'],
                            example: 'company',
                        },
                        contactName: {
                            type: 'string',
                            example: 'John Doe',
                        },
                        contactPhone: {
                            type: 'string',
                            example: '+1-555-123-4567',
                        },
                        contactEmail: {
                            type: 'string',
                            format: 'email',
                            example: 'john@techvendor.com',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'active', 'suspended', 'rejected'],
                            example: 'active',
                        },
                        affiliateCode: {
                            type: 'string',
                            example: 'TECH001',
                        },
                        affiliateRate: {
                            type: 'number',
                            format: 'decimal',
                            example: 12.5,
                        },
                        totalSales: {
                            type: 'number',
                            example: 150000,
                        },
                        totalRevenue: {
                            type: 'number',
                            format: 'decimal',
                            example: 1250000.00,
                        },
                        rating: {
                            type: 'number',
                            format: 'decimal',
                            minimum: 0,
                            maximum: 5,
                            example: 4.5,
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Supplier: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        companyName: {
                            type: 'string',
                            example: 'Global Supply Co.',
                        },
                        supplierType: {
                            type: 'string',
                            enum: ['manufacturer', 'distributor', 'wholesaler', 'dropshipper'],
                            example: 'manufacturer',
                        },
                        contactName: {
                            type: 'string',
                            example: 'Jane Smith',
                        },
                        contactEmail: {
                            type: 'string',
                            format: 'email',
                        },
                        contactPhone: {
                            type: 'string',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'active', 'suspended', 'inactive'],
                            example: 'active',
                        },
                        defaultMarginRate: {
                            type: 'number',
                            format: 'decimal',
                            example: 15.0,
                        },
                        totalProducts: {
                            type: 'number',
                            example: 250,
                        },
                        activeProducts: {
                            type: 'number',
                            example: 200,
                        },
                        totalOrders: {
                            type: 'number',
                            example: 1500,
                        },
                        totalOrderValue: {
                            type: 'number',
                            format: 'decimal',
                            example: 850000.00,
                        },
                    },
                },
                VendorCommission: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        vendorId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        period: {
                            type: 'string',
                            example: '2024-01',
                            description: 'Commission period in YYYY-MM format',
                        },
                        totalOrders: {
                            type: 'number',
                            example: 145,
                        },
                        completedOrders: {
                            type: 'number',
                            example: 135,
                        },
                        grossSales: {
                            type: 'number',
                            format: 'decimal',
                            example: 125000.00,
                        },
                        netSales: {
                            type: 'number',
                            format: 'decimal',
                            example: 120000.00,
                        },
                        commissionRate: {
                            type: 'number',
                            format: 'decimal',
                            example: 12.5,
                        },
                        totalCommission: {
                            type: 'number',
                            format: 'decimal',
                            example: 15000.00,
                        },
                        totalDeductions: {
                            type: 'number',
                            format: 'decimal',
                            example: 2500.00,
                        },
                        netCommission: {
                            type: 'number',
                            format: 'decimal',
                            example: 12500.00,
                        },
                        totalPayable: {
                            type: 'number',
                            format: 'decimal',
                            example: 12500.00,
                        },
                        status: {
                            type: 'string',
                            enum: ['draft', 'pending', 'approved', 'paid', 'disputed', 'cancelled'],
                            example: 'approved',
                        },
                        paidAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                    },
                },
                CommissionSettlement: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        supplierId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        period: {
                            type: 'string',
                            example: '2024-01',
                        },
                        totalOrders: {
                            type: 'number',
                            example: 85,
                        },
                        grossRevenue: {
                            type: 'number',
                            format: 'decimal',
                            example: 95000.00,
                        },
                        supplierEarnings: {
                            type: 'number',
                            format: 'decimal',
                            example: 75000.00,
                        },
                        totalPayable: {
                            type: 'number',
                            format: 'decimal',
                            example: 75000.00,
                        },
                        status: {
                            type: 'string',
                            enum: ['draft', 'pending', 'approved', 'processing', 'paid', 'failed', 'disputed'],
                            example: 'pending',
                        },
                        paymentDate: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                    },
                },
                DashboardData: {
                    type: 'object',
                    properties: {
                        vendor: {
                            $ref: '#/components/schemas/Vendor',
                        },
                        commission: {
                            type: 'object',
                            properties: {
                                current: {
                                    $ref: '#/components/schemas/VendorCommission',
                                },
                                trend: {
                                    type: 'object',
                                    properties: {
                                        direction: {
                                            type: 'string',
                                            enum: ['up', 'down', 'stable'],
                                        },
                                        percentage: {
                                            type: 'number',
                                        },
                                    },
                                },
                            },
                        },
                        stats: {
                            type: 'object',
                            properties: {
                                totalCommissionEarned: {
                                    type: 'number',
                                    format: 'decimal',
                                },
                                averageOrderValue: {
                                    type: 'number',
                                    format: 'decimal',
                                },
                                commissionRate: {
                                    type: 'number',
                                    format: 'decimal',
                                },
                                pendingPayments: {
                                    type: 'number',
                                    format: 'decimal',
                                },
                            },
                        },
                    },
                },
                AdminOverview: {
                    type: 'object',
                    properties: {
                        summary: {
                            type: 'object',
                            properties: {
                                totalVendors: {
                                    type: 'number',
                                },
                                totalSuppliers: {
                                    type: 'number',
                                },
                                currentPeriod: {
                                    type: 'object',
                                    properties: {
                                        totalCommissions: {
                                            type: 'number',
                                            format: 'decimal',
                                        },
                                        totalSettlements: {
                                            type: 'number',
                                            format: 'decimal',
                                        },
                                        pendingPayments: {
                                            type: 'number',
                                            format: 'decimal',
                                        },
                                    },
                                },
                            },
                        },
                        pending: {
                            type: 'object',
                            properties: {
                                vendorCommissions: {
                                    type: 'object',
                                    properties: {
                                        count: {
                                            type: 'number',
                                        },
                                        totalAmount: {
                                            type: 'number',
                                            format: 'decimal',
                                        },
                                    },
                                },
                                supplierSettlements: {
                                    type: 'object',
                                    properties: {
                                        count: {
                                            type: 'number',
                                        },
                                        totalAmount: {
                                            type: 'number',
                                            format: 'decimal',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                WebhookPayload: {
                    type: 'object',
                    required: ['event', 'data', 'timestamp'],
                    properties: {
                        event: {
                            type: 'string',
                            enum: [
                                'commission.payment.success',
                                'commission.payment.failed',
                                'settlement.payment.success',
                                'settlement.payment.failed',
                                'commission.dispute.created',
                                'settlement.dispute.created',
                                'payment.refund.processed'
                            ],
                            example: 'commission.payment.success',
                        },
                        data: {
                            type: 'object',
                            properties: {
                                commissionId: {
                                    type: 'string',
                                    format: 'uuid',
                                },
                                settlementId: {
                                    type: 'string',
                                    format: 'uuid',
                                },
                                paymentId: {
                                    type: 'string',
                                    example: 'pay_1234567890',
                                },
                                amount: {
                                    type: 'number',
                                    format: 'decimal',
                                    example: 1250.00,
                                },
                                currency: {
                                    type: 'string',
                                    example: 'USD',
                                },
                                status: {
                                    type: 'string',
                                    enum: ['success', 'failed', 'pending', 'cancelled'],
                                    example: 'success',
                                },
                                paymentMethod: {
                                    type: 'string',
                                    example: 'bank_transfer',
                                },
                                transactionId: {
                                    type: 'string',
                                    example: 'txn_abcdef123456',
                                },
                                failureReason: {
                                    type: 'string',
                                    nullable: true,
                                },
                                metadata: {
                                    type: 'object',
                                    nullable: true,
                                },
                            },
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            example: '2024-01-01T12:00:00.000Z',
                        },
                        signature: {
                            type: 'string',
                            example: 'sha256=abcdef123456...',
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            {
                name: 'Vendors',
                description: 'Vendor management operations',
            },
            {
                name: 'Suppliers',
                description: 'Supplier management operations',
            },
            {
                name: 'Commissions',
                description: 'Commission calculation and management',
            },
            {
                name: 'Dashboard',
                description: 'Dashboard and analytics endpoints',
            },
            {
                name: 'Admin',
                description: 'Administrative operations',
            },
            {
                name: 'Webhooks',
                description: 'Webhook endpoints for external integrations',
            },
        ],
    },
    apis: [
        './src/routes/*.ts',
        './src/controllers/**/*.ts',
    ],
};
const specs = (0, swagger_jsdoc_1.default)(options);
exports.specs = specs;
//# sourceMappingURL=swagger.config.js.map