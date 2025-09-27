import { CustomPostType } from '../../entities/CustomPostType';
import { AppDataSource } from '../../database/connection';

export const DROPSHIPPING_CPT_DEFINITIONS = [
  {
    name: 'ds_supplier',
    label: '공급자',
    singular_label: '공급자',
    description: '드롭쉬핑 상품 공급자',
    menu_icon: 'dashicons-store',
    menu_position: 25,
    supports: ['title', 'editor', 'custom-fields', 'revisions'],
    public: false,
    show_ui: true,
    show_in_menu: true,
    show_in_rest: true,
    has_archive: false,
    rewrite: { slug: 'ds-supplier' },
    capabilities: {
      edit_post: 'edit_supplier',
      read_post: 'read_supplier',
      delete_post: 'delete_supplier',
      edit_posts: 'edit_suppliers',
      edit_others_posts: 'edit_others_suppliers',
      publish_posts: 'publish_suppliers',
      read_private_posts: 'read_private_suppliers',
    },
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
  },
  {
    name: 'ds_partner',
    label: '파트너',
    singular_label: '파트너',
    description: '드롭쉬핑 제휴 파트너',
    menu_icon: 'dashicons-groups',
    menu_position: 26,
    supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail'],
    public: false,
    show_ui: true,
    show_in_menu: true,
    show_in_rest: true,
    has_archive: false,
    rewrite: { slug: 'ds-partner' },
    capabilities: {
      edit_post: 'edit_partner',
      read_post: 'read_partner',
      delete_post: 'delete_partner',
      edit_posts: 'edit_partners',
      edit_others_posts: 'edit_others_partners',
      publish_posts: 'publish_partners',
      read_private_posts: 'read_private_partners',
    },
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
  },
  {
    name: 'ds_product',
    label: '드롭쉬핑 상품',
    singular_label: '드롭쉬핑 상품',
    description: '드롭쉬핑 플랫폼 상품',
    menu_icon: 'dashicons-cart',
    menu_position: 24,
    supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail', 'excerpt'],
    public: true,
    show_ui: true,
    show_in_menu: true,
    show_in_rest: true,
    has_archive: true,
    rewrite: { slug: 'ds-products' },
    taxonomies: ['ds_product_category', 'ds_product_tag'],
    capabilities: {
      edit_post: 'edit_product',
      read_post: 'read_product',
      delete_post: 'delete_product',
      edit_posts: 'edit_products',
      edit_others_posts: 'edit_others_products',
      publish_posts: 'publish_products',
      read_private_posts: 'read_private_products',
    },
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
  },
  {
    name: 'ds_commission_policy',
    label: '수수료 정책',
    singular_label: '수수료 정책',
    description: '드롭쉬핑 수수료 정책',
    menu_icon: 'dashicons-money-alt',
    menu_position: 27,
    supports: ['title', 'editor', 'custom-fields', 'revisions'],
    public: false,
    show_ui: true,
    show_in_menu: true,
    show_in_rest: true,
    has_archive: false,
    rewrite: { slug: 'ds-commission-policy' },
    capabilities: {
      edit_post: 'edit_commission_policy',
      read_post: 'read_commission_policy',
      delete_post: 'delete_commission_policy',
      edit_posts: 'edit_commission_policies',
      edit_others_posts: 'edit_others_commission_policies',
      publish_posts: 'publish_commission_policies',
      read_private_posts: 'read_private_commission_policies',
    },
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
  },
];

export async function registerDropshippingCPTs() {
  const cptRepository = AppDataSource.getRepository(CustomPostType);
  
  for (const cptDef of DROPSHIPPING_CPT_DEFINITIONS) {
    const existing = await cptRepository.findOne({ where: { slug: cptDef.name } });
    
    if (!existing) {
      const cpt = cptRepository.create({
        slug: cptDef.name,
        name: cptDef.label,
        description: cptDef.description,
        icon: cptDef.menu_icon,
        menuPosition: cptDef.menu_position,
        public: cptDef.public,
        hasArchive: cptDef.has_archive,
        showInMenu: cptDef.show_in_menu,
        supports: cptDef.supports,
        taxonomies: (cptDef as any).taxonomies || [],
        capabilityType: 'post',
        rewrite: cptDef.rewrite,
        labels: cptDef.labels,
        active: true
      });
      
      await cptRepository.save(cpt);
      console.log(`Registered CPT: ${cptDef.name}`);
    } else {
      console.log(`CPT already exists: ${cptDef.name}`);
    }
  }
}