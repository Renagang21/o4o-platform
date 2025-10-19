import { SellerProduct, SellerProductStatus } from '../entities/SellerProduct';
import { Seller } from '../entities/Seller';
import { Product, ProductStatus } from '../entities/Product';
export interface AddProductToSellerRequest {
    sellerId: string;
    productId: string;
    sellerPrice: number;
    inventory?: number;
    customTitle?: string;
    customDescription?: string;
    customImages?: string[];
    tags?: string[];
    isActive?: boolean;
}
export interface UpdateSellerProductRequest {
    sellerPrice?: number;
    inventory?: number;
    customTitle?: string;
    customDescription?: string;
    customImages?: string[];
    tags?: string[];
    isActive?: boolean;
    status?: SellerProductStatus;
}
export interface SellerProductFilters {
    sellerId?: string;
    productId?: string;
    supplierId?: string;
    categoryId?: string;
    status?: SellerProductStatus;
    isActive?: boolean;
    inStock?: boolean;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    tags?: string[];
    sortBy?: 'addedAt' | 'sellerPrice' | 'inventory' | 'salesCount' | 'productName';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}
export interface BulkAddProductsRequest {
    sellerId: string;
    products: {
        productId: string;
        sellerPrice: number;
        inventory?: number;
    }[];
}
export interface ProfitAnalysis {
    supplierPrice: number;
    sellerPrice: number;
    margin: number;
    marginPercentage: number;
    recommendedPrice: number;
    belowRecommended: boolean;
}
export declare class SellerProductService {
    private sellerProductRepository;
    private sellerRepository;
    private productRepository;
    private userRepository;
    constructor();
    addProductToSeller(data: AddProductToSellerRequest): Promise<SellerProduct>;
    updateSellerProduct(sellerProductId: string, data: UpdateSellerProductRequest): Promise<SellerProduct>;
    removeProductFromSeller(sellerProductId: string): Promise<boolean>;
    getSellerProducts(filters?: SellerProductFilters): Promise<{
        sellerProducts: SellerProduct[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getAvailableProducts(sellerId: string, filters?: Partial<SellerProductFilters>): Promise<{
        products: {
            supplierPrice: number;
            tierPricing: {
                bronze?: number;
                silver?: number;
                gold?: number;
                platinum?: number;
            };
            recommendedPrice: number;
            id: string;
            supplierId: string;
            supplier: import("../entities/Supplier").Supplier;
            categoryId?: string;
            category?: import("../entities/Category").Category;
            name: string;
            description: string;
            shortDescription?: string;
            sku: string;
            slug: string;
            type: import("../entities/Product").ProductType;
            status: ProductStatus;
            isActive: boolean;
            comparePrice?: number;
            currency: string;
            partnerCommissionRate: number;
            partnerCommissionAmount?: number;
            inventory: number;
            lowStockThreshold?: number;
            trackInventory: boolean;
            allowBackorder: boolean;
            images?: import("../entities/Product").ProductImages;
            tags?: string[];
            variants?: import("../entities/Product").ProductVariant[];
            hasVariants: boolean;
            dimensions?: import("../entities/Product").ProductDimensions;
            shipping?: import("../entities/Product").ShippingInfo;
            seo?: import("../entities/Product").ProductSEO;
            features?: string[];
            specifications?: string;
            brand?: string;
            model?: string;
            warranty?: string;
            metadata?: Record<string, any>;
            createdAt: Date;
            updatedAt: Date;
            publishedAt?: Date;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    bulkAddProducts(data: BulkAddProductsRequest): Promise<SellerProduct[]>;
    analyzeProfitability(sellerProductId: string): Promise<ProfitAnalysis>;
    syncInventory(sellerId: string): Promise<{
        updated: number;
        outOfStock: number;
    }>;
    getSellerProductStats(sellerId: string): Promise<{
        total: number;
        active: number;
        inactive: number;
        outOfStock: number;
        lowStock: number;
        averagePrice: number;
        totalInventory: number;
        totalSales: number;
    }>;
    getSellerProductPerformance(sellerId: string, limit?: number): Promise<{
        bestSellers: SellerProduct[];
        profitableProducts: {
            margin: number;
            marginPercentage: number;
            id: string;
            sellerId: string;
            seller: Seller;
            productId: string;
            product: Product;
            sellerPrice: number;
            comparePrice?: number;
            costPrice: number;
            profit: number;
            profitMargin: number;
            status: SellerProductStatus;
            isActive: boolean;
            isVisible: boolean;
            sellerInventory?: number;
            reservedInventory?: number;
            totalSold: number;
            totalRevenue: number;
            viewCount: number;
            cartAddCount: number;
            sellerSku?: string;
            sellerDescription?: string;
            sellerTags?: string[];
            sellerImages?: string[];
            isFeatured: boolean;
            featuredUntil?: Date;
            discountRate?: number;
            saleStartDate?: Date;
            saleEndDate?: Date;
            sellerSlug?: string;
            seoMetadata?: {
                title?: string;
                description?: string;
                keywords?: string[];
            };
            conversionRate: number;
            averageOrderValue: number;
            averageRating: number;
            reviewCount: number;
            createdAt: Date;
            updatedAt: Date;
            publishedAt?: Date;
            lastSoldAt?: Date;
        }[];
        lowStockProducts: SellerProduct[];
    }>;
}
export default SellerProductService;
//# sourceMappingURL=SellerProductService.d.ts.map