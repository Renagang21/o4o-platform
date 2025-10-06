-- Test Menu Data for Subdomain/Path Filtering
-- Created: 2025-10-06

-- 1. Global Primary Menu (no conditions)
INSERT INTO menus (id, name, slug, location, description, is_active, metadata, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Global Primary Menu', 'global-primary-menu', 'primary',
   'Default global menu for all contexts', true, '{}', NOW(), NOW());

INSERT INTO menu_items (id, menu_id, title, url, type, target, order_num, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111111', 'Home', '/', 'custom', '_self', 1, NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'About', '/about', 'custom', '_self', 2, NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111111', 'Contact', '/contact', 'custom', '_self', 3, NOW(), NOW());

-- 2. Shop Primary Menu (subdomain: "shop")
INSERT INTO menus (id, name, slug, location, description, is_active, metadata, created_at, updated_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Shop Primary Menu', 'shop-primary-menu', 'primary',
   'Menu for shop subdomain', true, '{"subdomain": "shop"}', NOW(), NOW());

INSERT INTO menu_items (id, menu_id, title, url, type, target, order_num, created_at, updated_at)
VALUES
  ('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222222', 'Shop Home', '/', 'custom', '_self', 1, NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222222', 'Products', '/products', 'custom', '_self', 2, NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222203', '22222222-2222-2222-2222-222222222222', 'Cart', '/cart', 'custom', '_self', 3, NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222204', '22222222-2222-2222-2222-222222222222', 'My Orders', '/orders', 'custom', '_self', 4, NOW(), NOW());

-- 3. Forum Primary Menu (subdomain: "forum")
INSERT INTO menus (id, name, slug, location, description, is_active, metadata, created_at, updated_at)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Forum Primary Menu', 'forum-primary-menu', 'primary',
   'Menu for forum subdomain', true, '{"subdomain": "forum"}', NOW(), NOW());

INSERT INTO menu_items (id, menu_id, title, url, type, target, order_num, created_at, updated_at)
VALUES
  ('33333333-3333-3333-3333-333333333301', '33333333-3333-3333-3333-333333333333', 'Forum Home', '/', 'custom', '_self', 1, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333302', '33333333-3333-3333-3333-333333333333', 'Topics', '/topics', 'custom', '_self', 2, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333303', '33333333-3333-3333-3333-333333333333', 'Members', '/members', 'custom', '_self', 3, NOW(), NOW());

-- 4. Seller1 Menu (subdomain: "shop", path_prefix: "/seller1")
INSERT INTO menus (id, name, slug, location, description, is_active, metadata, created_at, updated_at)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Seller1 Menu', 'seller1-menu', 'primary',
   'Menu for seller1 shop', true, '{"subdomain": "shop", "path_prefix": "/seller1"}', NOW(), NOW());

INSERT INTO menu_items (id, menu_id, title, url, type, target, order_num, created_at, updated_at)
VALUES
  ('44444444-4444-4444-4444-444444444401', '44444444-4444-4444-4444-444444444444', 'Seller1 Home', '/seller1', 'custom', '_self', 1, NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444402', '44444444-4444-4444-4444-444444444444', 'Seller1 Products', '/seller1/products', 'custom', '_self', 2, NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444403', '44444444-4444-4444-4444-444444444444', 'Seller1 About', '/seller1/about', 'custom', '_self', 3, NOW(), NOW());

-- 5. Crowdfunding Primary Menu (subdomain: "crowdfunding")
INSERT INTO menus (id, name, slug, location, description, is_active, metadata, created_at, updated_at)
VALUES
  ('55555555-5555-5555-5555-555555555555', 'Crowdfunding Primary Menu', 'crowdfunding-primary-menu', 'primary',
   'Menu for crowdfunding subdomain', true, '{"subdomain": "crowdfunding"}', NOW(), NOW());

INSERT INTO menu_items (id, menu_id, title, url, type, target, order_num, created_at, updated_at)
VALUES
  ('55555555-5555-5555-5555-555555555501', '55555555-5555-5555-5555-555555555555', 'Crowdfunding Home', '/', 'custom', '_self', 1, NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555502', '55555555-5555-5555-5555-555555555555', 'Projects', '/projects', 'custom', '_self', 2, NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555503', '55555555-5555-5555-5555-555555555555', 'Start Project', '/start', 'custom', '_self', 3, NOW(), NOW());
