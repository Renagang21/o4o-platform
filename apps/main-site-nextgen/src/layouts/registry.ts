import { DefaultLayout } from './DefaultLayout';
import { DashboardLayout } from './DashboardLayout';
import { ShopLayout } from './ShopLayout';
import { AuthLayout } from './AuthLayout';
import { MinimalLayout } from './MinimalLayout';

export const LayoutRegistry: Record<string, React.ComponentType<any>> = {
  DefaultLayout,
  DashboardLayout,
  ShopLayout,
  AuthLayout,
  MinimalLayout,
};
