"use strict";
/**
 * Script to initialize Dropshipping CPTs in the database
 * Run this script using ts-node from the api-server directory
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../database/connection");
const CustomPostType_1 = require("../entities/CustomPostType");
const logger_1 = __importDefault(require("../utils/logger"));
const DROPSHIPPING_CPTS = [
    {
        slug: 'ds_supplier',
        name: '공급자',
        description: '드롭쉬핑 상품 공급자',
        icon: 'store',
        menuPosition: 25,
        public: false,
        hasArchive: false,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions'],
        taxonomies: [],
        capabilityType: 'post',
        rewrite: { slug: 'ds-supplier' },
        labels: {
            add_new: '새 공급자 추가',
            add_new_item: '새 공급자 추가',
            edit_item: '공급자 편집',
            new_item: '새 공급자',
            view_item: '공급자 보기',
            search_items: '공급자 검색',
            not_found: '공급자를 찾을 수 없습니다',
            not_found_in_trash: '휴지통에서 공급자를 찾을 수 없습니다',
        },
        active: true
    },
    {
        slug: 'ds_partner',
        name: '파트너',
        description: '드롭쉬핑 제휴 파트너',
        icon: 'groups',
        menuPosition: 26,
        public: false,
        hasArchive: false,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail'],
        taxonomies: [],
        capabilityType: 'post',
        rewrite: { slug: 'ds-partner' },
        labels: {
            add_new: '새 파트너 추가',
            add_new_item: '새 파트너 추가',
            edit_item: '파트너 편집',
            new_item: '새 파트너',
            view_item: '파트너 보기',
            search_items: '파트너 검색',
            not_found: '파트너를 찾을 수 없습니다',
            not_found_in_trash: '휴지통에서 파트너를 찾을 수 없습니다',
        },
        active: true
    },
    {
        slug: 'ds_product',
        name: '드롭쉬핑 상품',
        description: '드롭쉬핑 플랫폼 상품',
        icon: 'cart',
        menuPosition: 24,
        public: true,
        hasArchive: true,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail', 'excerpt'],
        taxonomies: ['ds_product_category', 'ds_product_tag'],
        capabilityType: 'post',
        rewrite: { slug: 'ds-products' },
        labels: {
            add_new: '새 상품 추가',
            add_new_item: '새 상품 추가',
            edit_item: '상품 편집',
            new_item: '새 상품',
            view_item: '상품 보기',
            search_items: '상품 검색',
            not_found: '상품을 찾을 수 없습니다',
            not_found_in_trash: '휴지통에서 상품을 찾을 수 없습니다',
        },
        active: true
    },
    {
        slug: 'ds_commission_policy',
        name: '수수료 정책',
        description: '드롭쉬핑 수수료 정책',
        icon: 'money-alt',
        menuPosition: 27,
        public: false,
        hasArchive: false,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions'],
        taxonomies: [],
        capabilityType: 'post',
        rewrite: { slug: 'ds-commission-policy' },
        labels: {
            add_new: '새 정책 추가',
            add_new_item: '새 수수료 정책 추가',
            edit_item: '수수료 정책 편집',
            new_item: '새 수수료 정책',
            view_item: '수수료 정책 보기',
            search_items: '수수료 정책 검색',
            not_found: '수수료 정책을 찾을 수 없습니다',
            not_found_in_trash: '휴지통에서 수수료 정책을 찾을 수 없습니다',
        },
        active: true
    }
];
async function initializeDropshippingCPTs() {
    try {
        logger_1.default.info('🔌 Initializing database connection...');
        await connection_1.AppDataSource.initialize();
        logger_1.default.info('✅ Database connected!');
        const cptRepository = connection_1.AppDataSource.getRepository(CustomPostType_1.CustomPostType);
        // Check existing CPTs
        logger_1.default.info('📊 Checking existing Dropshipping CPTs...');
        const existingCPTs = await cptRepository
            .createQueryBuilder('cpt')
            .where('cpt.slug LIKE :pattern', { pattern: 'ds_%' })
            .getMany();
        logger_1.default.info(`Found ${existingCPTs.length} existing dropshipping CPTs`);
        if (existingCPTs.length > 0) {
            logger_1.default.info('Existing CPTs:');
            existingCPTs.forEach(cpt => {
                logger_1.default.info(`  - ${cpt.name} (${cpt.slug}) - Active: ${cpt.active}`);
            });
            // Update inactive CPTs
            const inactiveCPTs = existingCPTs.filter(cpt => !cpt.active);
            if (inactiveCPTs.length > 0) {
                logger_1.default.info(`⚠️  Found ${inactiveCPTs.length} inactive CPTs. Activating them...`);
                for (const cpt of inactiveCPTs) {
                    cpt.active = true;
                    await cptRepository.save(cpt);
                    logger_1.default.info(`  ✅ Activated: ${cpt.name}`);
                }
            }
        }
        // Create missing CPTs
        let createdCount = 0;
        for (const cptData of DROPSHIPPING_CPTS) {
            const existing = await cptRepository.findOne({
                where: { slug: cptData.slug }
            });
            if (!existing) {
                const cpt = cptRepository.create(cptData);
                await cptRepository.save(cpt);
                logger_1.default.info(`✅ Created CPT: ${cptData.name} (${cptData.slug})`);
                createdCount++;
            }
            else if (!existing.active) {
                // Make sure it's active
                existing.active = true;
                await cptRepository.save(existing);
                logger_1.default.info(`✅ Activated existing CPT: ${cptData.name} (${cptData.slug})`);
            }
            else {
                logger_1.default.info(`ℹ️  CPT already exists and is active: ${cptData.name} (${cptData.slug})`);
            }
        }
        if (createdCount > 0) {
            logger_1.default.info(`✅ Created ${createdCount} new CPTs`);
        }
        // Final status check
        logger_1.default.info('📊 Final status of all CPTs:');
        const allCPTs = await cptRepository.find({
            order: { createdAt: 'DESC' }
        });
        logger_1.default.info(`Total CPTs: ${allCPTs.length}`);
        logger_1.default.info(`Active CPTs: ${allCPTs.filter(c => c.active).length}`);
        logger_1.default.info(`Dropshipping CPTs: ${allCPTs.filter(c => c.slug.startsWith('ds_')).length}`);
        logger_1.default.info(`Active Dropshipping CPTs: ${allCPTs.filter(c => c.slug.startsWith('ds_') && c.active).length}`);
        logger_1.default.info('✨ Dropshipping CPTs initialization completed!');
    }
    catch (error) {
        logger_1.default.error('❌ Error:', error);
    }
    finally {
        if (connection_1.AppDataSource.isInitialized) {
            await connection_1.AppDataSource.destroy();
        }
    }
}
// Run the initialization
initializeDropshippingCPTs();
//# sourceMappingURL=init-dropshipping-cpts.js.map