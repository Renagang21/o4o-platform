import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { Product } from '../entities/Product';
import { ProductAttribute } from '../entities/ProductAttribute';
import { ProductAttributeValue } from '../entities/ProductAttributeValue';
import { ProductVariation } from '../entities/ProductVariation';
import { AuthRequest } from '../types/auth';

export class ProductVariationController {
  private productRepository = AppDataSource.getRepository(Product);
  private attributeRepository = AppDataSource.getRepository(ProductAttribute);
  private attributeValueRepository = AppDataSource.getRepository(ProductAttributeValue);
  private variationRepository = AppDataSource.getRepository(ProductVariation);

  /**
   * 상품 속성 추가
   */
  addProductAttribute = async (req: AuthRequest, res: Response) => {
    try {
      const { productId } = req.params;
      const { name, type = 'select', values, variation = true } = req.body;

      // 상품 확인
      const product = await this.productRepository.findOne({
        where: { id: productId }
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: '상품을 찾을 수 없습니다'
        });
      }

      // 속성 생성
      const attribute = this.attributeRepository.create({
        productId,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        type,
        variation,
        position: 0
      });

      const savedAttribute = await this.attributeRepository.save(attribute);

      // 속성 값 생성
      if (values && Array.isArray(values)) {
        const attributeValues = values.map((value, index) => 
          this.attributeValueRepository.create({
            attributeId: savedAttribute.id,
            value: value.value || value,
            slug: (value.value || value).toLowerCase().replace(/\s+/g, '-'),
            label: value.label,
            colorCode: value.colorCode,
            imageUrl: value.imageUrl,
            position: index,
            metadata: value.metadata
          })
        );

        await this.attributeValueRepository.save(attributeValues);
        savedAttribute.values = attributeValues;
      }

      // 상품의 hasVariations 플래그 업데이트
      if (variation && !product.hasVariations) {
        product.hasVariations = true;
        await this.productRepository.save(product);
      }

      res.status(201).json({
        success: true,
        data: savedAttribute
      });
    } catch (error) {
      console.error('Error adding product attribute:', error);
      res.status(500).json({
        success: false,
        error: '속성 추가 실패'
      });
    }
  };

  /**
   * 상품 변형 생성
   */
  createProductVariation = async (req: AuthRequest, res: Response) => {
    try {
      const { productId } = req.params;
      const { variations } = req.body;

      // 상품과 속성 조회
      const product = await this.productRepository.findOne({
        where: { id: productId },
        relations: ['attributes', 'attributes.values']
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: '상품을 찾을 수 없습니다'
        });
      }

      const createdVariations = [];

      for (const varData of variations) {
        const {
          attributes,
          sku,
          price,
          stock = 0,
          images,
          weight,
          dimensions
        } = varData;

        // 속성 조합 문자열 생성
        const attributeString = Object.values(attributes)
          .map((attr: any) => attr.value)
          .join(' / ');

        // SKU 생성 (제공되지 않은 경우)
        const variationSku = sku || `${product.sku}-${Object.values(attributes)
          .map((attr: any) => attr.slug || attr.value.toLowerCase())
          .join('-')}`;

        // 변형 생성
        const variation = this.variationRepository.create({
          productId,
          sku: variationSku,
          attributes,
          attributeString,
          retailPrice: price?.retail || product.retailPrice,
          salePrice: price?.sale,
          wholesalePrice: price?.wholesale || product.wholesalePrice,
          affiliatePrice: price?.affiliate || product.affiliatePrice,
          stockQuantity: stock,
          stockStatus: stock > 0 ? 'in_stock' : 'out_of_stock',
          manageStock: true,
          images,
          imageUrl: images?.[0]?.url,
          weight,
          dimensions,
          status: 'active',
          enabled: true
        });

        const savedVariation = await this.variationRepository.save(variation);
        createdVariations.push(savedVariation);
      }

      // 상품의 hasVariations 플래그 업데이트
      if (!product.hasVariations) {
        product.hasVariations = true;
        await this.productRepository.save(product);
      }

      res.status(201).json({
        success: true,
        data: createdVariations,
        message: `${createdVariations.length}개의 변형이 생성되었습니다`
      });
    } catch (error) {
      console.error('Error creating product variations:', error);
      res.status(500).json({
        success: false,
        error: '변형 생성 실패'
      });
    }
  };

  /**
   * 변형 자동 생성 (모든 속성 조합)
   */
  generateVariations = async (req: AuthRequest, res: Response) => {
    try {
      const { productId } = req.params;
      const { priceAdjustments = {}, stockDefault = 0 } = req.body;

      // 상품과 변형용 속성 조회
      const product = await this.productRepository.findOne({
        where: { id: productId },
        relations: ['attributes', 'attributes.values']
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: '상품을 찾을 수 없습니다'
        });
      }

      // 변형용 속성만 필터링
      const variationAttributes = product.attributes.filter(attr => attr.variation);

      if (variationAttributes.length === 0) {
        return res.status(400).json({
          success: false,
          error: '변형용 속성이 없습니다'
        });
      }

      // 모든 속성 조합 생성
      const combinations = this.generateAttributeCombinations(variationAttributes);
      const createdVariations = [];

      for (const combination of combinations) {
        // 이미 존재하는 변형인지 확인
        const existingVariation = await this.variationRepository.findOne({
          where: {
            productId,
            attributeString: combination.attributeString
          }
        });

        if (existingVariation) {
          continue;
        }

        // SKU 생성
        const sku = `${product.sku}-${combination.slugs.join('-')}`;

        // 가격 조정 계산
        let priceAdjustment = 0;
        for (const [attrSlug, valueSlug] of Object.entries(combination.slugMap)) {
          if (priceAdjustments[attrSlug]?.[valueSlug]) {
            priceAdjustment += priceAdjustments[attrSlug][valueSlug];
          }
        }

        // 변형 생성
        const variation = this.variationRepository.create({
          productId,
          sku,
          attributes: combination.attributes,
          attributeString: combination.attributeString,
          retailPrice: product.retailPrice + priceAdjustment,
          salePrice: product.salePrice ? product.salePrice + priceAdjustment : null,
          wholesalePrice: product.wholesalePrice ? product.wholesalePrice + priceAdjustment : null,
          affiliatePrice: product.affiliatePrice ? product.affiliatePrice + priceAdjustment : null,
          stockQuantity: stockDefault,
          stockStatus: stockDefault > 0 ? 'in_stock' : 'out_of_stock',
          manageStock: true,
          status: 'active',
          enabled: true
        });

        const savedVariation = await this.variationRepository.save(variation);
        createdVariations.push(savedVariation);
      }

      // 상품의 hasVariations 플래그 업데이트
      if (createdVariations.length > 0 && !product.hasVariations) {
        product.hasVariations = true;
        await this.productRepository.save(product);
      }

      res.json({
        success: true,
        data: createdVariations,
        message: `${createdVariations.length}개의 변형이 자동 생성되었습니다`
      });
    } catch (error) {
      console.error('Error generating variations:', error);
      res.status(500).json({
        success: false,
        error: '변형 자동 생성 실패'
      });
    }
  };

  /**
   * 속성 조합 생성 헬퍼
   */
  private generateAttributeCombinations(attributes: ProductAttribute[]): any[] {
    if (attributes.length === 0) return [];

    const combinations: any[] = [];
    
    const generate = (index: number, current: any) => {
      if (index === attributes.length) {
        const attributeString = Object.values(current.attributes)
          .map((attr: any) => attr.value)
          .join(' / ');
        
        const slugs = Object.values(current.attributes)
          .map((attr: any) => attr.slug);
        
        const slugMap: any = {};
        for (const [key, value] of Object.entries(current.attributes)) {
          slugMap[key] = (value as any).slug;
        }
        
        combinations.push({
          attributes: { ...current.attributes },
          attributeString,
          slugs,
          slugMap
        });
        return;
      }

      const attr = attributes[index];
      for (const value of attr.values) {
        current.attributes[attr.slug] = {
          name: attr.name,
          value: value.value,
          slug: value.slug
        };
        generate(index + 1, current);
      }
    };

    generate(0, { attributes: {} });
    return combinations;
  }

  /**
   * 상품 변형 목록 조회
   */
  getProductVariations = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      const variations = await this.variationRepository.find({
        where: { productId },
        order: { position: 'ASC', createdAt: 'ASC' }
      });

      res.json({
        success: true,
        data: variations
      });
    } catch (error) {
      console.error('Error fetching variations:', error);
      res.status(500).json({
        success: false,
        error: '변형 조회 실패'
      });
    }
  };

  /**
   * 변형 재고 업데이트
   */
  updateVariationStock = async (req: AuthRequest, res: Response) => {
    try {
      const { variationId } = req.params;
      const { quantity, operation = 'set' } = req.body;

      const variation = await this.variationRepository.findOne({
        where: { id: variationId }
      });

      if (!variation) {
        return res.status(404).json({
          success: false,
          error: '변형을 찾을 수 없습니다'
        });
      }

      let newQuantity = quantity;
      
      switch (operation) {
        case 'increase':
          newQuantity = variation.stockQuantity + quantity;
          break;
        case 'decrease':
          newQuantity = Math.max(0, variation.stockQuantity - quantity);
          break;
        case 'set':
        default:
          newQuantity = quantity;
      }

      variation.stockQuantity = newQuantity;
      variation.stockStatus = newQuantity > 0 ? 'in_stock' : 'out_of_stock';

      await this.variationRepository.save(variation);

      res.json({
        success: true,
        data: {
          id: variation.id,
          sku: variation.sku,
          previousQuantity: variation.stockQuantity,
          newQuantity,
          stockStatus: variation.stockStatus
        }
      });
    } catch (error) {
      console.error('Error updating variation stock:', error);
      res.status(500).json({
        success: false,
        error: '재고 업데이트 실패'
      });
    }
  };

  /**
   * 변형 가격 일괄 업데이트
   */
  bulkUpdateVariationPrices = async (req: AuthRequest, res: Response) => {
    try {
      const { productId } = req.params;
      const { adjustment, type = 'percentage' } = req.body; // type: 'percentage' | 'fixed'

      const variations = await this.variationRepository.find({
        where: { productId }
      });

      for (const variation of variations) {
        if (type === 'percentage') {
          variation.retailPrice = variation.retailPrice * (1 + adjustment / 100);
          if (variation.salePrice) {
            variation.salePrice = variation.salePrice * (1 + adjustment / 100);
          }
          if (variation.wholesalePrice) {
            variation.wholesalePrice = variation.wholesalePrice * (1 + adjustment / 100);
          }
          if (variation.affiliatePrice) {
            variation.affiliatePrice = variation.affiliatePrice * (1 + adjustment / 100);
          }
        } else {
          variation.retailPrice += adjustment;
          if (variation.salePrice) {
            variation.salePrice += adjustment;
          }
          if (variation.wholesalePrice) {
            variation.wholesalePrice += adjustment;
          }
          if (variation.affiliatePrice) {
            variation.affiliatePrice += adjustment;
          }
        }
      }

      await this.variationRepository.save(variations);

      res.json({
        success: true,
        message: `${variations.length}개 변형의 가격이 업데이트되었습니다`,
        data: variations.map(v => ({
          id: v.id,
          sku: v.sku,
          retailPrice: v.retailPrice
        }))
      });
    } catch (error) {
      console.error('Error bulk updating prices:', error);
      res.status(500).json({
        success: false,
        error: '가격 일괄 업데이트 실패'
      });
    }
  };
}