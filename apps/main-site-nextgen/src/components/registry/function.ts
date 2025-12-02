// Function Component Registry
// Function components process data and return UI component definitions

import type { ViewContext } from '@/view/types';

export interface FunctionComponentProps {
  fetch?: any;
  data?: any;
  context?: ViewContext;
  [key: string]: any;
}

export interface FunctionComponentResult {
  type: string;
  props: Record<string, any>;
}

export type FunctionComponent = (
  props: FunctionComponentProps,
  context: ViewContext
) => FunctionComponentResult | Promise<FunctionComponentResult>;

// Dropshipping Function Components
import { sellerDashboard } from '@/shortcodes/_functions/dropshipping/sellerDashboard';
import { supplierDashboard } from '@/shortcodes/_functions/dropshipping/supplierDashboard';
import { partnerDashboard } from '@/shortcodes/_functions/dropshipping/partnerDashboard';

// Commerce Function Components
import { productList } from '@/shortcodes/_functions/commerce/productList';
import { productDetail } from '@/shortcodes/_functions/commerce/productDetail';
import { cart } from '@/shortcodes/_functions/commerce/cart';
import { checkout } from '@/shortcodes/_functions/commerce/checkout';
import { orderList } from '@/shortcodes/_functions/commerce/orderList';
import { orderDetail } from '@/shortcodes/_functions/commerce/orderDetail';

export const FunctionRegistry: Record<string, FunctionComponent> = {
  // Dropshipping
  SellerDashboard: sellerDashboard,
  SupplierDashboard: supplierDashboard,
  PartnerDashboard: partnerDashboard,
  // Commerce
  productList,
  productDetail,
  cart,
  checkout,
  orderList,
  orderDetail,
  // Add more function components here
};
