import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Product } from '../../entities/Product';
import { ProductImage } from '../../entities/ProductImage';
import { Category } from '../../entities/Category';
import { Like, In } from 'typeorm';
import slugify from 'slugify';

export class VendorProductController {
  // 벤더의 상품 목록 조회
  async getProducts(req: Request, res: Response) {
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
      const productIds = products.map(p => p.id);
      const salesStats = await this.getProductSalesStats(productIds);

      const formattedProducts = products.map(product => {
        const stats = salesStats.find(s => s.productId === product.id);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category?.name || 'Uncategorized',
          price: product.price,
          stock: product.inventory?.quantity || 0,
          status: product.inventory?.stockStatus || 'out_of_stock',
          image: product.images?.[0]?.url || '/api/placeholder/100/100',
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
  async getProduct(req: Request, res: Response) {
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
  async createProduct(req: Request, res: Response) {
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
        price: productData.price,
        compareAtPrice: productData.compareAtPrice,
        cost: productData.cost,
        status: productData.status || 'draft',
        category,
        inventory: {
          quantity: productData.inventory?.quantity || 0,
          stockStatus: productData.inventory?.stockStatus || 'in_stock',
          trackQuantity: productData.inventory?.trackQuantity !== false
        },
        seo: productData.seo ? {
          title: productData.seo.title || productData.name,
          description: productData.seo.description || productData.description,
          keywords: productData.seo.keywords
        } : undefined,
        shipping: productData.shipping ? {
          weight: productData.shipping.weight,
          dimensions: productData.shipping.dimensions,
          requiresShipping: true
        } : undefined
      });

      const savedProduct = await productRepository.save(product);

      // 이미지 추가
      if (productData.images && productData.images.length > 0) {
        const imageRepository = AppDataSource.getRepository(ProductImage);
        const images = productData.images.map((img: any, index: number) => 
          imageRepository.create({
            productId: savedProduct.id,
            url: img.url,
            alt: img.alt || savedProduct.name,
            position: img.position || index
          })
        );
        await imageRepository.save(images);
      }

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
  async updateProduct(req: Request, res: Response) {
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
      if (updateData.price !== undefined) product.price = updateData.price;
      if (updateData.compareAtPrice !== undefined) product.compareAtPrice = updateData.compareAtPrice;
      if (updateData.cost !== undefined) product.cost = updateData.cost;
      if (updateData.status) product.status = updateData.status;

      // 재고 정보 업데이트
      if (updateData.inventory) {
        if (!product.inventory) {
          product.inventory = {} as any;
        }
        Object.assign(product.inventory, updateData.inventory);
      }

      // SEO 정보 업데이트
      if (updateData.seo) {
        if (!product.seo) {
          product.seo = {} as any;
        }
        Object.assign(product.seo, updateData.seo);
      }

      // 배송 정보 업데이트
      if (updateData.shipping) {
        if (!product.shipping) {
          product.shipping = {} as any;
        }
        Object.assign(product.shipping, updateData.shipping);
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
  async deleteProduct(req: Request, res: Response) {
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

      return result.map(r => ({
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