import { AppDataSource } from '../database/connection';
import { CustomPostType } from '../entities/CustomPostType';

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
    console.log('Initializing database...');
    await AppDataSource.initialize();
    console.log('Database connected!');
    
    const repo = AppDataSource.getRepository(CustomPostType);
    
    // Check and create/update CPTs
    for (const cptData of DROPSHIPPING_CPTS) {
      const existing = await repo.findOne({ 
        where: { slug: cptData.slug } 
      });
      
      if (!existing) {
        const cpt = repo.create(cptData);
        await repo.save(cpt);
        console.log(`Created: ${cptData.name} (${cptData.slug})`);
      } else if (!existing.active) {
        existing.active = true;
        await repo.save(existing);
        console.log(`Activated: ${cptData.name} (${cptData.slug})`);
      } else {
        console.log(`Already active: ${cptData.name} (${cptData.slug})`);
      }
    }
    
    console.log('\nAll dropshipping CPTs are ready!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDropshippingCPTs();
