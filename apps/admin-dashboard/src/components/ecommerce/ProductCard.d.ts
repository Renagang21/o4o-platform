import { Product } from '@/types/ecommerce';
interface ProductCardProps {
    product: Product;
    onEdit?: (product: Product) => void;
    onDelete?: (productId: string) => void;
    onDuplicate?: (productId: string) => void;
}
export declare const ProductCard: React.FC<ProductCardProps>;
export {};
//# sourceMappingURL=ProductCard.d.ts.map