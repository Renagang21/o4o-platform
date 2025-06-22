import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { Product, ProductStatus } from '../entities/Product';
import { Category } from '../entities/Category';
import { Like, In } from 'typeorm';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    businessType?: string;
  };
}

export class ProductsController {
  private productRepository = AppDataSource.getRepository(Product);
  private categoryRepository = AppDataSource.getRepository(Category);

  // 상품 목록 조회 (필터링, 페이징, 정렬)
  getProducts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        status = 'active',
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        featured,
        minPrice,
        maxPrice
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      // 쿼리 빌더를 사용한 복잡한 필터링
      const queryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.creator', 'creator')
        .where('product.status = :status', { status });

      // 검색 조건
      if (search) {
        queryBuilder.andWhere(
          '(product.name ILIKE :search OR product.description ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // 카테고리 필터
      if (category) {
        queryBuilder.andWhere('product.categoryId = :category', { category });
      }

      // 가격 범위 필터
      if (minPrice) {
        queryBuilder.andWhere('product.retailPrice >= :minPrice', { minPrice: Number(minPrice) });
      }
      if (maxPrice) {
        queryBuilder.andWhere('product.retailPrice <= :maxPrice', { maxPrice: Number(maxPrice) });
      }

      // 추천 상품 필터
      if (featured !== undefined) {
        queryBuilder.andWhere('product.featured = :featured', { featured: featured === 'true' });
      }

      // 정렬
      queryBuilder.orderBy(`product.${sortBy}`, sortOrder as 'ASC' | 'DESC');

      // 페이징
      queryBuilder.skip(skip).take(Number(limit));

      const [products, totalCount] = await queryBuilder.getManyAndCount();

      // 사용자 역할에 따른 가격 조정
      const userRole = req.user?.role || 'customer';
      const productsWithUserPrice = products.map(product => ({
        ...product,
        price: product.getPriceForUser(userRole),
        // 민감한 정보 제거
        cost: undefined,
        wholesalePrice: userRole === 'business' ? product.wholesalePrice : undefined,
        affiliatePrice: userRole === 'affiliate' ? product.affiliatePrice : undefined,
      }));

      res.json({
        success: true,
        data: {
          products: productsWithUserPrice,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount,
            totalPages: Math.ceil(totalCount / Number(limit)),
            hasNext: skip + Number(limit) < totalCount,
            hasPrev: Number(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products'
      });
    }
  };

  // 상품 상세 조회
  getProduct = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const product = await this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.creator', 'creator')
        .where('product.id = :id', { id })
        .andWhere('product.status IN (:...statuses)', { 
          statuses: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] 
        })
        .getOne();

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // 사용자 역할에 따른 가격 조정
      const userRole = req.user?.role || 'customer';
      const productWithUserPrice = {
        ...product,
        price: product.getPriceForUser(userRole),
        // 민감한 정보 제거
        cost: undefined,
        wholesalePrice: userRole === 'business' ? product.wholesalePrice : undefined,
        affiliatePrice: userRole === 'affiliate' ? product.affiliatePrice : undefined,
      };

      res.json({
        success: true,
        data: productWithUserPrice
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product'
      });
    }
  };

  // 상품 생성 (관리자만)
  createProduct = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const productData = req.body;
      
      // SKU 중복 확인
      const existingProduct = await this.productRepository.findOne({
        where: { sku: productData.sku }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          error: 'SKU already exists'
        });
      }

      const product = this.productRepository.create({
        ...productData,
        createdBy: req.user.id,
        slug: productData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      });

      const savedProduct = await this.productRepository.save(product);

      res.status(201).json({
        success: true,
        data: savedProduct
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create product'
      });
    }
  };

  // 상품 수정 (관리자만)
  updateProduct = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const product = await this.productRepository.findOne({ where: { id } });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // SKU 중복 확인 (자기 자신 제외)
      if (updateData.sku && updateData.sku !== product.sku) {
        const existingProduct = await this.productRepository.findOne({
          where: { sku: updateData.sku }
        });

        if (existingProduct) {
          return res.status(400).json({
            success: false,
            error: 'SKU already exists'
          });
        }
      }

      await this.productRepository.update(id, updateData);
      const updatedProduct = await this.productRepository.findOne({ where: { id } });

      res.json({
        success: true,
        data: updatedProduct
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update product'
      });
    }
  };

  // 상품 삭제 (관리자만)
  deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // 관리자 권한 확인
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const { id } = req.params;
      
      const product = await this.productRepository.findOne({ where: { id } });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // 소프트 삭제 (상태를 inactive로 변경)
      await this.productRepository.update(id, { status: ProductStatus.INACTIVE });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete product'
      });
    }
  };

  // 추천 상품 조회
  getFeaturedProducts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 10 } = req.query;

      const products = await this.productRepository.find({
        where: { 
          featured: true, 
          status: ProductStatus.ACTIVE 
        },
        take: Number(limit),
        order: { createdAt: 'DESC' }
      });

      // 사용자 역할에 따른 가격 조정
      const userRole = req.user?.role || 'customer';
      const productsWithUserPrice = products.map(product => ({
        ...product,
        price: product.getPriceForUser(userRole),
        cost: undefined,
        wholesalePrice: undefined,
        affiliatePrice: undefined,
      }));

      res.json({
        success: true,
        data: productsWithUserPrice
      });
    } catch (error) {
      console.error('Error fetching featured products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch featured products'
      });
    }
  };
}
