import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection.js';
import { CustomPostType } from '../entities/CustomPostType.js';
import { CustomPost, PostStatus } from '../entities/CustomPost.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField.js';
import { User } from '../entities/User.js';
import { UserRole } from '../types/auth.js';
import logger from '../utils/logger.js';

export class MigrationController {
  // Initialize CPTs and ACF fields for dropshipping
  async initializeDropshippingSystem(req: Request, res: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const postTypeRepo = queryRunner.manager.getRepository(CustomPostType);
      const fieldGroupRepo = queryRunner.manager.getRepository(FieldGroup);
      const customFieldRepo = queryRunner.manager.getRepository(CustomField);

      // 1. Create CPTs
      const cptDefinitions = [
        {
          slug: 'ds_supplier',
          name: '공급자',
          description: '드롭쉬핑 상품 공급자',
          icon: 'store',
          public: false,
          hasArchive: false,
          showInMenu: true,
          supports: ['title', 'editor', 'custom-fields', 'revisions'],
          menuPosition: 25
        },
        {
          slug: 'ds_partner',
          name: '파트너',
          description: '드롭쉬핑 제휴 파트너',
          icon: 'groups',
          public: false,
          hasArchive: false,
          showInMenu: true,
          supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail'],
          menuPosition: 26
        },
        {
          slug: 'ds_product',
          name: '드롭쉬핑 상품',
          description: '드롭쉬핑 플랫폼 상품',
          icon: 'cart',
          public: true,
          hasArchive: true,
          showInMenu: true,
          supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail', 'excerpt'],
          menuPosition: 24
        },
        {
          slug: 'ds_commission_policy',
          name: '수수료 정책',
          description: '드롭쉬핑 수수료 정책',
          icon: 'money-alt',
          public: false,
          hasArchive: false,
          showInMenu: true,
          supports: ['title', 'editor', 'custom-fields', 'revisions'],
          menuPosition: 27
        }
      ];

      // Default organization ID for legacy migration
      const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

      for (const cptDef of cptDefinitions) {
        let postType = await postTypeRepo.findOne({ where: { slug: cptDef.slug } });

        if (!postType) {
          postType = postTypeRepo.create({
            organizationId: DEFAULT_ORG_ID,
            slug: cptDef.slug,
            name: cptDef.name,
            singularLabel: cptDef.name,
            pluralLabel: cptDef.name + 's',
            description: cptDef.description,
            icon: cptDef.icon,
            isPublic: cptDef.public,
            hasArchive: cptDef.hasArchive,
            supports: cptDef.supports,
            isActive: true,
            rewriteRules: { slug: cptDef.slug.replace('_', '-') },
            metadata: { menuPosition: cptDef.menuPosition },
            capabilities: { type: 'post' }
          });

          await postTypeRepo.save(postType);
          logger.info(`Created CPT: ${cptDef.slug}`);
        }
      }

      // 2. Create ACF Field Groups
      const fieldGroups = [
        {
          title: '가격 정보',
          location: [{ param: 'post_type', operator: '==', value: 'ds_product' }],
          placement: 'side',
          fields: [
            { name: 'cost_price', label: '공급가', type: 'number', required: true },
            { name: 'selling_price', label: '판매가', type: 'number', required: true },
            { name: 'margin_rate', label: '마진율 (%)', type: 'text' },
            { name: 'can_modify_price', label: '가격 수정 가능', type: 'toggle' }
          ]
        },
        {
          title: '공급자 정보',
          location: [{ param: 'post_type', operator: '==', value: 'ds_supplier' }],
          placement: 'normal',
          fields: [
            { name: 'supplier_email', label: '이메일', type: 'email', required: true },
            { name: 'supplier_phone', label: '연락처', type: 'text' },
            { name: 'supplier_business_number', label: '사업자등록번호', type: 'text' },
            { name: 'supplier_api_key', label: 'API Key', type: 'text' },
            { name: 'supplier_api_endpoint', label: 'API Endpoint', type: 'url' }
          ]
        },
        {
          title: '파트너 정보',
          location: [{ param: 'post_type', operator: '==', value: 'ds_partner' }],
          placement: 'normal',
          fields: [
            { name: 'partner_type', label: '파트너 유형', type: 'select' },
            { name: 'partner_grade', label: '파트너 등급', type: 'select' },
            { name: 'partner_referral_code', label: '추천 코드', type: 'text' },
            { name: 'partner_commission_rate', label: '기본 수수료율 (%)', type: 'number' }
          ]
        }
      ];

      for (const groupDef of fieldGroups) {
        let fieldGroup = await fieldGroupRepo.findOne({ where: { title: groupDef.title } });
        
        if (!fieldGroup) {
          fieldGroup = fieldGroupRepo.create({
            title: groupDef.title,
            description: `Dropshipping field group for ${groupDef.title}`,
            location: groupDef.location as any,
            placement: groupDef.placement as any,
            active: true,
            order: 0
          });
          
          await fieldGroupRepo.save(fieldGroup);
          logger.info(`Created field group: ${groupDef.title}`);

          // Create fields
          for (let i = 0; i < groupDef.fields.length; i++) {
            const fieldDef = groupDef.fields[i];
            const field = customFieldRepo.create({
              name: fieldDef.name,
              label: fieldDef.label,
              type: fieldDef.type as any,
              groupId: fieldGroup.id,
              required: fieldDef.required || false,
              order: i
            });
            
            await customFieldRepo.save(field);
            logger.info(`Created field: ${fieldDef.name}`);
          }
        }
      }

      await queryRunner.commitTransaction();
      
      res.json({
        success: true,
        message: 'Dropshipping system initialized successfully'
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error initializing dropshipping system:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize dropshipping system',
        error: (error as Error).message
      });
    } finally {
      await queryRunner.release();
    }
  }

  // Create sample data for testing
  async createSampleData(req: Request, res: Response) {
    try {
      const postTypeRepo = AppDataSource.getRepository(CustomPostType);
      const customPostRepo = AppDataSource.getRepository(CustomPost);
      const fieldValueRepo = AppDataSource.getRepository(CustomFieldValue);
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
      const userRepo = AppDataSource.getRepository(User);

      // Get first admin user
      // role column removed - find any active admin user
      const adminUser = await userRepo.findOne({ where: { isActive: true } });
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'No admin user found'
        });
      }

      // Get CPTs
      const supplierType = await postTypeRepo.findOne({ where: { slug: 'ds_supplier' } });
      const partnerType = await postTypeRepo.findOne({ where: { slug: 'ds_partner' } });
      const productType = await postTypeRepo.findOne({ where: { slug: 'ds_product' } });

      if (!supplierType || !partnerType || !productType) {
        return res.status(400).json({
          success: false,
          message: 'CPTs not found. Run initialization first.'
        });
      }

      // Create sample suppliers
      const suppliers = [
        { title: '삼성전자', email: 'contact@samsung.com', phone: '02-2053-3000', businessNumber: '124-81-00998' },
        { title: 'LG전자', email: 'contact@lg.com', phone: '02-3777-1114', businessNumber: '107-86-14075' },
        { title: '쿠팡', email: 'support@coupang.com', phone: '1577-7011', businessNumber: '120-88-00767' }
      ];

      const createdSuppliers = [];
      for (const supplierData of suppliers) {
        const supplier = customPostRepo.create({
          postTypeSlug: 'ds_supplier',
          title: supplierData.title,
          content: `${supplierData.title}는 신뢰할 수 있는 공급업체입니다.`,
          status: PostStatus.PUBLISHED,
          authorId: adminUser.id,
          slug: supplierData.title.toLowerCase().replace(/\s+/g, '-')
        });
        
        const savedSupplier = await customPostRepo.save(supplier);
        createdSuppliers.push(savedSupplier);

        // Add ACF fields
        const supplierFieldGroup = await fieldGroupRepo.findOne({
          where: { title: '공급자 정보' },
          relations: ['fields']
        });

        if (supplierFieldGroup) {
          const fieldsToSave = {
            supplier_email: supplierData.email,
            supplier_phone: supplierData.phone,
            supplier_business_number: supplierData.businessNumber
          };

          for (const [fieldName, value] of Object.entries(fieldsToSave)) {
            const field = supplierFieldGroup.fields.find(f => f.name === fieldName);
            if (field) {
              await fieldValueRepo.save({
                fieldId: field.id,
                entityId: savedSupplier.id,
                entityType: 'ds_supplier',
                value: value
              });
            }
          }
        }
      }

      // Create sample partners
      const partners = [
        { title: '김철수', type: 'individual', grade: 'silver', rate: 10 },
        { title: '이영희', type: 'individual', grade: 'gold', rate: 15 },
        { title: '박민수', type: 'business', grade: 'platinum', rate: 20 }
      ];

      const createdPartners = [];
      for (const partnerData of partners) {
        const referralCode = 'PTR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const partner = customPostRepo.create({
          postTypeSlug: 'ds_partner',
          title: partnerData.title,
          content: `${partnerData.title} 파트너입니다.`,
          status: PostStatus.PUBLISHED,
          authorId: adminUser.id,
          slug: partnerData.title.toLowerCase().replace(/\s+/g, '-')
        });
        
        const savedPartner = await customPostRepo.save(partner);
        createdPartners.push(savedPartner);

        // Add ACF fields
        const partnerFieldGroup = await fieldGroupRepo.findOne({
          where: { title: '파트너 정보' },
          relations: ['fields']
        });

        if (partnerFieldGroup) {
          const fieldsToSave = {
            partner_type: partnerData.type,
            partner_grade: partnerData.grade,
            partner_referral_code: referralCode,
            partner_commission_rate: partnerData.rate
          };

          for (const [fieldName, value] of Object.entries(fieldsToSave)) {
            const field = partnerFieldGroup.fields.find(f => f.name === fieldName);
            if (field) {
              await fieldValueRepo.save({
                fieldId: field.id,
                entityId: savedPartner.id,
                entityType: 'ds_partner',
                value: value
              });
            }
          }
        }
      }

      // Create sample products
      const products = [
        { title: '갤럭시 S24 Ultra', costPrice: 1200000, sellingPrice: 1500000, sku: 'GAL-S24U' },
        { title: 'LG 그램 17인치', costPrice: 1800000, sellingPrice: 2200000, sku: 'LG-GRAM17' },
        { title: '에어팟 프로 2세대', costPrice: 280000, sellingPrice: 359000, sku: 'APP-AIR2' }
      ];

      const createdProducts = [];
      for (const productData of products) {
        const marginRate = ((productData.sellingPrice - productData.costPrice) / productData.sellingPrice * 100).toFixed(2);
        
        const product = customPostRepo.create({
          postTypeSlug: 'ds_product',
          title: productData.title,
          content: `${productData.title}의 상세 설명입니다.`,
          status: PostStatus.PUBLISHED,
          authorId: adminUser.id,
          slug: productData.title.toLowerCase().replace(/\s+/g, '-'),
          meta: {
            seoDescription: `최고 품질의 ${productData.title}`
          }
        });
        
        const savedProduct = await customPostRepo.save(product);
        createdProducts.push(savedProduct);

        // Add ACF fields
        const productFieldGroup = await fieldGroupRepo.findOne({
          where: { title: '가격 정보' },
          relations: ['fields']
        });

        if (productFieldGroup) {
          const fieldsToSave = {
            cost_price: productData.costPrice,
            selling_price: productData.sellingPrice,
            margin_rate: marginRate,
            can_modify_price: true
          };

          for (const [fieldName, value] of Object.entries(fieldsToSave)) {
            const field = productFieldGroup.fields.find(f => f.name === fieldName);
            if (field) {
              await fieldValueRepo.save({
                fieldId: field.id,
                entityId: savedProduct.id,
                entityType: 'ds_product',
                value: value
              });
            }
          }
        }
      }

      res.json({
        success: true,
        message: 'Sample data created successfully',
        data: {
          suppliers: createdSuppliers.length,
          partners: createdPartners.length,
          products: createdProducts.length
        }
      });
    } catch (error) {
      console.error('Error creating sample data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create sample data',
        error: (error as Error).message
      });
    }
  }

  // Verify system status
  async verifySystemStatus(req: Request, res: Response) {
    try {
      const postTypeRepo = AppDataSource.getRepository(CustomPostType);
      const customPostRepo = AppDataSource.getRepository(CustomPost);
      const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);

      // Check CPTs
      const supplierType = await postTypeRepo.findOne({ where: { slug: 'ds_supplier' } });
      const partnerType = await postTypeRepo.findOne({ where: { slug: 'ds_partner' } });
      const productType = await postTypeRepo.findOne({ where: { slug: 'ds_product' } });
      const commissionType = await postTypeRepo.findOne({ where: { slug: 'ds_commission_policy' } });

      // Count records
      const supplierCount = await customPostRepo.count({ where: { postTypeSlug: 'ds_supplier' } });
      const partnerCount = await customPostRepo.count({ where: { postTypeSlug: 'ds_partner' } });
      const productCount = await customPostRepo.count({ where: { postTypeSlug: 'ds_product' } });
      const commissionCount = await customPostRepo.count({ where: { postTypeSlug: 'ds_commission_policy' } });

      // Check field groups
      const fieldGroups = await fieldGroupRepo.find();

      res.json({
        success: true,
        status: {
          cpts: {
            ds_supplier: supplierType ? 'installed' : 'missing',
            ds_partner: partnerType ? 'installed' : 'missing',
            ds_product: productType ? 'installed' : 'missing',
            ds_commission_policy: commissionType ? 'installed' : 'missing'
          },
          records: {
            suppliers: supplierCount,
            partners: partnerCount,
            products: productCount,
            commissions: commissionCount
          },
          fieldGroups: fieldGroups.length,
          systemReady: !!(supplierType && partnerType && productType && commissionType && fieldGroups.length > 0)
        }
      });
    } catch (error) {
      console.error('Error verifying system status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify system status',
        error: (error as Error).message
      });
    }
  }
}