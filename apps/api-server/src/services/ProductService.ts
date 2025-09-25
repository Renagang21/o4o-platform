import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Product, ProductStatus, ProductType } from '../entities/Product';
import { User } from '../entities/User';

export interface CreateProductDto {
  title?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  handle?: string;
  sku: string;
  price?: number;
  retailPrice?: number;
  salePrice?: number;
  cost?: number;
  stockQuantity?: number;
  inventory_quantity?: number;
  weight?: number;
  status?: string;
  categories?: any[];
  tags?: any[];
  images?: string[];
  thumbnail?: string;
  variants?: any[];
  metadata?: any;
}

export interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

export class ProductService {
  private productRepository: Repository<Product>;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
  }

  async createProduct(productData: CreateProductDto, userId: string): Promise<Product> {
    // Generate unique SKU if not provided
    if (!productData.sku) {
      productData.sku = `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Check if SKU already exists
    const existingProduct = await this.productRepository.findOne({
      where: { sku: productData.sku }
    });

    if (existingProduct) {
      throw new Error(`Product with SKU ${productData.sku} already exists`);
    }

    // Generate slug from name/title
    const productName = productData.title || productData.name || 'Untitled Product';
    const slug = productData.handle || this.generateSlug(productName);

    // Map fields to entity structure
    const product = this.productRepository.create({
      name: productName,
      slug,
      description: productData.description || '',
      shortDescription: productData.subtitle || '',
      sku: productData.sku,
      retailPrice: productData.retailPrice || productData.price || 0,
      salePrice: productData.salePrice,
      cost: productData.cost,
      stockQuantity: productData.inventory_quantity || productData.stockQuantity || 0,
      manageStock: true,
      weight: productData.weight,
      status: this.mapStatus(productData.status || 'draft'),
      type: ProductType.PHYSICAL,
      featured: false,
      requiresShipping: true,
      images: productData.images || [],
      featuredImage: productData.thumbnail,
      tags: this.extractTags(productData.tags),
      createdBy: userId,
      metadata: productData.metadata || {}
    });

    const savedProduct = await this.productRepository.save(product);
    return savedProduct;
  }

  async importProducts(products: CreateProductDto[], userId: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      total: products.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < products.length; i++) {
      try {
        await this.createProduct(products[i], userId);
        result.created++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 2, // +2 for header row and 0-index
          message: error.message || 'Unknown error'
        });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  async findById(id: string): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id },
      relations: ['creator', 'attributes']
    });
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    featured?: boolean;
  } = {}): Promise<{ products: Product[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'active',
      featured
    } = options;

    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.creator', 'creator');

    // Filter by status
    if (status && status !== 'all') {
      queryBuilder.andWhere('product.status = :status', { 
        status: this.mapStatus(status) 
      });
    }

    // Filter by featured
    if (featured !== undefined) {
      queryBuilder.andWhere('product.featured = :featured', { featured });
    }

    // Search
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by creation date
    queryBuilder.orderBy('product.createdAt', 'DESC');

    const [products, total] = await queryBuilder.getManyAndCount();

    return { products, total };
  }

  async updateProduct(id: string, updateData: Partial<CreateProductDto>): Promise<Product> {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Update fields
    if (updateData.title || updateData.name) {
      product.name = updateData.title || updateData.name || product.name;
    }
    
    if (updateData.description !== undefined) {
      product.description = updateData.description;
    }

    if (updateData.subtitle !== undefined) {
      product.shortDescription = updateData.subtitle;
    }

    if (updateData.price !== undefined || updateData.retailPrice !== undefined) {
      product.retailPrice = updateData.retailPrice || updateData.price || product.retailPrice;
    }

    if (updateData.salePrice !== undefined) {
      product.salePrice = updateData.salePrice;
    }

    if (updateData.stockQuantity !== undefined || updateData.inventory_quantity !== undefined) {
      product.stockQuantity = updateData.inventory_quantity || updateData.stockQuantity || product.stockQuantity;
    }

    if (updateData.status) {
      product.status = this.mapStatus(updateData.status);
    }

    if (updateData.images) {
      product.images = updateData.images;
    }

    if (updateData.tags) {
      product.tags = this.extractTags(updateData.tags);
    }

    return this.productRepository.save(product);
  }

  async deleteProduct(id: string): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Product not found');
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private mapStatus(status: string): ProductStatus {
    switch (status.toLowerCase()) {
      case 'published':
      case 'active':
        return ProductStatus.ACTIVE;
      case 'inactive':
        return ProductStatus.INACTIVE;
      case 'out_of_stock':
        return ProductStatus.OUT_OF_STOCK;
      default:
        return ProductStatus.DRAFT;
    }
  }

  private extractTags(tags: any): string[] {
    if (!tags) return [];
    
    if (Array.isArray(tags)) {
      return tags.map(tag => typeof tag === 'string' ? tag : tag.value || tag.name || '').filter(Boolean);
    }
    
    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    
    return [];
  }
}