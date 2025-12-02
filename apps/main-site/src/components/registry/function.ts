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
) => FunctionComponentResult;

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

// Customer/Auth Function Components
import { login } from '@/shortcodes/_functions/customer/login';
import { signup } from '@/shortcodes/_functions/customer/signup';
import { resetPassword } from '@/shortcodes/_functions/customer/resetPassword';
import { myAccount } from '@/shortcodes/_functions/customer/myAccount';
import { wishlist } from '@/shortcodes/_functions/customer/wishlist';
import { profile } from '@/shortcodes/_functions/customer/profile';

// Admin Function Components
import { adminStats } from '@/shortcodes/_functions/admin/adminStats';
import { adminDashboard } from '@/shortcodes/_functions/admin/adminDashboard';
import { adminSellerList } from '@/shortcodes/_functions/admin/adminSellerList';
import { adminSellerDetail } from '@/shortcodes/_functions/admin/adminSellerDetail';
import { adminSupplierList } from '@/shortcodes/_functions/admin/adminSupplierList';
import { adminSupplierDetail } from '@/shortcodes/_functions/admin/adminSupplierDetail';

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
  // Customer/Auth
  login,
  signup,
  resetPassword,
  myAccount,
  wishlist,
  profile,
  // Admin
  adminStats,
  adminDashboard,
  adminSellerList,
  adminSellerDetail,
  adminSupplierList,
  adminSupplierDetail,
  // Add more function components here
};
