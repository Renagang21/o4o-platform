/**
 * 장바구니 서비스
 * 장바구니 관리, 재고 확인, 가격 계산 등
 */
interface CartItem {
    productId: string;
    variationId?: string;
    quantity: number;
    price: number;
    compareAtPrice?: number;
    name: string;
    image?: string;
    sku?: string;
    attributes?: Record<string, any>;
    addedAt: Date;
    metadata?: Record<string, any>;
}
interface Cart {
    userId?: string;
    sessionId?: string;
    items: CartItem[];
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    couponCode?: string;
    couponDiscount?: number;
    shippingAddress?: any;
    billingAddress?: any;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}
interface CartSummary {
    itemCount: number;
    uniqueItems: number;
    subtotal: number;
    savings: number;
    estimatedShipping: number;
    estimatedTax: number;
    total: number;
    outOfStockItems: string[];
    lowStockItems: {
        productId: string;
        available: number;
    }[];
}
export declare class CartService {
    private redis;
    private readonly CART_TTL;
    private readonly GUEST_CART_TTL;
    private productRepository;
    private variationRepository;
    private couponRepository;
    private userRepository;
    constructor();
    /**
     * 장바구니 조회
     */
    getCart(userId?: string, sessionId?: string): Promise<Cart | null>;
    /**
     * 장바구니에 상품 추가
     */
    addToCart(userId: string | undefined, sessionId: string | undefined, productId: string, variationId?: string, quantity?: number, metadata?: Record<string, any>): Promise<Cart>;
    /**
     * 장바구니 상품 수량 업데이트
     */
    updateCartItem(userId: string | undefined, sessionId: string | undefined, productId: string, variationId: string | undefined, quantity: number): Promise<Cart>;
    /**
     * 장바구니에서 상품 제거
     */
    removeFromCart(userId: string | undefined, sessionId: string | undefined, productId: string, variationId?: string): Promise<Cart>;
    /**
     * 장바구니 비우기
     */
    clearCart(userId?: string, sessionId?: string): Promise<Cart>;
    /**
     * 쿠폰 적용
     */
    applyCoupon(userId: string | undefined, sessionId: string | undefined, couponCode: string): Promise<Cart>;
    /**
     * 쿠폰 제거
     */
    removeCoupon(userId: string | undefined, sessionId: string | undefined): Promise<Cart>;
    /**
     * 장바구니 병합 (로그인 시)
     */
    mergeCarts(sessionId: string, userId: string): Promise<Cart>;
    /**
     * 장바구니 요약 정보
     */
    getCartSummary(userId?: string, sessionId?: string): Promise<CartSummary>;
    /**
     * 장바구니 검증
     */
    private validateCart;
    /**
     * 합계 계산
     */
    private calculateTotals;
    /**
     * 재고 확인
     */
    private checkStock;
    /**
     * 장바구니 저장
     */
    private saveCart;
    /**
     * 장바구니 키 생성
     */
    private getCartKey;
    /**
     * 빈 장바구니 생성
     */
    private createEmptyCart;
    /**
     * 장바구니 이벤트 추적
     */
    private trackCartEvent;
    /**
     * 장바구니 복구 (abandoned cart)
     */
    getAbandonedCarts(hours?: number): Promise<Cart[]>;
    /**
     * 장바구니 리마인더 이메일
     */
    sendCartReminder(cart: Cart): Promise<void>;
}
export declare const cartService: CartService;
export {};
//# sourceMappingURL=CartService.d.ts.map