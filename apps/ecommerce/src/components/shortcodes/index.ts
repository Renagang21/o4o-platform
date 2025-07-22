// 숏코드 컴포넌트 및 정의 export
export { ProductSummary, productSummaryDefinition } from './ProductSummary';
export { ShippingCalculator, shippingCalculatorDefinition } from './ShippingCalculator';
export { PaymentMethods, paymentMethodsDefinition } from './PaymentMethods';
export { OrderSummary, orderSummaryDefinition } from './OrderSummary';

// 모든 숏코드 정의 배열
import { productSummaryDefinition } from './ProductSummary';
import { shippingCalculatorDefinition } from './ShippingCalculator';
import { paymentMethodsDefinition } from './PaymentMethods';
import { orderSummaryDefinition } from './OrderSummary';

export const allShortcodes = [
  productSummaryDefinition,
  shippingCalculatorDefinition,
  paymentMethodsDefinition,
  orderSummaryDefinition
];