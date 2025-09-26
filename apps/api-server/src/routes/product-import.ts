import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AppDataSource } from '../database/connection';
import { Product } from '../entities/Product';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

const router: Router = Router();
const productRepository = AppDataSource.getRepository(Product);

// Import log storage
interface ImportLog {
  timestamp: string;
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

let importLogs: ImportLog[] = [];

// Helper function to add log
const addLog = (success: boolean, message: string, data?: any, error?: any) => {
  const log: ImportLog = {
    timestamp: new Date().toISOString(),
    success,
    message,
    data,
    error: error ? {
      message: error.message,
      stack: error.stack,
      code: error.code
    } : undefined
  };

  importLogs.push(log);

  // Keep only last 1000 logs in memory
  if (importLogs.length > 1000) {
    importLogs = importLogs.slice(-1000);
  }

  // Log to file system as well
  logger.info('Product Import Log:', log);
};

// POST /api/products/import - Import products
router.post('/import', authenticateToken, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      addLog(false, 'Invalid import data: products array is required');
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }

    addLog(true, `Starting import of ${products.length} products`);

    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const productData of products) {
      try {
        // Validate required fields
        if (!productData.name || !productData.sku) {
          throw new Error('Product name and SKU are required');
        }

        // Check if product with SKU already exists
        let product = await productRepository.findOne({
          where: { sku: productData.sku }
        });

        if (product) {
          // Update existing product
          product = productRepository.merge(product, {
            name: productData.name,
            slug: productData.slug || productData.name.toLowerCase().replace(/\s+/g, '-'),
            description: productData.description,
            shortDescription: productData.shortDescription,
            retailPrice: productData.retailPrice || productData.price || 0,
            wholesalePrice: productData.wholesalePrice,
            affiliatePrice: productData.affiliatePrice,
            salePrice: productData.salePrice,
            cost: productData.cost,
            stockQuantity: productData.stock || 0,
            weight: productData.weight,
            dimensions: productData.dimensions,
            images: productData.images,
            status: productData.status || 'draft',
            type: productData.type || 'physical',
            tags: productData.tags,
            featured: productData.featured || false,
            metaTitle: productData.metaTitle,
            metaDescription: productData.metaDescription
          });

          addLog(true, `Updating product: ${productData.sku}`, productData);
        } else {
          // Create new product
          product = productRepository.create({
            name: productData.name,
            slug: productData.slug || productData.name.toLowerCase().replace(/\s+/g, '-'),
            description: productData.description,
            shortDescription: productData.shortDescription,
            sku: productData.sku,
            retailPrice: productData.retailPrice || productData.price || 0,
            wholesalePrice: productData.wholesalePrice,
            affiliatePrice: productData.affiliatePrice,
            salePrice: productData.salePrice,
            cost: productData.cost,
            stockQuantity: productData.stock || 0,
            weight: productData.weight,
            dimensions: productData.dimensions,
            images: productData.images,
            status: productData.status || 'draft',
            type: productData.type || 'physical',
            tags: productData.tags,
            featured: productData.featured || false,
            metaTitle: productData.metaTitle,
            metaDescription: productData.metaDescription,
            createdBy: 'system' // Required field
          });

          addLog(true, `Creating product: ${productData.sku}`, productData);
        }

        await productRepository.save(product);
        results.success++;

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          sku: productData.sku,
          name: productData.name,
          error: error.message
        });

        addLog(false, `Failed to import product: ${productData.sku}`, productData, error);
      }
    }

    const responseMessage = `Import completed: ${results.success} succeeded, ${results.failed} failed`;
    addLog(true, responseMessage, results);

    res.json({
      success: true,
      message: responseMessage,
      results
    });

  } catch (error: any) {
    logger.error('Product import error:', error);
    addLog(false, 'Import failed with error', null, error);

    res.status(500).json({
      success: false,
      message: 'Failed to import products',
      error: error.message
    });
  }
});

// GET /api/products/import/logs - Get import logs
router.get('/import/logs', authenticateToken, requireRole(['admin', 'manager']), (req: Request, res: Response) => {
  const { limit = 100 } = req.query;
  const limitNum = Math.min(parseInt(limit as string) || 100, 1000);

  res.json({
    success: true,
    logs: importLogs.slice(-limitNum).reverse(),
    total: importLogs.length
  });
});

// GET /api/products/import/logs/download - Download import logs
router.get('/import/logs/download', authenticateToken, requireRole(['admin', 'manager']), (req: Request, res: Response) => {
  const filename = `product-import-logs-${new Date().toISOString().split('T')[0]}.json`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  res.json({
    exportDate: new Date().toISOString(),
    totalLogs: importLogs.length,
    logs: importLogs
  });
});

// DELETE /api/products/import/logs - Clear import logs
router.delete('/import/logs', authenticateToken, requireRole(['admin']), (req: Request, res: Response) => {
  const previousCount = importLogs.length;
  importLogs = [];

  res.json({
    success: true,
    message: `Cleared ${previousCount} import logs`
  });
});

// GET /api/products/import/template - Get import template
router.get('/import/template', authenticateToken, (req: Request, res: Response) => {
  const template = {
    products: [
      {
        name: 'Sample Product',
        sku: 'SAMPLE-001',
        description: 'Product description',
        shortDescription: 'Short description',
        price: 99.99,
        retailPrice: 99.99,
        wholesalePrice: 79.99,
        affiliatePrice: 89.99,
        salePrice: 89.99,
        onSale: false,
        stock: 100,
        weight: 1.5,
        dimensions: {
          length: 10,
          width: 10,
          height: 10
        },
        images: ['https://example.com/image1.jpg'],
        gallery: ['https://example.com/gallery1.jpg'],
        status: 'active',
        type: 'physical',
        categories: ['Electronics', 'Gadgets'],
        tags: ['new', 'featured'],
        attributes: {
          color: 'Blue',
          size: 'Medium'
        },
        featured: true,
        virtual: false,
        downloadable: false,
        metaTitle: 'Sample Product - Buy Online',
        metaDescription: 'Best sample product available online',
        metaKeywords: ['sample', 'product', 'online']
      }
    ]
  };

  res.json({
    success: true,
    template,
    instructions: {
      required: ['name', 'sku'],
      optional: ['All other fields are optional'],
      notes: [
        'SKU must be unique',
        'If product with same SKU exists, it will be updated',
        'Status can be: draft, active, inactive, out_of_stock',
        'Type can be: physical, digital, service'
      ]
    }
  });
});

export default router;