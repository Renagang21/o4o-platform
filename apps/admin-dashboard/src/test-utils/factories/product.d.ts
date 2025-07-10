import { Product } from '@/types/ecommerce';
export declare const createMockProduct: (overrides?: Partial<Product>) => Product;
export declare const createMockProducts: {
    outOfStock: () => Product;
    featured: () => Product;
    virtual: () => Product;
    draft: () => Product;
    lowStock: () => Product;
};
//# sourceMappingURL=product.d.ts.map