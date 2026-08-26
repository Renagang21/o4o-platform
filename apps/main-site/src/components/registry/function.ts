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

// WO-O4O-MAIN-SITE-APPSTORE-PARALLEL-AXIS-CENSUS-AND-RETIREMENT-V1:
//   appStoreManager 는 main-site 전용 client-side AppRegistry 를 읽어 install/uninstall/
//   toggle 을 전부 alert() 스텁으로 처리하던 병렬 App Store 축이었다.
//   App 정의 정본은 APPS_CATALOG, 운영 상태는 app_registry 이며 read 는
//   /api/v1/admin/apps · /api/v1/apps/availability 다. 병렬축만 제거한다.

// CMS Function Components
import { viewList } from '@/shortcodes/_functions/cms/viewList';
import { viewForm } from '@/shortcodes/_functions/cms/viewForm';
import { viewEditor } from '@/shortcodes/_functions/cms/viewEditor';

// Digital Signage Function Components
import { signageDashboard } from '@o4o-apps/signage/functions/signageDashboard';
import { signageDevices } from '@o4o-apps/signage/functions/signageDevices';
import { signageSlides } from '@o4o-apps/signage/functions/signageSlides';
import { signagePlaylists } from '@o4o-apps/signage/functions/signagePlaylists';
import { signageSchedule } from '@o4o-apps/signage/functions/signageSchedule';
import { signagePlayback } from '@o4o-apps/signage/functions/signagePlayback';

export const FunctionRegistry: Record<string, FunctionComponent> = {
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
  // CMS
  viewList,
  viewForm,
  viewEditor,
  // Digital Signage
  signageDashboard,
  signageDevices,
  signageSlides,
  signagePlaylists,
  signageSchedule,
  signagePlayback,
  // Add more function components here
};
