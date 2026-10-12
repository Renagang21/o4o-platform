/** Compatibility façade for existing settlement callers and DataSource injection. */
import type { DataSource } from 'typeorm';
import type { SettlementFilters } from './settlement-query-types.js';
import { SupplierSettlementReadService } from './supplier-settlement-read.service.js';
import { AdminSettlementReadService } from './admin-settlement-read.service.js';
import { SettlementCommandService } from './settlement-command.service.js';

export class NetureSettlementService {
  constructor(private dataSource: DataSource) {}

  private _supplierRead?: SupplierSettlementReadService;

  private get supplierRead(): SupplierSettlementReadService {
    return this._supplierRead ??= new SupplierSettlementReadService(this.dataSource);
  }

  private _adminRead?: AdminSettlementReadService;

  private get adminRead(): AdminSettlementReadService {
    return this._adminRead ??= new AdminSettlementReadService(this.dataSource);
  }

  private _command?: SettlementCommandService;

  private get command(): SettlementCommandService {
    return this._command ??= new SettlementCommandService(this.dataSource);
  }

  async getSupplierSettlements(supplierId: string, filters: SettlementFilters) {
    return this.supplierRead.getSupplierSettlements(supplierId, filters);
  }

  async getSupplierKpi(supplierId: string) {
    return this.supplierRead.getSupplierKpi(supplierId);
  }

  async getSupplierSettlementDetail(settlementId: string, supplierId: string) {
    return this.supplierRead.getSupplierSettlementDetail(settlementId, supplierId);
  }

  async calculateSettlements(periodStart: string, periodEnd: string) {
    return this.command.calculateSettlements(periodStart, periodEnd);
  }

  async cancelSettlement(settlementId: string, notes?: string) {
    return this.command.cancelSettlement(settlementId, notes);
  }

  async getAdminSettlements(filters: SettlementFilters) {
    return this.adminRead.getAdminSettlements(filters);
  }

  async getAdminKpi() {
    return this.adminRead.getAdminKpi();
  }

  async getAdminSettlementDetail(settlementId: string) {
    return this.adminRead.getAdminSettlementDetail(settlementId);
  }

  async approveSettlement(settlementId: string, notes?: string) {
    return this.command.approveSettlement(settlementId, notes);
  }

  async paySettlement(settlementId: string, notes?: string) {
    return this.command.paySettlement(settlementId, notes);
  }
}
