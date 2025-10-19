import { Product, ProductStatus } from '../entities/Product';
export interface CreateProductRequest {
    name: string;
    description: string;
    shortDescription?: string;
    sku: string;
    slug?: string;
    supplierId: string;
    categoryId?: string;
    supplierPrice: number;
    recommendedPrice: number;
    comparePrice?: number;
    currency?: string;
    partnerCommissionRate?: number;
    partnerCommissionAmount?: number;
    tierPricing?: {
        bronze?: number;
        silver?: number;
        gold?: number;
        platinum?: number;
    };
    inventory: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    images?: {
        main: string;
        gallery?: string[];
        thumbnails?: string[];
    };
    tags?: string[];
    variants?: any[];
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
        weight?: number;
        unit?: 'cm' | 'in' | 'kg' | 'lb';
    };
    specifications?: string;
    features?: string[];
    seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
    };
}
export interface UpdateProductRequest extends Partial<CreateProductRequest> {
    status?: ProductStatus;
}
export interface ProductFilters {
    supplierId?: string;
    categoryId?: string;
    status?: ProductStatus;
    isActive?: boolean;
    inStock?: boolean;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    tags?: string[];
    sortBy?: 'name' | 'price' | 'createdAt' | 'inventory' | 'salesCount';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export declare class ProductService {
    private productRepository;
    private supplierRepository;
    private categoryRepository;
    constructor();
    createProduct(data: CreateProductRequest): Promise<Product>;
    getProduct(id: string): Promise<Product | null>;
    getProducts(filters?: ProductFilters): Promise<{
        products: Product[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateProduct(id: string, data: UpdateProductRequest): Promise<Product>;
    deleteProduct(id: string): Promise<boolean>;
    toggleProductStatus(id: string, isActive: boolean): Promise<Product>;
    updateInventory(id: string, quantity: number, operation?: 'add' | 'subtract' | 'set'): Promise<Product>;
    getAvailableProductsForSellers(filters?: Omit<ProductFilters, 'status'>): Promise<{
        products: Product[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getSupplierProductStats(supplierId: string): Promise<{
        total: number;
        active: number;
        inactive: number;
        outOfStock: number;
        lowStock: number;
        averagePrice: number;
        totalInventory: number;
        totalSales: number;
    }>;
    private generateSlug;
}
export default ProductService;
//# sourceMappingURL=ProductService.d.ts.map