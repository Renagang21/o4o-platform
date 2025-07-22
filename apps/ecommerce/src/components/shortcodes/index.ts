// 숏코드 컴포넌트 및 정의 export
export { ProductSummary, productSummaryDefinition } from './ProductSummary';
export { ShippingCalculator, shippingCalculatorDefinition } from './ShippingCalculator';
export { PaymentMethods, paymentMethodsDefinition } from './PaymentMethods';
export { OrderSummary, orderSummaryDefinition } from './OrderSummary';
export { ProductGrid, productGridDefinition } from './ProductGrid';
export { FlashSaleTimer, flashSaleTimerDefinition } from './FlashSaleTimer';
export { CustomerReviews, customerReviewsDefinition } from './CustomerReviews';
export { RelatedProducts, relatedProductsDefinition } from './RelatedProducts';

// 모든 숏코드 정의 배열
import { productSummaryDefinition } from './ProductSummary';
import { shippingCalculatorDefinition } from './ShippingCalculator';
import { paymentMethodsDefinition } from './PaymentMethods';
import { orderSummaryDefinition } from './OrderSummary';
import { productGridDefinition } from './ProductGrid';
import { flashSaleTimerDefinition } from './FlashSaleTimer';
import { customerReviewsDefinition } from './CustomerReviews';
import { relatedProductsDefinition } from './RelatedProducts';

export const allShortcodes = [
  productSummaryDefinition,
  shippingCalculatorDefinition,
  paymentMethodsDefinition,
  orderSummaryDefinition,
  productGridDefinition,
  flashSaleTimerDefinition,
  customerReviewsDefinition,
  relatedProductsDefinition
];