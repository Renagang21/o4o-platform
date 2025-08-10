export interface SupplierConfig {
  apiKey?: string;
  apiSecret?: string;
  endpoint?: string;
  type: 'api' | 'csv' | 'ftp';
}

export interface SupplierProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  description?: string;
}

export interface SupplierOrder {
  supplierOrderId: string;
  status: string;
  trackingNumber?: string;
  items: Array<{
    sku: string;
    quantity: number;
    price: number;
  }>;
}

export class SupplierConnector {
  constructor(private config: SupplierConfig) {}

  async getProducts(): Promise<SupplierProduct[]> {
    // Mock implementation
    return [];
  }

  async getProduct(sku: string): Promise<SupplierProduct | null> {
    // Mock implementation
    return null;
  }

  async createOrder(order: any): Promise<SupplierOrder> {
    // Mock implementation
    return {
      supplierOrderId: `SUP-${Date.now()}`,
      status: 'pending',
      items: []
    };
  }

  async getOrderStatus(supplierOrderId: string): Promise<{ status: string; trackingNumber?: string }> {
    // Mock implementation
    return { status: 'pending' };
  }

  async syncInventory(): Promise<void> {
    // Mock implementation
  }
}

export class APIConnector extends SupplierConnector {
  async syncInventory(): Promise<void> {
    // API-specific implementation
  }
}

export class CSVConnector extends SupplierConnector {
  async parseCSV(filePath: string): Promise<SupplierProduct[]> {
    // CSV parsing implementation
    return [];
  }
}

export class FTPConnector extends SupplierConnector {
  async downloadFiles(): Promise<void> {
    // FTP download implementation
  }
}

export class SupplierManager {
  private connectors: Map<string, SupplierConnector> = new Map();

  addConnector(supplierId: string, connector: SupplierConnector): void {
    this.connectors.set(supplierId, connector);
  }
  
  addSupplier(supplierId: string, config: SupplierConfig): void {
    const connector = new SupplierConnector(config);
    this.connectors.set(supplierId, connector);
  }

  getConnector(supplierId: string): SupplierConnector | undefined {
    return this.connectors.get(supplierId);
  }
  
  getSupplier(supplierId: string): SupplierConnector | undefined {
    return this.connectors.get(supplierId);
  }
  
  findBestSupplier(productSku: string): string | null {
    // Mock implementation - find supplier with best price/availability
    for (const [supplierId, connector] of this.connectors) {
      // In real implementation, would check inventory
      return supplierId;
    }
    return null;
  }

  async syncAllInventory(): Promise<void> {
    for (const [supplierId, connector] of this.connectors) {
      await connector.syncInventory();
    }
  }
}