export const createMockProduct = (overrides) => {
    const baseProduct = {
        id: 'prod_' + Math.random().toString(36).substr(2, 9),
        name: 'Test Product',
        slug: 'test-product',
        description: 'This is a test product description',
        sku: 'TEST-SKU-001',
        retailPrice: 10000,
        wholesalePrice: 8000,
        affiliatePrice: 9000,
        cost: 5000,
        stockQuantity: 100,
        manageStock: true,
        lowStockThreshold: 10,
        stockStatus: 'instock',
        weight: 1.5,
        dimensions: {
            length: 10,
            width: 10,
            height: 5,
        },
        status: 'published',
        type: 'simple',
        featured: false,
        virtual: false,
        downloadable: false,
        images: [],
        featuredImage: 'https://via.placeholder.com/300',
        gallery: [],
        categories: [],
        tags: [],
        attributes: [],
        metaTitle: 'Test Product - SEO Title',
        metaDescription: 'Test product SEO description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test-user',
        totalSales: 0,
        averageRating: 0,
        reviewCount: 0,
    };
    return { ...baseProduct, ...overrides };
};
export const createMockProducts = {
    outOfStock: () => createMockProduct({
        stockQuantity: 0,
        stockStatus: 'outofstock',
    }),
    featured: () => createMockProduct({
        featured: true,
        retailPrice: 20000,
        wholesalePrice: 15000,
    }),
    virtual: () => createMockProduct({
        virtual: true,
        weight: 0,
        dimensions: undefined,
    }),
    draft: () => createMockProduct({
        status: 'draft',
    }),
    lowStock: () => createMockProduct({
        stockQuantity: 5,
        lowStockThreshold: 10,
    }),
};
//# sourceMappingURL=product.js.map