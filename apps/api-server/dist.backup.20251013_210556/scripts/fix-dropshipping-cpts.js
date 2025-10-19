"use strict";
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
        active: true
    }
];
async function fixDropshippingCPTs() {
    try {
        logger_1.default.info('Initializing database...');
        await connection_1.AppDataSource.initialize();
        logger_1.default.info('Database connected!');
        const repo = connection_1.AppDataSource.getRepository(CustomPostType_1.CustomPostType);
        // Check and create/update CPTs
        for (const cptData of DROPSHIPPING_CPTS) {
            const existing = await repo.findOne({
                where: { slug: cptData.slug }
            });
            if (!existing) {
                const cpt = repo.create(cptData);
                await repo.save(cpt);
                logger_1.default.info(`Created: ${cptData.name} (${cptData.slug})`);
            }
            else if (!existing.active) {
                existing.active = true;
                await repo.save(existing);
                logger_1.default.info(`Activated: ${cptData.name} (${cptData.slug})`);
            }
            else {
                logger_1.default.info(`Already active: ${cptData.name} (${cptData.slug})`);
            }
        }
        logger_1.default.info('All dropshipping CPTs are ready!');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error('Error fixing dropshipping CPTs:', error);
        process.exit(1);
    }
}
fixDropshippingCPTs();
//# sourceMappingURL=fix-dropshipping-cpts.js.map