import { NetureSupplierDashboardService } from './supplier-dashboard.service.js';
import { NetureAdminDashboardService } from './admin-dashboard.service.js';
import { NetureSellerDashboardService } from './seller-dashboard.service.js';

/**
 * Compatibility facade for NetureService and its existing controllers.
 * Role-specific readers own the queries; public method and response contracts remain unchanged.
 * SupplierCopilotService remains the separate checkout-based supplier KPI reader.
 */
export class NetureDashboardService {
  private _supplier?: NetureSupplierDashboardService;
  private _admin?: NetureAdminDashboardService;
  private _seller?: NetureSellerDashboardService;

  private get supplier(): NetureSupplierDashboardService {
    if (!this._supplier) this._supplier = new NetureSupplierDashboardService();
    return this._supplier;
  }

  private get admin(): NetureAdminDashboardService {
    if (!this._admin) this._admin = new NetureAdminDashboardService();
    return this._admin;
  }

  private get seller(): NetureSellerDashboardService {
    if (!this._seller) this._seller = new NetureSellerDashboardService();
    return this._seller;
  }

  async getSupplierOrdersSummary(supplierId: string) {
    return this.supplier.getSupplierOrdersSummary(supplierId);
  }

  async getSupplierDashboardSummary(supplierId: string) {
    return this.supplier.getSupplierDashboardSummary(supplierId);
  }

  async getAdminDashboardSummary() {
    return this.admin.getAdminDashboardSummary();
  }

  async getSellerDashboardInsight(sellerId: string) {
    return this.seller.getSellerDashboardInsight(sellerId);
  }
}
