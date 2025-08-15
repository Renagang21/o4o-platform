/**
 * OpenAPI Schema Definitions
 * 모든 API 스키마 정의를 중앙화
 */
export declare const schemas: {
    Error: {
        type: string;
        required: string[];
        properties: {
            success: {
                type: string;
                example: boolean;
                description: string;
            };
            error: {
                type: string;
                example: string;
                description: string;
            };
            code: {
                type: string;
                example: string;
                description: string;
            };
            details: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
        };
    };
    ValidationError: {
        type: string;
        properties: {
            success: {
                type: string;
                example: boolean;
            };
            error: {
                type: string;
            };
            code: {
                type: string;
                example: string;
            };
            details: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        field: {
                            type: string;
                        };
                        message: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
    SuccessResponse: {
        type: string;
        required: string[];
        properties: {
            success: {
                type: string;
                example: boolean;
            };
            data: {
                type: string;
                description: string;
            };
            message: {
                type: string;
                description: string;
            };
        };
    };
    PaginatedResponse: {
        type: string;
        required: string[];
        properties: {
            data: {
                type: string;
                items: {};
                description: string;
            };
            pagination: {
                type: string;
                required: string[];
                properties: {
                    current: {
                        type: string;
                        example: number;
                        description: string;
                    };
                    total: {
                        type: string;
                        example: number;
                        description: string;
                    };
                    count: {
                        type: string;
                        example: number;
                        description: string;
                    };
                    totalItems: {
                        type: string;
                        example: number;
                        description: string;
                    };
                };
            };
        };
    };
    LoginRequest: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                example: string;
                description: string;
            };
            password: {
                type: string;
                format: string;
                example: string;
                description: string;
            };
        };
    };
    LoginResponse: {
        type: string;
        properties: {
            success: {
                type: string;
                example: boolean;
            };
            data: {
                type: string;
                properties: {
                    token: {
                        type: string;
                        description: string;
                    };
                    refreshToken: {
                        type: string;
                        description: string;
                    };
                    user: {
                        $ref: string;
                    };
                };
            };
        };
    };
    RegisterRequest: {
        type: string;
        required: string[];
        properties: {
            email: {
                type: string;
                format: string;
                example: string;
            };
            password: {
                type: string;
                format: string;
                minLength: number;
                example: string;
            };
            name: {
                type: string;
                example: string;
            };
            role: {
                type: string;
                enum: string[];
                default: string;
            };
            businessInfo: {
                type: string;
                properties: {
                    companyName: {
                        type: string;
                    };
                    businessNumber: {
                        type: string;
                    };
                    businessType: {
                        type: string;
                    };
                    address: {
                        type: string;
                    };
                    phone: {
                        type: string;
                    };
                };
            };
        };
    };
    User: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
                description: string;
            };
            email: {
                type: string;
                format: string;
                description: string;
            };
            name: {
                type: string;
                description: string;
            };
            firstName: {
                type: string;
            };
            lastName: {
                type: string;
            };
            avatar: {
                type: string;
                format: string;
                description: string;
            };
            role: {
                type: string;
                enum: string[];
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            permissions: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            businessInfo: {
                type: string;
                nullable: boolean;
                properties: {
                    companyName: {
                        type: string;
                    };
                    businessNumber: {
                        type: string;
                    };
                    businessType: {
                        type: string;
                    };
                    address: {
                        type: string;
                    };
                    phone: {
                        type: string;
                    };
                };
            };
            createdAt: {
                type: string;
                format: string;
            };
            updatedAt: {
                type: string;
                format: string;
            };
            lastLoginAt: {
                type: string;
                format: string;
                nullable: boolean;
            };
        };
    };
    Post: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            title: {
                type: string;
                description: string;
            };
            slug: {
                type: string;
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
            excerpt: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            visibility: {
                type: string;
                enum: string[];
                default: string;
            };
            password: {
                type: string;
                nullable: boolean;
                description: string;
            };
            author: {
                $ref: string;
            };
            categories: {
                type: string;
                items: {
                    $ref: string;
                };
            };
            tags: {
                type: string;
                items: {
                    $ref: string;
                };
            };
            featuredImage: {
                type: string;
                format: string;
                nullable: boolean;
            };
            meta: {
                type: string;
                properties: {
                    seoTitle: {
                        type: string;
                    };
                    seoDescription: {
                        type: string;
                    };
                    seoKeywords: {
                        type: string;
                    };
                    ogImage: {
                        type: string;
                    };
                };
            };
            publishedAt: {
                type: string;
                format: string;
                nullable: boolean;
            };
            createdAt: {
                type: string;
                format: string;
            };
            updatedAt: {
                type: string;
                format: string;
            };
        };
    };
    Page: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            title: {
                type: string;
            };
            slug: {
                type: string;
            };
            content: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
            };
            template: {
                type: string;
                description: string;
            };
            parentId: {
                type: string;
                nullable: boolean;
                description: string;
            };
            order: {
                type: string;
                description: string;
            };
            author: {
                $ref: string;
            };
            featuredImage: {
                type: string;
                nullable: boolean;
            };
            meta: {
                type: string;
                properties: {
                    seoTitle: {
                        type: string;
                    };
                    seoDescription: {
                        type: string;
                    };
                };
            };
            createdAt: {
                type: string;
                format: string;
            };
            updatedAt: {
                type: string;
                format: string;
            };
        };
    };
    Media: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            filename: {
                type: string;
            };
            originalName: {
                type: string;
            };
            mimeType: {
                type: string;
            };
            size: {
                type: string;
            };
            url: {
                type: string;
                format: string;
            };
            thumbnailUrl: {
                type: string;
                format: string;
                nullable: boolean;
            };
            alt: {
                type: string;
                nullable: boolean;
            };
            caption: {
                type: string;
                nullable: boolean;
            };
            dimensions: {
                type: string;
                properties: {
                    width: {
                        type: string;
                    };
                    height: {
                        type: string;
                    };
                };
            };
            uploadedBy: {
                $ref: string;
            };
            createdAt: {
                type: string;
                format: string;
            };
        };
    };
    Category: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            name: {
                type: string;
            };
            slug: {
                type: string;
            };
            description: {
                type: string;
                nullable: boolean;
            };
            parentId: {
                type: string;
                nullable: boolean;
            };
            count: {
                type: string;
                description: string;
            };
            image: {
                type: string;
                nullable: boolean;
            };
            order: {
                type: string;
            };
            createdAt: {
                type: string;
                format: string;
            };
            updatedAt: {
                type: string;
                format: string;
            };
        };
    };
    Tag: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            name: {
                type: string;
            };
            slug: {
                type: string;
            };
            description: {
                type: string;
                nullable: boolean;
            };
            count: {
                type: string;
            };
            createdAt: {
                type: string;
                format: string;
            };
        };
    };
    Product: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            name: {
                type: string;
            };
            slug: {
                type: string;
            };
            description: {
                type: string;
            };
            shortDescription: {
                type: string;
                nullable: boolean;
            };
            sku: {
                type: string;
            };
            barcode: {
                type: string;
                nullable: boolean;
            };
            type: {
                type: string;
                enum: string[];
            };
            status: {
                type: string;
                enum: string[];
            };
            price: {
                type: string;
                properties: {
                    regular: {
                        type: string;
                    };
                    sale: {
                        type: string;
                        nullable: boolean;
                    };
                    wholesale: {
                        type: string;
                        nullable: boolean;
                    };
                    affiliate: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            stock: {
                type: string;
                properties: {
                    quantity: {
                        type: string;
                    };
                    manageStock: {
                        type: string;
                    };
                    stockStatus: {
                        type: string;
                        enum: string[];
                    };
                    lowStockThreshold: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            shipping: {
                type: string;
                properties: {
                    weight: {
                        type: string;
                        nullable: boolean;
                    };
                    dimensions: {
                        type: string;
                        properties: {
                            length: {
                                type: string;
                            };
                            width: {
                                type: string;
                            };
                            height: {
                                type: string;
                            };
                        };
                    };
                    shippingClass: {
                        type: string;
                        nullable: boolean;
                    };
                };
            };
            images: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        url: {
                            type: string;
                            format: string;
                        };
                        alt: {
                            type: string;
                            nullable: boolean;
                        };
                        position: {
                            type: string;
                        };
                    };
                };
            };
            categories: {
                type: string;
                items: {
                    $ref: string;
                };
            };
            tags: {
                type: string;
                items: {
                    $ref: string;
                };
            };
            attributes: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        value: {
                            type: string;
                        };
                        visible: {
                            type: string;
                        };
                    };
                };
            };
            variations: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        sku: {
                            type: string;
                        };
                        price: {
                            type: string;
                        };
                        stock: {
                            type: string;
                        };
                        attributes: {
                            type: string;
                        };
                    };
                };
            };
            supplier: {
                type: string;
                nullable: boolean;
                properties: {
                    id: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    sku: {
                        type: string;
                    };
                };
            };
            seo: {
                type: string;
                properties: {
                    title: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                    keywords: {
                        type: string;
                    };
                };
            };
            createdBy: {
                $ref: string;
            };
            createdAt: {
                type: string;
                format: string;
            };
            updatedAt: {
                type: string;
                format: string;
            };
        };
    };
    Order: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            orderNumber: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                enum: string[];
                description: string;
            };
            customer: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    email: {
                        type: string;
                    };
                    phone: {
                        type: string;
                    };
                };
            };
            items: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        product: {
                            $ref: string;
                        };
                        quantity: {
                            type: string;
                        };
                        price: {
                            type: string;
                        };
                        subtotal: {
                            type: string;
                        };
                    };
                };
            };
            billing: {
                type: string;
                properties: {
                    firstName: {
                        type: string;
                    };
                    lastName: {
                        type: string;
                    };
                    company: {
                        type: string;
                        nullable: boolean;
                    };
                    address1: {
                        type: string;
                    };
                    address2: {
                        type: string;
                        nullable: boolean;
                    };
                    city: {
                        type: string;
                    };
                    state: {
                        type: string;
                    };
                    postcode: {
                        type: string;
                    };
                    country: {
                        type: string;
                    };
                    email: {
                        type: string;
                    };
                    phone: {
                        type: string;
                    };
                };
            };
            shipping: {
                type: string;
                properties: {
                    firstName: {
                        type: string;
                    };
                    lastName: {
                        type: string;
                    };
                    company: {
                        type: string;
                        nullable: boolean;
                    };
                    address1: {
                        type: string;
                    };
                    address2: {
                        type: string;
                        nullable: boolean;
                    };
                    city: {
                        type: string;
                    };
                    state: {
                        type: string;
                    };
                    postcode: {
                        type: string;
                    };
                    country: {
                        type: string;
                    };
                    method: {
                        type: string;
                    };
                    cost: {
                        type: string;
                    };
                };
            };
            payment: {
                type: string;
                properties: {
                    method: {
                        type: string;
                    };
                    transactionId: {
                        type: string;
                        nullable: boolean;
                    };
                    status: {
                        type: string;
                        enum: string[];
                    };
                };
            };
            totals: {
                type: string;
                properties: {
                    subtotal: {
                        type: string;
                    };
                    shipping: {
                        type: string;
                    };
                    tax: {
                        type: string;
                    };
                    discount: {
                        type: string;
                    };
                    total: {
                        type: string;
                    };
                };
            };
            coupon: {
                type: string;
                nullable: boolean;
                properties: {
                    code: {
                        type: string;
                    };
                    discount: {
                        type: string;
                    };
                };
            };
            notes: {
                type: string;
                nullable: boolean;
            };
            metadata: {
                type: string;
                nullable: boolean;
            };
            createdAt: {
                type: string;
                format: string;
            };
            updatedAt: {
                type: string;
                format: string;
            };
        };
    };
    Cart: {
        type: string;
        properties: {
            id: {
                type: string;
                format: string;
            };
            userId: {
                type: string;
                nullable: boolean;
            };
            sessionId: {
                type: string;
                nullable: boolean;
            };
            items: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        product: {
                            $ref: string;
                        };
                        quantity: {
                            type: string;
                        };
                        price: {
                            type: string;
                        };
                        subtotal: {
                            type: string;
                        };
                    };
                };
            };
            coupon: {
                type: string;
                nullable: boolean;
                properties: {
                    code: {
                        type: string;
                    };
                    discount: {
                        type: string;
                    };
                };
            };
            totals: {
                type: string;
                properties: {
                    subtotal: {
                        type: string;
                    };
                    discount: {
                        type: string;
                    };
                    shipping: {
                        type: string;
                    };
                    tax: {
                        type: string;
                    };
                    total: {
                        type: string;
                    };
                };
            };
            expiresAt: {
                type: string;
                format: string;
            };
            createdAt: {
                type: string;
                format: string;
            };
            updatedAt: {
                type: string;
                format: string;
            };
        };
    };
    DropshippingSettings: {
        type: string;
        properties: {
            autoOrderRouting: {
                type: string;
                description: string;
            };
            defaultMarginPolicy: {
                type: string;
                properties: {
                    platformCommission: {
                        type: string;
                        description: string;
                    };
                    affiliateCommission: {
                        type: string;
                        description: string;
                    };
                    minimumMargin: {
                        type: string;
                        description: string;
                    };
                };
            };
            automationRules: {
                type: string;
                properties: {
                    autoApproveOrders: {
                        type: string;
                    };
                    autoForwardToSupplier: {
                        type: string;
                    };
                    stockSyncInterval: {
                        type: string;
                    };
                    priceUpdateInterval: {
                        type: string;
                    };
                };
            };
        };
    };
    SupplierConnector: {
        type: string;
        properties: {
            id: {
                type: string;
            };
            name: {
                type: string;
            };
            type: {
                type: string;
                enum: string[];
            };
            status: {
                type: string;
                enum: string[];
            };
            lastSync: {
                type: string;
                format: string;
                nullable: boolean;
            };
            productsCount: {
                type: string;
            };
            ordersCount: {
                type: string;
            };
            config: {
                type: string;
            };
        };
    };
    Settings: {
        type: string;
        properties: {
            general: {
                type: string;
                properties: {
                    siteName: {
                        type: string;
                    };
                    siteDescription: {
                        type: string;
                    };
                    siteUrl: {
                        type: string;
                    };
                    adminEmail: {
                        type: string;
                    };
                    timezone: {
                        type: string;
                    };
                    dateFormat: {
                        type: string;
                    };
                    timeFormat: {
                        type: string;
                    };
                };
            };
            email: {
                type: string;
                properties: {
                    smtpHost: {
                        type: string;
                    };
                    smtpPort: {
                        type: string;
                    };
                    smtpUser: {
                        type: string;
                    };
                    smtpSecure: {
                        type: string;
                    };
                    fromEmail: {
                        type: string;
                    };
                    fromName: {
                        type: string;
                    };
                };
            };
            security: {
                type: string;
                properties: {
                    twoFactorAuth: {
                        type: string;
                    };
                    passwordPolicy: {
                        type: string;
                        properties: {
                            minLength: {
                                type: string;
                            };
                            requireUppercase: {
                                type: string;
                            };
                            requireLowercase: {
                                type: string;
                            };
                            requireNumbers: {
                                type: string;
                            };
                            requireSpecialChars: {
                                type: string;
                            };
                        };
                    };
                    sessionTimeout: {
                        type: string;
                    };
                    maxLoginAttempts: {
                        type: string;
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=index.d.ts.map