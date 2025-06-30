// Main Extension
export { default as DropshippingExtension } from './DropshippingExtension';
export type { DropshippingOptions } from './DropshippingExtension';

// Layout Components
export { AdminLayout } from './layout/AdminLayout';
export { Header } from './layout/Header';
export { Sidebar } from './layout/Sidebar';
export { RoleSelector } from './layout/RoleSelector';
export type { UserRole } from './layout/RoleSelector';

// UI Components
export { StatCard } from './ui/StatCard';
export { StatusBadge } from './ui/StatusBadge';
export { DataTable } from './ui/DataTable';
export { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from './ui/Modal';

// Enhanced UI Components
export { EnhancedStatCard } from './ui/EnhancedStatCard';
export { 
  ToastProvider, 
  ToastComponent, 
  useToast, 
  useSuccessToast, 
  useErrorToast, 
  useWarningToast, 
  useInfoToast 
} from './ui/ToastNotification';
export type { Toast } from './ui/ToastNotification';

// Chart Components
export { SalesTrendChart } from './charts/SalesTrendChart';
export { ProductPerformanceChart } from './charts/ProductPerformanceChart';

// Widget Components
export { RealTimeOrderWidget } from './widgets/RealTimeOrderWidget';
export { InventoryAlertsWidget } from './widgets/InventoryAlertsWidget';

// Context and State Management
export { 
  DashboardProvider, 
  useDashboard, 
  useDashboardData, 
  useDashboardSettings, 
  useDashboardCache 
} from './context/DashboardContext';
export type { 
  SalesData, 
  CategoryData, 
  KPIData, 
  DateRange, 
  DashboardState 
} from './context/DashboardContext';

// Page Components
export { DashboardPage } from './pages/DashboardPage';
export { EnhancedSupplierDashboard } from './pages/EnhancedSupplierDashboard';

// Test Components
export { ComponentsIntegrationTest } from './test/ComponentsIntegrationTest';

// Theme
export { CoupangTheme, getThemeColor, getThemeShadow, getThemeSpacing } from './theme/coupang-theme';