/**
 * Supplier Connector Main Entry Point
 * Factory for creating and managing supplier connectors
 */

export * from './types/index.js';
export { DomesticSupplierConnector } from './connectors/DomesticSupplierConnector.js';
export { CSVSupplierConnector } from './connectors/CSVSupplierConnector.js';

import { SupplierConnector, SupplierConfig } from './types/index.js';
import { DomesticSupplierConnector } from './connectors/DomesticSupplierConnector.js';
import { CSVSupplierConnector } from './connectors/CSVSupplierConnector.js';

/**
 * Supplier Connector Factory
 * Creates appropriate connector based on configuration
 */
export class SupplierConnectorFactory {
  private static connectors: Map<string, SupplierConnector> = new Map();

  /**
   * Create a new supplier connector
   */
  static create(id: string, config: SupplierConfig): SupplierConnector {
    let connector: SupplierConnector;

    switch (config.type) {
      case 'api':
        connector = new DomesticSupplierConnector(config);
        break;
      
      case 'csv':
        connector = new CSVSupplierConnector(config);
        break;
      
      // case 'xml':
      //   connector = new XMLSupplierConnector(config);
      //   break;
      
      // case 'scraper':
      //   connector = new ScraperSupplierConnector(config);
      //   break;
      
      default:
        throw new Error(`Unsupported supplier connector type: ${config.type}`);
    }

    this.connectors.set(id, connector);
    return connector;
  }

  /**
   * Get existing connector by ID
   */
  static get(id: string): SupplierConnector | undefined {
    return this.connectors.get(id);
  }

  /**
   * Remove connector
   */
  static remove(id: string): boolean {
    return this.connectors.delete(id);
  }

  /**
   * Get all active connectors
   */
  static getAll(): Map<string, SupplierConnector> {
    return new Map(this.connectors);
  }

  /**
   * Clear all connectors
   */
  static clear(): void {
    this.connectors.clear();
  }
}

/**
 * Supplier Manager
 * High-level interface for managing multiple suppliers
 */
export class SupplierManager {
  private connectors: Map<string, SupplierConnector> = new Map();

  /**
   * Add a new supplier
   */
  addSupplier(id: string, config: SupplierConfig): SupplierConnector {
    const connector = SupplierConnectorFactory.create(id, config);
    this.connectors.set(id, connector);
    return connector;
  }

  /**
   * Get supplier by ID
   */
  getSupplier(id: string): SupplierConnector | undefined {
    return this.connectors.get(id);
  }

  /**
   * Remove supplier
   */
  removeSupplier(id: string): boolean {
    return this.connectors.delete(id);
  }

  /**
   * Sync all suppliers
   */
  async syncAllSuppliers(): Promise<void> {
    const syncPromises = Array.from(this.connectors.values()).map(
      connector => connector.syncProducts()
    );
    
    await Promise.all(syncPromises);
  }

  /**
   * Search products across all suppliers
   */
  async searchAllSuppliers(query: string): Promise<any[]> {
    const searchPromises = Array.from(this.connectors.entries()).map(
      async ([supplierId, connector]) => {
        const products = await connector.searchProducts(query);
        return products.map(product => ({
          ...product,
          supplierId
        }));
      }
    );
    
    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  /**
   * Check inventory across all suppliers
   */
  async checkInventoryAllSuppliers(sku: string): Promise<Map<string, any>> {
    const inventoryMap = new Map();
    
    for (const [supplierId, connector] of this.connectors) {
      try {
        const inventory = await connector.checkInventory(sku);
        inventoryMap.set(supplierId, inventory);
      } catch (error) {
        // SKU might not exist for this supplier
        // SKU not found for this supplier
      }
    }
    
    return inventoryMap;
  }

  /**
   * Find best supplier for a product based on price and availability
   */
  async findBestSupplier(sku: string, quantity: number): Promise<{
    supplierId: string;
    product: any;
    inventory: any;
  } | null> {
    let bestOption = null;
    let lowestCost = Infinity;
    
    for (const [supplierId, connector] of this.connectors) {
      try {
        const product = await connector.getProduct(sku);
        const inventory = await connector.checkInventory(sku);
        
        if (product && inventory.available >= quantity) {
          if (product.cost < lowestCost) {
            lowestCost = product.cost;
            bestOption = {
              supplierId,
              product,
              inventory
            };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return bestOption;
  }
}