import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Product } from '../../entities/Product';
import { Category } from '../../entities/Category';
import { Like, In } from 'typeorm';
import slugify from 'slugify';

// Ensure proper typing for req.user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  };
}

export class VendorProductController {
  // 벤더의 상품 목록 조회
  async getProducts(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { 
        page = '1', 
        limit = '20', 
        search = '', 
        category = '',
        status = '' 
      } = req.query;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productRepository = AppDataSource.getRepository(Product);
      const queryBuilder = productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.images', 'images')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.inventory', 'inventory')
        .where('product.vendorId = :vendorId', { vendorId });

      // 검색 조건
      if (search) {
        queryBuilder.andWhere(
          '(product.name LIKE :search OR product.sku LIKE :search)',
          { search: `%${search}%` }
        );
      }

      // 카테고리 필터
      if (category && category !== 'all') {
        queryBuilder.andWhere('category.name = :category', { category });
      }

      // 상태 필터
      if (status) {
        queryBuilder.andWhere('product.status = :status', { status });
      }

      // 페이지네이션
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      queryBuilder
        .orderBy('product.createdAt', 'DESC')
        .skip(skip)
        .take(limitNum);

      const [products, total] = await queryBuilder.getManyAndCount();

      // 판매 통계 추가
      const productIds = products.map((p: any) => p.id);
      const salesStats = await this.getProductSalesStats(productIds);

      const formattedProducts = products.map((product: any) => {
        const stats = salesStats.find((s: any) => s.productId === product.id);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.categoryId || 'Uncategorized',
          price: 0, // TODO: Add pricing to Product entity
          stock: 0, // TODO: Add inventory to Product entity
          status: product.status,
          image: product.images?.[0] || '/api/placeholder/100/100',
          sales: stats?.totalSales || 0
        };
      });

      res.json({
        products: formattedProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching vendor products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  // 상품 상세 조회
  async getProduct(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { id } = req.params;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productRepository = AppDataSource.getRepository(Product);
      const product = await productRepository.findOne({
        where: { id, vendorId },
        relations: ['images', 'category', 'inventory', 'tags', 'seo', 'shipping']
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  // 상품 생성
  async createProduct(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const productData = req.body;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productRepository = AppDataSource.getRepository(Product);
      const categoryRepository = AppDataSource.getRepository(Category);

      // 카테고리 확인
      let category = null;
      if (productData.categoryId) {
        category = await categoryRepository.findOne({ 
          where: { id: productData.categoryId } 
        });
      }

      // 상품 생성
      const product = productRepository.create({
        vendorId,
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        slug: slugify(productData.name, { lower: true, strict: true }),
        status: productData.status || 'draft',
        categoryId: category?.id,
        weight: productData.shipping?.weight,
        dimensions: productData.shipping?.dimensions,
        requiresShipping: productData.shipping?.requiresShipping || true,
        images: productData.images?.map((img: any) => img.url || img),
        featuredImage: productData.images?.[0]?.url || productData.images?.[0]
      });

      const savedProduct = await productRepository.save(product);

      // Images are already saved in the product entity

      // 태그 추가 (구현 필요)

      res.status(201).json({
        message: 'Product created successfully',
        product: savedProduct
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // 상품 수정
  async updateProduct(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { id } = req.params;
      const updateData = req.body;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productRepository = AppDataSource.getRepository(Product);
      const product = await productRepository.findOne({
        where: { id, vendorId },
        relations: ['inventory', 'seo', 'shipping']
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // 기본 정보 업데이트
      if (updateData.name) product.name = updateData.name;
      if (updateData.description) product.description = updateData.description;
      if (updateData.sku) product.sku = updateData.sku;
      // TODO: Add price fields to Product entity
      // if (updateData.price !== undefined) product.price = updateData.price;
      // if (updateData.compareAtPrice !== undefined) product.compareAtPrice = updateData.compareAtPrice;
      // if (updateData.cost !== undefined) product.cost = updateData.cost;
      if (updateData.status) product.status = updateData.status;

      // TODO: Add inventory management to Product entity
      // if (updateData.inventory) { ... }

      // SEO fields
      if (updateData.seo) {
        if (updateData.seo.title) product.metaTitle = updateData.seo.title;
        if (updateData.seo.description) product.metaDescription = updateData.seo.description;
      }

      // Shipping fields
      if (updateData.shipping) {
        if (updateData.shipping.weight !== undefined) product.weight = updateData.shipping.weight;
        if (updateData.shipping.dimensions) product.dimensions = updateData.shipping.dimensions;
        if (updateData.shipping.requiresShipping !== undefined) product.requiresShipping = updateData.shipping.requiresShipping;
      }

      const updatedProduct = await productRepository.save(product);

      res.json({
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // 상품 삭제
  async deleteProduct(req: AuthRequest, res: Response) {
    try {
      const vendorId = req.user?.id;
      const { id } = req.params;

      if (!vendorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productRepository = AppDataSource.getRepository(Product);
      const product = await productRepository.findOne({
        where: { id, vendorId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      await productRepository.softRemove(product);

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  // 상품별 판매 통계 조회 (내부 메서드)
  private async getProductSalesStats(productIds: string[]) {
    if (productIds.length === 0) return [];

    try {
      const result = await AppDataSource
        .createQueryBuilder()
        .select('item.productId', 'productId')
        .addSelect('SUM(item.quantity)', 'totalSales')
        .from('order_items', 'item')
        .innerJoin('orders', 'order', 'order.id = item.orderId')
        .where('item.productId IN (:...productIds)', { productIds })
        .andWhere('order.status = :status', { status: 'completed' })
        .groupBy('item.productId')
        .getRawMany();

      return result.map((r: any) => ({
        productId: r.productId,
        totalSales: parseInt(r.totalSales)
      }));
    } catch (error) {
      console.error('Error fetching product sales stats:', error);
      return [];
    }
  }

  // 카테고리 목록 조회
  async getCategories(req: Request, res: Response) {
    try {
      const categoryRepository = AppDataSource.getRepository(Category);
      const categories = await categoryRepository.find({
        order: { name: 'ASC' }
      });

      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
}